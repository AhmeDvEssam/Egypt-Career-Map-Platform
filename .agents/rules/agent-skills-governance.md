---
description: Mandatory rules governing agent skills discovery, invocation, security review, and orchestration in the Egypt Career Map repository.
globs: **/*
alwaysApply: true
---

# Egypt Career Map — Agent Skills Governance Rule

This rule enforces strict operational standards for all AI agents working on the **Egypt Career Map (Hire Q)** codebase.

## 1. Governance Principles

1. **Canonical Standard Authority:**
   All work must comply with [EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md](file:///d:/Hire%20Q%20Project/EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md).
2. **Explicit Skill Loading:**
   Before an agent begins work in any domain (e.g., Data Engineering, NLP, Security, PostgreSQL), it must explicitly open, read, and apply the relevant `SKILL.md` from [`.agents/skills/`](file:///d:/Hire%20Q%20Project/.agents/skills/).
3. **No Fabricated Commands or Skills:**
   - Platform slash commands (`/teamwork`, `/swarm`, `/boost`, `/plan`, `/goal`, etc.) control orchestrator behavior.
   - Domain skills reside in `.agents/skills/<skill-name>/SKILL.md`.
   - Never claim a skill is "slash-invoked" unless supported by the active UI. Use direct file reading and verify execution evidence.
4. **Iron Law of Evidence:**
   No status, test pass, linter clean, or completion claim may be made without running a fresh command and providing verbatim output evidence.
5. **Security & Sandbox Isolation:**
   - Any external skill must undergo provenance and static security scanning via [`.agents/skills/skill-security/`](file:///d:/Hire%20Q%20Project/.agents/skills/skill-security/) before installation or trusting.
   - Do not circumvent access controls, bypass CAPTCHAs, or expose production credentials.
6. **Zero Unauthorized Git / Deployment Mutations:**
   - Do NOT execute `git commit` or `git push` without explicit user authorization.
   - Do NOT run destructive SQL operations (`DROP TABLE`, `ALTER TABLE ... DROP COLUMN`) or alter production environments.

## 2. Fast Navigation Links
- Skill Registry: [`.agents/skills/registry.yaml`](file:///d:/Hire%20Q%20Project/.agents/skills/registry.yaml)
- Agent Mapping: [`.agents/skills/agent-skill-mapping.yaml`](file:///d:/Hire%20Q%20Project/.agents/skills/agent-skill-mapping.yaml)
- Slash Command Policy: [`.agents/skills/slash-command-policy.md`](file:///d:/Hire%20Q%20Project/.agents/skills/slash-command-policy.md)
