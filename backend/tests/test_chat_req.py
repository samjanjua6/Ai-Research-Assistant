import httpx

# Test various payloads to find what triggers 422
run_id = "a52937ab-9101-4a18-a2b8-df2164dacbe1"
url = f"http://127.0.0.1:8002/research/{run_id}/chat"

cases = [
    ("Empty dict", {}),
    ("Only message", {"message": "hello"}),
    ("Message + empty list", {"message": "hello", "chat_history": []}),
    ("Message + None chat_history", {"message": "hello", "chat_history": None}),
    ("Message + history with extra fields", {"message": "hello", "chat_history": [{"role": "user", "content": "hi", "sources_referenced": []}]}),
]

for label, payload in cases:
    resp = httpx.post(url, json=payload)
    print(f"[{label}] -> Status: {resp.status_code} | Body: {resp.text}")
