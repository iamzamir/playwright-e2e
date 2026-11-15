# Phase 6: Coverage completeness

**Priority:** P2 · **Effort:** ~1.5 weeks · **Lead personas:** `role-sdet-architect`, `role-playwright-automation` · **Reviewer:** `role-sdet-architect` (a different session from the implementer)
**Navigation:** [Planning hub](../../README.md) · [Master plan](../../Master/master_plan.md) · Previous: [Phase 5](../phase_5_ci_consolidation_and_triage/README.md) · Next: [Phase 7](../phase_7_framework_maintainability/README.md)

## Goal
Every spec has a known runner (a nightly suite, a folder script, or a documented manual-only reason). Runs are selected by tags and Playwright projects instead of text matching. Which specs run in which environment is written down.

## Why
- 57 of 237 specs match no suite JSON. 29 of those (PO UI) run through folder scripts, but 13 Planning Space specs only run when someone picks their folder by hand. `AddLanePopup` isn't even in the PS workflow `folder_map`.
- `shouldEnableGlobalSetup()` decides whether to log in by searching suite names and spec paths for "backend" (`configs/playwright.config.ts:54-76`).
- Test data exists for 213 specs on INTEROP, 120 on QA and 39 on PSR, and nothing says which gaps are intended.
- Follow-ups from PR #734 (visual): the loader snapshot covers only the text; the Unified Empty State spec has no baseline; two panel tests are titled "full-page".

## Tasks

| Task | Title | Implement | Depends on | Status |
|---|---|---|---|---|
| [T6.1](tasks/T6.1_register_orphan_specs.md) | Register or explain the 57 unregistered specs | role-sdet-architect | T2.3 | Not started |
| [T6.2](tasks/T6.2_tags_and_projects.md) | Tags and Playwright projects instead of name matching | role-playwright-automation | T6.1 | Not started |
| [T6.3](tasks/T6.3_environment_coverage_matrix.md) | Environment coverage matrix and tag-aware docs | role-sdet-architect | T6.2 | Not started |
| [T6.4](tasks/T6.4_visual_suite_follow_ups.md) | Visual suite follow-ups from PR #734 | role-playwright-automation (with `visual-regression-baselines`) | none | Not started |

T6.4 is independent and can be picked up any time.

## Exit criteria
- `npm run validate:suites` reports zero unregistered specs without an allow-list reason, and no "TODO T6.1" reasons remain.
- Global setup is chosen by project, not by text matching.
- `docs/testcases` shows tags and environments per spec.
