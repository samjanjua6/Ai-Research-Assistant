import os
import httpx
from dotenv import dotenv_values
import litellm

env_dict = dotenv_values("backend/.env")
if not env_dict.get("GROQ_API_KEY"):
    env_dict = dotenv_values(".env")

key = env_dict.get("GROQ_API_KEY")
os.environ["GROQ_API_KEY"] = key

print(f"Key found: {bool(key)} (prefix: {key[:8] if key else 'None'})")

tools = [
    {
        "type": "function",
        "function": {
            "name": "search_live_web",
            "description": "Search the live web for verified scientific evidence",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        }
    }
]

messages = [
    {"role": "system", "content": "You are a research scout. When given a question, always call search_live_web tool."},
    {"role": "user", "content": "What are the latest developments in solid state batteries?"}
]

for model in ["groq/openai/gpt-oss-120b", "groq/openai/gpt-oss-20b", "groq/qwen/qwen3.8-27b", "groq/qwen/qwen3.6-27b"]:
    try:
        print(f"\n--- Testing model: {model} with tool_choice='auto' ---")
        resp = litellm.completion(
            model=model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            api_key=key
        )
        print(f"[SUCCESS {model}] Response tool calls: {resp.choices[0].message.tool_calls}")
    except Exception as e:
        print(f"[FAILED {model}] Error: {e}")

