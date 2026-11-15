# Planning Space UI nightly: from ~56 to 15–20 minutes

Date: 2026-10-25 · Status: draft for review · Scope: `playwright-ps-iop-ui-sharded-suite` (`.github/workflows/playwright-ps-iop-ui-local-suite.yaml`), INTEROP, Azure gateway, 12 suites, 112 spec files, ~495 tests.

Evidence: run [40137337578](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/40137337578) (2026-10-24, 56 min), its `allure-results-*` artifacts, job and step timings of the 8 nightly runs from 2026-10-17 to 2026-10-24, and the dashboard run data on gh-pages (`dashboard/data/runs/*/PW-PS-UI-INTEROP-LOCAL__*.json`) for 2026-10-18 to 2026-10-24. Section 10 explains how to reproduce the numbers.

---

## 1. Short answers

| Question | Answer |
|---|---|
| Why does it take ~1 hour? | One lane (`viewsbatch`, 48 min of tests) holds the whole run while the shortest lane finishes in 4 min. And 45% of all lane time goes to 49 tests that fail on both attempts, waiting for timeouts each time. |
| Do we need more shards? | Yes, but third. First balance the 12 lanes we already have by measured duration (the same 12 lanes would finish in about 24 min instead of 48). Second, stop retrying tests that fail every night (about 80 lane-minutes a night that recover nothing). Then add lanes, and only after each lane has its own test user. |
| What about data dependencies? | They already hurt today: 12 lanes run at the same time, nearly all as **one** user (`TEST_AUTOMATION_USER_1`) and mostly on **one** process (`PSAutomation`). Per-user state (global scope, default scenario, favourites, last accessed context) is shared by every lane. More lanes on the same user means more collisions. The fix is a test-user pool (one user per lane) plus "state domains" that keep specs editing the same view or process in one lane, in order (§5). |
| Can we mock some tests? | Some. Mocking is the right tool for UI permutations (filter combinations, status states, empty and error states, card rendering), around 90 tests. It is the wrong tool for the failures that cost the most time today, because those are environment, data and product problems the nightly exists to find. Creating test state through the API instead of the UI ("API-first arrange") saves more real E2E time than mocking does (§6). |
| Is 15–20 min realistic? | Yes. The model in §4 gives 15–18 min end to end with 16–20 isolated lanes once retries stop on known failures. Phase A alone (same runners, no new users) should give about 20–24 min. |

---

## 2. Where the 56 minutes go

### 2.1 Wall clock (run 40137337578)

| Stage | From → to (UTC) | Duration | Notes |
|---|---|---|---|
| Build matrix + DataSetup | 22:09:35 → 22:12:18 | 2.7 min | DataSetup test step 148 s, of which `UIDataReset/Test_002_MapViewsToContext` is 139 s (sequential POSTs, 2 entities × 117 views) |
| Test lanes | 22:12:22 → 23:02:26 | 50 min | Critical lane `viewsbatch`: 49 min job, 48 min test step |
| Report, Pages, verdict | 23:02:30 → 23:05:45 | 3.3 min | Allure generate 14 s; two gh-pages checkouts 23 s + 26 s; push to gh-pages 38 s; Pages artifact upload 38 s + deploy 7 s; Teams 11 s |

Per lane, the fixed start-up cost is small: checkout + Node + `npm ci` ≈ 15 s, `playwright install --with-deps chrome` 24–40 s, global OIDC login and worker start ≈ 1.5 min (test step time minus Allure wall time).

### 2.2 Lanes are badly balanced, and it is the same lane every night

Job durations in minutes, tonight and the range over the 8 nights from 2026-10-17 to 2026-10-24:

| Lane | Specs | Tonight | 8-night range |
|---|---|---|---|
| viewsbatch | 19 | **49** | 48–57 |
| drillthroughbatch | 10 | 39 | 27–39 |
| scopebatch | 16 | 31 | 27–31 |
| scenariobatcha | 6 | 27 | 21–31 |
| scenariobatchb | 7 | 26 | 22–27 |
| workflowfilterandduplicateviewsbatch | 6 | 26 | 23–27 |
| cardsbatchb | 12 | 19 | 18–23 |
| cardsbatcha | 13 | 17 | 16–22 |
| supplychainactionsbatch | 6 | 16 | 11–17 |
| ondemandmaasbatch | 6 | 14 | 8–21 |
| powerbarbatch | 7 | 11 | 10–14 |
| objectivequicklinksviewsearchbatch | 4 | 5 | 4–5 |

Each lane is an `az-dev-ubuntu-latest-8Core` runner running Playwright with `--workers=1`, so one Chrome on an 8-core machine.

### 2.3 What the lane-minutes are spent on

Allure results tonight: 750 attempts, 249 lane-minutes of wall time across the 12 lanes. Attempts are grouped per test (`historyId`) and ordered by start time.

| Kind of test (attempt 1 → attempt 2) | Tests | Lane-min | Share |
|---|---|---|---|
| Passed first time, not re-run | 202 | 40.7 | 16% |
| Passed, then **re-run** because a later test in the same serial file failed | 60 | 31.4 | 13% |
| **Failed on both attempts** | 49 | 112.2 | 45% |
| Failed, then passed on retry | 8 | 9.2 | 4% |
| Other (skipped/failed mixes) | 23 | 12.0 | 5% |
| Gaps between tests ≥ 15 s (hooks, cleanup, worker restart after a failure) | | 34.7 | 14% |

- **Retries:** 87 lane-minutes. Retries are file-level, because every one of the 112 spec files is `test.describe.serial`, so one failure re-runs the whole file. Of 56 retried files only 4 passed on retry (6.9 lane-min). The other 80 lane-minutes changed nothing.
- **Failing slowly:** failed attempts average about 80 s, mostly waiting for timeouts. 31 failures were `locator.waitFor` timeouts (33 lane-min); `launchAppFromCatalog` retries twice with a 60 s wait (142 s per failure).
- **Blocked coverage:** on each of the last 4 scheduled nights about 135 tests were skipped because an earlier test in their serial file failed; only ~305 of ~495 tests passed.
- **Always failing:** over the 4 scheduled nights (2026-10-19, -20, -23, -24) **39 tests failed every night**, 6 failed on at least 70% of nights, and 21 failed some nights (list in §11). `triage/quarantine.json` is empty, and `triage/known-issues.json` holds no PS UI entries.

### 2.4 Slow waits inside passing tests

Silent gaps of ≥ 8 s between logged steps in **passing** attempts add up to 39.9 of their 81.7 lane-minutes.

| Where | Calls tonight | Cost | Note |
|---|---|---|---|
| `TestUtil.navigateToPlanningListingPage` (portal dock search → "Planning") | 63 | **26.5 lane-min**, median 30.7 s per call | Since PR #733 (merged 2026-10-12). Before it, this method was a single `page.goto(NAVIGATE_TO_PLANNING_SPACE)`. Nightly durations were 43–53 min in the 4 nights before it and 48–68 min since; other changes landed too, so not all of that increase comes from this. |
| ViewsBatch 015–017 `isViewInGroup` (wait, then reload) | 6 | 4.6 lane-min | The views drawer never shows a moved view without a reload (`.agents/learnings.md`), so the first wait always times out |
| ViewsBatch 011–013 "View mapping for Hidden View N did not appear" | 3 | 3.0 lane-min | 60 s waits that log an error and the test still passes |
| CreateScenarioWizard "running" → "success" toast | 4 | 2.1 lane-min | Backend procedure time; a candidate for API-first arrange |

---

## 3. Why adding shards alone does not get there

The simulation (§4) puts every spec file in a lane, longest first, and keeps files that edit the same shared state in the same lane (§5.3). With tonight's behaviour, the run stops improving at about 14 min of test time no matter how many lanes are added, because the largest unit (DrillThrough 005/006 + ScenarioBatch 013, with retries) is 13.9 min. More lanes on the same two users also raises the collision rate (§5). Adding lanes is worth doing only together with the retry policy, and safe only after isolation.

---

## 4. Target and model

**Budget for 18 min end to end:** lane start ≈ 2 min (setup + login) · tests ≤ 12 min · upload, report and Pages ≈ 3.5 min · DataSetup moved before the run (§7, A5).

**Lane makespan in minutes of test time** (longest-first packing, spec file as the unit, affinity groups from §5.3 kept together):

| Spec durations used | Lane-min | 12 lanes | 16 lanes | 20 lanes | 24+ lanes | Floor (largest unit) |
|---|---|---|---|---|---|---|
| Tonight, including retries | 281 | 23.6 | 17.7 | 14.3 | 13.9 | 13.9 (DrillThrough 005/006 + ScenarioBatch 013) |
| First attempt only (no retries) | 179 | 15.0 | 11.2 | 9.3 | 7.7 | 7.6 (WorkFlowFilter 001–003) |
| All tests fixed (blocked tests run too) | 198 | 16.8 | 12.8 | 11.3 | 11.3 | 11.3 (WorkFlowFilter 001–003) |

What the model says:
1. **Balance first.** The same 12 lanes, packed by measured duration, finish in about 24 min instead of 48.
2. **Retries second.** Not retrying files that fail every night removes about 100 lane-minutes.
3. **Lanes third.** Beyond about 20 lanes nothing improves until the biggest serial files and affinity groups get smaller (C3, B3).
4. **Fixing tests adds time.** Each fixed file un-blocks its skipped tests: about +20 lane-minutes once all are fixed. Plan the splits (C3) so the gain from fixing isn't lost.

"All tests fixed" uses each test's median passing duration over the week, and for tests that never passed, the median of passing tests in the same file (30 s if none).

---

## 5. Data dependencies

### 5.1 Shared state, by scope

Built from each scheduled spec's test data (`testdata/INTEROP/PlanningSpace/**`) and the actions in its source. It needs a review by the spec owners (§9, Q7).

| Scope | State and the specs that change it | Shared today by |
|---|---|---|
| **Per user, every process** | Global scope filter: ScopeBatch 007, 009–011, 013, 014; DrillThrough 001, 007–009; LiveBlocks 002; OnDemandMaas 002 · Pinned Scenarios/Scope drawer (planning-mfe `scenarioScopePanelPinStatus`): ViewsBatch 010 | user1 in 5 lanes, read by every lane that shows cell data or opens a drawer |
| **Per user and process** | Default scenario: OnDemandMaas 001; ScenarioBatch 004, 007, 013; DrillThrough 005, 006; WorkFlowFilter 002, 003; DynConstraints 001 · Favourites and view dropdown (`selectedDDOption`): ViewsBatch 005, 011–013, 018 · Last accessed context: LastAccessedContext 001, 002 (and every other spec that opens a process as user1) | user1 in 6+ lanes |
| **Per process or view (all users)** | View-entity mapping: ViewsBatch 006 A/B · Hidden views: ViewsBatch 011–013, DrillThrough 002–004, 010 · View groups: ViewsBatch 015–017 (all move "AT of Move View 1") · Procedure mapping: SCA 001, 006, ViewsBatch 014 · Default filter presets: ScopeBatch 009–011, 016 · Workflow and quick filters: WorkFlowFilter 001–003, ScopeBatch 015, DuplicateView 001 · Saved filters on "Save And Delete Filter": ScopeBatch 002–004, 008 (ViewsBatch 004 reads that view) | split only by suite |
| **Realm-wide** | Feature toggles: DataSetup Test_004 · IAM role changes: LastAccessedContext 001, SCA 005 | any lane |
| **Environment** | MaaS cluster and planning instance restart, view mapping reset: DataSetup | before all lanes |
| **Other workflows** | Visual suite (22:15 UTC, ~12 min) and PO UI (21:30, 22:30) use the same `TEST_AUTOMATION_USER_1/2` secrets on INTEROP and overlap the PS run | — |

### 5.2 Collisions that are likely happening already

These come from the dependency map and `.agents/learnings.md`. Each should be checked against the triage data (do the failures line up with the concurrent lane's timing?) before being written down as a cause.

- ScopeBatch 013/014 point user1's global scope at a new "New Filter NNN" and delete it in cleanup. Any lane that opens a view in that window lands on the "Set Filter" empty state. LiveBlocks 002 already had to work around this.
- OnDemandMaas 001 sets a default scenario on `ODMProcess` (ondemandmaasbatch lane) while ScenarioBatch 004/005/007 (scenariobatcha lane) set and read defaults on the same process as the same user.
- `duplicate view automation` is changed by ScopeBatch 015 (scopebatch lane) and DuplicateView 001 (workflowfilterandduplicateviewsbatch lane).
- `ArrangeViewsTesting` views are arranged by ViewsBatch 007/008 while SCA 006 toggles SCA on the same process in another lane.
- LastAccessedContext asserts user1's last accessed process while 10 other lanes open processes as user1.

### 5.3 Affinity groups (same lane, in this order) until isolation removes them

1. ViewsBatch 006 PartA → PartB (PartB removes what PartA mapped)
2. ViewsBatch 015 → 016 → 017 (one view moved between groups)
3. ViewsBatch 011 → 012 → 013 (`HiddenViewsProcess`)
4. ViewsBatch 007, 008 + SupplyChainActions 006 (`ArrangeViewsTesting`)
5. ScopeBatch 002, 003, 004, 008 + ViewsBatch 004 ("Save And Delete Filter")
6. ScopeBatch 007, 009, 010, 011, 013, 014 (user1 global scope, default filter presets)
7. ScopeBatch 015 + DuplicateView 001 ("duplicate view automation")
8. WorkFlowFilter 001 → 002 → 003
9. OnDemandMaas 001 + ScenarioBatch 004, 007 (`ODMProcess` default scenario)
10. DrillThrough 005, 006 + ScenarioBatch 013 (`PSAutomation` default scenario)
11. LastAccessedContext 001, 002 + PowerBar 004
12. LiveBlocks 002 → 003

Every other spec file can go into any lane. DataSetup stays a prerequisite of every lane.

### 5.4 How to isolate

| State scope | Isolation |
|---|---|
| Per user | **Test-user pool**: one primary user per lane (plus a second user where the spec needs one). Per-user state then stops crossing lanes, and groups 6, 9, 10 and 11 can split up. |
| Per process or view | Give the larger groups their own copy of the view or process (created by DataSetup or by the spec through the API, named with `uniqueName()` from T4.1 and removed through `createdEntities` from T4.2). Otherwise keep the affinity group. |
| Realm-wide | A short "exclusive" lane that runs before or after the parallel lanes, or a dedicated user whose roles only that spec changes. |
| Environment | DataSetup runs before the lanes start, and the matrix job checks that it succeeded. |
| Other workflows | Their own users, or schedules that don't overlap. |

Write the domains down where the tools can see them: `stateDomains` in the suite manifests (or `@state:<domain>` tags, which fits T6.2). `npm run validate:suites` then checks that every spec that changes shared state declares it, and the lane planner (A1) reads the same data for affinity and for mapping lanes to users.

---

## 6. Mocking: where it helps and where it doesn't

**Rule: mock to remove permutations, not to make the nightly green.** Tonight's most expensive failures are views missing from a context's All Views list, MaaS pivot "Not able to load pivot table", "Something went wrong while creating the scenario" in the Assumption context, the DEF-04 "Setting up your page" hang, and partial view duplication. All of them are environment, data or product problems. Mocking those calls would hide what the nightly is for.

### 6.1 Three tiers

| Tier | Where | What it covers | When it runs |
|---|---|---|---|
| Component (Vitest + Testing Library) | `plan-sop-planning-mfe` (333 test files), `plan-sop-lui` (297) | Rendering, chips, menus, empty states. ScopeChip, ScenarioChip, ContextOverrideChip, DrillThroughBreadcrumbs, SetDefaultFilterPopup, SettingsDialog, CustomSideDrawer and ScenarioFilter already have tests there. | Dev repo PRs |
| UI contract (Playwright with `context.routeFromHAR` / `context.route`) | This repo, new project such as `ps-ui-mocked` | The deployed MFE against recorded API responses, for state permutations | Every PR and nightly; no shared state, so fully parallel |
| Real E2E | This repo, nightly lanes | One golden path per feature and context, plus every cross-service flow | Nightly |

### 6.2 Candidates for the UI-contract tier (keep one real test of each)

| Spec(s) | Tests | Why | Keep real |
|---|---|---|---|
| ScenarioBatch 003 VisibilityFilter, 006 UsersFilter | 27 | Filter combinations over the `simulations/search` list. The two longest files tonight (7.3 and 7.8 min). | Create a private child scenario; visible to its owner, hidden from user2 |
| OnDemandMaas 004, 007 (status), 003 (no filter configured), 008 (unified empty state) | 21 | States that are hard to force on a real cluster; 003 and 008 fail every night | One status check after DataSetup restarts the cluster |
| Card render specs: Donut, Bullet, Column, Heatmap, Combination, Network, Tree, Table, Multi-KPI, Line, Maas Chart, Tabbed | ~30 | "This card renders this data". Line Chart, Maas Chart and Tabbed fail every night on data. | Maas Pivot, BDE, NPI and My Task with live data |
| Loaders, empty states, unauthorized card | helpers | Error and empty responses can only be produced reliably with mocks | — |
| PowerBar 001–003, 005; ViewSearch 001–003 | ~26 | Labels and search filtering. Already fast, so little time to gain; move pure label checks to component tests. | One per context |

**Not candidates:** DrillThrough (context passes portal → MFE → MaaS), Supply Chain Actions procedures, Scope saved and default filters (persistence), Views mapping, hidden views and view settings (PO configuration shown in PS), DuplicateView (backend clone), LiveBlocks and Collaboration (real-time third party), LastAccessedContext (persistence), DataSetup.

How it would work: login stays real (storage state), and the portal and MFE load from the real CDN; only data APIs are fulfilled from HARs. Routes on the browser context also cover requests made inside the MFE iframe. A weekly record job refreshes the HARs from INTEROP (`routeFromHAR(..., { update: true })`), stores them as test data under `testdata/INTEROP/har/<area>/`, and redacts tokens the way `util/api-calls.util.ts` already does. The backend API suites (`ProcessOrchestrationBackend`) remain the contract check for the recorded shapes.

### 6.3 API-first arrange (not mocking), the bigger lever for real E2E

Create the starting state through the API and assert through the UI. Keep exactly one test that performs each action through the UI. Helpers already exist for scenarios (`util/scenario-cleanup.util.ts`, `SIMULATION` endpoints, ScenarioBatch 004), view mapping (`view-entity-map`), user preferences (`uiConfiguration/v1/userPreferences`) and views (`uiRegistration/v1/views`). Best candidates: ScenarioBatch 002, 003, 006, 008, 009; DrillThrough 005, 006; SupplyChainActions 002–004; OnDemandMaas 001; DynConstraints 001; ScopeBatch 009–011. Creating or defaulting a scenario through the UI is also where a large share of tonight's failures sit: tests that do it account for 36 failed attempts and 43 lane-minutes.

---

## 7. Plan

Tasks map onto the existing roadmap in `planning/` where one already covers the work (T4.x data isolation, T5.1 composite action, T5.4 quarantine automation, T6.2 tags). Each workflow change is checked with a `workflow_dispatch` run on its branch before merging (master plan risk rule), at a time when the nightly isn't running.

### Phase A: same runners, smarter split (1–2 weeks, no infrastructure requests). Expected: 20–24 min

| # | Change | Why | Expected effect | Persona |
|---|---|---|---|---|
| A1 | **Duration-aware lane planner.** New `scripts/ci/plan-lanes.js`. Inputs: the suite manifests, median per-spec durations from the last 7 nights of dashboard run data, and the affinity groups (§5.3). Output: the matrix, each lane with its spec list, run through the existing `USE_SPECIFIC_TESTS=true SPECIFIC_TESTS=…` path. Longest first. Keep 12 lanes for now. Falls back to the static suites if the run data is missing. `validate:suites` checks that every scheduled spec is in exactly one lane. | Lanes run 4 to 48 min today | Critical lane 48 → ~24 min with tonight's failures | role-devops-engineer |
| A2 | **Retry policy.** Fill `triage/quarantine.json` with the 39 always-failing tests (first fill by hand; T5.4 automates it). The planner puts quarantined spec files in their own lane(s) run with `--retries=0`. They still run and report every night, and the verdict counts them as known. Everything else keeps `retries=1`. | 80 of 87 retry lane-minutes recovered nothing | About −80 lane-min a night | role-playwright-healer + role-devops-engineer |
| A3 | **Planning navigation.** Make `navigateToPlanningListingPage` use `page.goto(NAVIGATE_TO_PLANNING_SPACE)` again, keeping dock search behind a flag if #733 needed it for Gravitee (Q4). Then measure deep links straight to the process or view for specs that only need a context. | 63 calls × 30.7 s median | About −20 lane-min | role-playwright-automation |
| A4 | **Waits that always time out in passing tests.** ViewsBatch 015–017: reload right after a view-group move instead of waiting first. ViewsBatch 011–013: fix the hidden-view mapping wait. | Measured in §2.4 | About −8 lane-min | role-playwright-automation |
| A5 | **DataSetup off the critical path.** Run it on its own schedule about 20 min earlier, or as a job the lanes don't `need`, with the matrix job checking its result. Send the `MapViewsToContext` POSTs with a small concurrency limit. | 2.7 min before any lane starts | −2.7 min wall | role-devops-engineer |
| A6 | **Lane start-up and report.** Cache the Chrome install or use the runner's preinstalled Chrome (24–40 s per lane). Log in only the users a lane needs. Sparse-checkout gh-pages (23 s + 26 s). This belongs in T5.1's composite action. | Fixed cost on every lane | −1 to −1.5 min wall | role-devops-engineer |

### Phase B: isolation, then more lanes (2–4 weeks, needs a realm admin). Expected: 15–18 min

| # | Change | Why | Expected effect | Persona |
|---|---|---|---|---|
| B1 | **Test-user pool.** About 8 users to start (6 lane users and 2 spare, each with user1's roles) in `cbp-interop-ps-automation-2`, plus second users where specs need them. Secrets in a numbered or JSON form. The fixture maps lane (and `parallelIndex` when a runner has several workers) to a user; global setup logs in only those users. | Per-user state crosses all lanes today (§5.1) | Removes groups 6, 9, 10 and 11; allows more lanes | role-sdet-architect (design), role-devops-engineer |
| B2 | **State domains** in the manifests or as tags, checked by `validate:suites` and read by the planner. Links to T6.2. | Makes §5 enforceable instead of tribal knowledge | Prevents new collisions | role-sdet-architect |
| B3 | **Per-lane copies** of the views and processes behind the larger affinity groups (WorkFlowFilter views, "Save And Delete Filter", `ArrangeViewsTesting`), using T4.1 `uniqueName` and T4.2 `createdEntities`. | Groups set the floor (§4) | Floor 11.3 → about 7 min (CardsBatch 018 alone, until C3 splits it) | role-playwright-automation |
| B4 | **More lanes, in steps:** 16, then 20. Alternatively 8–10 runners with 2 workers each once workers map to users. Use matrix `max-parallel` as the control. Before each step, check INTEROP p95 latency, 5xx counts (the network-error baseline already collected) and the timeout bucket. | INTEROP capacity at 22:00 is unknown (Q6) | Test lanes about 11–13 min | role-devops-engineer, role-performance-engineer |
| B5 | **Other workflows:** separate users for Visual (22:15) and PO UI, or schedules that don't overlap the PS run. | Same users, same time (§5.1) | Fewer unexplained failures | role-devops-engineer |

### Phase C: a cheaper suite that stays fast (4–8 weeks, ongoing). Expected: about 15 min, holding as tests get fixed

| # | Change | Why | Persona |
|---|---|---|---|
| C1 | Fix or re-scope the 39 always-failing tests (§11) with their owners, and register real product defects in `known-issues.json`. | Recovers about 135 blocked tests' coverage | role-playwright-healer |
| C2 | API-first arrange (§6.3). | Slowest and least stable setup steps | role-playwright-automation |
| C3 | Split the largest serial files into independent files, by context (Process, Subprocess, Assumption) where they are already grouped that way. Largest once every test runs: CardsBatch 018 (14 tests, ~7.3 min), WorkFlowFilter 001 (13, ~4.9) and 002 (~4.8), ViewsBatch 013 (~4.5), DuplicateView 001/002 (~4.1 each). Also by test count: ScenarioBatch 003 (15) and 006 (12), OnDemandMaas 004 (12), SCA 001 (12). Drop `serial` between tests that don't depend on each other, so a failure no longer blocks the rest of the file. Target: no unit over about 5 min. | Sets the floor once the suite is healthy (§4) | role-playwright-automation |
| C4 | UI-contract tier with mocks for the ~90 permutation tests (§6.2); move pure label checks to the MFE component tests. | Deterministic, parallel, and runs on PRs too | role-playwright-automation |
| C5 | Fail-fast budgets: cap waits on known slow backends, shorten `launchAppFromCatalog`'s 2 × 60 s, and set a test timeout per area. | Failed attempts average about 80 s | role-playwright-healer |

### Expected result per phase (estimates from the §4 model)

| After | Lanes | Test lanes | End to end | Lane-min |
|---|---|---|---|---|
| Today | 12, fixed by suite | 48 min | 56 min (43–68 since 2026-10-08) | 249 |
| Phase A | 12, planned by duration | 15–18 min | 20–24 min | ~150 |
| Phase B | 16–20, one user per lane | 11–13 min | 15–18 min | ~150–170 |
| Phase C | 16–20 + mocked tier | 9–11 min | 14–16 min | ~140 |

Cost stays about the same: today about 12 × 23 runner-minutes on 8-core runners; Phase B is about 20 × 13. With 2 workers per runner, it is half the runners.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| More concurrency overloads INTEROP and adds timeouts | Raise lanes in steps (B4); watch the network-error baseline and the timeout bucket; matrix `max-parallel` as the control |
| Quarantine hides a regression | Quarantined files still run every night; entries carry `expires` and `autoCloseAfterPasses` (existing registry rules); the verdict lists them |
| Lane plan drifts as tests change | Re-plan from the last 7 nights on every run; fall back to the static suites when data is missing |
| User pool waits on an admin | Phase A doesn't need it |
| Mocked tier drifts from the real API | Weekly HAR refresh from INTEROP; backend API suites check the contracts; one real E2E test per feature stays |
| Allure history or the dashboard break when lanes change | Allure `historyId` comes from the test, not the lane; keep the `batch` label as a lane id (only the PO backend verdict reads batch names) |

---

## 9. Decisions and questions

| Id | Question | Needed by |
|---|---|---|
| Q1 | How many `az-dev-ubuntu-latest-8Core` runners can run at once at 22:00 UTC? (12 run tonight; Phase B wants 16–20) | B4 |
| Q2 | Who can create INTEROP test users with the right roles, and how many? | B1 |
| Q3 | May the always-failing files run with no retry in a quarantine lane, still reported every night? | A2 |
| Q4 | Why did #733 move Planning navigation to dock search, and is it needed only on Gravitee? | A3 |
| Q5 | Is a mocked UI-contract tier acceptable if one real E2E test per feature stays? | C4 |
| Q6 | Can INTEROP serve about 20 concurrent sessions at 22:00 while PO UI and Visual also run? | B4 |
| Q7 | Spec owners: review the state map (§5.1) and affinity groups (§5.3) | A1, B2 |

---

## 10. How the numbers were produced

- Job and step timings: `gh api repos/BY-Product-Development/plan-sop-ui-automation/actions/runs/<id>/jobs`.
- Per-test attempts: `gh run download 40137337578 --pattern "allure-results-*"`. For each `*-result.json`, group by `historyId`, order by `start` (attempt index), and take `stop − start`. Gaps are the distance between one result's `stop` and the next result's `start` in the same lane. Silent waits are gaps of 8 s or more between consecutive logged steps inside an attempt.
- Nightly failure frequency: the dashboard run data on gh-pages (`gh api "repos/<repo>/contents/dashboard/data/runs/<date>/<file>?ref=gh-pages" -H "Accept: application/vnd.github.raw"`). Only `trigger: schedule` runs are counted.
- Lane model: longest-first packing of spec files into N lanes, with the §5.3 groups as single units and 20 s added per file.

A small `npm run ci:runtime-report` that prints these per run would make the targets measurable every night (A1 can produce it as a by-product).

**Targets to track:** end-to-end p50 and p90 over the last 7 nights (≤ 18 and ≤ 20 min); lane-minutes, retry minutes and failed-attempt minutes; critical-lane to median-lane ratio (48 / 21 min of tests today); blocked tests per night; failures that appear only at higher concurrency.

---

## 11. Tests that failed on every scheduled night (2026-10-19, -20, -23, -24)

39 tests in 38 spec files (spec path under `tests/PlanningSpace/`, number of always-failing tests in brackets when more than one):

- CardsBatch: Test_004 MaasChartCard, Test_007 LineChart, Test_018 ScenarioComparisionWithActor, Test_020 TabbedCard
- DirtyState: Test_001 DirtyState
- DrillThroughBatch: Test_001, 002, 003, 004, 007, 008, 009, 010
- DuplicateView: Test_001, 002, 003
- DynConstraints: Test_001 ConstraintsFromCapacityPivot
- LastAccessedContext: Test_001 LastAccessedProcess
- LiveBlocks: Test_002 LiveBlocks
- OnDemandMaas: Test_003 OnDemandNoFilterConfigured, Test_008 VerifyTheUnifiedEmptyState
- ScenarioBatch: Test_003 ScenarioVisibilityFilter, Test_008 AssumptionScenarioAction, Test_011 SelectScenarioinSidenav, Test_012 CustomHeaderWithScenarioBudge
- ScopeBatch: Test_002, 003, 004, 012, 015
- SupplyChainActionsBatch: Test_006 SCAButtonVerifyByEnablingToggle
- ViewsBatch: Test_004 RefreshAndEditView, Test_006 ConfigureViewToEntityPartA, Test_007 SettingsArrangeViews, Test_008 ArrangeViewsForAssumption
- WorkFlowFilter: Test_001, Test_002 (2), Test_003

Failed on at least 70% of nights: CardsBatch Test_016 NPICard, SupplyChainActionsBatch Test_004 SCPPopup, ViewsBatch Test_015, 016, 017 (view settings), ScenarioBatch Test_006 ScenarioUsersFilter.
