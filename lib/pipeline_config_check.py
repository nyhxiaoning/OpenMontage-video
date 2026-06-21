"""Pipeline configuration checker for OpenMontage.

Provides stage-level configuration validation so agents can check
that required tools are properly configured BEFORE running a stage.

Usage by AI Agent:
    from lib.pipeline_config_check import check_stage_config, format_check_report

    result = check_stage_config("cinematic", "assets", "cat-chef-cooking")
    if not result.ready:
        print(format_check_report(result))
        # Present to user: configure / fallback / skip

Design:
- Agent calls this function at the START of each stage (before any tool execution)
- Returns structured result: ready/missing/blocked tools with fallback suggestions
- Does NOT auto-block or auto-fallback — agent decides based on result
- Agent logs the decision in decision_log per governance contract
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


class ToolConfigStatus(str, Enum):
    READY = "ready"
    MISSING_KEY = "missing_key"
    MISSING_DEPENDENCY = "missing_dependency"
    INVALID_KEY = "invalid_key"
    UNAVAILABLE = "unavailable"
    SKIPPED = "skipped"


@dataclass
class ToolConfigResult:
    """Configuration check result for a single tool."""
    tool_name: str
    capability: str
    provider: str
    status: ToolConfigStatus
    missing_deps: list[str] = field(default_factory=list)
    fallback_tools: list[str] = field(default_factory=list)
    install_instructions: str = ""
    has_api_key: bool = False

    def to_dict(self) -> dict:
        return {
            "tool_name": self.tool_name,
            "capability": self.capability,
            "provider": self.provider,
            "status": self.status.value,
            "missing_deps": self.missing_deps,
            "fallback_tools": self.fallback_tools,
            "install_instructions": self.install_instructions,
            "has_api_key": self.has_api_key,
        }


@dataclass
class StageConfigResult:
    """Configuration check result for an entire pipeline stage."""
    pipeline: str
    stage: str
    project_id: str
    ready: bool
    tool_results: list[ToolConfigResult] = field(default_factory=list)
    missing_required: list[ToolConfigResult] = field(default_factory=list)
    missing_optional: list[ToolConfigResult] = field(default_factory=list)
    free_fallbacks_available: list[str] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> dict:
        return {
            "pipeline": self.pipeline,
            "stage": self.stage,
            "project_id": self.project_id,
            "ready": self.ready,
            "tool_results": [t.to_dict() for t in self.tool_results],
            "missing_required": [t.to_dict() for t in self.missing_required],
            "missing_optional": [t.to_dict() for t in self.missing_optional],
            "free_fallbacks_available": self.free_fallbacks_available,
            "summary": self.summary,
        }


def _load_env() -> dict[str, str]:
    """Load .env file without modifying os.environ."""
    env_path = PROJECT_ROOT / ".env"
    result: dict[str, str] = {}
    if not env_path.is_file():
        return result
    with open(env_path, encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            result[key.strip()] = value.strip().strip("'\"")
    return result


def _get_tool_deps(tool: Any) -> tuple[list[str], list[str], str]:
    """Extract dependencies, fallbacks, and install instructions from a tool."""
    deps = getattr(tool, "dependencies", [])
    fallbacks = getattr(tool, "fallback_tools", [])
    instructions = getattr(tool, "install_instructions", "")
    return deps, fallbacks, instructions


def _check_env_deps(
    tool_name: str,
    deps: list[str],
    env: dict[str, str],
) -> tuple[ToolConfigStatus, list[str], bool]:
    """Check if environment variable dependencies are satisfied.

    Returns (status, missing_deps, has_api_key).
    """
    missing: list[str] = []
    has_key = False

    for dep in deps:
        if dep.startswith("env:"):
            env_var = dep[4:]
            if env.get(env_var):
                has_key = True
            else:
                missing.append(dep)
        elif dep.startswith("cmd:"):
            import shutil
            if not shutil.which(dep[4:]):
                missing.append(dep)
        elif dep.startswith("python:"):
            module = dep[7:]
            try:
                __import__(module)
            except ImportError:
                missing.append(dep)

    if missing:
        if has_key:
            return ToolConfigStatus.MISSING_DEPENDENCY, missing, has_key
        return ToolConfigStatus.MISSING_KEY, missing, has_key

    return ToolConfigStatus.READY, [], has_key


def _get_free_fallback(capability: str) -> list[str]:
    """Return free/stock providers for a given capability."""
    free_map = {
        "video_generation": ["pexels", "pixabay"],
        "image_generation": ["pexels", "pixabay"],
        "tts": ["google_tts"],
        "music_generation": [],
        "video_post": ["ffmpeg"],
        "audio_processing": ["ffmpeg"],
        "enhancement": ["ffmpeg"],
        "analysis": ["local", "ffmpeg"],
        "subtitle": ["openmontage"],
        "graphics": ["mermaid", "pygments"],
        "avatar": [],
        "character_animation": ["openmontage"],
    }
    return free_map.get(capability, [])


def check_stage_config(
    pipeline: str,
    stage: str,
    project_id: str,
    env: Optional[dict[str, str]] = None,
) -> StageConfigResult:
    """Check configuration readiness for a pipeline stage.

    Args:
        pipeline: Pipeline name (e.g., "cinematic")
        stage: Stage name (e.g., "assets")
        project_id: Project identifier
        env: Environment dict (defaults to loaded .env)

    Returns:
        StageConfigResult with per-tool status and fallback suggestions
    """
    if env is None:
        env = _load_env()

    # Load pipeline manifest to get stage tools
    try:
        from lib.pipeline_loader import load_pipeline, get_stage_order
        manifest = load_pipeline(pipeline)
        stages = get_stage_order(manifest)
    except Exception as e:
        return StageConfigResult(
            pipeline=pipeline,
            stage=stage,
            project_id=project_id,
            ready=False,
            summary=f"Cannot load pipeline manifest: {e}",
        )

    if stage not in stages:
        return StageConfigResult(
            pipeline=pipeline,
            stage=stage,
            project_id=project_id,
            ready=False,
            summary=f"Stage '{stage}' not found in pipeline '{pipeline}'. Valid stages: {stages}",
        )

    # Find the stage definition
    stage_def = next((s for s in manifest.get("stages", []) if s["name"] == stage), None)
    if not stage_def:
        return StageConfigResult(
            pipeline=pipeline,
            stage=stage,
            project_id=project_id,
            ready=False,
            summary=f"Stage '{stage}' definition not found in manifest",
        )

    # Collect tool names from stage
    required_tools: list[str] = []
    optional_tools: list[str] = []

    for tool_spec in stage_def.get("tools_available", []):
        if isinstance(tool_spec, str):
            required_tools.append(tool_spec)
        elif isinstance(tool_spec, dict):
            required_tools.append(tool_spec.get("name", ""))

    for tool_spec in stage_def.get("optional_tools", []):
        if isinstance(tool_spec, str):
            optional_tools.append(tool_spec)
        elif isinstance(tool_spec, dict):
            optional_tools.append(tool_spec.get("name", ""))

    # Initialize tool registry
    try:
        from tools.tool_registry import registry
        registry.ensure_discovered()
        tool_map = registry._tools
    except Exception as e:
        return StageConfigResult(
            pipeline=pipeline,
            stage=stage,
            project_id=project_id,
            ready=False,
            summary=f"Cannot initialize tool registry: {e}",
        )

    # Check each tool (deduplicated — some manifests list tools in both required and optional)
    seen_tools: set[str] = set()
    tool_results: list[ToolConfigResult] = []
    missing_required: list[ToolConfigResult] = []
    missing_optional: list[ToolConfigResult] = []
    free_fallbacks: list[str] = []

    for tool_name in required_tools + optional_tools:
        if not tool_name or tool_name in seen_tools:
            continue
        seen_tools.add(tool_name)

        tool = tool_map.get(tool_name)
        if not tool:
            tool_results.append(ToolConfigResult(
                tool_name=tool_name,
                capability="unknown",
                provider="unknown",
                status=ToolConfigStatus.UNAVAILABLE,
                install_instructions=f"Tool '{tool_name}' not found in registry",
            ))
            if tool_name in required_tools:
                missing_required.append(tool_results[-1])
            else:
                missing_optional.append(tool_results[-1])
            continue

        deps, fallbacks, instructions = _get_tool_deps(tool)
        status, missing_deps, has_key = _check_env_deps(tool_name, deps, env)

        result = ToolConfigResult(
            tool_name=tool_name,
            capability=getattr(tool, "capability", "unknown"),
            provider=getattr(tool, "provider", "unknown"),
            status=status,
            missing_deps=missing_deps,
            fallback_tools=fallbacks,
            install_instructions=instructions,
            has_api_key=has_key,
        )
        tool_results.append(result)

        if status != ToolConfigStatus.READY:
            if tool_name in required_tools:
                missing_required.append(result)
            else:
                missing_optional.append(result)

            # Collect free fallbacks
            cap_fallbacks = _get_free_fallback(result.capability)
            for fb in cap_fallbacks:
                if fb not in free_fallbacks:
                    free_fallbacks.append(fb)

    # Determine overall readiness
    ready = len(missing_required) == 0
    summary = _build_summary(ready, tool_results, missing_required, missing_optional, free_fallbacks)

    return StageConfigResult(
        pipeline=pipeline,
        stage=stage,
        project_id=project_id,
        ready=ready,
        tool_results=tool_results,
        missing_required=missing_required,
        missing_optional=missing_optional,
        free_fallbacks_available=free_fallbacks,
        summary=summary,
    )


def _build_summary(
    ready: bool,
    tool_results: list[ToolConfigResult],
    missing_required: list[ToolConfigResult],
    missing_optional: list[ToolConfigResult],
    free_fallbacks: list[str],
) -> str:
    """Build human-readable summary of config check."""
    total = len(tool_results)
    ready_count = total - len(missing_required) - len(missing_optional)

    parts = [f"Config check: {ready_count}/{total} tools ready"]

    if missing_required:
        names = [r.tool_name for r in missing_required]
        parts.append(f"REQUIRED tools missing: {', '.join(names)}")

    if missing_optional:
        names = [r.tool_name for r in missing_optional]
        parts.append(f"Optional tools missing: {', '.join(names)}")

    if free_fallbacks:
        parts.append(f"Free fallbacks available: {', '.join(free_fallbacks)}")

    if ready:
        parts.append("Stage is ready to proceed.")

    return ". ".join(parts) + "."


def format_check_report(result: StageConfigResult) -> str:
    """Format config check result as human-readable report for the agent to present."""
    lines = [
        f"## Config Check: {result.pipeline} / {result.stage}",
        "",
    ]

    if result.ready:
        lines.append("**Status: READY** — All required tools are configured.")
    else:
        lines.append("**Status: BLOCKED** — Required tools need configuration.")
        lines.append("")

        if result.missing_required:
            lines.append("### Missing Required Tools")
            for r in result.missing_required:
                lines.append(f"- **{r.tool_name}** ({r.provider})")
                if r.missing_deps:
                    lines.append(f"  - Missing: {', '.join(r.missing_deps)}")
                if r.fallback_tools:
                    lines.append(f"  - Fallback: {', '.join(r.fallback_tools)}")
                if r.install_instructions:
                    lines.append(f"  - Setup: {r.install_instructions[:120]}")
            lines.append("")

        if result.missing_optional:
            lines.append("### Missing Optional Tools")
            for r in result.missing_optional:
                lines.append(f"- **{r.tool_name}** ({r.provider})")
            lines.append("")

        if result.free_fallbacks_available:
            lines.append(f"### Free Fallbacks Available")
            lines.append(f"These providers work without API keys: {', '.join(result.free_fallbacks_available)}")
            lines.append("")

        lines.append("### Options")
        lines.append("1. **Configure** — Add the missing API key(s) to .env and retry")
        lines.append("2. **Fallback** — Use alternative providers listed above")
        lines.append("3. **Skip** — Proceed without the missing tools (functionality reduced)")
        lines.append("4. **Skip config entirely** — Use free models only for this stage")

    return "\n".join(lines)


def check_and_advise(
    pipeline: str,
    stage: str,
    project_id: str,
    auto_skip: bool = False,
) -> tuple[bool, str]:
    """Convenience function: check config and return (ready, report).

    Args:
        pipeline: Pipeline name
        stage: Stage name
        project_id: Project identifier
        auto_skip: If True, automatically skip non-critical missing tools

    Returns:
        (ready, formatted_report)
    """
    result = check_stage_config(pipeline, stage, project_id)

    if auto_skip and not result.ready:
        # Downgrade optional missing tools to skipped
        for r in result.missing_optional:
            r.status = ToolConfigStatus.SKIPPED
        result.missing_optional = []
        result.ready = len(result.missing_required) == 0
        result.summary = _build_summary(
            result.ready,
            result.tool_results,
            result.missing_required,
            result.missing_optional,
            result.free_fallbacks_available,
        )

    report = format_check_report(result)
    return result.ready, report
