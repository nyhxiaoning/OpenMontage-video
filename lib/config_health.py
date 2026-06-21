"""Configuration health checker for OpenMontage model providers.

Provides lightweight health checks for each API provider to validate
that configured API keys are valid without running full generation.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

import httpx


class HealthStatus(str, Enum):
    OK = "ok"
    MISSING_KEY = "missing_key"
    INVALID_KEY = "invalid_key"
    RATE_LIMITED = "rate_limited"
    ERROR = "error"
    UNKNOWN = "unknown"


@dataclass
class ProviderHealth:
    """Health check result for a single provider."""
    provider: str
    status: HealthStatus
    message: str = ""
    checked_at: float = field(default_factory=time.time)
    latency_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "status": self.status.value,
            "message": self.message,
            "checked_at": self.checked_at,
            "latency_ms": round(self.latency_ms, 1),
        }


# Provider-specific health check configurations
# Each entry maps env var → lightweight API endpoint + expected response
_HEALTH_CHECKS: dict[str, dict] = {
    "fal": {
        "env_var": "FAL_KEY",
        "url": "https://rest.fal.ai/v1/status",
        "headers": lambda key: {"Authorization": f"Key {key}"},
        "success_codes": [200],
        "label": "fal.ai (Seedance / FLUX / Recraft)",
    },
    "openai": {
        "env_var": "OPENAI_API_KEY",
        "url": "https://api.openai.com/v1/models",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
        "success_codes": [200],
        "label": "OpenAI (GPT / DALL-E / TTS)",
    },
    "google": {
        "env_var": "GOOGLE_API_KEY",
        "url": "https://generativelanguage.googleapis.com/v1beta/models?key={key}",
        "headers": lambda key: {},
        "success_codes": [200],
        "label": "Google (Imagen / TTS)",
    },
    "elevenlabs": {
        "env_var": "ELEVENLABS_API_KEY",
        "url": "https://api.elevenlabs.io/v1/user",
        "headers": lambda key: {"xi-api-key": key},
        "success_codes": [200],
        "label": "ElevenLabs (TTS / Music)",
    },
    "suno": {
        "env_var": "SUNO_API_KEY",
        "url": "https://sunoapi.org/api/v1/user/info",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
        "success_codes": [200],
        "label": "Suno (Music)",
    },
    "runway": {
        "env_var": "RUNWAY_API_KEY",
        "url": "https://api.runwayml.com/v1/health",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
        "success_codes": [200],
        "label": "Runway (Video Gen)",
    },
    "heygen": {
        "env_var": "HEYGEN_API_KEY",
        "url": "https://api.heygen.com/v1/user/me",
        "headers": lambda key: {"X-Api-Key": key},
        "success_codes": [200],
        "label": "HeyGen (Avatar Video)",
    },
    "pexels": {
        "env_var": "PEXELS_API_KEY",
        "url": "https://api.pexels.com/v1/collections/featured",
        "headers": lambda key: {"Authorization": key},
        "success_codes": [200],
        "label": "Pexels (Stock Video/Images)",
    },
    "pixabay": {
        "env_var": "PIXABAY_API_KEY",
        "url": "https://pixabay.com/api/?key={key}&q=test&per_page=1",
        "headers": lambda key: {},
        "success_codes": [200],
        "label": "Pixabay (Stock Video/Images)",
    },
    "doubao": {
        "env_var": "DOUBAO_SPEECH_API_KEY",
        "url": "https://ark.cn-beijing.volces.com/api/v3/models",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
        "success_codes": [200, 401],
        "label": "Doubao (TTS)",
    },
    "tongyi": {
        "env_var": "TONGYI_API_KEY",
        "url": "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
        "headers": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        "success_codes": [200, 400, 401],
        "label": "Tongyi (Image Gen)",
    },
}


async def _check_single_provider(
    provider: str,
    config: dict,
    api_key: Optional[str],
    timeout: float = 5.0,
) -> ProviderHealth:
    """Run a single provider health check."""
    if not api_key:
        return ProviderHealth(
            provider=provider,
            status=HealthStatus.MISSING_KEY,
            message=f"{config['label']}: API key not configured (env: {config['env_var']})",
        )

    url = config["url"].replace("{key}", api_key)
    headers = config["headers"](api_key)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            start = time.monotonic()
            response = await client.get(url, headers=headers)
            latency = (time.monotonic() - start) * 1000

            if response.status_code in config["success_codes"]:
                if response.status_code == 401:
                    return ProviderHealth(
                        provider=provider,
                        status=HealthStatus.INVALID_KEY,
                        message=f"{config['label']}: API key is invalid (401)",
                        latency_ms=latency,
                    )
                return ProviderHealth(
                    provider=provider,
                    status=HealthStatus.OK,
                    message=f"{config['label']}: Connected ({latency:.0f}ms)",
                    latency_ms=latency,
                )
            elif response.status_code == 429:
                return ProviderHealth(
                    provider=provider,
                    status=HealthStatus.RATE_LIMITED,
                    message=f"{config['label']}: Rate limited (429)",
                    latency_ms=latency,
                )
            else:
                return ProviderHealth(
                    provider=provider,
                    status=HealthStatus.ERROR,
                    message=f"{config['label']}: HTTP {response.status_code}",
                    latency_ms=latency,
                )
    except httpx.TimeoutException:
        return ProviderHealth(
            provider=provider,
            status=HealthStatus.ERROR,
            message=f"{config['label']}: Connection timeout ({timeout}s)",
        )
    except Exception as e:
        return ProviderHealth(
            provider=provider,
            status=HealthStatus.ERROR,
            message=f"{config['label']}: {type(e).__name__}: {e}",
        )


async def check_all_providers(
    env: Optional[dict[str, str]] = None,
    timeout: float = 5.0,
) -> list[ProviderHealth]:
    """Check health of all known providers in parallel."""
    if env is None:
        import os
        env = os.environ

    tasks = []
    for provider, config in _HEALTH_CHECKS.items():
        api_key = env.get(config["env_var"])
        tasks.append(_check_single_provider(provider, config, api_key, timeout))

    return await asyncio.gather(*tasks)


def get_configured_providers(env: Optional[dict[str, str]] = None) -> list[str]:
    """Return list of provider names that have API keys configured."""
    if env is None:
        import os
        env = os.environ

    configured = []
    for provider, config in _HEALTH_CHECKS.items():
        if env.get(config["env_var"]):
            configured.append(provider)
    return configured
