"""
FastAPI route handlers for User Settings, Preferences & BYOK Hub (/settings).
Endpoints:
  GET  /user/settings          — Retrieve current user preferences and masked keys
  PUT  /user/settings          — Update preferences, custom instructions, and keys
  POST /user/settings/test-key — Validate API key connectivity and measure latency
"""
from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.user_settings_service import (
    get_or_create_user_settings,
    test_provider_api_key,
    update_user_settings,
)
from app.db.database import get_db
from app.db.models import User

router = APIRouter(prefix="/user/settings", tags=["settings"])


# ── Request Models ──────────────────────────────────────────────────

class UpdateSettingsRequest(BaseModel):
    default_engine: Optional[str] = None
    default_lens: Optional[str] = None
    default_loops: Optional[int] = None
    custom_instructions: Optional[str] = None
    preferred_domains: Optional[str] = None
    theme_mode: Optional[str] = None
    accent_color: Optional[str] = None
    email_on_complete: Optional[bool] = None
    email_weekly_digest: Optional[bool] = None
    custom_groq_key: Optional[str] = None
    custom_openai_key: Optional[str] = None
    custom_anthropic_key: Optional[str] = None
    custom_openrouter_key: Optional[str] = None
    custom_model: Optional[str] = None


class TestKeyRequest(BaseModel):
    provider: str = Field(..., description="Provider: groq, openai, anthropic, openrouter")
    api_key: str = Field(..., min_length=4)
    model: Optional[str] = None


# ── Settings Endpoints ──────────────────────────────────────────────

@router.get("")
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieves the authenticated user's settings with masked API keys."""
    return await get_or_create_user_settings(user_id=current_user.id, db=db)


@router.put("")
async def update_settings(
    req: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Updates the authenticated user's preferences, persona, and BYOK keys."""
    return await update_user_settings(
        user_id=current_user.id,
        data=req.model_dump(exclude_unset=True),
        db=db,
    )


@router.post("/test-key")
async def test_key_endpoint(
    req: TestKeyRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Validates an API key against the provider with live round-trip latency."""
    res = await test_provider_api_key(
        provider=req.provider,
        api_key=req.api_key,
        model=req.model,
    )
    if res.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("error", "API key verification failed."),
        )
    return res
