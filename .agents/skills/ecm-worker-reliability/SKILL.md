---
name: ecm-worker-reliability
description: Asynchronous worker reliability, queue semantics, transactional outbox/inbox patterns, idempotency, distributed leasing, and dead-letter handling for Egypt Career Map.
---

# ECM Asynchronous Worker & Queue Reliability Standards

## 1. Domain Scope & Objectives
Governs the architecture, execution, and state machines of asynchronous background workers, queue consumers, transactional outbox dispatchers, and scheduled cron jobs across Egypt Career Map.

### In-Scope
- Delivery semantics: At-Least-Once delivery guarantees, receiver-side deduplication, idempotency keys.
- Distributed leasing: heartbeats, lease timeouts, per-task fencing tokens, zombie execution prevention.
- Atomic state transitions: `PENDING` -> `PROCESSING` -> `COMPLETED` / `FAILED` / `DEAD_LETTER`.
- Concurrent job claiming: PostgreSQL `FOR UPDATE SKIP LOCKED` and partition hashing.
- Failure classification: transient errors (retryable with backoff) vs fatal poison pills (immediate quarantine).
- Graceful worker shutdown: signal trapping (`SIGTERM`, `SIGINT`), draining in-flight tasks, lease renewal.

### Non-Goals
- PostgreSQL connection pool tuning (see `ecm-postgresql-architecture`).
- Application HTTP endpoints (see `ecm-api-backend-architecture`).

---

## 2. Technical Contracts & Standards

### The At-Least-Once Delivery & Deduplication Contract
1. **At-Least-Once Baseline:**
   - In distributed systems, network partitions or worker crashes during acknowledgement mean messages may be re-delivered.
   - Senders must NEVER promise Exactly-Once delivery without receiver-side deduplication.
2. **Idempotency Keys:**
   - Every queued task or outbox event must carry a deterministic 64-character SHA-256 idempotency key:
     $$\text{Key} = \text{SHA-256}(\text{TaskType} + \text{AggregateID} + \text{DeterministicPayloadSnapshot})$$
   - Consumers must verify against a unique index on `idempotency_key` or cache processed keys in atomic storage.

### Distributed Leasing & Fencing Tokens
- Worker claims task with a finite lease: `locked_until = NOW() + INTERVAL '30 seconds'`.
- Each claim assigns a fresh UUID `claim_token` (fencing token).
- All status transitions (`COMPLETED`, `FAILED`, lease renewal) must be conditional:
  ```sql
  UPDATE task_queue
  SET status = 'COMPLETED', locked_until = NULL, claim_token = NULL
  WHERE id = :taskId
    AND status = 'PROCESSING'
    AND claim_token = :workerClaimToken
    AND locked_until > NOW();
  ```
- If the update affects 0 rows, the worker has lost its lease; it must abort and discard results to prevent split-brain updates.

---

## 3. Step-by-Step Worker Processing Loop

1. **JIT Task Claiming:**
   - Claim exactly 1 task (or a small bounded batch) using `FOR UPDATE SKIP LOCKED`.
   - Record `worker_id`, `claim_token`, and `locked_until`.
2. **Heartbeat Maintenance:**
   - For long-running tasks (> 10s), spawn a background timer that executes `renewLease()` every $\frac{1}{3}$ of lease duration.
3. **Execution & Boundary Trapping:**
   - Wrap task execution in `try / catch`.
   - Set task deadline timer (e.g., 5s timeout on external network calls).
4. **Conditional State Transition:**
   - If success: transition to `COMPLETED` verifying `claim_token` and `locked_until > NOW()`.
   - If failure: classify error. If `attempt_count < MAX_RETRIES`, schedule exponential backoff; otherwise transition to `DEAD_LETTER`.
5. **Clean Exit on Shutdown:**
   - On `SIGTERM`, cease claiming new tasks.
   - Await current in-flight task completion within grace period (e.g., 10s).
   - If grace period expires, allow lease to expire naturally so other workers can claim.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Zombie Execution / Split-Brain** | Worker hangs or GC pauses; lease expires; second worker claims; first worker finishes and overwrites newer state. | Enforce per-event UUID fencing tokens (`claim_token`) and conditional updates checking `locked_until > NOW()`. |
| **Poison Pill Loop** | Corrupt task crashes worker repeatedly, triggering infinite retries. | Increment `attempt_count` upon claim; escalate to `DEAD_LETTER` after 5 failed attempts. |
| **Head-of-Line Blocking** | A large batch claimed at once holds up later urgent tasks. | Just-In-Time (JIT) claiming: claim 1 task at a time (`LIMIT 1`). |
| **Silent Job Loss** | Worker killed before recording failure state. | Background reaper / reconciliation worker scans tasks where `status = 'PROCESSING' AND locked_until < NOW()`. |

---

## 5. Verification Checklist

- [ ] Task claiming uses atomic CTE with `LIMIT 1 FOR UPDATE SKIP LOCKED`.
- [ ] Task completion query verifies matching `claim_token` and valid `locked_until`.
- [ ] Idempotency key uniqueness enforced at database schema level.
- [ ] Heartbeat renewal prevents lease expiration during valid long tasks.
- [ ] Poison pill tasks escalate to `DEAD_LETTER` after maximum attempts (e.g., 5).
- [ ] Process traps `SIGTERM` and completes active tasks gracefully.

---

## 6. Primary References
- **Martin Kleppmann (Making Sense of Stream Processing)**: O'Reilly Media.
- **Designing Distributed Systems (Brendan Burns)**: Patterns for batch processing.
- **Transactional Outbox Pattern**: https://microservices.io/patterns/data/transactional-outbox.html
