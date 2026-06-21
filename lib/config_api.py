"""OpenMontage Configuration API — FastAPI backend for the model configuration WebUI.

Provides REST + SSE endpoints for:
- Model/provider capability catalog (from tool registry)
- Pipeline-aware model recommendations
- API key configuration (read/write .env)
- Health checks (lightweight provider validation)
- Config validation before pipeline stages

Port: 3001 (separate from Remotion Studio on 3000)
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
from pathlib import Path
from typing import Any, AsyncGenerator, Optional, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field

# Ensure project root is on path for tool imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
import sys
sys.path.insert(0, str(PROJECT_ROOT))

# Load .env into os.environ (mirrors base_tool._load_dotenv())
def _ensure_env_loaded() -> None:
    env_path = PROJECT_ROOT / ".env"
    if env_path.is_file():
        with open(env_path, encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip("'\"")
                if "  #" in value:
                    value = value[:value.index("  #")].rstrip()
                elif "\t#" in value:
                    value = value[:value.index("\t#")].rstrip()
                if key and key not in os.environ:
                    os.environ[key] = value

_ensure_env_loaded()

from lib.config_health import check_all_providers, get_configured_providers, ProviderHealth, HealthStatus
from lib.pipeline_config_check import check_stage_config, format_check_report, ToolConfigStatus, _build_summary

# Try to import registry — may fail on first setup
try:
    from tools.tool_registry import registry
    tool_registry = registry
    _REGISTRY_AVAILABLE = True
except ImportError:
    _REGISTRY_AVAILABLE = False

# Try to import pipeline loader
try:
    from lib.pipeline_loader import list_pipelines, load_pipeline, get_required_tools
    _PIPELINE_LOADER_AVAILABLE = True
except ImportError:
    _PIPELINE_LOADER_AVAILABLE = False

app = FastAPI(
    title="OpenMontage Config API",
    description="Model configuration and health check API for OpenMontage",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request/Response Models
# ---------------------------------------------------------------------------

class StatusResponse(BaseModel):
    project_root: str
    config_available: bool
    registry_available: bool
    pipeline_loader_available: bool
    configured_providers: list[str]
    total_providers: int
    completion_pct: float


class ModelCard(BaseModel):
    name: str
    provider: str
    capability: str
    tier: str
    status: str  # available / unavailable
    dependencies: list[str]
    best_for: list[str]
    has_api_key: bool
    health_status: Optional[str] = None
    health_message: Optional[str] = None
    install_instructions: Optional[str] = None


class PipelineInfo(BaseModel):
    name: str
    description: str
    stability: str
    required_tools: list[str]
    recommended_tools: list[str]
    configured_count: int
    total_count: int


class ConfigWriteRequest(BaseModel):
    key: str = Field(..., description="Environment variable name (e.g., FAL_KEY)")
    value: str = Field(..., description="API key value")
    persist: bool = Field(True, description="Write to .env file")


class ConfigCheckResult(BaseModel):
    tool_name: str
    capability: str
    status: str
    message: str
    severity: str
    fallback_tools: list[str]


class SkipConfigRequest(BaseModel):
    mode: str = Field("free_fallback", description="skip / free_fallback / script_only")
    selected_tools: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Helper: .env read/write
# ---------------------------------------------------------------------------

def _read_env_file() -> dict[str, str]:
    """Read .env file into a dict (without loading into os.environ)."""
    env_path = PROJECT_ROOT / ".env"
    result: dict[str, str] = {}
    if not env_path.exists():
        return result
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                result[key.strip()] = value.strip()
    return result


def _write_env_file(updates: dict[str, str], append_only: bool = False) -> None:
    """Write key=value pairs to .env file."""
    env_path = PROJECT_ROOT / ".env"

    existing = _read_env_file() if not append_only else {}
    existing.update(updates)

    with open(env_path, "w") as f:
        for key, value in sorted(existing.items()):
            f.write(f"{key}={value}\n")


def _mask_key(value: str) -> str:
    """Mask an API key for display."""
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}...{value[-4:]}"


def _to_str(val: Any) -> str:
    """Safely convert enum or other value to string."""
    if hasattr(val, "value"):
        return val.value
    return str(val)


def _get_tool_info(tool: Any) -> dict[str, Any]:
    """Extract relevant info from a tool instance."""
    return {
        "name": getattr(tool, "name", type(tool).__name__),
        "provider": getattr(tool, "provider", "unknown"),
        "capability": getattr(tool, "capability", "unknown"),
        "tier": _to_str(getattr(tool, "tier", "unknown")),
        "status": _to_str(getattr(tool, "status", "unknown")),
        "dependencies": getattr(tool, "dependencies", []),
        "best_for": getattr(tool, "best_for", []),
        "install_instructions": getattr(tool, "install_instructions", ""),
    }


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/status")
async def get_status() -> StatusResponse:
    """Get project status and configuration completion."""
    env_vars = dict(os.environ)
    configured = get_configured_providers(env_vars)
    total = len(configured) + sum(
        1 for p in ["fal", "openai", "google", "elevenlabs", "suno",
                    "runway", "heygen", "pexels", "pixabay", "doubao"]
        if p not in configured
    )

    # Count registry tools if available
    registry_total = 0
    if _REGISTRY_AVAILABLE:
        try:
            tool_registry.ensure_discovered()
            registry_total = len(tool_registry._tools)
        except Exception:
            pass

    completion = (len(configured) / max(total, 1)) * 100

    return StatusResponse(
        project_root=str(PROJECT_ROOT),
        config_available=True,
        registry_available=_REGISTRY_AVAILABLE,
        pipeline_loader_available=_PIPELINE_LOADER_AVAILABLE,
        configured_providers=configured,
        total_providers=total,
        completion_pct=round(completion, 1),
    )


@app.get("/api/models")
async def get_models() -> list[ModelCard]:
    """Get all models with their configuration status."""
    if not _REGISTRY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tool registry not available")

    try:
        tool_registry.ensure_discovered()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registry discovery failed: {e}")

    env_vars = dict(os.environ)
    configured = get_configured_providers(env_vars)

    # Run quick health checks (with caching — don't hammer APIs)
    health_results: dict[str, ProviderHealth] = {}
    try:
        health_results = {h.provider: h for h in await check_all_providers(env_vars, timeout=3.0)}
    except Exception:
        pass

    cards: list[ModelCard] = []
    seen: set[str] = set()

    for tool in tool_registry._tools.values():
        info = _get_tool_info(tool)
        provider = info["provider"]
        unique_key = f"{provider}:{info['name']}"
        if unique_key in seen:
            continue
        seen.add(unique_key)

        has_key = provider in configured
        health = health_results.get(provider)

        status = "available" if info["status"] == "available" else "unavailable"

        cards.append(ModelCard(
            name=info["name"],
            provider=info["provider"],
            capability=info["capability"],
            tier=info["tier"],
            status=status,
            dependencies=info["dependencies"],
            best_for=info["best_for"],
            has_api_key=has_key,
            health_status=health.status.value if health else None,
            health_message=health.message if health else None,
            install_instructions=info["install_instructions"] or None,
        ))

    return cards


@app.get("/api/pipelines")
async def get_pipelines() -> list[PipelineInfo]:
    """Get all available pipelines with model recommendations."""
    if not _PIPELINE_LOADER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Pipeline loader not available")

    pipelines = []
    try:
        pipeline_names = list_pipelines()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list pipelines: {e}")

    env_vars = dict(os.environ)
    configured = get_configured_providers(env_vars)

    for name in pipeline_names:
        try:
            manifest = load_pipeline(name)
            required_tools = get_required_tools(manifest)
            stages = manifest.get("stages", [])

            all_tools: list[str] = []
            recommended: list[str] = []
            for stage in stages:
                for tool_spec in stage.get("tools_available", []):
                    if isinstance(tool_spec, str):
                        all_tools.append(tool_spec)
                        recommended.append(tool_spec)
                for tool_spec in stage.get("optional_tools", []):
                    if isinstance(tool_spec, str):
                        all_tools.append(tool_spec)

            configured_count = sum(
                1 for t in set(all_tools)
                if any(
                    tool_registry._tools.get(tn) and
                    any(p in configured for p in [
                        getattr(tool_registry._tools[tn], "provider", "")
                    ])
                    for tn in [t]
                    if tn in tool_registry._tools
                )
            ) if _REGISTRY_AVAILABLE else 0

            pipelines.append(PipelineInfo(
                name=name,
                description=manifest.get("description", "")[:120],
                stability=manifest.get("stability", "unknown"),
                required_tools=list(set(required_tools)),
                recommended_tools=list(set(recommended)),
                configured_count=configured_count,
                total_count=len(set(all_tools)),
            ))
        except Exception:
            continue

    return pipelines


@app.get("/api/pipelines/{name}")
async def get_pipeline_detail(name: str) -> dict[str, Any]:
    """Get detailed model recommendations for a specific pipeline."""
    if not _PIPELINE_LOADER_AVAILABLE:
        raise HTTPException(status_code=503)

    try:
        manifest = load_pipeline(name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Pipeline not found: {e}")

    env_vars = dict(os.environ)
    configured = get_configured_providers(env_vars)

    stages_detail = []
    all_tools: list[str] = []

    for stage in manifest.get("stages", []):
        stage_tools = []
        for tool_spec in stage.get("tools_available", []):
            tool_name = tool_spec if isinstance(tool_spec, str) else tool_spec.get("name", "")
            stage_tools.append(tool_name)
            all_tools.append(tool_name)

        stages_detail.append({
            "name": stage["name"],
            "tools": stage_tools,
            "human_approval": stage.get("human_approval_default", False),
        })

    # Build tool status list
    tool_status: list[dict] = []
    seen_tools: set[str] = set()
    if _REGISTRY_AVAILABLE:
        for tool_name in set(all_tools):
            if tool_name in seen_tools:
                continue
            seen_tools.add(tool_name)
            tool = tool_registry._tools.get(tool_name)
            if tool:
                info = _get_tool_info(tool)
                tool_status.append({
                    "name": info["name"],
                    "provider": info["provider"],
                    "capability": info["capability"],
                    "status": info["status"],
                    "has_api_key": info["provider"] in configured,
                    "dependencies": info["dependencies"],
                    "install_instructions": info["install_instructions"] or None,
                })

    return {
        "name": name,
        "description": manifest.get("description", ""),
        "stages": stages_detail,
        "tools": tool_status,
        "configured_count": sum(1 for t in tool_status if t["has_api_key"]),
        "total_count": len(tool_status),
    }


@app.post("/api/models/{name}/config")
async def config_model(name: str, req: ConfigWriteRequest) -> dict[str, Any]:
    """Configure an API key for a model/provider."""
    # Validate key name format
    if not re.match(r'^[A-Z][A-Z0-9_]*$', req.key):
        raise HTTPException(status_code=400, detail="Invalid env var name format")

    env_path = PROJECT_ROOT / ".env"

    if req.persist:
        _write_env_file({req.key: req.value})
        # Also set in current process
        os.environ[req.key] = req.value

    # Refresh registry if available
    if _REGISTRY_AVAILABLE:
        try:
            tool_registry.ensure_discovered()
        except Exception:
            pass

    # Quick health check on the new key
    health = None
    provider_map = {
        "FAL_KEY": "fal",
        "OPENAI_API_KEY": "openai",
        "GOOGLE_API_KEY": "google",
        "ELEVENLABS_API_KEY": "elevenlabs",
        "SUNO_API_KEY": "suno",
        "RUNWAY_API_KEY": "runway",
        "HEYGEN_API_KEY": "heygen",
        "PEXELS_API_KEY": "pexels",
        "PIXABAY_API_KEY": "pixabay",
        "DOUBAO_SPEECH_API_KEY": "doubao",
        "TONGYI_API_KEY": "tongyi",
    }

    if req.key in provider_map:
        try:
            provider = provider_map[req.key]
            checks = await check_all_providers({req.key: req.value}, timeout=5.0)
            health = next((h for h in checks if h.provider == provider), None)
        except Exception:
            pass

    return {
        "success": True,
        "key": req.key,
        "persisted": req.persist,
        "masked_value": _mask_key(req.value),
        "health": health.to_dict() if health else None,
    }


@app.delete("/api/models/{name}/config")
async def delete_model_config(name: str) -> dict[str, str]:
    """Remove an API key configuration."""
    env_path = PROJECT_ROOT / ".env"
    existing = _read_env_file()

    # Map model name to env vars
    env_vars_to_remove = [k for k in existing if name.lower() in k.lower()]

    if not env_vars_to_remove:
        raise HTTPException(status_code=404, detail=f"No config found for {name}")

    for var in env_vars_to_remove:
        del existing[var]
        os.environ.pop(var, None)

    with open(env_path, "w") as f:
        for k, v in sorted(existing.items()):
            f.write(f"{k}={v}\n")

    return {"success": True, "removed": env_vars_to_remove}


@app.post("/api/check/stage")
async def check_stage(payload: dict) -> dict[str, Any]:
    """Run a stage-level configuration check for a specific pipeline + stage.

    Request body:
        pipeline: str — pipeline name (e.g. "cinematic")
        stage: str — stage name (e.g. "assets")
        auto_skip: bool — whether to auto-skip optional missing tools

    Returns the same format as check_stage_config().to_dict()
    """
    pipeline = payload.get("pipeline", "")
    stage = payload.get("stage", "")
    auto_skip = payload.get("auto_skip", False)

    if not pipeline or not stage:
        raise HTTPException(status_code=400, detail="pipeline and stage are required")

    try:
        from lib.pipeline_config_check import check_stage_config
        result = check_stage_config(pipeline, stage, payload.get("project_id", "default"))
        if auto_skip and not result.ready:
            for r in result.missing_optional:
                r.status = ToolConfigStatus.SKIPPED
            result.missing_optional = []
            result.ready = len(result.missing_required) == 0
            result.summary = _build_summary(
                result.ready, result.tool_results,
                result.missing_required, result.missing_optional,
                result.free_fallbacks_available,
            )
        return result.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/check")
async def run_config_check() -> list[ConfigCheckResult]:
    """Run a full configuration check against pipeline requirements."""
    if not _REGISTRY_AVAILABLE:
        raise HTTPException(status_code=503)

    try:
        tool_registry.ensure_discovered()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registry error: {e}")

    env_vars = dict(os.environ)
    results: list[ConfigCheckResult] = []

    for tool_name, tool in tool_registry._tools.items():
        deps = getattr(tool, "dependencies", [])
        status = getattr(tool, "status", "unknown")
        if hasattr(status, "value"):
            status = status.value

        # Check env var dependencies
        missing_deps: list[str] = []
        for dep in deps:
            if dep.startswith("env:"):
                env_var = dep[4:]
                if not env_vars.get(env_var):
                    missing_deps.append(dep)

        if missing_deps:
            results.append(ConfigCheckResult(
                tool_name=tool_name,
                capability=getattr(tool, "capability", "unknown"),
                status="missing_key" if status != "available" else "missing_dependency",
                message=f"Missing: {', '.join(missing_deps)}",
                severity="required",
                fallback_tools=getattr(tool, "fallback_tools", []),
            ))
        elif status == "available":
            results.append(ConfigCheckResult(
                tool_name=tool_name,
                capability=getattr(tool, "capability", "unknown"),
                status="ok",
                message="Ready",
                severity="required",
                fallback_tools=getattr(tool, "fallback_tools", []),
            ))
        else:
            results.append(ConfigCheckResult(
                tool_name=tool_name,
                capability=getattr(tool, "capability", "unknown"),
                status=status,
                message=getattr(tool, "install_instructions", "")[:100],
                severity="required",
                fallback_tools=getattr(tool, "fallback_tools", []),
            ))

    return results


@app.get("/api/check/stream")
async def stream_config_check() -> StreamingResponse:
    """SSE endpoint: stream health check results in real-time."""
    async def event_generator() -> AsyncGenerator[str, None]:
        yield f"event: start\ndata: {json.dumps({'total': 10})}\n\n"

        env_vars = dict(os.environ)
        results = await check_all_providers(env_vars, timeout=5.0)

        for result in results:
            yield f"event: check\ndata: {json.dumps(result.to_dict())}\n\n"
            await asyncio.sleep(0.1)

        yield f"event: done\ndata: {json.dumps({'message': 'Check complete'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.post("/api/skip-config")
async def skip_config(req: SkipConfigRequest) -> dict[str, Any]:
    """Handle skip-config mode: record user's choice and return free fallback plan."""
    free_models = {
        "free_fallback": {
            "video_generation": ["pexels", "pixabay"],
            "image_generation": ["pexels", "pixabay"],
            "tts": ["google_tts"],
            "music_generation": [],
            "enhancement": ["ffmpeg"],
        },
        "script_only": {
            "note": "Script and scene plan stages do not require any API keys.",
            "no_generation": True,
        },
        "skip": {
            "note": "Pipeline will proceed with whatever tools are available.",
            "no_generation": True,
        },
    }

    plan = free_models.get(req.mode, free_models["skip"])
    return {
        "mode": req.mode,
        "selected_tools": req.selected_tools,
        "free_fallback_plan": plan,
        "message": "Pipeline will proceed with free/available models only",
    }


@app.get("/api/capabilities")
async def get_capabilities() -> dict[str, Any]:
    """Get full capability catalog from tool registry."""
    if not _REGISTRY_AVAILABLE:
        return {"error": "Registry not available", "capabilities": {}}

    try:
        tool_registry.ensure_discovered()
        catalog = tool_registry.capability_catalog()
        # Convert tool objects to dicts for JSON serialization
        serializable: dict[str, Any] = {}
        for cap, tools in catalog.items():
            serializable[cap] = [
                _get_tool_info(t) for t in tools
            ]
        return serializable
    except Exception as e:
        return {"error": str(e), "capabilities": {}}


# ---------------------------------------------------------------------------
# Static file serving (React build)
# ---------------------------------------------------------------------------

REACT_DIST = PROJECT_ROOT / "trae-react-template" / "dist"


@app.get("/", response_model=None)
async def serve_index() -> Response:
    """Serve React app index.html."""
    index = REACT_DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return Response(content='{"error": "React app not built"}', media_type="application/json", status_code=404)


@app.get("/{full_path:path}", response_model=None)
async def serve_static(full_path: str) -> Response:
    """Serve React static files or SPA fallback."""
    file_path = REACT_DIST / full_path
    if file_path.is_file():
        return FileResponse(file_path)
    # SPA fallback
    index = REACT_DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return Response(content='{"error": "Not found"}', media_type="application/json", status_code=404)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    print(f"Starting OpenMontage Config API on http://localhost:3001")
    print(f"Project root: {PROJECT_ROOT}")
    print(f"React dist: {REACT_DIST}")
    uvicorn.run(app, host="0.0.0.0", port=3001, log_level="info")
