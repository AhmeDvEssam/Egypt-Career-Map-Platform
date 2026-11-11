---
name: ecm-api-backend-architecture
description: REST/RPC API architecture, request validation, tenant/session isolation, error contracts, rate limiting, and backward compatibility for Egypt Career Map services.
---

# ECM API Backend Architecture & Service Standards

## 1. Domain Scope & Objectives
Governs the architecture, contracts, input validation, authentication context propagation, rate limiting, and lifecycle of backend APIs serving Egypt Career Map web, mobile, and analytical clients.

### In-Scope
- Strict API input validation (Zod / Pydantic schemas) and JSON parsing defenses.
- Authentication and session isolation: JWT / session validation, user token versioning, tenant boundary enforcement.
- Standardized error contracts (RFC 7807 / RFC 9457 Problem Details for HTTP APIs).
- Keyset / cursor-based pagination for high-volume endpoints (jobs, skills, search).
- Rate limiting, client IP extraction defenses, and DDoS protection headers.
- Backwards-compatible versioning and API deprecation policies.

### Non-Goals
- Background queue consumers and outbox dispatchers (see `ecm-worker-reliability`).
- Network-level SSRF transport pinning (see `ecm-application-security`).

---

## 2. Technical Contracts & Standards

### Standard Error Response Contract (RFC 9457)
All error responses (4xx, 5xx) must adhere to a uniform structure:
```json
{
  "type": "https://api.hireq.online/errors/invalid-parameters",
  "title": "Invalid Request Parameters",
  "status": 400,
  "detail": "The 'experience_years' parameter must be an integer between 0 and 30.",
  "instance": "/api/v1/jobs/search",
  "code": "ERR_INVALID_PARAM",
  "traceId": "req_01j7bc9k...",
  "errors": [
    { "field": "experience_years", "message": "Expected integer <= 30, received 99" }
  ]
}
```

### Pagination Contract (Cursor-Based)
- Never use deep `OFFSET` pagination for large tables (`SELECT ... LIMIT 20 OFFSET 50000` causes full index/heap scans).
- Use deterministic keyset pagination:
  ```sql
  SELECT id, title, company_name, created_at
  FROM jobs
  WHERE (created_at, id) < (:lastCreatedAt, :lastId)
  ORDER BY created_at DESC, id DESC
  LIMIT :pageSize;
  ```
- Return opaque `next_cursor` token encoding `base64(created_at + ":" + id)`.

### Authentication & Tenant Isolation
- Validate user session / token version on every authenticated request.
- Check authorization at the data query level (e.g., `WHERE user_id = :authenticatedUserId`) to eliminate Insecure Direct Object References (IDOR).

---

## 3. Step-by-Step API Route Implementation Workflow

1. **Schema & Route Declaration:**
   - Define input schema (headers, params, query, body) using strict type schemas.
   - Reject unexpected properties (`strip` or `strict` mode in validation).
2. **Authentication & Authorization Context:**
   - Extract and verify token / session.
   - Attach verified `UserContext` (`userId`, `role`, `tenantId`, `tokenVersion`) to request lifecycle.
3. **Execution & Service Boundary:**
   - Route business logic to isolated domain service or repository.
   - Never write raw SQL directly inside HTTP route controllers.
4. **Error Handling & Normalization:**
   - Catch domain exceptions and map to RFC 9457 status codes.
   - Redact stack traces and internal database errors before returning to client.
5. **Observability & Logging:**
   - Log request completion: `method`, `route`, `status`, `duration_ms`, `traceId`.
   - Never log secrets, passwords, or PII.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **IDOR Vulnerabilities** | Route accepts `:id` parameter and updates without verifying user ownership. | Always scope mutating queries with `WHERE id = :id AND user_id = :authUserId`. |
| **Deep Offset DoS** | Malicious crawler requests `?page=100000`, exhausting database CPU/IO. | Replace offset pagination with keyset/cursor pagination; enforce max `pageSize = 100`. |
| **Information Disclosure** | Database error or stack trace returned in JSON body on 500 error. | Centralize error handler; map internal exceptions to generic "Internal Server Error" with traceId. |
| **Mass Assignment** | Request body passed directly to ORM `.create()` without schema filtering. | Use explicit schema validation to whitelist allowed write attributes. |

---

## 5. Verification Checklist

- [ ] All inputs validated via strict schema before controller execution.
- [ ] Mutating endpoints enforce user/tenant boundaries at query level.
- [ ] List endpoints use keyset / cursor pagination instead of deep offsets.
- [ ] Errors follow uniform RFC 9457 structure with safe, redacted messages.
- [ ] Sensitive fields (passwords, tokens, PII) excluded from logs.

---

## 6. Primary References
- **RFC 9457 (Problem Details for HTTP APIs)**: Internet Engineering Task Force (2023).
- **OWASP REST Security Cheat Sheet**: https://cheatsheetseries.owasp.org/
- **Google Cloud API Design Guide**: https://cloud.google.com/apis/design
