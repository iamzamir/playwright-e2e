---
name: run-planning-task
description: 'Run, continue, review or close a task from the repo improvement plan in planning/ (task ids such as T1.1 or T4.3, files under planning/Phases/*/tasks/). Use when asked to "run task T2.3", "start the next task", "review task T1.2", "what is the next task", or to update task, phase or master plan status.'
argument-hint: 'Task id (for example T1.1), or "next"'
---

# Running a planning task

The plan lives in `planning/` (hub: `planning/README.md`, plan: `planning/Master/master_plan.md`). Each task file names its personas. Run the stages below in order, and don't skip the review.

## 0. Pick the task
- For "next", first continue any task that is `In progress (slice k of n)` with no open PR (check its progress log and `gh pr list --search "T<P>.<N>"`). Otherwise choose the first task in the master plan's task index whose status is `Not started` and whose dependencies (task header `Depends on:`, also drawn in the master plan graph) are all `Done`. If it depends on an unanswered decision (D1–D5), ask before starting.
- The work unit is a **slice**: the whole task, or one wave, folder, workflow or POM for tasks whose header names one branch per slice. One slice = one branch = one PR.
- Read the whole task file, its phase `README.md`, and the "Before you start" sources its persona skill lists.

## 1. Kick-off (`role-sdet-architect`)
1. Run the task's "Re-check" commands. If the evidence has changed (counts moved, an item is already fixed), update section 2 of the task file and tell the user before going further.
2. Create the branch named in the task from an up-to-date `main` (`git fetch origin && git switch -c <branch> origin/main`). Never work on `main`.
3. Set **Status: In progress** and add a progress-log row.

## 2. Implement (the task's Implement persona)
- Load that persona skill and follow it with the task's section 4 as the work list. Stay inside the task's scope; note anything else you find as a new task proposal in the progress log, don't fix it here.
- Commit in small steps. The message style is `<type>(<area>): <summary> (T<P>.<N>)`.

## 3. Verify (same persona)
- Run every command in section 5 and compare with "Expected". Paste short results (counts, pass/fail) into the progress log. Never paste tokens or customer data.
- Tick only the acceptance criteria you actually observed. A criterion that needs a CI run or an environment you can't reach stays unticked with a note.

## 4. Review (`role-sdet-architect`, separate pass)
- Review the branch diff against the task's section 7 checklist and the Definition of Done. Record findings in the progress log as `Review: <finding> → <fixed|accepted|deferred>`.
- Send fixes back to step 2. Only move on when there are no open findings.
- Set **Status: In review**.

## 5. Close-out commit (before the merge, in the same PR)
Status can't be written after the merge: the PR is closed and `main` takes no direct commits. So the PR carries its own status change as its last commit:
- **Single-slice task, or the last slice:** task **Status: Done**; phase `README.md` row `Done`; master plan task index row `Done` and the phase's `Done / total` count.
- **Earlier slice of a multi-PR task:** **Status: In progress (slice k of n)** in all three places.
- Add a progress-log row, `<date> | run-planning-task | Close-out: <slice or task> in PR #<n>` (amend the PR number in once the PR exists, or write "this PR").
- Add reusable facts to `.agents/learnings.md`, per `AGENTS.md`.
- If review comments later need fixes, keep the close-out commit last (or re-check it after the fixes) so the statuses still match the final diff.

## 6. CI and PR (`role-devops-engineer`)
- Push and open a PR with `gh pr create`. The body lists the task id and slice, what changed, the verification results, and any unticked criteria. End with the attribution lines your IDE requires.
- Read the checks with `gh pr checks <n>`. For Copilot or reviewer comments, `role-sdet-architect` assesses them; reply or resolve only when the user asks.
- Never merge. Merging is the human reviewer's call, and the merge is what makes the close-out statuses true on `main`.
- If the PR is closed without merging, nothing on `main` changes. Restart from stage 1 with a new branch when the task is picked up again.
