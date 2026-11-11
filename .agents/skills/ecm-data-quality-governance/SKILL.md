---
name: ecm-data-quality-governance
description: Data quality contracts, automated validation layers, lineage tracking, freshness monitoring, PII minimization, and data governance standards for Egypt Career Map datasets.
---

# ECM Data Quality, Lineage & Governance

## 1. Domain Scope & Objectives
Establishes verifiable data quality gates, strict data contracts, lineage tracking, and compliance standards across all scraped and processed job records in Egypt Career Map.

### In-Scope
- Declarative Data Contracts: schema definitions, valid categorical ranges, non-nullable invariants.
- Automated Data Quality Checks: Completeness, Uniqueness, Timeliness/Freshness, Validity, Consistency.
- End-to-end data lineage and provenance metadata.
- PII detection and minimization (phone numbers, personal emails, national IDs in job postings).
- Quarantine workflows, alert escalation, and remediation audits for corrupt data batches.

### Non-Goals
- Database schema DDL creation (see `ecm-postgresql-architecture`).
- Linguistic normalization of Arabic text (see `ecm-arabic-multilingual-nlp`).

---

## 2. Technical Contracts & Standards

### The Five Dimensions of Labor Data Quality
1. **Completeness:** Mandatory fields (job title, employer name, location, source URL, posted date) must never be NULL or whitespace.
2. **Uniqueness:** Deduplication contracts based on composite fingerprint `SHA-256(canonical_employer + canonical_title + canonical_location + posted_date)`.
3. **Validity:**
   - Salaries must adhere to realistic Egyptian Pound (EGP) or foreign currency ranges (min salary >= 0; max salary >= min salary).
   - Experience requirements must be within plausible bounds (0–30 years).
   - URLs must be well-formed HTTP/HTTPS strings without credentials.
4. **Freshness:** Pipeline watermark must alert if raw scrape ingestion lags behind expected scraping frequency by > 24 hours.
5. **Consistency:** Skill references in job postings must resolve to canonical taxonomy entries.

### PII Minimization Rules
- Job descriptions scraped from informal sources often contain recruiters' personal mobile numbers or personal emails.
- Regex scrubbing must mask Egyptian mobile numbers (`/(?:\+?20\|0)?1[0125]\d{8}/`) and personal email addresses before analytical promotion.

---

## 3. Step-by-Step Governance Workflow

1. **Contract Declaration:**
   - Define data contracts in JSON Schema, Pydantic, or Great Expectations suites.
2. **Pre-Ingestion Contract Gate:**
   - Run validation on incoming batch before DB writes.
   - Separate passing records from failing records.
3. **Quarantine Routing:**
   - Write failing records to a `quarantined_records` table along with:
     * `batch_id`
     * `rejection_code` (e.g., `ERR_INVALID_SALARY_RANGE`, `ERR_MISSING_MANDATORY_FIELD`)
     * `raw_payload`
     * `timestamp`
4. **Lineage Header Attachment:**
   - Attach lineage metadata to passing records: `source_scraper_version`, `transformation_pipeline_version`, `ingested_at`.
5. **Quality Metric Emission:**
   - Emit pass-ratio metrics: `records_passed / (records_passed + records_quarantined)`.
   - Alert engineering on-call if pass ratio drops below 95%.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Silent Data Corruption** | Missing assertions allow null salaries or corrupted dates into Gold tables. | Hard-fail pipeline batches if critical invariant failure exceeds 2% threshold. |
| **Quarantine Bloat** | Scraper changes format, sending 100% of records to quarantine. | Implement circuit breakers: abort batch and alert if failure rate > 20% in first 500 records. |
| **PII Leakage** | Recruiter personal contact information stored in public analytics. | Run automated regex scrubber in Staging before promotion to Gold. |
| **Lineage Breakage** | Downstream analytics cannot trace back to source raw document. | Enforce immutable `raw_document_id` foreign key throughout all dimensional tables. |

---

## 5. Verification Checklist

- [ ] Data contract defines nullability, value ranges, and types for all target columns.
- [ ] PII scrubber replaces Egyptian phone numbers and personal emails with `[REDACTED]`.
- [ ] Quarantine table captures rejected records with explicit error reasons.
- [ ] Automated freshness check triggers alerts on stale pipeline watermarks.
- [ ] Quality pass/fail ratios are exported to monitoring metrics.

---

## 6. Primary References
- **Great Expectations Core Documentation**: https://docs.greatexpectations.io/
- **Data Contracts by Chad Sanderson**: https://datacontracts.com/
- **ISO 8000 (Data Quality Standards)**: International Organization for Standardization.
