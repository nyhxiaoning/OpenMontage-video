"""新增视频模型模板 — 复制此文件并修改。

替换所有 my_model / MyModel / MY_API_KEY 为目标模型的内容。
放入 tools/video/ 目录后自动被 Registry 发现，无需修改其他文件。
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

from tools.base_tool import (
    BaseTool,
    Determinism,
    ExecutionMode,
    ResourceProfile,
    RetryPolicy,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolStatus,
    ToolTier,
)


class MyModelVideo(BaseTool):
    # ===== 1. 身份标识（必填）=====
    name = "my_model_video"               # 唯一名称，video_selector 通过此自动发现
    version = "0.1.0"
    tier = ToolTier.GENERATE
    capability = "video_generation"        # 必须 = "video_generation"
    provider = "my_model"                  # Provider 标识，用于 scoring 排名
    stability = ToolStability.BETA         # EXPERIMENTAL / BETA / PRODUCTION
    execution_mode = ExecutionMode.SYNC
    determinism = Determinism.STOCHASTIC   # 视频生成通常是随机的
    runtime = ToolRuntime.API              # API / LOCAL / LOCAL_GPU / HYBRID

    # ===== 2. 依赖声明 =====
    dependencies = []                      # 动态检查 env var
    install_instructions = (
        "Set MY_MODEL_API_KEY to your API key.\n"
        "  Get one at https://example.com/api-keys"
    )

    # ===== 3. Layer 3 技能引用 =====
    agent_skills = ["ai-video-gen"]        # 引用 .agents/skills/ 下的技能文件

    # ===== 4. 能力声明 =====
    capabilities = ["text_to_video", "image_to_video"]
    supports = {
        "text_to_video": True,
        "image_to_video": True,
        "native_audio": False,             # 是否原生生成同步音频
        "cinematic_quality": True,
        "camera_direction": True,          # 是否支持镜头指令
        "seed": True,                      # 是否支持随机种子
    }
    best_for = [
        "cinematic B-roll with high visual fidelity",
        "fluid motion and camera direction",
    ]
    not_good_for = ["offline generation", "very long clips"]
    fallback_tools = ["kling_video", "minimax_video", "veo_video"]

    # ===== 5. 输入 Schema =====
    input_schema = {
        "type": "object",
        "required": ["prompt"],
        "properties": {
            "prompt": {"type": "string"},
            "operation": {
                "type": "string",
                "enum": ["text_to_video", "image_to_video"],
                "default": "text_to_video",
            },
            "duration": {
                "type": "string",
                "enum": ["5", "10"],
                "default": "5",
                "description": "Duration in seconds",
            },
            "aspect_ratio": {
                "type": "string",
                "enum": ["16:9", "9:16", "1:1"],
                "default": "16:9",
            },
            "image_url": {
                "type": "string",
                "description": "Reference image URL for image_to_video",
            },
            "seed": {"type": "integer"},
            "output_path": {"type": "string"},
        },
    }

    # ===== 6. 资源和重试 =====
    resource_profile = ResourceProfile(
        cpu_cores=1, ram_mb=512, vram_mb=0, disk_mb=500, network_required=True
    )
    retry_policy = RetryPolicy(
        max_retries=2, retryable_errors=["rate_limit", "timeout"]
    )
    idempotency_key_fields = ["prompt", "operation", "duration", "seed"]
    side_effects = ["writes video file to output_path", "calls external API"]
    user_visible_verification = [
        "Watch generated clip for motion coherence and visual quality"
    ]

    # ===== 7. API Key 检查 =====
    def _get_api_key(self) -> str | None:
        return os.environ.get("MY_MODEL_API_KEY")

    def get_status(self) -> ToolStatus:
        if self._get_api_key():
            return ToolStatus.AVAILABLE
        return ToolStatus.UNAVAILABLE

    # ===== 8. 成本和耗时估算 =====
    def estimate_cost(self, inputs: dict[str, Any]) -> float:
        duration = int(inputs.get("duration", "5"))
        return 0.10 * (duration / 5)  # $0.10 / 5s

    def estimate_runtime(self, inputs: dict[str, Any]) -> float:
        return 60.0  # 约 1 分钟

    # ===== 9. 核心执行方法 =====
    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        api_key = self._get_api_key()
        if not api_key:
            return ToolResult(
                success=False,
                error="No API key found. " + self.install_instructions,
            )

        import requests

        start = time.time()
        prompt = inputs["prompt"]
        operation = inputs.get("operation", "text_to_video")
        duration = inputs.get("duration", "5")
        aspect_ratio = inputs.get("aspect_ratio", "16:9")
        seed = inputs.get("seed")

        # --- 提交生成任务 ---
        payload = {
            "prompt": prompt,
            "duration": int(duration),
            "aspect_ratio": aspect_ratio,
        }
        if seed is not None:
            payload["seed"] = seed
        if operation == "image_to_video" and inputs.get("image_url"):
            payload["image_url"] = inputs["image_url"]

        try:
            response = requests.post(
                "https://api.example.com/v1/video/generate",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            task_id = response.json()["task_id"]

            # --- 轮询等待完成 ---
            video_url = None
            for _ in range(120):  # 最多等 10 分钟
                time.sleep(5)
                status_resp = requests.get(
                    f"https://api.example.com/v1/video/tasks/{task_id}",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=15,
                )
                status_resp.raise_for_status()
                task_data = status_resp.json()

                if task_data["status"] == "completed":
                    video_url = task_data["video_url"]
                    break
                elif task_data["status"] == "failed":
                    return ToolResult(
                        success=False,
                        error=f"Generation failed: {task_data.get('error', 'unknown')}",
                    )

            if not video_url:
                return ToolResult(success=False, error="Generation timed out")

            # --- 下载视频 ---
            video_response = requests.get(video_url, timeout=120)
            video_response.raise_for_status()

            output_path = Path(inputs.get("output_path", "generated_video.mp4"))
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(video_response.content)

        except Exception as e:
            return ToolResult(success=False, error=f"MyModel generation failed: {e}")

        return ToolResult(
            success=True,
            data={
                "provider": "my_model",
                "task_id": task_id,
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
            },
            artifacts=[str(output_path)],
            cost_usd=self.estimate_cost(inputs),
            duration_seconds=round(time.time() - start, 2),
            seed=seed,
            model="my_model_v1",
        )
