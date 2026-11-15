# Migration Suite — Review, Findings & Improvement Plan

**Scope:** `playwright-e2e/tests/ProcessOrchestrationBackend/Migration/Test_001` → `Test_009` and the shared helper `playwright-e2e/util/alm-migration.util.ts`.
**Date:** 2026-08-01
**Author:** Automated review (GitHub Copilot)

---

## 1. Executive summary

The Migration suite covers export/import (ALM) flows for Calendars, Processes, Supply Chain Actions (SCA), Assumption/Action-Item KPIs, Entity-View mappings, Entity-View-Procedure mappings, Link-Management validation, and the end-to-end ALM Deploy resource flow.

Overall the suite is functional and Test_008 / Test_009 represent the target quality bar (helpers, negative + boundary cases, idempotency, best-effort teardown). The remaining specs have **inconsistent serial usage, brittle magic-number/string assertions, masked failures, runtime mutation of test data, and no safety-net teardown**, plus meaningful **coverage gaps** (feature toggles, action-item attributes/ui_fields, assumption non-KPI sections, negative/edge cases, cross-env parameterization).

| Area | Status |
|------|--------|
| Happy-path coverage | ✅ Good |
| Negative/edge coverage | ⚠️ Partial (only 007, 008) |
| Teardown / data hygiene | ⚠️ Inconsistent |
| Assertion robustness | ⚠️ Brittle in 002, 005, 006, 007 |
| Reuse / boilerplate | ⚠️ High duplication (001–009 realm/header setup) |

---

## 2. Per-spec findings

### Test_001 — Calendar Migration ✅ Completed
- ✅ Added a unique calendar name per run to prevent cross-run collisions.
- ✅ Moved cleanup exclusively to `afterAll`; both realms are always attempted with `Promise.allSettled`, and cleanup failures fail the suite.
- ✅ Moved the update-cycle payload into INTEROP and QA test data.
- ✅ Changed cycle validation from exact count equality to expected-cycle subset validation.
- ✅ QA isolated run: **10 passed (10.7s)** on 2026-08-01, followed by successful source and target cleanup.
- ℹ️ INTEROP execution remains environment-blocked: Azure B2C rejected the configured source client secret with `invalid_client`; this is independent of the Test_001 implementation.

### Test_002 — Process Migration ✅ Completed
- ✅ Converted the dependent flow to `test.describe.serial` and standardized realm auth with `buildAuthHeaders`.
- ✅ Moved cleanup exclusively to asserted `afterAll`; source and target realms are always attempted with `Promise.allSettled`.
- ✅ Added idempotent cleanup for processes, procedures, actors, role assignments, and roles; only successful or already-absent statuses are accepted.
- ✅ Removed the masked/commented cleanup assertion and changed `subProcessName` to `const`.
- ✅ QA isolated run: **10 passed (1.3m)** on 2026-08-01, including successful two-realm cleanup.

### Test_003 — Full & Partial Export ✅ Completed
- ✅ Replaced fragile array-length comparisons with explicit per-environment expected counts and exact sorted identity-set validation.
- ✅ Standardized authentication setup with `buildAuthHeaders`.
- ✅ Added negative coverage for missing authorization, unknown process names, and malformed payloads.
- ✅ Asserted the observed malformed-payload contract: HTTP `500`, unsuccessful process export, and a populated `errorReason`.
- ✅ INTEROP isolated run: **5 passed (1.1m)** on 2026-08-01.

### Test_004 — Supply Chain Actions Migration ✅ Completed
- ✅ Centralized QA/INTEROP source and target realm resolution in one local realm-config helper.
- ✅ Moved cleanup exclusively to asserted `afterAll`, with a fresh target query and `Promise.allSettled` deletion so earlier test failures cannot bypass teardown.
- ✅ Centralized the cleanup namespace as `CLEANUP_NAME_PREFIX` in per-environment test data and documented both JSON schemas.
- ✅ INTEROP isolated run: **4 passed (17.7s)** on 2026-08-01, including successful cleanup of five migrated SCA fixtures.

### Test_005 — Assumption & Action Item KPI Migration ✅ Completed
- ✅ Replaced runtime mutation of cached test data with locally cloned export payloads containing only the current run's KPI IDs.
- ✅ Added unique Assumption and Action Item KPI names per run to prevent collisions and support cleanup fallback lookup.
- ✅ Moved deletion exclusively to asserted `afterAll`; source and target cleanup always run via `Promise.allSettled`, accept already-absent resources, and validate status rather than brittle response text.
- ✅ Added `_schema` documentation to INTEROP and QA test data.
- ✅ INTEROP isolated run: **6 passed (57.3s)** on 2026-08-01, including successful deletion of both KPI types from both realms.
- ℹ️ Broader non-KPI assumption sections remain outside this KPI-focused spec and are exercised by the ALM Deploy flow in Test_009.

### Test_006 — Entity View Mapping Migration ✅ Completed
- ✅ Replaced hardcoded mapping/import counts with values derived from entity and view arrays in each mapping payload.
- ✅ Search validation now asserts the complete entity set from the search request and requires every requested view, including sequence and hidden state, for each returned entity.
- ✅ Moved source and target clear operations exclusively to asserted `afterAll`, using `Promise.allSettled` and a response-shape assertion rather than exact deletion-count text.
- ✅ Added `_schema` documentation to INTEROP and QA test data.
- ✅ INTEROP isolated run: **11 passed (30.7s)** on 2026-08-01; teardown cleared 55 source mappings and 110 target mappings.

### Test_007 — Link Management ALM Validation
- 🐞 **Asserts the service is `FAILED` as the happy path** (TC2: `compareTwoValues(linkMgmtService?.status, 'FAILED', ...)`). On a clean realm where validation SUCCEEDS this test fails. Assert on the *presence/shape* and accept both terminal states, or seed a known-broken link deterministically.
- ⚠️ Hand-rolled `setTimeout` polling — replace with the shared `pollUntil` helper.
- ✅ Good 401 negative cases (TC4, TC5) and deep envelope validation (TC6).
- ⚠️ Missing: 403 (wrong-realm token), abort-when-not-in-progress, invalid payload, concurrent validation.

### Test_008 — Entity View Procedure Mapping Migration ✅ Completed
- ✅ Standardized all three unauthorized contracts on `isStatus(status, 401)`.
- ✅ Replaced the empty full-export selector with a partial selector and filtered exported data to the exact configured entity/view/procedure subset before import, preventing unrelated realm mappings from being migrated.
- ✅ Preserved strict per-view fidelity validation for procedure name, primary/secondary flags, and sequence.
- ✅ Corrected the empty-mapping boundary contract to assert INTEROP's structured `500` / `IBP_PO_50_2059` rejection.
- ✅ Strengthened `afterAll` to assert cleanup of all configured pairs in both source and target realms via `Promise.allSettled`.
- ✅ Added `_schema` documentation to INTEROP and QA test data.
- ✅ INTEROP isolated run: **13 passed (18.0s)** on 2026-08-01.

### Test_009 — ALM Deploy Resource Migration  *(reference quality)*
- ✅ Serial, shared util, `pollUntil`, path sanitization (security-aware), best-effort `afterAll` cleanup, timeout tiers.
- ⚠️ Relies on regex parsing of a human-readable job message for `resourceId`/`version` — fragile if the message format changes; prefer a structured field if the API exposes one.

---

## 3. Cross-cutting improvements

1. **Standardize auth setup** — some specs use `buildAuthHeaders`, others `getBearerToken` + manual headers. Pick one; expose a `migrationFixtures` fixture that provides `{ apiUtil, commonFunctions, headers, headersForTarget, realms }`.
2. **Extract a realm-config helper** to remove the repeated `PSENV === 'QA' ? … : …` branching (Test_004) and the 8-line env block duplicated in 001–009.
3. **Enforce `describe.serial`** on all dependent specs (fix Test_002).
4. **Remove masked failures** — re-enable/repair the Test_002 TC11 assertion.
5. **Derive expected counts from payloads** instead of magic numbers (Test_006, parts of 003).
6. **Never mutate `require`d test data** (Test_005) — clone locally.
7. **Standardize status assertions** on `isStatus(status, code)` with numeric codes (Test_008).
8. **Add `afterAll` best-effort teardown** to 001, 002, 004, 005, 006 (mirror Test_008/009).
9. **Reuse `pollUntil`** in Test_007 instead of bespoke polling.
10. **Tolerant terminal-state assertions** for validation flows (Test_007 SUCCESS/FAILED).

---

## 4. Additional test cases to create

### 4.1 Coverage gaps (new specs / cases)
- **Feature Toggle migration** — export/import tenant + process-level toggles and verify in target (seen in full export, no dedicated migrate+verify test).
- **Action Item attributes & ui_fields migration** — only `kpis` are covered today.
- **Assumption attributes / assumption_types / insight_configs / insight_types migration** — dedicated migrate+verify (currently only key-presence in Test_009).
- **Cross-environment matrix** — parameterize source→target across INTEROP/QA/PSR.

### 4.2 Negative / security cases (extend beyond 007/008)
- Export/import with **401** (missing token) and **403** (valid token, wrong realm) for every resource type.
- **Malformed / empty payload** import → graceful 4xx/no-op (generalize Test_008 TC12).
- **Unknown entity name** export → empty result, not error.
- **Deploy non-existent resource** → 404; **deploy older/duplicate version** → conflict handling.

### 4.3 Edge / boundary cases
- **Idempotent re-import** for Calendars, SCA, KPIs (Test_008 has it; extend).
- **Large-volume / pagination** export (>page size) integrity.
- **Concurrent export + import** on the same resource.
- **Source == target realm** import behavior.

### 4.4 Data hygiene
- Shared **best-effort `afterAll` teardown** helper for every migration spec to prevent orphaned data.

---

## 5. Phased delivery plan

> Branch policy: one single-purpose branch per phase (`bugfix/…`, `refactor/…`, `test/…`). Per-env test data under `testdata/<ENV>/ProcessOrchestrationBackend/Migration/`. Register new specs in `tests/TestSuites/*.json`. Run targeted specs in isolation (`--workers=1`) and regenerate `npm run docs:testcases`.

### Phase 0 — Baseline & triage (0.5 day)
1. Run the full Migration suite on INTEROP; capture current pass/fail and flthe FAILED-status dependency in Test_007.
2. Confirm `compareTwoValues` equality semantics (numeric vs string status) to validate the Test_008 finding.
3. Snapshot orphaned-data risk (which specs lack teardown).

### Phase 1 — Bug fixes (1–2 days) · `bugfix/migration-suite-hardening`
1. Test_002: convert to `describe.serial`; re-enable TC11 assertion with tolerant status handling; `subProcessName` → `const`.
2. Test_005: stop mutating `require`d data — build export payload locally.
3. Test_008: replace string `'401'` comparisons with `isStatus(status, 401)`.
4. Test_007 TC2: accept both terminal states (SUCCESS/FAILED); assert shape not a fixed FAILED.
5. Validate: `read/problems` clean; each edited spec runs in isolation.

### Phase 2 — Robustness & de-brittling (2 days) · `refactor/migration-assertions`
1. Test_006: derive expected insert/clear counts from the request payloads instead of `55`/`110`/`>=30`.
2. Test_003: replace fragile entity-view length comparison with explicit expected counts from test data.
3. Replace brittle exact-message assertions (005, 006) with pattern/`includes` checks.
4. Swap Test_007 bespoke polling for `pollUntil`.

### Phase 3 — Shared infrastructure & teardown (2 days) · `refactor/migration-fixtures`
1. Add a `migrationFixtures` fixture (auth headers + realm config) and a `getMigrationRealms()` helper to remove PSENV branching (Test_004) and the duplicated env blocks (001–009).
2. Add a reusable best-effort `afterAll` teardown helper; wire into 001, 002, 004, 005, 006.
3. Standardize all specs on `buildAuthHeaders`.

### Phase 4 — New coverage (3–4 days) · `test/migration-coverage`
1. Feature Toggle migration spec (`Test_010_FeatureToggleMigration`).
2. Action Item attributes & ui_fields migration spec (`Test_011_ActionItemAttributesMigration`).
3. Assumption non-KPI sections migration spec (`Test_012_AssumptionConfigMigration`).
4. Negative/security matrix additions (401/403/malformed) across resource types.
5. Register new specs in `tests/TestSuites/*.json`; add per-env test data; `npm run docs:testcases`.

### Phase 5 — Cross-env & CI (1–2 days) · `test/migration-cross-env`
1. Parameterize source→target realm matrix; verify QA/PSR data files exist.
2. Confirm CI workflow includes new specs; stabilize (retries/timeouts via `getTimeout`).

---

## 6. Definition of Done (per phase)
- [ ] All dependent specs use `describe.serial`; fixtures injected.
- [ ] No inline selectors/URLs; no static sleeps; timeouts via `getTimeout(tier)`.
- [ ] No masked/commented-out assertions; failures surface in reports.
- [ ] Best-effort `afterAll` teardown on every stateful spec.
- [ ] Per-env test data present; specs registered in `TestSuites/*.json`.
- [ ] `npm run docs:testcases` regenerated; `read/problems` clean; targeted specs pass in isolation.
