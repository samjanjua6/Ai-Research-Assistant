"""
CrewAI Task Definitions.
Defines the 4 sequential tasks executed by the Crew:
1. Methodological Problem Deconstruction & Planning
2. Web & Grounded Evidence Gathering
3. Structured Report Synthesis
4. Peer Review, Confidence Tagging & Finalization
"""

from __future__ import annotations

from typing import Any
from crewai import Task


def create_planning_task(
    agent: Any,
    inquiry: str,
    doc_summary: str = "",
    url_summary: str = "",
    callback: Any = None,
) -> Task:
    """Task 1: Formulate research strategy and sub-questions."""
    doc_section = f"\nAttached Documents Context:\n{doc_summary}\n" if doc_summary else ""
    url_section = f"\nAttached Grounded URLs Context:\n{url_summary}\n" if url_summary else ""

    description = (
        f"Analyze the following research inquiry:\n"
        f"\"{inquiry}\"\n"
        f"{doc_section}"
        f"{url_section}\n"
        "Your task:\n"
        "1. Identify the core analytical objectives and command lens (e.g. /DEEP, /ANGLE comparison, /CHALLENGE).\n"
        "2. Deconstruct the inquiry into 3 to 5 targeted sub-questions spanning foundational mechanisms, "
        "empirical benchmarks, trade-offs, and frontier developments.\n"
        "3. Provide search queries and investigative pathways for the Web Intelligence Scout."
    )
    return Task(
        description=description,
        expected_output="A structured research plan with 3-5 focused search queries and key investigation angles.",
        agent=agent,
        callback=callback,
    )


def create_evidence_gathering_task(
    agent: Any,
    inquiry: str,
    planning_task_ref: Task,
    callback: Any = None,
) -> Task:
    """Task 2: Search web, extract document/URL excerpts, rank evidence."""
    description = (
        f"Using the research plan created in the previous task for inquiry: \"{inquiry}\", "
        "execute search queries using the 'Search Live Web' tool, extract document passages with "
        "'Search Attached Documents', and retrieve URL text with 'Read Grounded Web URLs'.\n\n"
        "Collect rich factual evidence, quantitative metrics, author quotes, and source citations."
    )
    return Task(
        description=description,
        expected_output="A curated evidence dossier containing ranked snippets, citations [1], [2], document excerpts, and technical metrics.",
        agent=agent,
        context=[planning_task_ref],
        callback=callback,
    )


def create_synthesis_task(
    agent: Any,
    inquiry: str,
    evidence_task_ref: Task,
    callback: Any = None,
) -> Task:
    """Task 3: Draft comprehensive structured research report."""
    description = (
        f"Synthesize the gathered evidence for inquiry: \"{inquiry}\" into a master research report.\n"
        "Formatting Guidelines:\n"
        "- Clear Markdown hierarchy (# Title, ## Section Headings, ### Subheadings).\n"
        "- An Executive Summary (TL;DR) at the top.\n"
        "- Structured Markdown comparative tables comparing metrics, trade-offs, or architectures.\n"
        "- Inline source citations: cite web evidence as [1], [2], document evidence as [Doc: filename, p. X], "
        "and URL evidence as [URL: Title].\n"
        "- Actionable strategic takeaways and future trajectory."
    )
    return Task(
        description=description,
        expected_output="A comprehensive, multi-section Markdown research report with tables, headings, and strict inline citations.",
        agent=agent,
        context=[evidence_task_ref],
        callback=callback,
    )


def create_review_and_audit_task(
    agent: Any,
    inquiry: str,
    synthesis_task_ref: Task,
    callback: Any = None,
) -> Task:
    """Task 4: Fact-check draft, tag confidence levels, and generate follow-up questions."""
    description = (
        f"Conduct a rigorous peer review of the drafted report for inquiry: \"{inquiry}\".\n"
        "Your objectives:\n"
        "1. Verify that every factual claim is strictly supported by citations.\n"
        "2. Tag major claims with confidence ratings based on source agreement:\n"
        "   - [Confidence: High] for multi-source consensus or authoritative verified data.\n"
        "   - [Confidence: Medium] for single-source or emerging industry data.\n"
        "   - [Confidence: Low] for unverified, speculative, or conflicting claims.\n"
        "3. Ensure the Executive Summary is concise and punchy.\n"
        "4. Append a '## Recommended Next Investigation Steps' section with 3 actionable follow-up questions."
    )
    return Task(
        description=description,
        expected_output="The finalized, audited research report in clean Markdown with confidence tags and follow-up investigation questions.",
        agent=agent,
        context=[synthesis_task_ref],
        callback=callback,
    )
