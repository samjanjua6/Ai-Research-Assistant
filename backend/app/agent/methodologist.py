"""
Methodologist & Command-Lens Architecture for AI Research Assistant.
Implements specialized analytical lenses, persona configuration,
and confidence verification rules.
"""

from dataclasses import dataclass
from typing import Optional
import re


@dataclass
class ParsedLens:
    lens: str                  # e.g. "ANGLE", "CHALLENGE", "HYP", "VOICES", "DEEP", "ARTEFACT", "TIMELINE", "MIX", "SCAN", "GENERAL"
    raw_query: str             # Original raw user input
    cleaned_query: str         # Query with lens commands stripped
    target_a: str              # First topic or primary subject
    target_b: Optional[str]    # Second topic (for /ANGLE comparative lens)
    format_type: Optional[str] # Format for /ARTEFACT (e.g. "mind-map", "checklist", "matrix", "report")
    complexity: int            # Complexity level 1-5 (default 3)


COMPLEXITY_DESCRIPTIONS = {
    1: "Level 1 (Simple Language): Short sentences, basic everyday vocabulary, intuitive analogies, minimal jargon.",
    2: "Level 2 (Conversational): Clear, approachable language as in a business conversation, explaining technical terms.",
    3: "Level 3 (Professional Standard): Balanced analytical tone, industry-standard terminology, structured arguments.",
    4: "Level 4 (Specialist Expert): Technical rigor, domain-specific terminology without oversimplification.",
    5: "Level 5 (Academic Rigor): Maximum information density, precise formal terminology, scientific nuances.",
}


def parse_command_lens(text: str) -> ParsedLens:
    """
    Parse command-lenses from user query (e.g. /ANGLE, /CHALLENGE, /HYP, /DEEP, /VOICES, /ARTEFACT, /SET_COMPLEXITY).
    If no slash command is present, infers intent automatically.
    """
    raw = text.strip()
    complexity = 3

    # Check for /SET_COMPLEXITY [1-5]
    comp_match = re.search(r"/SET_COMPLEXITY\s+([1-5])", raw, re.IGNORECASE)
    if comp_match:
        complexity = int(comp_match.group(1))
        raw = re.sub(r"/SET_COMPLEXITY\s+[1-5]", "", raw, flags=re.IGNORECASE).strip()

    # Match /ANGLE "topic 1" vs "topic 2" or /ANGLE topic 1 vs topic 2
    angle_match = re.search(
        r"/ANGLE\s+(?:[\"']([^\"']+)[\"']|([^\s\n]+(?:\s+[^\s\n]+)*?))\s+(?:vs\.?|against|versus)\s+(?:[\"']([^\"']+)[\"']|([^\s\n]+(?:\s+[^\s\n]+)*))",
        raw,
        re.IGNORECASE,
    )
    if angle_match:
        t_a = (angle_match.group(1) or angle_match.group(2) or "").strip()
        t_b = (angle_match.group(3) or angle_match.group(4) or "").strip()
        clean = f"{t_a} vs {t_b}"
        return ParsedLens(
            lens="ANGLE",
            raw_query=text,
            cleaned_query=clean,
            target_a=t_a,
            target_b=t_b,
            format_type="matrix",
            complexity=complexity,
        )

    # Match /ARTEFACT "format" on "topic" or /ARTEFACT format "topic" or /ARTEFACT "topic"
    if raw.upper().startswith("/ARTEFACT"):
        fmt = "report"
        topic = ""
        m1 = re.search(r"/ARTEFACT\s+[\"']?([a-zA-Z0-9_-]+)[\"']?\s+(?:on|for|of\s+)?(?:[\"']([^\"']+)[\"']|(.+))", raw, re.IGNORECASE)
        if m1 and (m1.group(2) or m1.group(3)):
            fmt = (m1.group(1) or "report").lower()
            topic = (m1.group(2) or m1.group(3) or "").strip()
        else:
            m2 = re.search(r"/ARTEFACT\s+(?:[\"']([^\"']+)[\"']|(.+))", raw, re.IGNORECASE)
            if m2:
                topic = (m2.group(1) or m2.group(2) or "").strip()

        return ParsedLens(
            lens="ARTEFACT",
            raw_query=text,
            cleaned_query=topic or raw,
            target_a=topic or raw,
            target_b=None,
            format_type=fmt,
            complexity=complexity,
        )

    # Match standard single-target lenses (/DEEP, /CHALLENGE, /HYP, /VOICES, /TIMELINE, /MIX, /SCAN, /OVERVIEW, /INTRODUCE)
    lens_patterns = [
        ("DEEP", r"/DEEP\s+(?:[\"']([^\"']+)[\"']|(.+))"),
        ("CHALLENGE", r"/CHALLENGE\s+(?:[\"']([^\"']+)[\"']|(.+))"),
        ("HYP", r"/HYP\s+(?:[\"']([^\"']+)[\"']|(.+))"),
        ("VOICES", r"/VOICES\s+(?:[\"']([^\"']+)[\"']|(.+))"),
        ("TIMELINE", r"/TIMELINE\s+(?:[\"']([^\"']+)[\"']|(.+))"),
        ("MIX", r"/MIX\s+(?:[\"']([^\"']+)[\"']|(.+))"),
        ("SCAN", r"/SCAN\s+(?:[\"']([^\"']+)[\"']|(.+))"),
        ("OVERVIEW", r"/OVERVIEW\s*(.*)"),
        ("INTRODUCE", r"/INTRODUCE\s*(.*)"),
    ]

    for lens_name, pattern in lens_patterns:
        match = re.search(pattern, raw, re.IGNORECASE)
        if match and raw.upper().startswith(f"/{lens_name}"):
            topic = (match.group(1) or (match.group(2) if match.lastindex and match.lastindex >= 2 else "") or "").strip()
            return ParsedLens(
                lens=lens_name,
                raw_query=text,
                cleaned_query=topic or raw,
                target_a=topic or raw,
                target_b=None,
                format_type=None,
                complexity=complexity,
            )

    # Auto-infer intent if no explicit slash command was typed
    lower_raw = raw.lower()
    if any(k in lower_raw for k in ["compare", " vs ", " versus ", "tradeoffs between", "differences between"]):
        parts = re.split(r"\b(?:vs\.?|versus|compared to|against)\b", raw, flags=re.IGNORECASE)
        t_a = parts[0].replace("compare", "").replace("Compare", "").strip(" :\"'")
        t_b = parts[1].strip(" :\"'") if len(parts) > 1 else ""
        return ParsedLens(
            lens="ANGLE",
            raw_query=text,
            cleaned_query=raw,
            target_a=t_a,
            target_b=t_b or None,
            format_type="matrix",
            complexity=complexity,
        )

    if any(k in lower_raw for k in ["controversy", "criticism", "debunk", "flaws in", "limitations of", "risks of", "tension points", "white spots"]):
        return ParsedLens(
            lens="CHALLENGE",
            raw_query=text,
            cleaned_query=raw,
            target_a=raw,
            target_b=None,
            format_type=None,
            complexity=complexity,
        )

    if any(k in lower_raw for k in ["hypotheses", "hypothesis", "theoretical prediction", "speculation on", "future scenario"]):
        return ParsedLens(
            lens="HYP",
            raw_query=text,
            cleaned_query=raw,
            target_a=raw,
            target_b=None,
            format_type=None,
            complexity=complexity,
        )

    if any(k in lower_raw for k in ["mind map", "mindmap", "diagram", "checklist", "flowchart"]):
        fmt = "mind-map" if "mind" in lower_raw or "diagram" in lower_raw else "checklist"
        return ParsedLens(
            lens="ARTEFACT",
            raw_query=text,
            cleaned_query=raw,
            target_a=raw,
            target_b=None,
            format_type=fmt,
            complexity=complexity,
        )

    if any(k in lower_raw for k in ["stakeholders", "perspectives on", "schools of thought", "who supports"]):
        return ParsedLens(
            lens="VOICES",
            raw_query=text,
            cleaned_query=raw,
            target_a=raw,
            target_b=None,
            format_type=None,
            complexity=complexity,
        )

    if any(k in lower_raw for k in ["history of", "evolution of", "chronology of", "timeline of"]):
        return ParsedLens(
            lens="TIMELINE",
            raw_query=text,
            cleaned_query=raw,
            target_a=raw,
            target_b=None,
            format_type=None,
            complexity=complexity,
        )

    # General Deep Research by default
    return ParsedLens(
        lens="DEEP",
        raw_query=text,
        cleaned_query=raw,
        target_a=raw,
        target_b=None,
        format_type=None,
        complexity=complexity,
    )


def get_methodologist_planner_prompt(parsed: ParsedLens, max_steps: int = 5) -> str:
    """
    Generate specialized sub-question decomposition prompt tuned to the specific analytical lens.
    """
    lens = parsed.lens
    target = parsed.target_a or parsed.cleaned_query

    lens_instructions = {
        "ANGLE": (
            f"The user is requesting a comparative /ANGLE analysis between '{parsed.target_a}' and '{parsed.target_b or 'competing alternatives'}'. "
            "Generate 3 to {max_steps} sub-questions covering: "
            "1) Architectural mechanisms and core specifications of {parsed.target_a}. "
            "2) Architectural mechanisms and core specifications of {parsed.target_b}. "
            "3) Direct head-to-head empirical benchmark metrics, efficiency, and cost comparisons. "
            "4) Distinct trade-offs, adoption barriers, and optimal use cases for each."
        ),
        "CHALLENGE": (
            f"The user is requesting a /CHALLENGE tension-point and white-spot analysis on '{target}'. "
            "Generate 3 to {max_steps} sub-questions targeting: "
            "1) Primary consensus claims and mainstream advantages. "
            "2) Counter-arguments, disputed experiments, failure modes, and critical rebuttals. "
            "3) Unsolved bottlenecks, theoretical boundary limits, and unaddressed literature 'white spots'."
        ),
        "HYP": (
            f"The user is requesting a /HYP hypothesis-generation analysis on '{target}'. "
            "Generate 3 to {max_steps} sub-questions targeting: "
            "1) Current frontier breakthroughs and surprising anomalies in literature. "
            "2) Unresolved paradoxes or cross-disciplinary intersections. "
            "3) Empirical validation methods and experimental protocols used to test theories in this domain."
        ),
        "VOICES": (
            f"The user is requesting a /VOICES stakeholder and perspective mapping on '{target}'. "
            "Generate 3 to {max_steps} sub-questions targeting: "
            "1) Academic and scientific consensus positions. "
            "2) Commercial industry implementations and economic interests. "
            "3) Regulatory, ethical, and societal viewpoints or friction points."
        ),
        "TIMELINE": (
            f"The user is requesting a /TIMELINE chronological evolution on '{target}'. "
            "Generate 3 to {max_steps} sub-questions targeting foundational breakthroughs, recent major inflection points, current state-of-the-art, and projected milestones."
        ),
        "ARTEFACT": (
            f"The user is requesting a structured /ARTEFACT ({parsed.format_type or 'synthesis'}) on '{target}'. "
            "Generate 3 to {max_steps} sub-questions targeting core taxonomy, structural relationships, technical specifications, and actionable implementation steps."
        ),
        "MIX": (
            f"The user is requesting a /MIX cross-disciplinary synergy analysis on '{target}'. "
            "Generate 3 to {max_steps} sub-questions exploring unexpected intersections between '{target}' and adjacent technological, biological, or economic paradigms."
        ),
        "SCAN": (
            f"The user is requesting a targeted /SCAN inquiry on '{target}'. "
            "Generate 3 focused sub-questions to extract exact, high-precision technical answers and supporting metrics."
        ),
        "DEEP": (
            f"The user is requesting a deep-dive /DEEP exploration on '{target}'. "
            "Generate 3 to {max_steps} distinct sub-questions exploring theoretical mechanisms, current real-world state, critical limitations, and future outlook."
        ),
    }

    instruction = lens_instructions.get(lens, lens_instructions["DEEP"]).format(
        max_steps=max_steps,
        parsed=parsed,
        target=target,
    )

    return (
        "You are an expert research planner and methodologist. "
        "Your task is to decompose the user's research inquiry into "
        f"3 to {max_steps} distinct, highly focused search queries designed to retrieve high-density evidence. "
        f"{instruction}\n\n"
        "Return a JSON array of plain strings only. Example: [\"sub-q 1\", \"sub-q 2\", \"sub-q 3\"]. "
        "Return ONLY the JSON array, no explanation, no markdown fences."
    )


def get_methodologist_draft_prompt(parsed: ParsedLens) -> str:
    """
    Build the main Methodologist system prompt for report synthesis.
    """
    complexity_desc = COMPLEXITY_DESCRIPTIONS.get(parsed.complexity, COMPLEXITY_DESCRIPTIONS[3])
    lens = parsed.lens

    lens_synthesis_rules = ""
    if lens == "ANGLE":
        lens_synthesis_rules = (
            "ANALYTICAL LENS (/ANGLE - Comparative Analysis):\n"
            "- Compare the subjects systematically across key dimensions.\n"
            "- Provide a comprehensive Markdown Comparison Table detailing architectural differences, performance metrics, and cost/scalability.\n"
            "- Clearly delineate the strategic trade-offs and verdict on when to choose one over the other."
        )
    elif lens == "CHALLENGE":
        lens_synthesis_rules = (
            "ANALYTICAL LENS (/CHALLENGE - Tension Points & White Spots):\n"
            "- Actively highlight tension points, conflicting empirical data, and disputed claims.\n"
            "- Explicitly dedicate a section to 'Literature White Spots' — critical unaddressed questions or overlooked failure modes.\n"
            "- Do NOT smooth over contradictions; emphasize analytical complexity."
        )
    elif lens == "HYP":
        lens_synthesis_rules = (
            "ANALYTICAL LENS (/HYP - Hypothesis Formulation):\n"
            "- Synthesize findings and formulate 2 to 3 non-obvious, high-leverage hypotheses based on the data.\n"
            "- For each hypothesis, detail: 1) Underlying Rationale, 2) Potential Disruption, and 3) Empirical Verification Protocol."
        )
    elif lens == "VOICES":
        lens_synthesis_rules = (
            "ANALYTICAL LENS (/VOICES - Stakeholder & Position Mapping):\n"
            "- Group perspectives by distinct stakeholder camps (e.g. Academic Theorists, Industry Practitioners, Regulatory Bodies, Ethicists).\n"
            "- Contrast their core arguments, incentives, and points of contention."
        )
    elif lens == "ARTEFACT":
        if parsed.format_type == "mind-map":
            lens_synthesis_rules = (
                "ANALYTICAL LENS (/ARTEFACT - Mind-Map):\n"
                "- In addition to the text synthesis, include a valid Mermaid diagram (```mermaid mindmap or graph TD) representing the hierarchical taxonomy and concept relationships.\n"
                "- Keep node labels clean and valid."
            )
        elif parsed.format_type == "checklist":
            lens_synthesis_rules = (
                "ANALYTICAL LENS (/ARTEFACT - Actionable Checklist):\n"
                "- Structure key implementation steps, risk mitigations, and evaluation criteria using markdown checklists (- [ ] Item)."
            )
        else:
            lens_synthesis_rules = (
                "ANALYTICAL LENS (/ARTEFACT - Structured Blueprint):\n"
                "- Produce an actionable, highly structured blueprint with clear matrices and implementation phases."
            )
    elif lens == "TIMELINE":
        lens_synthesis_rules = (
            "ANALYTICAL LENS (/TIMELINE - Chronological Evolution):\n"
            "- Map the historical milestones, major breakthrough inflection points, current state-of-the-art, and projected 2026-2030 trajectory in a structured timeline format."
        )

    return (
        "You are an AI partner and methodologist for the deep analysis and synthesis of ideas. "
        "Your task is to be a proactive, rigorous research partner offering high-density analytical insights.\n\n"
        "=== CORE OPERATING PRINCIPLES ===\n"
        "1. Style & Tone: Professional-informal, expert, precise, and without fluff, pleasantries, sycophancy, or flattery ('Partner, not a servant').\n"
        f"2. Complexity: {complexity_desc}\n"
        "3. Structure: Begin your analysis with a concise 'Q: [Summary of inquiry]' line, followed by the structured analytical report.\n"
        "4. Evidence Grounding: Use ONLY the provided search results. Pre-ranked snippets ([1], [2]) carry highest confidence. Cite sources inline as [1], [2].\n"
        "5. Intellectual Honesty & Confidence Markers: Do NOT gloss over ambiguities. If data is preliminary, conflicting, or thin, tag the claim explicitly with '[Verification Needed]' or '[Incomplete Data]'.\n"
        "6. Tables & Structure: Use clear section headings (##) and clean markdown tables for structured comparisons.\n\n"
        f"{lens_synthesis_rules}\n\n"
        "Write the draft report:"
    )
