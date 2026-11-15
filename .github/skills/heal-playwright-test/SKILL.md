---
name: heal-playwright-test
description: Heal failing or flaky Playwright tests — covers hard failures, selector drift, timing issues, and intermittent CI/Sauce flakiness
disable-model-invocation: true
argument-hint: "Failing spec path, failure details, and environment"
---
Heal a failing or flaky Playwright test in this repository.

Inputs:
- Failing spec path: <playwright-e2e/tests/.../YourTest.spec.ts>
- Failure details: <error output, symptom, or intermittent pattern>
- Environment: <local | CI | Sauce>
- Failure mode: <consistent failure | intermittent / flaky>

The `playwright-healer` agent owns the workflow, failure-evidence sources, and all repo conventions (locator hierarchy, POM encapsulation, deterministic waits). Preserve the original test intent.
