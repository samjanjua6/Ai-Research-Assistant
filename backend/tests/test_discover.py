"""
Unit test suite for Public Discover Showcase and Community Taxonomy.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.discover_service import auto_categorize_inquiry


def test_auto_categorize_inquiry():
    # 1. AI & Autonomy
    ai_q = "/CHALLENGE \"Sparse Autoencoders solve LLM hallucination and deceptive alignment\""
    assert auto_categorize_inquiry(ai_q) == "ai"

    # 2. Biotech & Medicine
    bio_q = "What are the latest CRISPR-Cas9 base editing clinical trial outcomes in sickle cell disease?"
    assert auto_categorize_inquiry(bio_q) == "biotech"

    # 3. Clean Energy & Batteries
    energy_q = "Solid-state battery degradation mechanisms at 85°C with garnet-type electrolytes"
    assert auto_categorize_inquiry(energy_q) == "energy"

    # 4. Quantum Tech
    quantum_q = "Post-quantum lattice cryptography performance benchmarks on neutral atom qubits"
    assert auto_categorize_inquiry(quantum_q) == "quantum"

    # 5. Macroeconomics & Markets
    econ_q = "Semiconductor supply chain geopolitics and tariff impacts on GPU capital expenditure"
    assert auto_categorize_inquiry(econ_q) == "economics"


if __name__ == "__main__":
    test_auto_categorize_inquiry()
    print("[PASS] test_auto_categorize_inquiry")
    print("\nALL DISCOVER SHOWCASE UNIT TESTS PASSED!")
