# Egypt Career Map (Hire Q) — Agent Operating Standard

Welcome to the **Egypt Career Map / Hire Q** engineering workspace.

All autonomous agents, pair programming sessions, and human reviewers operating within this repository are governed by the canonical standard:
📄 [EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md](file:///d:/Hire%20Q%20Project/EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md)

---

## Quick Reference for Agents

### 1. Agent Skills Registry & Governance
- **Central Skill Registry:** [`.agents/skills/registry.yaml`](file:///d:/Hire%20Q%20Project/.agents/skills/registry.yaml)
- **Agent-to-Skill Mapping:** [`.agents/skills/agent-skill-mapping.yaml`](file:///d:/Hire%20Q%20Project/.agents/skills/agent-skill-mapping.yaml)
- **Governance Rules:** [`.agents/rules/agent-skills-governance.md`](file:///d:/Hire%20Q%20Project/.agents/rules/agent-skills-governance.md)
- **Slash-Command Selection Policy:** [`.agents/skills/slash-command-policy.md`](file:///d:/Hire%20Q%20Project/.agents/skills/slash-command-policy.md)

### 2. Core Operational Principles
1. **Evidence Before Assertions:** Never claim that an operation, test, or migration succeeded without executing the fresh verification command and reviewing its exit code and output.
2. **Skill Invocation vs Slash Commands:** Platform slash commands (`/teamwork`, `/swarm`, `/boost`, `/plan`, `/goal`) govern execution topology. Domain skills (`.agents/skills/<name>/SKILL.md`) govern technical methodology. Always read the assigned `SKILL.md` before executing work.
3. **Zero Unauthorized Commits / Pushes:** Never run `git commit` or `git push` unless explicitly instructed with an authorized human approval gate.
4. **Non-Destructive Database Operations:** Migrations must preserve data integrity (`CREATE TABLE IF NOT EXISTS`, `ON DELETE RESTRICT`) and target only the local development environment (`egypt_jobs_db`).

---

For full details on role assignments, required skills, and verification loops, consult [EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md](file:///d:/Hire%20Q%20Project/EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md).
