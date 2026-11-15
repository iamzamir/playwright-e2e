> **Archived 2026-10-09 (T8.1).** The WDIO suite (`e2e/`) is retired and no longer migrated or run; see `e2e/RETIRED.md`. Kept for reference only. VS Code no longer loads this file from `.github/archive/`.

---
name: migrate-wdio-spec-to-playwright
description: Migrate one WDIO spec to Playwright with full analysis, POM gap detection, testdata creation, and suite registration
disable-model-invocation: true
argument-hint: "WDIO spec path and target Playwright test path"
---
Migrate one WDIO test spec to Playwright in this repository.

Inputs:
- WDIO spec path: <e2e/specs/.../YourSpec.spec.ts>
- Target Playwright spec path: <playwright-e2e/tests/.../YourSpec.spec.ts>
- Environment: <INTEROP | QA | PSR>
- Scope: <single spec | full batch folder>

The `playwright-migration` agent owns the full workflow — Phase 1 analysis (command audit, POM gap analysis, structural map, risk score) before any code, then Phase 2 implementation — plus all repo conventions. Do not port WDIO XPath selectors forward.
