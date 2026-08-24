"""
LangGraph graph definition for the Research Assistant Agent.

Graph structure:

    plan_steps ──► search_web ──► draft_report ──► review_draft
                       ▲                                │
                       │          (gaps & loops < 3)    │
                       └────────────────────────────────┘
                                                        │
                                   (no gaps OR max loops reached)
                                                        ▼
                                                 finalize_report
"""

from langgraph.graph import StateGraph, END

from app.agent.state import GraphState
from app.agent.nodes import (
    plan_steps,
    search_web,
    draft_report,
    review_draft,
    finalize_report,
)
from app.core.config import get_settings

settings = get_settings()


def _route_after_review(state: GraphState) -> str:
    """
    Conditional edge: loop back to search_web when there are gaps
    and we haven't hit the maximum number of loops yet.
    """
    if state.get("gaps_found") and state.get("loop_count", 0) < settings.max_search_loops:
        return "search_web"
    return "finalize_report"


def build_graph() -> StateGraph:
    """Build and compile the research assistant graph."""
    builder = StateGraph(GraphState)

    # ── Register nodes ────────────────────────────────────────────
    builder.add_node("plan_steps", plan_steps)
    builder.add_node("search_web", search_web)
    builder.add_node("draft_report", draft_report)
    builder.add_node("review_draft", review_draft)
    builder.add_node("finalize_report", finalize_report)

    # ── Entry point ───────────────────────────────────────────────
    builder.set_entry_point("plan_steps")

    # ── Normal edges ──────────────────────────────────────────────
    builder.add_edge("plan_steps", "search_web")
    builder.add_edge("search_web", "draft_report")
    builder.add_edge("draft_report", "review_draft")
    builder.add_edge("finalize_report", END)

    # ── Conditional edge (the loop) ───────────────────────────────
    builder.add_conditional_edges(
        "review_draft",
        _route_after_review,
        {
            "search_web": "search_web",
            "finalize_report": "finalize_report",
        },
    )

    return builder.compile()


# Module-level singleton so we compile the graph only once
graph = build_graph()
