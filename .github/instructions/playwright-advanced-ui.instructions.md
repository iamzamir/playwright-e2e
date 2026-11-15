---
description: "Advanced UI testing standards: accessibility, native dialogs, file upload, layout/CSS, wizards, and async settling"
applyTo: "playwright-e2e/tests/**/*.spec.ts"
---
# Advanced UI testing standards

These extend `playwright-specs.instructions.md`. Reach for these patterns when a scenario needs more than basic click/assert. All snippets follow the global conventions: role-first locators, no XPath, and `getTimeout(tier)` from `constants/timeouts.ts` — never raw millisecond literals.

## Accessibility (a11y)
- When accessibility is in scope, use `AxeBuilder` (optional: `@axe-core/playwright` is not installed yet, so add it as a dev dependency in the same change) rather than hand-rolled checks.
- Scope the scan to the area under test and assert zero violations:
  ```ts
  import AxeBuilder from '@axe-core/playwright';
  const results = await new AxeBuilder({ page }).include('main').analyze();
  expect(results.violations).toEqual([]);
  ```
- Prefer fixing a real a11y gap over disabling a rule; document any `.disableRules([...])` with a reason.

## Native browser dialogs
- Register the handler **before** the action that triggers it; never rely on a post-hoc wait.
  ```ts
  page.once('dialog', dialog => dialog.accept());
  await planningPage.deleteSelectedPlan();
  ```
- Use `dialog.dismiss()` to cancel; assert `dialog.message()` when the text is part of the acceptance criteria.

## File upload
- Drive `<input type="file">` with `setInputFiles`; do not automate the OS file picker.
  ```ts
  await page.getByLabel('Upload data set').setInputFiles(path.join(dataDir, 'plan.csv'));
  ```
- For custom drop zones, resolve the hidden input via the POM; clear with `setInputFiles([])`.

## Layout & computed CSS
- Assert observable style/geometry only when it is part of the requirement.
  ```ts
  await expect(banner).toHaveCSS('background-color', 'rgb(200, 0, 0)');
  const box = await banner.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  ```
- Prefer semantic assertions (`toBeVisible`, `toHaveText`, `toHaveAttribute`) over pixel geometry where possible.

## Wizard / multi-step state
- Assert the active step and enablement of navigation at each transition, driven through POM methods.
  ```ts
  await expect(wizard.stepHeading()).toHaveText('Step 2 of 3');
  await expect(wizard.nextButton()).toBeDisabled();
  ```
- Do not skip intermediate validation just to reach the final step.

## Async settling (no static sleeps)
- Wait on deterministic conditions, not fixed delays:
  ```ts
  await expect(grid.getByRole('row')).toHaveCount(expectedRows);
  await page.waitForResponse(r => r.url().includes('/plans') && r.ok());
  await expect.poll(() => statusBadge.innerText()).toBe('Saved');
  ```
- There is no sanctioned static-sleep escape hatch: if content is still settling, wait on the concrete signal (a locator state, a response, or a polled value), not the clock.

## Explicitly out of scope
- **No** request mocking/interception frameworks (e.g. MSW) — these tests exercise the real stack.
- **No** XPath, including relative-XPath fallbacks.
- **No** `waitForTimeout` / static sleeps, and **no** full-page pixel `toHaveScreenshot` gating in functional specs.
