# Unified Test Report Dashboard and Failure Triage Plan

Date: 2026-10-06 · Status: draft for prioritisation · Scope: the **functional** nightly suites in `plan-sop-ui-automation`: PO backend (4 environment/gateway runs), PO UI and PS UI

**Decisions (2026-10-06):**
- Open-source tools only, hosted on **GitHub Pages**; no paid or self-hosted reporting server.
- AI assistance uses the company's **GitHub Copilot** licence and is the **last phase**.
- **Functional tests only.** The performance workflows (JMeter backend perf, Playwright UI performance on Sauce Labs) and the visual regression workflow are out of scope and will be handled later with a separate approach.
- The repo-health plan (stored outside the repo) is implemented after this reporting work. Nothing here depends on it.
- Nightly runs are not expected to pass 100%, so a run's red/green status follows the **run verdict policy in §4.1**, not "any test failed".

**Goal:** one place to open each morning that shows the result of every nightly run and already answers, for each failure: *what failed, why, which kind of failure it is (code, data, environment or real defect), how many tests share the cause, and, for real defects, a ready-to-file defect with steps and evidence.*

---

## 1. Current state (reviewed 2026-10-06 against the 2026-10-05 nightly runs)

### 1.1 Daily scheduled workflows

| Time (UTC) | IST | Workflow | What it runs | Report on gh-pages | Last night |
|---|---|---|---|---|---|
| 19:00 | 00:30 | `po-backend-performance-test-interop` | *Out of scope (performance)* JMeter PO backend perf | `InteropPerformanceReports/` | n/a |
| 19:30 | 01:00 | `playwright-po-backend-suite` | PO/AI/LM/UIF APIs, **QA + AZURE** | `PW-PO-BACKEND-QA-AZURE` | 450 ✔ · **9 ✖** · 39 skipped |
| 19:30 | 01:00 | `Playwright UI Performance` | *Out of scope (performance)* UI perf on Sauce Labs | `PLAYWRIGHT-SAUCELABS` | n/a (note: last report shows 0 tests) |
| 20:00 | 01:30 | `playwright-po-backend-suite` | **QA + GRAVITEE** | `PW-PO-BACKEND-QA-GRAVITEE` | 459 ✔ · **8 ✖** · 31 skipped |
| 20:30 | 02:00 | `playwright-po-backend-suite` | **INTEROP + GRAVITEE** | `PW-PO-BACKEND-INTEROP-GRAVITEE` | 568 ✔ · **2 ✖** · 2 skipped |
| 21:00 | 02:30 | `playwright-po-backend-suite` | **INTEROP + AZURE** | `PW-PO-BACKEND-INTEROP-AZURE` | 563 ✔ · **3 ✖** · 6 skipped |
| 21:30 | 03:00 | `playwright-po-iop-ui-local-suite` | PO UI, 6 matrix jobs | `PW-PO-UI-INTEROP-LOCAL` | 69 ✔ · **9 ✖** · 21 skipped |
| 22:00 | 03:30 | `playwright-ps-iop-ui-sharded-suite` | DataSetup + PS UI, 12 shards | `PW-PS-UI-INTEROP-LOCAL` | 278 ✔ · **58 ✖** · 159 skipped |
| 22:15 | 03:45 | `visual-automation-test` | *Out of scope (visual)* Visual regression | `PW-VISUAL-INTEROP-LOCAL` | n/a |

The last report is published at about 22:55 UTC (04:25 IST). Pages site: `https://supreme-adventure-mr9k94p.pages.github.io/`.

### 1.2 What last night's data shows

Taken from the downloaded `allure-results` artifacts of the PS UI, PO UI and backend INTEROP-AZURE runs:

- **Every run concluded "success" in GitHub**, even with 89 failures across the functional suites, because test steps use `continue-on-error`. See the run verdict policy in §4.1.
- **All skipped tests are cascade skips.** PS UI: 159 of 159 skips are in specs that had a failure, because a `describe.serial` failure skips the rest of the file. PS UI therefore had 217 of 495 tests not passing, from failures in **56 of 122 specs**. The skips carry no message, so the reports can't tell "skipped by design" from "blocked".
- **Allure classifies all 58 PS UI failures as "Product defects"**, because no `categories.json` is configured and that's Allure's default for assertion failures. The label is misleading: most of them are not product defects.
- **Error signatures repeat:**
  - 28 of 58 PS failures are `locator.waitFor: Timeout`.
  - 10 are a bare `expect(received).toBeTruthy()` (the `compareTwoValues` pattern, with no hint of what was checked).
  - The rest are strict-mode violations, "view did not become visible", "no drill-through candidate values", and similar.
- **Network evidence is strong but goes unused.** Of the PS failures with a network log, 25 contained HTTP 5xx. Top endpoints:

  | Count | Call | Likely meaning |
  |---|---|---|
  | 78 | `POST 502 /cbp/dev/foundation/objectivebar-kpi/v1/kpis` | Environment/config: a **`dev`** path called from INTEROP |
  | 51 | `GET 404 .../procedure-orchestration/v1/procedureExecutions/latest` | Probably benign background noise |
  | 6 | `POST 404 /lui/verticalFilterBff/v1/filters/...` | Product or data |
  | 5 | `GET 400 .../maas/controller/v1/calcEngines/{id}/scenarios` | MaaS data/state |
  | 2 | `GET 404 .../processModels/PSAutomationProcess` | Test-data issue (fixture missing) |

  Network logs are saved only for failing tests, so we can't yet tell "always happens" (ambient noise) from "caused this failure".
- **Usable evidence is already attached to UI failures:** screenshot, `error-context`, `failure-dom.html`, `failure-aria.yaml`, `failure-context.json`, `execution.json`, `console.log`, `request-failures.log` and `network-log.json`.
  - The `logMessage` step trail reads like manual test steps ("Clicking on Data tab in card settings" …), so it can become the *steps to reproduce*.
  - Responses carry `request-id` / `x-correlation-id` headers, so backend logs can be traced.
- **Backend API failures have almost no evidence:** only `stdout` and `error-context`, with no request/response pair, status or correlation ID. A defect can't be filed from the report alone.
- **Known defects keep failing every night.** The AI service returns 500 instead of 400 for `status: null` ("Update Assumptions Action Item with status as null"). It's already documented in `docs/Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html`, but nothing links the failure to the defect, so someone re-triages it every day.
- **Nothing pulls the reports together:**
  - The gh-pages root `index.html` is an empty Allure shell.
  - Each run sends its own Teams card, which has links but no counts.
  - Reports are kept for only 7 builds, so trends longer than a week are lost.
- **No run metadata about the system under test** (service/MFE versions, deployed build), so "what changed since it last passed" can't be answered.

---

## 2. Goals and success measures

| # | Goal | Measure | Target |
|---|---|---|---|
| G1 | One place for every nightly result | All scheduled suites visible on one page by 05:00 IST | 100% of runs; missing runs flagged |
| G2 | Every failure classified | Share of failing tests with a category (not *To investigate*) | ≥ 90% automatic, 100% after triage |
| G3 | Correct classification | Precision of the automatic category against the human decision | ≥ 85% after 4 weeks of feedback |
| G4 | Fewer things to look at | Failing tests ÷ distinct root-cause clusters | Shown daily (expect ~5–10× compression) |
| G5 | Fast triage | Time from opening the dashboard to all clusters decided | ≤ 15 min on a typical day |
| G6 | Defects ready to file | Product-defect clusters with a complete draft (steps, expected/actual, evidence, request IDs) | 100% |
| G7 | No re-triage of known issues | Known-issue failures auto-linked to their Jira key | 100% |
| G8 | Trust | A red run means new failures or a broken run; a green run means only known failures (§4.1) | 100% of nights (needs E1) |

---

## 3. Solution overview

```
 ┌──────────────── nightly workflows (unchanged test execution) ─────────────────┐
 │ PO backend ×4 · PO UI · PS UI shards   (performance + visual: out of scope)   │
 │   └─ NEW last step: "triage-pack" → normalise results + evidence index         │
 │        → upload artifact `triage-pack-<suite>` (+ keep Allure as today)        │
 └───────────────────────────────┬──────────────────────────────────────────────┘
                                 │ workflow_run (each completion) + 23:30 UTC sweep
                    ┌────────────▼─────────────┐
                    │ `nightly-triage` workflow │  (new, single place)
                    │ 1 collect packs           │
                    │ 2 env-health + run checks │
                    │ 3 history join (90 days)  │
                    │ 4 cluster failures        │
                    │ 5 classify (rules →       │
                    │   known issues → history  │
                    │   → change correlation →  │
                    │   optional AI)            │
                    │ 6 draft defects           │
                    │ 7 sync GitHub triage      │
                    │   issues ⇄ decisions      │
                    │ 8 publish JSON + digest   │
                    └───┬───────────────┬───────┘
                        │               │
     gh-pages `/dashboard/` (static)    Teams: ONE daily digest card
     reads compact JSON data           + per-run cards (optional, quieter)
                        │
     Humans confirm / reclassify via GitHub Issues labels ──► feeds back into step 7
```

### 3.1 Platform (decided): open source on GitHub Pages

Everything runs on what the repo already has: **GitHub Actions** for compute, **GitHub Pages** for hosting, **GitHub Issues** for triage decisions, and **Allure** (open source) for per-run detail.

- **No server or database:** the dashboard is static files reading JSON.
- **Open-source libraries only:**
  - Allure 2 (already used);
  - registries as plain JSON files with a `_schema` block (no YAML parser dependency);
  - a small charting library such as Chart.js or ECharts, vendored or loaded from a CDN;
  - optionally Vite to build the UI.
- **Private access:** the existing private Pages site (organisation sign-in) covers the dashboard; nothing becomes public.
- **Considered and rejected:**
  - ReportPortal: open source, but needs its own hosting (Docker/Kubernetes, Postgres, OpenSearch) and an ops owner.
  - Allure TestOps: commercial.

  The taxonomy keeps ReportPortal-compatible names (§4) in case that changes later.

---

## 4. Failure taxonomy

One test failure gets exactly one **category**. Clusters inherit the dominant category. Names match ReportPortal (in brackets) for portability.

| Category | Meaning | Typical evidence | Owner / action |
|---|---|---|---|
| **PRODUCT_DEFECT** (Product Bug) | The application or service behaves wrongly with valid data in a healthy environment | Causal HTTP 5xx (or wrong 4xx) from the service under test; a business assertion fails with correct inputs; fails on both gateways or both environments; started after a service commit | Dev team: file or link Jira, attach the defect draft |
| **AUTOMATION_ISSUE** (Automation Bug) | Our test code is wrong or out of date | Locator not found, strict-mode violation, selector drift (element present with another role/test ID in the DOM snapshot), TypeScript/runtime error in our code, wrong expectation, started after an automation commit | Automation team: fix spec or POM |
| **TEST_DATA_ISSUE** | Required data is missing, wrong, duplicated or left over | 404 on a fixture entity (e.g. `processModels/PSAutomationProcess`), 409 or "already exists", "No drill-through candidate values", empty grid where data was expected, failing DataSetup step | Automation team: fix data setup or cleanup; sometimes the environment owner |
| **ENVIRONMENT_ISSUE** (System Issue) | Infrastructure, configuration or a dependency is unavailable | 502/503/504 from the gateway; identity/login failure; MaaS cluster or SPARQ engine down; health probe red; mass timeouts across unrelated specs; `dev` URLs called from INTEROP; runner/browser crash | Environment/DevOps owner, or a known outage window |
| **KNOWN_ISSUE** | Matches an open, registered defect or limitation | Signature matches `triage/known-issues.json` | No action; counted; auto-close suggested when it passes again |
| **FLAKY** | Not deterministic | Passed on retry; or alternates pass/fail over the last 10 runs with the same code and data | Automation team: stabilise; quarantine if it fails often |
| **BLOCKED** (not a failure) | Skipped because an earlier test in the same serial file failed | `skipped` with no reason, in a spec with a failure | Shown under the blocking failure, never triaged separately |
| **TO_INVESTIGATE** | Rules couldn't decide | Anything else | Triage person (or the AI suggestion, §7.6) |

Each classification carries **confidence** (`high`, `medium`, `low`), **reasons** (the rules that fired, in plain words) and **evidence links**, so a person can check it in seconds.

### 4.1 Run verdict: when a nightly run should be red

**Problem:** the suites never pass 100%, so failing the job on any failed test would make every run red every day, which is as useless as always green. Today, `continue-on-error` makes every run green, which hides the nights when something new breaks or the run itself is broken (e.g. a shard crashes or a report is published with 0 tests).

**Policy:** red means "someone needs to act today"; green means "nothing new". Failures already accounted for don't turn a run red.

- **Keep `continue-on-error` on the test steps**, so reports, artifacts and Teams always publish.
- **Add a final `verdict` step** (`scripts/triage/verdict.js`) that compares the run with an **expected-failures baseline** and sets the job result.

| Verdict | Condition (any) | Job result |
|---|---|---|
| **BROKEN** | No results or far fewer tests than usual (e.g. < 80% of the 7-day median count); global setup or login failed; Allure/report generation failed; a shard crashed or timed out | **Red** |
| **UNEXPLAINED FAILURES** | At least one failing test that is **not** a registered known issue and not quarantined. Each is labelled by kind: *regression* (passed in one of the last 3 runs), *new-test* (no history), *persistent* (failed every recent run) or *recurring* | **Red** |
| **DEGRADED** | Pass rate dropped more than X points (start at 10) vs the 7-day median, even if each failure is known | **Red** (or a warning while the gate is in report-only mode) |
| **KNOWN FAILURES ONLY** | Every failure is a registered known issue, quarantined, or blocked by one of those | **Green**, with a `::notice::` annotation and the counts in the job summary |
| **ALL PASSED** | Nothing failed | **Green** |

- **Every unregistered failure counts**, including ones that have failed every night for weeks. The run stays red until someone registers them (known issue with a Jira key, or quarantine with an owner) or fixes them. Registering is a one-line, reviewed change, so "expected to fail" becomes an explicit decision instead of silent noise. `npm run triage:suggest` lists the recurring candidates.
- **Where the baseline comes from:** `triage/known-issues.json` (matched by test ID, error signature or endpoint, per environment/gateway), `triage/quarantine.json` (flaky tests with an owner and expiry date), and the last 7 runs' results from the dashboard data.
- **Rollout:**
  1. Weeks 1–2: run the verdict step in **report-only mode**. It writes the verdict to the job summary and the Teams card but always exits 0. Use these two weeks to fill the registries from the current daily failures.
  2. Week 3 onwards: switch to **enforce**.
  3. The switch is the repository variable `PW_VERDICT_MODE` (`report` or `enforce`; Settings → Secrets and variables → Actions → Variables), so enforcing needs no code change. A single workflow can override it in its `env:` block.
- **Considered and rejected:**
  - Playwright's `test.fail()` per known defect: it needs spec edits for every defect, and the repo rule is that known service defects are documented, not asserted in specs. A central registry keeps specs untouched and also feeds the dashboard.
  - Failing on any failed test: it's always red and gets ignored.
  - A pass-rate threshold alone: it misses a single new product defect inside a large suite.
- **Bonus:** when a known issue starts passing, the verdict step reports "**Known issue may be fixed: ABP-xxxx passed 3 times**", so the registry stays current.

---

### 4.2 Implementation status

**Phase 0 implemented** on branch `feature/nightly-triage-phase0` (2026-10-06), for the three functional workflows (PO backend, PO UI, PS UI):

| Item | Where |
|---|---|
| E1 run verdict (report-only by default; `vars.PW_VERDICT_MODE=enforce` to enforce) | `scripts/triage/verdict.js`, "Compute Run Verdict" step + final "Run Verdict" job in each workflow; verdict line on the Teams card; `triage-verdict` artifact |
| E2 labels (epic, feature, layer, service) | `scripts/triage/enrich-allure-results.js` (post-processing, so backend specs that use the base `test` are covered too) |
| E3 failed-step marking | `util/common.util.ts` `logMessage`: FAIL/ERROR lines become failed Allure steps |
| E6 blocked annotation | `enrich-allure-results.js`: serial-cascade skips get "Blocked: … failed earlier in this serial spec" |
| E9 categories | `triage/categories.json`, installed by the enrich script |
| Registries | `triage/known-issues.json`, `triage/quarantine.json` (started empty; 2026-10-07: KI-1 = ABP-19369, Action Item `status: null` → 500; `ambient-noise.json`: `procedureExecutions/latest` and `VARIANTMASTERs` 404s); `npm run triage:suggest` lists candidates |
| Tests | `npm run test:triage` (node:test, 15 cases) |

Validated against the 2026-10-05 nightly artifacts: counts match the published Allure totals, all 186 cascade skips (159 PS + 21 PO + 6 backend) are marked as blocked, and Allure accepts the categories.

**Phase 1 implemented** on branch `feature/nightly-triage-phase1`:

| Item | Where |
|---|---|
| Run data per suite run (evidence + Allure links) | `scripts/triage/build-run-data.js` + `lib/evidence.js`; "Build Dashboard Run Data" step in the three functional workflows, published with the report to gh-pages `dashboard/data/runs/<date>/<suite>__<run>.json` |
| Rules v1 + clustering | `lib/classify.js` (known issue, quarantine, login, cross-environment URL, gateway/network, server error, 404/409, strict mode/script error, message rules; 2-minute causal window), `lib/cluster.js` (group by causal endpoint or by error signature + code location) |
| Widespread errors | `lib/cluster.js`: an HTTP error in ≥ 5 failing tests with ≥ 3 different errors and ≥ 25% of failures with network logs is reported once and not used to explain individual tests; confirmed noise goes in `triage/ambient-noise.json` |
| Day build, missing-run detection, retention | `scripts/triage/build-day.js` (expected suites in `triage/suites.json`; Actions API tells running / ran-but-no-report / did-not-run; 90-day retention) |
| Dashboard pages 1–3 | `playwright-e2e/dashboard/` (static, no dependencies): Morning triage, Cluster detail, Run matrix (incl. backend environment × gateway grid); light/dark, phone width |
| Teams digest | `scripts/triage/teams-digest.js` |
| Workflow | `.github/workflows/nightly-triage.yaml` (23:45 UTC + manual with date), redeploys Pages, then posts the digest. A PO UI or PS UI scheduled run that finishes after the night was built, or a re-run of one (new run attempt), triggers a rebuild and an "updated" digest; nights start at 19:30 UTC, for run data and for the build, so a suite or triage run delayed past midnight, or a next-morning run, still lands on the right night |
| Tests | `npm run test:triage` (50 cases) |

Measured on the 2026-10-05 data (PS UI, PO UI, backend INTEROP-AZURE): 70 failures → 52 groups; 27 (39%) categorised automatically, 43 left as *To investigate* (mostly UI wait timeouts and bare `toBeTruthy()` assertions with no other evidence). Two widespread errors found (the `/cbp/dev/` objective-bar 502 and the `procedureExecutions/latest` 404). Below the Phase 1 targets (≥ 70% categorised, ≥ 5 failures per group): the Phase 0 failed-step marking (E3) gives new runs better titles and grouping for assertion failures, and Phase 3 evidence (API calls, environment health) is what moves timeouts out of *To investigate*.

**Rules v1.1** (branch `bugfix/triage-rules-v1-1`), after reviewing the first full night (2026-10-06, all 6 suites):
- Status codes in the failed check step are classified (`Expected Value:: 200 || Actual Value:: 404`, `Error: 500 …`), and the message rules also read the failed step.
- A backend job that ends in `ERROR` instead of `COMPLETED` is a product defect candidate.
- The login rule no longer matches tests *about* the unauthorized page.
- Quoted names are masked in signatures, so the same check on different views or scenarios forms one group.
- Static assets and cancelled requests are never a cause. An error is widespread from 15% of logged failures (was 25%), which catches the `VARIANTMASTERs` 404.
- A failed DataSetup spec is named as a possible cause on the test-data failures of the same run.

Result on 2026-10-06: 104 failures; categorised 39 → 45 (37.5% → 43.3%); groups 67 → 66. The `VARIANTMASTERs` 404 had been wrongly grouping 7 unrelated failures; they're now separate, which offsets the merges. The remaining 59 *To investigate* are all UI failures: 33 wait timeouts and 26 checks or other errors with no HTTP evidence. Reaching the Phase 1 targets needs the registries filled and the Phase 3 evidence.

**Phase 2, part 1: Known-issue recovery signal** (branch `feature/nightly-triage-phase2-recovery`):
- A registered known issue whose covered tests all passed (no retries), each for `autoCloseAfterPasses` consecutive runs including tonight, after at least one earlier failure, appears in the day dashboard and the run verdict summary as **may be fixed** (default threshold: 3). One rule (`findRecoveredKnownIssues` in `lib/registry.js`) feeds both.
- Matching uses stable spec/test selectors (message-only entries are never suggested); flaky passes and issues still failing tonight in any suite are not suggested. This is a human review prompt, not an automatic Jira close or verdict change.
- Tests: `npm run test:triage`.

**Phase 2, part 2: Group history and badges** (same branch):
- Each group in the day file gets `firstSeen`, `occurrences30d` (nights it failed out of `nights30d` nights with data) and `trend`: **NEW** (first failure in 30 nights), **PERSISTENT** (failed on ≥ 5 of the last 7 nights) or **RECURRING**. Group ids are stable hashes of the grouping key, so the same root cause matches across nights.
- History comes from a compact `clusterIds` list on each `index.json` row; rows written before this change fall back to their day file within the 30-night window.
- `recovering`: groups that failed on the previous night and not tonight, listed only when every suite they failed in reported a non-broken run. Known-issue and quarantine groups are left out.
- Dashboard: trend badge on each card, *First seen* and *Failed (30 nights)* on the group page, and a *No longer failing* panel. The Teams digest counts new groups and marks new top groups.

**Phase 2, part 3: Dashboard pages 5 and 6** (same branch):
- `build-day.js` loads the registries and writes `dashboard/data/registry.json` (`lib/registry-report.js`). Only the newest night writes it, so rebuilding an older night doesn't roll the pages back. Index rows also store `knownIssues: { id: failed }` for the per-issue history.
- **Known issues** (`#/known`): every known-issue and quarantine entry, expired ones included, with failures tonight, nights failed in the last 30, last seen, age, expiry (*expires soon* within 14 days) and the *may be fixed* suggestion.
- **Flaky** (`#/flaky`): tests that passed on retry over the last 14 nights (one run per suite and night; skipped and blocked runs don't count), flake rate, failures, approximate time lost to retries (assumes earlier attempts took as long as the final one), and quarantine candidates (flake rate above 20%, at least 2 retried passes, not already quarantined).

**Phase 2, part 4: Service map, defect drafts, test history and triage issues** (same branch):
- **`triage/service-map.json`:** endpoint regex and spec-folder prefixes → service, display name and repo (`team` is optional and not filled in yet). The causal endpoint decides when it matches; otherwise the spec folder does. Each group gets `service`.
- **Defect drafts** (`lib/defect-draft.js`): every group that needs a person (not known issues or quarantine) gets `draft: { title, text }` in the §8 format: component, category and reasons, environment and gateway, first seen and occurrences, affected tests, steps (API calls oldest first, or the INFO/STEP actions of the UI step trail ending with the failed check), expected vs actual (from `Expected:`/`Received:` or the `Expected Value:: … || Actual Value:: …` step), likely cause with response snippet, request IDs of 5xx/failed calls, and evidence links. The group page shows it with *Copy for Jira* (*Copy summary* for other categories).
- **Test history** (`#/tests`, `data/tests.json`, `lib/test-history.js`): one row per test over the last 30 nights with a status strip (passed, passed on retry, failed, skipped/blocked, not run), the category on failed nights, pass rate, retries, last vs median duration (highlighted when 50% slower) and service. Filter by text; `#/tests/<text>` links work, and each failed test on a group page links to its history. Written by the newest night only.
- **GitHub triage issues** (`scripts/triage/sync-issues.js`, §9.3): **off until the repository variable `TRIAGE_ISSUE_SYNC` is `true`**. After the day build, each group that needs a person gets one issue (marker `<!-- triage-cluster:<id> -->`; labels `triage`, `category:*`, `decision:pending`, `area:*`, `env:*`; body = the draft). New issues are capped per night (`TRIAGE_ISSUE_MAX_CREATE`, default 10, highest priority first; the rest follow on later nights if they recur). Every night the generated section is refreshed; labels and anything a person wrote outside it are kept, and closed issues stay closed.
  - People decide on the issue by ticking one box in its **Decision** section (see *Triage decisions by tick box* below); the labels still work: `decision:confirmed` confirms and swapping the `category:*` label reclassifies. A `Jira: ABP-12345` line outside the generated section links Jira.
  - Decisions go to `dashboard/data/decisions.json` and are applied to the night (category, counts, a reason line, `autoCategory` kept), and again on every rebuild. Cards show `#issue`, *confirmed* or *reclassified*; the group page links the issue.
  - Not done yet: rebuilding on the `issues` event (decisions show up at the next nightly build), and the duplicate check by endpoint across groups.

**Phase 3, part 1: E5 background-error baseline** (branch `feature/triage-e5-network-baseline`):
- **Capture:** every UI test that passes attaches `network-errors.json`, a compact errors-only summary (method, status or network failure, path without query string, count; at most 50 entries). It's only attached when there were errors. Failing tests keep the full `network-log.json` as before.
- **Run data:** `build-run-data.js` adds `networkBaseline: { passedTests, errors: { "GET 404 /path/{id}": tests } }`, counting only UI-layer specs (PlanningSpace, ProcessOrchestration; DataSetup and backend specs are left out). A UI run with no errors still counts, with an empty `errors` map; it's `null` only for runs without UI tests.
- **Day build:** `build-day.js` adds tonight's baseline to the previous 13 nights' (read from their day files). An error seen on **≥ 5% of passing UI tests (and ≥ 3 tests)** is a background error: never used to explain a failure (plan §7.2). The day file lists them in `backgroundErrors`, and the dashboard shows them in a collapsed panel.
- Widespread errors stay as they are, so cross-environment alerts such as the `/cbp/dev/` 502 remain visible even when they also happen on passing pages.

**Phase 3, part 2: E4 API-call evidence** (branch `feature/triage-e4-api-evidence`):
- **Recording:** `util/api-calls.util.ts` hooks the default axios instance (used by `ApiUtil` and the other API utils) when it's imported. It keeps the worker's last 10 calls: method, URL, status or error, duration, request id, and request and response bodies up to 20 KB.
  - Tokens, secrets, cookies, `Authorization` and email addresses are redacted before anything is stored.
- **Attachments:** a failing test gets `api-calls.json` (its calls since the previous test, so `beforeAll` calls count) and `api-repro.sh`, a curl of the last failed call (or the last call) with the token as `$TOKEN`. Passing tests attach nothing.
- **Fixtures:** the 63 API specs (ProcessOrchestrationBackend, DataSetupBatch) now import `test` from `configs/api-fixtures`, the base test plus this auto fixture (no browser). The UI fixtures include it too.
- **Triage:** run data carries `apiCalls` (newest 5) for failed tests. The newest call is the cause only when it got a **5xx or no response** (500 → product defect; 502–504 or no response → environment). 4xx are left to the check-step rules, since negative tests expect them.
- **Dashboard:** the group page shows the last API calls with request ids.

**Phase 3, part 3: E8 environment health probe** (branch `feature/triage-e8-env-health`, planning task T5.4):
- **Probe:** `scripts/triage/env-health.js` loads `configs/setup.js`, so it resolves hosts, endpoint paths and the machine client exactly like the test run. Checks: `token` (client-credentials token, the only POST), `portal`, `planning-mfe` and `po-ui` (portal pages; any status below 400 passes), and, with the machine token (2xx passes), `po-gateway` (`GET …/process-orchestration/v1/calendar`), `lm-gateway` (`GET …/links/v1/tenant`), `ai-gateway` (`GET …/actionitems/v1/kpis`, the only Action Items list a machine token can read), `uif-gateway` (`GET …/ui-fields/v1/list-page-config?pageId=1&entityName=PROCESS`) and `liam` (`GET iam/realm/v1/roles`; every service checks permissions in LIAM through the RBAC library's `LiamProxyService`, whose own permission-search route isn't visible from these repos). Each check gets a 10 s timeout (20 s for PO, Action Items and UI Fields, see below) and 2 retries; without a token the gateway checks are skipped. It writes `reports/triage/env-health.json` (URLs without query strings, no bodies or tokens) and the step output `healthy`. A probe that can't run (for example, missing credentials) writes `healthy: null`.
- **Workflows:** an `Environment Health` job in the PS UI, PO UI and PO backend workflows. It has no `needs`, so it runs while the tests start and never delays or blocks them. Checks per suite: PS UI `token,portal,planning-mfe,po-gateway,lm-gateway,ai-gateway,uif-gateway,liam`; PO UI `token,portal,po-ui,po-gateway,lm-gateway,ai-gateway,uif-gateway,liam`; PO backend `token,po-gateway,lm-gateway,ai-gateway,uif-gateway,liam`. The report job waits for it and downloads the `triage-env-health` artifact.
- **Verdict:** `verdict.js --env-health` adds `envHealth` to the verdict. With `TRIAGE_ENV_HEALTH_VERDICT=enforce` (repository variable, default `report`), an unhealthy probe is a BROKEN reason: "environment unhealthy before tests (po-gateway 503, …)". In `report` mode the job summary only shows it. The run still turns red only when `PW_VERDICT_MODE` is `enforce`.
- **Run data:** `build-run-data.js --env-health` adds `envHealth: { healthy, checkedAt, error, failed, checks[] }`.
- Measured 2026-11-05 on INTEROP and QA, both gateways: every check healthy. Pages, LM and LIAM take 0.3–2 s. The first PO, Action Items and UI Fields calls with a fresh token take about 4 s on Azure and 9–10 s on Gravitee (alone, PO answers in 0.7 s), so those three get a 20 s timeout.
- Not done yet: the MaaS cluster, SPARQ engine and fixture-entity checks from the E8 row in §6; the §7 rule that classifies failures as ENVIRONMENT_ISSUE when the probe was red. (The dashboard shows the probe since part 4.)

**Phase 3, part 4: E7 system-under-test versions** (branch `feature/triage-e7-sut-versions`, planning task T5.4):
- **Where versions come from:** the UI builds inline their build identity into their JavaScript bundle. planning-mfe (`ps-bundle.<hash>.js`) and lui (`assets/index-<hash>.js`) both carry `GITHUB_SHA`, `BUILD_TIME`, `GITHUB_RUN_NUMBER`, `GITHUB_REF_NAME` and `GITHUB_REPOSITORY`. Each app's page (the iframe the portal loads, not the portal route) is listed per environment in `triage/sut-versions.json`; names and repos come from `service-map.json`. On 2026-11-05 INTEROP served planning-mfe `cf39328` (PR #5808, built 2026-11-04) and lui `8046368` (built 2026-09-29).
- **Backend services:** not collected. The gateway routes no version path: `/actuator/*` answers "No context-path matches" and `/v1/actuator/info`, `/v1/version` and `/v1/info` answer `400 BY-API-AOG-C40020`. No response header carries a build either, and none of the services builds `build-info`. A version for them needs a service-side change (expose build info through the gateway).
- **Collector:** `scripts/triage/collect-versions.js`, a step in the `Environment Health` job. Read-only GETs of public static files, no token. Only the five whitelisted, format-checked fields are kept, because the bundle also inlines other build variables. A 5xx is retried once; failures are recorded per app (`page: HTTP 404`, `no build information in the bundle`, …). Writes `reports/triage/versions.json`, uploaded in the `triage-env-health` artifact with `env-health.json`. QA has no apps configured yet, so its runs record a note instead.
- **Run data:** `build-run-data.js --versions` adds `versions: { collectedAt, note, apps[] }`. A run with no test results is now still written when it has an env-health or versions file (start time from the probe), so a broken night shows as *Broken run* with its probe and builds instead of *No report*.
- **Day file and dashboard:** each suite gets `builds` (apps whose build was read), `buildChanges` (apps whose SHA differs from the previous night's run of that suite; index rows keep `builds: { key: sha }`) and `envHealth`. Suite tiles show "Builds planning-mfe cf39328 new, lui 8046368", linked to the commit, and the probe result when it wasn't healthy. Group pages show *Builds tested* and *Environment* for the suites the group failed in.
- Report-only: nothing in E7 changes a verdict or a run's colour.
- Not done yet: backend service versions (above); QA app URLs. Change correlation (§7.5) part 1 is implemented: see *Change correlation, part 1* below.
- **To plan: backend service versions.** Two ways found (2026-11-05), neither started:
  - *GitHub deployment history* (no service change). Each service's deploy workflow records a GitHub Deployment per environment with the deployed commit: `GET repos/BY-Product-Development/<service>/deployments?environment=RnD-Interop-NA`, then the latest one whose status is `success` (QA is presumably `RnD-PlatformQA-NA`; check). On 2026-11-05 INTEROP had PO `31c41cd` (2026-10-23), AI `45731bb` (2026-11-04), LM `90a41bb` (2026-10-09), UI Fields `7e6e357` (2026-10-06). Limits: it's the last recorded deploy, not what is running (a manual rollback or out-of-band deploy wouldn't show), and the workflow's `GITHUB_TOKEN` can't read other repos, so it needs a repository secret with read access to the four service repos.
  - *Expose build info from the services* (reads the running build). Add Spring Boot `build-info` (and git properties) to each service build, and a version route the gateway passes through, for example `/actuator/info` or a shared `/ops/version` in `po-be-commons` (its `OperationsAPI` already serves `/ops` to all four services). Needs changes in each service repo and in the gateway routes.

**Rules v1.2** (2026-11-05), after reviewing the 2026-11-04 night (99 failures, 68 *To investigate*):
- **Visual smoke diffs** (`Visual validation failed for <name>.png`): a screen that also failed on ≥ 3 of the previous 7 nights is AUTOMATION_ISSUE (medium), "baseline out of date: review the diff, then re-approve or mask". A first diff stays *To investigate*, since it could be a product change. Both group per baseline area (`VisualBaseValidations/<Area>/`) and history, not per PNG. A causal 5xx on the page still wins.
- **Failing-only widespread errors:** a widespread 5xx (or no-response) error that none of tonight's passing UI tests hit (needs ≥ 50 passing tests) is no longer treated as background, so the normal cause rules apply. On 2026-11-04, `GET 500 /ibp/assumptions/v1/assumption/{id}` came about 59 s before 19 launch-context timeouts (`PlanningListingPage.launchContext`, `PowerBarPage.verifyContextEntity`) and on 0 of 368 passing tests, while `.../assumption/editor` 500 was on 145 passing tests and stays background. 4xx and confirmed noise are never promoted. The group gets the reason "seen in many failures tonight but on none of the N passing UI tests"; `widespread[].failingOnly` marks them.
- **Twin specs:** an error thrown in an anonymous test body (first frame is the spec, no function) groups by spec folder, not spec file. The two identical `Cannot read properties of undefined (reading 'procedures')` groups (LinkManagement Test_005 / Test_007) are now one. Those groups get new ids and show as NEW for one night.
- **429** in a check step (`Expected Value:: 200 || Actual Value:: 429`) is ENVIRONMENT_ISSUE (rate limiting).
- Left as *To investigate* on purpose: timeouts with no failing-only HTTP error (`DrillThroughPage.performDrillThroughOnCardField`, `PlanningPage.waitForViewToBeDisplayed`), and PS UI failures with no `network-log.json` (9 of that night's 23 PS UI timeouts carry none, so the step trail is all there is).
- `triage/suites.json` now lists `VISUAL-CompleteSmokeVisual` (`visual-automation-test.yaml`, 22:15 UTC), so a missing visual run shows as missing and the suite gets a label instead of *Other*.

Replay of 2026-11-04 (same run data, same background list): categorised **31 → 57 of 99 (31.3% → 57.6%)**, groups 54 → 45 (PRODUCT_DEFECT 3 → 22, AUTOMATION_ISSUE 9 → 15, ENVIRONMENT_ISSUE 4 → 5, *To investigate* 68 → 42). Still below the 70% target; the next lever is network evidence for the PS UI failures that have none.

**Gateway outage grouping** (branch `feature/triage-5xx-burst-grouping`), after the 2026-11-09 night, when Gravitee answered 502 on about ten API areas partway through the PS UI Gravitee run. The probe before the tests was healthy, and the 13 failures became 13 one-test ENVIRONMENT_ISSUE groups:
- `classify.js` marks a result `gateway` when a 502/503/504 or a request with no response decided it: a causal error, a status in the failed check, or a gateway message.
- `cluster.js` (`findGatewayBursts`): when one suite run has **≥ 5 gateway-decided failures over ≥ 3 API areas** (first two path segments after `/cbp/<env>/`, e.g. `lui/notification`, `iam/realm`, `foundation/model`), they form one ENVIRONMENT_ISSUE (high) group, *Gateway errors across N API areas during <suite>*, with no single service. The first reason names the areas. One run is the time window, because run data keeps no clock time for HTTP errors. A 500 is never part of a burst, and cross-environment, background and widespread errors don't count, because they aren't causes.
- Replay with the same run data: 2026-11-09 goes from **56 to 45 groups**, with the 13 outage failures in one group. 2026-11-04 to 2026-11-08 and 2026-11-10 are unchanged (no false positives). The share categorised doesn't move, since these failures were already ENVIRONMENT_ISSUE. The gain is one decision instead of 13.
- This is a partial version of the level 2 rule in §7.3 ("≥ 30% of a suite's specs fail with gateway 5xx/timeouts within 10 min"). Still not done: using the env-health probe and clock time.

**gh-pages publish retry** (branch `feature/gh-pages-push-retry`). On 2026-11-06 and 2026-11-09, PO backend runs lost their report and run data: the `peaceiris/actions-gh-pages` push was rejected, with `fetch first` because another suite pushed between its clone and its push, or with the server's `fatal error in commit_refs`. The dashboard then showed those suites as missing.
- Every Playwright suite workflow that publishes with `keep_files: true` (the retired WDIO workflows are left as they are) now tries the deploy three times: the first two attempts use `continue-on-error`, a random 20–60 s and then 40–100 s wait comes before each retry, and only the last attempt can fail the job. Each attempt clones gh-pages afresh, so a retry publishes on top of the run that won.
- The retry is written out in each workflow, not in a local composite action, because suites check out `inputs.branch` and a manual run on an older branch wouldn't have the action.
- The backend performance workflows (`po-backend-performance-test-interop`, `-psr`) are left out. They publish their gh-pages checkout with `keep_files: false`, so a retry from that checkout would remove whatever another run pushed meanwhile.
- `nightly-triage.yaml` already rebased and retried its own push (5 attempts).

**Long-running groups** (branch `feature/triage-long-running-groups`). On 2026-11-10, 27 of the 44 groups were PERSISTENT and none had a decision. Groups that had failed every night since the dashboard started sat in the action queue with this week's failures, and the headline counted them all as "waiting on a decision".
- `build-day.js` (`withHistory`) adds `occurrences14d`, `nights14d` and `longRunning` to each group. A group is long-running when it was first seen at least 14 nights ago and failed on all but at most 2 of the last 14 nights with data for it (`nights14d` ≥ 7). A night counts as data for a group only when it failed then, or when a suite it failed in during the window (tonight's suites plus those in the earlier nights' day files, since group ids aren't suite-specific) has `status: reported` on that `index.json` row, so a night its suites didn't report is left out instead of counting as a pass. BROKEN runs count as data, since a crashed batch leaves the other batches' results.
- The Triage page lists long-running groups (not known issues or quarantined tests) in their own **Long-running failures** section below the action queue, oldest first, then by tests affected. Each row shows "failing since <first seen>"; the group page shows it next to the trend. A category filter still shows them with the rest of that category. The hero counts them separately, and "waiting on a decision" and the headline cover only the rest; with nothing else left, the headline reads "No new failures · N long-running groups still failing".
- The Teams digest leaves them out of **Top groups** and adds one line with their count.
- Replay of 2026-11-10 with the same run data: 11 groups are long-running (12 to 14 of 14 nights, first seen 2026-10-07 to 2026-10-24), and the action queue goes from 39 to 28 groups. `firstSeen` can't be earlier than the first `index.json` row with `clusterIds` (2026-10-07), so "failing since Oct 7" means "at least since".

**Change correlation, part 1** (§7.5, branch `feature/triage-change-correlation`). This answers "what changed since the previous night" for groups that are new tonight. It uses data the runs already record, so it needs no access to other repos:
- `build-day.js` gives each reported suite an `automationChange` (`{ from, to }`) when the run's commit of this repo differs from the previous night's run of that suite. Index rows now keep each suite's `sha`; older rows fall back to the previous day file.
- `lib/suspect-changes.js` (`withSuspectChanges`) adds up to 5 `suspectChanges` to each new group that isn't tracked or ENVIRONMENT_ISSUE (an outage isn't caused by a code change):
  - `app`: a UI app build change (`buildChanges`, E7) in one of the group's suites, only when the group has a UI-layer test.
  - `automation`: the suite's `automationChange`, only when the commit range touched the group's spec or the file of its failing frame. The files come from the GitHub compare API with the triage job's own `GITHUB_TOKEN`. If the files can't be read (no token, API error, 300+ files), the change is still named with `files: null`.
  - Each entry has a `compare` URL (`https://github.com/<repo>/compare/<from>...<to>`) and the suites it came from.
- **Shown:** a "planning-mfe changed" / "test code changed" pill on the queue row, a *Changed since last night* row with compare links on the group page, an `Automation:` line in the defect draft (app changes were already in `New builds:`), and "changed: …" on the group's line in the Teams digest.
- **Replay of 2026-11-09:** the night planning-mfe moved from `f58b96f` to `b751fe9` and the automation from `4fabd5a` to `9e431d4`. All 4 new non-environment groups got the planning-mfe change, and 2 of them also named the spec that the automation range changed (`ScenarioBatch/Test_002`, `Test_011`).
- **Still not done:** backend service changes (the services expose no version, see E7 above) and commits merged to the product repos between builds (needs a token that can read those repos). Only the previous night is compared, so a group first seen after a gap of several nights is compared with the night before it, not with the last night it passed.

**Triage decisions by tick box** (branch `feature/triage-decision-process`). By 2026-11-12 there were 190 triage issues and not one decision, so rule precision was never measured. Yet 140 issues had been closed, each with a comment saying why (passed again, duplicate of #N, not reproducible, fixed in PR #N). People were triaging, but by closing issues, and the sync only read labels.
- **Decision section:** new issues get a `<!-- triage-decision:start/end -->` block between the header and the draft. It has one task-list box "The category is right: it is <category>" (left out when the rules said To investigate) and one "It is <category>" box for each other category. Each line ends in a hidden `<!-- KEY -->` comment, so rewording a line doesn't break parsing. Open issues made before this get the block once, above the draft; closed issues aren't edited.
- **Reading it** (`lib/decisions.js`, `decisionFrom`): the first ticked box wins and names a category outright. It confirms when it matches tonight's rules and reclassifies otherwise. The start marker records the rules' category the section was written for (`rules=…`), so a "category is right" tick keeps its meaning if the rules later change their mind. Without a ticked box the labels decide: `decision:confirmed` confirms, and a `category:*` label reclassifies only if it differs from the label recorded in the start marker (`label=…`, the label the issue was created with: for an issue made before the Decision section, the first `category:*` label in its label history, so a swap made before the section still counts; tonight's rules category if the history can't be read). The sync never updates that label, so it goes stale when the rules change, and a stale label must not count as a person's swap. Issues without a recorded label fall back to comparing the label with tonight's rules. Only boxes inside the section count. While no box is ticked, the sync rewrites an open issue's section when tonight's rules category differs from the recorded one. The sync still never changes labels, so `decision:pending` stays on the issue after a box is ticked.
- **Close reason:** a closed issue's `state_reason` is kept as `triage.resolution` (`resolved`, `not planned`, `duplicate`). It is not a decision, because closing says what happened, not which category was right. The group page shows "closed (duplicate), no decision".
- **Agents:** `role-playwright-healer` step 5 says to tick the box (or swap the label) before closing a triage issue.
- **Failing again on a closed issue** (branch `feature/triage-failing-again`). The sync never reopens an issue, so on 2026-11-11 eight groups (20 failed, 49 blocked, including the two biggest of the night) failed again on issues closed weeks earlier, and nobody saw it. A group whose linked issue is closed is now flagged instead of reopened:
  - `triage-view.js` `isFailingAgain`: not tracked, and `triage.state` is `closed`. The queue puts these right after new groups, whether or not they have a decision. The night summary counts them (`failingAgain`), and the headline names them when there is nothing new, broken or missing.
  - The page shows a "closed · failing again" warning pill (with the close date when known, `triage.closedAt`) and a *Reopen #N* button in place of *Decide*. Long-running ones stay in their own section but get the same pill and button.
  - The Teams digest adds "🔁 N groups failing again on a closed issue: #… (reopen)", and a top group's line says "issue #N closed". The sync logs a `::notice` with the issue numbers.
- **Not done:** the 140 issues already closed keep no decision. Their groups mostly stopped failing, and decisions are only read for groups that fail tonight.

**Triage page redesign** (branch `feature/triage-dashboard-redesign`, data files unchanged):
- The page opens with one sentence on what deserves attention first (new groups, then broken runs, then missing suites), the night's facts and a 14-night pass-rate line.
- Suites are grouped by area and environment, so Azure and Gravitee sit side by side; a broken run shows its reason, and a build both gateways tested is listed once.
- A category bar with the share of failures explained replaces the summary line; the chips filter, and the filter is in the URL (`#/day/<date>/<CATEGORY>`).
- The per-category card lists are replaced by one **action queue**: new groups first, then groups with no decision, then by tests affected. Each row has one next step: *Copy for Jira* on product defects, otherwise *Decide on #issue*, or *Open* when there is no issue. `j`/`k` move, Enter opens, `c` copies the Jira draft. A group whose issue was closed without a label still counts as waiting and says so.
- Known and quarantined groups, widespread errors, passed on retry, no longer failing and background errors collapse under *Also tonight*; known issues that may be fixed stay open.
- The rules live in `dashboard/triage-view.js`, which has no browser dependency (tests: `scripts/triage/tests/triage-view.test.js`). Run matrix, Known issues, Flaky and Tests pages are not restyled yet.

**Phase 5, slice 1: Copilot healer prompt, issue code context and decision precision** (branch `feature/triage-phase5-copilot-assist`):
- **Healer prompt & code excerpts** (`scripts/triage/lib/defect-draft.js`): `withDrafts` now includes suite `Builds`, `New builds` (from E7), `Env health` (from E8) and `Location` in every draft. For `AUTOMATION_ISSUE` and `TO_INVESTIGATE` groups it also builds `draft.healerPrompt` (`buildHealerPrompt`), which adds numbered source lines around the failing frame (`pageobjects/`, `tests/`, `util/`, `configs/`, `network/`) and the failing `test(...)` block in the spec. Path traversal, symlinks out of those folders and non-TypeScript paths are rejected.
  - **Trust boundary:** the draft inside the prompt is wrapped in `BEGIN/END UNTRUSTED EVIDENCE` markers with a `Rules:` line telling the agent to treat it as data only; the marker text is stripped from the evidence so it cannot close the block early. Repository code excerpts sit outside the block.
  - **Spec excerpt:** only `test(...)` declarations are matched, by literal title, by template title (`${...}` parts as wildcards), by literal prefix for `'a' + b` titles, or by the block enclosing the failing line when the frame is in the spec. No match means no excerpt (never the file header); duplicate titles are labelled.
  - **Commits:** day suites carry the run's automation `sha`; a `Code context` line names it and the commit the excerpts were read from (`GITHUB_SHA`), with a caution when they differ, because `nightly-triage.yaml` reads the files from the current `main` checkout (`fetch-depth: 1`).
- **Dashboard & GitHub triage issues:** the cluster detail page (`dashboard/app.js`) shows a **Copy healer prompt** button next to *Copy summary*, ready to paste into VS Code Copilot with `.github/prompts/triage-failure.prompt.md` or the `Playwright Healer` agent. `scripts/triage/sync-issues.js` embeds the healer prompt and code context in a collapsible `<details><summary>Copilot healer prompt & code context</summary>` block inside the generated section (`healerPromptForIssue` replaces the evidence block with a pointer to the draft above, so the draft is not repeated), so assigning an `AUTOMATION_ISSUE` or `TO_INVESTIGATE` issue to Copilot gives it the exact failing code and evidence immediately.
- **Decision precision tracking** (`scripts/triage/lib/decisions.js` `decisionPrecision`): `build-day.js` and `sync-issues.js` compute `decisionStats: { decided, confirmed, reclassified, precisionPct, resolved }` on each day file and `index.json` row, and the dashboard category bar shows the rule precision when human decisions exist. Groups the rules left as `TO_INVESTIGATE` are not counted in the precision (the rules made no call); the ones a person reclassified are counted as `resolved`. The `index.json` copy is kept for a later precision trend and is not shown yet.

---

## 5. Data model (compact JSON, published to gh-pages `/dashboard/data/`)

### 5.1 `runs/<date>/<suiteKey>.json`: one per workflow run

```json
{
  "suiteKey": "PW-PS-UI-INTEROP-LOCAL", "area": "PS-UI", "environment": "INTEROP", "gateway": "AZURE",
  "realm": "cbp-interop-ps-automation-2", "workflow": "playwright-ps-iop-ui-sharded-suite",
  "runId": 37380912913, "runNumber": 243, "trigger": "schedule", "automationSha": "3150241",
  "startedAt": "...", "finishedAt": "...", "durationMin": 38,
  "sut": { "planning-mfe": "x.y.z", "lui": "x.y.z", "po-service": "build-123", "ai-service": "…" },
  "envHealth": { "gateway": "ok", "login": "ok", "maas": "degraded", "sparq": "ok" },
  "totals": { "passed": 278, "failed": 58, "flaky": 5, "blocked": 159, "skippedByDesign": 0, "total": 495 },
  "links": { "allure": "...", "monocart": "...", "artifacts": "...", "workflow": "..." },
  "tests": [ /* TestResult[] (failed, flaky and blocked in full; passed as id + duration only) */ ]
}
```

### 5.2 `TestResult`

```json
{
  "testId": "<allure historyId>", "spec": "tests/PlanningSpace/CardsBatch/Test_010_BulletChart.spec.ts",
  "title": "Test Case 2: Verify Graph is Visible", "area": "PS-UI", "feature": "CardsBatch",
  "status": "failed", "attempts": 2, "durationMs": 52000,
  "error": { "type": "TimeoutError", "message": "locator.waitFor: Timeout 15000ms exceeded", "location": "pageobjects/cards.page.ts:812 verifyAlertMsg" },
  "failedStep": "Error while verifying alert message \"Bullet Chart has been updated successfully\"",
  "stepTrail": ["Clicked Edit View Option", "Clicking on three dot menu of Bullet Chart card", "..."],
  "httpErrors": [{ "method": "POST", "status": 502, "endpoint": "/cbp/{env}/foundation/objectivebar-kpi/v1/kpis", "service": "foundation-objectivebar", "requestId": "…", "msBeforeFailure": 4200, "ambient": true }],
  "blockedTests": ["Test Case 3: …", "Test Case 4: …"],
  "signature": "TimeoutError|cards.page.ts:verifyAlertMsg|alert:bullet-chart-updated",
  "clusterId": "c-7f3a…",
  "classification": { "category": "PRODUCT_DEFECT", "confidence": "medium", "source": "rules", "reasons": ["Causal POST 5xx on card save endpoint 1.2s before failure", "Passed in previous 6 runs", "No automation change since last pass"] },
  "history": { "last10": "PPPPPPPPPF", "firstFailedRun": 243, "lastPassedRun": 242, "flakeRate30d": 0.0 },
  "evidence": { "screenshot": "…", "trace": "…", "dom": "…", "network": "…", "allureTest": "…" }
}
```

`error.location` is stored as `{ file, line, function }`: the first stack frame in our own code (`pageobjects/`, `tests/`, `util/`, `configs/`, `network/`), so a POM failure names the POM file, line and method directly. `scripts/triage/rank-pom-methods.js` (T7.1) ranks POM methods from it. Data gap: passing records (including flaky passes) keep no error or stack, so the failed attempt of a flaky pass cannot be located from run data. The ranking credits a flaky pass only when the same test also failed outright in a POM method during the window. Storing the failed attempt's location on flaky records would close the gap.

### 5.3 `clusters/<date>.json`: `FailureCluster`

```json
{
  "clusterId": "c-7f3a…", "signature": "…", "title": "Card save returns 502: alert never shown",
  "category": "PRODUCT_DEFECT", "confidence": "medium", "decision": "pending|confirmed|reclassified",
  "affected": { "tests": 7, "specs": 4, "suites": ["PW-PS-UI-INTEROP-LOCAL"], "environments": ["INTEROP"], "gateways": ["AZURE"] },
  "blockedCount": 19, "firstSeen": "2026-10-03", "occurrences30d": 3, "occurrences14d": 3, "nights14d": 14, "longRunning": false, "trend": "new|recurring|persistent|recovering",
  "suspectChanges": [{ "kind": "app|automation", "key": "planning-mfe", "repository": "BY-Product-Development/plan-sop-planning-mfe", "from": "<sha>", "to": "<sha>", "url": "https://github.com/…/compare/<from>...<to>", "files": ["playwright-e2e/…"], "suites": ["PW-PS-UI-INTEROP-LOCAL"] }],
  "knownIssue": null, "githubIssue": 812, "jira": null,
  "defectDraft": { /* §8 */ }
}
```

### 5.4 Registries, version-controlled under `playwright-e2e/triage/`

- `known-issues.json`: `id`, `jira`, `title`, `category`, `match` (any of: `messageRegex`, `specGlob`, `endpoint`, `status`, `environment`, `gateway`), `since`, `expires` (forces a re-check), `autoCloseAfterPasses: 3`.
- `quarantine.json`: `testId` or `specGlob`, `reason`, `owner`, `since`, `expires` (max 30 days, then the run verdict counts it again).
- `ambient-noise.json`: HTTP errors that happen on healthy pages and must never count as a cause (e.g. `GET 404 procedureExecutions/latest`, once confirmed), each with a reason and owner.
- `service-map.json`: URL pattern → service and owning team (`/po/api`, `ibp/process-orchestration` → PO service; `/ai/api` → Action Item; `/lm/api`, `ibp/links` → Link Management; `ui-fields` → UI Fields; `maas` → MaaS; `foundation-*` → Foundation; `/lui/` → PO UI BFF). This turns a URL into "which team".
- `rules.json`: the classification rules from §7.3 as data, so the team can tune them without code changes.

---

## 6. Evidence capture changes in the framework (Phase 0/1 prerequisites)

The quality of classification depends on the evidence. These are small, targeted changes:

| # | Change | Where | Why |
|---|---|---|---|
| E1 | **Run verdict step** (§4.1): keep `continue-on-error` on tests; add a final verdict step that turns the run red only when it is BROKEN, has UNEXPLAINED FAILURES, or is DEGRADED. Report-only mode first. | All workflows (once, in a reusable step) | G8; red means "act today" |
| E2 | **Allure labels on every test**: `epic` (PS-UI / PO-UI / Backend), `feature` (folder), `service`, `owner`, `layer` (ui/api), and `issue`/`tms` links when known | `configs/fixtures.ts` auto-fixture (derived from path, no spec edits) | Grouping, ownership, Jira links in Allure and the dashboard |
| E3 | **Mark the failing step as failed**: `logMessage('FAIL', …)` sets the Allure step status to failed; `compareTwoValues` uses `expect.soft` | `util/common.util.ts` | Pinpoints *which check* failed instead of `toBeTruthy()` |
| E4 | **API evidence on failure**: `ApiUtil` keeps a ring buffer of the last 10 calls per test (method, URL, redacted headers, request body, status, response body up to 20 KB, duration, `request-id`/`x-correlation-id`) and attaches it as `api-calls.json` plus a ready-to-run redacted `curl` on failure | `util/api.util.ts` + fixture | Backend defects become reproducible; correlation IDs let devs find server logs |
| E5 | **Error-only network summary for every UI test** (not just failures), max ~50 entries | `network/network.interceptor.ts` (`capped` mode already does the filtering) | Builds the *ambient error baseline*: an error seen on passing tests isn't the cause |
| E6 | **Blocked annotation**: in `describe.serial`, annotate skipped tests with `blocked-by: <failed test>` | fixture `afterEach` + `test.info().annotations` (or derived in post-processing) | Turns 159 anonymous skips into "19 blocked by 1 failure" |
| E7 | **Run metadata**: `environment.properties` / executor with automation SHA, realm, gateway, URL mode, and **versions of the system under test** (version/info endpoints of the PO, AI, LM and UIF services; MFE build from the app manifest or `meta` tag). Built so far: UI builds from their bundles; the services expose no version through the gateway (§4.2) | `scripts/triage/collect-versions.js` + `triage/sut-versions.json` → `reports/triage/versions.json` | "What changed since it last passed" |
| E8 | **Environment health probe** as the first job of each workflow (or a shared 18:45 UTC job): token endpoint, gateway ping, each service health/version, portal login, MaaS cluster state, SPARQ engine state, key fixture entities exist (e.g. `PSAutomationProcess` process model). Built so far: token, portal and UI pages, PO and LM gateways (§4.2) | `scripts/triage/env-health.js` → `reports/triage/env-health.json` | Pre-classifies mass failures as ENVIRONMENT or TEST_DATA before anyone looks |
| E9 | **Allure `categories.json`** (quick win, day 1): regex buckets *Locator timeout*, *Strict mode*, *HTTP 5xx*, *Auth/login*, *Assertion: value mismatch*, *Test data missing*, *Known issue: AI status null 500* | Written into `allure-results/` by the triage-pack step | Every existing Allure report immediately stops saying "Product defects" for everything |
| E10 | **Redaction everywhere**: reuse `redact()` from `failure-hook.ts` for tokens, cookies, `Authorization`, client secrets, emails | Shared `util/redact.util.ts` | Evidence leaves the runner; it must be safe |

---

## 7. Triage engine (Node, `playwright-e2e/scripts/triage/`)

### 7.1 Inputs and steps

1. **Collect** `triage-pack-*` artifacts for the night (from `workflow_run` events, plus a 23:30 UTC sweep that also detects **missing or late runs**).
2. **Normalise** Allure results → `TestResult` (last attempt wins; earlier attempts used to detect flakes).
3. **Join history** from the last 90 days of `runs/*.json` (kept compact in gh-pages, roughly 50–150 KB per run).
4. **Derive cascades** (BLOCKED), **ambient errors** (E5 baseline) and **causal HTTP errors** (§7.2).
5. **Cluster** (§7.4) → **classify** (§7.3) → **correlate changes** (§7.5) → optional **AI assist** (§7.6).
6. **Draft defects** for PRODUCT_DEFECT and TO_INVESTIGATE clusters (§8).
7. **Sync GitHub triage issues** (§9.3) and apply human decisions as overrides.
8. **Publish** `runs/`, `clusters/`, `summary/<date>.json` and `index.json` to gh-pages `/dashboard/data`, then send the **Teams digest**.

### 7.2 Causal HTTP error heuristic

An HTTP error is **causal** for a failure when all of these hold:
- It's within a window before the failure (default 30 s; configurable per area).
- It isn't in `ambient-noise.json`, and its frequency on *passing* tests over the last 14 days is under 5% (baseline from E5).
- It isn't widespread across tonight's failures, unless it's a 5xx or no-response error that none of tonight's passing UI tests hit (Rules v1.2).
- It belongs to the service the spec tests, or to the request behind the failed step (endpoint keywords match the step text, e.g. "save" → POST/PUT).

### 7.3 Rule pipeline (first match wins inside a level; levels run in order)

| Level | Rule | Result |
|---|---|---|
| 0 | Test is `skipped` with no reason in a spec that has a failure | BLOCKED (attached to that failure) |
| 1 | Matches `known-issues.json` | KNOWN_ISSUE (high) |
| 1 | Listed in `quarantine.json` (not expired) | FLAKY (quarantined), excluded from the verdict |
| 2 | `env-health.json` shows the dependency red during the run, **or** ≥ 30% of a suite's specs fail with gateway 5xx/timeouts within 10 min | ENVIRONMENT_ISSUE (high) |
| 2 | Login/identity step failed (`oidc-login`, B2C pages, 401 on token endpoint) | ENVIRONMENT_ISSUE (high); TEST_DATA_ISSUE if only one user's credentials fail |
| 2 | Causal 502/503/504 or a network error (`ERR_CONNECTION`, DNS) | ENVIRONMENT_ISSUE (medium) |
| 2 | ≥ 5 failures in one run decided by 502/503/504 or no response, over ≥ 3 API areas (implemented: `findGatewayBursts`) | ENVIRONMENT_ISSUE (high), one group per run |
| 2 | URL contains a different environment segment (e.g. `/cbp/dev/` during an INTEROP run) | ENVIRONMENT_ISSUE (high), reason "cross-environment config" |
| 3 | Causal 404 on an entity the test expects to exist; 409/"already exists"; messages like "No … candidate", "not found in list"; DataSetup spec failed earlier that night | TEST_DATA_ISSUE (medium–high) |
| 4 | `strict mode violation`; `TypeError`/`ReferenceError` from our files; "Could not find … with any selector"; locator timeout with **no** causal HTTP error **and** the DOM snapshot contains a likely replacement (same text, different role/test ID) | AUTOMATION_ISSUE (medium–high) |
| 4 | First failure lines up with a commit touching this spec, its POM or its testdata, and no SUT change | AUTOMATION_ISSUE (high) |
| 5 | Causal 500 (or a wrong 4xx such as 500 instead of 400) from the service under test | PRODUCT_DEFECT (high) |
| 5 | API assertion on response content fails with a 2xx (backend specs) | PRODUCT_DEFECT (medium) |
| 5 | Same test fails on **both** gateways (AZURE + GRAVITEE) and/or both QA and INTEROP, and a SUT version changed since the last pass | PRODUCT_DEFECT (high) |
| 5 | Fails on **only one gateway** across the 4-run backend matrix | ENVIRONMENT_ISSUE (medium), reason "gateway-specific (routing, auth or permissions)" |
| 6 | Passed on retry in this run, or `last10` has ≥ 2 pass↔fail flips with no code or data change | FLAKY (medium); also add the underlying category as secondary |
| 7 | Locator/assertion timeout with no other signal | TO_INVESTIGATE (low), with the Copilot suggestion once Phase 5 is enabled |

**History modifiers** (shown as badges, they don't change the category):
- **NEW**: first failure in 30 days.
- **REGRESSION**: passed in the last 3 runs.
- **PERSISTENT**: failed in ≥ 5 of the last 7.
- **LONG-RUNNING** (implemented): first seen ≥ 14 nights ago and failed on all but ≤ 2 of the last 14 nights with data; shown apart from the action queue.
- **RECOVERING**: a previously failing cluster passed today.
- **ENV-SPECIFIC**: fails only in QA or only in INTEROP, or only on one gateway.

### 7.4 Clustering (many failures → one root cause)

- **Signature** = error type + normalised first message line (numbers, GUIDs, timestamps and quoted dynamic names stripped) + top frame in *our* code (`pageobjects/x.page.ts:method` or the spec) + causal endpoint (method + templated path + status), if any.
- **Merge** signatures across suites, environments and gateways when the causal endpoint and status are equal (e.g. all "objectivebar-kpi 502" failures form one cluster whatever the locator was).
- **Second pass**: group remaining TO_INVESTIGATE items by `(failed step text, POM method)`.
- Show **"1 cause → N failed + M blocked tests"** on every cluster card.

### 7.5 Change correlation ("what changed since it last passed")

- **Automation side:** `git log <lastPassSha>..<thisSha> -- <spec> <imported POMs/utils> <testdata file>`.
- **Product side:** for the services involved (from `service-map.json`), list commits merged to `main` between the last-pass time and this run, using `gh api` across the sibling repos (`plan-sop-planning-mfe`, `plan-sop-lui`, `plan-sop-process-orchestration-service`, `plan-sop-actionitem`, `plan-sop-link-management`, `plan-sop-ui-fields-service`, `plan-sop-po-be-commons`). Combine with the E7 SUT versions when deployments lag merges.
- Output: up to 5 **suspect changes** per cluster, ranked by file overlap with the failing area (e.g. commits touching the `cards` folder for a cards-page failure).

### 7.6 AI-assisted triage with GitHub Copilot (last phase)

The rules engine stays the primary classifier. Copilot helps with the **TO_INVESTIGATE** clusters, with **writing defect drafts**, and with **fixing automation issues**. Everything below builds on artifacts the earlier phases already produce.

- **Evidence pack** (built by code in Phase 1–3, redacted, saved per cluster as `evidence/<clusterId>.md` and attached to the cluster's GitHub triage issue):
  - error and failed step;
  - step trail;
  - causal and ambient HTTP errors with response snippets;
  - the relevant DOM/ARIA excerpt;
  - the spec's test block and the POM method source;
  - history and suspect changes;
  - env-health.

**Ways to use the Copilot licence** (in order of preference; confirm with the GitHub org admin which features are enabled for this repo):

1. **Copilot coding agent on triage issues.** The repo already shows an active "Copilot cloud agent" workflow.
   - For an **AUTOMATION_ISSUE** cluster, assign the triage issue to Copilot. It reads the evidence pack and the repo instructions (`.github/copilot-instructions.md`, `.github/instructions/*`, `AGENTS.md`, `.agents/learnings.md`) and opens a **draft PR** with the locator or wait fix.
   - A person reviews the PR as usual. This is the highest-value use: fixes, not just labels.
   - The agent's environment comes from `.github/workflows/copilot-setup-steps.yml` (private runner `az-dev-ubuntu-latest-8Core` like `pr-checks`, Node 24 and `playwright-e2e` dependencies, with the JFrog token from the repository's **Agents** secret `JFROG_AUTH_TOKEN`). It can run typecheck, lint, suite validation and the unit tests, but not the specs: it has no test-environment credentials, so the reviewer runs the failing spec on the PR branch.
2. **Copilot in VS Code with the repo's custom agents.** `.github/agents/playwright-healer.agent.md` already exists and reads `failure-context.json`, `failure-dom.html` and `failure-aria.yaml`. The dashboard's cluster page gets a "Copy healer prompt" button that downloads the evidence pack, so the triage person can run the healer locally in one step.
3. **Copilot-written classification suggestions for TO_INVESTIGATE.** The same issue-based flow: a triage issue labelled `ai-triage` is assigned to Copilot with a prompt template (`.github/prompts/triage-failure.prompt.md`). It replies with a suggested category, reasons, and a defect draft in the agreed format. The sync step reads the comment as a *suggestion* (never as a decision).
4. **Fully automated in-workflow calls** (optional). If the org enables **GitHub Models** for this repo, the `nightly-triage` workflow can call a model with the workflow token (`permissions: models: read`) and get structured JSON back.
   - This is a separate GitHub product with its own usage limits and billing. Check whether the company licence covers it before relying on it.

**Guardrails:**
- AI output is always a *suggestion* with reasons, never overrides a high-confidence rule, and is never auto-merged.
- A person confirms the category (issue label) and reviews any PR.
- Measure suggestion precision against human decisions for 2–4 weeks (the labelled set comes free from the triage issues) before relying on it.
- Evidence is redacted (E10) before it is attached to an issue. The repo is private, but issues are still visible to everyone with repo access.

---

## 8. Defect draft (auto-generated for every PRODUCT_DEFECT cluster)

Rendered in the dashboard with **Copy for Jira** and **Create GitHub triage issue**. A Jira API integration (create or link) can be added in Phase 4 behind an explicit click.

```
Title:       [PO Service][INTEROP][AZURE+GRAVITEE] PATCH action item with status=null returns 500 (expected 400)
Component:   plan-sop-actionitem  (from service-map)     Severity (suggested): Major
Environment: INTEROP + QA · Gateway: AZURE, GRAVITEE · Realm: cbp-interop-ps-automation-2
SUT version: ai-service build … · Automation SHA: 3150241
First seen:  2026-09-2x (run #…) · Occurrences (30d): 30/30 · Status: persistent
Affected tests (3): ActionItem/Test_003 TC5 · …
Steps to reproduce:
  1. Obtain machine token for realm <realm> (client credentials)
  2. POST /ai/api/v1/actionitems  body: {…redacted…}  → 201
  3. PATCH /ai/api/v1/actionitems/{id}  body: {"status": null}
Expected:    400 Bad Request with validation error code
Actual:      500 Internal Server Error  {"errorCode":"IBP_50_1025", …}
Request IDs: request-id=… · x-correlation-id=…  (search these in service logs)
Repro:       curl -X PATCH … (redacted, ready to run with a fresh token)
Evidence:    Allure test link · api-calls.json · screenshot/trace (UI) · network-log.json
Suspect changes: plan-sop-actionitem@abc123 "…" (merged 2026-09-2x)
Notes:       Fails on both gateways → not gateway-specific
```

- **Steps for UI defects** come from the `logMessage`/`test.step` trail. Infrastructure noise is filtered out, steps are collapsed to user actions ("Open Planning Space → Process X → Cards → Edit 'Bullet Chart' card → Data tab → choose 'Bullet Chart 01' → Apply"), and the realm, process, view and scenario come from testdata.
- **Duplicate check:** before suggesting "create", search open triage issues and `known-issues.json` by signature and endpoint, and offer "link to existing" instead.

---

## 9. Dashboard (static app on gh-pages `/dashboard/`, reads `/dashboard/data/*.json`)

Plain HTML/JS (or a small Vite build), no backend. Works with the existing private Pages access.

### 9.1 Pages

1. **Morning triage** (landing page)
   - **Status strip:** one tile per scheduled suite (pass rate, Δ vs yesterday, duration, ✔/✖/flaky/blocked). A **missing or late run** shows as a red tile.
   - **Needs action:** cluster cards grouped by category, in the order *Environment → Product defect → Test data → Automation → To investigate*. Each card shows the title, category with confidence and reasons, "N failed + M blocked", environments and gateways, NEW/REGRESSION/PERSISTENT badge, suspect change, evidence buttons (screenshot, trace, Allure, network, API calls), and actions (Confirm, Reclassify, Link Jira, Copy defect).
   - **Known issues today:** collapsed list with Jira links and days open.
   - **Recovered today:** clusters that passed again (suggest closing).
2. **Run matrix**
   - Suites × last 30 days heatmap.
   - The **backend 2×2 grid** (QA/INTEROP × AZURE/GRAVITEE) per test area, which makes gateway- or environment-specific issues obvious.
3. **Cluster detail:** all affected tests, timeline, side-by-side evidence (last passing vs failing run: screenshot, HTTP errors, step trail), suspect changes and the defect draft.
4. **Test history:** a 30-run pass/fail strip per test, duration trend, flake rate, category history, owner.
5. **Defects and known issues:** registry view with tests affected per issue, age, and auto-close suggestions (passed 3× in a row).
6. **Flaky and quarantine:** flake rate ranking, quarantine candidates (flake rate > 20% over 14 days), time lost to retries.
7. **Automation health:**
   - AUTOMATION_ISSUE backlog by POM and spec.
   - Top failing POM methods (links into G1 of the repo health plan).
   - Blocked-test counts per serial spec, as candidates to split into independent tests.
   - Runtime trends per suite.
8. **Environment health:** probe results per night, ambient error baseline (top background errors per page/service), cross-environment config alerts (e.g. `/cbp/dev/` in INTEROP).

### 9.2 Filters on every page

Date, area (PS-UI / PO-UI / Backend), environment, gateway, category, owner/team, service, NEW only.

### 9.3 Recording human decisions: GitHub Issues as the triage store

- Every non-known cluster gets (or updates) **one GitHub issue** in this repo:
  - Title is the cluster title.
  - Labels: `triage`, `category:product-defect|automation|test-data|environment|flaky`, `area:*`, `env:*`, `decision:pending|confirmed`.
  - The body holds the defect draft; a marker comment links the cluster signature.
- A person confirms or reclassifies by **changing a label** (from a phone too); a Jira key goes in a field or comment.
- The `nightly-triage` workflow (and an `issues` event trigger) reads the labels back as **overrides**, which become training data for rules and the AI. Repeated overrides of the same kind prompt a `rules.json` change.
- Benefits: free, auditable, notifications built in, works with the existing `gh` workflow, and no write API is needed on the static site.

### 9.4 Teams: one digest instead of nine cards

A single card at about 23:30 UTC (05:00 IST):
- Overall pass rate.
- Per-suite one-liners.
- **New regressions (n)**, **Environment issues (n)**, **Product defect clusters (n)**, **Missing runs**.
- Top 3 clusters with links.
- A "Open dashboard" button.

The per-run cards can be reduced to failures-only or switched off.

---

## 10. Phased roadmap

| Phase | Scope | Main deliverables | Effort* | Exit criteria |
|---|---|---|---|---|
| **0 · Foundations (week 1)** | Trustworthy signals | E1 verdict step in **report-only** mode · seed `triage/known-issues.json` and `triage/quarantine.json` from today's daily failures · E9 `categories.json` · E2 labels · E6 blocked annotation · E3 failed-step marking | 4–5 days | Verdict shown in every job summary and Teams card; Allure shows real categories; skips show "blocked by" |
| **1 · MVP dashboard (weeks 2–3)** | One place + clustering | `scripts/triage/` normalise + cluster + rules v1 (levels 0, 2, 4, 5 on existing evidence) · `nightly-triage` workflow · dashboard pages 1, 2, 3 · Teams digest · missing-run detection · **switch the verdict to enforce** once the registries are filled (week 3) | 6–8 days | Morning page live; ≥ 70% of failures auto-categorised; failures ÷ clusters ≥ 5; red runs only on new or broken |
| **2 · History and triage loop (weeks 4–5)** | No re-triage | 90-day history · `ambient-noise.json` + `service-map.json` · known-issue auto-linking and "may be fixed" detection · FLAKY/NEW/REGRESSION badges · GitHub triage issues sync (§9.3) · pages 4, 5, 6 · defect drafts (UI steps from the step trail) | 6–8 days | Known issues auto-linked; decisions persisted; ≥ 85% categorised |
| **3 · Better evidence (weeks 5–7, can overlap)** | Precise causes | E4 API call capture + curl · E5 ambient baseline · E7 SUT versions · E8 env-health probe · change correlation (§7.5) · pages 7, 8 | 6–9 days | Every PRODUCT_DEFECT draft has request IDs and repro; ENV issues caught before triage |
| **4 · Integrations (optional)** | Fewer manual steps | Jira link/create on click · quarantine automation (tag `@quarantine`, run separately) | 5–8 days | Defects filed from the dashboard in one click |
| **5 · AI assist with GitHub Copilot (last)** | Hard cases + fixes | Evidence pack per cluster attached to triage issues · Copilot coding agent on AUTOMATION_ISSUE issues → draft PRs · "Copy healer prompt" for the VS Code healer agent · `triage-failure.prompt.md` for TO_INVESTIGATE suggestions · optional GitHub Models call if the org enables it · precision tracking against human labels | 3–5 days + 2–4 weeks measurement | Suggestion precision ≥ 80% on the labelled set; Copilot PRs merged for a share of automation issues |

\*Effort is for one automation engineer familiar with the repo.

**Relation to the repo-health plan (implemented later):** none of its items are prerequisites.
- Its M1 ("fail the job on test failure") is superseded by the verdict step (§4.1).
- Its M3 (`compareTwoValues` → `expect.soft`) is covered here by E3 (failed-step marking).
- Its G5 (reusable workflow) is optional: until then, the triage-pack and verdict steps are added to the four functional workflows separately.

---

## 11. Daily operating routine (target: 15 minutes)

1. **05:00 IST:** read the Teams digest. If there are *Missing runs* or *Environment issues*, ping the environment owner first; those failures need no further analysis.
2. Open **Morning triage** and work top-down:
   - **Environment** cards: confirm, or link the outage.
   - **Product defect** cards: check the draft, then *Copy for Jira* (or link an existing issue). Add it to `known-issues.json` with the Jira key so it stops showing as new.
   - **Test data** and **Automation** cards: confirm and assign the owner; they become backlog items with the cluster link.
   - **To investigate:** open cluster detail (evidence side by side with the last pass), decide, then reclassify through the label.
3. **Weekly (30 min):** review flaky/quarantine, the most-reclassified rule (tune `rules.json`), expiring known issues and the automation-health trend.

**Suggested response targets:**
- Environment: same day.
- Product defect: filed within 1 day.
- Test data: 2 days.
- Automation: fixed within the sprint.
- Flaky: quarantined after 3 occurrences.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Wrong automatic categories erode trust | Always show reasons and confidence; human decision is final; publish weekly precision; conservative defaults (TO_INVESTIGATE over a wrong guess) |
| Secrets or customer data in evidence | Central redaction (E10); response bodies capped; test realms only; check with the security team before Phase 5 attaches evidence for Copilot |
| gh-pages size grows (the `github-pages` artifact is already 449 MB) | Dashboard data is compact JSON (KBs per run), with evidence linked to existing Allure folders and artifacts, not copied; the monthly compaction workflow covers `/dashboard/data` (keep 90 days of runs, 1 year of daily summaries) |
| Evidence links expire (artifacts kept 30 days, Allure 7 builds) | Keep screenshots and API snippets for clusters inside the triage issue; raise Allure retention to 14 builds if size allows |
| Rules drift as the apps change | Rules in YAML with owners; monthly review of overrides; unit tests for the rules engine using saved real failures as fixtures |
| Another tool to maintain | Built on existing CI, Pages and Issues only; one owner plus a rota; documented in a `.agents/skills/nightly-triage` skill |

---

## 13. Quick wins this week (low effort, high value)

1. Add `categories.json` to every Allure generation step (E9): Allure stops reporting everything as "Product defects".
2. Add the run verdict step in report-only mode (E1, §4.1), and start `known-issues.json` from the failures that repeat every night. After two weeks the Actions page turns red only for unexplained failures or broken runs.
3. Register the already-documented AI/UIF service defects as known issues with Jira keys, so they're excluded from daily triage.
4. Investigate the `POST 502 /cbp/dev/foundation/objectivebar-kpi/v1/kpis` calls during INTEROP runs: 78 occurrences in last night's PS failures. It looks like an environment-config issue that may be behind many locator timeouts.
5. Add the PS UI "blocked by" count to the existing Teams card (159 blocked tests last night come from 56 failing specs).

---

## Appendix A: last night as the engine would show it (illustrative, from the 2026-10-05 artifacts)

| Cluster (example) | Category (rules) | Tests | Evidence that decides it |
|---|---|---|---|
| Objective bar KPI call returns 502 from a `/cbp/dev/` URL during INTEROP | ENVIRONMENT_ISSUE (high, cross-environment config) | up to ~24 failing UI tests + their blocked tests | 78 × `POST 502 …/cbp/dev/foundation/objectivebar-kpi/v1/kpis` in network logs |
| AI service returns 500 for `status: null` | KNOWN_ISSUE (documented in the defect report) | ActionItem Test_003 TC5 (both gateways) | 500 + `IBP_50_1025`, expected 400 |
| `PSAutomationProcess` process model 404 | TEST_DATA_ISSUE (high) | specs using that process | `GET 404 …/processModels/PSAutomationProcess` |
| Strict-mode violation on `//li//div[text()='Default Scope View']` | AUTOMATION_ISSUE (high) | WorkFlowFilter spec | XPath locator resolves to 2 elements |
| "View … did not become visible in the All Views list" (4 specs) | TO_INVESTIGATE → likely TEST_DATA (views missing after DataSetup) | 4 specs | Same failed step, different view names; check DataSetup `MapViewsToContext` |
| Migration Test_009 "removed from target export" | PRODUCT_DEFECT or TEST_DATA (needs API evidence, E4) | 1 test | Assertion on export content; no request/response attached today |
| 5 PS + 1 PO tests that passed on retry | FLAKY | 6 | Passed on attempt 2 |
