# Indeed Egypt Collector - Implementation Plan

## Scope and goals

Build a robust Indeed Egypt collector that prioritizes stability over UI interaction and scales across a deterministic crawl grid. The system must avoid UI flakiness, support incremental + backfill modes, resume after crashes, and surface clear metrics and debug artifacts.

## Assumptions (explicit)

- Target domain is `https://eg.indeed.com` with Egypt coverage.
- No login, no bypass, no stealth/fingerprint evasion, no captcha solving.
- Data extraction uses HTML parsing and direct detail page fetches.
- CSV remains the primary sink for now, with a `JobSink` interface enabling Postgres later.
- Default mode is incremental (last 7 days), backfill (last 60–90 days) is supported via env.
- Search is API-first; no interactive typing/clicking is used.

## Crawl grid strategy

### Keyword families (taxonomy)

Keywords are grouped by family and priority to maximize coverage and reduce missing segments:

- Core: Jobs, Hiring, Vacancies, Careers
- Tech: Software Engineer, Backend, Frontend, Full Stack, DevOps, QA
- Data: Data Analyst, Data Scientist, BI, Analytics
- Business: Sales, Business Development, Account Manager
- Marketing: Marketing, Digital Marketing, Growth
- HR/Admin: HR, Recruiter, Office Manager
- Finance: Accountant, Financial Analyst, Payroll
- Operations: Operations, Supply Chain, Logistics, Procurement
- Engineering (non‑software): Civil Engineer, Mechanical Engineer, Electrical Engineer
- Medical: Doctor, Nurse, Pharmacist
- Education: Teacher, Instructor
- Design: UI UX, Graphic Designer
- Legal: Legal, Compliance
- Support/Languages: Customer Service, Call Center, French, German
- Arabic: وظائف, مطلوب, توظيف

This list is expandable and can be tuned per performance metrics.

### Egypt city/region list

Start with a balanced coverage list:

Cairo, Giza, Alexandria, New Cairo, Nasr City, Heliopolis, Maadi, 6th of October, Sheikh Zayed, Smart Village, Obour, Shorouk, Dokki, Mohandessin, Tanta, Mansoura, Ismailia, Suez, Port Said, Damietta, Zagazig, Fayoum, Beni Suef, Minya, Assiut, Luxor, Aswan, Hurghada, Sharm El Sheikh, Egypt (nationwide).

### Modes

- Incremental: `fromage` = 1–7 days
- Backfill: `fromage` = 60–90 days

### Pagination

Use deterministic `start` offsets. Stop rules:

- N consecutive pages with 0 new job keys
- Oldest posting beyond configured window
- Repeated page fingerprint detected

### Resume rules

Persist per‑query state:

- last offset
- last run timestamp
- consecutive empty pages
- last page fingerprint
- seen job keys per query run

On restart, resume from the last offset for each query key.

## Parser strategy

### Search page parsing

- Parse HTML without `scrollIntoViewIfNeeded`.
- Extract job cards using robust selectors and `data-jk` when available.
- Build canonical job URL from `jk`.
- Handle sponsored blocks safely (skip non‑job cards).
- Search fetch uses page navigation first, then request API fallback when UI load fails.

### Detail page parsing

- Fetch detail URL via request API first.
- Fall back to opening detail page in a new tab.
- Extract description from `#jobDescriptionText` or `.jobsearch-JobComponent-description`.
- Validate detail pages with JobPosting JSON-LD or description markers to avoid honeypots.
- If missing: queue for retry; store job with `description=null` (CSV empty field).
- If retry succeeds: append updated record with `descriptionStatus=retry_ok`.
- If blocked: retry detail fetch with exponential cooldown, then enqueue for later retry.
  - Tunable via `DETAIL_BLOCK_BACKOFF_BASE_MS`.

## Block detection and strict adaptive throttling

### Signals

- HTTP 403 / 429 / 503
- title or HTML includes `captcha`, `verify`, `challenge`, `unusual traffic`
- repeated empty pages and timeouts

### Responses

- Normal mode by default
- Enter polite mode only when signals trigger
  - reduce concurrency
  - increase delays
  - increase navigation timeout
- Circuit breaker:
  - pause a query bucket for cooldown after repeated signals
- Global cooldown:
  - pause all queries after repeated signals across buckets
- Quarantine:
  - blocked buckets are deferred and retried later in the same run
  - if global cooldown triggers, scheduling stops early to avoid mass deferral

### Tunable thresholds (env)

- `BLOCK_SIGNAL_WINDOW_MS`
- `BLOCK_POLITE_MS`
- `BLOCK_COOLDOWN_MS`
- `BLOCK_SIGNAL_THRESHOLD`
- `BLOCK_COOLDOWN_THRESHOLD`
- `BLOCK_GLOBAL_THRESHOLD`
- `BLOCK_GLOBAL_MS`

### Logging

Write JSONL to `/logs/indeed_block_events.jsonl` with:

- timestamp
- keyword
- city
- url
- status
- signal type
- action taken

## Metrics and debug artifacts

### Metrics per keyword/city

- cards_found
- jobs_saved
- jobs_missing_description
- card_errors_count + error types
- block_signals_count

### Debug dumps

On critical failure:

- save HTML snapshot
- save screenshot
- store query context JSON next to it

Path: `/debug/indeed/YYYY-MM-DD/`

## How to run (examples)

### Normal run (incremental)

```
npm run start:indeed
```

Or using the v5 entrypoint (now Node pipeline):

```
npm run start:indeed:v5
```

Optional CSV override:

```
INDEED_CSV_PATH=data/indeed_clean_data.csv npm run start:indeed:v5
```

### Backfill 90 days

```
SCRAPE_MODE=backfill BACKFILL_DAYS=90 npm run start:indeed
```

### Dry run

```
DRY_RUN=1 LIMIT_KEYWORDS=1 LIMIT_CITIES=1 LIMIT_PAGES=2 WARMUP_DELAY_MS=2000 npm run start:indeed
```

## Output expectations

- CSV updated
- CSV includes query metadata column: Query Keyword
- state persisted in `data/indeed_state.json`
- metrics summary printed at end
- debug artifacts created on failures
- existing CSV rows are skipped on startup (known keys)
