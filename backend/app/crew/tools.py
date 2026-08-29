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
            ranked = rank_and_filter_results(raw_results, query, max_results=4)
            if not ranked:
                return f"No verified web results found for query: '{query}'"

            output_lines = []
            for r in ranked:
                idx = len(sources_collector) + 1
                title = r.get("title", "Untitled")
                url = r.get("url", "")
                snippet = r.get("snippet", "")
                domain = r.get("domain", "")
                tier = r.get("tier", 3)
                authority_label = r.get("authority_label", "")

                source_record = {
                    "index": idx,
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                    "domain": domain,
                    "score": r.get("score", 0.5),
                    "tier": tier,
                    "authority_label": authority_label,
                    "signals": r.get("signals", {}),
                    "step": query,
                }
                sources_collector.append(source_record)
                output_lines.append(
                    f"[{idx}] {title} ({domain} · Tier {tier} {authority_label})\n"
                    f"URL: {url}\n"
                    f"Excerpt: {snippet}\n"
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

    @tool("Search Academic Literature")
    def search_academic_literature(query: str, **kwargs: Any) -> str:
        """
        Query dedicated academic repositories (arXiv, Semantic Scholar, PubMed, Crossref)
        for peer-reviewed studies, author DOIs, citation counts, and validated abstracts.
        """
        try:
            from app.agent.academic_engine import search_academic_aggregator
            import concurrent.futures

            def _fetch():
                loop = asyncio.new_event_loop()
                try:
                    return loop.run_until_complete(search_academic_aggregator(query, max_results=4))
                finally:
                    loop.close()

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                papers = pool.submit(_fetch).result(timeout=6.0)

            if not papers:
                return f"No academic papers found for query: '{query}'"

            output_lines = []
            for p in papers:
                idx = len(sources_collector) + 1
                title = p.get("title", "Untitled Paper")
                url = p.get("url", "")
                snippet = p.get("snippet", "")
                doi = p.get("doi") or ""
                citations = p.get("citation_count")
                repo = p.get("repository", "academic").upper()

                source_record = {
                    "index": idx,
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                    "domain": p.get("domain", "academic"),
                    "score": 0.95,
                    "tier": 1,
                    "authority_label": f"Academic ({repo})",
                    "signals": ["Peer-Reviewed / Preprint", f"Repository: {repo}"],
                    "is_academic": True,
                    "repository": p.get("repository"),
                    "doi": doi,
                    "arxiv_id": p.get("arxiv_id"),
                    "pubmed_id": p.get("pubmed_id"),
                    "authors": p.get("authors", []),
                    "year": p.get("year"),
                    "journal_name": p.get("journal_name"),
                    "is_peer_reviewed": p.get("is_peer_reviewed", True),
                    "citation_count": citations,
                    "pdf_url": p.get("pdf_url"),
                    "bibtex": p.get("bibtex"),
                    "step": query,
                }
                sources_collector.append(source_record)
                cite_str = f" · Citations: {citations}" if citations else ""
                doi_str = f" · DOI: {doi}" if doi else ""
                output_lines.append(
                    f"[{idx}] {title} ({repo}{cite_str}{doi_str})\n"
                    f"URL: {url}\n"
                    f"Abstract: {snippet}\n"
                )

            return "\n".join(output_lines)
        except Exception as exc:
            return f"Error executing academic literature search: {str(exc)}"

    return [search_live_web, search_academic_literature, search_attached_documents, read_grounded_urls]
