import json
import os
import datetime

CONFIG_FILE = "D:\\Hire Q Project\\Backend API & Integration\\ai_config.json"
LIVE_LOGS_FILE = "D:\\Hire Q Project\\Backend API & Integration\\live_logs.json"

DEFAULT_CONFIG = {
    "providers": {
        "gemini": {"enabled": True, "model": "gemini-1.5-flash"},
        "groq": {"enabled": True, "model": "llama-3.1-8b-instant"},
        "zhipuai": {"enabled": True, "model": "glm-4-flash"},
        "mistral ai": {"enabled": True, "model": "mistral-small-latest"},
        "sambanova": {"enabled": True, "model": "Meta-Llama-3.1-70B-Instruct"},
        "nvidia": {"enabled": True, "model": "meta/llama-3.1-8b-instruct"},
        "openrouter": {"enabled": True, "model": "qwen/qwen-2.5-72b-instruct:free"},
        "cleanapis": {"enabled": True, "model": "deepseek-v4-flash-0731"}
    },
    "global": {
        "speed_mode": "medium",
        "threads": 25,
        "extraction_strategy": "semantic",
        "semantic_threshold": 0.25
    }
}

class ConfigManager:
    @staticmethod
    def load_config():
        if not os.path.exists(CONFIG_FILE):
            ConfigManager.save_config(DEFAULT_CONFIG)
            return DEFAULT_CONFIG
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return DEFAULT_CONFIG
            
    @staticmethod
    def save_config(config):
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
            
    @staticmethod
    def log_event(category, message, provider=None, model=None, tokens=0, duration=0, status="INFO"):
        try:
            logs = []
            if os.path.exists(LIVE_LOGS_FILE):
                try:
                    with open(LIVE_LOGS_FILE, 'r') as f:
                        logs = json.load(f)
                except Exception:
                    pass
            # Insert at top, keep last 200 logs
            logs.insert(0, {
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "category": category,
                "status": status,
                "message": message,
                "provider": provider,
                "model": model,
                "tokens": tokens,
                "duration": round(duration, 2)
            })
            logs = logs[:200]
            with open(LIVE_LOGS_FILE, 'w') as f:
                json.dump(logs, f, indent=2)
        except Exception:
            pass
