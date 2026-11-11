---
name: ecm-data-engineering-pipelines
description: Engineering and operating resilient batch, streaming, and incremental ETL/ELT pipelines for Egypt Career Map, covering raw ingestion staging, cleansing, curation, schema evolution, checkpointing, and replay.
---

# ECM Data Engineering & Pipeline Architecture

## 1. Domain Scope & Objectives
Governs the design, implementation, and maintenance of robust ETL/ELT pipelines processing Egyptian labor market data (job postings, employer metadata, salary figures, and skill signals).

### In-Scope
- Multi-stage pipeline architecture: Raw Ingestion -> Staging -> Cleansing / Normalization -> Curated Analytics.
- Checkpointing, state persistence, watermarking, and incremental re-runs.
- Idempotent backfills, re-processing pipelines, and late-arriving data handling.
- Schema evolution management and backward-compatible data migrations.
- Pipeline observability (throughput metrics, error queues, processing latencies).

### Non-Goals
- Web scraping protocol negotiation (see `ecm-web-ingestion-resilience`).
- Relational indexing and transaction isolation internals (see `ecm-postgresql-architecture`).
- Linguistic text normalization (see `ecm-arabic-multilingual-nlp`).

---

## 2. Technical Contracts & Standards

### Pipeline Stage Boundaries
1. **Raw Stage (Immutable Bronze):**
   - Store unmodified raw ingested payloads (JSON/HTML/XML) with ingestion timestamp, source identifier, and content hash (SHA-256).
   - Zero transformations applied at this boundary; immutable audit trail.
2. **Staging / Cleansed Stage (Silver):**
   - Structural parsing, field-type coercion, encoding normalization (UTF-8), deduplication, and initial schema validation.
   - Quarantine records violating structural schemas into dead-letter tables with error descriptors.
3. **Curated Analytical Stage (Gold):**
   - Enriched relational and dimensional entities (jobs, skills, companies, salaries, locations).
   - Dimensional conformance, business rule validations, and aggregation pipelines.

### Checkpointing & Idempotency Rules
- Every batch execution must generate a deterministic `batch_id` and track high-watermark timestamps.
- Transformations must be idempotent: re-executing batch `B` over input dataset `D` must yield identical state without duplicate records.
- Use upsert (`ON CONFLICT (natural_key) DO UPDATE`) or staging-swap patterns.

---

## 3. Step-by-Step Engineering Workflow

1. **Schema & Contract Definition:**
   - Define source input schemas and destination target entities before pipeline code.
   - Declare nullability, allowable value ranges, and type constraints.
2. **Ingestion & Watermark Retrieval:**
   - Query last successfully processed checkpoint (`watermark_timestamp`).
   - Fetch delta window: `WHERE ingested_at > last_watermark AND ingested_at <= current_batch_cutoff`.
3. **Transformation & Validation:**
   - Apply deterministic parsing and entity resolution.
   - Run in-flight contract assertions (null checks, foreign key existence).
4. **Atomic Ingestion Transaction:**
   - Write output inside an explicit database transaction.
   - Advance pipeline watermark in the same transaction.
5. **Observability Emission:**
   - Log records read, processed, quarantined, and processing elapsed duration.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Pipeline OOM / Crash** | Unbounded memory ingestion on massive batches. | Stream records in bounded chunks (1,000–5,000 records) using cursors or keyset pagination. |
| **Silent Duplicate Records** | Missing natural keys or non-idempotent insert statements. | Enforce database-level unique constraints and deterministic idempotency hashing. |
| **Schema Drift Disruption** | Source fields renamed, added, or type-shifted. | Parse with permissive schema evolution; quarantine unrecognized schemas to alert queue. |
| **Watermark Desynchronization** | Watermark advanced despite partial transaction failure. | Bundle watermark advancement in the same atomic database transaction as the record writes. |

---

## 5. Verification Checklist

- [ ] Raw ingestion preserves unmodified payload and SHA-256 hash.
- [ ] Pipeline re-run with identical input produces zero duplicates.
- [ ] Processing handles chunks via bounded memory (cursor/iterator).
- [ ] Failed records are logged with specific validation reasons and routed to quarantine.
- [ ] Watermark advances only upon verified transaction commit.

---

## 6. Primary References
- **Kimball Group Data Warehouse ETL Toolkit**: https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/
- **Martin Kleppmann (Designing Data-Intensive Applications)**: O'Reilly Media.
- **dbt Best Practices**: https://docs.getdbt.com/best-practices
