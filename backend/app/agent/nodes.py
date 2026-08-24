"""
LangGraph node functions.

Every node is a plain function that receives GraphState and returns
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
from app.core.config import get_settings
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
    1. Un-glues single-line double-pipe table rows without splitting intra-delimiter columns
    2. Ensures tables have blank lines before them so markdown parsers don't merge them with preceding paragraphs
    """
    if not text:
        return ""
    
    cleaned = text
    # 1. Un-glue double pipes between table rows (e.g. `... row 1 || ... row 2 |` or `... row 1 ||---|---|`)
    cleaned = re.sub(r'\|[ \t]*\|(?=[:\-])', '|\n|', cleaned)
    cleaned = re.sub(r'\|[ \t]*\|(?=[^\n|:\-])', '|\n|', cleaned)
    
    # 2. Ensure table start has a blank line before it if preceded by text
    cleaned = re.sub(r'([^\n])\n(\|[^\n]+\|\r?\n\|[-: |]+\|)', r'\1\n\n\2', cleaned)
    
    return cleaned



# ─────────────────────────────────────────────────────────────────────────────
# Node 1 — plan_steps
# ─────────────────────────────────────────────────────────────────────────────

def plan_steps(state: GraphState) -> dict[str, Any]:
    """
    Break the user's research question into 3-5 focused sub-questions.
    Returns a list of plain strings that will be used as search queries.
    """
    logger.info("node:plan_steps", run_id=state["run_id"])
    llm = _get_llm()

    system = (
        "You are a research planning assistant. "
        "Your job is to decompose a broad research question into "
        f"3 to {settings.max_steps} specific, self-contained sub-questions "
        "that together cover the topic thoroughly. "
        "Return ONLY a JSON array of strings — no prose, no markdown fences. "
        'Example: ["sub-question 1", "sub-question 2", "sub-question 3"]'
    )
    human = f"Research question: {state['question']}"

    response = llm.invoke([SystemMessage(content=system), HumanMessage(content=human)])

    raw = response.content.strip()
    # Strip markdown code fences if the model wraps them anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        steps: list[str] = json.loads(raw)
        if not isinstance(steps, list):
            raise ValueError("Expected a list")
        steps = [str(s) for s in steps[: settings.max_steps]]
    except Exception as exc:
        logger.warning("plan_steps_parse_error", error=str(exc), raw=raw)
        # Fallback: treat the whole question as one step
        steps = [state["question"]]

    logger.info("plan_steps_done", steps=steps)
    return {"steps": steps}


# ─────────────────────────────────────────────────────────────────────────────
# Node 2 — search_web
# ─────────────────────────────────────────────────────────────────────────────

def search_web(state: GraphState) -> dict[str, Any]:
    """
    Run a DuckDuckGo search for every step in state['steps'].
    New results are APPENDED to state['search_results'] (operator.add).
    """
    logger.info("node:search_web", run_id=state["run_id"], loop=state.get("loop_count", 0))

    new_results: list[SearchResult] = []
    for step in state["steps"]:
        results = search_duckduckgo(
            query=step,
            step=step,
            max_results=settings.search_results_per_step,
        )
        new_results.extend(results)

    logger.info("search_web_done", new_results=len(new_results))
    # Returning a list here — LangGraph adds it to existing search_results (operator.add)
    return {"search_results": new_results}


# ─────────────────────────────────────────────────────────────────────────────
# Node 3 — draft_report
# ─────────────────────────────────────────────────────────────────────────────

def draft_report(state: GraphState) -> dict[str, Any]:
    """
    Synthesise all collected search results into a structured draft report.
    """
    logger.info("node:draft_report", run_id=state["run_id"], results=len(state["search_results"]))
    llm = _get_llm()

    # Build a readable context string
    context_parts: list[str] = []
    for idx, r in enumerate(state["search_results"], 1):
        context_parts.append(
            f"[{idx}] Sub-question: {r['step']}\n"
            f"    Source: {r['url']}\n"
            f"    Snippet: {r['snippet']}\n"
        )
    context = "\n".join(context_parts) or "No search results available."

    system = (
        "You are a senior research analyst. "
        "Using ONLY the provided search snippets, write a well-structured research report "
        "that directly answers the user's question. "
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

    response = llm.invoke([SystemMessage(content=system), HumanMessage(content=human)])
    draft = clean_markdown_tables(response.content.strip())
    logger.info("draft_report_done", draft_length=len(draft))
    return {"draft": draft}


# ─────────────────────────────────────────────────────────────────────────────
# Node 4 — review_draft
# ─────────────────────────────────────────────────────────────────────────────

def review_draft(state: GraphState) -> dict[str, Any]:
    """
    Self-review the draft and decide whether to loop back for more searching.
    Returns gaps_found=True if important information is still missing AND
    loop_count is still under the configured maximum.
    """
    loop_count = state.get("loop_count", 0)
    logger.info("node:review_draft", run_id=state["run_id"], loop=loop_count)

    if loop_count >= settings.max_search_loops:
        logger.info("review_draft_max_loops_reached")
        return {"gaps_found": False, "review_notes": "Max loops reached.", "loop_count": loop_count}

    llm = _get_llm()

    system = (
        "You are a critical research editor. "
        "Review the draft report below against the original research question. "
        "Identify any important topics or sub-questions that are missing, vague, or unsubstantiated. "
        "Respond with a JSON object with two keys:\n"
        '  "gaps_found": true or false\n'
        '  "notes": a short description of what is missing (or "None" if complete)\n'
        "Return ONLY valid JSON, no markdown fences."
    )
    human = (
        f"Research question: {state['question']}\n\n"
        f"Draft report:\n{state['draft']}\n\n"
        "Review:"
    )

    response = llm.invoke([SystemMessage(content=system), HumanMessage(content=human)])
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

def finalize_report(state: GraphState) -> dict[str, Any]:
    """
    Polish the draft into a final report with a one-paragraph summary and
    a deduplicated sources list.
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

    response = llm.invoke([SystemMessage(content=system), HumanMessage(content=human)])
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

    # Deduplicate sources from all search results
    sources = list(
        dict.fromkeys(
            r["url"] for r in state["search_results"] if r.get("url")
        )
    )

    logger.info("finalize_report_done", sources=len(sources))
    return {"final_report": report, "summary": summary, "sources": sources}
