"""
Source Quality and Relevance Scoring Engine.

Implements a 5-pillar composite scoring algorithm:
1. Lexical & Semantic Intent Alignment (BM25 / Token term weighting) (35%)
2. Domain Authority & TLD Trust Matrix (25%)
3. Information Density & Numeric Substance (20%)
4. Temporal Recency & Freshness (10%)
5. MMR (Maximal Marginal Relevance) Domain Diversity (10%)
"""

from __future__ import annotations

import math
import re
from typing import Any, Sequence
from urllib.parse import urlparse

# ── 1. Domain Authority & Trust Matrix ──────────────────────────────

TIER1_ACADEMIC_GOV_DOMAINS = {
    "arxiv.org",
    "nature.com",
    "science.org",
    "ieee.org",
    "acm.org",
    "nih.gov",
    "ncbi.nlm.nih.gov",
    "pubmed.ncbi.nlm.nih.gov",
    "biorxiv.org",
    "medrxiv.org",
    "sciencedirect.com",
    "springer.com",
    "wiley.com",
    "cell.com",
    "thelancet.com",
    "who.int",
    "cdc.gov",
    "nasa.gov",
    "mit.edu",
    "stanford.edu",
    "harvard.edu",
    "ox.ac.uk",
    "cam.ac.uk",
    "wikipedia.org",
    "ssrn.com",
}

TIER2_AUTHORITATIVE_MEDIA_DOCS = {
    "reuters.com",
    "bloomberg.com",
    "ft.com",
    "wsj.com",
    "economist.com",
    "apnews.com",
    "bbc.com",
    "nytimes.com",
    "theguardian.com",
    "technologyreview.com",
    "wired.com",
    "techcrunch.com",
    "theverge.com",
    "arstechnica.com",
    "github.com",
    "developer.mozilla.org",
    "docs.python.org",
    "learn.microsoft.com",
    "cloud.google.com",
    "aws.amazon.com",
    "openai.com",
    "anthropic.com",
    "deepmind.google",
    "huggingface.co",
}

LOW_QUALITY_OR_SPAM_PATTERNS = [
    r"pinterest\.",
    r"facebook\.com",
    r"instagram\.com",
    r"tiktok\.com",
    r"quora\.com",
    r"answers\.yahoo\.com",
    r"about\.com",
    r"ezinearticles\.com",
    r"contentfarm",
    r"clickbank",
]

BOILERPLATE_NOISE_PHRASES = [
    "accept all cookies",
    "enable cookies to continue",
    "sign in to read more",
    "subscribe to view",
    "page not found",
    "404 error",
    "javascript is disabled",
    "please turn javascript on",
    "all rights reserved",
    "terms and conditions",
    "privacy policy",
]


def extract_clean_domain(url: str) -> str:
    """Extract clean domain without www or query string."""
    if not url:
        return "unknown"
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc or "unknown"
    except Exception:
        return "unknown"


def evaluate_domain_authority(url: str) -> tuple[float, str, list[str]]:
    """
    Evaluates domain authority based on TLD and curated domain trust matrix.
    Returns (score_bonus_0_to_1, authority_label, signals).
    """
    domain = extract_clean_domain(url)
    signals: list[str] = []

    # Check spam patterns
    for pattern in LOW_QUALITY_OR_SPAM_PATTERNS:
        if re.search(pattern, domain):
            return 0.15, "Low Authority", ["Low Authority / Social Domain"]

    # Check Tier 1 Academic & Gov
    if any(domain == d or domain.endswith("." + d) for d in TIER1_ACADEMIC_GOV_DOMAINS):
        signals.append("Verified Academic / Gov Authority")
        return 0.98, "Academic / Gov Authority", signals

    # Check .edu / .gov / .mil TLDs
    if domain.endswith(".edu") or domain.endswith(".gov") or domain.endswith(".mil"):
        signals.append("Verified Educational / Government TLD")
        return 0.95, "Official / Gov Institution", signals

    # Check .org (standard non-profit / research)
    if domain.endswith(".org") or domain.endswith(".ac.uk"):
        signals.append("Non-Profit / Research Org")
        return 0.85, "Research Organization", signals

    # Check Tier 2 Authoritative Media & Tech Docs
    if any(domain == d or domain.endswith("." + d) for d in TIER2_AUTHORITATIVE_MEDIA_DOCS):
        signals.append("Authoritative Press / Official Docs")
        return 0.88, "Verified Press / Docs", signals

    # Standard commercial / blog (.com, .io, .dev, etc.)
    return 0.65, "General Web", ["Standard Web Source"]


# ── 2. Lexical & Semantic Relevance (BM25 / Keyword Overlap) ────────

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any",
    "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below",
    "between", "both", "but", "by", "can", "can't", "cannot", "could", "couldn't", "did",
    "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few",
    "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having",
    "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
    "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in",
    "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most",
    "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
    "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's",
    "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why",
    "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
    "your", "yours", "yourself", "yourselves", "latest", "recent", "breakthroughs", "trends",
}


def tokenize(text: str) -> list[str]:
    """Tokenize and filter stop words."""
    if not text:
        return []
    words = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
    return [w for w in words if w not in STOPWORDS]


def calculate_lexical_relevance(snippet: str, query: str, root_question: str) -> tuple[float, list[str]]:
    """
    Calculates BM25-inspired lexical and semantic overlap between the snippet,
    the specific sub-topic query, and the parent research question.
    """
    if not snippet or not snippet.strip():
        return 0.0, []

    snippet_tokens = set(tokenize(snippet))
    if not snippet_tokens:
        return 0.1, []

    query_tokens = tokenize(query)
    root_tokens = tokenize(root_question)

    signals: list[str] = []

    # Sub-topic query match (specific intent)
    query_matches = [t for t in query_tokens if t in snippet_tokens]
    query_overlap = len(query_matches) / max(len(query_tokens), 1)

    # Root question match (broad contextual alignment)
    root_matches = [t for t in root_tokens if t in snippet_tokens]
    root_overlap = len(root_matches) / max(len(root_tokens), 1)

    # Weighted lexical score: 65% sub-topic match + 35% root question match
    lexical_score = (query_overlap * 0.65) + (root_overlap * 0.35)

    if query_overlap >= 0.7:
        signals.append("Exact Query Term Match")
    elif query_overlap >= 0.4:
        signals.append("High Topic Alignment")

    return min(1.0, max(0.1, lexical_score)), signals


# ── 3. Information Density & Substance ──────────────────────────────

def calculate_information_density(snippet: str) -> tuple[float, list[str]]:
    """
    Evaluates informational density, presence of quantitative facts,
    and penalizes spam/boilerplate noise.
    """
    if not snippet or len(snippet.strip()) < 35:
        return 0.2, ["Low Character Count"]

    clean_snippet = snippet.lower()
    signals: list[str] = []

    # Check for boilerplate noise
    noise_count = sum(1 for phrase in BOILERPLATE_NOISE_PHRASES if phrase in clean_snippet)
    if noise_count > 0:
        penalty = min(0.4, noise_count * 0.25)
        return max(0.1, 0.5 - penalty), ["Boilerplate / Navigation Text"]

    base_score = 0.6

    # Reward quantitative substance (numbers, percentages, currency, scientific units)
    has_numbers = bool(re.search(r"\b\d+(\.\d+)?%?\b", snippet))
    has_metrics = bool(re.search(r"(\$|€|£|¥|\b\d+\s*(nm|mwh|gwh|kwh|qubits?|gb|tb|km|ms|ghz|mhz|kg|tons?)\b)", snippet, re.I))
    has_dates = bool(re.search(r"\b(202[0-9]|january|february|march|april|may|june|july|august|september|october|november|december)\b", snippet, re.I))

    if has_metrics or (has_numbers and has_dates):
        base_score += 0.3
        signals.append("Quantitative Evidence & Data")
    elif has_numbers:
        base_score += 0.15
        signals.append("Statistical Data")

    # Reward sentence structure
    sentence_count = len(re.split(r"[\.\!\?]\s+", snippet))
    if sentence_count >= 2:
        base_score += 0.1

    return min(1.0, base_score), signals


# ── 4. Temporal Recency & Freshness ─────────────────────────────────

def evaluate_temporal_recency(snippet: str, url: str) -> tuple[float, list[str]]:
    """
    Extracts publication or reference year from snippet or URL.
    Boosts 2025/2026 recency.
    """
    combined = f"{url} {snippet}"
    signals: list[str] = []

    if re.search(r"\b202[6-9]\b", combined):
        signals.append("2026 Recent Data")
        return 1.0, signals
    if re.search(r"\b2025\b", combined):
        signals.append("2025 Data")
        return 0.9, signals
    if re.search(r"\b2024\b", combined):
        return 0.8, []
    if re.search(r"\b202[0-3]\b", combined):
        return 0.65, []

    return 0.75, []  # Neutral score if year not explicitly stated


# ── 5. Master Composite Scorer ──────────────────────────────────────

def score_search_result(
    *,
    snippet: str,
    query: str,
    root_question: str,
    url: str,
) -> dict[str, Any]:
    """
    Evaluates a single search result across the 5 pillars and returns
    a comprehensive quality report with a 0-100% normalized score.
    """
    domain = extract_clean_domain(url)

    # 1. Lexical & Semantic Relevance (35%)
    lex_score, lex_signals = calculate_lexical_relevance(snippet, query, root_question)

    # 2. Domain Authority (25%)
    dom_score, auth_label, dom_signals = evaluate_domain_authority(url)

    # 3. Information Density & Substance (20%)
    den_score, den_signals = calculate_information_density(snippet)

    # 4. Temporal Freshness (10%)
    rec_score, rec_signals = evaluate_temporal_recency(snippet, url)

    # Base Composite (weighted 90% before MMR diversity discount)
    composite = (
        (lex_score * 0.35)
        + (dom_score * 0.25)
        + (den_score * 0.20)
        + (rec_score * 0.10)
    ) / 0.90  # Normalize to 0.0 - 1.0

    composite = min(1.0, max(0.05, composite))
    score_percent = int(round(composite * 100))

    # Determine Quality Tier
    if score_percent >= 80:
        tier = "high"
    elif score_percent >= 60:
        tier = "good"
    elif score_percent >= 35:
        tier = "fair"
    else:
        tier = "low"

    all_signals = list(dict.fromkeys(dom_signals + lex_signals + den_signals + rec_signals))

    return {
        "score": round(composite, 4),
        "score_percent": score_percent,
        "tier": tier,
        "domain": domain,
        "authority_label": auth_label,
        "signals": all_signals,
    }


# ── 6. MMR Diversity & Re-ranking ───────────────────────────────────

def rank_and_filter_results(
    results: Sequence[dict[str, Any]],
    root_question: str,
    min_score: float = 0.25,
    max_results: int = 15,
) -> list[dict[str, Any]]:
    """
    Scores, re-ranks, applies MMR domain diversity penalties, and filters out
    substandard candidate snippets.
    """
    if not results:
        return []

    scored_candidates = []
    for r in results:
        scoring = score_search_result(
            snippet=r.get("snippet", ""),
            query=r.get("step", "") or r.get("query", ""),
            root_question=root_question,
            url=r.get("url", ""),
        )

        candidate = dict(r)
        candidate.update(scoring)
        scored_candidates.append(candidate)

    # Sort initially by raw composite score descending
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)

    # Apply MMR domain diversity penalty (penalize 3rd, 4th, 5th occurrence of same domain)
    domain_counts: dict[str, int] = {}
    ranked_final: list[dict[str, Any]] = []

    for item in scored_candidates:
        dom = item["domain"]
        seen_count = domain_counts.get(dom, 0)
        domain_counts[dom] = seen_count + 1

        # Diversity penalty: -8% score for 2nd appearance, -18% for 3rd, -30% for 4th+
        if seen_count == 1:
            item["score"] = max(0.05, round(item["score"] * 0.92, 4))
            item["score_percent"] = int(round(item["score"] * 100))
        elif seen_count >= 2:
            item["score"] = max(0.05, round(item["score"] * 0.75, 4))
            item["score_percent"] = int(round(item["score"] * 100))

        # Filter out anything below minimum threshold unless very few results exist
        if item["score"] >= min_score or len(ranked_final) < 3:
            ranked_final.append(item)

    # Re-sort after MMR diversity adjustments
    ranked_final.sort(key=lambda x: x["score"], reverse=True)

    return ranked_final[:max_results]
