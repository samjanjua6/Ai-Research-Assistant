import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from app.core.config import get_settings

s = get_settings()
resp = httpx.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {s.groq_api_key}"})
data = resp.json().get("data", [])
print("\n=== ACTIVE GROQ MODELS ===")
for m in data:
    if m.get("active", True):
        print(f"ID: {m.get('id')} | Owned by: {m.get('owned_by')} | Context: {m.get('context_window')}")
print("==========================\n")
