"""
CrewAI Specialized Agent Definitions.
Defines the 4 collaborative agents:
1. Lead Methodologist
2. Web Intelligence Scout
3. Principal Research Synthesizer
4. Fact-Checking & Peer Review Auditor
"""

from __future__ import annotations

from typing import Any
from crewai import Agent


def create_methodologist_agent(llm: Any, tools: list[Any] | None = None) -> Agent:
    """Creates the Lead Research Methodologist Agent."""
    return Agent(
        role="Lead Research Methodologist & Strategist",
        goal=(
            "Deconstruct the user's research inquiry and command lenses (/DEEP, /ANGLE, /CHALLENGE, "
            "/HYP, /VOICES, /ARTEFACT, /TIMELINE) into a rigorous, multi-vector investigative roadmap."
        ),
        backstory=(
            "You are a renowned scientific research director with decades of experience in interdisciplinary "
            "problem deconstruction. You excel at detecting implicit technical assumptions, identifying "
            "non-obvious investigative angles, and outlining precise literature search queries."
        ),
        tools=tools or [],
        llm=llm,
        max_iter=3,
        verbose=True,
        allow_delegation=False,
    )


def create_scout_agent(llm: Any, tools: list[Any]) -> Agent:
    """Creates the Senior Intelligence Scout Agent."""
    return Agent(
        role="Senior Web Intelligence Scout & Information Retrieval Specialist",
        goal=(
            "Execute targeted live web searches across independent authoritative sources, extract "
            "grounded document and URL evidence, and evaluate source credibility across 5 quality pillars."
        ),
        backstory=(
            "You are an elite open-source intelligence scout and academic literature specialist. "
            "You relentlessly filter out SEO content farms, verify primary source authenticity, "
            "and collect rich, multi-perspective empirical data."
        ),
        tools=tools,
        llm=llm,
        max_iter=3,
        verbose=True,
        allow_delegation=False,
    )


def create_synthesizer_agent(llm: Any, tools: list[Any] | None = None) -> Agent:
    """Creates the Principal Research Synthesizer Agent."""
    return Agent(
        role="Principal Research Synthesizer & Technical Author",
        goal=(
            "Synthesize multi-source empirical evidence into a comprehensive, structured research report "
            "with markdown comparative tables, bold section headings, explicit citations ([1], [2], "
            "[Doc: filename], [URL: Title]), and clear executive conclusions."
        ),
        backstory=(
            "You are an acclaimed technical author and quantitative analyst. You produce authoritative, "
            "fluff-free scientific syntheses that integrate disparate findings into structured, readable reports."
        ),
        tools=tools or [],
        llm=llm,
        max_iter=3,
        verbose=True,
        allow_delegation=False,
    )


def create_auditor_agent(llm: Any, tools: list[Any] | None = None) -> Agent:
    """Creates the Fact-Checking & Peer Review Auditor Agent."""
    return Agent(
        role="Senior Scientific Fact-Checker & Peer Review Auditor",
        goal=(
            "Audit the drafted research report against gathered evidence, verify citation accuracy, "
            "tag empirical statements with confidence ratings ([Confidence: High/Medium/Low]), "
            "and generate logical follow-up research directions."
        ),
        backstory=(
            "You are a rigorous peer review referee committed to empirical integrity. You eliminate "
            "unsubstantiated claims, ensure claims match their citations, and provide constructive critique."
        ),
        tools=tools or [],
        llm=llm,
        max_iter=3,
        verbose=True,
        allow_delegation=False,
    )
