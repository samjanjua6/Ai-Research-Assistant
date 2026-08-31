import os
import httpx
from dotenv import dotenv_values

env_dict = dotenv_values(".env")
if not env_dict.get("GROQ_API_KEY"):
    env_dict = dotenv_values("../backend_new/.env")

key = env_dict.get("GROQ_API_KEY")
print(f"Key found: {bool(key)} (prefix: {key[:8] if key else 'None'})")

if key:
    resp = httpx.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {key}"})
    data = resp.json().get("data", [])
    print("\n=== ACTIVE GROQ MODELS ===")
    for m in data:
        if m.get("active", True):
            print(f"ID: {m.get('id')} | Owned by: {m.get('owned_by')} | Context: {m.get('context_window')}")
    print("==========================\n")
