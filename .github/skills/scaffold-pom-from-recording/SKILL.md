---
name: scaffold-pom-from-recording
description: Convert a Playwright codegen recording into a proper page object plus spec that satisfies this repo's Definition of Done
disable-model-invocation: true
argument-hint: "Recorded codegen output (paste or file path), feature area, and target spec path"
---
Convert a raw Playwright **codegen recording** into a compliant page object + spec.

Capture the recording first if you do not have one:
```
cd playwright-e2e
npm run codegen                 # INTEROP, reuses cached auth
npm run codegen:qa              # QA
npm run codegen -- <url> --output recorded.spec.ts
```

Inputs:
- Recording: <paste the generated code, or the path to the recorded file>
- Feature area: <PlanningSpace | ProcessOrchestration | ProcessOrchestrationBackend | other>
- Target spec path: <playwright-e2e/tests/.../YourTest.spec.ts>

Treat the recording as **evidence of real locators, never as shippable code.** Codegen output
violates several of this repo's rules by default, so the conversion is the actual work.

Required transformations:
1. **Extract every locator into a page object.** No locator may remain inline in the spec.
   Reuse an existing `pageobjects/*.page.ts` if one covers the area; only create a new page
   object when there is a genuine gap.
2. **Upgrade the locator quality.** Codegen frequently emits brittle CSS and `nth()` chains.
   Re-resolve each one against the hierarchy `getByRole` > `getByTestId` > `getByLabel` /
   `getByPlaceholder` / `getByText` > CSS. **Never keep or introduce XPath.**
3. **Replace recorded waits.** Delete any `waitForTimeout`. Use deterministic conditions
   (`locator.waitFor`, `expect.poll`, network idle) with `getTimeout(tier)` from
   `constants/timeouts.ts` — never a hardcoded timeout value.
4. **Restructure into the repo's spec shape.** Use fixture injection and
   `test.describe.serial` where steps are ordered. Codegen's flat single-test output is not acceptable.
5. **Externalise the data.** Move recorded literals into
   `testdata/<ENV>/<area>/<SpecName>.json` for each environment the spec targets.
6. **Add meaningful assertions.** Codegen records actions, not expectations — derive
   assertions from the scenario being automated.
7. **Register the spec** in the correct `tests/TestSuites/*.json`, then finalize against the
   Definition of Done: `npm run finalize-spec -- <spec-path> --run`. It verifies testdata and
   suite registration, rejects XPath / static sleeps / hardcoded timeouts, regenerates docs,
   and runs the spec in isolation. Fix anything it reports as `FAIL`.

Report the changed files, the commands run, and the results.

Call out explicitly which recorded locators you had to strengthen and why — that signal is
useful for improving the underlying application's test IDs.
