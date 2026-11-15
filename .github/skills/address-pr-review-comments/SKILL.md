---
name: address-pr-review-comments
description: Fetch a PR's Copilot/reviewer comments via the GitHub CLI, assess each for validity, and apply the valid fixes
disable-model-invocation: true
argument-hint: "PR number (e.g. 671); optional: 'assess only' to skip applying fixes"
---
Fetch and act on the review comments for a pull request in this repository — no screenshots needed.

Inputs:
- PR number: <e.g. 671>
- Mode (optional): <assess only | apply fixes (default)>

Repository coordinates (this repo):
- provider: `github`
- repository_organization: `BY-Product-Development`
- repository_name: `plan-sop-ui-automation`

Workflow:
1. Fetch the review comments with the GitHub CLI (preferred — it talks directly to GitHub, best for this private repo):
   `gh api "repos/BY-Product-Development/plan-sop-ui-automation/pulls/<PR>/comments" --paginate`
   Also pull the top-level review summaries with
   `gh api "repos/BY-Product-Development/plan-sop-ui-automation/pulls/<PR>/reviews" --paginate`.
   If `gh` is not on PATH in the current shell, first run
   `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`.
   If `gh` is not installed/authenticated, tell the user to run `gh auth login` and stop.
2. For each comment, read the target file/line and the suggested changeset. Verify the finding against the actual code — do not trust the suggestion blindly. Classify each as **Valid**, **Partially valid**, or **Invalid/false-positive** with a one-line reason, and note severity if provided.
3. Present a short table: comment → file → severity → verdict.
4. Unless mode is "assess only", apply every **Valid** fix using the repo conventions (2-space indent, no XPath, locator hierarchy, `getTimeout(tier)` from `constants/timeouts.ts`, no static sleeps, POM encapsulation). Run `npx tsc --noEmit` from `playwright-e2e/` (TypeScript is declared there; there is no root `package.json`), or use the IDE problems panel, to confirm no type errors.
5. Stage only files related to the review fixes (check `git status` first). Follow branch policy — never push to `main`.
6. Report changed files and ask before committing/pushing.
