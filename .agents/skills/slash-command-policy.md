# Antigravity Slash-Command Selection Policy
## Egypt Career Map Platform (Hire Q)

**Version:** 1.1.0  
**Effective Date:** 2026-11-11  
**Scope:** All task prompts, orchestration workflows, and agent execution paths.

---

## 1. Core Distinction: Slash Commands vs Domain Skills

- **Platform Slash Commands** (`/teamwork`, `/swarm`, `/boost`, `/plan`, `/goal`, etc.):
  Direct the Antigravity runtime orchestrator on **how** to organize thinking, multi-agent dispatch, human interaction, or session-level execution. They are **not** domain instructions.
- **Domain Skills** (`.agents/skills/<name>/SKILL.md`):
  Contain domain knowledge, operational patterns, checklists, scripts, and validation criteria for specific engineering problems (e.g., PostgreSQL query tuning, Arabic NLP normalization, SSRF socket pinning).

**Rule:** Every prompt prepared for Antigravity in this project must declare its primary platform slash command on its **very first line**, followed by explicit invocation of required domain skills.

---

## 2. Command Decision Matrix

| Task Shape / Context | Primary Slash Command | Rationale & Operational Behavior | Verified Fallback (if command unsupported) |
|---|---|---|---|
| **Repository-scale, multi-domain, multi-day milestone initiatives** | `/teamwork` | Establishes autonomous subagent team topology (Explorer, Worker, Sentinel, Auditor) with structured briefings, handoffs, and verification gates. | Structured subagent dispatch with `dispatching-parallel-agents` skill. |
| **Large tasks split cleanly across independent packages/files** | `/swarm` | Orchestrates parallel worker agents on decoupled file boundaries with an independent verifier coordinating results. | Parallel dispatch via `dispatching-parallel-agents` with isolated write ownership. |
| **Complex bugs, race conditions, deep algorithmic reasoning** | `/boost` | Activates extended chain-of-thought, multiple hypothesis generation, and counter-example exploration before touching code. | Self-prompting with `systematic-debugging` and `writing-plans`. |
| **High-risk architectural or database design requiring approval** | `/plan` | Forces deep codebase research and generates an executable Markdown plan artifact with an explicit user feedback gate (`Proceed` button). | Creation of a design artifact requiring user sign-off before implementation. |
| **Bounded autonomous task with unambiguous acceptance criteria** | `/goal` | Runs continuously until all criteria are proven passing. *Never use where human approval gates or destructive operations are present.* | Step-by-step verification loop using `verification-before-completion`. |
| **Ambiguous requirements requiring human interview** | `/grill-me` | Interactive clarification mode prompting the user with targeted multiple-choice questions to resolve architectural ambiguity. | Plain-text multiple choice questions via `ask_question`. |
| **Durable correction and rule learning** | `/learn` | Synthesizes verified user corrections into persistent rule or skill proposals. *Requires human review before persisting.* | Explicit authoring of a rule in `.agents/rules/` or skill update. |
| **Web research or live UI inspection** | `/browser` | Engages browser automation to inspect live UI flows, external documentation, or public endpoints. | Web search via `search_web`. |
| **Non-blocking side query** | `/btw` | Runs a detached query that does not pollute or divert the main conversation thread. | Single targeted question/answer turn. |
| **Interactive visual artifacts or educational widgets** | `/generative_ui` | Renders rich HTML/React/Tailwind interactive widgets directly in chat. | Markdown tables, Mermaid sequence/flowchart diagrams. |

---

## 3. Strict Prompting Rules for Engineers & Agents

1. **One Primary Command:** The first line of every prompt must contain exactly one primary command (e.g., `/teamwork` or `/boost`). Never stack redundant commands (e.g., do NOT write `/teamwork /boost /plan` on the same line).
2. **Justification Mandate:** Immediately following the command, state a 1-sentence technical justification explaining why the selected command fits the task shape.
3. **Explicit Skill Assignment:** Provide the exact relative paths to the assigned skills in `.agents/skills/`. Instruct the agent to read each `SKILL.md` before executing work.
4. **No Synthetic Commands:** Do not invent slash command names for skills (e.g., do not write `/ecm-postgresql-architecture`). Refer to skills by their folder and `SKILL.md` path.
5. **Human Approval Gates:** Never use `/goal` for tasks that modify database schemas, execute destructive migrations, stage git commits, or deploy to production.

---

## 4. Runtime & Plan Availability Constraints

Engineers authoring prompts must account for plan tier and client execution context:

| Slash Command | Plan / Tier Requirement | Environment Constraint | Operational Handling |
|---|---|---|---|
| `/swarm` | Enterprise / Team tier | Concurrent subagent limits apply | If plan quota exceeded, gracefully degrade to sequential subagent dispatches using `dispatching-parallel-agents`. |
| `/boost` | Pro / Paid tier | Extended context reasoning | If unavailable, simulate via structured multi-hypothesis prompting with `systematic-debugging`. |
| `/teamwork` | Pro / Paid tier | Multi-agent state orchestration | Fallback to parent agent coordination ledger with explicit subagent instructions. |
| `/generative_ui` | All tiers | Antigravity App UI Only | Unsupported in headless terminal/CI sessions; fall back to GitHub-flavored Markdown tables and Mermaid diagrams. |

*Official Reference:* [Antigravity Slash Commands Documentation](https://antigravity.google/docs/slash-commands/)
