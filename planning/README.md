# Planning: plan-sop-ui-automation improvement roadmap

This folder holds the improvement plan for this repository: the master plan, its phases, and one file per task with the detail needed to implement it. AI agents (Antigravity or VS Code Copilot) and people use the same files.

## Layout

```text
planning/
├── README.md                                   # this hub: layout, how to run a task, status rules
├── Master/
│   ├── master_plan.md                          # goals, baseline, phases, task index, decisions, risks
│   └── repo_health_review_2026-10-06.md        # source review (M1–M5, G1–G5), kept unchanged
├── Phases/
│   ├── phase_1_run_safety/                     # README.md (phase overview) + tasks/T1.*.md
│   ├── phase_2_pr_quality_gate/
│   ├── phase_3_assertion_integrity/
│   ├── phase_4_test_data_isolation/
│   ├── phase_5_ci_consolidation_and_triage/
│   ├── phase_6_coverage_completeness/
│   ├── phase_7_framework_maintainability/
│   ├── phase_8_legacy_and_docs/
│   └── phase_9_mocked_ui_contract_tier/        # HAR record/replay tier, from the PS UI nightly runtime plan §6
└── templates/
    └── task_template.md                        # copy this for a new task
```

Start with [Master/master_plan.md](Master/master_plan.md). It explains why the phases are in this order and holds the task index with each task's status.

## How a task is run

Every task names three personas. They are skills in `.agents/skills/` (see the persona table in `AGENTS.md`):

| Stage | Who | What happens |
|---|---|---|
| 0. Pick | `run-planning-task` | Next task whose dependencies are done; open decisions answered first |
| 1. Kick-off | `role-sdet-architect` | Re-run the task's evidence checks, create the branch, set **In progress** |
| 2. Implement | Persona in the task header | Work through section 4 of the task, small commits |
| 3. Verify | Same persona | Run section 5, tick only observed acceptance criteria |
| 4. Review | `role-sdet-architect`, fresh session | Diff against section 7 and the Definition of Done; loop back until clean |
| 5. Close-out commit | `run-planning-task` | Last commit **in the same PR**: status **Done** (or the slice's progress for a multi-PR task), phase and master tables, learnings |
| 6. CI and PR | `role-devops-engineer` | Push, `gh pr create`, read checks, handle review comments; a human merges, and the merge is what makes the status true on `main` |

In Antigravity, say for example:
- `Run task T1.1 from the planning folder.`
- `What is the next planning task? Start it.`
- `Review task T2.3 as the SDET architect.` (use a new conversation, so the reviewer doesn't share the implementer's context)

In VS Code Copilot, the same skills are readable from `.agents/skills/`. The older `.github/agents/*.agent.md` agents still work for the implementation stage.

## Rules for everyone
- One branch and one PR per **slice**. Most tasks are a single slice. A task whose header names one branch per wave, folder, workflow or POM (T3.2, T4.3, T5.3, T7.2, T7.3) has one slice per PR, and stays `In progress` until its last slice merges. Its progress log lists every slice PR with its state.
- Merging stays with a human reviewer; agents never merge.
- Re-run the evidence check before starting. If the task is already fixed or out of date, update it rather than doing the work blind.
- Keep the status in three places in step: the task header, the phase `README.md` table, and the master plan's task index.
- Status changes travel inside the task's own PR, never as direct commits to `main`. The last commit of a PR sets the status that becomes true when it merges: `Done` for the final slice, `In progress (slice k of n)` otherwise. If a PR is closed without merging, its status change goes with it. On `main`, a task therefore moves from `Not started` straight to `Done` (or to `In progress` after a slice); the open PR shows work in flight.
- Work outside a task's scope becomes a new task (copy `templates/task_template.md`), not an extra change in the current PR.
- Reusable facts go to `.agents/learnings.md`; plan decisions go to the master plan's decision log.

## Status values
`Not started` · `In progress` · `In review` · `Done` · `Blocked (<reason>)` · `Dropped (<reason>)`
