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
    Break the user's research question into 3-5 focused sub-questions.
    Returns a list of plain strings that will be used as search queries.
    """
    logger.info("node:plan_steps", run_id=state["run_id"])
    llm = _get_llm()

    system = (
        "You are a research planning assistant. "
        "Your job is to decompose a broad research question into "
        f"3 to {settings.max_steps} distinct, focused sub-questions that can be answered via web search. "
        "Each sub-question should target a specific angle (e.g., background/definition, "
        "current state/mechanism, challenges/limitations, future outlook). "
        "Return a JSON array of strings only. Example: [\"sub-q 1\", \"sub-q 2\", \"sub-q 3\"]"
        "Return ONLY the JSON array, no explanation, no markdown fences."
    )
    human = f"Research question: {state['question']}"

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
        # Fallback: treat the whole question as one step
        steps = [state["question"]]

    logger.info("plan_steps_done", steps=steps)
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

    system = (
        "You are a senior research analyst. "
        "Using ONLY the provided search snippets, write a well-structured research report "
        "that directly answers the user's question. "
        "The snippets are pre-ranked by relevance and domain credibility ([1], [2] being highest confidence). "
        "Prioritize assertions supported by high-confidence citations. "
        "Use clear headings (##) for each sub-topic. "
        "When presenting structured comparisons or multi-dimensional summaries, use clean markdown tables. "
        "Ensure each markdown table row is placed on its own line with proper delimiters (|). "
        "Cite sources inline as [1], [2], etc. corresponding to the snippet numbers. "
        "Be factual and concise. Do NOT invent information not present in the snippets."
    )
    human = (
        f"Research question: {state['question']}\n\n"
        f"Search results:\n{context}\n\n"
        "Write the draft report:"
    )

    chunks: list[str] = []
    loop_idx = state.get("loop_count", 0)
    run_id_str = str(state["run_id"])

    # Stream chunks token-by-token directly to SSE clients
    async for chunk in llm.astream([SystemMessage(content=system), HumanMessage(content=human)]):
        token = str(chunk.content or "")
        if token:
            chunks.append(token)
            await publish_event(
                run_id=run_id_str,
                event="token",
                data={
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

async def finalize_report(state: GraphState) -> dict[str, Any]:
    """
    Polish the draft into a final report with a one-paragraph summary and
    a ranked, enriched sources list.
    """
    logger.info("node:finalize_report", run_id=state["run_id"])
    llm = _get_llm()

    system = (
        "You are a professional research writer. "
        "Given the draft report, produce a final polished version. "
        "Preserve and refine any markdown tables, ensuring each table row is on a separate line with standard markdown format. "
        "Then write a 2-3 sentence executive summary that captures the key findings. "
        "Return a JSON object with two keys:\n"
        '  "report": the full polished report (markdown)\n'
        '  "summary": the executive summary\n'
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

    try:
        final: dict = json.loads(raw)
        report = clean_markdown_tables(str(final.get("report", state["draft"])))
        summary = str(final.get("summary", ""))
    except Exception as exc:
        logger.warning("finalize_parse_error", error=str(exc))
        report = clean_markdown_tables(state["draft"])
        summary = ""

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

    logger.info("finalize_report_done", sources=len(enriched_sources))
    return {"final_report": report, "summary": summary, "sources": enriched_sources}
