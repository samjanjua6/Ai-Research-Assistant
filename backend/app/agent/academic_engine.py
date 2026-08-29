"""
Academic Research Engine & Multi-Repository Adapter.
Integrates arXiv, Semantic Scholar, PubMed/PMC, and Crossref for peer-reviewed literature,
DOIs, citation velocity, open-access PDFs, and automatic BibTeX generation.
"""
from __future__ import annotations

import asyncio
import re
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any
import httpx

from app.core.logging import get_logger

logger = get_logger(__name__)

# Request headers with polite user-agent
_HEADERS = {
    "User-Agent": "AI-Research-Assistant/2.0 (mailto:research@mychatbot.codes; https://research.mychatbot.codes)",
    "Accept": "application/json, application/xml, text/xml",
}

_TIMEOUT = 3.5  # seconds max per academic API call


# ── Domain Classification & Query Pre-Processing ────────────────────

def classify_academic_domain(query: str) -> str:
    """
    Classifies inquiry domain to optimize academic repository query distribution.
    Returns: 'biomedical' | 'cs_ai' | 'physics_materials' | 'economics' | 'general'
    """
    q = query.lower()
    if re.search(r"\b(quantum|qubit|battery|perovskite|solar cell|photovoltaic|semiconductor|superconductor|solar|graphene|electrolyte|thermal degradation|fusion|nanotube|heterojunction)\b", q):
        return "physics_materials"
    if re.search(r"\b(crispr|gene|cancer|clinical|drug|disease|protein|stem cell|neuron|patient|therapy|antibody|pathology|medical|vaccine|biomarker|immunology)\b", q):
        return "biomedical"
    if re.search(r"\b(llm|transformer|neural|algorithm|model|gpu|latency|deep learning|vision|reinforcement|reinforce|agent|benchmark|ai|nlp|compiler)\b", q):
        return "cs_ai"
    if re.search(r"\b(inflation|gdp|monetary|tariff|macroeconomic|supply chain|market|interest rate|yield|fiscal|capital)\b", q):
        return "economics"
    return "general"


def clean_academic_query(query: str) -> str:
    """Strips command lenses (/DEEP, /ANGLE) and special syntax for academic engines."""
    cleaned = re.sub(r"^/[A-Z]+(?:\s+[a-z\-]+)?\b", "", query).strip()
    if cleaned.startswith('"') and cleaned.endswith('"') and cleaned.count('"') == 2:
        cleaned = cleaned[1:-1].strip()
    # Remove compound inquiry starters
    cleaned = re.sub(r"(?i)^(?:what is(?: the)?(?: status and roadmap of)?|what are(?: the)?|how does|the status and roadmap of|status and roadmap of|investigate|analyze)\s+", "", cleaned).strip()
    return cleaned or query


def generate_bibtex(paper: dict[str, Any]) -> str:
    """Generates standard LaTeX BibTeX citation entry from paper metadata."""
    title = paper.get("title", "Untitled").replace('"', "").strip()
    authors = paper.get("authors", [])
    author_str = " and ".join(authors) if isinstance(authors, list) and authors else "Unknown"
    year = paper.get("year") or "2024"
    doi = paper.get("doi") or ""
    journal = paper.get("journal_name") or paper.get("repository", "Preprint").upper()
    url = paper.get("url") or ""

    # Generate citation key: e.g. smith2024perovskite
    first_author = authors[0].split()[-1].lower() if isinstance(authors, list) and authors else "ref"
    first_word = re.sub(r"\W+", "", title.split()[0].lower()) if title else "paper"
    cite_key = f"{first_author}{year}{first_word}"

    bib = [
        f"@article{{{cite_key},",
        f'  title = "{title}",',
        f'  author = "{author_str}",',
        f'  journal = "{journal}",',
        f'  year = "{year}",',
    ]
    if doi:
        bib.append(f'  doi = "{doi}",')
    if url:
        bib.append(f'  url = "{url}",')
    bib.append("}")
    return "\n".join(bib)


# ── arXiv API Adapter ───────────────────────────────────────────────

async def search_arxiv(query: str, max_results: int = 4) -> list[dict[str, Any]]:
    """
    Queries arXiv API via Atom XML feed.
    Extracts preprints across cs, physics, math, and quant-bio.
    """
    clean_q = clean_academic_query(query)
    encoded = urllib.parse.quote(clean_q)
    url = f"https://export.arxiv.org/api/query?search_query=all:{encoded}&start=0&max_results={max_results}&sortBy=relevance&sortOrder=descending"

    results = []
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning("arxiv_api_error", status=resp.status_code, query=clean_q)
                return []

            root = ET.fromstring(resp.content)
            ns = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}

            for entry in root.findall("atom:entry", ns):
                title_elem = entry.find("atom:title", ns)
                title = title_elem.text.strip().replace("\n", " ") if title_elem is not None and title_elem.text else "Untitled arXiv Paper"
                
                summary_elem = entry.find("atom:summary", ns)
                abstract = summary_elem.text.strip().replace("\n", " ") if summary_elem is not None and summary_elem.text else ""

                id_elem = entry.find("atom:id", ns)
                raw_id_url = id_elem.text.strip() if id_elem is not None and id_elem.text else ""
                arxiv_id = raw_id_url.split("/abs/")[-1] if "/abs/" in raw_id_url else raw_id_url

                published_elem = entry.find("atom:published", ns)
                year = published_elem.text[:4] if published_elem is not None and published_elem.text else "2024"

                # Authors
                authors = []
                for a in entry.findall("atom:author", ns):
                    name_el = a.find("atom:name", ns)
                    if name_el is not None and name_el.text:
                        authors.append(name_el.text.strip())

                # PDF link
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf" if arxiv_id else ""

                paper_data = {
                    "title": title,
                    "url": raw_id_url or f"https://arxiv.org/abs/{arxiv_id}",
                    "snippet": abstract[:500] + ("..." if len(abstract) > 500 else ""),
                    "domain": "arxiv.org",
                    "repository": "arxiv",
                    "arxiv_id": arxiv_id,
                    "doi": f"10.48550/arXiv.{arxiv_id}" if arxiv_id else None,
                    "authors": authors[:5],
                    "year": year,
                    "is_peer_reviewed": False,
                    "is_academic": True,
                    "tier": 1,
                    "authority_label": "arXiv Preprint",
                    "citation_count": None,
                    "pdf_url": pdf_url,
                }
                paper_data["bibtex"] = generate_bibtex(paper_data)
                results.append(paper_data)

    except Exception as exc:
        logger.warning("arxiv_search_failed", query=clean_q, error=str(exc))

    return results


# ── Semantic Scholar Graph API Adapter ──────────────────────────────

async def search_semantic_scholar(query: str, max_results: int = 4) -> list[dict[str, Any]]:
    """
    Queries Semantic Scholar Paper Search API.
    Extracts citation counts, influential citations, TLDR, and DOIs.
    """
    clean_q = clean_academic_query(query)
    encoded = urllib.parse.quote(clean_q)
    fields = "title,authors,abstract,citationCount,influentialCitationCount,year,isOpenAccess,openAccessPdf,externalIds,journal,tldr"
    url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={encoded}&limit={max_results}&fields={fields}"

    results = []
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning("semantic_scholar_error", status=resp.status_code, query=clean_q)
                return []

            data = resp.json()
            papers = data.get("data", [])

            for p in papers:
                title = p.get("title") or "Untitled Academic Paper"
                abstract = p.get("abstract") or ""
                tldr = p.get("tldr", {}).get("text") if p.get("tldr") else None
                snippet = tldr or abstract or "Empirical academic research paper."

                external_ids = p.get("externalIds") or {}
                doi = external_ids.get("DOI")
                arxiv_id = external_ids.get("ArXiv")
                pubmed_id = external_ids.get("PubMed")

                paper_url = f"https://doi.org/{doi}" if doi else (f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else f"https://www.semanticscholar.org/paper/{p.get('paperId')}")

                authors = [a.get("name") for a in p.get("authors", []) if a.get("name")]
                year = str(p.get("year") or "2024")
                citation_count = p.get("citationCount") or 0
                influential_count = p.get("influentialCitationCount") or 0
                journal_info = p.get("journal") or {}
                journal_name = journal_info.get("name") if isinstance(journal_info, dict) else str(journal_info)

                open_access = p.get("openAccessPdf") or {}
                pdf_url = open_access.get("url") if isinstance(open_access, dict) else None

                paper_data = {
                    "title": title,
                    "url": paper_url,
                    "snippet": snippet[:500] + ("..." if len(snippet) > 500 else ""),
                    "domain": "semanticscholar.org",
                    "repository": "semantic_scholar",
                    "doi": doi,
                    "arxiv_id": arxiv_id,
                    "pubmed_id": pubmed_id,
                    "authors": authors[:5],
                    "year": year,
                    "journal_name": journal_name,
                    "is_peer_reviewed": bool(journal_name or doi),
                    "is_academic": True,
                    "tier": 1,
                    "authority_label": f"Peer-Reviewed ({journal_name})" if journal_name else "Academic Citation",
                    "citation_count": citation_count,
                    "influential_citations": influential_count,
                    "pdf_url": pdf_url,
                }
                paper_data["bibtex"] = generate_bibtex(paper_data)
                results.append(paper_data)

    except Exception as exc:
        logger.warning("semantic_scholar_search_failed", query=clean_q, error=str(exc))

    return results


# ── PubMed / PMC NCBI E-Utilities Adapter ───────────────────────────

async def search_pubmed(query: str, max_results: int = 4) -> list[dict[str, Any]]:
    """
    Queries NCBI PubMed E-Utilities (esearch + esummary).
    Extracts biomedical papers, PMIDs, journal citations, and clinical evidence.
    """
    clean_q = clean_academic_query(query)
    encoded = urllib.parse.quote(clean_q)
    search_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={encoded}&retmode=json&retmax={max_results}&sort=relevance"

    results = []
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS, follow_redirects=True) as client:
            search_resp = await client.get(search_url)
            if search_resp.status_code != 200:
                return []

            search_data = search_resp.json()
            id_list = search_data.get("esearchresult", {}).get("idlist", [])
            if not id_list:
                return []

            # Fetch summary details for PMIDs
            pmids = ",".join(id_list)
            summary_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={pmids}&retmode=json"
            summary_resp = await client.get(summary_url)
            if summary_resp.status_code != 200:
                return []

            summary_data = summary_resp.json().get("result", {})

            for pmid in id_list:
                item = summary_data.get(pmid)
                if not item or not isinstance(item, dict):
                    continue

                title = item.get("title") or "Untitled PubMed Article"
                source_journal = item.get("source") or "Biomedical Literature"
                pubdate = item.get("pubdate", "2024")[:4]
                
                # Authors
                authors = [a.get("name") for a in item.get("authors", []) if a.get("name")]
                
                # DOI
                article_ids = item.get("articleids", [])
                doi = None
                pmc_id = None
                for aid in article_ids:
                    if aid.get("idtype") == "doi":
                        doi = aid.get("value")
                    elif aid.get("idtype") == "pmc":
                        pmc_id = aid.get("value")

                paper_url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                pdf_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmc_id}/pdf/" if pmc_id else None

                paper_data = {
                    "title": title.rstrip("."),
                    "url": paper_url,
                    "snippet": f"Biomedical study published in {source_journal} ({pubdate}). PubMed ID: {pmid}.",
                    "domain": "pubmed.ncbi.nlm.nih.gov",
                    "repository": "pubmed",
                    "pubmed_id": pmid,
                    "pmc_id": pmc_id,
                    "doi": doi,
                    "authors": authors[:5],
                    "year": pubdate,
                    "journal_name": source_journal,
                    "is_peer_reviewed": True,
                    "is_academic": True,
                    "tier": 1,
                    "authority_label": f"PubMed Clinical/Bio ({source_journal})",
                    "citation_count": None,
                    "pdf_url": pdf_url,
                }
                paper_data["bibtex"] = generate_bibtex(paper_data)
                results.append(paper_data)

    except Exception as exc:
        logger.warning("pubmed_search_failed", query=clean_q, error=str(exc))

    return results


# ── Crossref Works API Adapter ──────────────────────────────────────

async def search_crossref(query: str, max_results: int = 4) -> list[dict[str, Any]]:
    """
    Queries Crossref Works API for official DOIs, publishers, and peer-reviewed articles.
    """
    clean_q = clean_academic_query(query)
    encoded = urllib.parse.quote(clean_q)
    url = f"https://api.crossref.org/works?query={encoded}&rows={max_results}&select=DOI,title,author,published-print,published-online,container-title,is-referenced-by-count,URL"

    results = []
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []

            data = resp.json()
            items = data.get("message", {}).get("items", [])

            for it in items:
                title_list = it.get("title", [])
                title = title_list[0] if title_list else "Untitled Crossref Work"
                doi = it.get("DOI")
                doi_url = it.get("URL") or (f"https://doi.org/{doi}" if doi else "")
                
                # Journal
                containers = it.get("container-title", [])
                journal_name = containers[0] if containers else "Peer-Reviewed Publication"

                # Citation Count
                cited_by = it.get("is-referenced-by-count") or 0

                # Authors
                authors = []
                for a in it.get("author", []):
                    given = a.get("given", "")
                    family = a.get("family", "")
                    name = f"{given} {family}".strip()
                    if name:
                        authors.append(name)

                # Year
                year = "2024"
                date_parts = it.get("published-print", {}).get("date-parts") or it.get("published-online", {}).get("date-parts")
                if date_parts and len(date_parts[0]) > 0:
                    year = str(date_parts[0][0])

                paper_data = {
                    "title": title,
                    "url": doi_url,
                    "snippet": f"Peer-reviewed academic paper in '{journal_name}' ({year}). Citations: {cited_by}.",
                    "domain": "crossref.org",
                    "repository": "crossref",
                    "doi": doi,
                    "authors": authors[:5],
                    "year": year,
                    "journal_name": journal_name,
                    "is_peer_reviewed": True,
                    "is_academic": True,
                    "tier": 1,
                    "authority_label": f"Peer-Reviewed ({journal_name})",
                    "citation_count": cited_by,
                    "pdf_url": None,
                }
                paper_data["bibtex"] = generate_bibtex(paper_data)
                results.append(paper_data)

    except Exception as exc:
        logger.warning("crossref_search_failed", query=clean_q, error=str(exc))

    return results


# ── Concurrent Academic Aggregator ──────────────────────────────────

async def search_academic_aggregator(
    query: str,
    source_scope: str = "all",
    max_results: int = 6,
) -> list[dict[str, Any]]:
    """
    Dispatches concurrent academic queries across arXiv, Semantic Scholar, PubMed, and Crossref
    based on domain intent and user source scope.
    """
    domain = classify_academic_domain(query)
    logger.info("academic_aggregator_dispatch", query=query, domain=domain, source_scope=source_scope)

    tasks = []
    # 1. Semantic Scholar is general and highest quality for citations
    tasks.append(search_semantic_scholar(query, max_results=3))

    # 2. Domain-targeted dispatch
    if domain == "biomedical":
        tasks.append(search_pubmed(query, max_results=4))
        tasks.append(search_crossref(query, max_results=2))
        tasks.append(search_arxiv(query, max_results=2))
    elif domain in ("cs_ai", "physics_materials"):
        tasks.append(search_arxiv(query, max_results=4))
        tasks.append(search_crossref(query, max_results=2))
    else:
        tasks.append(search_arxiv(query, max_results=2))
        tasks.append(search_crossref(query, max_results=3))

    # Execute concurrently with bounded timeout
    gathered = await asyncio.gather(*tasks, return_exceptions=True)

    combined: list[dict[str, Any]] = []
    seen_titles: set[str] = set()

    for res in gathered:
        if isinstance(res, list):
            for paper in res:
                norm_title = re.sub(r"\W+", "", paper.get("title", "").lower())
                if norm_title and norm_title not in seen_titles:
                    seen_titles.add(norm_title)
                    combined.append(paper)

    # Sort prioritizing citation count & peer-reviewed status
    def _rank_academic(p: dict) -> float:
        score = 1.0
        if p.get("is_peer_reviewed"):
            score += 0.5
        if p.get("citation_count"):
            score += min(1.0, (p["citation_count"] / 100.0))
        if p.get("pdf_url"):
            score += 0.2
        return score

    combined.sort(key=_rank_academic, reverse=True)
    return combined[:max_results]
