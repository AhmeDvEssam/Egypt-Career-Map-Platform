# Indeed Egypt Collector - TODO

## Phase 1 - Refactor foundation

1) Create module skeletons under `src/scrapers/indeed/`
   - IndeedScraper.ts
   - IndeedQueryPlanner.ts
   - IndeedSearchParser.ts
   - IndeedJobDetailParser.ts
   - BlockDetector.ts
   - StateStore.ts
   - sinks/CsvSink.ts
   - metrics/MetricsReporter.ts
   - debug/DebugDumper.ts

2) Implement StateStore
   - load/save JSON
   - per-query progress
   - retry queue
   - seen keys + timestamps

3) Implement SearchParser
   - robust selector strategy
   - extract jk / canonical URL
   - skip sponsored and non-job cards

4) Implement JobDetailParser
   - extract description from detail HTML
   - extract job type/work mode if present
   - normalize whitespace

5) Implement BlockDetector
   - detect signals from status + html
   - polite mode escalation
   - circuit breaker per query
   - log incidents to JSONL

6) Implement MetricsReporter
   - per query counts and error types
   - summary at end

7) Implement DebugDumper
   - html + screenshot on failure
   - context JSON

8) Implement CsvSink + JobSink interface
   - headers include query metadata
   - support missing description

9) Orchestrate in IndeedScraper
   - query planner
   - pagination
   - detail fetch and retry queue
   - resume logic
   - dry-run support

10) Integrate in IndeedManager
    - use new scraper
    - keep dedupe safe

11) Final pass
    - run dry-run
    - verify metrics output
    - validate debug dumps
