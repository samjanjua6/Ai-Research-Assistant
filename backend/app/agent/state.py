from typing import TypedDict, Annotated
import operator


class SearchResult(TypedDict):
    step: str           # which sub-question this result answers
    query: str          # exact search query used
    snippet: str        # text returned by DuckDuckGo
    url: str            # source URL


class GraphState(TypedDict):
    """Shared state object passed between every LangGraph node."""

    # ── Input ─────────────────────────────────────────────────────
    run_id: str                                     # UUID of the DB row
    question: str                                   # original user question

    # ── Planning ──────────────────────────────────────────────────
    steps: list[str]                                # sub-questions from planner

    # ── Search (accumulated across loops) ─────────────────────────
    # Annotated with operator.add so LangGraph merges lists instead of replacing
    search_results: Annotated[list[SearchResult], operator.add]

    # ── Drafting & Review ─────────────────────────────────────────
    draft: str
    review_notes: str                               # gaps identified by reviewer
    gaps_found: bool                                # flag for conditional edge

    # ── Loop control ──────────────────────────────────────────────
    loop_count: int

    # ── Output ────────────────────────────────────────────────────
    final_report: str
    summary: str
    sources: list[str]
