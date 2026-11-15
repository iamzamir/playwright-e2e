# Branch Protection Request for `main` (Decision D4)

**To:** Repository Administrators (`@BY-Product-Development/cbp-planning-space-owners-admins`)  
**From:** Automation & CI Team (`role-devops-engineer`)  
**Date:** 2026-10-08  
**Repository:** `BY-Product-Development/plan-sop-ui-automation`  
**Target Branch:** `main`  
**Reference:** Improvement Plan Task [T2.5](tasks/T2.5_supply_chain_and_repo_governance.md) · Decision D4  

---

## 1. Objective
Protect `main` by requiring the automated PR quality gate (`pr-checks`) to pass before any pull request can be merged. This prevents type errors, lint violations (new XPath, `waitForTimeout`), broken suite manifests, test catalog drift, secret leaks, and broken triage tooling from landing on `main`.

## 2. Pre-requisite / Rollout Condition
Per Decision D4, this protection should be enabled once `pr-checks.yaml` has completed cleanly on at least **5 pull requests** on `main` to verify runner reliability and absence of false positives.
- PR 1: PR #769 (T2.4 - initial implementation, verified green in 39s / 27s)
- PR 2: Current PR (T2.5 - supply chain governance)
- PRs 3–5: Subsequent Phase 3 PRs

## 3. Configuration Instructions
In GitHub Repository Settings:
1. Navigate to **Settings** → **Branches** → **Branch protection rules**.
2. Select or add rule for branch pattern: `main`.
3. Enable **Require a pull request before merging**:
   - Require approvals: minimum `1` approval.
   - Dismiss stale pull request approvals when new commits are pushed: Checked.
   - Require review from Code Owners: Checked (per `.github/CODEOWNERS`).
4. Enable **Require status checks to pass before merging**:
   - Enable **Require branches to be up to date before merging**.
   - In **Status checks that are required**, search and add the following two check runs emitted by `.github/workflows/pr-checks.yaml`:
     1. `Quality Checks` (job `checks`, covering typecheck, lint, suites, testcase catalog drift, unit tests, and Playwright --list)
     2. `Secrets Scan` (job `secrets-scan`, running Gitleaks secret detection)
5. Enable **Do not allow bypassing the above settings** (or restrict to administrators during emergency rollbacks).
6. Click **Save changes**.

## 4. Verification & Rollback
- **Verification:** Inspect the branch protection API (`gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks`) or open a temporary non-draft test PR to confirm merge is blocked until `Quality Checks` and `Secrets Scan` report green checkmarks (draft PRs block merge unconditionally regardless of status checks).
- **Rollback:** If an emergency fix is blocked by infrastructure/runner outages, a repository admin can temporarily uncheck the required status checks in Settings → Branches.
