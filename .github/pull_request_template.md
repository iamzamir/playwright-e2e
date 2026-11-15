## Task
- Task ID: <!-- T<P>.<N> or n/a -->

## Summary
<!-- What changed and why -->

## Verification
<!-- Commands run locally (from playwright-e2e/) and/or CI run links, with concise observed outcomes -->
- [ ] `cd playwright-e2e && npm run typecheck`
- [ ] `cd playwright-e2e && npm run lint`
- [ ] `cd playwright-e2e && npm run validate:suites`
- [ ] `cd playwright-e2e && npm run docs:testcases:check`
- [ ] `cd playwright-e2e && npm run test:docs`
- [ ] `cd playwright-e2e && npm run test:triage`
- [ ] Targeted spec/suite run in isolation (if applicable)

## Definition of Done
<!-- Mirroring .github/instructions/workflow.instructions.md -->
- [ ] Spec written using fixture injection and `test.describe.serial` where ordered
- [ ] No inline selectors in specs — all locators in page objects (POM gaps filled first)
- [ ] Locators follow hierarchy: `getByRole` > `getByTestId` > `getByLabel`/`getByPlaceholder`/`getByText` > CSS. **No XPath.**
- [ ] No static sleeps — deterministic waits only; timeouts via `getTimeout(tier)` from `constants/timeouts.ts`
- [ ] Test data JSON exists at `testdata/<ENV>/<area>/<SpecName>.json` (for target environments)
- [ ] Spec registered in the correct `tests/TestSuites/*.json` (and visual suite if applicable)
- [ ] Test-case docs regenerated when specs are added/renamed: `npm run docs:testcases`
- [ ] No TypeScript errors: `npm run typecheck` exits 0; spec runs in isolation (`--workers=1`)
- [ ] Lint passes: `npm run lint` exits 0 (zero new violations against baseline)
- [ ] Suite validation passes: `npm run validate:suites` exits 0
- [ ] Testcase catalog drift check passes: `npm run docs:testcases:check` exits 0
- [ ] PR quality checks pass: `pr-checks` workflow is green on GitHub Actions
- [ ] Changed files, commands run, and results reported

## Risks & Rollback
<!-- Risks identified, mitigating controls, and rollback procedure -->
- Risks: 
- Rollback: 
