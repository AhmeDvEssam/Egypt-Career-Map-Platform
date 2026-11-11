---
name: ecm-postgresql-architecture
description: PostgreSQL relational architecture, schema modeling, indexing strategy, transaction isolation, query optimization, connection pooling, and zero-downtime migration standards for Egypt Career Map.
---

# ECM PostgreSQL Architecture & Performance Engineering

## 1. Domain Scope & Objectives
Governs relational database architecture, schema design, constraints, locking behaviors, query planning, indexing, and transactional integrity on PostgreSQL 15+ for Egypt Career Map.

### In-Scope
- Normalized and dimensional schema modeling (OLTP tables, analytical views).
- Index selection (B-tree, GIN for full-text/JSONB, BRIN for timeseries logs).
- Transaction isolation levels (`READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`) and locking patterns (`FOR UPDATE SKIP LOCKED`).
- Query execution plan analysis (`EXPLAIN (ANALYZE, BUFFERS)`), index scans vs sequential scans.
- Safe, non-blocking schema migrations (concurrent indexing, lock timeout safeguards).
- Connection pooling architecture (PgBouncer, Prisma pool tuning).

### Non-Goals
- ETL pipeline stage orchestration (see `ecm-data-engineering-pipelines`).
- Distributed database clustering or cross-datacenter consensus.

---

## 2. Technical Contracts & Standards

### Modeling & Constraint Rules
- Every table must have an explicit surrogate primary key (`uuid` or `bigserial`) or an immutable natural key.
- Foreign keys must declare explicit referential actions (`ON DELETE RESTRICT` or `ON DELETE CASCADE` where strictly justified).
- All timestamps must use `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`) stored in UTC.
- Use PostgreSQL ENUMs or lookup tables for closed state machines.

### Indexing Standards
- Foreign key columns must be indexed to prevent table-level locks during cascade/restrict checks.
- Text search on Arabic/English job titles/descriptions must use `GIN` indexes over `tsvector` or trigram indexes (`pg_trgm`).
- Heavy JSONB querying must utilize GIN path indexes (`USING gin (payload jsonb_path_ops)`).
- Add indexes concurrently in production: `CREATE INDEX CONCURRENTLY` with `lock_timeout = '2s'`.

### Concurrency & Locking
- Batch worker claiming must use `FOR UPDATE SKIP LOCKED` inside a short-lived transaction.
- Prevent lock queue starvation by setting `statement_timeout = '15s'` and `lock_timeout = '5s'` on migration sessions.
- Optimistic Concurrency Control (OCC) must be used on user-facing mutating entities using `version INT DEFAULT 1`.

---

## 3. Step-by-Step Query Optimization Workflow

1. **Capture Problem Query & Parameters:**
   - Obtain raw SQL and parameterized values.
2. **Execute Detailed Plan:**
   - Run `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT) <query>;`.
3. **Analyze Plan Bottlenecks:**
   - Look for `Seq Scan` on large tables (> 10k rows).
   - Check `Buffers: shared hit=... read=... dirtied=...` to assess I/O pressure.
   - Identify slow `Nested Loop` joins with high inner loop iterations; consider index or hash join.
   - Detect sort operations spilling to disk (`Sort Method: external merge Disk`).
4. **Formulate Optimization Hypothesis:**
   - Propose composite index covering filter + sort keys: `CREATE INDEX idx_name ON table (tenant_id, status, created_at DESC);`.
   - Rewrite correlated subqueries into `JOIN` or CTEs with `MATERIALIZED` / `NOT MATERIALIZED`.
5. **Verify Improvement:**
   - Re-run `EXPLAIN (ANALYZE, BUFFERS)` and verify execution time and buffer read reductions.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Lock Queue Blocking / Outage** | DDL migration acquires `ACCESS EXCLUSIVE` lock on active table. | Set `SET lock_timeout = '2s';` before DDL; retry with exponential backoff if lock cannot be acquired immediately. |
| **Worker Queue Lock Contention** | Multiple workers query without `SKIP LOCKED`, creating lock serializations. | Use `LIMIT 1 FOR UPDATE SKIP LOCKED` or partition queue workers across hash buckets. |
| **Connection Pool Exhaustion** | Unbounded connections opened by long-running HTTP requests or worker leaks. | Place PgBouncer in transaction mode in front of PostgreSQL; configure strict client connection pool limits. |
| **Bloat & Performance Degradation** | High-volume updates/deletes without vacuum tuning. | Tune autovacuum settings per table (`autovacuum_vacuum_scale_factor = 0.05`). |

---

## 5. Verification Checklist

- [ ] All foreign keys have supporting indexes.
- [ ] Timestamps explicitly use `TIMESTAMPTZ`.
- [ ] Longest running queries verified via `EXPLAIN (ANALYZE, BUFFERS)`.
- [ ] Schema changes use non-blocking patterns (`CREATE INDEX CONCURRENTLY`).
- [ ] Lock timeouts set on migration scripts to prevent connection pile-ups.

---

## 6. Primary References
- **PostgreSQL Official Documentation (v15/v16)**: https://www.postgresql.org/docs/current/
- **PostgreSQL Concurrency Control**: https://www.postgresql.org/docs/current/mvcc.html
- **Use The Index, Luke (Markus Winand)**: https://use-the-index-luke.com/
