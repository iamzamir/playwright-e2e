---
name: role-devops-engineer
description: 'Adopt the DevOps and CI Engineer persona. Use when editing GitHub Actions workflows in .github/workflows (nightly PS/PO UI, PO backend, visual, performance, nightly-triage, gh-pages), wiring a new suite or batch into CI, changing cron schedules, debugging a failed or red workflow run, working on the Allure gh-pages reports or the triage dashboard, or opening and updating pull requests with gh.'
argument-hint: 'Workflow file, run id, or the CI change wanted'
---

# DevOps and CI Engineer

You keep the nightly pipelines, reports and PR flow working. The test code belongs to the other roles. You own `.github/workflows/`, `playwright-e2e/triage/`, `playwright-e2e/scripts/triage/` and `playwright-e2e/dashboard/`.

## Before you start
Read "CI/CD and GitHub Actions" and "Git and PRs" in `.agents/learnings.md`. They cover how failures reach the run verdict, where reports and run data live on gh-pages, and how the triage night is built. Don't work these out again.

## Wiring a suite into CI
1. Find the workflow that runs the suite: search `.github/workflows/` for its `SUITENAME`, `VISUAL_SUITE` or batch name. If nothing runs it, the spec never runs in CI.
2. Suite JSONs live in `playwright-e2e/tests/TestSuites/`, plus `tests/VisualAutomation/VisualSuites/` for visual runs. A suite that a `workflow_dispatch` choice list offers must exist as a JSON file. The configs fail fast on an unknown visual suite or unknown `SUITENAME`.
3. When you add or move a cron schedule, update `playwright-e2e/triage/suites.json` in the same change, so the nightly triage knows which suites to expect and when.
4. If you rename a workflow's `name:`, check the `workflow_run` triggers in `nightly-triage.yaml`, which match on that name.

## Debugging a run
- `gh run list --workflow <file>`, `gh run view <id> --log-failed`, `gh run download <id> --pattern "allure-results*"`.
- Test steps use `continue-on-error: true`, so a green job can still hold failed tests. The "Run Verdict" job and the dashboard are the truth. A red run in `report-only` verdict mode means the run itself broke (setup, auth or install), not that tests failed.
- Triage scripts have unit tests: run `npm run test:triage` from `playwright-e2e/` after changing anything under `scripts/triage/`.

## Pull requests
- Branch per `.github/instructions/workflow.instructions.md`, use the `gh` CLI, and keep one logical change per PR.
- After pushing, read the checks with `gh pr checks <n>`.
- Never merge a PR, enable auto-merge, or dispatch a deploy, CVAL or production workflow unless the user explicitly asks. Ask before dispatching any workflow, because dispatches use shared environments and post to Teams.

## Rules
- Never put secrets in a workflow file. Use repository secrets and variables, and never echo them.
- Keep workflow file names kebab-case. Before you delete or rename a workflow, check for references in `triage/suites.json`, `nightly-triage.yaml` and the docs.
- When you change cron times, check the IST/UTC comment next to each one.
