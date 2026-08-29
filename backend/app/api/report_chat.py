"""
FastAPI route handlers for Interactive 'Chat with Report', Section Expander & Citation Verifier.
Endpoints:
  GET    /research/{run_id}/chat                    — Retrieve chat history
  POST   /research/{run_id}/chat                    — SSE streaming follow-up Q&A
  POST   /research/{run_id}/expand-section          — Expand section (elaborate, counter-arguments, table)
  POST   /research/{run_id}/explain-selection       — Explain highlighted text selection
  POST   /research/{run_id}/append-section          — Append expanded section to report in DB
  GET    /research/{run_id}/citations/{index}       — Get citation quote & verification details
  DELETE /research/{run_id}/chat                    — Clear chat history
"""
from __future__ import annotations

import uuid
from typing import Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_optional
from app.core.report_chat_service import (
    append_section_to_report,
    expand_report_section,
    explain_text_selection,
    get_citation_verification_details,
    stream_chat_with_report,
)
from app.db.database import get_db
from app.db.models import ReportChatMessage, ResearchRun, User

router = APIRouter(prefix="/research", tags=["report-chat"])


# ── Pydantic Request Models ─────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=50000)
    chat_history: list[dict[str, Any]] = Field(default_factory=list)


class ExpandSectionRequest(BaseModel):
    section_title: str = Field(default="")
    section_content: str = Field(default="")
    action: str = Field(default="elaborate")


class ExplainSelectionRequest(BaseModel):
    selected_text: str = Field(default="")
    action: str = Field(default="eli5")


class AppendSectionRequest(BaseModel):
    section_title: str = Field(default="")
    addition_content: str = Field(default="")


# ── Chat Endpoints ──────────────────────────────────────────────────

@router.get("/{run_id}/chat")
async def get_report_chat_history(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieves conversation history for a research report."""
    query = (
        select(ReportChatMessage)
        .where(ReportChatMessage.run_id == run_id)
        .order_by(ReportChatMessage.created_at.asc())
    )
    res = await db.execute(query)
    messages = res.scalars().all()

    items = []
    for m in messages:
        items.append({
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "sources_referenced": m.sources_referenced or [],
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    return {"status": "success", "messages": items}


@router.post("/{run_id}/chat")
async def send_report_chat_message(
    run_id: uuid.UUID,
    req: ChatMessageRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Streams a grounded response to a user follow-up question over the research report."""
    # Fetch run
    query = select(ResearchRun).where(ResearchRun.id == run_id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Research report not found")

    user_id = current_user.id if current_user else run.user_id

    return StreamingResponse(
        stream_chat_with_report(
            run=run,
            message=req.message.strip(),
            chat_history=req.chat_history,
            user_id=user_id,
            db=db,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/{run_id}/chat")
async def clear_report_chat_history(
    run_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Clears conversation history for a research report."""
    await db.execute(delete(ReportChatMessage).where(ReportChatMessage.run_id == run_id))
    await db.commit()
    return {"status": "success", "message": "Chat history cleared"}


# ── Section Expander & Selection Popover Endpoints ──────────────────

@router.post("/{run_id}/expand-section")
async def expand_section_endpoint(
    run_id: uuid.UUID,
    req: ExpandSectionRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Expands a specific report section with deeper details or counter-arguments."""
    query = select(ResearchRun).where(ResearchRun.id == run_id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Research report not found")

    result = await expand_report_section(
        run=run,
        section_title=req.section_title,
        section_content=req.section_content,
        action=req.action,
    )
    return {"status": "success", **result}


@router.post("/{run_id}/explain-selection")
async def explain_selection_endpoint(
    run_id: uuid.UUID,
    req: ExplainSelectionRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Explains highlighted report text selection in plain English or extracts data."""
    query = select(ResearchRun).where(ResearchRun.id == run_id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Research report not found")

    result = await explain_text_selection(
        run=run,
        selected_text=req.selected_text,
        action=req.action,
    )
    return {"status": "success", **result}


@router.post("/{run_id}/append-section")
async def append_section_endpoint(
    run_id: uuid.UUID,
    req: AppendSectionRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Appends an expanded section directly into the master report in PostgreSQL."""
    user_id = current_user.id if current_user else None
    try:
        updated_run = await append_section_to_report(
            run_id=run_id,
            user_id=user_id,
            section_title=req.section_title,
            addition_content=req.addition_content,
            db=db,
        )
        return {
            "status": "success",
            "final_report": updated_run.final_report,
            "message": "Report successfully updated with expanded section.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Citation Verifier Detail Endpoint ───────────────────────────────

@router.get("/{run_id}/citations/{citation_index}")
async def get_citation_details_endpoint(
    run_id: uuid.UUID,
    citation_index: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Returns verified passage quote and institutional authority metrics for source [index]."""
    query = select(ResearchRun).where(ResearchRun.id == run_id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Research report not found")

    try:
        details = get_citation_verification_details(run, citation_index)
        return {"status": "success", "citation": details}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
