"""
LangGraph node functions.

Every node is an async function that receives GraphState and returns
a dict of partial state updates — LangGraph merges these into the state.
"""

from __future__ import annotations

import json
import re
from typing import Any

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.state import GraphState, SearchResult
from app.agent.tools import search_duckduckgo
from app.agent.scoring import rank_and_filter_results, extract_clean_domain
from app.agent.doc_parser import score_and_extract_relevant_sections
from app.agent.url_fetcher import format_grounded_urls_for_context
from app.agent.methodologist import (
    parse_command_lens,
    get_methodologist_planner_prompt,
    get_methodologist_draft_prompt,
)
from app.core.config import get_settings
from app.core.events import publish_event
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


def _get_llm() -> ChatGroq:
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=0.3,
        max_retries=5,
        request_timeout=60.0,
    )


def clean_markdown_tables(text: str) -> str:
    """
    Normalizes markdown tables in generated LLM text:
    1. Removes trailing solitary pipe lines (e.g. `\n|\n` or `\n|`)
    2. Converts single-line fused tables into multi-line markdown tables
    3. Normalizes table cell spacing
    """
    if not text:
        return text

    # Strip empty solitary pipe lines
    text = re.sub(r"\n\s*\|\s*\n", "\n\n", text)
    text = re.sub(r"\n\s*\|\s*$", "\n", text)

    # Convert inline fused tables: | col1 | col2 | | --- | --- | | val1 | val2 |
    def expand_table_rows(match: re.Match) -> str:
        block = match.group(0)
        # Split on `| |` or `|  |` boundary between table rows
        rows = re.split(r"\|\s*\|", block)
        cleaned_rows = []
        for r in rows:
            r = r.strip()
            if not r:
                continue
            if not r.startswith("|"):
                r = "| " + r
            if not r.endswith("|"):
                r = r + " |"
            cleaned_rows.append(r)
        return "\n" + "\n".join(cleaned_rows) + "\n"

    # Match consecutive pipe segments that lack newlines
    text = re.sub(r"(?:\|[^\n\|]+)+\|\s*\|\s*(?:\|[^\n\|]+)+\|", expand_table_rows, text)

    # Clean double blank lines around tables
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Node 1 — plan_steps
# ─────────────────────────────────────────────────────────────────────────────

async def plan_steps(state: GraphState) -> dict[str, Any]:
    """
    Break the user's research inquiry into 3-5 focused sub-questions tuned
    to the specific analytical command-lens (/ANGLE, /CHALLENGE, /HYP, /DEEP, /VOICES, etc.).
    """
    logger.info("node:plan_steps", run_id=state["run_id"])
    llm = _get_llm()

    parsed = parse_command_lens(state["question"])
    system = get_methodologist_planner_prompt(parsed, max_steps=settings.max_steps)

    doc_context_hint = ""
    docs = state.get("documents", [])
    if docs:
        doc_summaries = []
        for d in docs:
            doc_summaries.append(
                f"- Document '{d.get('filename')}' ({d.get('page_count', 1)} pages, {d.get('word_count', 0)} words): {d.get('preview', '')}"
            )
        doc_context_hint += (
            "\n\n=== ATTACHED GROUNDED DOCUMENTS ===\n"
            + "\n".join(doc_summaries)
            + "\nDecompose sub-questions to verify, contrast, and expand upon the document claims against live web literature."
        )

    urls = state.get("grounded_urls", [])
    if urls:
        url_summaries = []
        for u in urls:
            url_summaries.append(
                f"- URL Reference '{u.get('title')}' ({u.get('domain')} · {u.get('word_count', 0)} words): {u.get('preview', '')}"
            )
        doc_context_hint += (
            "\n\n=== ATTACHED GROUNDED URL REFERENCES ===\n"
            + "\n".join(url_summaries)
            + "\nDecompose sub-questions to cross-reference and verify claims from these referenced web URLs against broader web consensus."
        )

    human = f"Research inquiry: {parsed.cleaned_query}{doc_context_hint}"

    response = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=human)])

    raw = response.content.strip()
    # Strip markdown code fences if the model wraps them anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        steps: list[str] = json.loads(raw)
        if not isinstance(steps, list) or not all(isinstance(s, str) for s in steps):
            raise ValueError("Parsed result is not a list of strings")
        steps = [str(s) for s in steps[: settings.max_steps]]
    except Exception as exc:
        logger.warning("plan_steps_parse_error", error=str(exc), raw=raw)
        # Fallback: treat the cleaned query as one step
        steps = [parsed.cleaned_query or state["question"]]

    logger.info("plan_steps_done", lens=parsed.lens, steps=steps)
    return {"steps": steps}


# ─────────────────────────────────────────────────────────────────────────────
# Node 2 — search_web (with 5-Pillar Source Scoring & Ranking)
# ─────────────────────────────────────────────────────────────────────────────

async def search_web(state: GraphState) -> dict[str, Any]:
    """
    Run a DuckDuckGo search for every step in state['steps'].
    Scores, ranks, and filters candidate snippets before appending.
    """
    logger.info("node:search_web", run_id=state["run_id"], loop=state.get("loop_count", 0))

    raw_candidates: list[SearchResult] = []
    for step in state["steps"]:
        results = search_duckduckgo(
            query=step,
            step=step,
            max_results=settings.search_results_per_step,
        )
        raw_candidates.extend(results)

    # Score, rank by relevance, apply domain diversity, and filter low-quality snippets
    if settings.source_scoring_enabled:
        ranked_results = rank_and_filter_results(
            raw_candidates,
            root_question=state["question"],
            min_score=settings.source_min_relevance_score,
            max_results=settings.max_ranked_sources,
        )
    else:
        ranked_results = raw_candidates

    high_count = sum(1 for r in ranked_results if r.get("tier") == "high")
    good_count = sum(1 for r in ranked_results if r.get("tier") == "good")
    logger.info(
        "search_web_scored_and_ranked",
        raw_count=len(raw_candidates),
        ranked_count=len(ranked_results),
        high_quality=high_count,
        good_quality=good_count,
    )
    return {"search_results": ranked_results}


# ─────────────────────────────────────────────────────────────────────────────
# Node 3 — draft_report (with real-time token streaming & ranked context)
# ─────────────────────────────────────────────────────────────────────────────

async def draft_report(state: GraphState) -> dict[str, Any]:
    """
    Synthesise all collected search results into a structured draft report,
    streaming tokens in real-time to active SSE subscribers.
    """
    logger.info("node:draft_report", run_id=state["run_id"], results=len(state["search_results"]))
    llm = _get_llm()

    # Sort search results by relevance score descending so top sources appear first
    sorted_results = sorted(
        state.get("search_results", []),
        key=lambda x: x.get("score", 0.5),
        reverse=True,
    )

    # Build a prioritized context string
    context_parts: list[str] = []
    for idx, r in enumerate(sorted_results, 1):
        score_pct = r.get("score_percent")
        tier_label = str(r.get("tier", "standard")).upper()
        domain = r.get("domain", "")
        auth_label = r.get("authority_label", "")

        meta_header = f"[{idx}]"
        if score_pct is not None:
            meta_header += f" Confidence: {score_pct}% ({tier_label})"
        if domain:
            meta_header += f" | Domain: {domain}"
        if auth_label:
            meta_header += f" | {auth_label}"

        context_parts.append(
            f"{meta_header}\n"
            f"    Sub-topic: {r.get('step', 'General')}\n"
            f"    Source: {r.get('url', '')}\n"
            f"    Snippet: {r.get('snippet', '')}\n"
        )
    context = "\n".join(context_parts) or "No search results available."

    parsed = parse_command_lens(state["question"])
    system = get_methodologist_draft_prompt(parsed)

    doc_evidence = ""
    docs = state.get("documents", [])
    if docs:
        doc_text = score_and_extract_relevant_sections(docs, state["question"], max_chars=30000)
        if doc_text:
            doc_evidence = (
                "=== GROUNDED USER ATTACHED DOCUMENTS EVIDENCE ===\n"
                "The user provided the following grounded document passages. "
                "Synthesize findings from both these documents and external web searches. "
                "Cite document evidence inline as [Doc: <filename>, p. <page_number>] or [Doc: <filename>].\n\n"
                f"{doc_text}\n\n"
                "===================================================\n\n"
            )

    url_evidence = ""
    urls = state.get("grounded_urls", [])
    if urls:
        url_text = format_grounded_urls_for_context(urls, max_chars=30000)
        if url_text:
            url_evidence = (
                "=== GROUNDED USER ATTACHED URL REFERENCES EVIDENCE ===\n"
                "The user provided the following grounded URL article passages. "
                "Synthesize findings from these web pages alongside other evidence. "
                "Cite evidence from these web references inline as [URL: <Page/Article Title>] or [URL: <domain>].\n\n"
                f"{url_text}\n\n"
                "========================================================\n\n"
            )

    human = (
        f"Research inquiry: {state['question']}\n\n"
        f"{doc_evidence}"
        f"{url_evidence}"
        f"=== LIVE WEB SEARCH EVIDENCE ===\n"
        f"{context}\n\n"
        "Write the structured research report:"
    )

    chunks: list[str] = []
    loop_idx = state.get("loop_count", 0)
    run_id_str = str(state["run_id"])

    # Stream chunks token-by-token directly to SSE clients
    async for chunk in llm.astream([SystemMessage(content=system), HumanMessage(content=human)]):
        token = str(chunk.content or "")
        if token:
            chunks.append(token)
            publish_event(
                run_id_str,
                "token",
                {
                    "run_id": run_id_str,
                    "node": "draft_report",
                    "loop": loop_idx,
                    "token": token,
                },
            )

    full_draft = "".join(chunks)
    cleaned_draft = clean_markdown_tables(full_draft)
    logger.info("draft_report_done", draft_length=len(cleaned_draft))
    return {"draft": cleaned_draft}


# ─────────────────────────────────────────────────────────────────────────────
# Node 4 — review_draft
# ─────────────────────────────────────────────────────────────────────────────

async def review_draft(state: GraphState) -> dict[str, Any]:
    """
    Self-review the draft and decide whether to loop back for more searching.
    """
    loop_count = state.get("loop_count", 0)
    logger.info("node:review_draft", run_id=state["run_id"], loop_count=loop_count)

    # Hard stop if we have already hit max search loops
    if loop_count >= settings.max_search_loops:
        logger.info("review_draft_max_loops_reached", loop_count=loop_count)
        return {"gaps_found": False, "review_notes": "Max loops reached — proceeding to finalize."}

    llm = _get_llm()

    system = (
        "You are a critical research editor. "
        "Review the draft report below against the original research question. "
        "Identify if any critical angle is missing, ambiguous, or insufficiently answered. "
        "Return a JSON object with two keys:\n"
        '  "gaps_found": boolean (true if important information is missing and more search is needed, false if complete)\n'
        '  "notes": brief explanation of what is missing (or why it is complete)\n'
        "Return ONLY the JSON object, no markdown fences."
    )
    human = (
        f"Research question: {state['question']}\n\n"
        f"Draft report:\n{state['draft']}\n\n"
        "Evaluate completeness:"
    )

    response = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=human)])
    raw = response.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        review: dict = json.loads(raw)
        gaps_found = bool(review.get("gaps_found", False))
        notes = str(review.get("notes", ""))
    except Exception as exc:
        logger.warning("review_draft_parse_error", error=str(exc), raw=raw)
        gaps_found = False
        notes = "Parse error during review — proceeding to finalize."

    new_loop = loop_count + 1 if gaps_found else loop_count
    logger.info("review_draft_done", gaps_found=gaps_found, notes=notes, new_loop=new_loop)
    return {"gaps_found": gaps_found, "review_notes": notes, "loop_count": new_loop}


# ─────────────────────────────────────────────────────────────────────────────
# Node 5 — finalize_report
# ─────────────────────────────────────────────────────────────────────────────

def _generate_fallback_follow_ups(question: str) -> list[dict[str, Any]]:
    clean_q = question.rstrip("?").strip()
    return [
        {
            "question": f"What are the emerging breakthrough technologies that could disrupt {clean_q} by 2028?",
            "category": "Future Outlook",
            "rationale": "Forecasts next-generation innovations and long-term industry trajectories.",
        },
        {
            "question": f"How do the cost, scalability, and performance benchmarks of {clean_q} compare with leading alternatives?",
            "category": "Comparative Analysis",
            "rationale": "Evaluates economic competitiveness and architectural trade-offs.",
        },
        {
            "question": f"What are the primary regulatory, safety, and supply chain bottlenecks in deploying {clean_q} at scale?",
            "category": "Practical Implementation",
            "rationale": "Examines real-world adoption barriers and commercialization hurdles.",
        },
    ]


async def finalize_report(state: GraphState) -> dict[str, Any]:
    """
    Polish the draft into a final report with a one-paragraph summary,
    a ranked enriched sources list, and 3-5 categorized follow-up research questions.
    """
    logger.info("node:finalize_report", run_id=state["run_id"])
    llm = _get_llm()

    system = (
        "You are an AI research methodologist and lead analyst. "
        "Given the draft report, perform three tasks:\n"
        "1. Produce a final polished version of the report in clear markdown. "
        "Preserve the 'Q: [Summary] → A: [Analysis]' structure, markdown tables, Mermaid diagrams (if any), and inline citation tags [1], [2]. "
        "Preserve any '[Verification Needed]' or '[Incomplete Data]' confidence markers without smoothing over ambiguities.\n"
        "2. Write a 2-3 sentence executive summary capturing the core findings and strategic takeaway.\n"
        "3. Generate 3 to 5 high-impact, insightful follow-up research questions acting as adaptive analytical pathways (e.g. suggesting complementary lenses like /CHALLENGE, /ANGLE, /HYP, or /VOICES).\n"
        "For each follow-up question, provide:\n"
        '  - "question": the specific, standalone research question\n'
        '  - "category": one of "Deep Dive", "Comparative Analysis", "Practical Implementation", "Future Outlook"\n'
        '  - "rationale": one sentence explaining why exploring this question adds strategic value\n\n'
        "Return a JSON object with three keys:\n"
        '  "report": the full polished report (markdown)\n'
        '  "summary": the executive summary\n'
        '  "follow_up_questions": list of objects [{ "question": "...", "category": "...", "rationale": "..." }]\n'
        "Return ONLY valid JSON, no markdown fences."
    )
    human = (
        f"Research question: {state['question']}\n\n"
        f"Draft:\n{state['draft']}\n\n"
        "Finalize:"
    )

    response = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=human)])
    raw = response.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    follow_up_questions: list[dict[str, Any]] = []
    try:
        final: dict = json.loads(raw)
        report = clean_markdown_tables(str(final.get("report", state["draft"])))
        summary = str(final.get("summary", ""))
        raw_follow_ups = final.get("follow_up_questions", [])

        if isinstance(raw_follow_ups, list):
            for item in raw_follow_ups:
                if isinstance(item, dict) and item.get("question"):
                    follow_up_questions.append({
                        "question": str(item["question"]).strip(),
                        "category": str(item.get("category", "Deep Dive")).strip(),
                        "rationale": str(item.get("rationale", "")).strip(),
                    })
                elif isinstance(item, str) and item.strip():
                    follow_up_questions.append({
                        "question": item.strip(),
                        "category": "Deep Dive",
                        "rationale": "Suggested continuation based on research findings.",
                    })
    except Exception as exc:
        logger.warning("finalize_parse_error", error=str(exc))
        report = clean_markdown_tables(state["draft"])
        summary = ""

    if not follow_up_questions or len(follow_up_questions) < 2:
        follow_up_questions = _generate_fallback_follow_ups(state["question"])

    # Deduplicate sources while preserving enriched scoring attributes
    seen_urls: set[str] = set()
    enriched_sources: list[dict[str, Any]] = []

    sorted_results = sorted(
        state.get("search_results", []),
        key=lambda x: x.get("score", 0.5),
        reverse=True,
    )

    for r in sorted_results:
        url = r.get("url")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        enriched_sources.append({
            "url": url,
            "domain": r.get("domain") or extract_clean_domain(url),
            "score": r.get("score_percent", 80),
            "tier": r.get("tier", "good"),
            "authority_label": r.get("authority_label", "Web Source"),
            "signals": r.get("signals", []),
            "snippet": r.get("snippet", ""),
            "step": r.get("step", ""),
        })

    logger.info(
        "finalize_report_done",
        sources=len(enriched_sources),
        follow_up_questions=len(follow_up_questions),
    )
    return {
        "final_report": report,
        "summary": summary,
        "sources": enriched_sources,
        "follow_up_questions": follow_up_questions,
    }
