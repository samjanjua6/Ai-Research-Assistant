import httpx
import json

resp = httpx.get("http://127.0.0.1:8002/openapi.json")
data = resp.json()
chat_path = data["paths"].get("/research/{run_id}/chat", {})
print("Chat Path Keys:", list(chat_path.keys()))
post_def = chat_path.get("post", {})
print("POST parameters:", post_def.get("parameters"))
print("POST requestBody:", post_def.get("requestBody"))
if "components" in data and "schemas" in data["components"]:
    if "ChatMessageRequest" in data["components"]["schemas"]:
        print("ChatMessageRequest schema:", json.dumps(data["components"]["schemas"]["ChatMessageRequest"], indent=2))
