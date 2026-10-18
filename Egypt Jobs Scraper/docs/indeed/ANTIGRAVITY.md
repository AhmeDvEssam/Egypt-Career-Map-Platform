# Antigravity Handoff - Indeed Egypt Collector

This document is a self contained handoff for Agent B (Antigravity) to review the Indeed refactor, validate the crawl strategy, and provide test and reliability guidance.

Constraints honored:
- No bypass, no stealth, no captcha solving, no interactive challenge clicks.
- API-first search with page fallback only.
- start:indeed:v5 now runs the Node pipeline (Python UC removed).

## Summary of changes

- Replaced UI card clicking with HTML parsing for job cards.
- Added search fetch fallback: page navigation first, request API fallback.
- Added JobPosting JSON-LD validation to filter honeypot pages.
- CSV known keys are loaded at startup to skip existing jobs.
- Built deterministic query grid: keyword x city x mode x pagination.
- Added BlockDetector with adaptive polite mode only on block signals.
- Added global cooldown when signals spike across query buckets.
- Added crash safe resume state (per query offset, fingerprint, empty pages, retry queue).
- Added retry queue for missing descriptions (no drops).
- Added structured metrics and debug dumps (HTML + screenshot).
- CSV sink now records query metadata and first/last seen timestamps.

## Goals met

- No scrollIntoViewIfNeeded per card.
- Missing descriptions are stored and queued for retry.
- Pagination is deterministic with stop rules.
- Block handling is adaptive only (normal by default).
- Crash safe resume state exists.
- Metrics printed at end of run.

## Files to review

- src/scrapers/indeed/IndeedScraper.ts
- src/scrapers/indeed/IndeedQueryPlanner.ts
- src/scrapers/indeed/IndeedSearchParser.ts
- src/scrapers/indeed/IndeedJobDetailParser.ts
- src/scrapers/indeed/BlockDetector.ts
- src/scrapers/indeed/StateStore.ts
- src/scrapers/indeed/sinks/CsvSink.ts
- src/scrapers/indeed/metrics/MetricsReporter.ts
- src/scrapers/indeed/debug/DebugDumper.ts
- src/IndeedManager.ts
- docs/indeed/PLAN.md
- docs/indeed/TODO.md

## Crawl grid strategy

Query grid = keyword family taxonomy x Egypt city list x scrape mode (incremental or backfill) x pagination offset.

- Incremental default: 7 days
- Backfill default: 90 days
- Pagination using start offset with stop rules

Stop rules:
- N consecutive empty pages (default 3)
- Oldest posting older than window
- Repeated page fingerprint

## Block detection and throttling

Signals:
- HTTP 403 / 429 / 503
- page title or HTML contains captcha / verify / challenge / unusual traffic
- repeated empty pages or timeouts

Responses:
- Default normal mode
- Polite mode only after signal threshold
- Circuit breaker per query bucket
- Global cooldown when repeated signals occur across buckets
- Quarantine defers blocked buckets for later retries in the same run
- If global cooldown triggers, scheduling stops early to avoid deferring everything
- JSONL logging to logs/indeed_block_events.jsonl

Tunable thresholds (env):
- BLOCK_SIGNAL_WINDOW_MS
- BLOCK_POLITE_MS
- BLOCK_COOLDOWN_MS
- BLOCK_SIGNAL_THRESHOLD
- BLOCK_COOLDOWN_THRESHOLD
- BLOCK_GLOBAL_THRESHOLD
- BLOCK_GLOBAL_MS

## Missing description handling

- If detail description missing, job is saved with descriptionStatus=missing.
- Job is queued for retry with limited attempts.
- Retry uses request API to recheck details.
- On retry success, a corrected row is appended with descriptionStatus=retry_ok.
- If blocked during detail fetch, a short exponential cooldown is applied before enqueue.
  - Base delay controlled by `DETAIL_BLOCK_BACKOFF_BASE_MS`.

## Metrics

Per keyword/city metrics:
- cards_found
- jobs_saved
- jobs_missing_description
- card_errors_count + error types
- block_signals_count
- pages_visited and empty_pages

Metrics summary is printed at the end of run.

## Debug artifacts

On critical failure:
- Save HTML snapshot and screenshot
- Save query context JSON
- Path: debug/indeed/YYYY-MM-DD/

## How to run

Normal:

```
npm run start:indeed
```

Backfill:

```
SCRAPE_MODE=backfill BACKFILL_DAYS=90 npm run start:indeed
```

Dry run:

```
DRY_RUN=1 LIMIT_KEYWORDS=1 LIMIT_CITIES=1 LIMIT_PAGES=2 WARMUP_DELAY_MS=2000 npm run start:indeed
```

Optional CSV override:

```
INDEED_CSV_PATH=data/indeed_clean_data.csv npm run start:indeed:v5
```

## Antigravity review checklist

1) Search parsing
   - Confirm selectors are resilient and do not rely on nth indexes.
   - Confirm job key extraction is stable (data-jk, href jk).

2) Detail parsing
   - Confirm description is extracted from stable selectors.
   - Confirm fallback to new page works on missing text.

3) Pagination
   - Confirm stop rules are correct and resume state persists.
   - Confirm repeated fingerprint stops infinite loops.

4) Block detection
   - Confirm polite mode only activates on signals.
   - Confirm cooldown works per query bucket.
   - Confirm block events are logged.

5) Data integrity
   - Confirm dedupe primary key is jk or URL.
   - Confirm title/company/location hash fallback exists.
   - Confirm first_seen_at / last_seen_at tracked.

6) Observability
   - Confirm metrics printed at end.
   - Confirm debug artifacts saved on failures.

## Test plan (recommended)

1) Dry run
   - DRY_RUN=1 LIMIT_KEYWORDS=1 LIMIT_CITIES=1 LIMIT_PAGES=2
   - Expect CSV output, metrics summary, debug folder created

2) Incremental smoke test
   - SCRAPE_MODE=incremental INCREMENTAL_DAYS=3 LIMIT_PAGES=2
   - Validate description coverage and retry queue behavior

3) Backfill smoke test
   - SCRAPE_MODE=backfill BACKFILL_DAYS=30 LIMIT_PAGES=3
   - Ensure pagination advances and stops correctly

4) Failure simulation
   - Block network briefly to trigger block signals
   - Verify polite mode and log output
