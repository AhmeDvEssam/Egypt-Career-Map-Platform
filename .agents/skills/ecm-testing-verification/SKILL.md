---
name: ecm-testing-verification
description: Multi-tier testing strategy, deterministic test fixtures, concurrency testing, metamorphic testing, and reproducible verification evidence for Egypt Career Map.
---

# ECM Testing Strategy & Evidence-Based Verification Standards

## 1. Domain Scope & Objectives
Governs testing strategy, fixture management, test isolation, concurrency testing, and empirical evidence gathering across Python and TypeScript/Node.js codebases in Egypt Career Map. Complements the installed `verification-before-completion` skill.

### In-Scope
- Testing pyramid standards: Unit Tests, Integration Tests, End-to-End (E2E) Workflow Tests, Concurrency Race Condition Tests.
- Deterministic test fixtures: isolated databases, transaction rollback sandboxes, mocked external networks, synthetic datasets.
- Concurrency & race testing: multi-worker execution, latch synchronization, lock contention validation.
- Fault injection: simulated network timeouts, unexpected socket terminations, database deadlocks.
- Test hygiene: zero test pollution, clean `beforeEach` / `afterEach` isolation, strict assertions.
- Reproducible execution: capturing exact terminal commands, durations, and verbatim passing outputs.

### Non-Goals
- NLP statistical accuracy benchmarking (see `ecm-nlp-evaluation`).
- Third-party skill security auditing (see `skill-security`).

---

## 2. Technical Contracts & Standards

### The Iron Law of Verification
```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```
- Passing tests from a prior run or previous conversation turn do NOT constitute proof of current correctness.
- The verification command must be executed in the current session, and its output must show 0 failures, 0 errors, and non-zero executed tests.

### Test Isolation & Non-Destructive Principles
1. **Zero Production Mutation:**
   - Tests must run against local test containers or local development databases (`egypt_jobs_db`).
   - Tests must NEVER target production or staging databases.
2. **State Cleanliness:**
   - Tests creating database rows must delete created records in `afterEach` / `after` hooks or wrap operations in rollbacked transactions.
   - Use unique random UUIDs for test aggregates to prevent collision with existing data.

---

## 3. Step-by-Step Test Engineering Workflow

1. **Test Plan Formulation:**
   - Identify target behavior, positive happy path, negative boundary conditions, and failure modes.
2. **Deterministic Fixture Setup:**
   - Prepare clean input fixtures (synthetic job postings, test user accounts, ephemeral directory paths).
3. **Execution with Native Test Runners:**
   - In Node.js: use native runner `node --test --experimental-strip-types` with `--env-file=.env`.
   - In Python: use `unittest` or `pytest` running isolated test discovery.
4. **Strict Assertion Verification:**
   - Assert specific error types and exact error messages (do not use generic `.catch(() => {})`).
   - For concurrency tests, assert metric counters (e.g., `auditOutboxClaimConflictTotal.get() == prev + 1`).
5. **Evidence Capture:**
   - Record exact command line string, duration, executed count, pass count, failure count, and exit code.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Test State Pollution** | Test 1 leaves uncommitted rows that cause Test 2 to fail unexpectedly. | Clear test aggregates in `beforeEach` hooks: `DELETE FROM table WHERE aggregate_id = ...`. |
| **Masked False Positives** | Test expects error and catches timeout instead of the intended assertion failure. | Assert specific error class and regex on message: `assert.rejects(..., /specific error message/)`. |
| **Flaky Concurrency Tests** | Using arbitrary `setTimeout(r, 50)` instead of deterministic synchronization latches. | Use `Promise` release triggers or synchronization barriers to coordinate concurrent threads. |
| **Mock Drift** | Mocked service behavior diverges from real production API behavior. | Periodically validate mocks against contract tests and real response snapshots. |

---

## 5. Verification Checklist

- [ ] Every new feature or bug fix has corresponding automated test coverage.
- [ ] Tests run against local development/test environments only.
- [ ] Concurrency tests verify synchronization using deterministic promises/latches.
- [ ] Tests clean up state (files, DB records) in `after` hooks.
- [ ] Execution command, exit code, and test counts recorded verbatim as evidence.

---

## 6. Primary References
- **Google Testing Blog (Testing on the Toilet series)**: https://testing.googleblog.com/
- **Node.js Native Test Runner Documentation**: https://nodejs.org/api/test.html
- **Python unittest Framework**: https://docs.python.org/3/library/unittest.html
