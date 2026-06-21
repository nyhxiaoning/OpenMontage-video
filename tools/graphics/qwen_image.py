"""Qwen / Tongyi Wanxiang (通义万相) image generation via DashScope API.

Supports multiple models:
- wanx-v1: 通义万相 1.0 (standard)
- wanx2.1-t2i-turbo: 通义万相 2.1 Turbo (fast, low cost)
- wanx2.1-t2i-plus: 通义万相 2.1 Plus (high quality)
- flux-schnell: FLUX via DashScope (fast)

Requires DASHSCOPE_API_KEY environment variable.
Get one at https://dashscope.console.aliyun.com/apiKey
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


# Model-specific pricing (USD per image)
_MODEL_COST = {
    "wanx-v1": 0.04,
    "wanx2.1-t2i-turbo": 0.01,
    "wanx2.1-t2i-plus": 0.06,
    "flux-schnell": 0.003,
}

# Supported resolutions per model
_MODEL_RESOLUTIONS = {
    "wanx-v1": [
        "512*512", "720*720", "1024*1024",
        "720*1280", "1280*720",
    ],
    "wanx2.1-t2i-turbo": [
        "512*512", "720*720", "1024*1024",
        "720*1280", "1280*720",
    ],
    "wanx2.1-t2i-plus": [
        "512*512", "720*720", "1024*1024",
        "720*1280", "1280*720",
    ],
    "flux-schnell": [
        "512*512", "768*768", "1024*1024",
        "768*1344", "1344*768",
    ],
}


class QwenImage(BaseTool):
    name = "qwen_image"
    version = "0.1.0"
    tier = ToolTier.GENERATE
    capability = "image_generation"
    provider = "qwen"
    stability = ToolStability.BETA
    execution_mode = ExecutionMode.SYNC
    determinism = Determinism.STOCHASTIC
    runtime = ToolRuntime.API

    dependencies = []  # checked dynamically via env var
    install_instructions = (
        "Set DASHSCOPE_API_KEY to your DashScope API key.\n"
        "  Get one at https://dashscope.console.aliyun.com/apiKey"
    )
    agent_skills = ["flux-best-practices", "bfl-api"]

    capabilities = ["generate_image", "text_to_image", "image_edit"]
    supports = {
        "negative_prompt": True,
        "seed": True,
        "custom_size": True,
        "style_transfer": True,
        "watermark": False,
    }
    best_for = [
        "Chinese-style and anime/illustration images",
        "low-cost generation (~$0.01-0.06/image)",
        "fast iteration with turbo model",
        "high quality with plus model",
    ]
    not_good_for = ["offline generation", "photorealistic without style prefix"]
    fallback_tools = ["flux_image", "openai_image", "pexels_image"]

    input_schema = {
        "type": "object",
        "required": ["prompt"],
        "properties": {
            "prompt": {"type": "string", "description": "Image description in any language"},
            "negative_prompt": {
                "type": "string",
                "default": "",
                "description": "What to avoid in the generated image",
            },
            "width": {"type": "integer", "default": 1024, "description": "Image width in pixels"},
            "height": {"type": "integer", "default": 1024, "description": "Image height in pixels"},
            "model": {
                "type": "string",
                "enum": ["wanx-v1", "wanx2.1-t2i-turbo", "wanx2.1-t2i-plus", "flux-schnell"],
                "default": "wanx2.1-t2i-turbo",
                "description": "Model to use. turbo=fast/cheap, plus=high quality, flux-schnell=FLUX fast",
            },
            "style": {
                "type": "string",
                "description": "Style preset (model-dependent). Examples: <auto>, <3d>, <anime>, <oil_painting>, <watercolor>, <sketch>",
                "default": "",
            },
            "seed": {"type": "integer", "description": "Random seed for reproducibility"},
            "n": {"type": "integer", "default": 1, "description": "Number of images to generate (1-4)"},
            "output_path": {"type": "string", "description": "Output file path"},
        },
    }

    resource_profile = ResourceProfile(
        cpu_cores=1, ram_mb=256, vram_mb=0, disk_mb=100, network_required=True
    )
    retry_policy = RetryPolicy(max_retries=2, retryable_errors=["rate_limit", "timeout"])
    idempotency_key_fields = ["prompt", "width", "height", "seed", "model", "style"]
    side_effects = ["writes image file to output_path", "calls DashScope API"]
    user_visible_verification = ["Inspect generated image for relevance and quality"]

    def _get_api_key(self) -> str | None:
        return os.environ.get("DASHSCOPE_API_KEY") or os.environ.get("DASHSCOPE_API_KEY")

    def get_status(self) -> ToolStatus:
        if self._get_api_key():
            return ToolStatus.AVAILABLE
        return ToolStatus.UNAVAILABLE

    def estimate_cost(self, inputs: dict[str, Any]) -> float:
        model = inputs.get("model", "wanx2.1-t2i-turbo")
        n = inputs.get("n", 1)
        return _MODEL_COST.get(model, 0.04) * n

    def estimate_runtime(self, inputs: dict[str, Any]) -> float:
        model = inputs.get("model", "wanx2.1-t2i-turbo")
        if model == "wanx2.1-t2i-turbo":
            return 10.0
        if model == "flux-schnell":
            return 5.0
        return 30.0  # wanx-v1, wanx2.1-t2i-plus

    def _build_size(self, width: int, height: int, model: str) -> str:
        """Map pixel dimensions to DashScope resolution string."""
        resolutions = _MODEL_RESOLUTIONS.get(model, _MODEL_RESOLUTIONS["wanx-v1"])
        target = f"{width}*{height}"
        if target in resolutions:
            return target
        # Find closest resolution
        best = resolutions[0]
        best_diff = abs(width * height - int(best.split("*")[0]) * int(best.split("*")[1]))
        for res in resolutions[1:]:
            w, h = res.split("*")
            diff = abs(width * height - int(w) * int(h))
            if diff < best_diff:
                best = res
                best_diff = diff
        return best

    def _submit_task(self, api_key: str, payload: dict[str, Any], model: str) -> str:
        """Submit an image generation task and return task_id."""
        import requests

        # Use compatible mode API (OpenAI-style)
        response = requests.post(
            "https://dashscope.aliyuncs.com/compatible-mode/v1/images/generations",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "prompt": payload["prompt"],
                "negative_prompt": payload.get("negative_prompt", ""),
                "size": payload["size"],
                "n": payload.get("n", 1),
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def _submit_task_async(self, api_key: str, payload: dict[str, Any], model: str) -> str:
        """Submit an async task via DashScope native API and return task_id."""
        import requests

        response = requests.post(
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-DashScope-Async": "enable",
            },
            json={
                "model": model,
                "input": {"prompt": payload["prompt"]},
                "parameters": {
                    "size": payload["size"],
                    "n": payload.get("n", 1),
                    "seed": payload.get("seed"),
                },
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return data["output"]["task_id"]

    def _poll_task(self, api_key: str, task_id: str, timeout: int = 120) -> list[str]:
        """Poll async task until completion, return list of image URLs."""
        import requests

        deadline = time.time() + timeout
        while time.time() < deadline:
            response = requests.get(
                f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()
            status = data["output"]["task_status"]

            if status == "SUCCEEDED":
                results = data["output"].get("results", [])
                return [r["url"] for r in results if "url" in r]
            elif status == "FAILED":
                error_msg = data["output"].get("message", "Unknown error")
                raise RuntimeError(f"DashScope task failed: {error_msg}")

            time.sleep(3)

        raise TimeoutError(f"DashScope task {task_id} timed out after {timeout}s")

    def _download_image(self, url: str, output_path: Path) -> None:
        """Download image from URL and save to file."""
        import requests

        response = requests.get(url, timeout=60)
        response.raise_for_status()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(response.content)

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        api_key = self._get_api_key()
        if not api_key:
            return ToolResult(
                success=False,
                error="No DashScope API key found. " + self.install_instructions,
            )

        import requests

        start = time.time()
        model = inputs.get("model", "wanx2.1-t2i-turbo")
        prompt = inputs["prompt"]
        width = inputs.get("width", 1024)
        height = inputs.get("height", 1024)
        n = inputs.get("n", 1)
        style = inputs.get("style", "")
        seed = inputs.get("seed")

        # Build size string
        size = self._build_size(width, height, model)

        # Prepend style to prompt if provided
        if style:
            styled_prompt = f"{style} {prompt}"
        else:
            styled_prompt = prompt

        payload = {
            "prompt": styled_prompt,
            "negative_prompt": inputs.get("negative_prompt", ""),
            "size": size,
            "n": n,
        }
        if seed is not None:
            payload["seed"] = seed

        try:
            # Use compatible mode API (simpler, returns results directly)
            response = requests.post(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "prompt": styled_prompt,
                    "negative_prompt": inputs.get("negative_prompt", ""),
                    "size": size,
                    "n": n,
                },
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()

            # Extract image URLs from response
            images = data.get("data", [])
            if not images:
                return ToolResult(
                    success=False,
                    error=f"No images returned from DashScope. Response: {data}",
                )

            # Download and save images
            artifacts = []
            base_path = Path(inputs.get("output_path", "generated_image.png"))

            for i, img in enumerate(images):
                image_url = img.get("url")
                if not image_url:
                    continue

                if n == 1:
                    out_path = base_path
                else:
                    stem = base_path.stem
                    suffix = base_path.suffix or ".png"
                    out_path = base_path.parent / f"{stem}_{i+1}{suffix}"

                self._download_image(image_url, out_path)
                artifacts.append(str(out_path))

            if not artifacts:
                return ToolResult(
                    success=False,
                    error="Failed to download any generated images",
                )

        except requests.exceptions.HTTPError as e:
            error_detail = ""
            try:
                error_detail = e.response.json().get("error", {}).get("message", "")
            except Exception:
                error_detail = e.response.text[:500] if e.response else ""
            return ToolResult(
                success=False,
                error=f"DashScope API error: {e}. {error_detail}",
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Qwen image generation failed: {e}")

        return ToolResult(
            success=True,
            data={
                "provider": "qwen",
                "model": model,
                "prompt": prompt,
                "styled_prompt": styled_prompt,
                "size": size,
                "n": n,
                "outputs": artifacts,
            },
            artifacts=artifacts,
            cost_usd=self.estimate_cost(inputs),
            duration_seconds=round(time.time() - start, 2),
            seed=seed,
            model=model,
        )
