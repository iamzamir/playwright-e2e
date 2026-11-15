# Phase 4: Test data isolation

**Priority:** P1 · **Effort:** 2–3 weeks · **Lead persona:** `role-playwright-automation` · **Reviewer:** `role-sdet-architect`
**Navigation:** [Planning hub](../../README.md) · [Master plan](../../Master/master_plan.md) · Previous: [Phase 3](../phase_3_assertion_integrity/README.md) · Next: [Phase 5](../phase_5_ci_consolidation_and_triage/README.md)

## Goal
Every spec that creates data uses a name unique to its run and worker, and deletes what it created, even when it fails. Two runs against the same environment at the same time don't interfere, and the nightly bulk deletes only remove automation leftovers.

## Why
- Cleanup coverage: Planning Space 26 of 126 specs have `afterAll`, PO UI 4 of 29, backend 31 of 45.
- 32 specs name data with `Math.random()`-style suffixes (`Math.floor(Math.random() * 900) + 100`). With 5 CI workers and sharding, collisions are likely.
- 214 specs use `describe.serial` and share created entities across test cases, so a failure in TC1 cascades.
- The UI suites rely on the nightly DataSetup bulk deletes, which makes the shared environments unsafe for any parallel run.

This phase can run alongside Phases 2 and 3. It only needs T1.2 before its last task.

## Tasks

| Task | Title | Implement | Depends on | Status |
|---|---|---|---|---|
| [T4.1](tasks/T4.1_unique_name_utility.md) | `uniqueName()` utility; replace `Math.random` names | role-playwright-automation | none | Done |
| [T4.2](tasks/T4.2_created_entities_fixture.md) | `createdEntities` cleanup fixture | role-playwright-automation | T4.1 | Done |
| [T4.3](tasks/T4.3_migrate_planning_space_specs.md) | Migrate Planning Space data-creating specs | role-playwright-automation | T4.2 | In progress (slices 1–5 of 6) |
| [T4.4](tasks/T4.4_migrate_po_ui_specs.md) | Migrate PO UI data-creating specs | role-playwright-automation | T4.2 | Not started |
| [T4.5](tasks/T4.5_scope_bulk_cleanup_and_concurrency_check.md) | Scope DataSetup bulk deletes; prove two runs don't collide | role-playwright-automation | T4.3, T4.4, T1.2 | Not started |

T4.3 and T4.4 can run in parallel after T4.2.

## Exit criteria
- Every spec that creates data registers it with `createdEntities` or is listed in the phase's exception table (in T4.5) with a reason.
- No `Math.random` in spec names (`grep -rl Math.random tests` → 0, or only non-name uses).
- Two INTEROP runs of the same suite started together finish with the same failures as a single run.
