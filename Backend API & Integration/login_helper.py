import os
import sys
import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BRAVE_PATH = r"C:\Users\ahmed\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe"
PROFILE_DIR = r"C:\Users\ahmed\.gemini\brave_hireq_profile"
AUTH_FILE = os.path.join(PROFILE_DIR, "auth_state.json")

def check_or_login(timeout_seconds: int = 1800):
    options = Options()
    if os.path.exists(BRAVE_PATH):
        options.binary_location = BRAVE_PATH
    
    os.makedirs(PROFILE_DIR, exist_ok=True)
    options.add_argument(f"--user-data-dir={PROFILE_DIR}")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--start-maximized")

    print("[LOGIN_HELPER] Launching Brave for LinkedIn authentication...", flush=True)
    driver = webdriver.Chrome(options=options)
    driver.get("https://www.linkedin.com/login")

    start_time = time.time()
    logged_in = False

    while time.time() - start_time < timeout_seconds:
        try:
            # Check if user closed the browser window
            if not driver.window_handles:
                print("[LOGIN_HELPER] Browser window was closed by user.", flush=True)
                break

            curr = driver.current_url.lower()
            cookies = driver.get_cookies()
            has_li_at = any(c.get("name") == "li_at" for c in cookies)

            if has_li_at or "feed" in curr or "mynetwork" in curr or "jobs" in curr:
                print("[LOGIN_HELPER] SUCCESS: Detected active LinkedIn login session!", flush=True)
                logged_in = True
                break
        except Exception:
            # If window is closed or disconnected
            break
        time.sleep(2)

    if logged_in:
        try:
            with open(AUTH_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "authenticated": True,
                    "timestamp": time.time(),
                    "email": "ahmed.essam.eldinn@gmail.com",
                    "note": "LinkedIn session verified via Brave dedicated profile"
                }, f, indent=2)
            print("[LOGIN_HELPER] AUTH_SAVED: auth_state.json written successfully.", flush=True)
        except Exception as e:
            print(f"[LOGIN_HELPER] Warning writing auth file: {e}", flush=True)

        print("[LOGIN_HELPER] Ready! Session saved.", flush=True)
        time.sleep(2)
        try:
            driver.quit()
        except Exception:
            pass
        return True
    else:
        print("[LOGIN_HELPER] Finished waiting for login.", flush=True)
        try:
            driver.quit()
        except Exception:
            pass
        return False

if __name__ == "__main__":
    check_or_login()
