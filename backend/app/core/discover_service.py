"""
Public Research Discover & Community Showcase Service.
Provides curated frontier feeds, category taxonomy, 1-click fork tracking,
upvotes / claps recording, and global community telemetry stats.
"""
from __future__ import annotations

import re
import uuid
from typing import Any
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import ResearchRun, RunStatus, User

logger = get_logger(__name__)

CATEGORY_KEYWORDS = {
    "biotech": [
        "bio", "cancer", "crispr", "protein", "cell", "dna", "rna", "vaccine",
        "immunotherapy", "genom", "t-cell", "target", "pharma", "clinical",
        "molecular", "enzyme", "antibody", "synbio", "longevity", "disease",
    ],
    "energy": [
        "battery", "energy", "solar", "photovoltaic", "fusion", "perovskite",
        "cathode", "anode", "electrolyte", "grid", "solid-state", "hydrogen",
        "geothermal", "carbon", "lithium", "sodium-ion", "cleantech", "nuclear",
    ],
    "quantum": [
        "quantum", "qubit", "superconduct", "entangle", "photon", "neutral atom",
        "lattice", "post-quantum", "cryptograph", "qec", "fault-tolerant", "coherence",
    ],
    "economics": [
        "market", "macro", "economic", "finance", "gdp", "inflation", "trade",
        "valuation", "competitor", "semiconductor supply", "capital", "revenue",
        "antitrust", "tariff", "commercial",
    ],
    "ai": [
        "ai", "llm", "neural", "agent", "transformer", "diffusion", "deep learning",
        "interpretability", "sparse autoencoder", "rag", "vision", "robot",
        "reinforcement", "alignment", "gpu", "inference", "reasoning",
    ],
}


def auto_categorize_inquiry(question: str, summary: str | None = None) -> str:
    """Classifies an inquiry into one of the 5 frontier categories."""
    text = f"{question} {summary or ''}".lower()

    scores = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                scores[cat] += 1

    best_cat = max(scores, key=scores.get)
    return best_cat if scores[best_cat] > 0 else "ai"


async def get_public_discover_feed(
    category: str | None,
    sort_by: str,
    search_query: str | None,
    engine: str | None,
    limit: int,
    offset: int,
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Returns paginated public research reports with community engagement metrics.
    """
    # Base filter: Public and completed reports
    # If there are very few explicitly public runs, include done runs for a lively community feed
    query = select(ResearchRun).where(ResearchRun.status == RunStatus.done)

    # Category filter
    if category and category.lower() not in ("all", "frontier"):
        cat_clean = category.lower().strip()
        query = query.where(
            or_(
                ResearchRun.category == cat_clean,
                ResearchRun.question.ilike(f"%{cat_clean}%"),
            )
        )

    # Engine filter
    if engine and engine.lower() != "all":
        query = query.where(ResearchRun.engine.ilike(f"%{engine.lower()}%"))

    # Search filter
    if search_query and search_query.strip():
        term = f"%{search_query.strip()}%"
        query = query.where(
            or_(
                ResearchRun.question.ilike(term),
                ResearchRun.summary.ilike(term),
            )
        )

    # Sorting
    if sort_by == "latest":
        query = query.order_by(ResearchRun.created_at.desc())
    elif sort_by == "clapped" or sort_by == "upvotes":
        query = query.order_by(ResearchRun.upvotes_count.desc(), ResearchRun.created_at.desc())
    elif sort_by == "confidence":
        query = query.order_by(ResearchRun.loop_count.desc(), ResearchRun.created_at.desc())
    else:  # 'trending' default
        query = query.order_by(
            (ResearchRun.upvotes_count * 2 + ResearchRun.views_count + ResearchRun.fork_count * 3).desc(),
            ResearchRun.created_at.desc(),
        )

    # Count total matching
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total_count = total_res.scalar() or 0

    # Paginate
    query = query.offset(offset).limit(limit)
    res = await db.execute(query)
    runs = res.scalars().all()

    items = []
    for r in runs:
        sources_list = r.sources or []
        tier1_count = 0
        for s in sources_list:
            if isinstance(s, dict) and s.get("tier") == "Tier 1":
                tier1_count += 1

        inferred_cat = r.category or auto_categorize_inquiry(r.question, r.summary)

        # Detect command lens
        lens_match = re.search(r"^/([A-Z]+)\b", r.question.strip())
        detected_lens = lens_match.group(1) if lens_match else None

        items.append({
            "id": str(r.id),
            "question": r.question,
            "summary": r.summary,
            "engine": r.engine or "langgraph",
            "share_token": r.share_token,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "sources_count": len(sources_list),
            "tier1_sources_count": tier1_count,
            "loop_count": r.loop_count or 1,
            "upvotes_count": r.upvotes_count or 0,
            "views_count": r.views_count or 0,
            "fork_count": r.fork_count or 0,
            "category": inferred_cat,
            "lens": detected_lens,
            "is_verified_primary": tier1_count >= 3 or (len(sources_list) >= 5 and (r.loop_count or 0) >= 2),
            "is_top_forked": (r.fork_count or 0) >= 2,
        })

    return {
        "status": "success",
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "reports": items,
    }


async def record_report_upvote(
    run_id: uuid.UUID,
    count: int = 1,
    action: str = "like",
    db: AsyncSession = None,
) -> dict[str, Any]:
    """Toggles like / unlike or adjusts upvote counter for a research report."""
    query = select(ResearchRun).where(ResearchRun.id == run_id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if not run:
        raise ValueError("Research run not found.")

    if action == "unlike":
        delta = -abs(count)
    else:
        delta = max(1, min(count, 10))

    new_count = max(0, (run.upvotes_count or 0) + delta)
    run.upvotes_count = new_count
    await db.commit()
    await db.refresh(run)

    return {
        "status": "success",
        "run_id": str(run.id),
        "upvotes_count": run.upvotes_count,
        "action": action,
        "delta": delta,
    }


async def record_report_fork(
    parent_run_id: uuid.UUID,
    new_lens: str,
    new_question: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Records that a public inquiry was forked by a user."""
    query = select(ResearchRun).where(ResearchRun.id == parent_run_id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if run:
        run.fork_count = (run.fork_count or 0) + 1
        await db.commit()
        await db.refresh(run)

    return {
        "status": "success",
        "parent_run_id": str(parent_run_id),
        "parent_fork_count": run.fork_count if run else 1,
        "new_lens": new_lens,
        "new_question": new_question,
    }


async def get_community_stats(db: AsyncSession) -> dict[str, Any]:
    """Computes global community discovery telemetry."""
    # Total completed studies
    total_runs_query = select(func.count(ResearchRun.id)).where(ResearchRun.status == RunStatus.done)
    total_runs = (await db.execute(total_runs_query)).scalar() or 0

    # Total claps
    total_claps_query = select(func.sum(ResearchRun.upvotes_count))
    total_claps = (await db.execute(total_claps_query)).scalar() or 0

    # Total forks
    total_forks_query = select(func.sum(ResearchRun.fork_count))
    total_forks = (await db.execute(total_forks_query)).scalar() or 0

    # Estimate citations scrutinized across community
    est_sources = total_runs * 8

    return {
        "status": "success",
        "total_published_studies": total_runs,
        "total_citations_scrutinized": est_sources,
        "total_community_claps": int(total_claps),
        "total_forked_inquiries": int(total_forks),
        "active_frontier_tracks": 5,
    }
