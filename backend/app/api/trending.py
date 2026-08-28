"""
FastAPI route handlers for Dynamic Trending Research Inquiries.
Endpoints:
  GET /research/trending-topics          — List 4-8 categorized trending research inquiries
  GET /research/trending-topics/wildcard — Generate a cross-disciplinary hypothesis wildcard
"""
from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, Query

from app.core.trending_service import (
    get_trending_research_topics,
    get_wildcard_interdisciplinary_prompt,
)

router = APIRouter(prefix="/research/trending-topics", tags=["trending"])


@router.get("")
async def list_trending_topics(
    category: Optional[str] = Query(None, description="Category filter: ai, biotech, energy, quantum, wildcard, all"),
    refresh: bool = Query(False, description="Force refresh trending cache"),
    offset: int = Query(0, ge=0, description="Offset for pagination/rotation"),
    count: int = Query(4, ge=1, le=12, description="Number of trending topics to return"),
) -> dict[str, Any]:
    """
    Returns curated, verified trending research inquiries from the live frontier cache.
    """
    topics = await get_trending_research_topics(
        category=category,
        refresh=refresh,
        count=count,
        offset=offset,
    )
    return {
        "status": "success",
        "category": category or "all",
        "total": len(topics),
        "topics": topics,
    }


@router.get("/wildcard")
async def get_wildcard_prompt() -> dict[str, Any]:
    """
    Returns a creative cross-disciplinary hypothesis prompt.
    """
    prompt = get_wildcard_interdisciplinary_prompt()
    return {
        "status": "success",
        "wildcard": prompt,
    }
