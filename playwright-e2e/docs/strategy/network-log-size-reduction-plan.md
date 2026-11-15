# Network-Log Attachment Size Reduction — Implementation Plan (Error-Only Capture)

## Goal
Shrink published Allure network-log attachments (`data/attachments/*.json`) from
~12 MB per test to a few KB, so a PS-UI run drops from ~263 MB to well under
1 MB and 7 retained runs sit far below the GitHub Pages ~1 GB site limit —
**while keeping every error response** (bodies redacted and capped at 20,000 chars).

## Chosen approach: capture only errors in `capped` mode
- **`capped` (default)**: keep only entries that are an **HTTP error
  (`response.status >= 400`)** or a **genuine network failure** (a
  `requestfailed` whose `errorText` is NOT in the ignore list). Everything else
  (2xx/3xx success, aborted teardown beacons) is discarded. Retained entries are
  kept with full headers and bodies, later redacted and capped at 20,000 chars
  in both modes (`NetworkInterceptor.redactEntry`).
- **`full`**: keep every captured entry (today's behaviour) for deep debugging.

This replaces the earlier capping/trimming/header-allowlist/entry-cap idea with a
single filter, so **no per-field trimming is needed**. The only body limit is the
20,000-char cap, which keeps redaction fast; `full` changes which entries are kept,
not this cap.

## Background / Root Cause (measured on run #117)
One failing test's network log = **12.6 MB / 471 calls**. Breakdown by outcome:

| Kept set | Entries | Size |
|---|---|---|
| Everything (current) | 471 | 12.60 MB |
| **4xx/5xx only** | 4 | **0.02 MB** |
| failed only (all `net::ERR_ABORTED`) | 42 | 3.67 MB |
| errors + failed | 46 | 3.68 MB |
| errors + failed, excluding aborted/noise | 16 | 0.03 MB |

Host breakdown of the 471 calls: `api-tst.jdadelivers.com` 210/8.1 MB (real API),
`data.pendo.io` 208/4.7 MB (analytics noise), Harness flags 15, icons 31, rest tiny.

Key findings:
- **Real HTTP errors (4xx/5xx) total only 0.02 MB.**
- All 42 "failed" requests were **`net::ERR_ABORTED`** — in-flight beacons
  cancelled at test teardown (27 Pendo, 9 icons, 3 Harness, 3 app). This is noise,
  not real failure, so `net::ERR_ABORTED` is ignored by default.
- Expected effect: **12.6 MB → ~0.02 MB (~600x smaller)** per failing test.

## Design Principles
- Retained (error/failure) entries keep all their fields, with bodies redacted and capped at 20,000 chars.
- Behaviour is **env-selectable** so capturing every call is one switch away.
- Defaults keep the site tiny with zero maintenance.

## Configuration (env vars, read in `configs/fixtures.ts`)
| Env var | Default | Purpose |
|---|---|---|
| `PW_NETWORK_BODY_FIDELITY` | `capped` | `capped` = errors/failures only; `full` = everything |
| `PW_NETWORK_IGNORED_FAILURES` | `net::ERR_ABORTED` | comma-separated `errorText` values treated as noise (ignored in `capped`) |

`full` mode ignores `PW_NETWORK_IGNORED_FAILURES` and keeps all entries.

---

## Step-by-Step Implementation

### Step 1 — Interceptor options (`network/network.interceptor.ts`)
1. Keep `bodyFidelity: 'full' | 'capped'`.
2. Add `ignoredFailureErrors?: string[]` to `NetworkInterceptorOptions`
   (default `['net::ERR_ABORTED']`, stored lowercased for comparison).
3. **Remove the body-capping machinery** now made redundant:
   - delete `maxBodyBytes` / `DEFAULT_MAX_BODY_BYTES`
   - delete `truncateBody(...)`
   - delete the `status < 400` capping branch in `captureResponse` (store the
     full response body + full `postData` for every captured entry).
   This covers the old capture-time cap only. Keep the 20,000-char cap that
   `redactEntry` applies when entries are read: redaction relies on it to stay fast.

### Step 2 — Error-only filter (single place)
1. Add `private isRetained(entry: NetworkEntry): boolean`:
   - `full` mode → always `true`.
   - `capped` mode → `true` only if
     `entry.response !== undefined && entry.response.status >= 400`
     **or** (`entry.failure` present **and** its `errorText` (lowercased) is not
     in `ignoredFailureErrors`).
     (Use an explicit `!== undefined` guard — `entry.response?.status >= 400`
     does not compile under strict TS because the operand may be `undefined`.)
2. Change `getEntries()` to return `this.entries.filter(e => this.isRetained(e))`.
   (Capture still records everything during the test; the filter is applied once
   at read time. Memory cost is negligible.)
   - NOTE: the fixture serialises `getEntries()` **once** and uses that result for
     both the Allure `testInfo.attach` **and** the `test-results` `outputPath`
     write, so both stay consistent (single source — do not re-add a full copy).
3. Do **not** filter in `shouldCapture` — status/failure are only known after the
   response/failure event, so filtering must happen at read time.
4. Empty-log edge case: a test that fails for a non-HTTP reason (e.g. wrong data
   in a 200, or a UI timeout) produces an empty error-only list. In the fixture,
   when `capped` and `getEntries()` is empty, **skip the attach** (and the file
   write) and log a hint to re-run with `PW_NETWORK_BODY_FIDELITY=full` for full
   context. `full` mode always writes.

### Step 3 — Wire config in `configs/fixtures.ts`
1. Keep `getNetworkBodyFidelity()`.
2. Add `getNetworkIgnoredFailures()` (parse CSV env, default
   `['net::ERR_ABORTED']`).
3. **Remove** `getNetworkMaxBodyBytes()` and the `maxBodyBytes` option from the
   `new NetworkInterceptor(...)` call; pass `{ bodyFidelity, ignoredFailureErrors }`.
4. In `_networkCapture`, after `getEntries()`: if `capped` and the result is
   empty, skip the file write + `testInfo.attach` and log the `full`-mode hint
   (see Step 2.4). Otherwise serialise once and use for both outputs.
5. Update the fidelity doc comment: `capped` = errors/failures only, `full` =
   everything; bodies are redacted and capped at 20,000 chars either way.

### Step 4 — Workflow control (`.github/workflows/playwright-ps-iop-ui-local-suite.yaml`)
1. The existing `network-detail` input (`capped` | `full`) already maps to
   `PW_NETWORK_BODY_FIDELITY` via top-level `env`. No change required.

### Step 5 — Retention (optional, belt-and-suspenders)
1. With error-only logs the site should stay tiny; retention can remain at 7.
   Only revisit if some other artifact type grows.

---

## Validation
1. **Capped (default)**: run a heavy PS-UI test; confirm the emitted
   `*__network-log.json` contains only 4xx/5xx + genuine failures, each with its
   body (up to the 20,000-char cap), and is a few KB. Confirm 2xx/3xx and `net::ERR_ABORTED` are absent.
2. **Full**: run with `PW_NETWORK_BODY_FIDELITY=full`; confirm all 471-style
   entries are present (baseline behaviour).
3. **Forced error**: point a test at a 4xx/5xx endpoint; confirm the error
   body is retained (up to the 20,000-char cap).
4. **Run footprint**: after a CI run, aggregate sizes via
   `git ls-tree -r --long origin/gh-pages`; target well under ~10 MB/run.
5. **Pages build**: confirm "pages build and deployment" succeeds.

## Rollout
1. Implement Steps 1–3 on `gh-history-compaction`, PR review, merge to `main`.
2. Trigger one manual PS-UI run; measure footprint.
3. Expected: run folder < 1 MB; done.

## Rollback
- Set `PW_NETWORK_BODY_FIDELITY=full` (via the `network-detail` workflow input)
  to instantly keep every call again without a code change (bodies stay capped).
