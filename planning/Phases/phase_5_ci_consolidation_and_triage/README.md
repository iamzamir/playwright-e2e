# Phase 5: CI consolidation and triage completion

**Priority:** P2 · **Effort:** ~1.5 weeks · **Lead persona:** `role-devops-engineer` · **Reviewer:** `role-sdet-architect`
**Navigation:** [Planning hub](../../README.md) · [Master plan](../../Master/master_plan.md) · Previous: [Phase 4](../phase_4_test_data_isolation/README.md) · Next: [Phase 6](../phase_6_coverage_completeness/README.md)

## Goal
Each shared CI step (install, browser setup, Allure generation with history, gh-pages publish, verdict, Teams card) exists in one place. The remaining triage evidence from the triage plan is captured.

## Why
- 15 workflows, 7,097 lines. Install and setup steps are copied into 10 workflows. Allure generation, history restore, gh-pages push and the Teams card are copied into most of them.
- Pages deployment is already a reusable workflow (`github-pages-deploy.yaml`, called from 14 workflows). That's the pattern to extend.
- Phase 1 and Phase 2 add gates to several workflows; with shared pieces, the next change happens once.
- Triage plan Phase 3 still lists E7 (system-under-test versions), E8 (environment health probe) and change correlation; Phase 4 lists quarantine automation.

## Tasks

| Task | Title | Implement | Depends on | Status |
|---|---|---|---|---|
| [T5.1](tasks/T5.1_setup_playwright_composite_action.md) | `setup-playwright` composite action | role-devops-engineer | none | Not started |
| [T5.2](tasks/T5.2_reusable_report_workflow.md) | Reusable report, verdict and Teams workflow | role-devops-engineer | T5.1, T1.4 | Not started |
| [T5.3](tasks/T5.3_migrate_workflows.md) | Move each workflow onto the shared pieces | role-devops-engineer | T5.2 | Not started |
| [T5.4](tasks/T5.4_triage_evidence_and_quarantine.md) | Triage E7/E8 evidence and quarantine automation | role-devops-engineer | none | In progress (slice 2 of 3) |

## Exit criteria
- `grep -c "Authenticate with npm" .github/workflows/*.yaml` is 0 outside the composite action.
- Report generation, publishing, verdict and Teams are called through one reusable workflow from every active test workflow.
- Workflow line count down by at least 40% across the six active Playwright test workflows (custom, performance, PO backend, PO UI, PS UI, visual), from 4,704 lines on 2026-11-11, with the same reports and cards produced. *(Re-based 2026-11-11: the old target, "from 7,097", counted every workflow file, and the files have since grown to 8,290 with new and retired workflows.)*
- E7 and E8 evidence appear in run data; the quarantine run is automated, or explicitly dropped with a reason.
