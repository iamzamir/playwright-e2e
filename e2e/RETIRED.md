# RETIRED: legacy WebdriverIO (WDIO) suite

Retired on 2026-10-09 (planning task T8.1). Kept in the repository for reference only.

- Not in use: no enabled workflow runs it, and it is not maintained.
- Its workflows (`complete-qa-suite.yaml`, `po-qa-suite.yaml`, `ps-iop-suite-windows.yaml`) are disabled in GitHub Actions and marked `[RETIRED]`. Don't re-enable them.
- Don't add or fix specs here, and don't migrate from here by default. New and updated tests go in [`playwright-e2e/`](../playwright-e2e/README.md).
- The WDIO migration agent and skill were archived under [`.github/archive/`](../.github/archive/).
