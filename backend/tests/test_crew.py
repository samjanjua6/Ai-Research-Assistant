"""
Unit tests for the CrewAI multi-agent module.
Verifies agent definitions, tool adapters, task pipelines, and callback events.
"""

import unittest
from unittest.mock import MagicMock

from app.crew.tools import build_crew_tools
from app.crew.agents import (
    create_methodologist_agent,
    create_scout_agent,
    create_synthesizer_agent,
    create_auditor_agent,
)
from app.crew.tasks import (
    create_planning_task,
    create_evidence_gathering_task,
    create_synthesis_task,
    create_review_and_audit_task,
)
from app.crew.callbacks import CrewSSECallbackHandler


class TestCrewAIIntegration(unittest.TestCase):
    def setUp(self):
        self.mock_llm = "groq/llama-3.3-70b-versatile"

    def test_build_crew_tools(self):
        """Test tool creation with documents and URLs."""
        docs = [{"filename": "paper.pdf", "text": "Solid state batteries", "page_count": 1}]
        urls = [{"url": "https://arxiv.org/abs/2312.00000", "title": "ArXiv Paper", "domain": "arxiv.org", "full_text": "Battery research"}]
        collected_sources = []

        tools = build_crew_tools(
            documents=docs,
            grounded_urls=urls,
            collected_sources=collected_sources,
        )
        self.assertEqual(len(tools), 3)
        tool_names = [getattr(t, "name", str(t)) for t in tools]
        self.assertIn("Search Live Web", tool_names)
        self.assertIn("Search Attached Documents", tool_names)
        self.assertIn("Read Grounded Web URLs", tool_names)

    def test_create_agents(self):
        """Test creating the 4 specialized role-playing agents."""
        methodologist = create_methodologist_agent(self.mock_llm)
        self.assertIn("Methodologist", methodologist.role)
        self.assertFalse(methodologist.allow_delegation)

        scout = create_scout_agent(self.mock_llm, [])
        self.assertIn("Scout", scout.role)

        synthesizer = create_synthesizer_agent(self.mock_llm)
        self.assertIn("Synthesizer", synthesizer.role)

        auditor = create_auditor_agent(self.mock_llm)
        self.assertIn("Auditor", auditor.role)

    def test_create_tasks(self):
        """Test task pipeline assembly with sequential dependencies."""
        methodologist = create_methodologist_agent(self.mock_llm)
        scout = create_scout_agent(self.mock_llm, [])
        synthesizer = create_synthesizer_agent(self.mock_llm)
        auditor = create_auditor_agent(self.mock_llm)

        inquiry = "What are the latest breakthroughs in solid-state batteries?"
        t1 = create_planning_task(methodologist, inquiry)
        self.assertEqual(t1.agent, methodologist)
        self.assertIn(inquiry, t1.description)

        t2 = create_evidence_gathering_task(scout, inquiry, t1)
        self.assertEqual(t2.agent, scout)
        self.assertIn(t1, t2.context)

        t3 = create_synthesis_task(synthesizer, inquiry, t2)
        self.assertEqual(t3.agent, synthesizer)
        self.assertIn(t2, t3.context)

        t4 = create_review_and_audit_task(auditor, inquiry, t3)
        self.assertEqual(t4.agent, auditor)
        self.assertIn(t3, t4.context)

    def test_callback_handler(self):
        """Test that callback handler safely handles step events."""
        handler = CrewSSECallbackHandler("test-run-123")
        mock_step = MagicMock()
        mock_step.agent = "Senior Web Intelligence Scout"
        mock_step.thought = "Executing search query for solid state electrolytes..."

        # Should execute without throwing any exception
        handler.on_step(mock_step)


if __name__ == "__main__":
    unittest.main()
