"""
FastAPI route handlers for Research Library & Collections Hub.
Endpoints:
  GET    /research/library                     — Filterable, paginated user research runs
  GET    /research/library/collections         — List all user collections with run counts
  POST   /research/library/collections         — Create a new collection
  PATCH  /research/library/collections/{id}    — Update collection metadata
  DELETE /research/library/collections/{id}    — Delete a collection
  POST   /research/library/collections/{id}/runs — Add/remove runs in a collection
  PATCH  /research/library/runs/{id}/bookmark  — Toggle bookmark status
  PATCH  /research/library/runs/{id}/tags      — Update tags on a run
  PATCH  /research/library/runs/{id}/notes     — Update user notes on a run
  POST   /research/library/dossier             — Synthesize Master Dossier across selected runs
  POST   /research/library/export/bibtex       — Export BibTeX citations
  POST   /research/library/export/csv          — Export CSV literature matrix
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.dossier_service import (
    generate_bibtex_export,
    generate_csv_export,
    synthesize_master_dossier,
)
from app.db.database import get_db
from app.db.models import Collection, CollectionItem, ResearchRun, RunStatus, User

router = APIRouter(prefix="/research/library", tags=["library"])


# ── Pydantic Request Models ─────────────────────────────────────────

class CreateCollectionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    color: str = Field("#7c6af0", max_length=30)
    icon: str = Field("Folder", max_length=30)
    is_smart: bool = False
    smart_rules: dict | None = None


class UpdateCollectionRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    description: str | None = None
    color: str | None = None
    icon: str | None = None


class CollectionRunsRequest(BaseModel):
    run_ids: list[uuid.UUID]
    action: Literal["add", "remove"] = "add"


class UpdateTagsRequest(BaseModel):
    tags: list[str]


class UpdateNotesRequest(BaseModel):
    notes: str


class GenerateDossierRequest(BaseModel):
    run_ids: list[uuid.UUID] = Field(..., min_length=2, max_length=5)
    title: str | None = None
    focus: str | None = None


class ExportRequest(BaseModel):
    run_ids: list[uuid.UUID]


# ── Library Runs Endpoint ───────────────────────────────────────────

@router.get("")
async def get_library_runs(
    search: str | None = Query(None, description="Search term in inquiry or report"),
    collection_id: str | None = Query(None, description="Filter by collection UUID"),
    engine: str | None = Query(None, description="Filter by engine (langgraph/crewai)"),
    lens: str | None = Query(None, description="Filter by command lens (/ANGLE, /DEEP, etc.)"),
    is_bookmarked: bool | None = Query(None, description="Filter bookmarked runs"),
    date_range: str | None = Query(None, description="all, today, week, month"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Returns filterable, paginated research runs for the authenticated user.
    """
    query = (
        select(ResearchRun)
        .where(ResearchRun.user_id == current_user.id)
        .options(selectinload(ResearchRun.collection_items).selectinload(CollectionItem.collection))
    )

    # 1. Full-text search
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                ResearchRun.question.ilike(s),
                ResearchRun.summary.ilike(s),
                ResearchRun.user_notes.ilike(s),
            )
        )

    # 2. Engine filter
    if engine and engine.lower() != "all":
        query = query.where(ResearchRun.engine.ilike(f"%{engine.strip()}%"))

    # 3. Command lens filter
    if lens and lens.lower() != "all":
        query = query.where(ResearchRun.question.ilike(f"%/{lens.strip().upper()}%"))

    # 4. Bookmark filter
    if is_bookmarked is not None:
        query = query.where(ResearchRun.is_bookmarked == is_bookmarked)

    # 5. Date range filter
    now = datetime.now(timezone.utc)
    if date_range == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.where(ResearchRun.created_at >= start)
    elif date_range == "week":
        start = now - timedelta(days=7)
        query = query.where(ResearchRun.created_at >= start)
    elif date_range == "month":
        start = now - timedelta(days=30)
        query = query.where(ResearchRun.created_at >= start)

    # 6. Collection filter
    if collection_id and collection_id != "all":
        try:
            coll_uuid = uuid.UUID(collection_id)
            query = query.join(ResearchRun.collection_items).where(CollectionItem.collection_id == coll_uuid)
        except ValueError:
            pass

    # Order & Pagination
    query = query.order_by(ResearchRun.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(query)
    runs = res.scalars().all()

    # Format runs output
    items = []
    for r in runs:
        # Extract associated collections
        colls = []
        for ci in (r.collection_items or []):
            if ci.collection:
                colls.append({
                    "id": str(ci.collection.id),
                    "name": ci.collection.name,
                    "color": ci.collection.color,
                    "icon": ci.collection.icon,
                })

        sources_count = len(r.sources) if r.sources else 0
        items.append({
            "id": str(r.id),
            "question": r.question,
            "status": r.status.value,
            "summary": r.summary,
            "engine": r.engine or "langgraph",
            "loop_count": r.loop_count,
            "sources_count": sources_count,
            "is_bookmarked": r.is_bookmarked or False,
            "tags": r.tags or [],
            "user_notes": r.user_notes,
            "share_token": r.share_token,
            "collections": colls,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        })

    return {
        "status": "success",
        "count": len(items),
        "offset": offset,
        "limit": limit,
        "runs": items,
    }


# ── Collections Endpoints ───────────────────────────────────────────

@router.get("/collections")
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Lists all collections owned by the user with item counts."""
    query = (
        select(
            Collection,
            func.count(CollectionItem.id).label("item_count"),
        )
        .outerjoin(Collection.items)
        .where(Collection.user_id == current_user.id)
        .group_by(Collection.id)
        .order_by(Collection.created_at.asc())
    )
    res = await db.execute(query)
    rows = res.all()

    collections = []
    for coll, count in rows:
        collections.append({
            "id": str(coll.id),
            "name": coll.name,
            "description": coll.description,
            "color": coll.color,
            "icon": coll.icon,
            "is_smart": coll.is_smart,
            "smart_rules": coll.smart_rules,
            "item_count": count,
            "created_at": coll.created_at.isoformat() if coll.created_at else None,
        })

    return {"status": "success", "collections": collections}


@router.post("/collections", status_code=status.HTTP_201_CREATED)
async def create_collection(
    req: CreateCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Creates a new collection/folder for organizing research runs."""
    coll = Collection(
        user_id=current_user.id,
        name=req.name.strip(),
        description=req.description.strip() if req.description else None,
        color=req.color,
        icon=req.icon,
        is_smart=req.is_smart,
        smart_rules=req.smart_rules,
    )
    db.add(coll)
    await db.commit()
    await db.refresh(coll)

    return {
        "status": "success",
        "collection": {
            "id": str(coll.id),
            "name": coll.name,
            "description": coll.description,
            "color": coll.color,
            "icon": coll.icon,
            "is_smart": coll.is_smart,
            "item_count": 0,
            "created_at": coll.created_at.isoformat(),
        },
    }


@router.patch("/collections/{collection_id}")
async def update_collection(
    collection_id: uuid.UUID,
    req: UpdateCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Updates collection name, description, color, or icon."""
    query = select(Collection).where(Collection.id == collection_id, Collection.user_id == current_user.id)
    res = await db.execute(query)
    coll = res.scalar_one_or_none()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    if req.name is not None:
        coll.name = req.name.strip()
    if req.description is not None:
        coll.description = req.description.strip()
    if req.color is not None:
        coll.color = req.color
    if req.icon is not None:
        coll.icon = req.icon

    await db.commit()
    return {"status": "success", "message": "Collection updated"}


@router.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Deletes a collection (does not delete the underlying research runs)."""
    query = select(Collection).where(Collection.id == collection_id, Collection.user_id == current_user.id)
    res = await db.execute(query)
    coll = res.scalar_one_or_none()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    await db.delete(coll)
    await db.commit()
    return {"status": "success", "message": "Collection deleted"}


@router.post("/collections/{collection_id}/runs")
async def modify_collection_runs(
    collection_id: uuid.UUID,
    req: CollectionRunsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Adds or removes research runs from a collection."""
    # Verify collection ownership
    c_res = await db.execute(select(Collection).where(Collection.id == collection_id, Collection.user_id == current_user.id))
    coll = c_res.scalar_one_or_none()
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")

    if req.action == "add":
        for run_id in req.run_ids:
            # Check if run exists and belongs to user
            r_res = await db.execute(select(ResearchRun).where(ResearchRun.id == run_id, ResearchRun.user_id == current_user.id))
            if not r_res.scalar_one_or_none():
                continue
            # Check existing item
            existing = await db.execute(
                select(CollectionItem).where(CollectionItem.collection_id == collection_id, CollectionItem.run_id == run_id)
            )
            if not existing.scalar_one_or_none():
                item = CollectionItem(collection_id=collection_id, run_id=run_id)
                db.add(item)
    elif req.action == "remove":
        await db.execute(
            delete(CollectionItem).where(
                CollectionItem.collection_id == collection_id,
                CollectionItem.run_id.in_(req.run_ids),
            )
        )

    await db.commit()
    return {"status": "success", "action": req.action, "count": len(req.run_ids)}


# ── Run Metadata Endpoints (Bookmark, Tags, Notes) ─────────────────

@router.patch("/runs/{run_id}/bookmark")
async def toggle_run_bookmark(
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Toggles bookmark status of a research run."""
    query = select(ResearchRun).where(ResearchRun.id == run_id, ResearchRun.user_id == current_user.id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Research run not found")

    run.is_bookmarked = not (run.is_bookmarked or False)
    await db.commit()
    return {"status": "success", "is_bookmarked": run.is_bookmarked}


@router.patch("/runs/{run_id}/tags")
async def update_run_tags(
    run_id: uuid.UUID,
    req: UpdateTagsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Updates custom tag list on a research run."""
    query = select(ResearchRun).where(ResearchRun.id == run_id, ResearchRun.user_id == current_user.id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Research run not found")

    cleaned_tags = [t.strip().lower() for t in req.tags if t.strip()]
    run.tags = list(dict.fromkeys(cleaned_tags))  # deduplicate preserving order
    await db.commit()
    return {"status": "success", "tags": run.tags}


@router.patch("/runs/{run_id}/notes")
async def update_run_notes(
    run_id: uuid.UUID,
    req: UpdateNotesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Updates private research notes on a run."""
    query = select(ResearchRun).where(ResearchRun.id == run_id, ResearchRun.user_id == current_user.id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Research run not found")

    run.user_notes = req.notes.strip() if req.notes else None
    await db.commit()
    return {"status": "success", "user_notes": run.user_notes}


# ── Master Dossier Cross-Synthesis & Export Endpoints ───────────────

@router.post("/dossier")
async def create_master_dossier(
    req: GenerateDossierRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Synthesizes 2 to 5 selected research investigations into an overarching
    Master Dossier with a cross-study convergence matrix and unified citations.
    """
    try:
        result = await synthesize_master_dossier(
            run_ids=req.run_ids,
            user_id=current_user.id,
            db=db,
            custom_title=req.title,
            custom_focus=req.focus,
        )
        return {"status": "success", "dossier": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dossier synthesis failed: {str(e)}")


@router.post("/export/bibtex")
async def export_bibtex(
    req: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exports all unique citations from selected runs into a downloadable BibTeX (.bib) file."""
    query = select(ResearchRun).where(ResearchRun.id.in_(req.run_ids), ResearchRun.user_id == current_user.id)
    res = await db.execute(query)
    runs = list(res.scalars().all())

    bibtex_content = generate_bibtex_export(runs)
    return Response(
        content=bibtex_content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="research_citations.bib"'},
    )


@router.post("/export/csv")
async def export_csv(
    req: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exports all citations from selected runs into a downloadable CSV literature matrix."""
    query = select(ResearchRun).where(ResearchRun.id.in_(req.run_ids), ResearchRun.user_id == current_user.id)
    res = await db.execute(query)
    runs = list(res.scalars().all())

    csv_content = generate_csv_export(runs)
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="literature_matrix.csv"'},
    )
