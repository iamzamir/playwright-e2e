---
name: plan-playwright-tests
description: Create a Playwright test strategy, coverage gap analysis, or execution plan grounded in the actual repository state
disable-model-invocation: true
argument-hint: "Scope, quality goals, and target timeline"
---
Create a Playwright test strategy or coverage plan for this repository.

Inputs:
- Scope: <feature area, suite, or whole framework>
- Timeline: <target milestone or sprint plan>
- Constraints: <team size, environment limits, critical paths>
- Plan type: <coverage gap analysis | new feature test plan | execution batching>

The `playwright-planner` agent owns the workflow and grounds every recommendation in the actual repo state (it reads `tests/`, `TestSuites/*.json`, and `package.json` scripts before producing output). The legacy WDIO suite in `e2e/` is retired and is not a planning source.
