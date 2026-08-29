"""
Unit test suite for Interactive 'Chat with Report', Section Expander, and Citation Verifier.
"""
import sys
import os
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.report_chat_service import (
    _format_grounding_context,
    get_citation_verification_details,
)
from app.db.models import ResearchRun, RunStatus


class MockRun:
    def __init__(self, run_id, question, summary, final_report, sources, docs=None):
        self.id = run_id
        self.question = question
        self.summary = summary
        self.final_report = final_report
        self.sources = sources
        self.documents_metadata = docs or []
        self.engine = "langgraph"
        self.status = RunStatus.done
        self.created_at = datetime.now(timezone.utc)


def test_format_grounding_context():
    run = MockRun(
        uuid.uuid4(),
        "What are the thermodynamic limits of Solid-State Electrolytes?",
        "Solid state electrolytes offer high energy density but face interfacial resistance.",
        "## Interface Stability\nLithium dendrite growth remains a key bottleneck [1].",
        [
            {
                "title": "Interfacial Kinetics in Garnet-Type Solid Electrolytes",
                "url": "https://nature.com/articles/garnet-2026",
                "domain": "nature.com",
                "tier": "Tier 1",
                "snippet": "We observe lithium dendrite suppression under 5 MPa stack pressure.",
            }
        ],
        docs=[{"filename": "battery_specs_2026.pdf", "page_count": 14, "word_count": 4500}],
    )

    context = _format_grounding_context(run)
    assert "PRIMARY RESEARCH INQUIRY:" in context
    assert "Interface Stability" in context
    assert "Interfacial Kinetics in Garnet-Type Solid Electrolytes" in context
    assert "battery_specs_2026.pdf" in context
    assert "[1]" in context


def test_get_citation_verification_details():
    run = MockRun(
        uuid.uuid4(),
        "Test Question",
        "Summary",
        "Report",
        [
            {
                "title": "Quantum Error Thresholds",
                "url": "https://arxiv.org/abs/2401.9999",
                "domain": "arxiv.org",
                "tier": "Tier 1",
                "snippet": "Threshold calculated at 0.75% error rate.",
                "score": "0.95",
                "authority_label": "Peer-Reviewed Pre-Print",
            }
        ],
    )

    details = get_citation_verification_details(run, 1)
    assert details["index"] == 1
    assert details["title"] == "Quantum Error Thresholds"
    assert details["domain"] == "arxiv.org"
    assert details["tier"] == "Tier 1"
    assert "0.75%" in details["snippet"]

    # Test out of range error
    try:
        get_citation_verification_details(run, 99)
        assert False, "Should have raised ValueError for invalid index"
    except ValueError:
        pass


if __name__ == "__main__":
    test_format_grounding_context()
    print("[PASS] test_format_grounding_context")
    test_get_citation_verification_details()
    print("[PASS] test_get_citation_verification_details")
    print("\nALL REPORT CHAT UNIT TESTS PASSED!")
