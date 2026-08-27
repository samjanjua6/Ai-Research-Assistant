"""
CrewAI Tool Adapters for Research Agents.
Wraps DuckDuckGo 5-Pillar search, BM25 document section extractor,
and URL clean text parser into CrewAI-compatible tools.
"""

from __future__ import annotations

import asyncio
from typing import Any
from crewai.tools import tool

from app.agent.tools import search_duckduckgo
from app.agent.scoring import rank_and_filter_results
from app.agent.doc_parser import score_and_extract_relevant_sections
from app.agent.url_fetcher import format_grounded_urls_for_context


def build_crew_tools(
    documents: list[dict[str, Any]] | None = None,
    grounded_urls: list[dict[str, Any]] | None = None,
    collected_sources: list[dict[str, Any]] | None = None,
) -> list[Any]:
    """
    Factory creating context-bound CrewAI tools for a research run.
    """
    docs = documents or []
    urls = grounded_urls or []
    sources_collector = collected_sources if collected_sources is not None else []

    @tool("Search Live Web")
    def search_live_web(query: str, **kwargs: Any) -> str:
        """
        Search the open web using DuckDuckGo and rank results across 5 credibility pillars
        (domain authority, fresh recency, semantic relevance, content richness, exact match).
        Returns top verified snippets with source indexes [1], [2], etc.
        """
        try:
            raw_results = search_duckduckgo(query, step="crew_scout", max_results=6)
            ranked = rank_and_filter_results(raw_results, query, top_k=4)
            if not ranked:
                return f"No verified web results found for query: '{query}'"

            output_lines = []
            for r in ranked:
                idx = len(sources_collector) + 1
                source_record = {
                    "index": idx,
                    "title": r.title,
                    "url": r.url,
                    "snippet": r.snippet,
                    "domain": r.domain,
                    "score": r.score,
                    "tier": r.tier,
                    "authority_label": r.authority_label,
                    "signals": r.signals,
                    "step": query,
                }
                sources_collector.append(source_record)
                output_lines.append(
                    f"[{idx}] {r.title} ({r.domain} · Tier {r.tier} {r.authority_label})\n"
                    f"URL: {r.url}\n"
                    f"Excerpt: {r.snippet}\n"
                )

            return "\n".join(output_lines)
        except Exception as exc:
            return f"Error executing web search: {str(exc)}"

    @tool("Search Attached Documents")
    def search_attached_documents(query: str, **kwargs: Any) -> str:
        """
        Extract relevant paragraphs from user-uploaded PDF, DOCX, TXT, or MD documents
        using BM25 semantic section scoring.
        """
        if not docs:
            return "No attached documents provided for this research inquiry."
        try:
            extracted = score_and_extract_relevant_sections(docs, query, max_chars=25000)
            return extracted or "No relevant sections found in attached documents."
        except Exception as exc:
            return f"Error reading attached documents: {str(exc)}"

    @tool("Read Grounded Web URLs")
    def read_grounded_urls(inquiry: str = "", **kwargs: Any) -> str:
        """
        Retrieve clean, extracted text from grounded web URLs (e.g. arXiv papers, GitHub repos, Wikipedia articles).
        """
        if not urls:
            return "No grounded web URLs provided for this research inquiry."
        try:
            return format_grounded_urls_for_context(urls, max_chars=25000)
        except Exception as exc:
            return f"Error reading grounded URLs: {str(exc)}"

    return [search_live_web, search_attached_documents, read_grounded_urls]
