# AGENTS.md — plan-sop-ui-automation

These rules apply to every AI coding agent working in this repo, whatever the IDE (VS Code Copilot, Antigravity) or model. Repository conventions are in `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md`, so read the ones that apply before editing. Multi-step procedures are skills in `.agents/skills/<name>/SKILL.md`.

## Shared learnings
- **Before starting:** read `.agents/learnings.md`, but only the sections that match the task. Check `.agents/skills/` for a skill that covers it. Reuse what's recorded rather than working it out again.
- **Trust code over notes:** if a learning conflicts with the current source, follow the source and fix the learning in the same change.
- **Before finishing:** add any new, non-obvious, reusable learnings to `.agents/learnings.md`, one line each under the right topic. Good candidates are verified API or DTO behavior, root causes, gotchas, and commands that worked. Update or delete stale lines rather than appending duplicates. Don't record anything that's obvious from reading the code.
- **Promote:** when a topic grows into a repeatable procedure, move it into a skill under `.agents/skills/`. When it's a hard rule for a file type, move it into `.github/instructions/`.
- **Never record:** secrets, tokens, credentials, customer data, or large code or log dumps.
- **IDE-local memory is optional:** if your IDE has its own memory (for example, VS Code Copilot's `/memories/`), you can use it for personal or machine-specific notes. Anything the team should know belongs in `.agents/learnings.md`, because that file is committed and every IDE can read it.

## Personas
Role personas are skills in `.agents/skills/role-*`, so Antigravity picks them up as well as Copilot. Antigravity doesn't read `.github/agents/*.agent.md`. Where a Copilot agent already holds the procedure, the role skill points to it rather than copying it, so update the procedure in the agent file.

| Persona skill | Use for | Copilot agent it reuses |
|---|---|---|
| `role-playwright-automation` | New UI/API specs, page objects, live exploration | `playwright-test-author`, `playwright-api-tester`, `playwright-autopilot` |
| `role-playwright-healer` | Failing or flaky specs, nightly failure triage | `playwright-healer` |
| `role-sdet-architect` | Coverage plans, PR review against the Definition of Done, review comments | `playwright-planner` |
| `role-devops-engineer` | GitHub Actions, suite wiring, gh-pages reports, triage dashboard, PRs | none |
| `role-performance-engineer` | JMeter PSR plans, Playwright UI timing specs | none (uses `jmeter-psr-samplers`) |

Task skills: `visual-regression-baselines`, `psr-gap-api-tests`, `jmeter-psr-samplers`, `run-planning-task`.

## Improvement plan
The repo improvement roadmap is in `planning/` (start at `planning/README.md`). Each task file names the personas that implement, review and ship it. Run tasks with the `run-planning-task` skill ("run task T1.1", "start the next task"), and keep task, phase and master-plan status in step.
