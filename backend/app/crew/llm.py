"""
LLM Configuration for CrewAI Agents.
Uses Groq high-speed inference matching the project's model settings.
"""

from __future__ import annotations

import os
from typing import Any
from app.core.config import get_settings

# Opt out of CrewAI telemetry & tracing prompts in production
os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"
os.environ["CREWAI_TRACING_ENABLED"] = "false"

# Ensure LiteLLM strips cache_breakpoint for Groq compatibility
try:
    import litellm
    litellm.drop_params = True
    from litellm.llms.groq.chat.transformation import GroqChatConfig

    _orig_transform_messages = GroqChatConfig._transform_messages

    def _safe_groq_transform_messages(self: Any, messages: list[Any], model: str, is_async: bool = False) -> Any:
        for m in messages:
            if isinstance(m, dict):
                m.pop("cache_breakpoint", None)
        return _orig_transform_messages(self, messages, model, is_async=is_async)

    GroqChatConfig._transform_messages = _safe_groq_transform_messages
except Exception:
    pass

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
