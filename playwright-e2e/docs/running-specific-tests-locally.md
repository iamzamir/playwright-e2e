# Guide: Running Specific Tests Locally

This guide explains how to run specific Playwright tests locally on your machine for debugging, development, or targeted validation.

---

## 1. Quick Reference (Most Common Commands)

All commands are run from the `playwright-e2e/` directory:

```bash
cd playwright-e2e
```

| Goal | Command |
|---|---|
| **Run a single spec (INTEROP)** | `npm run test:target -- tests/PlanningSpace/PortalBYO/Test_001_PortalBYO.spec.ts` |
| **Run a single spec (QA)** | `npm run test:target:qa -- tests/PlanningSpace/PortalBYO/Test_001_PortalBYO.spec.ts` |
| **Run a single spec (PSR)** | `npm run test:target:psr -- tests/PlanningSpace/PortalBYO/Test_001_PortalBYO.spec.ts` |
| **Run in headed mode (see browser)** | `cross-env HEADLESS=false npm run test:target -- tests/.../SomeTest.spec.ts` |
| **Interactive Playwright UI Mode** | `npx cross-env USE_SPECIFIC_TESTS=false npx playwright test tests/.../SomeTest.spec.ts --ui` |
| **Step-by-step Debugger (Inspector)** | `npm run test:debug -- tests/.../SomeTest.spec.ts` |
| **Run by test title regex (`-g`)** | `npm run test:target -- tests/.../SomeTest.spec.ts -g "Verify Portal BYO icon"` |
| **Run a specific line number** | `npm run test:target -- tests/.../SomeTest.spec.ts:15` |
| **Run a focused domain folder** | `npm run test:interop:poui:calendar` |

> [!TIP]
> Notice the `--` separator before the spec path. In npm scripts, `--` tells npm to pass following arguments directly to the underlying Playwright CLI command.

---

## 2. Execution Methods

There are four primary ways to select and run tests locally:

### Method A: Targeted CLI Argument (Recommended for Single Specs)

Use `npm run test:target` (or `:qa` / `:psr`). These scripts automatically set `USE_SPECIFIC_TESTS=false` and `--workers=1` to prevent interference from other specs or config defaults:

```bash
# Single spec
npm run test:target -- tests/ProcessOrchestration/Calendar/Test_001_Calendar.spec.ts

# Specific test case within a file (by line number)
npm run test:target -- tests/ProcessOrchestration/Calendar/Test_001_Calendar.spec.ts:42

# Specific test case within a file (by title match)
npm run test:target -- tests/ProcessOrchestration/Calendar/Test_001_Calendar.spec.ts -g "TC 1"
```

---

### Method B: Comma-Separated List via `SPECIFIC_TESTS` Env Var

If you need to run several specific specs across different folders without editing any files, use `SPECIFIC_TESTS`:

#### In Git Bash / macOS / Linux:
```bash
cross-env USE_SPECIFIC_TESTS=true SPECIFIC_TESTS="tests/PlanningSpace/PortalBYO/Test_001_PortalBYO.spec.ts,tests/ProcessOrchestration/Calendar/Test_001_Calendar.spec.ts" npm run test:interop
```

#### In Windows PowerShell:
```powershell
$env:USE_SPECIFIC_TESTS = "true"
$env:SPECIFIC_TESTS = "tests/PlanningSpace/PortalBYO/Test_001_PortalBYO.spec.ts,tests/ProcessOrchestration/Calendar/Test_001_Calendar.spec.ts"
npm run test:interop
# Reset environment variables when finished:
$env:USE_SPECIFIC_TESTS = "false"; $env:SPECIFIC_TESTS = ""
```

> **Important:** `USE_SPECIFIC_TESTS=true` must be explicitly specified (or configured in `.env`), because `configs/setup.js` defaults `USE_SPECIFIC_TESTS=false`. Without this flag, `SPECIFIC_TESTS` is ignored and the target command runs the default suite.

`configs/playwright.config.ts` automatically parses this list, normalizes the paths, and executes only the specified specs.

---

### Method C: Persistent Local Workspace File (`specific-tests.local.json`)

When working on a feature or fixing a set of failing tests over multiple iterations, maintaining a local file is often most convenient:

1. Copy the example configuration:
   ```bash
   cp configs/specific-tests.example.json configs/specific-tests.local.json
   ```
   *(On Windows PowerShell: `Copy-Item configs/specific-tests.example.json configs/specific-tests.local.json`)*

2. Edit `configs/specific-tests.local.json` with the specs you are actively developing:
   ```json
   {
     "testFiles": [
       "**/PlanningSpace/PortalBYO/Test_001_PortalBYO.spec.ts",
       "**/ProcessOrchestration/Calendar/Test_001_Calendar.spec.ts"
     ]
   }
   ```

3. Ensure `USE_SPECIFIC_TESTS=true` is set in your `.env` file (or pass it in the command):
   ```bash
   npm run test:interop
   ```

> [!NOTE]
> `configs/specific-tests.local.json` is listed in `.gitignore`. It will never be committed to source control or affect CI runs.

---

### Method D: Predefined Test Suite Manifests (`SUITENAME`)

If you want to run one of the repository's curated suite files located in `tests/TestSuites/*.json`:

```bash
# Run the Scope batch
cross-env SUITENAME=ScopeBatch USE_SPECIFIC_TESTS=false npm run test:interop

# Run the PO Backend smoke suite
cross-env SUITENAME=POBackendSmokeBatch USE_SPECIFIC_TESTS=false npm run test:interop
```

If you specify an unknown or misspelled suite name (e.g. `SUITENAME=NonExistent`), the framework fails fast immediately at configuration load and prints the full list of available suites.

---

## 3. Interactive Debugging & Inspection

### A. Playwright UI Mode
Playwright's UI mode provides an interactive watch mode with locator inspection, time-travel debugging, and DOM snapshots:

```bash
npx cross-env USE_SPECIFIC_TESTS=false npx playwright test tests/PlanningSpace/PortalBYO/Test_001_PortalBYO.spec.ts --ui
```

### B. Playwright Inspector (Step-by-Step)
Opens the browser and pauses execution at each line, allowing you to step through actions or inspect locators live:

```bash
npm run test:debug -- tests/PlanningSpace/PortalBYO/Test_001_PortalBYO.spec.ts
```

### C. Headed Execution
By default, tests run headless. To see the browser window while running:

```bash
cross-env HEADLESS=false npm run test:target -- tests/PlanningSpace/PortalBYO/Test_001_PortalBYO.spec.ts
```

### D. Viewing Reports After Execution
- **Single-File Monocart Report:**
  ```bash
  npm run report:monocart
  ```
- **Playwright Native HTML Report:**
  ```bash
  npm run report:html
  ```
- **Playwright Trace Viewer:**
  ```bash
  npm run trace test-results/<test-folder>/trace.zip
  ```

---

## 4. Key Gotchas & Troubleshooting

1. **The `USE_SPECIFIC_TESTS=true` Error:**
   - If you see:
     ```text
     Error: USE_SPECIFIC_TESTS=true but neither SPECIFIC_TESTS nor configs/specific-tests.local.json lists any spec.
     ```
   - **Cause:** Your local `.env` has `USE_SPECIFIC_TESTS=true`, but you haven't created `configs/specific-tests.local.json` or passed `SPECIFIC_TESTS`.
   - **Fix:** Either set `USE_SPECIFIC_TESTS=false` in `.env`, or create `configs/specific-tests.local.json` from `configs/specific-tests.example.json`, or use `npm run test:target -- <path>`.

2. **Quarantined Tests (`TEST_IGNORE`):**
   - Certain known unstable specs are quarantined in `package.json` scripts via `TEST_IGNORE=...`. If a test is ignored, verify whether its path appears in `TEST_IGNORE`.

3. **Authentication State & Tokens:**
   - On local runs, authentication states are stored under `testdata/.auth/` (including realm-scoped browser storage-states and API token caches).
   - If login fails due to expired or corrupted storage state or bearer tokens:
     ```bash
     # Remove the entire auth directory to wipe cached browser storage states and API tokens
     npx rimraf testdata/.auth
     ```
     This completely removes the auth cache directory, forcing global setup and API helpers to re-authenticate cleanly on the next run. (Note: `npm run clean-reports` deletes `testdata/.auth/api-tokens.json` along with reports and logs, but does not wipe realm browser storage states).

4. **Sequential Execution (`--workers=1`):**
   - Most UI and data-mutating specs assume sequential execution against shared environments. Always keep `--workers=1` when testing individual flows locally to prevent race conditions.
