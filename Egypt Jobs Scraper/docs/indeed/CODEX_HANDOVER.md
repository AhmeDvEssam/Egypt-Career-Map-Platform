# Indeed Scraper - Codex Handover & History

## Current Status (Node Pipeline)

- `npm run start:indeed:v5` now runs the Node pipeline (no Python subprocess).
- API-first search + page fallback only (no interactive search/click flows).
- Detail pages validated with JobPosting JSON-LD to filter honeypots.
- Existing CSV rows are skipped at startup via known key seeding.

## 1. Project Evolution
We have iterated through multiple approaches to scrape Indeed, facing increasing anti-bot measures at each step.

### Phase 1: Puppeteer & Playwright (Early Attempts)
- **Approach**: Standard headless browsers.
- **Outcome**: Immediate blocking by Cloudflare (403 Forbidden).
- **Lesson**: Standard headless signatures are easily detected.

### Phase 2: Selenium with Standard Chromedriver
- **Approach**: Selenium WebDriver.
- **Outcome**: blocked. `navigator.webdriver` property and other inconsistent flags revealed the bot.

### Phase 3: Undetected Chromedriver (Python) - **Current**
- **Approach**: switched to `undetected-chromedriver` (v2) in Python, as the Node.js equivalents were less reliable for Cloudflare bypass.
- **Architecture**: 
    - **Manager (TypeScript)**: Handles concurrency, state (`data/indeed_v5_state.json`), CSV writing, and keyword rotation. 
    - **Worker (Python)**: A long-running subprocess (`scripts/indeed_scraper.py`) that keeps a browser open. 
    - **Protocol**: JSON-lines over Stdin/Stdout.
        - `{"cmd": "discover", ...}` -> `{"ok": true, "data": [jobs]}`
        - `{"cmd": "detail", ...}` -> `{"ok": true, "data": {description...}}`
- **Status**: Successfully bypasses the initial Cloudflare check (most of the time).

## 2. Current Architecture Details
- **File**: `scripts/indeed_scraper.py`
- **Browser**: Chrome (Headless via `xvfb` or Headed).
- **Stealth**: Uses `undetected_chromedriver`.
- **Logic**:
    1.  **Discovery**: Searches for keywords + location. Parses `data-jk` attributes from the result list.
    2.  **Detail**: Navigates to `https://www.indeed.com/viewjob?jk={key}` to scrape description.

## 3. The Current Problems (Hard Blockers)

Despite bypassing Cloudflare, Indeed has deployed sophisticated application-level defenses.

### A. The "Honeypot" Pages
- **Symptom**: The scraper loads a search page that *looks* valid (has job cards), but the data is fake.
- **Detection**:
    - **Job Keys**: The `data-jk` are sequential or hex patterns like:
        - `0123456789abcdef` (and cyclic shifts like `456789abcdef0123`)
        - `fedcba9876543210`
        - `0f1e2d3c4b5a6978`
    - **Behavior**: Clicking these links often leads to empty descriptions or 404s.
- **Current Fix**: We implemented a regex-based filter in `scripts/indeed_scraper.py` to detect these keys (cyclic checks).
- **Status**: Partially mitigated, but if Indeed changes the pattern, we fail again.

### B. "Soft Blocks" / Low Job Counts
- **Symptom**: Search returns only 1 or 0 jobs for a popular keyword (e.g., "Software Engineer").
- **Cause**: Indeed likely flagged the IP/Fingerprint and served a "no results" or "limited results" page.
- **Status**: Unsolved. Requires better IP rotation or residential proxies.

### C. Description Extraction Failures
- **Symptom**: Logs show `FAILED: Description missing (0 chars)`.
- **Cause**:
    1.  The job was a honeypot (fake ID).
    2.  The page loaded but the description element (`#jobDescriptionText`) was missing or obscured by a "Verify you are human" captcha (which `undetected-chromedriver` sometimes misses if it's an overlay).

## 4. Request to Codex
We need a more robust solution that:
1.  **Reliably detects Honeypots**: relying on hex patterns is fragile. Is there a DOM monitoring approach?
2.  **Handles IP Reputation**: Suggestions for free/cheap rotation or better fingerprinting (e.g. `camoufox`? `browserless`?).
3.  **Alternative APIs**: Is there a hidden internal API or mobile API we can mimic?

## 5. Codex Response (Implemented Plan)

### Constraints
- No bypass, no stealth, no captcha solving, no fingerprint spoofing.
- Allowed: rate limits, backoff, retries, circuit breakers, logging.
 - Interactive search/click automation is disabled in favor of API-first fetch.

### Approach
- API-first search fetch with page fallback (no interactive typing/clicks).
- Detail fetch validates real JobPosting pages using JSON-LD schema + description markers.
- Honeypots filtered by failed JobPosting validation (not by regex patterns).
- Blocked detail fetch uses exponential cooldown and then queues for retry.
- Blocked query buckets are quarantined and retried later in the same run.
- Block detection thresholds are tunable via env (see PLAN.md).
- CSV is loaded to seed known keys so existing jobs are skipped.

### Expected behavior changes
- Fewer “description missing” rows caused by honeypot keys.
- Blocked jobs are retried later with backoff rather than dropped.
- Existing CSV rows are not scraped again.

## 6. Artifacts
- **Entry Point**: `npm run start:indeed:v5`
- **Script**: `scripts/indeed_scraper.py`
- **Output**: `data/indeed_clean_data.csv`
- **Debug Files**: `debug_failed_*.html`, `debug_search_force.html` (generated on failure).
