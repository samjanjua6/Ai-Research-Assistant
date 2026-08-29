"""
Automated Test Suite for Research Library & Collections Hub.
"""
import sys
import os
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.dossier_service import (
    _sanitize_bibtex_key,
    generate_bibtex_export,
    generate_csv_export,
)
from app.db.models import ResearchRun, RunStatus


class MockRun:
    def __init__(self, run_id, question, sources):
        self.id = run_id
        self.question = question
        self.sources = sources
        self.engine = "langgraph"
        self.status = RunStatus.done
        self.summary = "Test summary"
        self.final_report = "Test final report"
        self.created_at = datetime.now(timezone.utc)


def test_bibtex_export_generator():
    runs = [
        MockRun(
            uuid.uuid4(),
            '/ANGLE "Solid-State" vs "Sodium-Ion"',
            [
                {
                    "title": "High-Voltage Solid Electrolyte Interfaces",
                    "url": "https://arxiv.org/abs/2401.12345",
                    "domain": "arxiv.org",
                    "author": "Dr. E. Goodenough",
                    "year": "2026",
                },
                {
                    "title": "Sodium-Ion Grid Storage Economics",
                    "url": "https://reuters.com/tech/sodium-battery-2026",
                    "domain": "reuters.com",
                    "author": "Reuters Energy Desk",
                    "year": "2026",
                },
            ],
        ),
    ]

    bibtex_output = generate_bibtex_export(runs)
    assert "@article{" in bibtex_output
    assert "@misc{" in bibtex_output
    assert "https://arxiv.org/abs/2401.12345" in bibtex_output
    assert "reuters.com" in bibtex_output


def test_csv_export_generator():
    runs = [
        MockRun(
            uuid.uuid4(),
            'Quantum Error Correction in Neutral Atoms',
            [
                {
                    "title": "Fault-Tolerant Neutral Atom Architectures",
                    "url": "https://nature.com/articles/s41586-quantum-2026",
                    "domain": "nature.com",
                    "tier": "Tier 1",
                    "score": "0.96",
                }
            ],
        )
    ]

    csv_output = generate_csv_export(runs)
    assert "Source Title,URL,Domain,Authority Tier,Reliability Score" in csv_output
    assert "https://nature.com/articles/s41586-quantum-2026" in csv_output
    assert "nature.com" in csv_output


def test_sanitize_bibtex_key():
    key = _sanitize_bibtex_key("Deep Residual Learning for Image Recognition", "2015")
    assert key == "deep_residual_2015"


if __name__ == "__main__":
    test_bibtex_export_generator()
    print("[PASS] test_bibtex_export_generator")
    test_csv_export_generator()
    print("[PASS] test_csv_export_generator")
    test_sanitize_bibtex_key()
    print("[PASS] test_sanitize_bibtex_key")
    print("\nALL LIBRARY UNIT TESTS PASSED!")
