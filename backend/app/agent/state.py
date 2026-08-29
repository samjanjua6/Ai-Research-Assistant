from typing import TypedDict, Annotated
import operator


class SearchResult(TypedDict, total=False):
    step: str                  # which sub-question this result answers
    query: str                 # exact search query used
    snippet: str               # text snippet or abstract
    url: str                   # source URL or DOI link
    title: str                 # paper or page title
    score: float               # normalized relevance score (0.0 - 1.0)
    score_percent: int         # integer relevance score (0 - 100)
    tier: str | int            # "high" | "good" | "fair" | "low" | 1 | 2 | 3
    domain: str                # e.g. "arxiv.org", "pubmed.ncbi.nlm.nih.gov"
    authority_label: str       # e.g. "Academic / Gov Authority", "Peer-Reviewed"
    signals: list[str]         # list of evaluation tags
    is_academic: bool          # whether source is an academic paper/preprint
    repository: str            # "arxiv" | "semantic_scholar" | "pubmed" | "crossref"
    doi: str | None            # official DOI
    arxiv_id: str | None       # arXiv ID
    pubmed_id: str | None      # PubMed PMID
    pmc_id: str | None         # PubMed Central PMCID
    authors: list[str]         # list of authors
    year: str | None           # publication year
    journal_name: str | None   # peer-reviewed journal or conference
    is_peer_reviewed: bool     # peer-reviewed status
    citation_count: int | None # total citations
    influential_citations: int | None # influential citations
    pdf_url: str | None        # direct open-access PDF
    bibtex: str | None         # LaTeX BibTeX entry


class GraphState(TypedDict):
    """Shared state object passed between every LangGraph node."""

    # ── Input ─────────────────────────────────────────────────────
    run_id: str                                     # UUID of the DB row
    question: str                                   # original user question
    source_scope: str                               # "all" | "academic" | "preprints"
    documents: list[dict]                           # list of uploaded document passports & text
    grounded_urls: list[dict]                       # list of grounded URL passports & text

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
    follow_up_questions: list[dict]
