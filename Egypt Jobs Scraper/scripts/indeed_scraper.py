#!/usr/bin/env python3
"""
Indeed Scraper — Python UC Driver
Uses undetected-chromedriver to bypass Cloudflare.
Communicates with TypeScript orchestrator via stdin/stdout JSON protocol.

Protocol:
  Input (stdin):  {"cmd": "discover", "keyword": "Software Engineer", "location": "Egypt"}
  Input (stdin):  {"cmd": "detail", "url": "https://eg.indeed.com/viewjob?jk=abc123"}
  Input (stdin):  {"cmd": "quit"}
  Output (stdout): {"ok": true, "data": [...]}  or  {"ok": false, "error": "..."}
"""

import json
import sys
import shutil
import threading
import time
import random
import re
import os
import signal
import traceback
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from bs4 import BeautifulSoup

# Timeout handler
def timeout_handler(signum, frame):
    raise TimeoutError("UC Launch Timed Out")

signal.signal(signal.SIGALRM, timeout_handler)

# Suppress logs from UC/Selenium to keep stdout clean for JSON
os.environ['WDM_LOG_LEVEL'] = '0'
import logging
logging.getLogger('urllib3').setLevel(logging.ERROR)
logging.getLogger('selenium').setLevel(logging.ERROR)
logging.getLogger('undetected_chromedriver').setLevel(logging.ERROR)


# ─── Configuration ──────────────────────────────────────────────────
BASE_URL = "https://eg.indeed.com"
MAX_SCROLL_LOOPS = 30
SCROLL_PAUSE = 1.5
PAGE_LOAD_TIMEOUT = 30
MAX_PAGES_PER_KEYWORD = 10

# DIRECTORY CONFIG
PROFILE_DIR = os.path.join(os.getcwd(), "data", "indeed_uc_profile")
FRESH_PROFILE_DIR = f"{PROFILE_DIR}_uc_fresh"

# Cleanup profiles on start to ensure rotation
for p in [PROFILE_DIR, FRESH_PROFILE_DIR]:
    if os.path.exists(p):
        try:
            shutil.rmtree(p)
            print(f"[IndeedPy] 🧹 Cleaned profile: {p}", flush=True)
        except Exception as e:
            print(f"[IndeedPy] ⚠️ Failed to clean profile {p}: {e}", flush=True)

MIN_DELAY = float(os.environ.get("INDEED_UC_MIN_DELAY", "2.5"))
MAX_DELAY = float(os.environ.get("INDEED_UC_MAX_DELAY", "5.0"))
BLOCK_COOLDOWN_S = int(os.environ.get("INDEED_UC_BLOCK_COOLDOWN_S", "45"))
MAX_BLOCK_COOLDOWN_S = int(os.environ.get("INDEED_UC_MAX_BLOCK_COOLDOWN_S", "180"))
DEBUG_SEARCH_HTML = os.environ.get("INDEED_DEBUG_HTML") == "1"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


def log(msg: str):
    """Log to stderr (visible to user, doesn't pollute stdout JSON)."""
    print(f"[PY] {msg}", file=sys.stderr, flush=True)


class IndeedUCScraper:
    def __init__(self):
        self.driver = None
        self.block_count = 0
        self.last_action_ts = 0.0
        self.user_agent = random.choice(USER_AGENTS)
        self._init_browser()

    def _get_chrome_version(self) -> int:
        """Auto-detect installed Chrome major version."""
        import subprocess
        for binary in ["google-chrome", "chromium-browser", "chromium"]:
            try:
                out = subprocess.check_output([binary, "--version"], text=True, stderr=subprocess.DEVNULL)
                match = re.search(r"(\d+)\.", out)
                if match:
                    return int(match.group(1))
            except Exception:
                continue
        return 0  # Fallback: let UC auto-detect



    def _init_browser(self):
        """Initialize browser with fallback to standard Selenium."""
        log("🚀 Launching Chrome...")
        
        # Common options
        options = uc.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-setuid-sandbox")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-gpu")
        options.add_argument("--lang=en-US")
        options.add_argument("--disable-infobars")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument(f"--user-agent={self.user_agent}")
        
        # FIX: Critical flags for XVFB stability
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--remote-debugging-port=9222")

        try:
            os.makedirs(PROFILE_DIR, exist_ok=True)
            options.add_argument(f"--user-data-dir={PROFILE_DIR}")
        except Exception:
            pass

        # Check for local driver
        local_driver_path = os.path.join(os.getcwd(), "src", "drivers", "chromedriver-linux64", "chromedriver")
        if not os.path.exists(local_driver_path):
             local_driver_path = None

        chrome_ver = self._get_chrome_version()
        if local_driver_path:
            log(f"📂 Using local driver: {local_driver_path}")
            # Force version for UC
            chrome_ver = 144

        # OPTIMIZED: Standard Selenium (Stealth) - Primary method for speed & stability
        # We skipped UC because it times out in this environment (XVFB).
        
        # OPTIMIZED: Standard Selenium (Stealth) - Primary method for speed & stability
        # We revert to this because UC is unstable (hangs/crashes) in this env.
        # Key Fixes:
        # 1. XVFB Resolution: 1920x1080 (via package.json)
        # 2. Fresh Profile: Rotated on every restart
        # 3. Stealth: selenium-stealth to hide webdriver
        
        try:
            log("🚀 Launching Chrome (Standard Selenium + Stealth)...")
            
            options = webdriver.ChromeOptions()
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-setuid-sandbox")
            options.add_argument("--window-size=1920,1080")
            options.add_argument("--disable-gpu")
            options.add_argument("--lang=en-US")
            
            # FIX: Critical flags for XVFB stability
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--remote-debugging-port=9222") 
            
            options.add_argument("--disable-infobars")
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_argument(f"--user-agent={self.user_agent}")
            
            # Use fresh profile
            options.add_argument(f"--user-data-dir={FRESH_PROFILE_DIR}")

            # Use webdriver-manager to ensure correct driver version
            service = None
            try:
                from webdriver_manager.chrome import ChromeDriverManager
                driver_path = ChromeDriverManager().install()
                # Enable verbose logging
                service = Service(executable_path=driver_path, service_args=["--verbose", "--log-path=chromedriver.log"])
                log(f"   Using driver: {driver_path}")
            except Exception as e:
                log(f"   ⚠️ Manager failed: {e}")
                if local_driver_path:
                    service = Service(executable_path=local_driver_path, service_args=["--verbose", "--log-path=chromedriver.log"])
            
            self.driver = webdriver.Chrome(service=service, options=options)

            # Apply Selenium Stealth
            try:
                from selenium_stealth import stealth
                # Dynamically set platform based on UA
                ua_platform = "Win32"
                if "Macintosh" in self.user_agent:
                    ua_platform = "MacIntel"
                elif "Linux" in self.user_agent:
                    ua_platform = "Linux x86_64"

                stealth(self.driver,
                        languages=["en-US", "en"],
                        vendor="Google Inc.",
                        platform=ua_platform,
                        webgl_vendor="Intel Inc.",
                        renderer="Intel Iris OpenGL Engine",
                        fix_hairline=True,
                        )
                log("🥷 Selenium Stealth active.")
            except ImportError:
                log("⚠️ selenium-stealth not installed. Running without it.")
            
            self.driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
            self.driver.implicitly_wait(5)
            # ... rest of init
            self._warmup()
            log("✅ Chrome launched successfully.")
        except Exception as e:
             log(f"❌ Launch failed: {e}")
             if self.driver:
                 try:
                     self.driver.quit()
                 except: 
                     pass
                 self.driver = None
             raise

    def _human_delay(self, min_s=1.0, max_s=3.0):
        """Random delay to mimic human behavior."""
        time.sleep(random.uniform(min_s, max_s))

    def _throttle(self):
        now = time.time()
        if self.last_action_ts:
            elapsed = now - self.last_action_ts
            if elapsed < MIN_DELAY:
                time.sleep(MIN_DELAY - elapsed)
        time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))
        self.last_action_ts = time.time()

    def _warmup(self):
        if not self.driver:
            return
        try:
            self.driver.get(BASE_URL)
            self._human_delay(2, 4)
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.3);")
            self._human_delay(1, 2)
        except Exception:
            pass

    def _wait_for_page(self, timeout=15):
        """Wait for the page to be interactive, handle Cloudflare challenges."""
        if not self.driver:
            return False
        try:
            WebDriverWait(self.driver, timeout).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        except Exception:
            pass

        # Check for Cloudflare challenge
        title = self.driver.title.lower()
        if "just a moment" in title or "verify" in title:
            log("🛡️ Cloudflare challenge detected. Waiting for resolution...")
            for attempt in range(6):
                time.sleep(5)
                title = self.driver.title.lower()
                if "just a moment" not in title and "verify" not in title:
                    log("✅ Cloudflare challenge resolved!")
                    return True
            log("⚠️ Cloudflare challenge not resolved after 30s.")
            return False
        return True

    def _is_blocked(self) -> bool:
        """Check if the current page is a Cloudflare block or sign-in redirect."""
        if not self.driver:
            return True
        title = self.driver.title.lower()
        url = self.driver.current_url.lower()
        return (
            "just a moment" in title
            or "verify you are human" in title
            or "blocked" in title
            or "sign in" in title
            or "/account/sign-in" in url
            or "secure.indeed.com" in url
            or "/auth" in url
        )

    def _register_block(self, reason: str):
        self.block_count += 1
        log(f"⏳ Block detected! Returning immediately to orchestrator for cooldown/restart.")
        # time.sleep(cooldown)  <-- REMOVED: Let Node.js handle the delay or restart!
        # if self.block_count >= 3:
        #     log("🔄 Restarting browser after repeated blocks.")
        #     try:
        #         self.close()
        #     finally:
        #         self.block_count = 0
        #         self._init_browser()
        pass

    # ─── DISCOVER ───────────────────────────────────────────────────
    def discover(self, keyword: str, location: str = "Egypt", start: int = 0, days: int | None = None) -> dict:
        """
        Discover jobs by navigating to Indeed search results.
        NOTE: Indeed requires sign-in for page 2+, so we only fetch page 1.
        Broad coverage is achieved via keyword rotation in the TS orchestrator.
        """
        log(f'🔍 Discovering: "{keyword}" in "{location}"')

        # Build search URL
        params = [
            f"q={keyword.replace(' ', '+')}",
            f"l={location.replace(' ', '+')}"
        ]
        if days is not None:
            try:
                days_value = int(days)
            except Exception:
                days_value = None
            if days_value is not None:
                params.append(f"fromage={days_value}")
        if start and int(start) > 0:
            params.append(f"start={int(start)}")
        url = f"{BASE_URL}/jobs?{'&'.join(params)}"
        log(f"📄 URL: {url}")

        if not self.driver:
            return {"jobs": [], "blocked": True, "reason": "driver_missing"}

        try:
            self._throttle()
            self.driver.get(url)
            self._human_delay(2, 4)

            if not self._wait_for_page():
                log("🛑 Blocked on search page.")
                self._register_block("search_challenge")
                return {"jobs": [], "blocked": True, "reason": "search_challenge"}

            if self._is_blocked():
                title = self.driver.title.lower()
                url = self.driver.current_url.lower()
                
                # Check for AUTH redirection (Pagination wall)
                if "sign in" in title or "/auth" in url or "secure.indeed.com" in url or "verify" in title:
                     # If we are on page 2+ (start > 0), this is likely just the end of public access
                     # If on page 1, it's a hard block.
                     if start and int(start) > 0:
                         log("🛑 Auth Wall detected on pagination. treating as End of Results.")
                         return {"jobs": [], "blocked": False, "reason": "auth_wall_pagination"}
                     else:
                         log("🛑 Auth Wall on Page 1. Hard block.")
                         self._register_block("search_blocked_p1")
                         return {"jobs": [], "blocked": True, "reason": "search_blocked_auth"}

                log("🛑 Page is blocked (Cloudflare).")
                self._register_block("search_blocked_cf")
                return {"jobs": [], "blocked": True, "reason": "search_blocked_cf"}

            html = self.driver.page_source
            jobs = self._parse_search_page(html)

            # Filter out sponsored jobs
            non_sponsored = [j for j in jobs if not j.get("isSponsored", False)]
            log(f"✅ Found {len(jobs)} cards ({len(non_sponsored)} non-sponsored)")
            return {"jobs": non_sponsored, "blocked": False}

        except Exception as e:
            log(f"❌ Discovery error: {e}")
            return {"jobs": [], "blocked": True, "reason": "search_error"}

    def _parse_search_page(self, html: str) -> list:
        """Parse Indeed search results HTML into job dicts."""
        soup = BeautifulSoup(html, "html.parser")
        jobs = []
        seen_keys = set()

        # Use .job_seen_beacon as the primary card selector (avoids double-counting)
        cards = soup.select(".job_seen_beacon")
        if not cards:
            # Fallback: try data-jk elements
            cards = soup.select("[data-jk]")

        for card in cards:
            try:
                # Extract job key — may be on the card or on a nested <a>
                job_key = card.get("data-jk", "")
                if not job_key:
                    link = card.select_one("a[data-jk]")
                    if link:
                        job_key = link.get("data-jk", "")
                if not job_key:
                    link = card.select_one('a[href*="jk="]')
                    if link:
                        href = str(link.get("href") or "")
                        m = re.search(r"jk=([a-f0-9]+)", href, re.IGNORECASE)
                        if m:
                            job_key = m.group(1)

                if not job_key or job_key in seen_keys:
                    continue
                seen_keys.add(job_key)

                # Title — from the span inside h2.jobTitle
                title_el = card.select_one("h2.jobTitle span[title]")
                if not title_el:
                    title_el = card.select_one("h2.jobTitle span") or card.select_one("a[data-jk]")
                title = title_el.get_text(strip=True) if title_el else "Unknown"

                # Company
                company_el = card.select_one('[data-testid="company-name"]') or card.select_one(".companyName")
                company = company_el.get_text(strip=True) if company_el else "Unknown"

                # Location
                loc_el = card.select_one('[data-testid="text-location"]') or card.select_one(".companyLocation")
                location = loc_el.get_text(strip=True) if loc_el else "Egypt"

                # Job type / attributes (new Indeed uses attribute_snippet_testid)
                attr_el = card.select_one('[data-testid="attribute_snippet_testid"]')
                job_type_hint = attr_el.get_text(strip=True) if attr_el else ""

                # Snippet — try multiple selectors for the new Indeed layout
                snippet_el = (
                    card.select_one(".job-snippet")
                    or card.select_one(".underShelfFooter")
                    or card.select_one('[class*="job-snippet"]')
                )
                snippet = " ".join(snippet_el.get_text().split()) if snippet_el else ""

                # Posted date — try multiple selectors
                date_el = (
                    card.select_one('[data-testid="myJobsStateDate"]')
                    or card.select_one(".date")
                    or card.select_one('[data-testid="posted-date"]')
                    or card.select_one(".result-footer .date")
                )
                posted_date = date_el.get_text(strip=True) if date_el else ""

                # Sponsored check — look for "Sponsored" text in the card
                card_text = card.get_text().lower()
                is_sponsored = "sponsored" in card_text and title.lower() != "sponsored"

                # Job URL
                job_url = f"{BASE_URL}/viewjob?jk={job_key}"

                jobs.append({
                    "jobKey": job_key,
                    "jobUrl": job_url,
                    "title": title,
                    "company": company,
                    "location": location,
                    "snippet": snippet,
                    "postedDate": posted_date,
                    "jobTypeHint": job_type_hint,
                    "isSponsored": is_sponsored,
                })
            except Exception:
                continue

        # Force dump search HTML for analysis (temporary)
        if DEBUG_SEARCH_HTML:
            log("⚠️ Force dumping search HTML for analysis...")
            with open("debug_search_force.html", "w", encoding="utf-8") as f:
                f.write(html)

        # Honeypot detection - Check ALL jobs
        # Patterns: sequential, reversed, interleaved, and their cyclic shifts
        canonical_fakes = [
            "0123456789abcdef",  # Sequential
            "fedcba9876543210",  # Reversed
            "0f1e2d3c4b5a6978",  # Interleaved
        ]
        
        valid_jobs = []
        fake_count = 0
        
        for job in jobs:
            key = job.get("jobKey", "")
            is_honeypot = False
            
            # 1. Check for repetitive characters (aaaaaa...)
            if re.search(r"([0-9a-f])\1{5,}", key):
                is_honeypot = True
            
            # 2. Check for cyclic shifts of canonical fake patterns
            # e.g. "456789abcdef0123" is a shift of "0123456789abcdef"
            if not is_honeypot and len(key) == 16:
                for pattern in canonical_fakes:
                    # Check if key is a substring of pattern doubled
                    # (pattern + pattern) contains all cyclic shifts
                    if key in (pattern + pattern):
                        is_honeypot = True
                        break
            
            if is_honeypot:
                fake_count += 1
                # Save just one example for debugging if needed, but don't flood disk
                if fake_count == 1:
                    log(f"🛑 HONEYPOT JOB DETECTED: {key}. Skipping...")
            else:
                valid_jobs.append(job)

        if fake_count > 0:
            log(f"🧹 Filtered out {fake_count} honeypot/fake jobs from this batch.")
            
        # If we filtered everything, it was likely a full honeypot page
        if jobs and not valid_jobs:
             log("🛑 ALL jobs on this page were honeypots.")
             return []

        # Check for suspicious low count (1 job) which suggests a "soft block" or "featured job only"
        if len(valid_jobs) <= 1:
            log(f"⚠️ Low job count ({len(valid_jobs)}).")

        return valid_jobs

    # ─── DETAIL ─────────────────────────────────────────────────────
    def detail(self, url: str) -> dict:
        """
        Scrape a single job detail page.
        Returns dict with description, jobType, workType, experience.
        """
        log(f"📋 Detail: {url}")
        empty = {
            "description": "",
            "jobType": "Not Specified",
            "careerLevel": "Not Specified",
            "workType": "On-site",
            "experience": "Not Specified",
        }

        if not self.driver:
            return {**empty, "blocked": True}

        try:
            self._throttle()
            self.driver.get(url)
            self._human_delay(1.5, 3)

            if not self._wait_for_page(timeout=10):
                log("🛑 Blocked on detail page (timeout/challenge).")
                self._register_block("detail_challenge")
                return {**empty, "blocked": True}

            if self._is_blocked():
                log("🛑 Page is explicitly blocked.")
                self._register_block("detail_blocked")
                return {**empty, "blocked": True}

            # Wait specifically for the description to load
            try:
                # Try multiple selectors for description presence
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "#jobDescriptionText, .jobsearch-JobComponent-description, [class*='jobsearch-JobComponent-description']"))
                )
            except Exception:
                log("⚠️ Description element not found (timeout). Saving debug HTML...")
                # Extract job key from URL for filename
                jk_match = re.search(r"jk=([a-f0-9]+)", url)
                jk = jk_match.group(1) if jk_match else "unknown"
                with open(f"debug_failed_{jk}.html", "w", encoding="utf-8") as f:
                    f.write(self.driver.page_source)
                return empty

            html = self.driver.page_source
            # Pass title to parser if possible - but detail page usually has it in header
            # We'll extract it from the detail page HTML or use what we have
            return self._parse_detail_page(html)

        except Exception as e:
            log(f"❌ Detail error: {e}")
            return {**empty, "blocked": True}

    def _parse_detail_page(self, html: str) -> dict:
        """Parse Indeed job detail page HTML."""
        soup = BeautifulSoup(html, "html.parser")

        # Description
        desc_el = soup.select_one("#jobDescriptionText") or soup.select_one(".jobsearch-JobComponent-description")
        description = " ".join(desc_el.get_text().split()) if desc_el else ""

        # Get Title for Career Level inference
        title_el = soup.select_one("h1.jobsearch-JobInfoHeader-title")
        title = title_el.get_text(strip=True) if title_el else ""

        # Infer career level from Title first
        lower_title = title.lower()
        career_level = "Not Specified"
        
        if "senior" in lower_title or "sr." in lower_title or "lead" in lower_title or "principal" in lower_title:
            career_level = "Senior"
        elif "junior" in lower_title or "jr." in lower_title or "associate" in lower_title:
            career_level = "Junior/Entry"
        elif "intern" in lower_title or "trainee" in lower_title:
            career_level = "Internship"
        elif "manager" in lower_title or "head" in lower_title or "director" in lower_title:
            career_level = "Manager"
        elif "executive" in lower_title or "chief" in lower_title or "vp" in lower_title:
            career_level = "Executive"
            
        # If still not specified, check Description
        if career_level == "Not Specified" and description:
            lower_desc = description.lower()
            if "senior" in lower_desc or "sr." in lower_desc:
                career_level = "Senior"
            elif "junior" in lower_desc or "entry level" in lower_desc:
                career_level = "Junior/Entry"
            elif "intern" in lower_desc:
                career_level = "Internship"
            elif "manager" in lower_desc or "leadership" in lower_desc:
                career_level = "Manager"

        # Infer work type
        lower_desc = description.lower()
        if "remote" in lower_desc or "work from home" in lower_desc:
            work_type = "Remote"
        elif "hybrid" in lower_desc:
            work_type = "Hybrid"
        else:
            work_type = "On-site"

        # Infer experience
        exp_match = re.search(r"(\d+)\+?\s*years?", description, re.IGNORECASE)
        experience = f"{exp_match.group(1)} Years" if exp_match else "Not Specified"

        # Try to get salary
        salary_el = soup.select_one("#salaryInfoAndJobType, .salary-snippet, [data-testid='attribute_snippet_testid']")
        salary = salary_el.get_text(strip=True) if salary_el else ""

        # Job type from metadata
        job_type = "Not Specified"
        if salary:
            if "full-time" in salary.lower():
                job_type = "Full-time"
            elif "part-time" in salary.lower():
                job_type = "Part-time"
            elif "contract" in salary.lower():
                job_type = "Contract"

        return {
            "description": description,
            "jobType": job_type,
            "careerLevel": career_level,
            "workType": work_type,
            "experience": experience,
            "salary": salary,
            "blocked": False,
        }

    def close(self):
        """Close the browser."""
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None
            log("🔒 Chrome closed.")


# ─── STANDALONE TEST ────────────────────────────────────────────────
def run_test():
    """Standalone test to verify Cloudflare bypass."""
    log("=" * 50)
    log("🧪 STANDALONE TEST MODE")
    log("=" * 50)

    scraper = IndeedUCScraper()
    try:
        # Test 1: Discover
        result = scraper.discover("Software Engineer", "Egypt")
        jobs = result.get("jobs", [])
        log(f"\n📊 Test Results:")
        log(f"   Jobs found: {len(jobs)}")
        if jobs:
            log(f"   First job: {jobs[0]['title']} at {jobs[0]['company']}")

            # Test 2: Detail (first job)
            detail = scraper.detail(jobs[0]["jobUrl"])
            desc_len = len(detail.get("description", ""))
            log(f"   Description length: {desc_len} chars")
            log(f"   Work type: {detail.get('workType', 'N/A')}")
            log(f"   Blocked: {detail.get('blocked', False)}")

        # Print JSON result for verification
        result_out = {"ok": True, "jobs_found": len(jobs), "sample": jobs[:3] if jobs else []}
        print(json.dumps(result_out))
    finally:
        scraper.close()


# ─── JSON PROTOCOL (stdin/stdout) ──────────────────────────────────
def run_protocol():
    """Run as subprocess, reading JSON commands from stdin."""
    log("📡 Starting JSON protocol mode...")

    scraper = None
    try:
        scraper = IndeedUCScraper()
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"Failed to init browser: {str(e)}"}), flush=True)
        sys.exit(1)

    # Signal ready
    print(json.dumps({"ok": True, "status": "ready"}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            cmd = json.loads(line)
        except json.JSONDecodeError:
            print(json.dumps({"ok": False, "error": "Invalid JSON"}), flush=True)
            continue

        action = cmd.get("cmd", "")

        try:
            if action == "discover":
                keyword = cmd.get("keyword", "Jobs")
                location = cmd.get("location", "Egypt")
                start = cmd.get("start", 0)
                days = cmd.get("days", None)
                jobs = scraper.discover(keyword, location, start=start, days=days)
                print(json.dumps({"ok": True, "data": jobs}), flush=True)

            elif action == "detail":
                url = cmd.get("url", "")
                if not url:
                    print(json.dumps({"ok": False, "error": "Missing url"}), flush=True)
                    continue
                detail = scraper.detail(url)
                print(json.dumps({"ok": True, "data": detail}), flush=True)

            elif action == "cookies":
                # Export all browser cookies for handoff to Playwright
                cookies = scraper.driver.get_cookies() if scraper.driver else []
                # Convert expiry (float) to int for JSON compat
                for c in cookies:
                    if "expiry" in c:
                        c["expires"] = int(c["expiry"])
                        del c["expiry"]
                print(json.dumps({"ok": True, "data": cookies}), flush=True)

            elif action == "warmup_only":
                # Just warmup (Cloudflare bypass) and return cookies — no search
                if scraper.driver:
                    cookies = scraper.driver.get_cookies()
                    for c in cookies:
                        if "expiry" in c:
                            c["expires"] = int(c["expiry"])
                            del c["expiry"]
                    print(json.dumps({"ok": True, "data": cookies}), flush=True)
                else:
                    print(json.dumps({"ok": False, "error": "No browser"}), flush=True)

            elif action == "quit":
                log("👋 Quit command received.")
                print(json.dumps({"ok": True, "status": "closing"}), flush=True)
                break

            else:
                print(json.dumps({"ok": False, "error": f"Unknown command: {action}"}), flush=True)

        except Exception as e:
            log(f"❌ Command error: {traceback.format_exc()}")
            print(json.dumps({"ok": False, "error": str(e)}), flush=True)

    if scraper:
        scraper.close()


# ─── ENTRY POINT ────────────────────────────────────────────────────
if __name__ == "__main__":
    if "--test" in sys.argv:
        run_test()
    else:
        run_protocol()
