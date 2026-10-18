import json
import datetime
import os

LOG_FILE = "data/training_data.jsonl"

def log_ai_interaction(user_query, ai_response, intent, context=""):
    """
    Logs an AI interaction to a JSONL file for future fine-tuning.
    """
    try:
        if not os.path.exists("data"):
            os.makedirs("data")
            
        log_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "user_query": user_query,
            "ai_response": ai_response,
            "intent": intent,
            "context_summary": context[:200] if context else ""
        }
        
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
            
    except Exception as e:
        print(f"Logging Error: {e}")
