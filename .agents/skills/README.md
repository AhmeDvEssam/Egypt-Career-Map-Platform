# Egypt Career Map (Hire Q) — Agent Skills Ecosystem

This directory contains the central skills repository for all Antigravity agents operating on the **Egypt Career Map (Hire Q)** project.

All skills are governed by the canonical standard:
📄 [EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md](file:///d:/Hire%20Q%20Project/EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md)

---

## 1. Governance & Index Files

| File | Purpose |
|---|---|
| [`registry.yaml`](file:///d:/Hire%20Q%20Project/.agents/skills/registry.yaml) | Single Source of Truth for all registered skills, versions, licenses, and security review statuses. |
| [`agent-skill-mapping.yaml`](file:///d:/Hire%20Q%20Project/.agents/skills/agent-skill-mapping.yaml) | Defines the 12 specialized agent roles, required/optional skills, and write isolation boundaries. |
| [`slash-command-policy.md`](file:///d:/Hire%20Q%20Project/.agents/skills/slash-command-policy.md) | Platform command decision matrix (`/teamwork`, `/swarm`, `/boost`, `/plan`, `/goal`, etc.). |

---

## 2. Complete Skills Catalogue (25 Skills)

### A. Data Platform & Architecture
- [`ecm-data-engineering-pipelines`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-data-engineering-pipelines/SKILL.md) — Multi-stage ETL/ELT pipelines, staging, checkpointing, and schema evolution.
- [`ecm-postgresql-architecture`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-postgresql-architecture/SKILL.md) — Relational schema modeling, index selection, transaction isolation, and query tuning.
- [`ecm-data-quality-governance`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-data-quality-governance/SKILL.md) — Data contracts, validation layers, freshness monitoring, and PII masking.
- [`ecm-analytics-data-modeling`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-analytics-data-modeling/SKILL.md) — Kimball star schemas, fact grains, conformed dimensions, and SCD tracking.

### B. AI & Natural Language Processing
- [`ecm-hybrid-skill-extraction`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-hybrid-skill-extraction/SKILL.md) — Deterministic Aho-Corasick matching, taxonomy alias graphs, and strict LLM fallbacks.
- [`ecm-arabic-multilingual-nlp`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-arabic-multilingual-nlp/SKILL.md) — Egyptian Arabic dialect normalization, Unicode harmonization, and code-switching.
- [`ecm-nlp-evaluation`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-nlp-evaluation/SKILL.md) — Precision, recall, F1-scores, exact/partial span matching, and regression suites.

### C. Ingestion & Backend Systems
- [`ecm-web-ingestion-resilience`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-web-ingestion-resilience/SKILL.md) — Resilient scraping, robots compliance, rate limiting, and DOM drift defense.
- [`ecm-worker-reliability`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-worker-reliability/SKILL.md) — At-least-once queue delivery, transactional outbox JIT claims, and fencing tokens.
- [`ecm-api-backend-architecture`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-api-backend-architecture/SKILL.md) — REST API contracts, RFC 9457 Problem Details, and keyset pagination.

### D. Security & Reliability
- [`ecm-application-security`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-application-security/SKILL.md) — 3-stage SSRF egress policy, strict RFC 8259 JSON, and Ed25519 signatures.
- [`ecm-production-reliability`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-production-reliability/SKILL.md) — FMEA failure mode analysis, deadline propagation, circuit breaking, and SLO/SLI.
- [`security-audit`](file:///d:/Hire%20Q%20Project/.agents/skills/security-audit/SKILL.md) — Cloudflare coverage-led security audit methodology.
- [`skill-security`](file:///d:/Hire%20Q%20Project/.agents/skills/skill-security/SKILL.md) — Static AST scanner and regex analyzer for auditing AI agent skills.

### E. Frontend & Business Intelligence
- [`ecm-frontend-generative-ui`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-frontend-generative-ui/SKILL.md) — Next.js/React architecture, RTL Arabic layouts, and safe Generative UI.
- [`ecm-bi-market-intelligence`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-bi-market-intelligence/SKILL.md) — Demand share trends, median/IQR salary modeling, and geographic segmentation.
- [`career_intelligence`](file:///d:/Hire%20Q%20Project/.agents/skills/career_intelligence/SKILL.md) — 100-point Egypt Career Intelligence geospatial and metrics engine.

### F. Quality Assurance & Architecture Review
- [`ecm-architecture-quality-review`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-architecture-quality-review/SKILL.md) — ADR formulation, clean architecture dependency rules, and review gates.
- [`ecm-testing-verification`](file:///d:/Hire%20Q%20Project/.agents/skills/ecm-testing-verification/SKILL.md) — Deterministic test fixtures, concurrency race testing, and verification evidence.
- [`verification-before-completion`](file:///d:/Hire%20Q%20Project/.agents/skills/verification-before-completion/SKILL.md) — Iron Law: No completion claims without fresh verification evidence.
- [`requesting-code-review`](file:///d:/Hire%20Q%20Project/.agents/skills/requesting-code-review/SKILL.md) — Pre-merge review structuring.
- [`receiving-code-review`](file:///d:/Hire%20Q%20Project/.agents/skills/receiving-code-review/SKILL.md) — Technical review feedback evaluation.
- [`systematic-debugging`](file:///d:/Hire%20Q%20Project/.agents/skills/systematic-debugging/SKILL.md) — Hypothesis-driven bug investigation.
- [`writing-plans`](file:///d:/Hire%20Q%20Project/.agents/skills/writing-plans/SKILL.md) — Multi-step implementation planning.
- [`dispatching-parallel-agents`](file:///d:/Hire%20Q%20Project/.agents/skills/dispatching-parallel-agents/SKILL.md) — Parallel subagent orchestration.

---

## 3. Quality & Maintenance Rules

1. Every skill must have a valid `SKILL.md` with YAML frontmatter specifying `name` and `description`.
2. All additions or modifications must be validated using:
   ```bash
   python .agents/scripts/validate_skill_registry.py
   ```
3. External skills must be audited using `skill-security` scanner before being accepted into the registry.
