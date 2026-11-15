# Phase 2: PR quality gate

**Priority:** P0 · **Effort:** ~5 days · **Lead personas:** `role-playwright-automation`, `role-devops-engineer` · **Reviewer:** `role-sdet-architect`
**Navigation:** [Planning hub](../../README.md) · [Master plan](../../Master/master_plan.md) · Previous: [Phase 1](../phase_1_run_safety/README.md) · Next: [Phase 3](../phase_3_assertion_integrity/README.md)

## Goal
A pull request can't add a type error, a new XPath selector, a new `waitForTimeout`, a broken suite entry, a stale test-case catalog, or a secret without a red check.

## Why now
No workflow runs on `pull_request` apart from GitHub's managed CodeQL and Copilot review. The rules in `.github/copilot-instructions.md` and `.github/instructions/` are followed by agents when they remember, and enforced by nothing. The counts show it: 741 XPath lines and 131 `waitForTimeout` calls in page objects, 102 `waitForTimeout` calls in specs. Every later phase changes many files, so the gate should exist first.

## Tasks

| Task | Title | Implement | Depends on | Status |
|---|---|---|---|---|
| [T2.1](tasks/T2.1_typecheck_clean_and_script.md) | Zero type errors and a `typecheck` script | role-playwright-automation | none | Done |
| [T2.2](tasks/T2.2_eslint_with_baseline.md) | ESLint with a recorded baseline | role-playwright-automation | T2.1 | Done |
| [T2.3](tasks/T2.3_suite_validator_script.md) | Suite validator script | role-playwright-automation | T1.1 | Done |
| [T2.4](tasks/T2.4_pr_checks_workflow.md) | `pr-checks` workflow | role-devops-engineer | T2.2, T2.3 | Done |
| [T2.5](tasks/T2.5_supply_chain_and_repo_governance.md) | Pin actions, Dependabot, PR template, branch protection | role-devops-engineer | T2.4 | Done |
| [T2.6](tasks/T2.6_framework_self_tests_in_pr_checks.md) | Run the `_framework` self-tests in `pr-checks` | role-devops-engineer | T2.4 | Done |

## Exit criteria
- A throwaway PR that adds each of the following is blocked by `pr-checks`: a type error, a `waitForTimeout`, an XPath string in a page object, a suite entry for a missing file, and a spec added without regenerating `docs/testcases`.
- `pr-checks` is a required status check on `main` (decision D4). *(Not met on 2026-11-11: `main` has no required status checks.)*
- Third-party actions are pinned to commit SHAs, and Dependabot keeps them and npm up to date (actions active; npm updates pending admin JFrog registry secret).
