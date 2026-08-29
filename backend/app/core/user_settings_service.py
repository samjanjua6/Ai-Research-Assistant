"""
User Settings, Preferences, and Bring Your Own Key (BYOK) Service.
Handles configuration persistence, API key masking/testing, researcher persona customization,
and institutional domain whitelisting.
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any
from litellm import acompletion
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import User, UserSettings

logger = get_logger(__name__)


def _mask_key(key: str | None) -> str | None:
    """Masks an API key for safe client display (e.g. gsk_••••••••abcd)."""
    if not key or len(key) < 8:
        return None
    prefix = key[:4]
    suffix = key[-4:]
    return f"{prefix}••••••••{suffix}"


def _format_settings_dict(settings: UserSettings) -> dict[str, Any]:
    """Formats UserSettings model into clean JSON response with masked keys."""
    return {
        "user_id": str(settings.user_id),
        "default_engine": settings.default_engine or "langgraph",
        "default_lens": settings.default_lens or "",
        "default_loops": settings.default_loops or 2,
        "custom_instructions": settings.custom_instructions or "",
        "preferred_domains": settings.preferred_domains or "",
        "theme_mode": settings.theme_mode or "system",
        "accent_color": settings.accent_color or "violet",
        "email_on_complete": settings.email_on_complete,
        "email_weekly_digest": settings.email_weekly_digest,
        "custom_model": settings.custom_model or "",
        # Masked keys
        "custom_groq_key_masked": _mask_key(settings.custom_groq_key),
        "custom_openai_key_masked": _mask_key(settings.custom_openai_key),
        "custom_anthropic_key_masked": _mask_key(settings.custom_anthropic_key),
        "custom_openrouter_key_masked": _mask_key(settings.custom_openrouter_key),
        # Has key flags
        "has_groq_key": bool(settings.custom_groq_key),
        "has_openai_key": bool(settings.custom_openai_key),
        "has_anthropic_key": bool(settings.custom_anthropic_key),
        "has_openrouter_key": bool(settings.custom_openrouter_key),
        "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
    }


async def get_or_create_user_settings(user_id: uuid.UUID, db: AsyncSession) -> dict[str, Any]:
    """Retrieves user settings or initializes defaults in PostgreSQL."""
    query = select(UserSettings).where(UserSettings.user_id == user_id)
    res = await db.execute(query)
    settings = res.scalar_one_or_none()

    if not settings:
        settings = UserSettings(
            user_id=user_id,
            default_engine="langgraph",
            default_lens="",
            default_loops=2,
            custom_instructions="",
            preferred_domains="nature.com, arxiv.org, ieee.org, sciencedirect.com",
            theme_mode="system",
            accent_color="violet",
            email_on_complete=True,
            email_weekly_digest=False,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return _format_settings_dict(settings)


async def update_user_settings(
    user_id: uuid.UUID,
    data: dict[str, Any],
    db: AsyncSession,
) -> dict[str, Any]:
    """Updates user preferences, persona instructions, and BYOK custom keys."""
    query = select(UserSettings).where(UserSettings.user_id == user_id)
    res = await db.execute(query)
    settings = res.scalar_one_or_none()

    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)

    # General & Engine
    if "default_engine" in data:
        settings.default_engine = str(data["default_engine"]).lower()
    if "default_lens" in data:
        settings.default_lens = str(data["default_lens"]).strip()
    if "default_loops" in data:
        settings.default_loops = max(1, min(int(data["default_loops"]), 4))

    # Persona & Whitelist
    if "custom_instructions" in data:
        settings.custom_instructions = str(data["custom_instructions"] or "").strip()
    if "preferred_domains" in data:
        settings.preferred_domains = str(data["preferred_domains"] or "").strip()

    # Themes & Appearance
    if "theme_mode" in data:
        settings.theme_mode = str(data["theme_mode"]).lower()
    if "accent_color" in data:
        settings.accent_color = str(data["accent_color"]).lower()

    # Notifications
    if "email_on_complete" in data:
        settings.email_on_complete = bool(data["email_on_complete"])
    if "email_weekly_digest" in data:
        settings.email_weekly_digest = bool(data["email_weekly_digest"])

    # Custom Model
    if "custom_model" in data:
        settings.custom_model = str(data["custom_model"] or "").strip()

    # BYOK Keys (only overwrite if a non-masked new key is supplied)
    for field in ["custom_groq_key", "custom_openai_key", "custom_anthropic_key", "custom_openrouter_key"]:
        if field in data:
            val = str(data[field] or "").strip()
            if val and "••••" not in val:
                setattr(settings, field, val)
            elif val == "":  # explicit clear
                setattr(settings, field, None)

    settings.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(settings)

    return _format_settings_dict(settings)


async def test_provider_api_key(
    provider: str,
    api_key: str,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Tests an API key against the provider by running an ephemeral 1-token test prompt.
    Returns status, roundtrip latency, and verified model.
    """
    prov = provider.lower().strip()
    key = api_key.strip()
    if not key:
        return {"status": "error", "error": "API key cannot be empty."}

    # Pick test model based on provider
    if prov == "groq":
        target_model = f"groq/{model or 'llama-3.1-8b-instant'}"
    elif prov == "openai":
        target_model = f"openai/{model or 'gpt-4o-mini'}"
    elif prov == "anthropic":
        target_model = f"anthropic/{model or 'claude-3-5-haiku-20241022'}"
    elif prov in ("openrouter", "perplexity"):
        target_model = f"openrouter/{model or 'meta-llama/llama-3.3-70b-instruct'}"
    else:
        target_model = f"{prov}/{model or 'gpt-3.5-turbo'}"

    start_time = time.perf_counter()
    try:
        response = await acompletion(
            model=target_model,
            api_key=key,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=2,
            temperature=0.0,
            timeout=12.0,
        )
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "status": "success",
            "provider": prov,
            "model": target_model,
            "latency_ms": elapsed_ms,
            "message": f"Successfully connected to {provider.upper()} ({elapsed_ms}ms)",
        }
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.warning("byok_test_failed", provider=prov, error=str(e))
        return {
            "status": "error",
            "provider": prov,
            "latency_ms": elapsed_ms,
            "error": str(e),
        }
