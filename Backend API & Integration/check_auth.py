import os
import sys
import json
import sqlite3
import shutil
import tempfile

PROFILE_DIR = r"C:\Users\ahmed\.gemini\brave_hireq_profile"
AUTH_FILE = os.path.join(PROFILE_DIR, "auth_state.json")
COOKIES_PATH = os.path.join(PROFILE_DIR, "Default", "Network", "Cookies")

if not os.path.exists(COOKIES_PATH):
    COOKIES_PATH = os.path.join(PROFILE_DIR, "Default", "Cookies")

def check_linkedin_authenticated():
    # 1. Check auth_state.json flag
    if os.path.exists(AUTH_FILE):
        try:
            with open(AUTH_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("authenticated") is True:
                    print("AUTH_OK: True")
                    return True
        except Exception:
            pass

    # 2. Check SQLite Cookies if accessible
    if os.path.exists(COOKIES_PATH):
        temp_db = os.path.join(tempfile.gettempdir(), f"check_auth_{os.getpid()}.db")
        try:
            shutil.copyfile(COOKIES_PATH, temp_db)
            conn = sqlite3.connect(temp_db)
            cur = conn.cursor()
            cur.execute("SELECT count(*) FROM cookies WHERE host_key LIKE '%linkedin.com%' AND name = 'li_at'")
            count = cur.fetchone()[0]
            conn.close()
            os.remove(temp_db)
            if count > 0:
                print("AUTH_OK: True")
                return True
        except Exception:
            pass

    print("AUTH_OK: False")
    return False

if __name__ == "__main__":
    check_linkedin_authenticated()
