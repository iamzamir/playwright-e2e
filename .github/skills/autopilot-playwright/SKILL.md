---
name: autopilot-playwright
description: Autonomously explore the app with Playwright MCP, generate a spec from observed behavior, run it, and self-heal
disable-model-invocation: true
argument-hint: "Base URL, environment, feature scope, and target spec path"
---
Run an autonomous live-first Playwright cycle for this repository.

Inputs:
- Base URL: <https://...>
- Environment: <INTEROP | QA | PSR>
- Feature scope: <area / workflow to cover>
- Acceptance criteria: <bulleted outcomes>
- Target spec path: <playwright-e2e/tests/.../YourTest.spec.ts>
- Auth context: <which login helper / realm to reuse>

The `playwright-autopilot` agent owns the workflow. Its non-negotiable rule: observe every step live via Playwright MCP before emitting any spec code — never generate from the description alone.
