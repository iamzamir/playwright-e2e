# Automation coverage — plan-sop-ui-fields-service

## Direct coverage
Two backend specs, added 2026-10-01 (PSR gap plan 04), registered in `POBackendUIFieldsBatch.json`. `Test_001` is also in `POBackendSmokeBatch.json`.

| Spec | Tests | Routes | What it asserts |
| --- | --- | --- | --- |
| `ProcessOrchestrationBackend/UIFields/Test_001_PageConfigContracts` | 32 | `GET /list-page-config`, `GET /list-page-config-with-filter`, `GET /detail-page-config` | Process/subprocess listing columns, process filters (page 21), process/subprocess details groups, calendar/cycle/transition pages lui uses; per-environment baselines; ordering stability; `entityId=null` as lui sends it; case-insensitive `entityName`; 400/401 negatives; unknown page → `200 []` |
| `ProcessOrchestrationBackend/UIFields/Test_002_PageEditorConfig` | 7 | `GET /page/{name}/editor` | Process, subprocess, template, calendar and cycle editors; baseline group/field names; missing `entityType` → 400; no token → 401 |

Endpoint coverage: **4 of 28 active routes (14.3%)** on the 2026-10-05 coverage dashboard. These are exactly the four routes lui calls.

| Helper | Use |
| --- | --- |
| `UI_FIELDS_BASE` (`configs/setup.js`) | OLD gateway prefix `cbp/<env>/ibp/ui-fields/v1`, used for both URL modes |
| `util/ui-fields.util.ts` | `buildUiFieldsUrl`, `sortedFieldNames`, `groupedFieldNames`, `compareWithBaseline` |
| `testdata/<ENV>/ProcessOrchestrationBackend/UIFields/` | Per-environment field baselines (INTEROP and QA; no PSR data) |

Run: `npm run test:interop:pobackend:uifields` (or `test:qa:...`).

## Indirect impact
lui is the only frontend that calls this service. When page configuration drifts, these UI specs are expected to fail first:

| Config route (lui caller) | UI specs affected |
| --- | --- |
| `GET /list-page-config`, `/list-page-config-with-filter` (`app_selections.ts`) | PO process/subprocess listing — `ProcessOrchestration/ProcessBatch/**`, `PowerBar/**`, `ViewSearch/**` |
| `GET /detail-page-config` (`process_details.ts`, `calendarDetail.ts`) | Process/subprocess details and calendar details — `ProcessOrchestration/ProcessBatch/**`, `Calendar/**` |
| `GET /page/{name}/editor` (`create_process_form_modal.ts`, `create_subprocess_form_modal.ts`, `create_process_template_modal.ts`, `calendarmodal.ts`, `calendarCycle.ts`) | Create/edit process, subprocess, calendar and cycle — `ProcessOrchestration/ProcessBatch/Test_002..004`, `Calendar/Test_001..002` |

Planning Space specs are **not** affected by this service: planning-mfe has no UI Fields call.

## Coverage gaps
Ranked by value:

| Gap | Risk | Suggested spec |
| --- | --- | --- |
| Attribute CRUD + values (`/entity/{entityType}/attribute/**`) | High | Full lifecycle with cleanup — tenant-wide, so serialise |
| UI field CRUD (`/ui-field/**`) | High | `POST /ui-field` → appears in `/page/{name}/editor` → delete |
| RBAC/ABAC enforcement | High | Assert 403 for an unauthorized user on every `@PreAuthorize` endpoint |
| `GET /filter-config` | Medium | Not called by lui today, but the canonical filter route |
| Page registry (`/page`, `/page/{name}`) | Medium | Name → ID resolution contract |
| UI component registry (`/ui-component`) | Medium | Lock the component list |
| `valueNames` bulk resolution | Medium | Map shape and unknown-key behaviour |
| Field rules | Medium | Conditional visibility behaviour |
| Subscriptions | Low | Controller is `@Deprecated` |
| Import / export | Low | Round-trip |
| `POST /echo` | Low | Smoke health check |

`GET /page/filter` appears on the coverage dashboard as a lui-used P1 gap, but lui's only call site (`all_process_table_data.ts`) is commented out; treat it as unused until that changes.

## Known behaviour (verified 2026-10-01)
- Non-numeric `pageId`/`filterPageId` → 400 `IBP_40_1027`; unknown page id → `200 []`; `/page/{name}/editor` unknown page or entity mismatch → 404 `IBP_UF_40_1020`.
- `filterPageId=1` returns the page-1 columns as filters (no page-type check). `cmp` is null for plain-text columns; the details/editor header group has `groupName: null`.
- Defects found while writing these specs are in `docs/Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html`, not asserted in specs.

## Risk ranking
| Area | Risk | Reason |
| --- | --- | --- |
| Page configuration | Medium (was Critical) | Covered for the four lui routes against baselines; other pages unasserted |
| Attribute configuration | High | Drives filter and editor options; untested |
| UI field CRUD | High | Changes what renders; untested |
| UI component registry | Medium | Selects rendering components |
| RBAC/ABAC | Medium-High | 403s present as missing fields rather than errors |
| Subscriptions | Low | Deprecated |
