---
name: ecm-application-security
description: Application security standards, threat modeling, SSRF egress controls, prototype pollution defenses, strict RFC 8259 parsing, cryptographic verification, and session hardening for Egypt Career Map.
---

# ECM Application Security & Trust Boundary Standards

## 1. Domain Scope & Objectives
Governs application-layer security architecture, threat modeling, boundary validation, and defensive programming standards for Egypt Career Map services, web applications, and background processors.

### In-Scope
- Server-Side Request Forgery (SSRF) defenses: IP classification, IANA special registry validation, bitwise longest prefix match (LPM), physical socket pinning, sticky HTTPS, redirect re-validation.
- Strict RFC 8259 JSON parsing: rejecting prototype pollution (`Object.create(null)`), duplicate keys, non-RFC whitespace, and non-compliant number grammar.
- Cryptographic standards: Ed25519 signature verification, RFC 8785 canonical JSON serialization (JCS), constant-time comparisons, secure nonce generation and replay protection.
- Session isolation and privilege escalation defenses: token versioning, dual-control administrative recovery, TOCTOU-free credential file reading.
- Secure secret management and zero-hardcoded secrets enforcement.

### Non-Goals
- Generic external pentesting methodologies (rely on installed `security-audit`).
- Auditing third-party agent skills (rely on installed `skill-security`).

---

## 2. Technical Contracts & Standards

### The 3-Stage SSRF Egress Defense Model
Any outbound network connection initiated by the application (e.g., webhook dispatch, URL unfurling, metadata scraping) must execute through the hardened 3-stage pipeline:
1. **Stage 1 — IANA Allocation Classification:**
   - Unpack IP address literal.
   - For IPv4: verify first octet belongs to an active RIR allocation (`isAllocatedRirUnicast = true`).
   - For IPv6: execute bitwise Longest Prefix Match (LPM) across all 51 IANA allocations. Reject unallocated space (`Default Deny`).
2. **Stage 2 — Special-Purpose Registry Evaluation:**
   - Query IPv4 / IPv6 Special-Purpose Registries.
   - Reject non-globally reachable, destination-restricted, or protocol-reserved blocks.
   - Apply explicit Deny Overrides for AS112 sinkholes, AMT, NAT64, and documentation prefixes.
3. **Stage 3 — Application Egress Policy Engine:**
   - Enforce protocol restrictions (`http:` or `https:` only).
   - Enforce port restrictions (port 80 for HTTP, port 443 for HTTPS).
   - Reject URL credentials (`username:password@`).
   - Connect via raw TCP socket pinned to validated IP; check physical endpoint (`socket.remoteAddress === pinnedIp`).
   - Enforce sticky HTTPS (prohibit redirect downgrade to HTTP) and maximum 3 redirect hops with full re-validation.

### Strict JSON & Prototype Pollution Defense
- All security-sensitive JSON payloads (assertions, tokens, webhooks) must be parsed via a strict parser:
  * Prototype pollution defense: construct objects via `Object.create(null)`.
  * Duplicate key rejection: detect and reject duplicate keys across all nesting levels.
  * RFC 8259 Section 2 whitespace: strictly allow 0x20, 0x09, 0x0A, 0x0D.
  * RFC 8259 Section 6 numbers: reject leading zeros (`01`) and trailing decimals (`1.`).

---

## 3. Step-by-Step Security Review Workflow

1. **Identify External Trust Boundaries:**
   - Map untrusted inputs (query parameters, request bodies, external URLs, operator assertions).
2. **Verify Input Sanitation & Parsing:**
   - Ensure strict parser is utilized rather than ambient `JSON.parse`.
   - Verify schemas reject unknown fields.
3. **Audit Outbound Connections:**
   - Verify outbound HTTP calls use pinned socket transport (`executeSecureFetch` from `ssrfTransport.ts`).
   - Verify `socket.remoteAddress` is verified before sending payload bytes.
4. **Inspect Authentication & State Mutations:**
   - Ensure mutating queries check user/tenant IDs to prevent IDOR.
   - Verify cryptographic tokens are signed with Ed25519 and verified over canonical RFC 8785 strings.
5. **Secrets & Logging Audit:**
   - Verify zero plaintext secrets in source code, logs, or Git history.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **SSRF via DNS Rebinding** | IP checked at DNS resolution time, but socket connects to newly resolved private IP. | Pin the physical socket directly to the validated IP literal (`net.connect({ host: pinnedIp })`). |
| **Prototype Pollution** | Untrusted JSON key `__proto__` pollutes `Object.prototype`. | Parse into null-prototype objects (`Object.create(null)`); reject prototype keys. |
| **TOCTOU Credential Hijack** | File permissions checked by path before opening; attacker replaces file with symlink. | Open file descriptor first with `O_NOFOLLOW`; execute `fstat` and reads on the open descriptor. |
| **Nonce Replay** | Operator recovery token reused by malicious insider. | Consume nonces atomically inside a database transaction with a unique primary key constraint. |

---

## 5. Verification Checklist

- [ ] All outbound HTTP requests use pinned socket transport with endpoint check.
- [ ] Strict JSON parser rejects duplicate keys, Unicode whitespace, and prototype pollution.
- [ ] Cryptographic signatures verified over RFC 8785 canonical UTF-16 sorted strings.
- [ ] Credentials files inspected via open file descriptors with strict 0600 permissions.
- [ ] Database updates check user ownership to prevent IDOR.

---

## 6. Primary References
- **RFC 8259 (The JavaScript Object Notation Data Interchange Format)**: IETF (2017).
- **RFC 8785 (JSON Canonicalization Scheme - JCS)**: IETF (2020).
- **OWASP Top 10 Application Security Risks (2021)**: https://owasp.org/Top10/
- **OWASP Server-Side Request Forgery Prevention Cheat Sheet**: https://cheatsheetseries.owasp.org/
