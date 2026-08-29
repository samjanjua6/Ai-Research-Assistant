"""
Unit tests for User Settings, Masking, and BYOK Connectivity.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.user_settings_service import _mask_key


def test_api_key_masking():
    # 1. Groq key
    raw_groq = "gsk_abcd1234efgh5678ijkl"
    masked_groq = _mask_key(raw_groq)
    assert masked_groq == "gsk_••••••••ijkl"

    # 2. OpenAI key
    raw_openai = "sk-proj-1234567890abcdef"
    masked_openai = _mask_key(raw_openai)
    assert masked_openai == "sk-p••••••••cdef"

    # 3. Anthropic key
    raw_anthropic = "sk-ant-api03-1234567890xyz"
    masked_anthropic = _mask_key(raw_anthropic)
    assert masked_anthropic == "sk-a••••••••0xyz"

    # 4. Empty / short keys
    assert _mask_key(None) is None
    assert _mask_key("") is None
    assert _mask_key("short") is None


if __name__ == "__main__":
    test_api_key_masking()
    print("[PASS] test_api_key_masking")
    print("\nALL USER SETTINGS UNIT TESTS PASSED!")
