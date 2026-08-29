"""
FastAPI route handlers for Personal Usage & Research Analytics Dashboard.
Endpoint:
  GET /research/analytics/me — Comprehensive personal productivity and research telemetry
"""
from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.analytics_service import compute_user_research_analytics
from app.db.database import get_db
from app.db.models import User

router = APIRouter(prefix="/research/analytics", tags=["analytics"])


@router.get("/me")
async def get_my_research_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Returns personal usage telemetry, hours saved ROI, 30-day heatmap,
    command lens mastery, and keyphrase topic clusters for the authenticated user.
    """
    analytics = await compute_user_research_analytics(
        user_id=current_user.id,
        db=db,
    )
    return {
        "status": "success",
        "user": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "analytics": analytics,
    }
