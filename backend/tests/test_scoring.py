import unittest
from app.agent.scoring import (
    score_search_result,
    rank_and_filter_results,
    extract_clean_domain,
    evaluate_domain_authority,
    calculate_lexical_relevance,
    calculate_information_density,
)


class TestScoringEngine(unittest.TestCase):
    def test_domain_extraction(self):
        self.assertEqual(extract_clean_domain("https://www.arxiv.org/abs/2602.1234"), "arxiv.org")
        self.assertEqual(extract_clean_domain("http://sub.stanford.edu/page?x=1"), "sub.stanford.edu")
        self.assertEqual(extract_clean_domain("https://reuters.com/world/news"), "reuters.com")

    def test_domain_authority_hierarchy(self):
        # Tier 1 Academic
        score_arxiv, label_arxiv, _ = evaluate_domain_authority("https://arxiv.org/abs/2401.0001")
        self.assertGreaterEqual(score_arxiv, 0.90)
        self.assertIn("Academic", label_arxiv)

        # Edu TLD
        score_edu, _, _ = evaluate_domain_authority("https://cs.mit.edu/research")
        self.assertGreaterEqual(score_edu, 0.90)

        # Tier 2 Press / Docs
        score_reuters, _, _ = evaluate_domain_authority("https://reuters.com/tech")
        self.assertGreaterEqual(score_reuters, 0.85)

        # Spam / Social
        score_spam, label_spam, _ = evaluate_domain_authority("https://pinterest.com/pin/123")
        self.assertLess(score_spam, 0.30)
        self.assertIn("Low", label_spam)

    def test_lexical_relevance(self):
        snippet = "Neutral atom quantum computing achieves 99.9% 2-qubit gate fidelity with 1000 physical qubits in 2026."
        query = "neutral atom qubit gate fidelity"
        root_q = "What are the latest breakthroughs in neutral atom quantum computing?"

        score, signals = calculate_lexical_relevance(snippet, query, root_q)
        self.assertGreaterEqual(score, 0.70)
        self.assertGreater(len(signals), 0)

    def test_information_density_and_noise_filtering(self):
        # Good quantitative snippet
        good_snippet = "In 2026, solid-state battery cells demonstrated an energy density of 520 Wh/kg across 1,000 cycles with 90% capacity retention."
        score_good, signals_good = calculate_information_density(good_snippet)
        self.assertGreaterEqual(score_good, 0.80)
        self.assertIn("Quantitative Evidence & Data", signals_good)

        # Boilerplate cookie snippet
        noisy_snippet = "Please accept all cookies to continue browsing. Terms and conditions apply."
        score_noise, signals_noise = calculate_information_density(noisy_snippet)
        self.assertLess(score_noise, 0.40)

    def test_rank_and_filter_results(self):
        root_q = "What are the latest advancements in quantum computing?"

        candidates = [
            {
                "step": "quantum error correction breakthroughs",
                "query": "quantum error correction",
                "snippet": "Accept all cookies and sign in to read.",
                "url": "https://random-spam-farm.com/article",
            },
            {
                "step": "quantum error correction breakthroughs",
                "query": "quantum error correction",
                "snippet": "Researchers at Harvard demonstrated quantum error correction on fault-tolerant logical qubits with 99.8% fidelity in 2026 using neutral atom arrays.",
                "url": "https://arxiv.org/abs/2602.9999",
            },
            {
                "step": "quantum error correction breakthroughs",
                "query": "quantum error correction",
                "snippet": "IBM announced a 1,121-qubit Condor processor and new modular quantum architecture.",
                "url": "https://reuters.com/technology/quantum-ibm",
            },
        ]

        ranked = rank_and_filter_results(candidates, root_question=root_q, min_score=0.25)
        self.assertGreaterEqual(len(ranked), 2)
        # Highest ranked should be arxiv.org
        self.assertEqual(ranked[0]["domain"], "arxiv.org")
        self.assertEqual(ranked[0]["tier"], "high")
        self.assertGreaterEqual(ranked[0]["score_percent"], 80)

        # Spam should either be filtered or ranked below high authority sources
        if len(ranked) == 3:
            self.assertEqual(ranked[-1]["domain"], "random-spam-farm.com")
            self.assertLess(ranked[-1]["score_percent"], ranked[0]["score_percent"])


if __name__ == "__main__":
    unittest.main()
