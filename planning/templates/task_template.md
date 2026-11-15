# T<P>.<N>: <Title>

**Phase:** [Phase <P>: <name>](../README.md) · **Priority:** P0 | P1 | P2 | P3 · **Effort:** S | M | L
**Status:** Not started | In progress | In review | Done | Blocked (<reason>)
**Source:** <Repo-health item (M1–M5, G1–G5), triage plan section, or "new (2026-10-08 review)">
**Depends on:** <task ids or "none"> · **Blocks:** <task ids or "none">
**Branch:** `<feature|bugfix|test|refactor>/<slug>`

| Stage | Persona skill |
|---|---|
| Implement | `role-...` |
| Review | `role-sdet-architect` (in a fresh session, not the implementer's) |
| CI and PR | `role-devops-engineer` |

## 1. Problem
<What is wrong and why it matters, in two to four sentences.>

## 2. Evidence (verified <date> on `main` @ `<sha>`)
<Exact files, lines and counts.>

Re-check before starting (the numbers drift):
```bash
<commands that reproduce the evidence>
```

## 3. Scope
- **In:** <...>
- **Out:** <... and which task covers it>

## 4. Implementation steps
1. <Granular step with the file, function and what changes. Code sketch where it helps.>

## 5. Verification
```bash
<commands, run from the folder stated>
```
Expected: <what success looks like>.

## 6. Acceptance criteria
- [ ] <Observable, checkable outcome>

## 7. Review checklist (for `role-sdet-architect`)
- [ ] <Task-specific checks, on top of the Definition of Done in `.github/instructions/workflow.instructions.md`>

## 8. Risks and rollback
- <Risk> → <mitigation>. Rollback: <how to undo>.

## 9. Docs and learnings
- <Files to update; learnings to record in `.agents/learnings.md`>

## 10. Progress log
| Date | Persona | Note |
|---|---|---|
