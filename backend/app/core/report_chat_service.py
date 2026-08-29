"""
Report Chat, Section Expander & Citation Verification Service.
Provides grounded multi-turn RAG conversation over finalized research reports,
streaming responses, section expansion, text selection explanations, and citation resolvers.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from litellm import acompletion
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.guardrails import sanitize_output_leakage, sanitize_untrusted_evidence
from app.core.logging import get_logger
from app.db.models import ReportChatMessage, ResearchRun, User

logger = get_logger(__name__)
settings = get_settings()


def _format_grounding_context(run: ResearchRun) -> str:
    """Assembles rich grounding context from report, sources, and attached documents."""
    sources_text = []
    for idx, s in enumerate(run.sources or [], 1):
        if isinstance(s, dict):
            title = s.get("title") or s.get("domain") or f"Source {idx}"
            url = s.get("url", "")
            snippet = s.get("snippet") or s.get("raw_content") or ""
            domain = s.get("domain", "")
            tier = s.get("tier", "Tier 3")
            sources_text.append(
                f"[{idx}] {title} ({domain} • {tier})\nURL: {url}\nExcerpt: {snippet[:800]}"
            )
        elif isinstance(s, str):
            sources_text.append(f"[{idx}] {s}")

    docs_text = []
    for d in (run.documents_metadata or []):
        if isinstance(d, dict):
            docs_text.append(f"- Document: {d.get('filename')} ({d.get('page_count', 1)} pages)")

    context = (
        f"# PRIMARY RESEARCH INQUIRY: {run.question}\n\n"
        f"## EXECUTIVE SUMMARY (TL;DR):\n{run.summary or 'N/A'}\n\n"
        f"## FINAL SYNTHESIS REPORT:\n{run.final_report or 'N/A'}\n\n"
        f"## VERIFIED SOURCE PASSAGES & EVIDENCE:\n" + ("\n\n".join(sources_text) if sources_text else "No external sources.")
    )
    if docs_text:
        context += "\n\n## ATTACHED DOCUMENTS:\n" + "\n".join(docs_text)

    return context


async def stream_chat_with_report(
    run: ResearchRun,
    message: str,
    chat_history: list[dict[str, str]],
    user_id: uuid.UUID | None,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    """
    Streams a grounded response to a user's follow-up question over the research report.
    Persists the user question and assistant response in PostgreSQL.
    """
    grounding_context = _format_grounding_context(run)

    system_prompt = f"""You are the Grounded Research Intelligence Assistant for this investigation.
Your duty is to answer follow-up questions, cross-examine evidence, and clarify details strictly based on the finalized research report and its verified sources.

RESEARCH GROUNDING CONTEXT:
{grounding_context}

RULES:
1. Ground your answers directly in the provided report text and numbered sources ([1], [2], [Doc: ...]).
2. When referencing evidence, cite the specific source bracket (e.g. "[1]", "[2]").
3. If asked about a topic or dimension not covered in the report or sources, clearly state that it was not addressed in the gathered evidence rather than speculating.
4. Maintain an objective, authoritative scientific tone. Format responses in clean GitHub Markdown.
"""

    # Build conversation messages
    messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history[-6:]:  # include last 3 turns
        if isinstance(msg, dict):
            role = msg.get("role")
            content = msg.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": str(content)})
    messages.append({"role": "user", "content": message})

    # Save user message to database
    user_msg = ReportChatMessage(
        run_id=run.id,
        user_id=user_id,
        role="user",
        content=message,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user_msg)
    await db.commit()

    full_assistant_response = []

    try:
        response = await acompletion(
            model=settings.groq_model,
            messages=messages,
            temperature=0.25,
            max_tokens=2500,
            stream=True,
        )

        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                full_assistant_response.append(delta)
                yield f"data: {json.dumps({'type': 'token', 'token': delta})}\n\n"

        assistant_text = "".join(full_assistant_response)
        assistant_text = sanitize_output_leakage(assistant_text)

        # Detect cited sources in assistant response
        cited_indices = [int(m) for m in re.findall(r"\[(\d+)\]", assistant_text)]
        unique_cited = list(dict.fromkeys(cited_indices))

        # Save assistant message to database
        assistant_msg = ReportChatMessage(
            run_id=run.id,
            user_id=user_id,
            role="assistant",
            content=assistant_text,
            sources_referenced=unique_cited,
            created_at=datetime.now(timezone.utc),
        )
        db.add(assistant_msg)
        await db.commit()

        yield f"data: {json.dumps({'type': 'done', 'sources_referenced': unique_cited})}\n\n"

    except Exception as e:
        logger.error("stream_report_chat_failed", error=str(e))
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"


async def expand_report_section(
    run: ResearchRun,
    section_title: str,
    section_content: str,
    action: str,
) -> dict[str, str]:
    """
    Expands a specific section of the report with deeper technical details,
    critical counter-arguments, or a structured comparison table.
    """
    grounding_context = _format_grounding_context(run)

    if action == "counter_arguments":
        instruction = (
            f"Analyze section '{section_title}' and generate a rigorous 'Critical Counter-Arguments & Skepticism' "
            f"sub-section. Highlight potential engineering failure modes, disputed empirical assumptions, or economic barriers "
            f"supported by or conflicting with the gathered evidence."
        )
    elif action == "table":
        instruction = (
            f"Transform the narrative analysis in section '{section_title}' into an actionable, structured "
            f"Markdown Comparison Matrix / Key Takeaways Table with clear dimension headers, empirical benchmarks, and trade-offs."
        )
    else:  # 'elaborate'
        instruction = (
            f"Elaborate on section '{section_title}' with deeper mechanistic, architectural, and empirical details. "
            f"Provide deeper quantitative context, citations, and specific technological mechanisms grounded in the evidence."
        )

    prompt = f"""You are the Lead Research Synthesizer.
TASK: {instruction}

SECTION CONTEXT:
Title: {section_title}
Current Text:
{section_content[:2500]}

FULL REPORT & EVIDENCE:
{grounding_context[:4000]}

Return ONLY the high-density Markdown addition for this section with citations ([1], [2]). Do not repeat the section title heading.
"""

    response = await acompletion(
        model=settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2000,
    )

    expanded_text = response.choices[0].message.content or ""
    expanded_text = sanitize_output_leakage(expanded_text)

    return {
        "section_title": section_title,
        "action": action,
        "expanded_content": expanded_text.strip(),
    }


async def explain_text_selection(
    run: ResearchRun,
    selected_text: str,
    action: str,
) -> dict[str, str]:
    """
    Explains highlighted text selection in plain English, extracts data metrics,
    or probes for evidentiary grounding.
    """
    if action == "eli5":
        instruction = "Explain this technical claim in simple, clear plain English (ELI5) for a non-specialist without losing accuracy."
    elif action == "metrics":
        instruction = "Extract all quantitative numbers, benchmarks, percentages, and performance claims in this text into a concise bullet list."
    else:  # 'evidence'
        instruction = "Evaluate the evidentiary basis of this statement against the report's gathered literature and cite supporting or conflicting sources ([1], [2])."

    prompt = f"""RESEARCH INQUIRY: {run.question}

HIGHLIGHTED TEXT PASSAGE:
"{selected_text}"

INSTRUCTION: {instruction}

Return a concise, direct 2-3 paragraph response in GitHub Markdown.
"""

    response = await acompletion(
        model=settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1000,
    )

    result_text = response.choices[0].message.content or ""
    return {
        "selected_text": selected_text,
        "action": action,
        "explanation": result_text.strip(),
    }


async def append_section_to_report(
    run_id: uuid.UUID,
    user_id: uuid.UUID | None,
    section_title: str,
    addition_content: str,
    db: AsyncSession,
) -> ResearchRun:
    """
    Appends expanded content under the specified section in the report and updates PostgreSQL.
    """
    query = select(ResearchRun).where(ResearchRun.id == run_id)
    if user_id:
        query = query.where(ResearchRun.user_id == user_id)
    res = await db.execute(query)
    run = res.scalar_one_or_none()
    if not run or not run.final_report:
        raise ValueError("Research report not found.")

    report = run.final_report
    # Find section header in report
    pattern = re.compile(rf"(#{1,4}\s*{re.escape(section_title)}.*)", re.IGNORECASE)
    match = pattern.search(report)

    if match:
        header_end = match.end()
        # Find next section header or end of text
        next_header = re.search(r"\n#{1,4}\s", report[header_end:])
        if next_header:
            insert_pos = header_end + next_header.start()
            updated_report = (
                report[:insert_pos]
                + f"\n\n> **Expanded Analysis:**\n{addition_content}\n\n"
                + report[insert_pos:]
            )
        else:
            updated_report = report + f"\n\n> **Expanded Analysis:**\n{addition_content}\n"
    else:
        updated_report = report + f"\n\n### Extended Section: {section_title}\n{addition_content}\n"

    run.final_report = updated_report
    await db.commit()
    await db.refresh(run)
    return run


def get_citation_verification_details(run: ResearchRun, citation_index: int) -> dict[str, Any]:
    """Resolves detailed verification quote and authority metrics for source [citation_index]."""
    sources = run.sources or []
    if citation_index < 1 or citation_index > len(sources):
        raise ValueError(f"Citation [{citation_index}] not found in report sources.")

    source_item = sources[citation_index - 1]
    if isinstance(source_item, str):
        return {
            "index": citation_index,
            "title": f"Source #{citation_index}",
            "url": source_item,
            "domain": source_item.split("/")[2] if "//" in source_item else "web.source",
            "tier": "Tier 3",
            "snippet": "No text snippet cached for this reference.",
            "score": "0.85",
            "authority_label": "Web Consensus",
        }

    return {
        "index": citation_index,
        "title": source_item.get("title") or source_item.get("domain") or f"Source #{citation_index}",
        "url": source_item.get("url", ""),
        "domain": source_item.get("domain", "web.source"),
        "tier": source_item.get("tier", "Tier 3"),
        "snippet": source_item.get("snippet") or source_item.get("raw_content") or "Primary source citation.",
        "score": source_item.get("score", "0.90"),
        "authority_label": source_item.get("authority_label", "Verified Reference"),
    }
