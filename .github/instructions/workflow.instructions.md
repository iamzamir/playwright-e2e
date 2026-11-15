---
description: "Workflow governance: branch policy, Definition of Done, and prohibited actions for all changes in this repo"
applyTo: "**"
---
# Workflow governance

Always-on process rules. These sit on top of `.github/copilot-instructions.md` and the path-scoped instruction files. Keep changes minimal and scoped to the request.

## Branch policy
- Never commit directly to `main` or long-lived integration branches.
- Create a single-purpose branch per change:
  - `feature/<name>` — new tests, page objects, utilities, or capabilities.
  - `bugfix/<name>` — fixing a broken or flaky test/helper.
  - `test/<name>` — adding coverage only.
  - `refactor/<area>` — non-behavioral restructuring.
- One logical change per branch; keep commits focused with clear messages.

## Definition of Done
A test/authoring/migration task is complete only when all that apply are true:
- [ ] Spec written using fixture injection and `test.describe.serial` where ordered (per `playwright-specs.instructions.md`).
- [ ] No inline selectors in specs — all locators live in page objects; POM gaps filled first (per `playwright-pom.instructions.md`).
- [ ] Locators follow the hierarchy `getByRole` > `getByTestId` > `getByLabel`/`getByPlaceholder`/`getByText` > CSS. **No XPath.**
- [ ] No static sleeps — deterministic waits only; timeouts via `getTimeout(tier)` from `constants/timeouts.ts`.
- [ ] Test data JSON exists at `testdata/<ENV>/<area>/<SpecName>.json` (per `testdata.instructions.md`).
- [ ] Spec registered in the correct `tests/TestSuites/*.json`; new top-level areas also verified against CI workflows.
- [ ] Test-case docs regenerated when specs are added/renamed: `npm run docs:testcases`.
- [ ] No TypeScript errors: `npm run typecheck` exits 0; the targeted spec runs in isolation (`--workers=1`).
- [ ] Lint passes: `npm run lint` exits 0 (zero new violations against the baseline; update via `npm run lint:baseline`).
- [ ] Suite validation passes: `npm run validate:suites` exits 0.
- [ ] Testcase catalog drift check passes: `npm run docs:testcases:check` exits 0.
- [ ] PR quality checks pass: `pr-checks` workflow is green.
- [ ] Changed files, commands run, and results reported.

## Prohibited actions
- Do **not** push to `main` or force-push shared branches.
- Do **not** bypass hooks/checks (`--no-verify`) or disable/skip tests to make CI green.
- Do **not** remove functionality or coverage unless explicitly requested.
- Do **not** commit secrets or credentials — auth comes from `process.env` via `setup.js`.
- Do **not** edit files unrelated to the task, or make broad refactors beyond scope.
- Do **not** leave `TODO` as a substitute for implementation.
- Do **not** rename or change the signature of a POM method with more than one caller — add a new method and `@deprecate` the old one.

## Destructive actions
Confirm with the user before: deleting files/branches, `git reset --hard`, force pushes, or anything hard to reverse.
