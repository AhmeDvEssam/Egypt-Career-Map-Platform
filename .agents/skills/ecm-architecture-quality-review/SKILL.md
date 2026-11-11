---
name: ecm-architecture-quality-review
description: Architecture decision records (ADRs), boundary integrity, dependency direction, failure-mode review, and technical approval gates for Egypt Career Map.
---

# ECM Architecture Quality Review & Technical Decision Standards

## 1. Domain Scope & Objectives
Governs architectural reviews, boundary integrity verification, dependency management, Architecture Decision Records (ADRs), and technical sign-off gates across Egypt Career Map milestones.

### In-Scope
- Architecture Decision Records (ADR) formulation, review, and lifecycle (`PROPOSED`, `ACCEPTED`, `SUPERSEDED`, `REJECTED`).
- Clean Architecture & Dependency Rule enforcement (dependencies point inward; domain logic decoupled from frameworks and DB drivers).
- Bounded Context boundaries and inter-service interfaces (Data Engineering vs Ingestion vs Frontend vs ML).
- Technical risk classification (P0 Blockers, P1 High Risk, P2 Medium, P3 Hygiene).
- Evidence-based architecture approval gates: verifying claims against actual code, schemas, and tests.

### Non-Goals
- Detailed line-by-line security penetration testing (see `ecm-application-security` and `security-audit`).
- Low-level database index optimization (see `ecm-postgresql-architecture`).

---

## 2. Technical Contracts & Standards

### The Architecture Decision Record (ADR) Contract
Every significant architectural choice (e.g., choosing Transactional Outbox over direct SIEM calls, adopting bitwise LPM over regex IP parsing) must be recorded in an ADR containing:
1. **Title & Status:** `ADR-XXX: <Title>`, Status: `ACCEPTED`, Date.
2. **Context:** Problem statement, forces, and constraints.
3. **Decision:** Explicit technical approach adopted.
4. **Consequences:** Positive benefits, negative trade-offs, and residual risks.
5. **Alternative Solutions Considered & Rejected:** Reasons why alternative options were ruled out.

### The Dependency Direction Rule
- Core business entities and domain models must have zero dependencies on infrastructure frameworks (Prisma, Express, Scrapy, Next.js).
- Inward dependency flow: `Frameworks & Drivers` -> `Interface Adapters (Controllers/Repositories)` -> `Application Services` -> `Domain Entities`.

---

## 3. Step-by-Step Architecture Review Workflow

1. **Scope & Blueprint Inspection:**
   - Review architectural specification or blueprint document.
   - Verify alignment with [EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md](file:///d:/Hire%20Q%20Project/EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md).
2. **Boundary & Dependency Mapping:**
   - Trace imports across package boundaries.
   - Check for circular dependencies or domain logic leaking into UI/Scraper layers.
3. **Failure Mode & Concurrency Audit:**
   - Challenge concurrency claims (e.g., race conditions, lock persistence, lease renewals, split-brain scenarios).
   - Evaluate network partition and database disconnection behaviors.
4. **Evidence-Based Claim Verification:**
   - Verify every technical claim against physical source lines and executable tests.
   - Mark unsupported claims as `UNVERIFIED` or `DEFECT`.
5. **Verdict Formulation:**
   - Deliver one of three verdicts:
     * `APPROVED`: Zero blockers, verified evidence for all claims.
     * `APPROVED WITH REVISIONS`: Core design sound; concrete non-blocking revisions required.
     * `BLOCKED / NOT APPROVED`: Unresolved P0 blockers, critical concurrency races, or unverified claims.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Architecture-Implementation Drift** | Architecture document claims a design feature (e.g., JIT claiming) that is implemented differently in code. | Run independent code audits comparing specification directly against AST/source code. |
| **Premature Approval** | Approving design based on author's assertions without verifying executable test evidence. | Enforce `verification-before-completion`: require passing commands with verbatim output before approval. |
| **Uncontrolled Leaky Abstractions** | Database ORM models passed directly to frontend templates, coupling DB schema to UI. | Enforce Data Transfer Objects (DTOs) and API view models at service boundaries. |

---

## 5. Verification Checklist

- [ ] New architectural decisions documented in formal ADR format.
- [ ] Dependencies point inward toward core domain models; zero circular imports.
- [ ] Concurrency and failure modes analyzed with explicit mitigations.
- [ ] All critical architectural claims supported by physical code and test evidence.
- [ ] Clear verdict rendered with categorized findings and reproduction scenarios.

---

## 6. Primary References
- **Architecture Decision Records (Michael Nygard format)**: https://adr.github.io/
- **Clean Architecture: A Craftsman's Guide to Software Structure (Robert C. Martin)**: Prentice Hall.
- **Fundamentals of Software Architecture (Mark Richards & Neal Ford)**: O'Reilly Media.
