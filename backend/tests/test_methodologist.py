import unittest
from app.agent.methodologist import (
    parse_command_lens,
    get_methodologist_planner_prompt,
    get_methodologist_draft_prompt,
)


class TestMethodologist(unittest.TestCase):
    def test_angle_lens_parsing(self):
        query = '/ANGLE "Solid-State Batteries" vs "Sodium-Ion"'
        parsed = parse_command_lens(query)
        self.assertEqual(parsed.lens, "ANGLE")
        self.assertEqual(parsed.target_a, "Solid-State Batteries")
        self.assertEqual(parsed.target_b, "Sodium-Ion")

        prompt = get_methodologist_planner_prompt(parsed)
        self.assertIn("Solid-State Batteries", prompt)
        self.assertIn("Sodium-Ion", prompt)
        self.assertIn("comparative", prompt.lower())

    def test_challenge_lens_parsing(self):
        query = '/CHALLENGE "Room-temperature ambient superconductivity"'
        parsed = parse_command_lens(query)
        self.assertEqual(parsed.lens, "CHALLENGE")
        self.assertEqual(parsed.target_a, "Room-temperature ambient superconductivity")

        prompt = get_methodologist_planner_prompt(parsed)
        self.assertIn("tension-point", prompt)
        self.assertIn("white spots", prompt.lower())

    def test_hyp_lens_parsing(self):
        query = '/HYP "Quantum computing fault tolerance by 2028"'
        parsed = parse_command_lens(query)
        self.assertEqual(parsed.lens, "HYP")
        self.assertEqual(parsed.target_a, "Quantum computing fault tolerance by 2028")

        prompt = get_methodologist_draft_prompt(parsed)
        self.assertIn("Empirical Verification", prompt)
        self.assertIn("hypotheses", prompt.lower())

    def test_artefact_mindmap_parsing(self):
        query = '/ARTEFACT mind-map "Generative AI in Oncology"'
        parsed = parse_command_lens(query)
        self.assertEqual(parsed.lens, "ARTEFACT")
        self.assertEqual(parsed.format_type, "mind-map")
        self.assertEqual(parsed.target_a, "Generative AI in Oncology")

        prompt = get_methodologist_draft_prompt(parsed)
        self.assertIn("Mermaid", prompt)

    def test_complexity_level_parsing(self):
        query = '/DEEP "CRISPR-Cas9 off-target mitigations" /SET_COMPLEXITY 5'
        parsed = parse_command_lens(query)
        self.assertEqual(parsed.lens, "DEEP")
        self.assertEqual(parsed.complexity, 5)

        prompt = get_methodologist_draft_prompt(parsed)
        self.assertIn("Academic Rigor", prompt)

    def test_natural_language_intent_inference(self):
        query = "What are the trade-offs and differences between PostgreSQL vs MongoDB?"
        parsed = parse_command_lens(query)
        self.assertEqual(parsed.lens, "ANGLE")

        query_crit = "What are the biggest criticisms and unsolved controversies in string theory?"
        parsed_crit = parse_command_lens(query_crit)
        self.assertEqual(parsed_crit.lens, "CHALLENGE")


if __name__ == "__main__":
    unittest.main()
