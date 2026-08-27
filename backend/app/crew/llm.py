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

    import asyncio
    import re
    _orig_completion = litellm.completion
    _orig_acompletion = litellm.acompletion

    FALLBACK_MODELS = [
        "groq/openai/gpt-oss-120b",
        "groq/openai/gpt-oss-20b",
        "groq/qwen/qwen3.8-27b",
        "groq/qwen/qwen3.6-27b",
    ]

    def _parse_retry_seconds(err_str: str) -> float:
        """Parses durations like 'try again in 5m9.744s' or 'try again in 12.3s'."""
        m = re.search(r"try again in (?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?", err_str, re.IGNORECASE)
        if m:
            mins = float(m.group(1) or 0)
            secs = float(m.group(2) or 0)
            total = mins * 60.0 + secs
            if total > 0:
                return total
        return 3.0

    def _rate_limit_safe_completion(*args: Any, **kwargs: Any) -> Any:
        current_kwargs = dict(kwargs)
        original_model = current_kwargs.get("model", "groq/openai/gpt-oss-120b")
        model_pool = [original_model] + [m for m in FALLBACK_MODELS if m != original_model]

        for attempt in range(12):
            model_to_use = model_pool[attempt % len(model_pool)]
            current_kwargs["model"] = model_to_use
            try:
                return _orig_completion(*args, **current_kwargs)
            except Exception as e:
                err_str = str(e).lower()
                if isinstance(e, litellm.RateLimitError) or "rate_limit" in err_str or "429" in err_str or "tpm" in err_str or "tpd" in err_str:
                    wait_sec = _parse_retry_seconds(str(e))
                    if wait_sec <= 2.5:
                        time.sleep(wait_sec + 0.5)
                    else:
                        time.sleep(0.5)
                else:
                    raise e
        return _orig_completion(*args, **kwargs)

    async def _rate_limit_safe_acompletion(*args: Any, **kwargs: Any) -> Any:
        current_kwargs = dict(kwargs)
        original_model = current_kwargs.get("model", "groq/openai/gpt-oss-120b")
        model_pool = [original_model] + [m for m in FALLBACK_MODELS if m != original_model]

        for attempt in range(12):
            model_to_use = model_pool[attempt % len(model_pool)]
            current_kwargs["model"] = model_to_use
            try:
                return await _orig_acompletion(*args, **current_kwargs)
            except Exception as e:
                err_str = str(e).lower()
                if isinstance(e, litellm.RateLimitError) or "rate_limit" in err_str or "429" in err_str or "tpm" in err_str or "tpd" in err_str:
                    wait_sec = _parse_retry_seconds(str(e))
                    if wait_sec <= 2.5:
                        await asyncio.sleep(wait_sec + 0.5)
                    else:
                        await asyncio.sleep(0.5)
                else:
                    raise e
        return await _orig_acompletion(*args, **kwargs)

    litellm.completion = _rate_limit_safe_completion
    litellm.acompletion = _rate_limit_safe_acompletion
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
        model_name = settings.groq_model
        if not model_name.startswith("groq/"):
            model_name = f"groq/{model_name}"

        return LLM(
            model=model_name,
            api_key=settings.groq_api_key,
            temperature=0.3,
            max_retries=6,
        )
    except Exception:
        from langchain_groq import ChatGroq
        return ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=0.3,
            max_retries=6,
        )
