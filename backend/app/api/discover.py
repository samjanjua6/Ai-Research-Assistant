"""
FastAPI route handlers for Public Research Discover & Community Showcase (/discover).
Endpoints:
  GET  /public/discover/feed      — Curated community feed with filters
  GET  /public/discover/stats     — Global community velocity telemetry
  POST /public/discover/{run_id}/upvote — Record upvotes / claps
  POST /public/discover/{run_id}/fork   — Record 1-click fork inquiry
"""
from __future__ import annotations

import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.discover_service import (
    get_community_stats,
    get_public_discover_feed,
    record_report_fork,
    record_report_upvote,
)
from app.db.database import get_db

router = APIRouter(prefix="/public/discover", tags=["discover"])


# ── Pydantic Request Models ─────────────────────────────────────────

class UpvoteRequest(BaseModel):
    count: int = Field(1, ge=1, le=10)


class ForkRequest(BaseModel):
    new_lens: str = Field(..., description="Target lens: /CHALLENGE, /ANGLE, /DEEP, /HYP, /VOICES")
    new_question: str = Field(..., min_length=3)


# ── Discover Endpoints ──────────────────────────────────────────────

@router.get("/feed")
async def get_discover_feed(
    category: Optional[str] = Query("all", description="Category: all, ai, biotech, energy, quantum, economics"),
    sort_by: str = Query("trending", description="Sort order: trending, latest, clapped, confidence"),
    search: Optional[str] = Query(None, description="Search term in title/summary"),
    engine: Optional[str] = Query("all", description="Engine filter: all, langgraph, crewai"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Returns curated public research inquiries matching criteria."""
    return await get_public_discover_feed(
        category=category,
        sort_by=sort_by,
        search_query=search,
        engine=engine,
        limit=limit,
        offset=offset,
        db=db,
    )


@router.get("/stats")
async def get_discover_stats(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Returns global community discovery telemetry."""
    return await get_community_stats(db=db)


@router.post("/{run_id}/upvote")
async def upvote_report_endpoint(
    run_id: uuid.UUID,
    req: UpvoteRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Records claps / upvotes for a research report."""
    try:
        return await record_report_upvote(run_id=run_id, count=req.count, db=db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{run_id}/fork")
async def fork_report_endpoint(
    run_id: uuid.UUID,
    req: ForkRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Records that a public report was forked."""
    return await record_report_fork(
        parent_run_id=run_id,
        new_lens=req.new_lens,
        new_question=req.new_question,
        db=db,
    )
