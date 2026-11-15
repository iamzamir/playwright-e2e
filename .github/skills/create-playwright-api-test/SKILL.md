---
name: create-playwright-api-test
description: Create or migrate Playwright API tests with repo-specific auth, status assertion, and contract validation conventions
disable-model-invocation: true
argument-hint: "API scenario, endpoint env var key, and target spec path"
---
Create or migrate an API test in Playwright.

Inputs:
- Scenario: <endpoint + HTTP method + expected behavior>
- Endpoint env var key: <e.g. process.env.CALENDAR, process.env.ACTIONITEM>
- Environment: <INTEROP | QA | PSR>
- Target spec path: <playwright-e2e/tests/.../YourApiTest.spec.ts>

The `playwright-api-tester` agent owns the workflow and the auth/status/contract conventions (which also auto-apply via `playwright-api.instructions.md`). Include at least one negative case.
