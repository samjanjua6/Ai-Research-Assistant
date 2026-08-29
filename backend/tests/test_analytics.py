"""
Automated Test Suite for Personal Usage & Research Analytics Engine.
"""
import sys
import os
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.analytics_service import (
    _extract_command_lens,
    _extract_domain,
    _classify_domain_tier,
    _extract_keyphrases,
)


def test_command_lens_extraction():
    assert _extract_command_lens('/ANGLE "Solid-State" vs "Sodium-Ion"') == "ANGLE"
    assert _extract_command_lens('/CHALLENGE Room-temperature superconductivity') == "CHALLENGE"
    assert _extract_command_lens('/HYP Quantum error correction') == "HYP"
    assert _extract_command_lens('/DEEP What are the latest breakthroughs in AI?') == "DEEP"
    assert _extract_command_lens('/ARTEFACT mind-map "Cancer Immunotherapy"') == "ARTEFACT"
    assert _extract_command_lens('/TIMELINE Fusion energy') == "TIMELINE"
    assert _extract_command_lens('/VOICES AGI alignment') == "VOICES"
    assert _extract_command_lens('General scientific inquiry without command') == "GENERAL"


def test_domain_tier_classification():
    assert _classify_domain_tier("arxiv.org") == "tier1"
    assert _classify_domain_tier("nature.com") == "tier1"
    assert _classify_domain_tier("stanford.edu") == "tier1"
    assert _classify_domain_tier("nih.gov") == "tier1"
    assert _classify_domain_tier("reuters.com") == "tier2"
    assert _classify_domain_tier("wired.com") == "tier2"
    assert _classify_domain_tier("randomtechblog.io") == "tier3"


def test_keyphrase_extraction():
    questions = [
        '/ANGLE "Solid-State Batteries" vs "Sodium-Ion Batteries"',
        '/DEEP Solid-State Batteries electrolyte stability in automotive applications',
        '/HYP Quantum error correction thresholds in neutral atom systems',
    ]
    phrases = _extract_keyphrases(questions, top_n=5)
    topics = [p["topic"].lower() for p in phrases]
    assert any("solid" in t or "batteries" in t for t in topics)
    assert len(phrases) > 0


if __name__ == "__main__":
    test_command_lens_extraction()
    print("[PASS] test_command_lens_extraction")
    test_domain_tier_classification()
    print("[PASS] test_domain_tier_classification")
    test_keyphrase_extraction()
    print("[PASS] test_keyphrase_extraction")
    print("\nALL ANALYTICS UNIT TESTS PASSED!")
