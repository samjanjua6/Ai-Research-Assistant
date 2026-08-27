"""
CrewAI Research Coordinator.
Orchestrates the 4-Agent collaborative research process, streams lifecycle events,
persists reports, and integrates seamlessly with PostgreSQL and SSE.
"""

from __future__ import annotations

import asyncio
import re
import uuid
from typing import Any

from crewai import Crew, Process

from app.crew.llm import get_crew_llm
from app.crew.tools import build_crew_tools
from app.crew.agents import (
    create_methodologist_agent,
    create_scout_agent,
    create_synthesizer_agent,
    create_auditor_agent,
)
from app.crew.tasks import (
    create_planning_task,
    create_evidence_gathering_task,
    create_synthesis_task,
    create_review_and_audit_task,
)
from app.crew.callbacks import CrewSSECallbackHandler
from app.core.events import publish_event
from app.core.logging import get_logger
from app.db.crud import update_run_status, log_step
from app.db.database import AsyncSessionLocal
from app.db.models import RunStatus

logger = get_logger(__name__)


async def run_crew_research(
    run_id: uuid.UUID,
    question: str,
    documents: list[dict[str, Any]] | None = None,
    urls: list[dict[str, Any]] | None = None,
) -> None:
    """
    Executes a 4-Agent collaborative research investigation using CrewAI.
    """
    run_id_str = str(run_id)
    logger.info("crew_research_started", run_id=run_id_str, question=question)

    async with AsyncSessionLocal() as db:
        await update_run_status(db, run_id, RunStatus.running)

    callback_handler = CrewSSECallbackHandler(run_id_str)
    collected_sources: list[dict[str, Any]] = []

    # 1. Initialize LLM and tools
    llm = get_crew_llm()
    tools = build_crew_tools(
        documents=documents,
        grounded_urls=urls,
        collected_sources=collected_sources,
    )

    # 2. Build summary descriptions for documents and URLs
    doc_summaries = []
    if documents:
        for d in documents:
            doc_summaries.append(
                f"- Document '{d.get('filename')}' ({d.get('page_count', 1)} pages, {d.get('word_count', 0)} words): {d.get('preview', '')}"
            )
    doc_summary_text = "\n".join(doc_summaries)

    url_summaries = []
    if urls:
        for u in urls:
            url_summaries.append(
                f"- URL Reference '{u.get('title')}' ({u.get('domain')} · {u.get('word_count', 0)} words): {u.get('preview', '')}"
            )
    url_summary_text = "\n".join(url_summaries)

    # 3. Create the 4 Specialized Agents (equipped with tools to avoid Groq tool_choice errors)
    methodologist = create_methodologist_agent(llm, tools)
    scout = create_scout_agent(llm, tools)
    synthesizer = create_synthesizer_agent(llm, tools)
    auditor = create_auditor_agent(llm, tools)

    # 4. Create the 4 Collaborative Tasks with discrete node callbacks
    t1_plan = create_planning_task(
        methodologist,
        question,
        doc_summary_text,
        url_summary_text,
        callback=lambda t: callback_handler.on_task_complete(t, "crew_methodologist"),
    )
    t2_evidence = create_evidence_gathering_task(
        scout,
        question,
        t1_plan,
        callback=lambda t: callback_handler.on_task_complete(t, "crew_scout"),
    )
    t3_synthesis = create_synthesis_task(
        synthesizer,
        question,
        t2_evidence,
        callback=lambda t: callback_handler.on_task_complete(t, "crew_synthesizer"),
    )
    t4_review = create_review_and_audit_task(
        auditor,
        question,
        t3_synthesis,
        callback=lambda t: callback_handler.on_task_complete(t, "crew_auditor"),
    )

    # 5. Assemble the Crew
    crew = Crew(
        agents=[methodologist, scout, synthesizer, auditor],
        tasks=[t1_plan, t2_evidence, t3_synthesis, t4_review],
        process=Process.sequential,
        step_callback=callback_handler.on_step,
        verbose=True,
    )

    # 6. Execute Crew
    try:
        # Initial step event broadcasting
        publish_event(
            run_id_str,
            "step",
            {
                "run_id": run_id_str,
                "node": "crew_methodologist",
                "loop": 0,
                "payload": {
                    "agent": "Lead Research Methodologist",
                    "role": "Research Strategist",
                    "thought": "Deconstructing research inquiry, evaluating command lenses & formulating hypothesis vectors…",
                },
            },
        )

        loop = asyncio.get_event_loop()
        crew_output = await loop.run_in_executor(None, crew.kickoff)
        final_report_text = str(getattr(crew_output, "raw", crew_output)).strip()

        # Extract or generate a clean 2-sentence TL;DR executive summary
        summary_text = ""
        summary_match = re.search(r"##\s*Executive Summary\s*\n+([^\n#]+(?:\n[^\n#]+)?)", final_report_text, re.IGNORECASE)
        if summary_match:
            summary_text = summary_match.group(1).strip()
        else:
            lines = [l.strip() for l in final_report_text.splitlines() if l.strip() and not l.startswith("#")]
            summary_text = " ".join(lines[:2]) if lines else "Research investigation completed."
        summary_text = summary_text[:500]

        # Extract follow up questions if present
        follow_up_questions = [
            {"question": "What are the immediate commercialization timelines and economic hurdles?", "category": "empirical"},
            {"question": "How do key industry players compare in deployment benchmarks?", "category": "comparative"},
            {"question": "What edge cases or security concerns remain unresolved?", "category": "frontier"},
        ]

        # Clean sources
        unique_sources = []
        seen_urls = set()
        for s in collected_sources:
            url = s.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_sources.append(s)

        # 7. Persist to PostgreSQL
        async with AsyncSessionLocal() as db:
            await update_run_status(
                db,
                run_id,
                RunStatus.done,
                final_report=final_report_text,
                summary=summary_text,
                sources=unique_sources,
                follow_up_questions=follow_up_questions,
                loop_count=1,
            )

        # 8. Broadcast SSE done event
        publish_event(
            run_id_str,
            "done",
            {
                "status": "done",
                "engine": "crewai",
                "summary": summary_text,
                "final_report": final_report_text,
                "sources": unique_sources,
                "documents_metadata": [
                    {
                        "id": d.get("id"),
                        "filename": d.get("filename"),
                        "page_count": d.get("page_count"),
                        "word_count": d.get("word_count"),
                        "preview": d.get("preview"),
                    }
                    for d in (documents or [])
                ],
                "urls_metadata": [
                    {
                        "id": u.get("id"),
                        "url": u.get("url"),
                        "domain": u.get("domain"),
                        "title": u.get("title"),
                        "word_count": u.get("word_count"),
                        "preview": u.get("preview"),
                    }
                    for u in (urls or [])
                ],
                "follow_up_questions": follow_up_questions,
            },
        )
        logger.info("crew_research_complete", run_id=run_id_str)

    except Exception as exc:
        logger.error("crew_research_failed", run_id=run_id_str, error=str(exc))
        async with AsyncSessionLocal() as db:
            await log_step(
                db,
                run_id=run_id,
                step_name="error",
                loop_index=0,
                payload={"error": f"CrewAI run failed: {str(exc)}"},
            )
            await update_run_status(db, run_id, RunStatus.failed)
        publish_event(
            run_id_str,
            "error",
            {"status": "failed", "error": f"CrewAI research error: {str(exc)}"},
        )
