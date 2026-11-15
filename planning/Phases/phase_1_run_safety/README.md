# Phase 1: Run safety

**Priority:** P0 · **Effort:** ~3 days · **Lead personas:** `role-playwright-automation`, `role-devops-engineer` · **Reviewer:** `role-sdet-architect`
**Navigation:** [Planning hub](../../README.md) · [Master plan](../../Master/master_plan.md) · Next: [Phase 2](../phase_2_pr_quality_gate/README.md)

## Goal
No mistyped command, missing suite file or forgotten flag can run destructive specs against a shared environment. A nightly run that needs attention is visibly red.

## Why first
- `npm run test:interop`, `test:qa`, `test:psr` and `test:interop:poui` load a suite file that doesn't exist and silently fall back to every spec. That includes four `DeleteAll*` specs that wipe calendars, view mappings, assumption KPIs and supply chain actions in the migration target realm. No suite registers them, so this fallback is the only way they run, and nobody intends it.
- The PO backend single-batch path splits `--grep-invert="ALM Deploy Resource Migration"` into separate file filters, and the all-batches path ignores each batch's exit code.
- The run verdict exists for three workflows but only reports. The visual and performance workflows have no verdict at all.

## Tasks

| Task | Title | Implement | Depends on | Status |
|---|---|---|---|---|
| [T1.1](tasks/T1.1_suite_selection_fail_fast.md) | Fail fast on unknown suites; remove dead defaults | role-playwright-automation | none | Done |
| [T1.2](tasks/T1.2_guard_destructive_specs.md) | Guard destructive DataSetup specs | role-playwright-automation | T1.1 | Done |
| [T1.3](tasks/T1.3_po_backend_batch_command_fixes.md) | Fix PO backend batch command and exit codes | role-devops-engineer | none | Done |
| [T1.4](tasks/T1.4_run_verdict_enforcement.md) | Enforce the run verdict; cover visual and performance runs | role-devops-engineer | T1.3, decision D1 | Done |
| [T1.5](tasks/T1.5_qa_migration_entry_points.md) | Keep QA migration out of local entry points | role-devops-engineer | none | Done |

T1.1 and T1.3 can run in parallel. T1.5 (added 2026-11-11) is independent.

## Exit criteria
- `SUITENAME=DoesNotExist npm run test:target` fails at config load, naming the available suites.
- `npx playwright test --list --config=configs/playwright.config.ts` with no suite lists no `DataSetupBatch` spec unless `ALLOW_DESTRUCTIVE=true`.
- A dispatched PO backend run for one batch with `RUN_ALM_DEPLOY=false` runs that batch with the ALM test excluded, and a crashed batch shows in the verdict.
- Decision D1 is recorded, and the verdict mode for each functional, visual and performance workflow is documented.
