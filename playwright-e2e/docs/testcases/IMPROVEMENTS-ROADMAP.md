# Test Documentation & Coverage — Improvement Roadmap

Roadmap for extending the auto-generated test documentation into a coverage &
health toolkit. Items are **ranked by value for this repo**. Each item is
self-contained and can be implemented independently, step by step.

- **Base tool:** [scripts/generate-testcase-docs.js](../../scripts/generate-testcase-docs.js)
- **Command:** `npm run docs:testcases` (run from `playwright-e2e/`)
- **Current output:** `docs/testcases/TEST-CASES.md`, one `.md` per module, `test-cases-index.csv`
- **Guiding principle:** specs remain the single source of truth; everything is regenerated, never hand-edited.

---

## Priority summary

| # | Improvement | Value | Effort | Depends on |
|---|-------------|-------|--------|------------|
| 1 | Suite-registration gap check | High | Low | — |
| 2 | `test.only` / `.skip` / `.fixme` detector | High | Low | parser (done) |
| 3 | API endpoint coverage vs OpenAPI | High | Med | Swagger/OpenAPI source |
| 4 | Execution metrics from Allure/JSON results | High | Med | reporter output |
| 5 | Tag / priority taxonomy | Med | Med | team convention |
| 6 | Assertion density | Med | Low | parser (done) |
| 7 | Orphaned test data & POM methods | Med | Med | — |
| 8 | Trend over time | Low | Low | items 2/4 |
| — | Excel workbook (per-module tabs + Summary) | Med | Low | CSV (done) |

**Recommended first bundle:** #1, #2, #6 + Excel workbook (all low effort, no external inputs).

---

## 1. Suite-registration gap check

**Why:** Copilot instructions require every new spec to be registered in
`tests/TestSuites/*.json`. Unregistered specs silently never run in CI.

**Steps:**
1. Read every `*.json` under [tests/TestSuites](../../tests/TestSuites) and collect the glob/path
   patterns each suite lists.
2. Build the set of spec files each suite pattern resolves to.
3. Diff against the full spec list already collected by `collectSpecFiles()`.
4. Emit two lists: **specs in ≥1 suite** and **orphaned specs (in no suite)**.
5. Add a `## Suite Registration` section to `TEST-CASES.md` with the orphan
   count and a table of orphaned specs (linked).
6. Add an `In Suite(s)` column to `test-cases-index.csv`.
7. Optional CI gate: exit non-zero when orphans exist (see item 8 pattern).

**Acceptance:** report lists 0 orphans on a clean repo; adding an unregistered
spec makes it appear in the orphan table.

---

## 2. `test.only` / `.skip` / `.fixme` detector

**Why:** A committed `test.only` silently skips the rest of the file in CI;
`.skip`/`.fixme` hide disabled coverage. These must be visible.

**Steps:**
1. The parser already records `mode` per test (`default | only | skip | fixme`)
   and per describe. Reuse it.
2. Aggregate counts of each non-`default` mode across all specs.
3. Add a `## Flags` section to `TEST-CASES.md` listing every `only`/`skip`/`fixme`
   test with a link to the line.
4. Add a `Mode` filterable column to the CSV (already present).
5. Make `.only` a **hard error**: script exits non-zero if any `.only` is found
   (safe for CI). `.skip`/`.fixme` remain warnings.

**Acceptance:** committing a `test.only` fails `npm run docs:testcases`; the
flags section lists all skipped/fixme tests.

---

## 3. API endpoint coverage vs OpenAPI

**Why:** For `ProcessOrchestrationBackend` and `DataSetupBatch`, real coverage =
which API endpoints are exercised. Cross-referencing an OpenAPI/Swagger spec
reveals untested endpoints.

**Steps:**
1. Obtain the backend OpenAPI/Swagger document (URL or committed JSON/YAML).
   Store the path/URL in an env var or config constant.
2. In the parser, for API specs extract each call:
   `processAPIRequest('<METHOD>', <urlVar>, …)`. Capture METHOD and, where the
   URL is a literal or a known base + path, the endpoint path.
3. Normalize captured endpoints (strip query strings, replace ids with `{param}`).
4. Load the OpenAPI paths + methods; compute:
   - **Covered:** endpoint+method hit by ≥1 test.
   - **Uncovered:** in the spec but hit by no test.
   - **Unknown:** hit by a test but not in the spec (drift / stale endpoint).
5. Emit `docs/testcases/API-COVERAGE.md` with a coverage % and the three lists.
6. Add covered-endpoint columns to the CSV for API rows.

**Notes:** URL building is dynamic in some specs (e.g. `buildScopeUrl`), so
capture the base path from `process.env` usage where possible and mark the rest
as "dynamic — manual review".

**Acceptance:** coverage % computed; uncovered endpoints listed; known drift
surfaces in the "Unknown" list.

---

## 4. Execution metrics from Allure / JSON results

**Why:** Turns a static inventory into a live health dashboard: pass/fail rate,
duration, flakiness.

**Steps:**
1. Enable Playwright's JSON reporter (or reuse Allure results already produced by
   `npm run generate-allure`). Prefer the built-in JSON reporter for a stable schema.
2. After a run, point the generator at the results file
   (e.g. `--results reports/results.json`).
3. Parse per-test: status (`passed/failed/skipped`), duration, retries.
4. Join results to the static inventory by title + file (the CSV keys).
5. Compute per module and overall: pass rate, avg/median duration, slowest N
   tests, flaky tests (retries > 0 or status changed across retries).
6. Emit a `## Health` section in `TEST-CASES.md` and a `test-cases-health.csv`.

**Acceptance:** after a test run, health section shows pass rate, slowest tests,
and any flaky tests; missing results file degrades gracefully (section omitted).

---

## 5. Tag / priority taxonomy

**Why:** Enables questions like "what is my smoke coverage?" and lets CI run
subsets by priority.

**Steps:**
1. Agree a tag convention: `@smoke`, `@regression`, `@critical`, `@p1..@p3`.
   Use Playwright's `tag` option or `@tag` in titles.
2. Extend the parser to capture tags from test titles / annotations.
3. Add a `Tags` column to the CSV and a per-tag rollup to `TEST-CASES.md`
   (e.g. "Smoke: 42 tests across 6 modules").
4. Optional: verify every test has ≥1 priority tag; flag untagged tests.
5. Wire `--grep @smoke` npm scripts once tags exist.

**Acceptance:** tag rollup renders; untagged tests are listed if the rule is on.

---

## 6. Assertion density

**Why:** Tests with 0 assertions are a smell (they can pass without verifying
anything).

**Steps:**
1. In the parser, count assertion calls per test body: `expect(`,
   `commonFunctions.compareTwoValues(`, and any other project assertion helpers.
   Bound the body by the next `test(`/`describe(` or end of file.
2. Add an `Assertions` column to the CSV.
3. Add a `## Assertion Smells` section listing tests with **0** assertions.
4. Optionally report average assertions per test per module.

**Acceptance:** assertion counts populate the CSV; zero-assertion tests are
listed.

---

## 7. Orphaned test data & POM methods

**Why:** Detects dead fixtures and unused page-object methods (maintenance debt).

**Steps:**
1. **Test data:** list every file under `testdata/<ENV>/**`; scan all specs for
   `require('…/testdata/…')` references; report files referenced by no spec.
2. **POM methods:** for each `pageobjects/*.page.ts`, list public methods; scan
   specs + other POMs for calls; report methods called nowhere.
3. Emit `docs/testcases/ORPHANS.md` with both lists.
4. Treat as advisory (no CI gate) — some data is used dynamically by env.

**Acceptance:** known-unused fixture/method appears; obviously-used ones do not.

---

## 8. Trend over time

**Why:** Chart coverage growth and pass-rate trends across runs.

**Steps:**
1. After each generation, append a row to `docs/testcases/history.csv`:
   timestamp, total specs, total tests, per-module counts, and (if item 4 is
   present) pass rate.
2. Keep it append-only; commit periodically or on CI main-branch runs.
3. Optionally render a small trend table/chart in `TEST-CASES.md` from the last
   N rows.

**Acceptance:** each run appends one row; history renders without duplication.

---

## Excel workbook (per-module tabs + Summary)

**Why:** Stakeholder-friendly "tabs" per module plus a summary, while the flat
CSV stays the analytics source.

**Steps:**
1. Add a lightweight XLSX writer dependency (e.g. `exceljs`) as a dev dependency.
2. From the same in-memory data used for the CSV, create a workbook:
   - **Summary** sheet: per-module spec/test counts, flags, coverage %.
   - One sheet per module with the same columns as the CSV, filtered to that module.
3. Write `docs/testcases/test-cases.xlsx`.
4. Keep the flat CSV as-is (best for cross-module pivots).

**Acceptance:** workbook opens with a Summary tab plus one tab per module; counts
match `TEST-CASES.md`.

---

## Implementation conventions

- Extend the **existing** generator; keep it dependency-light (only add `exceljs`
  for the workbook). No TypeScript build step — plain CommonJS Node, 2-space indent.
- Every new report is **regenerated**, never hand-edited; add a "do not edit"
  banner.
- New outputs live under `docs/testcases/`.
- CI-gating items (#1 orphans, #2 `.only`) should exit non-zero only behind an
  explicit flag (e.g. `--strict`) so local doc generation never fails unexpectedly.
- Update this roadmap as items land.
