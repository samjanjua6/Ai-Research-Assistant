"""
Autonomous Master Dossier Multi-Report Cross-Synthesis Engine.
Synthesizes 2 to 5 research inquiries into a unified executive dossier,
generates Markdown convergence matrices, and provides BibTeX / CSV export formatting.
"""
from __future__ import annotations

import csv
import io
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from litellm import acompletion
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.models import ResearchRun, RunStatus, User

logger = get_logger(__name__)
settings = get_settings()


def _sanitize_bibtex_key(title: str, year: str = "2026") -> str:
    """Generates a clean alphanumeric BibTeX cite key."""
    words = re.findall(r"[a-zA-Z0-9]+", title)
    prefix = words[0].lower() if words else "source"
    suffix = words[1].lower() if len(words) > 1 else "study"
    return f"{prefix}_{suffix}_{year}"


def generate_bibtex_export(runs: list[ResearchRun]) -> str:
    """
    Generates a valid BibTeX (.bib) file string aggregating all unique citations
    across the provided research runs.
    """
    bib_entries = []
    seen_urls = set()

    for r in runs:
        sources = r.sources or []
        for s in sources:
            if not isinstance(s, dict):
                continue
            url = s.get("url", "").strip()
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)

            title = s.get("title") or s.get("domain") or "Research Citation"
            domain = s.get("domain") or "web.source"
            author = s.get("author") or f"{domain.capitalize()} Research Team"
            year = s.get("year") or str(datetime.now().year)
            cite_key = _sanitize_bibtex_key(title, year)

            is_academic = any(
                k in domain.lower()
                for k in ["arxiv.org", "nature.com", "ieee.org", "science.org", "nih.gov", ".edu"]
            )

            if is_academic:
                entry = (
                    f"@article{{{cite_key},\n"
                    f"  author = {{{author}}},\n"
                    f"  title = {{{title}}},\n"
                    f"  journal = {{{domain}}},\n"
                    f"  year = {{{year}}},\n"
                    f"  url = {{{url}}},\n"
                    f"  note = {{Referenced in AI Research Assistant investigation}}\n"
                    f"}}"
                )
            else:
                entry = (
                    f"@misc{{{cite_key},\n"
                    f"  author = {{{author}}},\n"
                    f"  title = {{{title}}},\n"
                    f"  howpublished = {{\\url{{{url}}}}},\n"
                    f"  year = {{{year}}},\n"
                    f"  note = {{Accessed {datetime.now().strftime('%B %Y')}}}\n"
                    f"}}"
                )
            bib_entries.append(entry)

    if not bib_entries:
        return "% No citations found in selected research runs.\n"

    header = (
        f"% ==========================================================================\n"
        f"% BibTeX Bibliography Export — AI Research Assistant Master Dossier\n"
        f"% Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        f"% Total Unique Sources: {len(bib_entries)}\n"
        f"% ==========================================================================\n\n"
    )
    return header + "\n\n".join(bib_entries) + "\n"


def generate_csv_export(runs: list[ResearchRun]) -> str:
    """
    Generates a clean CSV literature matrix of all citations across selected runs.
    """
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "Source Title",
        "URL",
        "Domain",
        "Authority Tier",
        "Reliability Score",
        "Cited In Question",
        "Engine",
    ])

    seen_pairs = set()
    for r in runs:
        sources = r.sources or []
        for s in sources:
            if not isinstance(s, dict):
                continue
            url = s.get("url", "").strip()
            title = s.get("title") or s.get("domain") or "Web Reference"
            domain = s.get("domain") or "web.source"
            tier = s.get("tier") or "Tier 3"
            score = s.get("score") or "0.85"

            pair_key = (url, str(r.id))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            writer.writerow([
                title,
                url,
                domain,
                tier,
                score,
                r.question,
                r.engine or "langgraph",
            ])

    return output.getvalue()


async def synthesize_master_dossier(
    run_ids: list[uuid.UUID],
    user_id: uuid.UUID,
    db: AsyncSession,
    custom_title: str | None = None,
    custom_focus: str | None = None,
) -> dict[str, Any]:
    """
    Synthesizes multiple research runs into a unified Master Dossier with
    cross-study convergence matrix, strategic verdict, and unified bibliography.
    """
    # 1. Fetch runs and ensure they belong to this user
    query = (
        select(ResearchRun)
        .where(ResearchRun.id.in_(run_ids))
        .where(ResearchRun.user_id == user_id)
        .order_by(ResearchRun.created_at.asc())
    )
    res = await db.execute(query)
    runs: list[ResearchRun] = list(res.scalars().all())

    if len(runs) < 2:
        raise ValueError("At least 2 completed research runs are required to generate a Master Dossier.")

    # 2. Build synthesis context from selected runs
    study_briefs = []
    all_sources = []
    seen_urls = set()

    for idx, r in enumerate(runs, 1):
        study_briefs.append(
            f"### Study #{idx}: {r.question}\n"
            f"- **Engine**: {r.engine or 'LangGraph'}\n"
            f"- **Executive Summary**: {r.summary or 'N/A'}\n"
            f"- **Report Excerpt**: {(r.final_report or '')[:2500]}\n"
        )
        for s in (r.sources or []):
            if isinstance(s, dict) and s.get("url") and s.get("url") not in seen_urls:
                seen_urls.add(s["url"])
                all_sources.append(s)

    combined_studies_text = "\n\n".join(study_briefs)

    dossier_title = custom_title or f"Master Synthesis Dossier: {runs[0].question[:60]} (+{len(runs)-1} Studies)"
    focus_directive = f"\nSpecific Strategic Focus: {custom_focus}\n" if custom_focus else ""

    # 3. Formulate Prompt for LLM Synthesis
    prompt = f"""You are the Principal Cross-Disciplinary Research Synthesizer.
Your mission is to synthesize the following {len(runs)} distinct research investigations into an overarching, publication-grade Master Dossier.

{focus_directive}

SELECTED RESEARCH STUDIES TO CROSS-SYNTHESIZE:
{combined_studies_text}

REQUIRED MASTER DOSSIER STRUCTURE (Return strictly in high-density GitHub Markdown):

# {dossier_title}

## 1. Executive Cross-Study Meta-Synthesis
Synthesize the core findings, macro patterns, and technological implications across all {len(runs)} investigations into a dense, rigorous executive briefing.

## 2. Cross-Study Convergence & Divergence Matrix
Construct a comprehensive Markdown table comparing the key dimensions, parameters, or claims across all studies:
| Dimension / Parameter | Study 1 Findings | Study 2 Findings | Convergence / Consensus | Friction / Divergence |
Include specific quantitative benchmarks, trade-offs, and empirical conflicts identified across the reports.

## 3. Strategic Verdict & Technological Roadmap
- **Consensus Breakthroughs**: What is conclusively proven across the collective literature.
- **Critical White-Spots & Unresolved Friction**: Where the studies conflict or evidence remains sparse.
- **2026–2030 Actionable Roadmap**: Strategic milestones and implementation priorities.

## 4. Key Takeaways Checklist
- [ ] 3-5 concise, high-impact bullet takeaways for researchers and decision-makers.

Maintain an authoritative, objective scientific tone. Do not mention that you are an AI.
"""

    logger.info("synthesizing_master_dossier", user_id=str(user_id), run_count=len(runs))

    model_name = settings.groq_model
    if not model_name.startswith("groq/"):
        model_name = f"groq/{model_name}"

    response = await acompletion(
        model=model_name,
        api_key=settings.groq_api_key,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an elite Lead Scientific Synthesizer. You create high-density, "
                    "evidence-grounded executive research dossiers with clear comparative tables."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=4000,
    )

    dossier_content = response.choices[0].message.content or ""

    # 4. Generate Executive Summary for Dossier
    summary_prompt = f"Provide a dense 3-sentence executive summary of this master research dossier:\n\n{dossier_content[:2000]}"
    sum_res = await acompletion(
        model=settings.groq_model,
        messages=[{"role": "user", "content": summary_prompt}],
        temperature=0.2,
        max_tokens=250,
    )
    dossier_summary = sum_res.choices[0].message.content or ""

    # 5. Persist as a new ResearchRun in database so it becomes a permanent dossier in the user's library
    dossier_run = ResearchRun(
        user_id=user_id,
        question=f"[DOSSIER] {dossier_title}",
        status=RunStatus.done,
        final_report=dossier_content,
        summary=dossier_summary,
        sources=all_sources[:30],
        engine="dossier-synthesizer",
        loop_count=len(runs),
        is_bookmarked=True,
        tags=["dossier", "master-synthesis"],
        user_notes=f"Synthesized from {len(runs)} individual research inquiries.",
        created_at=datetime.now(timezone.utc),
        finished_at=datetime.now(timezone.utc),
    )
    db.add(dossier_run)
    await db.commit()
    await db.refresh(dossier_run)

    return {
        "dossier_id": str(dossier_run.id),
        "title": dossier_title,
        "summary": dossier_summary,
        "final_report": dossier_content,
        "source_count": len(all_sources),
        "synthesized_runs_count": len(runs),
        "created_at": dossier_run.created_at.isoformat(),
    }
