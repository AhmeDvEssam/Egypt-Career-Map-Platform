---
name: ecm-production-reliability
description: Production reliability engineering, failure mode analysis, graceful degradation, circuit breaking, observability (SLO/SLI), and incident runbooks for Egypt Career Map.
---

# ECM Production Reliability & Failure Mode Engineering

## 1. Domain Scope & Objectives
Governs production operational resilience, high-availability architecture, failure mode and effects analysis (FMEA), service level objectives (SLO/SLI), health checks, and disaster recovery procedures for Egypt Career Map.

### In-Scope
- Failure mode analysis: identifying single points of failure (SPOF) and cascading failure risks.
- Timeout budgets and deadline propagation across service hops.
- Circuit breaking, bulkheading, and load shedding under heavy load.
- Graceful degradation: serving stale cached data or reduced features when downstream dependencies fail.
- Health check architecture (`/healthz/liveness` vs `/healthz/readiness`).
- Observability standard: metrics, structured logs with trace IDs, and operational incident runbooks.

### Non-Goals
- Background queue retry loops (see `ecm-worker-reliability`).
- Database index optimization (see `ecm-postgresql-architecture`).

---

## 2. Technical Contracts & Standards

### Health Check Standard
1. **Liveness Probe (`/healthz/liveness`):**
   - Returns HTTP 200 if the process event loop is responsive and memory is within limits.
   - Does NOT check external dependencies (DB, Redis, SIEM).
   - If liveness fails, orchestrator (Kubernetes / Docker) restarts the container.
2. **Readiness Probe (`/healthz/readiness`):**
   - Returns HTTP 200 only if all critical dependencies (PostgreSQL pool, essential queues) are accessible.
   - If readiness fails, load balancer stops routing user traffic to this instance.

### Timeout Budgeting & Deadline Propagation
- Every request entering the system must carry an end-to-end deadline (default: 10,000 ms).
- Downstream sub-operations must allocate a fraction of the remaining budget:
  $$T_{\text{op}} = \min(T_{\text{default\_op}}, T_{\text{remaining\_deadline}} - T_{\text{margin}})$$
- Never execute an operation without an explicit timeout; infinite hangs exhaust process threads.

### Graceful Degradation Patterns
- If the AI/NLP enrichment service is degraded:
  * Ingest job posting without enrichment; mark `enrichment_status = 'PENDING'`.
  * Return un-enriched job details to UI with a `partial_data: true` flag.
- If PostgreSQL analytical replica is slow:
  * Fall back to serving pre-computed Redis cache or summary estimates.

---

## 3. Step-by-Step Resilience Engineering Workflow

1. **Failure Mode Mapping:**
   - Map each external dependency (PostgreSQL, Redis, Scrapers, LLM APIs).
   - Define exact behavior when dependency is: completely down, high-latency (timeout), or returning garbage.
2. **Implement Bulkheading & Timeouts:**
   - Isolate thread/connection pools per dependency.
   - Attach explicit timeout timers to all network calls.
3. **Configure Circuit Breakers:**
   - Set threshold (e.g., 50% failure rate over 20 requests).
   - Trip to `OPEN` to give dependency recovery breathing room.
4. **Define SLOs & Error Budgets:**
   - Service Availability SLO: 99.5% successful responses per calendar month.
   - p95 Latency SLO: < 500 ms for search and profile queries.
5. **Runbook Documentation:**
   - Document triage steps, diagnostic queries, and rollback commands for each failure scenario.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Cascading System Outage** | Slow external API causes backend worker threads to hang, exhausting connection pools. | Enforce strict timeouts on external calls; bulkhead worker pools. |
| **Thundering Herd on Cache Expiry** | High-traffic cache key expires; hundreds of queries hit database simultaneously. | Implement probabilistic early expiration (XFetch) or single-flight mutex locking. |
| **Silent Queue Backup** | Workers slowly falling behind incoming traffic; backlog grows undetected. | Alert on queue age (oldest uncompleted item) rather than just queue length. |
| **False Restart Cascades** | Liveness probe checks database; when DB slows down, all app containers restart simultaneously. | Never check external dependencies in liveness probes; use readiness probes. |

---

## 5. Verification Checklist

- [ ] Liveness probe decoupled from external dependency status.
- [ ] Readiness probe verifies database and cache connectivity.
- [ ] All outbound calls enforce explicit timeout budgets.
- [ ] Degradation paths return partial/cached results instead of crashing user flows.
- [ ] Operational runbook exists with explicit triage and rollback steps.

---

## 6. Primary References
- **Google Site Reliability Engineering (SRE) Books**: https://sre.google/sre-book/table-of-contents/
- **Release It! (Michael T. Nygard)**: Design and Deploy Production-Ready Software.
- **The Twelve-Factor App**: https://12factor.net/
