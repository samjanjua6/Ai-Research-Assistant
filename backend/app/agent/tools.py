"""
DuckDuckGo search wrapper.
Uses duckduckgo_search (no API key required) with a safe retry on failure.
"""

from __future__ import annotations

import time
from typing import TYPE_CHECKING

import warnings

with warnings.catch_warnings():
    warnings.simplefilter("ignore", category=RuntimeWarning)
    try:
        from ddgs import DDGS
    except ImportError:
        from duckduckgo_search import DDGS

from app.core.logging import get_logger

if TYPE_CHECKING:
    from app.agent.state import SearchResult

logger = get_logger(__name__)

_MAX_RETRIES = 2
_RETRY_DELAY = 2.0          # seconds between retries
_DEFAULT_MAX_RESULTS = 3


def search_duckduckgo(
    query: str,
    step: str,
    max_results: int = _DEFAULT_MAX_RESULTS,
) -> list["SearchResult"]:
    """
    Search DuckDuckGo and return a list of SearchResult dicts.
    Silently returns an empty list if all retries fail so the graph
    never crashes due to a transient search error.
    """
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            logger.info("duckduckgo_search", query=query, attempt=attempt)
            with DDGS() as ddgs:
                raw = list(ddgs.text(query, max_results=max_results))

            results: list[SearchResult] = [
                {
                    "step": step,
                    "query": query,
                    "snippet": r.get("body", ""),
                    "url": r.get("href", ""),
                }
                for r in raw
                if r.get("body")
            ]
            logger.info("duckduckgo_results", query=query, count=len(results))
            return results

        except Exception as exc:
            logger.warning(
                "duckduckgo_search_failed",
                query=query,
                attempt=attempt,
                error=str(exc),
            )
            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_DELAY)

    logger.error("duckduckgo_search_all_retries_failed", query=query)
    return []
