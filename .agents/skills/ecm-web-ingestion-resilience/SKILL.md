---
name: ecm-web-ingestion-resilience
description: Resilient web scraping, crawling architecture, adaptive throttling, rate limiting, DOM drift defense, retry policies, and ethical ingestion standards for Egypt Career Map.
---

# ECM Resilient Web Ingestion & Crawling Standards

## 1. Domain Scope & Objectives
Governs the architecture, reliability, compliance, and error-handling of scrapers and crawlers collecting public job postings across Egyptian and regional job portals (e.g., Wuzzuf, Bayt, Forasna, LinkedIn public feeds).

### In-Scope
- Robust HTTP client configuration, proxy rotation, and connection pooling.
- Adaptive throttling, rate limiting, exponential backoff with full jitter.
- Circuit breaking on target portal degradation or blockades (HTTP 429, 403, 503).
- DOM schema drift detection and resilient parser fallbacks.
- Ethical ingestion standards: honoring `robots.txt` where applicable, respectful request intervals, clear User-Agent identification.
- Raw HTML/JSON snapshot persistence for auditability and parser re-runs.

### Non-Goals
- Bypassing access controls, exploiting vulnerabilities, or circumventing CAPTCHAs (strictly forbidden).
- Downstream ETL processing (see `ecm-data-engineering-pipelines`).

---

## 2. Technical Contracts & Standards

### Client Resilience Rules
1. **Adaptive Rate Limiting & Jitter:**
   - Base request interval: minimum 1.5–3.0 seconds per domain.
   - Exponential Backoff Formula on retryable errors (HTTP 429, 500, 502, 503, 504):
     $$T_{\text{sleep}} = \min(T_{\max}, T_{\text{base}} \times 2^{\text{attempt}}) \times \text{Uniform}(0.5, 1.5)$$
   - Full jitter prevents thundering herd against target origin servers.
2. **Circuit Breaker Policy:**
   - Trip circuit breaker if domain returns consecutive errors $\ge 5$ within a 60-second window.
   - Circuit state transitions: `CLOSED` -> `OPEN` (pause for 5 minutes) -> `HALF-OPEN` (canary request).
3. **DOM Drift Defense:**
   - Use multi-strategy extraction:
     * Primary: Schema.org JSON-LD microdata (`<script type="application/ld+json">`).
     * Secondary: Semantic CSS selectors (`article[data-job-id]`, `.job-title`).
     * Fallback: XPath text-proximity heuristics.
   - If parser extracts 0 jobs from a known listing page, flag `PARSER_DRIFT_DETECTED` and quarantine HTML snapshot.

---

## 3. Step-by-Step Scraper Implementation Workflow

1. **Target Policy & Robots Inspection:**
   - Fetch and parse target domain's `robots.txt`.
   - Adhere to `Crawl-delay` and disallowed paths.
2. **Session & Header Setup:**
   - Configure descriptive User-Agent with contact email or project identity.
   - Enable gzip/brotli compression.
3. **Execution with Rate Limiting:**
   - Acquire rate limiter token before initiating request.
   - Check circuit breaker state.
4. **Response Validation:**
   - Inspect HTTP status code. If 429 / 503, trigger exponential backoff.
   - Verify Content-Type (HTML or JSON) and payload byte length (> 500 bytes).
5. **Raw Snapshot Archival:**
   - Store unmodified response body in storage with timestamp and target URL hash.
6. **Parsing & Structural Emission:**
   - Run multi-strategy parser.
   - Assert presence of mandatory fields (title, company, URL).
   - Emit standardized job record to ingestion queue.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **IP Ban / Permanent 403** | Aggressive, unthrottled request concurrency. | Enforce strict per-domain concurrency limits (max 1–2 concurrent connections) and adaptive delays. |
| **Silent Scraping Failure** | Target redesigned site layout; parser returns empty fields with HTTP 200. | Assert minimum yield: if listing page returns 0 valid jobs, raise parser drift alert immediately. |
| **Infinite Pagination Loop** | Next-page link loops back to page 1 or query params change indefinitely. | Enforce maximum pagination depth (e.g., 50 pages) and track visited canonical URL set. |
| **Target Server Overload** | Burst traffic during scheduled cron job. | Randomize scheduled execution times and distribute scrapes across off-peak hours. |

---

## 5. Verification Checklist

- [ ] Respects `robots.txt` directives and crawl delays.
- [ ] Uses exponential backoff with full jitter on retryable errors.
- [ ] Circuit breaker trips after 5 consecutive failures, halting requests for cooldown period.
- [ ] Parser implements JSON-LD microdata as primary extraction strategy where present.
- [ ] Raw HTML snapshot stored before parsing for auditing and replay.
- [ ] Strict adherence to origin controls; never circumvent access restrictions or CAPTCHAs.

---

## 6. Primary References
- **RFC 9309 (Robots Exclusion Protocol)**: Internet Engineering Task Force (2022).
- **Scrapy Architecture & Best Practices**: https://docs.scrapy.org/
- **Google Search Central Webmaster Guidelines**: https://developers.google.com/search/docs
