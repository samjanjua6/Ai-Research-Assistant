"""
Unit tests for Direct Academic Integrations (arXiv, Semantic Scholar, PubMed, Crossref).
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from app.agent.academic_engine import (
    classify_academic_domain,
    clean_academic_query,
    generate_bibtex,
    search_arxiv,
    search_semantic_scholar,
    search_pubmed,
    search_crossref,
    search_academic_aggregator,
)


def test_classify_academic_domain():
    assert classify_academic_domain("What are the latest CRISPR Cas9 off-target mutations in cancer therapy?") == "biomedical"
    assert classify_academic_domain("Transformer architecture latency optimization on Nvidia H100 GPUs with deep learning") == "cs_ai"
    assert classify_academic_domain("Perovskite solar cell degradation mechanisms in solid-state electrolytes") == "physics_materials"
    assert classify_academic_domain("Impact of Federal Reserve interest rate hikes on macroeconomic inflation and supply chain") == "economics"
    assert classify_academic_domain("History of the Roman Empire") == "general"
    print("[PASS] test_classify_academic_domain")


def test_clean_academic_query():
    assert clean_academic_query('/DEEP "Perovskite Solar Cells"') == "Perovskite Solar Cells"
    assert clean_academic_query('/ANGLE "PyTorch" vs "JAX"') == '"PyTorch" vs "JAX"'
    assert clean_academic_query("What is the status and roadmap of solid-state batteries?") == "solid-state batteries?"
    print("[PASS] test_clean_academic_query")


def test_generate_bibtex():
    paper = {
        "title": "High-Efficiency Perovskite Solar Cells via 2D/3D Heterojunctions",
        "authors": ["Alice Smith", "Bob Jones", "Carol White"],
        "year": "2024",
        "doi": "10.1038/s41586-024-0001",
        "journal_name": "Nature Energy",
        "url": "https://doi.org/10.1038/s41586-024-0001",
    }
    bib = generate_bibtex(paper)
    assert "@article{smith2024high" in bib
    assert 'title = "High-Efficiency Perovskite Solar Cells via 2D/3D Heterojunctions"' in bib
    assert 'author = "Alice Smith and Bob Jones and Carol White"' in bib
    assert 'journal = "Nature Energy"' in bib
    assert 'doi = "10.1038/s41586-024-0001"' in bib
    print("[PASS] test_generate_bibtex")


async def test_academic_aggregator_resilience():
    # Test concurrent dispatch with a real query
    results = await search_academic_aggregator(
        query="Perovskite solar cells heterojunction efficiency",
        source_scope="all",
        max_results=5,
    )
    assert isinstance(results, list)
    # Check that any returned paper conforms to schema
    for p in results:
        assert "title" in p
        assert "url" in p
        assert "is_academic" in p
        assert p["is_academic"] is True
        assert "bibtex" in p
    print(f"[PASS] test_academic_aggregator_resilience (retrieved {len(results)} papers)")


if __name__ == "__main__":
    test_classify_academic_domain()
    test_clean_academic_query()
    test_generate_bibtex()
    asyncio.run(test_academic_aggregator_resilience())
    print("\nALL DIRECT ACADEMIC INTEGRATION TESTS PASSED!")
