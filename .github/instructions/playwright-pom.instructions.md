---
description: "Page Object Model architecture and locator rules for Playwright page objects"
applyTo: "playwright-e2e/pageobjects/**/*.ts"
---
# Page Object rules

These apply on top of the global conventions in `.github/copilot-instructions.md`.

## 4-layer structure
Organize each page object in this order:
1. **Locators** — private getters, grouped by feature area.
2. **Helpers** — protected, non-action utilities (e.g. `waitForSection()`).
3. **Atomic actions** — public, single-control interactions (e.g. `clickSubmit()`).
4. **Composite actions** — public business workflows (e.g. `completeLoginFlow()`).

## Locator strategy
- Priority: `getByRole` > `getByTestId`/`data-testid` > `getByLabel`/`getByPlaceholder`/`getByText` > CSS. **NEVER use XPath.**
- For critical controls, implement fallback chains:
  ```typescript
  private get btnSubmit(): Locator {
    return this.page
      .getByRole('button', { name: 'Submit' })
      .or(this.page.locator('[data-testid="btn-submit"]'))
      .first();
  }
  ```

## Backward compatibility (mandatory)
- Before changing any existing method, search for all callers (`usages` / text search) and list them.
- If a method has more than one caller, do NOT rename or change its signature — add a new method alongside and mark the old one `@deprecated`.
- Prefer generic, parameterized methods over one-off duplicates (e.g. `openComponent(name)` not `openScopeTab()`).
- Place shell/active-view controls on the shared base or `PlanningPage`, not in a feature POM.

## Component objects (large pages)
- Split a large page object by screen region into component objects in `pageobjects/<page>/<region>.component.ts` (e.g. `pageobjects/planning/views-drawer.component.ts`). They extend `BasePage` and follow the same 4-layer order.
- The page object exposes the component as a public readonly field (`planningPage.viewsDrawer`) and keeps its existing public methods as one-line delegates, so callers and signatures don't change.
- When converting XPath, keep the attribute the XPath used (`getByTestId`, `[class*="…"]` for `contains(@class, …)`) unless a role or label is confirmed live; record the source of each test ID in the component's doc comment.
