"""
LLM Configuration for CrewAI Agents.
Uses Groq high-speed inference matching the project's model settings.
"""

from __future__ import annotations

from app.core.config import get_settings

settings = get_settings()


def get_crew_llm():
    """
    Returns an LLM instance configured for CrewAI agents.
    Uses Groq API key and model configured in settings.
    """
    try:
        from crewai import LLM
        # Use Groq model via LiteLLM provider
        model_name = settings.groq_model
        if not model_name.startswith("groq/"):
            model_name = f"groq/{model_name}"
        return LLM(
            model=model_name,
            api_key=settings.groq_api_key,
            temperature=0.3,
            max_retries=4,
        )
    except Exception:
        # Fallback to langchain_groq ChatGroq
        from langchain_groq import ChatGroq
        return ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=0.3,
            max_retries=4,
        )
