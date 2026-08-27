"""
LLM Configuration for CrewAI Agents.
Uses Groq high-speed inference matching the project's model settings.
"""

from __future__ import annotations

import os
import time
from typing import Any
from app.core.config import get_settings

# Opt out of CrewAI telemetry & tracing prompts in production
os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"
os.environ["CREWAI_TRACING_ENABLED"] = "false"

# Ensure LiteLLM strips cache_breakpoint for Groq compatibility and retries safely on TPM limits
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

    _orig_completion = litellm.completion
    def _rate_limit_safe_completion(*args: Any, **kwargs: Any) -> Any:
        for attempt in range(8):
            try:
                return _orig_completion(*args, **kwargs)
            except litellm.RateLimitError:
                time.sleep(3.0)
            except Exception as e:
                err_str = str(e).lower()
                if "rate_limit" in err_str or "429" in err_str or "tpm" in err_str:
                    time.sleep(3.0)
                else:
                    raise e
        return _orig_completion(*args, **kwargs)

    litellm.completion = _rate_limit_safe_completion
except Exception:
    pass

settings = get_settings()


def get_crew_llm():
    """
    Returns an LLM instance configured for CrewAI agents.
    Uses Groq API key with optimal multi-agent token throughput.
    """
    try:
        from crewai import LLM
        # Use high-throughput Groq model for multi-agent workflows to prevent TPM exhaustion
        model_name = settings.groq_model
        if "gpt-oss-120b" in model_name:
            model_name = "groq/openai/gpt-oss-20b"
        elif not model_name.startswith("groq/"):
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
