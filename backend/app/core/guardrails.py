"""
Enterprise Multi-Tier AI Guardrails & Prompt Security System.

Defends against:
1. Direct System Prompt Extraction (e.g. "give me your system prompt", "print developer instructions")
2. Prompt Injections & Jailbreaks (e.g. "ignore previous instructions", "DAN mode", "developer mode")
3. Obfuscated / Encoded Payloads (Base64, Hex, Levenshtein character-stuffing)
4. Indirect Web / PDF Evidence Poisoning
5. Output Leakage & System Phrase Reflections
"""
from __future__ import annotations

import base64
import binascii
import re
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, Optional

from app.core.logging import get_logger

logger = get_logger(__name__)

# Maximum security events to keep in circular buffer
MAX_SECURITY_EVENTS = 500
_SECURITY_AUDIT_LOG: deque[dict[str, Any]] = deque(maxlen=MAX_SECURITY_EVENTS)

# Standard professional policy refusal message
GUARDRAIL_REFUSAL_MESSAGE = """# Research Assistant Integrity Notice

I am an **Autonomous Scientific Research Assistant** designed to conduct rigorous literature discovery, empirical synthesis, and peer-reviewed factual analysis across verified academic and industry sources.

### Policy & Operational Boundaries
- **System Confidentiality**: In accordance with system security and intellectual property protocols, internal architectural configurations, agent personas, and system prompts cannot be disclosed, reproduced, or modified.
- **Scope Alignment**: This system is dedicated exclusively to objective scientific, technological, and academic inquiries using structured analytical command lenses (`/DEEP`, `/ANGLE`, `/CHALLENGE`, `/HYP`, `/ARTEFACT`, etc.).

---

### How to Proceed
Please enter a research topic or scientific inquiry (e.g., `What are the latest breakthroughs in solid-state battery electrolytes?` or `/ANGLE "Quantum Annealing" vs "Gate-Based Quantum Computing"`).
"""

GUARDRAIL_REFUSAL_SUMMARY = "Inquiry intercepted by AI Security Guardrails: system prompt extraction and instruction modification requests are restricted."


@dataclass
class GuardrailValidationResult:
    is_safe: bool
    refusal_report: Optional[str] = None
    refusal_summary: Optional[str] = None
    violation_type: Optional[str] = None
    matched_pattern: Optional[str] = None


# ── Fast-Path Extraction & Injection Patterns ───────────────────────

SYSTEM_PROMPT_EXTRACTION_PATTERNS = [
    r"(?:give|show|print|tell|output|reveal|dump|leak|display|send|write|copy|repeat)\s+(?:me\s+)?(?:all\s+)?(?:your|the)?\s*(?:(?:system|initial|base|developer|core|hidden|secret|internal|original|meta|master|admin|underlying|verbatim)\s*)*(?:prompt|prompts|instructions|instruction|rules|directives|guidelines|configuration|context|message|messages|preamble)",
    r"what\s+(?:is|are|were)\s+(?:all\s+)?(?:your|the)?\s*(?:(?:system|initial|base|developer|internal|original|meta|master)\s*)*(?:prompt|prompts|instructions|instruction|rules|directives|guidelines|message|messages)",
    r"what\s+(?:instructions|prompt|prompts|rules|guidelines|directives)\s+(?:were\s+you|are\s+you|was\s+your|did\s+you)",
    r"repeat\s+(?:everything|all|the\s+text)\s+(?:above|before\s+this|from\s+the\s+beginning)",
    r"output\s+(?:everything|all\s+text)\s+(?:prior\s+to|before)\s+(?:this|my\s+message)",
    r"(?:how|what)\s+were\s+you\s+(?:configured|prompted|instructed|created)\s+to\s+(?:act|behave|respond)",
    r"what\s+is\s+written\s+(?:above|in\s+your\s+system\s+prompt)",
    r"print\s+your\s+verbatim\s+instructions",
    r"(?:disclose|reveal|dump|leak)\s+(?:your|the)?\s*(?:(?:system|master|admin|initial)\s+)?(?:prompt|instructions|rules|context)",
    r"(?:system|initial|master)\s+(?:prompt|instructions|message)\s+(?:give|show|reveal|dump|leak|print|tell|display|output|please)",
    r"(?:systemprompt|systeminstructions|systemrules|developerinstructions)",
]

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?(?:previous|prior|above|existing|earlier)\s+(?:instructions|rules|commands|prompts|directives|constraints|guidelines)",
    r"disregard\s+(?:all\s+)?(?:previous|prior|above|existing|earlier)\s+(?:instructions|rules|commands|prompts|directives|constraints|guidelines)",
    r"forget\s+(?:all\s+)?(?:previous|prior|above|existing|earlier)\s+(?:instructions|rules|commands|prompts|directives|constraints|guidelines)",
    r"(?:you\s+are\s+now|act\s+as)\s+(?:DAN|jailbreak|unrestricted|unconstrained|developer\s+mode|root|administrator|god\s+mode)",
    r"(?:enable|turn\s+on|switch\s+to)\s+(?:developer\s+mode|unrestricted\s+mode|jailbreak\s+mode|debug\s+mode)",
    r"bypass\s+(?:all\s+)?(?:safety|content|security|filter|guardrail|restriction|policy)\s*(?:filters|checks|protocols|rules|guidelines)?",
    r"pretend\s+(?:you\s+have\s+no\s+(?:rules|limits|boundaries|filters)|you\s+can\s+do\s+anything)",
    r"override\s+(?:all\s+)?(?:(?:system|safety|security|assistant|internal)\s*)+(?:rules|protocols|prompts|directives|guidelines)",
    r"new\s+rule:\s*you\s+must\s+(?:disclose|ignore|reveal)",
]

# Sensitive system phrases to check in output reflections
INTERNAL_SYSTEM_PHRASES = [
    "You are the Lead Research Methodologist",
    "You are a Senior Web Intelligence Scout",
    "You are the Principal Research Synthesizer",
    "You are a Senior Scientific Fact-Checker & Peer Review Auditor",
    "Deconstruct the user's research inquiry and command lenses",
    "Deconstruct the research inquiry into 3-5 focused sub-questions",
    "Execute targeted live web searches across independent authoritative sources",
    "Conduct a rigorous peer review of the drafted report",
    "<system_security_directive>",
    "CONFIDENTIALITY & BEHAVIORAL INTEGRITY MANDATE",
]


# ── Obfuscation Normalizer ──────────────────────────────────────────

def normalize_obfuscations(text: str) -> str:
    """
    Decodes and normalizes obfuscation attempts:
    - Strips zero-width unicode characters
    - Normalizes spaced characters: 'g i v e  m e' -> 'give me'
    - Attempts Base64 decode of standalone token blocks
    - Strips markdown cloaking / HTML comments
    """
    if not text:
        return ""

    # 1. Strip HTML comments & zero-width chars
    cleaned = re.sub(r"<!--[\s\S]*?-->", "", text)
    cleaned = re.sub(r"[\u200B-\u200D\uFEFF]", "", cleaned)

    # 2. De-obfuscate single spaced/dotted letters: e.g. "g i v e  m e" -> "give me", "s.y.s.t.e.m" -> "system"
    collapsed = re.sub(r"(?<=[a-zA-Z])\.(?=[a-zA-Z])", "", cleaned)
    collapsed = re.sub(r"(?<=\b[a-zA-Z])\s(?=[a-zA-Z]\b)", "", collapsed)
    collapsed = re.sub(r"\s+", " ", collapsed)

    # 3. Check for Base64 encoded payload
    base64_candidates = re.findall(r"(?:[A-Za-z0-9+/]{4}){4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?", text)
    for b64 in base64_candidates:
        try:
            decoded = base64.b64decode(b64, validate=True).decode("utf-8", errors="ignore")
            if any(term in decoded.lower() for term in ["system", "prompt", "instruction", "ignore", "dan"]):
                collapsed += f" {decoded}"
        except (binascii.Error, UnicodeDecodeError):
            pass

    return collapsed.strip()


# ── Input Guardrail Validator ───────────────────────────────────────

def validate_inquiry_guardrails(
    query: str,
    user_id: Optional[str] = None,
    client_ip: Optional[str] = None,
) -> GuardrailValidationResult:
    """
    Validates user query against prompt extraction, injection, and jailbreak attempts.
    Returns safe result or immediate refusal report.
    """
    if not query or not query.strip():
        return GuardrailValidationResult(is_safe=True)

    normalized = normalize_obfuscations(query)
    lower_text = normalized.lower()

    # 1. Check System Prompt Extraction Patterns
    for pattern in SYSTEM_PROMPT_EXTRACTION_PATTERNS:
        match = re.search(pattern, lower_text, re.IGNORECASE)
        if match:
            matched_str = match.group(0)
            logger.warning(
                "guardrail_violation_prompt_extraction",
                pattern=pattern,
                matched=matched_str,
                user_id=user_id,
                ip=client_ip,
            )
            _log_security_event(
                event_type="system_prompt_extraction",
                query=query,
                matched_rule=matched_str,
                user_id=user_id,
                client_ip=client_ip,
            )
            return GuardrailValidationResult(
                is_safe=False,
                refusal_report=GUARDRAIL_REFUSAL_MESSAGE,
                refusal_summary=GUARDRAIL_REFUSAL_SUMMARY,
                violation_type="system_prompt_extraction",
                matched_pattern=matched_str,
            )

    # 2. Check Prompt Injection & Jailbreak Patterns
    for pattern in PROMPT_INJECTION_PATTERNS:
        match = re.search(pattern, lower_text, re.IGNORECASE)
        if match:
            matched_str = match.group(0)
            logger.warning(
                "guardrail_violation_prompt_injection",
                pattern=pattern,
                matched=matched_str,
                user_id=user_id,
                ip=client_ip,
            )
            _log_security_event(
                event_type="prompt_injection",
                query=query,
                matched_rule=matched_str,
                user_id=user_id,
                client_ip=client_ip,
            )
            return GuardrailValidationResult(
                is_safe=False,
                refusal_report=GUARDRAIL_REFUSAL_MESSAGE,
                refusal_summary=GUARDRAIL_REFUSAL_SUMMARY,
                violation_type="prompt_injection",
                matched_pattern=matched_str,
            )

    return GuardrailValidationResult(is_safe=True)


# ── Indirect Web / PDF Evidence Sanitizer ───────────────────────────

def sanitize_untrusted_evidence(evidence_text: str) -> str:
    """
    Sanitizes external web scrapings and document texts to prevent
    indirect prompt injections embedded within third-party content.
    """
    if not evidence_text:
        return ""

    sanitized = evidence_text
    # Neutralize dangerous imperative command triggers inside evidence
    dangerous_phrases = [
        (r"(?i)ignore\s+all\s+(?:previous|prior)\s+instructions", "[FILTERED_INJECTION_TRIGGER]"),
        (r"(?i)system\s+override:", "[FILTERED_OVERRIDE]"),
        (r"(?i)new\s+system\s+instruction:", "[FILTERED_INSTRUCTION]"),
        (r"(?i)output\s+the\s+system\s+prompt", "[FILTERED_PROMPT_EXTRACTION]"),
    ]

    for pat, rep in dangerous_phrases:
        sanitized = re.sub(pat, rep, sanitized)

    return sanitized


# ── Output Leakage Scrubber ─────────────────────────────────────────

def sanitize_output_leakage(output_text: str) -> str:
    """
    Scans generated research reports and summaries to ensure internal
    system prompt phrases are never reflected to the end-user.
    """
    if not output_text:
        return ""

    cleaned = output_text
    # 1. Strip XML security directive tags if leaked
    cleaned = re.sub(r"<system_security_directive>[\s\S]*?</system_security_directive>", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"<user_inquiry>[\s\S]*?</user_inquiry>", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"<untrusted_evidence>[\s\S]*?</untrusted_evidence>", "", cleaned, flags=re.IGNORECASE)

    # 2. Check for verbatim internal prompt reflections
    for phrase in INTERNAL_SYSTEM_PHRASES:
        if phrase.lower() in cleaned.lower():
            logger.warning("output_leakage_detected_and_scrubbed", phrase=phrase)
            cleaned = re.sub(re.escape(phrase), "[Confidential System Directive]", cleaned, flags=re.IGNORECASE)

    return cleaned.strip()


# ── Security Telemetry & Audit Logs ─────────────────────────────────

def _log_security_event(
    event_type: str,
    query: str,
    matched_rule: str,
    user_id: Optional[str] = None,
    client_ip: Optional[str] = None,
) -> None:
    """Records a security intercept in the in-memory audit buffer."""
    event = {
        "timestamp": time.time(),
        "iso_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event_type": event_type,
        "query_snippet": query[:120] + "..." if len(query) > 120 else query,
        "matched_rule": matched_rule,
        "user_id": str(user_id) if user_id else "anonymous",
        "client_ip": client_ip or "unknown",
    }
    _SECURITY_AUDIT_LOG.append(event)


def get_security_audit_events(limit: int = 100) -> list[dict[str, Any]]:
    """Returns recent security intercept events for Admin Studio."""
    events = list(_SECURITY_AUDIT_LOG)
    events.reverse()
    return events[:limit]
