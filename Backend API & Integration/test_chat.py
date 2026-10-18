from main import app
from fastapi.testclient import TestClient

client = TestClient(app)
print("Testing with a query that should hit the cache...")
# Should hit the cache
q1 = "في كام وظيفة لـ Data Analyst في القاهرة؟"
response1 = client.post("/api/ai/chat", json={"message": q1})
print("Q1 Status:", response1.status_code)
print("Q1 Response:", response1.json())

print("Testing with a slightly different query...")
q2 = "عدد وظايف Data Analyst في القاهرة كام؟"
response2 = client.post("/api/ai/chat", json={"message": q2})
print("Q2 Status:", response2.status_code)
print("Q2 Response:", response2.json())

# Should fall back to LLM, but we might not have LLM key here, so we just want to see if it doesn't crash before that.
print("Testing cache miss...")
q3 = "hello"
response3 = client.post("/api/ai/chat", json={"message": q3})
print("Q3 Status:", response3.status_code)
print("Q3 Response:", response3.json())
