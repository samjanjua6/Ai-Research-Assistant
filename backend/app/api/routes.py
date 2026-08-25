"""
FastAPI route handlers for the Research Assistant API.

Endpoints:
  POST   /research                   — start a new run
  GET    /research                   — list past runs
  GET    /research/{run_id}          — get run status + final report
  GET    /research/{run_id}/stream   — SSE stream of live step events
"""

from __future__ import annotations

import asyncio
import json
import secrets
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.graph import graph
from app.agent.state import GraphState
from app.db.crud import (
    create_run,
    get_run,
    get_run_by_share_token,
    get_step_logs,
    list_runs,
    log_step,
    update_run_share_status,
    update_run_status,
)

from app.db.database import AsyncSessionLocal, get_db
from app.db.models import RunStatus, User
from app.core.logging import get_logger
from app.api.deps import get_current_user

logger = get_logger(__name__)
router = APIRouter(prefix="/research", tags=["research"])
public_router = APIRouter(prefix="/public", tags=["public"])


# ── Active cancellations registry ───────────────────────────────
ACTIVE_CANCELLATIONS: dict[str, asyncio.Event] = {}


# ── Request / Response schemas ────────────────────────────────────

class StartRunRequest(BaseModel):
    question: str


class RunSummaryResponse(BaseModel):
    id: str
    question: str
    status: str
    summary: str | None = None
    created_at: str
    loop_count: int = 0
    error: str | None = None

    class Config:
        from_attributes = True


class StepDetailResponse(BaseModel):
    node: str
    loop: int = 0
    payload: dict | None = None
    logged_at: str


class RunDetailResponse(BaseModel):
    id: str
    question: str
    status: str
    final_report: str | None
    summary: str | None
    sources: list[str] | None
    loop_count: int
    share_token: str | None = None
    is_public: bool = False
    views_count: int = 0
    steps: list[StepDetailResponse] = []
    created_at: str
    finished_at: str | None
    error: str | None = None

    class Config:
        from_attributes = True


class ShareRunRequest(BaseModel):
    is_public: bool = True


class ShareRunResponse(BaseModel):
    share_token: str | None
    share_url: str | None
    is_public: bool
    views_count: int = 0


class PublicReportResponse(BaseModel):
    id: str
    question: str
    status: str
    final_report: str | None
    summary: str | None
    sources: list[str] | None
    loop_count: int
    created_at: str
    views_count: int = 0
    author_name: str | None = None


# ── Background task: run the graph ───────────────────────────────

async def _run_graph(run_id: uuid.UUID, question: str) -> None:
    """
    Execute the LangGraph graph in a background task.
    Streams node-by-node updates, logs each step to DB, and persists
    the final report when the graph finishes.
    """
    cancel_event = asyncio.Event()
    ACTIVE_CANCELLATIONS[str(run_id)] = cancel_event

    async with AsyncSessionLocal() as db:
        await update_run_status(db, run_id, RunStatus.running)

    initial_state: GraphState = {
        "run_id": str(run_id),
        "question": question,
        "steps": [],
        "search_results": [],
        "draft": "",
        "review_notes": "",
        "gaps_found": False,
        "loop_count": 0,
        "final_report": "",
        "summary": "",
        "sources": [],
    }

    # We'll fold every partial update into accumulated so we can persist at the end
    accumulated: dict = dict(initial_state)

    try:
        # stream_mode="updates" yields {node_name: partial_state} after each node
        async for chunk in graph.astream(initial_state, stream_mode="updates"):
            if cancel_event.is_set():
                logger.info("graph_run_cancelled", run_id=str(run_id))
                return

            for node_name, state_update in chunk.items():
                if cancel_event.is_set():
                    logger.info("graph_run_cancelled", run_id=str(run_id))
                    return

                logger.info("graph_step", run_id=str(run_id), node=node_name)

                # Merge update — handle list fields (search_results) by appending
                for k, v in state_update.items():
                    if k == "search_results" and isinstance(v, list):
                        accumulated.setdefault("search_results", [])
                        accumulated["search_results"].extend(v)
                    else:
                        accumulated[k] = v

                # Persist a log row (skip raw search_results to avoid huge JSONB)
                async with AsyncSessionLocal() as db:
                    await log_step(
                        db,
                        run_id=run_id,
                        step_name=node_name,
                        loop_index=accumulated.get("loop_count", 0),
                        payload={
                            k: v
                            for k, v in state_update.items()
                            if k != "search_results"
                        },
                    )

    except Exception as exc:
        if cancel_event.is_set():
            logger.info("graph_run_cancelled_during_exception", run_id=str(run_id))
            return
        logger.error("graph_run_failed", run_id=str(run_id), error=str(exc))
        async with AsyncSessionLocal() as db:
            await log_step(
                db,
                run_id=run_id,
                step_name="error",
                loop_index=accumulated.get("loop_count", 0),
                payload={"error": str(exc)},
            )
            await update_run_status(db, run_id, RunStatus.failed)
        return
    finally:
        ACTIVE_CANCELLATIONS.pop(str(run_id), None)

    if cancel_event.is_set():
        return

    async with AsyncSessionLocal() as db:
        await update_run_status(
            db,
            run_id,
            RunStatus.done,
            final_report=accumulated.get("final_report", ""),
            summary=accumulated.get("summary", ""),
            sources=accumulated.get("sources", []),
            loop_count=accumulated.get("loop_count", 0),
        )
    logger.info("graph_run_complete", run_id=str(run_id))


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("", status_code=202)
async def start_research(
    body: StartRunRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new research run. Returns run_id immediately."""
    if not body.question.strip():
        raise HTTPException(status_code=422, detail="question must not be empty")

    run = await create_run(db, question=body.question.strip(), user_id=current_user.id)
    background_tasks.add_task(_run_graph, run.id, run.question)
    logger.info("research_started", run_id=str(run.id), user_id=str(current_user.id))
    return {"run_id": str(run.id), "status": run.status}

@router.post("/{run_id}/stop", status_code=200)
async def stop_research(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel / stop an ongoing research run."""
    run = await get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.user_id and run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to stop this run")

    if str(run_id) in ACTIVE_CANCELLATIONS:
        ACTIVE_CANCELLATIONS[str(run_id)].set()

    if run.status in (RunStatus.running, RunStatus.pending):
        await log_step(
            db,
            run_id=run_id,
            step_name="error",
            loop_index=run.loop_count,
            payload={"error": "Research stopped by user."},
        )
        await update_run_status(db, run_id, RunStatus.failed)
        return {"status": "stopped", "message": "Research run stopped successfully."}

    return {"status": run.status.value, "message": "Run is not active."}


@router.get("", response_model=list[RunSummaryResponse])
async def list_research_runs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return up to 20 most recent research runs for the authenticated user."""
    runs = await list_runs(db, user_id=current_user.id)
    results = []
    for r in runs:
        error_msg = None
        if r.status == RunStatus.failed:
            logs = await get_step_logs(db, r.id)
            for l in reversed(logs):
                if l.step_name == "error" and l.payload and "error" in l.payload:
                    error_msg = l.payload["error"]
                    break
        results.append(
            RunSummaryResponse(
                id=str(r.id),
                question=r.question,
                status=r.status.value,
                summary=r.summary,
                created_at=r.created_at.isoformat(),
                loop_count=r.loop_count,
                error=error_msg,
            )
        )
    return results


@router.get("/{run_id}", response_model=RunDetailResponse)
async def get_research_run(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current status and final report for a run."""
    run = await get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.user_id and run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this run")

    logs = await get_step_logs(db, run_id)
    error_msg = None
    if run.status == RunStatus.failed:
        for l in reversed(logs):
            if l.step_name == "error" and l.payload and "error" in l.payload:
                error_msg = l.payload["error"]
                break

    step_items = [
        StepDetailResponse(
            node=l.step_name,
            loop=l.loop_index,
            payload=l.payload,
            logged_at=l.logged_at.isoformat(),
        )
        for l in logs
        if l.step_name != "error"
    ]

    return RunDetailResponse(
        id=str(run.id),
        question=run.question,
        status=run.status.value,
        final_report=run.final_report,
        summary=run.summary,
        sources=run.sources or [],
        loop_count=run.loop_count,
        share_token=run.share_token,
        is_public=run.is_public or False,
        views_count=run.views_count or 0,
        steps=step_items,
        created_at=run.created_at.isoformat(),
        finished_at=run.finished_at.isoformat() if run.finished_at else None,
        error=error_msg,
    )


@router.get("/{run_id}/stream")
async def stream_research_run(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    SSE stream that polls step_logs and emits new events as the graph runs.
    The client receives one SSE event per graph node.
    Closes automatically when the run reaches done/failed status.
    Token auth supported via ?token= query param (EventSource cannot set headers).
    """
    run = await get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.user_id and run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to stream this run")

    async def event_generator() -> AsyncGenerator[dict, None]:
        seen_log_ids: set[str] = set()
        while True:
            async with AsyncSessionLocal() as session:
                current_run = await get_run(session, run_id)
                logs = await get_step_logs(session, run_id)

            for log in logs:
                log_str = str(log.id)
                if log_str not in seen_log_ids:
                    seen_log_ids.add(log_str)
                    yield {
                        "event": "step",
                        "data": json.dumps({
                            "node": log.step_name,
                            "loop": log.loop_index,
                            "payload": log.payload,
                            "logged_at": log.logged_at.isoformat(),
                        }),
                    }

            if current_run and current_run.status in (RunStatus.done, RunStatus.failed):
                error_msg = None
                if current_run.status == RunStatus.failed:
                    for l in reversed(logs):
                        if l.step_name == "error" and l.payload and "error" in l.payload:
                            error_msg = l.payload["error"]
                            break
                    if not error_msg:
                        error_msg = "The research run failed. Check server logs."

                yield {
                    "event": "done",
                    "data": json.dumps({
                        "status": current_run.status.value,
                        "summary": current_run.summary,
                        "final_report": current_run.final_report,
                        "sources": current_run.sources or [],
                        "error": error_msg,
                    }),
                }
                break

            await asyncio.sleep(1.5)

    return EventSourceResponse(event_generator())


@router.post("/{run_id}/share", response_model=ShareRunResponse)
async def toggle_share_research_run(
    run_id: uuid.UUID,
    payload: ShareRunRequest = ShareRunRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enable or disable public sharing for a research run."""
    run = await get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.user_id and run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to share this run")

    share_token = run.share_token
    if payload.is_public and not share_token:
        # Generate clean 8-character URL-safe token (e.g. "aB9_xZ1q")
        share_token = secrets.token_urlsafe(6)

    updated_run = await update_run_share_status(
        db,
        run_id,
        is_public=payload.is_public,
        share_token=share_token,
    )
    if not updated_run:
        raise HTTPException(status_code=500, detail="Failed to update share status")

    return ShareRunResponse(
        share_token=updated_run.share_token if updated_run.is_public else None,
        share_url=f"/r/{updated_run.share_token}" if updated_run.is_public and updated_run.share_token else None,
        is_public=updated_run.is_public,
        views_count=updated_run.views_count or 0,
    )


# ── Public Report Router (No authentication required) ──────────────

@public_router.get("/reports/{share_token}", response_model=PublicReportResponse)
async def get_public_report(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch a public research report by its unique share token."""
    run = await get_run_by_share_token(db, share_token, increment_views=True)
    if not run:
        raise HTTPException(
            status_code=404,
            detail="Report not found or has been made private by author",
        )

    author_name = run.user.name if run.user else None

    return PublicReportResponse(
        id=str(run.id),
        question=run.question,
        status=run.status.value,
        final_report=run.final_report,
        summary=run.summary,
        sources=run.sources or [],
        loop_count=run.loop_count,
        created_at=run.created_at.isoformat(),
        views_count=run.views_count or 0,
        author_name=author_name,
    )


