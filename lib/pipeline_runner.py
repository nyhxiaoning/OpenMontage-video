"""Pipeline runner with integrated configuration checking.

This module provides the ``run_pipeline`` function that orchestrates a full
pipeline execution with pre-stage config checks. It is the bridge between
the agent's natural-language instructions and the tool execution layer.

Usage by AI Agent:
    from lib.pipeline_runner import run_pipeline, PipelineRunnerConfig

    runner = PipelineRunnerConfig(
        pipeline="cinematic",
        project_id="my-video",
        auto_skip_config=False,   # True = skip missing optional tools
    )
    result = runner.run()
    # result contains: status, stages_completed, decision_log, errors

Design:
- Agent creates a PipelineRunnerConfig with pipeline + project_id
- Caller can inject a ``stage_executor`` callback that receives the stage
  name and returns the canonical artifact dict
- Before each stage, the runner calls check_stage_config automatically
- Config check failures are surfaced to the caller — runner never silently
  falls back without recording the decision
- Runner is stateless between calls; all state lives in checkpoints + artifacts
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional

from lib.checkpoint import (
    write_checkpoint,
    get_next_stage,
    get_completed_stages,
    get_pipeline_stages,
)
from lib.pipeline_config_check import (
    check_stage_config,
    format_check_report,
    StageConfigResult,
    ToolConfigStatus,
)

logger = logging.getLogger(__name__)


class RunStatus(str, Enum):
    SUCCESS = "success"
    CONFIG_BLOCKED = "config_blocked"
    STAGE_FAILED = "stage_failed"
    RESUME_AVAILABLE = "resume_available"
    SKIPPED = "skipped"


class StageDecision(str, Enum):
    PROCEED = "proceed"
    CONFIGURE = "configure"
    FALLBACK = "fallback"
    SKIP = "skip"


@dataclass
class StageResult:
    """Result of executing a single pipeline stage."""
    stage: str
    status: str  # "completed" | "failed" | "skipped"
    artifact: dict[str, Any] = field(default_factory=dict)
    config_check_passed: bool = True
    config_decision: Optional[str] = None  # StageDecision value
    error: Optional[str] = None
    duration_seconds: float = 0.0


@dataclass
class PipelineResult:
    """Overall pipeline execution result."""
    pipeline: str
    project_id: str
    status: str  # RunStatus value
    stages_completed: list[str] = field(default_factory=list)
    stages_skipped: list[str] = field(default_factory=list)
    decision_log: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    config_reports: list[str] = field(default_factory=list)
    started_at: str = ""
    finished_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "pipeline": self.pipeline,
            "project_id": self.project_id,
            "status": self.status.value if isinstance(self.status, RunStatus) else self.status,
            "stages_completed": self.stages_completed,
            "stages_skipped": self.stages_skipped,
            "decision_log": self.decision_log,
            "errors": self.errors,
            "config_reports": self.config_reports,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
        }


@dataclass
class PipelineRunnerConfig:
    """Configuration for a pipeline run.

    Attributes:
        pipeline: Pipeline name (e.g. "cinematic").
        project_id: Project identifier (used for checkpoint dirs).
        pipeline_dir: Root directory for pipeline state (default: "pipelines").
        auto_skip_config: If True, automatically skip optional tools with
            missing config instead of surfacing them to the user.
        stage_executor: Callback ``(stage_name, context) -> artifact_dict``.
            This is where the agent injects its stage-specific logic.
        skip_stages: Set of stage names to skip entirely.
    """

    pipeline: str
    project_id: str
    pipeline_dir: str | Path = "pipelines"
    auto_skip_config: bool = False
    stage_executor: Optional[Callable[[str, dict[str, Any]], dict[str, Any]]] = None
    skip_stages: set[str] = field(default_factory=set)

    def __post_init__(self):
        if isinstance(self.pipeline_dir, str):
            self.pipeline_dir = Path(self.pipeline_dir)


class PipelineRunner:
    """Orchestrates pipeline execution with config checks.

    The runner:
    1. Resumes from existing checkpoints if any
    2. For each stage: runs config check → executes stage → checkpoints
    3. Records all config decisions in the decision log
    """

    def __init__(self, config: PipelineRunnerConfig):
        self.config = config
        self.pipeline_dir: Path = config.pipeline_dir.resolve()
        self.project_dir = self.pipeline_dir / config.project_id
        self.decisions: list[dict[str, Any]] = []
        self.context: dict[str, Any] = {}  # accumulated artifacts across stages

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _record_decision(self, category: str, stage: str, decision: dict[str, Any]) -> None:
        entry = {
            "decision_id": f"{stage}_{category}_{len(self.decisions)}",
            "category": category,
            "stage": stage,
            "timestamp": self._now(),
            **decision,
        }
        self.decisions.append(entry)

    def _run_config_check(self, stage: str) -> tuple[bool, StageConfigResult]:
        """Run pre-stage config check. Returns (ready, result_object)."""
        result = check_stage_config(
            pipeline=self.config.pipeline,
            stage=stage,
            project_id=self.config.project_id,
        )
        return result.ready, result

    def run(self) -> PipelineResult:
        """Execute the pipeline from start (or resume point) to completion.

        Returns a PipelineResult with full execution details.
        """
        started = self._now()
        result = PipelineResult(
            pipeline=self.config.pipeline,
            project_id=self.config.project_id,
            status=RunStatus.SUCCESS,
            started_at=started,
        )

        if self.config.stage_executor is None:
            result.status = RunStatus.SKIPPED
            result.errors.append("No stage_executor provided — cannot execute stages")
            result.finished_at = self._now()
            return result

        # Determine stages to run
        try:
            stages = get_pipeline_stages(self.config.pipeline)
        except Exception as exc:
            result.status = RunStatus.CONFIG_BLOCKED
            result.errors.append(f"Cannot load pipeline manifest: {exc}")
            result.finished_at = self._now()
            return result

        # Resume from existing progress
        completed = set(get_completed_stages(
            self.project_dir,
            self.config.project_id,
            self.config.pipeline,
        ))
        if completed:
            result.status = RunStatus.RESUME_AVAILABLE
            logger.info(
                "Resuming %s from %d completed stages",
                self.config.project_id,
                len(completed),
            )

        for stage in stages:
            if stage in self.config.skip_stages:
                result.stages_skipped.append(stage)
                self._record_decision("skip", stage, {"reason": "in skip_stages"})
                continue

            if stage in completed:
                logger.info("Stage %s already completed, skipping", stage)
                continue

            # ---- Pre-stage config check ----
            config_ready, config_result = self._run_config_check(stage)

            if not config_ready:
                report = format_check_report(config_result)
                result.config_reports.append(report)
                logger.warning("Config check failed for stage %s:\n%s", stage, report)

                # Record the config check decision
                self._record_decision("config_check", stage, {
                    "decision": StageDecision.CONFIGURE,
                    "missing_required": [r.tool_name for r in config_result.missing_required],
                    "missing_optional": [r.tool_name for r in config_result.missing_optional],
                    "free_fallbacks": config_result.free_fallbacks_available,
                    "auto_skip": self.config.auto_skip_config,
                })

                if not self.config.auto_skip_config:
                    # Surface to caller — they must decide
                    result.status = RunStatus.CONFIG_BLOCKED
                    result.decision_log = self.decisions
                    result.finished_at = self._now()
                    return result

                # Auto-skip mode: proceed with fallbacks
                logger.info(
                    "Auto-skip mode: proceeding with %d optional tools unavailable",
                    len(config_result.missing_optional),
                )

            # ---- Execute stage ----
            stage_start = datetime.now(timezone.utc)
            stage_error = None
            stage_artifact: dict[str, Any] = {}

            try:
                stage_artifact = self.config.stage_executor(stage, self.context)
                self.context.update(stage_artifact)
            except Exception as exc:
                stage_error = str(exc)
                logger.exception("Stage %s failed", stage)
                result.errors.append(f"{stage}: {stage_error}")

            stage_duration = (datetime.now(timezone.utc) - stage_start).total_seconds()

            # ---- Write checkpoint ----
            if stage_artifact or stage_error is None:
                try:
                    write_checkpoint(
                        pipeline_dir=self.pipeline_dir,
                        project_id=self.config.project_id,
                        stage=stage,
                        status="completed" if stage_error is None else "failed",
                        artifacts=stage_artifact if stage_artifact else {},
                        pipeline_type=self.config.pipeline,
                        metadata={
                            "duration_seconds": stage_duration,
                            "config_check_passed": config_ready,
                            "error": stage_error,
                        },
                    )
                except Exception as exc:
                    logger.warning("Checkpoint write failed for %s: %s", stage, exc)

            result.stages_completed.append(stage)
            if stage_error:
                result.status = RunStatus.STAGE_FAILED
                result.decision_log = self.decisions
                result.finished_at = self._now()
                return result

        result.decision_log = self.decisions
        result.finished_at = self._now()
        return result
