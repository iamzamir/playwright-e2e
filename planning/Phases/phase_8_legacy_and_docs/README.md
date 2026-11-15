# Phase 8: Legacy and docs

**Priority:** P3 (T8.1 can move earlier once decision D3 is answered; it's small and independent) · **Effort:** ~2 days · **Lead personas:** `role-devops-engineer`, `role-sdet-architect` · **Reviewer:** `role-sdet-architect` (fresh session)
**Navigation:** [Planning hub](../../README.md) · [Master plan](../../Master/master_plan.md) · Previous: [Phase 7](../phase_7_framework_maintainability/README.md) · Next: [Phase 9](../phase_9_mocked_ui_contract_tier/README.md)

## Goal
The repo contains only what's maintained, and its docs and agent instructions describe the repo as it is.

## Why
- `e2e/` (WDIO) has 704 tracked files. Its four workflows are disabled, but it still appears in the root README as a suite and still gets dependency PRs.
- Docs and agent instructions have drifted. The root README presents WDIO as current. The healer agent says traces are `off` by default, but `configs/playwright.config.ts` uses `retain-on-failure` locally and `on-first-retry` in CI with retries. Phases 1–7 change commands and rules that the instructions mention.

## Tasks

| Task | Title | Implement | Depends on | Status |
|---|---|---|---|---|
| [T8.1](tasks/T8.1_retire_wdio_suite.md) | Retire the legacy WDIO suite | role-devops-engineer | decision D3 | Done |
| [T8.2](tasks/T8.2_docs_and_agent_instructions_accuracy.md) | Docs and agent instructions accuracy pass | role-sdet-architect | T8.1 | Not started |
| [T8.3](tasks/T8.3_retire_sauce_po_workflow.md) | Retire the Sauce Labs PO UI workflow | role-devops-engineer | D3 | Done |

## Exit criteria
- `e2e/` and the three WDIO workflows are marked retired and not in use (decision D3: retire, don't delete); no current doc presents WDIO as active.
- README, `.github/copilot-instructions.md`, `.github/instructions/*`, `.github/agents/*`, `.github/prompts/*`, `.agents/skills/*` and `.agents/learnings.md` all match the code (checked line by line in T8.2).
