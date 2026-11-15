---
name: create-playwright-test
description: Create a new Playwright test or generate tests from user stories, acceptance criteria, or manual test cases
disable-model-invocation: true
argument-hint: "Feature area, scenario or user story, and target test path"
---
Create a new Playwright test for this repository.

Inputs:
- Feature area: <PlanningSpace | ProcessOrchestration | ProcessOrchestrationBackend | other>
- Scenario / user story / acceptance criteria: <what to validate>
- Target test path: <playwright-e2e/tests/.../YourTest.spec.ts>

The `playwright-test-author` agent owns the workflow and all repo conventions (locators, waits, page objects, testdata, suite registration). Map each acceptance criterion to at least one assertion.
