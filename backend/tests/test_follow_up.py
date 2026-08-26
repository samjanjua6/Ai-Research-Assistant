import unittest
from app.agent.nodes import _generate_fallback_follow_ups


class TestFollowUpQuestions(unittest.TestCase):
    def test_fallback_generation(self):
        question = "What are the latest breakthroughs in neutral atom quantum computing?"
        follow_ups = _generate_fallback_follow_ups(question)

        self.assertGreaterEqual(len(follow_ups), 3)
        for item in follow_ups:
            self.assertIn("question", item)
            self.assertIn("category", item)
            self.assertIn("rationale", item)
            self.assertTrue(len(item["question"]) > 10)
            self.assertTrue(len(item["rationale"]) > 5)

        categories = {f["category"] for f in follow_ups}
        self.assertIn("Future Outlook", categories)
        self.assertIn("Comparative Analysis", categories)
        self.assertIn("Practical Implementation", categories)


if __name__ == "__main__":
    unittest.main()
