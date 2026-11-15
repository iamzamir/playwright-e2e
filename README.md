# Planning Space and Process Orchestration UI & API Automation Framework

A comprehensive end-to-end test automation framework for Plan SOP applications across multiple environments (QA, INTEROP, PSR) supporting both UI and API testing.

### Frameworks in this Repository
- **Playwright (`playwright-e2e/`)**: Modern, high-performance Playwright automation suite covering Process Orchestration (PO) UI & Backend APIs, Planning Space (PS) UI, Visual Regression, and UI Performance testing. See [playwright-e2e/README.md](playwright-e2e/README.md) for detailed guides.
- **WebDriverIO (`e2e/`)**: Retired legacy suite, kept for reference only. No workflow runs it; see [e2e/RETIRED.md](e2e/RETIRED.md).

## 🚀 Features

- **Multi-Environment Support**: QA, INTEROP, and PSR environments
- **Test Runner**: Playwright (the legacy WebDriverIO suite is retired)
- **Cross-Browser & Cloud Testing**: Chrome locally and cloud via SauceLabs
- **API & Backend Testing**: Comprehensive REST API test utilities, Bearer token caching, and DB verification
- **Parallel & Batch Execution**: Isolated per-batch execution and multi-worker parallelism
- **Optimized Reporting**: Allure reports published to GitHub Pages, Monocart interactive single-file reports, and optional Playwright HTML reports
- **GitHub Pages Space Management**: Automatic Allure trace and video binary stripping to prevent repository bloat while preserving full debug assets in GitHub Action run artifacts
- **Configurable Retries**: Dynamic retry control via CI inputs (`default: 1`) and environment variables
- **Visual & Performance Testing**: Pixelmatch visual snapshot regression and UI performance metric collection

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Browsers**: Chrome / Chromium (installed via Playwright or locally)
- **Environment Variables**: Configured as per setup guide

## 🛠 Installation

### 1. Playwright Framework (Primary)

```bash
# Navigate to the Playwright directory
cd playwright-e2e

# Install npm dependencies
npm install

# Install Playwright browser binaries
npx playwright install chromium
```

Configure your environment variables in `playwright-e2e/.env` or export them in your shell:
```bash
# Target Environment: INTEROP, QA, or PSR
ENVIRONMENT=INTEROP

# User Credentials
FUNCTIONAL_TEST_USERNAME=your.username@jdadelivers.com
FUNCTIONAL_TEST_PASSWORD=your-password

# OAuth / Client Secrets
CLIENT_SECRET_IOP=your-client-secret-interop
CLIENT_SECRET_QA=your-client-secret-qa

# SauceLabs (Optional for cloud execution)
SAUCE_USERNAME=your-sauce-username
SAUCE_ACCESS_KEY=your-sauce-access-key
```

---

## 🏃‍♂️ Quick Start

### Playwright (`playwright-e2e/`)

```bash
cd playwright-e2e

# --- Process Orchestration Backend API Tests ---
# Run all 5 backend batches concurrently (ActionItems, Calendar, LinkManagement, Migration, ProcessBatch)
npm run test:interop:pobackend:parallel

# Run a specific backend batch
npm run test:interop:pobackend:actionitem
npm run test:interop:pobackend:calendar

# --- Process Orchestration UI Tests ---
# Run PO UI test suite
npm run test:interop:poui

# Run specific PO UI batches
npm run test:interop:poui:actionitems
npm run test:interop:poui:calendar

# --- Single Spec / Targeted Execution ---
cross-env ENVIRONMENT=INTEROP npx playwright test tests/ProcessOrchestration/ActionItemsBatch/Test_001_ActionItemInPO.spec.ts --config=configs/playwright.config.ts

# --- Visual Regression Testing ---
npm run test:visual
npm run test:visual:update  # Update baseline snapshots

# --- Viewing Test Reports ---
npm run report:monocart     # Interactive single-file report
npm run report:html         # Playwright native HTML report
npm run report              # Allure report (generate & open)
```

---

## 📁 Project Structure

```
plan-sop-ui-automation/
├── playwright-e2e/                       # Modern Playwright Automation Framework
│   ├── configs/                          # Playwright configurations
│   │   ├── playwright.config.ts          # Core configuration (retries, reporters, timeouts)
│   │   ├── playwright.sauce.config.ts    # SauceLabs cloud execution config
│   │   ├── playwright.visual.config.ts   # Visual regression config
│   │   ├── fixtures.ts                   # Custom test fixtures, isolation & video hooks
│   │   ├── global-setup.ts               # Auth caching and token initialization
│   │   └── allure-trace-filter.ts        # Allure reporter plugin for trace filtering
│   ├── pageobjects/                      # Page Object Model classes
│   │   ├── ProcessOrchestration/         # PO UI page objects
│   │   ├── PlanningSpace/                # PS UI page objects
│   │   └── common/                       # Shared navigation, headers, modal components
│   ├── tests/                            # Test specifications
│   │   ├── ProcessOrchestration/         # PO UI spec files
│   │   ├── ProcessOrchestrationBackend/  # PO Backend REST API spec files
│   │   ├── PlanningSpace/                # Planning Space UI specs
│   │   ├── VisualRegression/             # Pixelmatch snapshot specs
│   │   ├── Performance/                  # UI performance metric specs
│   │   └── TestSuites/                   # Suite JSON manifests
│   ├── scripts/                          # Execution & maintenance utilities
│   │   ├── run-po-backend-batches-parallel.js # Parallel multi-batch orchestrator
│   │   ├── strip-allure-traces.js        # Purges trace/video binaries from Allure results
│   │   ├── codegen.ts                    # Playwright code generator helper
│   │   └── finalize-spec.js              # Spec formatter and validator
│   ├── testdata/                         # Test data, schemas, and cached auth state
│   ├── reports/                          # Local test report artifacts
│   │   ├── allure-results/               # Lightweight Allure results (traces stripped)
│   │   ├── monocart-report/              # Single-file interactive HTML report
│   │   └── html-report/                  # Native Playwright HTML report
│   └── test-results/                     # Raw debug assets (traces, videos, screenshots)
│
├── e2e/                                  # RETIRED WebDriverIO suite, reference only (see e2e/RETIRED.md)
│
└── .github/workflows/                    # GitHub Actions CI/CD workflows
```

---

## 📊 Reporting & Debugging Strategy

### 1. Multi-Tier Reporting
- **Allure Report (GitHub Pages)**:
  - Aggregated test trends, history, pass/fail metrics, and step-by-step logs published automatically to the repository's `gh-pages` branch.
  - Test failure screenshots are embedded directly in the Allure report.
- **Monocart Interactive Report**:
  - Standalone single-file HTML report (`reports/monocart-report/index.html`) generated for every run.
- **Native Playwright HTML Report**:
  - Generated locally by default (`reports/html-report/index.html`).
  - In CI workflows, it is **disabled by default** to optimize runner execution time, but can be enabled on demand via the `enable-html-report` workflow input.

### 2. GitHub Pages Disk Space Management
Raw Playwright traces (`trace.zip`, 20–80 MB) and video recordings (`*.webm`) inflate the git commit history if committed to `gh-pages`:
- **Automated Stripping**: The [strip-allure-traces.js](playwright-e2e/scripts/strip-allure-traces.js) script and [allure-trace-filter.ts](playwright-e2e/configs/allure-trace-filter.ts) strip trace and video attachment entries from Allure results before report generation and GitHub Pages deployment.
- **Preserved in Run Artifacts**: Full traces and failure videos are preserved in `test-results/` and uploaded as a dedicated GitHub Actions run artifact named **`playwright-assets`**.
- **Inspecting Traces**: Download `playwright-assets.zip` from any workflow run and inspect traces locally:
  ```bash
  npx playwright show-trace path/to/trace.zip
  ```

### 3. Per-Batch Directory Isolation
When running concurrent batches on a single runner (such as `run-po-backend-batches-parallel.js`):
- Each process runs with an isolated `PW_REPORT_TAG=<batch>` environment variable.
- Playwright isolates output directories to `test-results/<batch>`, `reports/html-report/<batch>`, and `reports/monocart-report/<batch>`.
- Parallel batches will not clobber each other's test results, videos, or traces.

---

## 🚀 CI/CD Workflows

All workflows live under `.github/workflows/` and run on the self-hosted `az-*-ubuntu-latest-8Core` runners (scheduled runs use `az-dev-ubuntu-latest-8Core`; manual runs default to `az-prod-ubuntu-latest-8Core` and can be changed with the `chosen-os` input). Schedules are in UTC (IST = UTC + 5:30).

### Playwright workflows

| Workflow File | Suite Description | Schedule Trigger | Manual (`workflow_dispatch`) |
|---|---|---|---|
| [`playwright-po-backend-suite.yaml`](.github/workflows/playwright-po-backend-suite.yaml) | PO Backend API (6 parallel batches: actionitem, calendar, linkmanagement, migration, processbatch, uifields) | Daily 19:30 (QA/AZURE), 20:00 (QA/GRAVITEE), 20:30 (INTEROP/GRAVITEE), 21:00 (INTEROP/AZURE) | ✅ Environment, gateway, batch, retries & HTML report |
| [`playwright-po-iop-suite.yaml`](.github/workflows/playwright-po-iop-suite.yaml) | **Retired** (T8.3): PO UI on Sauce Labs, replaced by `playwright-po-iop-ui-local-suite.yaml`. Disabled; don't re-enable | None | Retired |
| [`playwright-po-iop-ui-local-suite.yaml`](.github/workflows/playwright-po-iop-ui-local-suite.yaml) | PO UI Suite on local headless Chrome (INTEROP) | Daily 21:30 | ✅ Retries & HTML report |
| [`playwright-ps-iop-ui-local-suite.yaml`](.github/workflows/playwright-ps-iop-ui-local-suite.yaml) | Planning Space UI suite, sharded (INTEROP) | Daily 22:00 | ✅ Retries & HTML report |
| [`playwright-custom-tests.yaml`](.github/workflows/playwright-custom-tests.yaml) | Custom / ad-hoc spec execution | Manual only | ✅ Spec, environment, retries & HTML report |
| [`playwright-performance.yaml`](.github/workflows/playwright-performance.yaml) | Playwright UI performance metrics | Daily 19:30 | ✅ Environment, retries & HTML report |
| [`visual-automation-test.yaml`](.github/workflows/visual-automation-test.yaml) | Visual regression (SauceLabs Screener) | Daily 22:15 | ✅ Visual suite, retries & HTML report |

### Other workflows

| Workflow File | Purpose | Schedule Trigger |
|---|---|---|
| [`po-qa-suite.yaml`](.github/workflows/po-qa-suite.yaml) | **Retired**: legacy WDIO PO suite (QA). Disabled, not in use | None (cron commented out) |
| [`complete-qa-suite.yaml`](.github/workflows/complete-qa-suite.yaml) | **Retired**: legacy WDIO complete suite (QA). Disabled, not in use | None (cron commented out) |
| [`ps-iop-suite-windows.yaml`](.github/workflows/ps-iop-suite-windows.yaml) | **Retired**: legacy WDIO Planning Space suite (INTEROP). Disabled, not in use | None (cron commented out) |
| [`po-backend-performance-test-interop.yaml`](.github/workflows/po-backend-performance-test-interop.yaml) | JMeter PO backend performance (INTEROP) | Daily 19:00 |
| [`po-backend-performance-test-psr.yaml`](.github/workflows/po-backend-performance-test-psr.yaml) | JMeter PO backend performance (PSR) | Manual only (cron disabled) |
| [`github-pages-deploy.yaml`](.github/workflows/github-pages-deploy.yaml) | Deploy the `gh-pages` branch to GitHub Pages | Called by the report and compaction workflows (`workflow_call`), or manually |
| [`gh-pages-compaction.yaml`](.github/workflows/gh-pages-compaction.yaml) | Compact `gh-pages` history to save disk space | Monthly, 1st at 01:30 |

### Workflow Dispatch Inputs
The Playwright workflows support these inputs when triggered manually:
- **`retries`**: Number of test retries for failed tests (options: `'0'`, `'1'`, `'2'`, `'3'`; default `'1'`, except `visual-automation-test.yaml`, which defaults to `'0'`).
- **`enable-html-report`**: Toggle native Playwright HTML report generation & artifact upload (default: `false`).
- **`environment`**: Target environment (`INTEROP`, `QA`, `PSR`; default `INTEROP`). Only on `playwright-po-backend-suite.yaml`, `playwright-custom-tests.yaml` and `playwright-performance.yaml`; the PO/PS UI suites are fixed to `INTEROP`.

### Scheduled Run Defaults
All automated cron schedules run with:
- **Retries**: `1` (`0` for visual automation)
- **HTML Report**: `false` (skipped in scheduled CI to reduce run duration and artifact footprint; Monocart and Allure reports are always generated)

---

## 🔧 Environment Variables Reference

| Variable | Description | Default | Scope |
|---|---|---|---|
| `ENVIRONMENT` | Target environment: `INTEROP`, `QA`, or `PSR` | `INTEROP` | Global |
| `PW_RETRIES` | Number of test retries on failure | `1` (CI) / `0` (local) | Playwright |
| `PW_ENABLE_HTML_REPORT` | Generate native Playwright HTML report (`true`/`false`) | `false` (CI) / `true` (local) | Playwright |
| `PW_REPORT_TAG` | Scopes output directories during parallel batch runs | `''` | Playwright |
| `PW_DISABLE_INLINE_ALLURE_FILTER` | Disables inline reporter cleanup during parallel execution | `false` | Playwright |
| `PW_NETWORK_ARTIFACT_MODE` | Network HAR capture mode: `always`, `failure-only`, `never` | `failure-only` | Playwright |
| `SUITENAME` | Test suite manifest name from `tests/TestSuites/*.json` | `''` | Playwright |
| `USE_SPECIFIC_TESTS` | Use allowlisted test specs in `playwright.config.ts` | `false` | Playwright |
| `DEBUG` | Enable debug logging output | `false` | Global |

---

## 📄 Scripts Reference

### Playwright Scripts (`playwright-e2e/package.json`)

| Script | Description |
|---|---|
| `npm run test:interop:pobackend:parallel` | Run all 5 PO Backend batches concurrently |
| `npm run test:interop:poui` | Run Process Orchestration UI suite |
| `npm run test:interop:pobackend:actionitem` | Run PO Backend ActionItem batch |
| `npm run test:interop:pobackend:calendar` | Run PO Backend Calendar batch |
| `npm run test:interop:pobackend:migration` | Run PO Backend Migration batch |
| `npm run test:interop:pobackend:processbatch` | Run PO Backend Process batch |
| `npm run test:interop:pobackend:linkmanagement` | Run PO Backend LinkManagement batch |
| `npm run test:visual` | Run visual regression tests |
| `npm run test:visual:update` | Update visual regression baseline snapshots |
| `npm run report:monocart` | Open interactive Monocart report |
| `npm run report:html` | Open Playwright native HTML report |
| `npm run report` | Generate and open Allure report |
| `npm run clean-reports` | Clean reports, logs, test-results, and cached tokens |

---

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```
3. **Make changes and add tests**
4. **Run tests locally**
   ```bash
   cd playwright-e2e && npm run test:interop:pobackend:actionitem
   ```
5. **Commit and push**
   ```bash
   git commit -m "Add new feature"
   git push origin feature/new-feature
   ```
6. **Create a Pull Request**

### Code Standards
- Use TypeScript for all new code.
- Follow the Page Object Model pattern.
- Ensure proper logging and error handling.
- When adding new Playwright workflows, support `retries` and `enable-html-report` inputs and strip traces from Allure before deploying to `gh-pages`.

**Happy Testing! 🧪✨**
