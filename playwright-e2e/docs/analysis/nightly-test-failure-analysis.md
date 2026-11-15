# Current Nightly Test Failure Analysis

## Evidence Cutoff

Reviewed on 2026-11-11 against the latest completed published nightly day, **2026-11-10 UTC**, including the Gravitee PS run that finished after midnight on November 11. No completed November 11 nightly cycle was available at review time.

- [Nightly dashboard](https://supreme-adventure-mr9k94p.pages.github.io/dashboard/#/day/2026-11-10).
- [Final triage rebuild, run 42937767916](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42937767916), generated at `2026-11-11T01:16:53.844Z`.
- Authoritative structured evidence: `dashboard/data/days/2026-11-10.json`, its selected per-suite run records, and `dashboard/data/index.json` on `gh-pages`.
- All nine selected functional/visual suites ran automation revision `9e431d47bcfeb6856ff11116b66cde1d04610002`. Later source changes are not evidence of recovery in these runs.

## Verified Results

| Suite | Total | Passed | Failed | Blocked | Skipped | Flaky | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [Backend QA Azure](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42886130328) | 498 | 465 | 4 | 28 | 1 | 0 | BROKEN |
| [Backend QA Gravitee](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42891367192) | 498 | 463 | 4 | 29 | 2 | 0 | BROKEN |
| [Backend INTEROP Gravitee](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42896745606) | 572 | 565 | 2 | 5 | 0 | 2 | UNEXPLAINED_FAILURES |
| [Backend INTEROP Azure](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42901905189) | 572 | 569 | 1 | 2 | 0 | 2 | KNOWN_FAILURES_ONLY |
| [PO UI INTEROP Azure](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42906073277) | 90 | 86 | 2 | 2 | 0 | 0 | UNEXPLAINED_FAILURES |
| [PO UI INTEROP Gravitee](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42915585497) | 90 | 76 | 3 | 11 | 0 | 1 | UNEXPLAINED_FAILURES |
| [PS UI INTEROP Azure](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42911546253) | 451 | 312 | 35 | 104 | 0 | 5 | UNEXPLAINED_FAILURES |
| [PS UI INTEROP Gravitee](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42933937148) | 185 | 139 | 13 | 32 | 1 | 1 | UNEXPLAINED_FAILURES |
| [Visual CompleteSmokeVisual](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42913083931) | 13 | 8 | 5 | 0 | 0 | 0 | UNEXPLAINED_FAILURES |
| **Total** | **2,969** | **2,683** | **69** | **213** | **4** | **11** | |

Pass rate is **90.37%**. `passed + failed + blocked + skipped = total`; flaky is an overlapping retry indicator, not another outcome to add. Blocked tests are not passes or independent root failures. A green Actions conclusion does not establish passing tests: these workflows publish results despite failures and can use report-only verdict enforcement.

The November 9 published aggregate is 2,360 tests (2,011 passed, 80 failed, 265 blocked, 4 skipped). Backend INTEROP Gravitee was `no-data` that day, not part of those totals. Tonight restores 572 tests from that suite; Azure PS also grows from 414 to 451 tests. These explain the entire 609-test increase. The apparent pass-rate increase is not a like-for-like measure of fixes. Gravitee PS improves from 62/185 to 139/185, but still has 13 failures and 32 blocked tests; this is partial recovery, not a clean suite.

### Published Classification, Not Confirmed Root Causes

| Triage category | Records |
| --- | ---: |
| ENVIRONMENT_ISSUE | 7 |
| PRODUCT_DEFECT | 5 |
| TEST_DATA_ISSUE | 18 |
| AUTOMATION_ISSUE | 5 |
| TO_INVESTIGATE | 27 |
| KNOWN_ISSUE | 3 |
| FLAKY | 4 |

These are the dashboard's category counters, not a manually verified causal census. Their sum is 69, but the separate flaky counter is 11; do not infer that only four tests retried. Background network failures, repeated visual diffs, and missing elements do not alone prove infrastructure failure, obsolete baselines, or deleted fixtures.

## Still-Valid Findings

### 1. QA Backend Has an Import Failure and Real Service Failures

**Confirmed automation/data startup defect:** both QA run logs contain `Cannot find module '../../../testdata/QA/ProcessOrchestrationBackend/Migration/Test_009_ALMDeployResourceMigration.json'`. The migration batch exits before recording test results. This is the direct reason both verdicts say `BROKEN`; the four recorded failures per QA suite are additional problems, not the complete executed coverage.

**Next action:** provide reviewed QA-specific migration data and required realm configuration, or obtain approval for an explicitly unsupported QA scenario. Do not copy INTEROP tenant identifiers blindly or silence the batch exit. Validate test discovery and then the migration spec in isolation. Keep detailed ALM design in the preserved [ALMDeploy plan](ALMDeploy-ResourceMigration-Plan.md).

**Confirmed service symptom:** three transition-status failures receive HTTP 200 with `status: ERROR` and the response message `Error: Model Service API response is empty -- This will also update [transition_execution_status] to error`. These affect QA Azure start/stop and start/stop-twice, and QA Gravitee start/stop-twice. The old calendar/worker-queue explanation was speculation. QA Gravitee's other start test fails earlier because the expected process name is undefined. Process-model mapping also returns 400 on QA Azure and 502 on QA Gravitee.

**Next action:** PO/model-service owners should correlate the transition job and request IDs in `api-calls.json`; inspect the first start/mapping response before changing polling. A longer wait cannot turn a terminal `ERROR` into `COMPLETED`.

### 2. Action Item Null-Status Defect (Historical on 2026-11-10; Spec Retired)

**Historical known issue:** `KI-1 / ABP-19369` matched three final failures on 2026-11-10: INTEROP Azure, QA Azure, and QA Gravitee. An assumption Action Item update with null status returned 500 instead of the expected 400. With the retirement of the Assumption context in PO Backend, `Test_003_ActionItemCRUDWithAssumptions.spec.ts` was unscheduled, and `KI-1` was retired from [the registry](../../triage/known-issues.json).

INTEROP Gravitee fails earlier at TC2 with a 15-second `requestUntilStatus` timeout, leaving TC5 blocked. Its missing KI-1 failure is **not** evidence that the defect is fixed on that gateway. The current [Action Item helper](../../util/action-item.util.ts) already has a longer search-poll tier, but this failure is a different helper/path; inspect its last response and latency before proposing a timeout change.

### 3. Subprocess Offset Validation Remains Ambiguous

**Confirmed symptom:** PO UI TC4 fails on both gateways, with a subprocess POST returning 500 while the spec expects the offset-specific message. Historical captures showed SQL transition-reference/node-order errors.

**Important correction:** [the current spec](../../tests/ProcessOrchestration/ProcessBatch/Test_003_SubProcessActionsFromSettings.spec.ts) selects the first available reference in TC4 and deliberately creates a subprocess with offset zero in TC5. Zero therefore cannot be assumed invalid for every parent/reference combination. The reports' blanket `startOffset >= 1` backend validation proposal is unsafe.

**Next action:** verify the intended business rule, chosen `Of` entity, transition reference and unique name. Reproduce zero against a known sibling versus the parent. Fix test preconditions if TC4 selects a valid zero-offset reference; independently report the SQL 500 with its actual payload. Do not suppress the check or quarantine it without approval.

### 4. Procedure Completion Alerts Still Fail, but Six Guaranteed Fixes Are Not Proven

Affected paths include drill-through scenario creation and SCA wizard/popup. Downloaded Azure `allure-results-drillthroughbatchb` and `allure-results-supplychainactionsbatch` records/stdout show running alerts observed, followed by missing success alerts and assertion failures. Attempts must be distinguished from final failures.

The success-text matcher already accepts `procedure is ready`, `is ready`, `view results` and success severity. [BasePage.verifyAlertMsg](../../pageobjects/page.ts) still calls `isVisible()` after a successful visible wait. That is a plausible unmount race, but the downloaded stdout does not distinguish a wait that never matched from a matched toast disappearing before recheck. The old promise to heal six specs by removing that call is not established by this night's evidence.

**Critical triage correction:** both [drill-through 005](../../tests/PlanningSpace/DrillThroughBatch/Test_005_CreateMultipleChildScenariosAfterDrillThrough.spec.ts) and [006](../../tests/PlanningSpace/DrillThroughBatch/Test_006_CreateMultipleChildScenariosAfterDrillThroughPopup.spec.ts) intentionally abort `**/searchNotifications` on the parent tab. Their captured `net::ERR_FAILED` must not be used alone as proof of a notification-service outage. Check which tab/request failed and whether the target receives completion notifications.

**Next action:** distinguish no matching alert, post-match unmount, unsuccessful procedure completion, and missing target-tab delivery using the trace, procedure status and notification responses. Keep the existing detailed [notification/race analysis](drill-through-notification-alert-race-condition-and-fix.md) unchanged; this report qualifies what the latest evidence proves.

### 5. View, Filter, Model and MaaS Prerequisites Need Targeted Verification

**Observed, not automatically a confirmed seeding diagnosis:**

- Four Azure PS tests cannot find views: `copy of duplicate view automation`, `Pivot Reflects Scope`, `Table Card Integration`, and `Line Chart Test`. Check registration, process mapping, user visibility and asynchronous refresh separately. The duplicated view is created by the test: adding a permanent copy to setup would hide the creation/mapping defect.
- Six failures are grouped with vertical-filter POST 404s, including workflow filters, duplication, Dirty State, AdminFilter and Gravitee draft filters. Verify the exact requested filter, owner, preset and deleted-draft lifecycle. Gravitee scope seeding already exists; running it blindly does not prove that these references are repaired.
- Four tests are grouped with MaaS calc-engine scenario-list 404s. The ODM cell `42` failure is one of these. Check active engine/scenario registration, scope, pivot layout and expected dimensions. Do not replace the target with an arbitrary nonzero cell: drill-through expectations depend on that cell's context.
- Model GET 404s accompany PO mapping (`PSAutomationProcess`) and PS scenario badge/context switching (`IDSPAutomationProcess`). Check whether each model is required for the selected process before seeding or altering test data. A nearby GET 404 does not by itself explain an unopened Autocomplete.
- Gravitee setup still fails to fetch planning instance `abb5df33-34fb-4439-8e32-cfe5a3a96750` (404). Verify the intended tenant and process-to-instance association before replacing its ID. Do not treat every subsequent failure as caused by this setup failure.
- Gravitee last-accessed tests time out on `input#realm` after sign-out while an auth identifier page is loading; session DELETE 404s are also captured. Inspect the actual login page/flow. The old claim that these are caused by the stale planning instance is not established.

**Already-fixed prerequisite, remaining failure:** [LiveBlocks](../../tests/PlanningSpace/LiveBlocks/Test_002_LiveBlocks.spec.ts) already applies its saved filter in setup and for user2. Its current right-click timeout therefore needs inspection of the resulting pivot layout, data and cell; adding the same filter application again is not a fix. Similarly, a TabbedCard timeout does not establish a nested/shadow locator defect: inspect the configured tab names first.

### 6. Five Visual Failures Require Review, Not Blanket Baseline Replacement

The current visual run fails Hidden Views, All Views, View Settings, PO Planning Views Settings, and PO Arrange Views Map With. Repeated failure is confirmed; changed typography/padding or obsolete baselines are **not** established without reviewing expected/actual/diff images.

**Next action:** inspect each image triplet, verify tenant data and viewport, and distinguish layout regressions from dynamic content and approved design changes. Update only reviewed baselines. Do not run blanket `--update-snapshots` as a remedy for an unexplained difference. This consolidation does not approve any new image.

### 7. Other Failures Stay Open Rather Than Receiving Invented Root Causes

The audit below retains workflow-scope merge, missing scenario/pivot selection, ODM ITEM/LOCATION facets, unauthorized-page behaviour, Gravitee Quick Links, disabled/missing procedure controls, PowerBar scenario chip, and view-load timeouts. They remain observable problems, but their final assertion or timeout alone does not establish a particular product defect or locator fix.

Generic `/api/{id}` request failures also accompany QuickFilter and NPI checks. Establish the original host and request, its timing, and its presence in passing tests before calling it a gateway outage. Do not turn background telemetry or intentional request abortion into a causal diagnosis.

### 8. Runtime Improved; Publishing Contention Still Exists

The old run-41727796066 plan's monolithic-lane diagnosis is historical. The current workflow already splits DrillThrough, Scope and WorkflowFilter/DuplicateView lanes; Azure navigation has its direct-route path; the two long drill-through scenario specs have `retries: 0`, and 006 bounds parent-tab unroute teardown.

Latest jobs measured from the Actions jobs API:

| Run | Started UTC | Last update UTC | Elapsed envelope | Longest job |
| --- | --- | --- | ---: | --- |
| Azure PS 42911546253 | Nov 10 22:07:16 | Nov 10 22:43:19 | 36m 03s | SCA 26.93m; DrillThrough A next at 22.92m |
| Gravitee PS 42933937148 | Nov 11 00:46:11 | Nov 11 01:16:38 | 30m 27s | SCA 21.60m; Scope B next at 15.30m |

The envelope uses workflow creation/last-update times, not summed job time; published test timestamps cover a smaller interval. Neither the old 69-minute runtime nor a guaranteed sub-30-minute budget describes the latest Azure run. Prioritize SCA procedure readiness/completion waits and DrillThrough A before considering further lane changes. Fewer failures can also make a serial run longer by allowing more cases to execute.

**Still-current infrastructure issue outside the nine-suite aggregate:** [UI performance run 42886604695](https://github.com/BY-Product-Development/plan-sop-ui-automation/actions/runs/42886604695) fails report deployment with `gh-pages -> gh-pages (fetch first)` and `git failed with exit code 1`. This confirms publishing contention still occurs somewhere; it does not prove functional backend report publication still fails. Review the performance publisher's concurrency/retry strategy without bypassing checks or force-pushing. No load or timing-regression conclusion is drawn from this deployment error.

## Prioritized Follow-Up

| Priority | Owner | Action | Acceptance evidence |
| --- | --- | --- | --- |
| P1 | Backend automation | Repair QA migration import/data configuration | QA discovery succeeds; migration executes and records results; neither QA verdict is BROKEN for an unreported batch |
| P1 | PO/model-service owners | Investigate terminal QA transition ERROR and model mapping/start responses | Original failing scenarios return the expected statuses; correlate backend logs with captured request/job IDs |
| P1 | PS automation + procedure/notification owners | Disambiguate alert race, intentional aborts and completion delivery | Focused SCA/drill-through specs pass repeatedly on affected gateways without suppressing completion assertions |
| P1 | Tenant/test-data owners | Repair verified instance, model, filter, view and MaaS dependencies | Required API resources and mappings verified as the correct user; targeted affected specs pass |
| P2 | PO UI automation + PO service | Confirm reference-specific zero-offset rule and SQL failure | TC4 rejects the intended invalid combination; TC5 retains supported zero-offset creation |
| P2 | Visual owners | Review all five image differences | Approved design/data explanation per image; only justified baseline changes |
| P2 | DevOps | Repair performance Pages publish contention | Successful publication during overlapping scheduled runs, without force-push |
| P2 | Action Item service | Resolve ABP-19369 | Null-status update returns 400; previously blocked Gravitee TC5 executes before declaring gateway recovery |
| P3 | PS automation | Investigate remaining assertion/readiness failures and retry-sensitive cases in the audit | Per-test trace/API/DOM evidence and isolated reproduction; clean final results, not just retries or skips |

For later test/code fixes, use the repository's targeted-spec command with the correct environment/gateway and `--workers=1`, then required typecheck, lint, suite validation and testcase-documentation gates. This change only consolidates documentation; it does not implement these fixes or claim successful live reruns.

## Complete Current Failure Audit

All 69 final failures are accounted for in these 44 published clusters. Counts are **failed / blocked**; blocked counts describe downstream impact, not additional root causes. IDs permit direct lookup in the published day JSON. `Flaky-classified` means the dashboard assigned a flaky category to a final failure, not that the final result passed on retry.

| Cluster ID | Failed / Blocked | Latest symptom and affected area | Interpretation / next check |
| --- | ---: | --- | --- |
| `6641e1c6c5` | 2 / 7 | Azure drill-through 005/006 completion checks; notification request abort | Intentional parent-tab route abort exists; inspect target delivery and alert observation |
| `cbc8ae8f5f` | 2 / 4 | Azure QuickFilter/NPI; `/api/{id}` request failures | Resolve original request/host; correlate with actual assertion |
| `376e6c51ce` | 1 / 5 | QA Gravitee lifecycle process-model mapping returns 502 | Service/gateway response needs backend correlation |
| `08d00d912b` | 1 / 4 | Gravitee SCA reporting configuration; LM entity views 503 | Verify dependency availability and causal timing |
| `b773783ffc` | 1 / 4 | Azure dynamic constraints login timeout | Check intended tenant/realm override and auth DOM |
| `70b183a11f` | 3 / 25 | QA transition jobs end ERROR | Response explicitly reports empty Model Service API response |
| `c63a69bb03` | 2 / 2 | PO UI zero-offset TC4 fails on both gateways; POST 500 | Verify reference-specific rule and SQL error separately |
| `7c791e6069` | 6 / 21 | VF POST 404: draft, duplication, workflow, AdminFilter, Dirty State | Verify exact filter ownership, references and presets |
| `8f031ca87b` | 4 / 10 | MaaS engine scenarios 404; scenario 007/009 and ODM 001/002 | Verify engine registration, scenario data and loaded scope |
| `79bb0d9fdc` | 4 / 14 | Duplicate copy, Pivot Reflects Scope, Table Card Integration, Line Chart Test not found | Distinguish missing registration/mapping from failed duplication |
| `8e1afe774b` | 2 / 3 | Gravitee last-accessed login timeouts; session DELETE 404 | Inspect auth identifier flow; no proven ODM dependency |
| `daad264b04` | 1 / 1 | Azure PO map-view option timeout; PSAutomationProcess model 404 | Verify model dependency versus dropdown state |
| `cef883a57a` | 1 / 1 | Azure PS scenario badge/context switch; IDSPAutomationProcess model 404 | Verify intended process and context availability |
| `7f39249b6a` | 3 / 0 | PS Hidden Views, View Settings, All Views visual failures | Review expected/actual/diff; no blanket reapproval |
| `bfac702290` | 2 / 0 | PO Planning Views and Arrange Views Map With visual failures | Review expected/actual/diff |
| `6bc1038d7d` | 3 / 3 | SCA wizard/popup success-alert assertions | Separate actual completion from observation/unmount race |
| `ee291bdf42` | 2 / 19 | Gravitee PO scope and Azure scenario-comparison view loading | Inspect loader, requested view and prerequisites |
| `05eec490ca` | 1 / 4 | Gravitee PO subprocess PowerBar scenario chip absent | Inspect context readiness and baseline scenario |
| `154edcf223` | 1 / 5 | INTEROP Gravitee Action Item TC2 requestUntilStatus timeout | Inspect last response; TC5 remains blocked |
| `e75cab2280` | 1 / 5 | QA Azure process-model mapping returns 400 | Inspect validation body and required mapping model |
| `021e8a08ff` | 1 / 18 | QA Gravitee start response has undefined process name | Inspect original start response before status polling |
| `87f6155c10` | 1 / 5 | Gravitee PS Quick Links Process Summary navigation | Inspect active MFE, route and ready state |
| `7ccb79d7ee` | 1 / 3 | Gravitee QuickFilter click/evaluate timeout | Inspect live filter option and blocking UI |
| `8ed06b2189` | 1 / 2 | Gravitee view/procedure mapping addDataSetupConfig timeout | Inspect configured actor/procedure and current dialog |
| `28a4da51f0` | 1 / 0 | Gravitee SCA history-created scenario not found | Verify create completion, search ownership and cleanup timing |
| `a8a10236b5` | 1 / 1 | Gravitee interactive-procedure dropdown timeout | Verify procedure mapping, eligibility and ready state |
| `5af73bff68` | 1 / 8 | Gravitee AdminFilter option scroll timeout | Verify shared/eligible filter before changing scrolling |
| `84a79feb0b` | 1 / 0 | Gravitee setup planning-instance status 404 | Verify tenant, active instance and configured ID |
| `5ff2897ccc` | 1 / 1 | Azure LiveBlocks right-click cell timeout | Saved-filter setup exists; inspect pivot layout/data |
| `4a88818772` | 1 / 1 | Azure TabbedCard tab timeout | Inspect actual tab configuration before locator edits |
| `4285b0b48b` | 1 / 4 | Azure ODM subprocess ITEM columns mismatch | Compare expected scope with rendered facets and sync state |
| `395e9ea5a5` | 1 / 3 | Azure scenario actions child creation assertion | Correlate procedure result, selected parent and scenario search |
| `c36fb5ff58` | 1 / 1 | Azure subprocess selected-scenario assertion | Compare drawer selection, applied state and persisted default |
| `215d4e7794` | 1 / 5 | Azure workflow always-AND-backend merge assertion | Reproduce exact input filters; not yet a proven backend merge bug |
| `a839171558` | 1 / 9 | Azure ODM LOCATION pivot facet mismatch | Compare expected scope, loaded data and sync state |
| `4aab905b49` | 1 / 1 | Azure workflow source drill-through timeout | Verify exact target cell and configured drill-through action |
| `a21c2ca443` | 1 / 2 | Azure page-context default scope missing CY-2022 | Compare filter/preset and actual pivot dimensions |
| `2818d99e83` | 1 / 2 | Azure pivot scenario popup missing expected scenario | Verify scenario availability, visibility and parent/layout |
| `aa4a7041db` | 1 / 0 | Azure unauthorized page absent after role removal | Check refreshed authorization/session and expected app state |
| `4a48a93ed1` | 3 / 6 | Action Item null-status returns 500 | Confirmed KI-1 / ABP-19369; preserve expected 400 |
| `d686e66f90` | 1 / 0 | Backend statusMessage object instead of string | Flaky-classified final failure; inspect response contract |
| `776a9ca19e` | 1 / 3 | Selected scenario set differs | Flaky-classified final failure; inspect user/default state |
| `2cefd70dc9` | 1 / 1 | SCA success-alert assertion | Flaky-classified final failure; same observation investigation |
| `ee24a2bf55` | 1 / 0 | Azure SCA history-created scenario not found | Flaky-classified final failure; inspect lifecycle/search ownership |

The QA migration startup failures are **outside** this 69-failure audit because discovery produced no test records. The separate UI performance publish failure is also outside it.

## Retired Claims and Consolidation Scope

The seven superseded reports are replaced by this document. Old snapshots are not carried forward as active backlog merely because they once failed.

| Earlier recommendation or diagnosis | Current disposition |
| --- | --- |
| Install setup ffmpeg; split monolithic DrillThrough/Scope/workflow lanes | Already present in the current workflow; remove from pending implementation |
| Add entity type to ALM mapping deletion; guard exported process arrays | Already present in endpoint/helper source; detailed ALM plan retained separately |
| Increase Action Item search polling; fix Azure dock navigation | Existing helper/route improvements verified; do not confuse current TC2 helper timeout with the old search path |
| Fix substring/hidden drill-through cell matching | Exact visible-cell selection already exists; do not replace it with arbitrary cells |
| Add LiveBlocks saved filter | Already implemented; investigate remaining layout/data failure |
| Missing IAM IDs explain unauthorized-page failure | Earlier investigation verified role unassign/reassign; current session/product state still needs checking |
| Web-worker `window` error proves context-clear hang cause | Earlier learning corrected this: worker fallback also occurs on healthy flows; scope-resolution effects were implicated instead. Do not retain the worker error as proven cause |
| Assumption scenario creation is a current supported-feature regression | Those contexts were subsequently removed/unscheduled as unsupported; absence is not a product fix or clean pass |
| Accept IAM role cleanup 409 as success | Rejected: a conflict can leave roles behind; verify actual cleanup and permission boundaries |
| Automatically quarantine failing offset checks or accept weaker assertions | Not authorized; retain coverage and contract expectations |
| Previous Gravitee gateway storm remains the current primary cause | Partial recovery observed; investigate current specific 503/auth/data failures rather than reusing the old incident diagnosis |

Preserved unchanged: [ALMDeploy](ALMDeploy-ResourceMigration-Plan.md), [drill-through notification](drill-through-notification-alert-race-condition-and-fix.md), and [duplicate-node schedule cycles](duplicate-node-schedule-cycles-issue-and-fix.md). They remain focused historical/design investigations, not proof that their proposed fixes are deployed.

Evidence reviewed: published current/prior day JSON, latest scheduled workflow list, all current cluster test records, selected raw Azure PS Allure results/stdout, QA Azure Allure/verdict results, both QA logs, current Actions job timings, UI performance deployment error logs, current known-issue registry and the relevant source paths. No live application reproduction, backend source patch, baseline approval, or full regression rerun was performed.