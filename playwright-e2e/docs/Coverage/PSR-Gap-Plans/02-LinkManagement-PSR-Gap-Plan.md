# Link Management: PSR APIs missing from Playwright backend tests

| Item | Value |
| --- | --- |
| Date | 2026-10-01 |
| Service | `plan-sop-link-management`, gateway path `links/v1` |
| PSR source | [jmeter/Tests/PSRGatewayTest.jmx](../../../../jmeter/Tests/PSRGatewayTest.jmx): 19 distinct LM routes in 45 samplers |
| Playwright source | [tests/ProcessOrchestrationBackend/LinkManagement](../../../tests/ProcessOrchestrationBackend/LinkManagement) (11 specs), LM steps in `Migration/`, and `util/mapping.util.ts` |
| Companion plans | [Process Orchestration](01-ProcessOrchestration-PSR-Gap-Plan.md), [Action Items](03-ActionItems-PSR-Gap-Plan.md), [UI Fields](04-UIFields-PSR-Gap-Plan.md) |
| Status | Implemented 2026-10-01 in Test_012, Test_013 and Test_014 (49 tests). Green on INTEROP and QA, Azure and Gravitee. Cases that asserted defective behaviour (LM-02-E01, LM-04-E01, LM-06-P02, LM-07-E01, LM-V1-E02) were removed and recorded as LM-D01 to LM-D05 in [ActionItems-UIFields-Defect-Report.html](ActionItems-UIFields-Defect-Report.html). LM-06-E02 cascade not implemented, pending R3. |

## 1. Scope

**In scope:** every Link Management (LM) route that `PSRGatewayTest.jmx` calls, plus two **payload-variant gaps**. A variant gap is a route Playwright already covers, but PSR sends a request shape that no Playwright test sends.

**Out of scope:** LM routes that PSR never calls, such as `POST /validate` and the `/exportData` and `/importData` pair. They are listed in [link-management-api-coverage-matrix.html](../link-management-api-coverage-matrix.html).

## 2. Summary

| Metric | Count |
| --- | --- |
| Distinct LM routes in PSR | 19 |
| Covered by Playwright | 12 |
| Not covered | **7** (LM-01 to LM-07) |
| Payload-variant gaps on covered routes | 2 (LM-V1, LM-V2) |
| Proposed test cases | 59 (see section 7) |

- **P1:** `POST /view-entity-map/lm-search/v2` runs on every Planning Space load (planning-mfe `useFetchAllActors`). Every view mapped to an actor or procedure flows through it, and its error path is silent: it returns `200 {views: []}`.
- **P1:** `GET /entity/{e}/views` and `GET /type/{t}/entity/{e}/views` load the user's favourite views whenever a Planning Space context opens.
- **P2:** the favourites writes (`POST` and `DELETE`, untyped and typed) behind the "star" button in the planning-mfe view panel.

## 3. Method and evidence

The method is the same as in the [PO plan](01-ProcessOrchestration-PSR-Gap-Plan.md#3-method-and-evidence). The LM specs build URLs from `process.env.VIEW_ENTITY_MAP` and `VIEW_ENTITY_PROCEDURE_MAP`. Preset, scope and clear calls derive the LM base by stripping `/view-entity-map`, as Test_009, Test_010 and Test_011 do. `POST /view-entity-map/clear` is covered through `MappingUtil.clearAllEntityViews`, which asserts `200` and `Deleted <n> views successfully`.

## 4. Coverage matrix: all 19 PSR LM routes

| # | Method | Route | PSR samplers | Playwright | Evidence or gap ID |
| --- | --- | --- | --- | --- | --- |
| 1 | POST | `/view-entity-map` | 2 | Covered | Test_001, Test_002, Test_003 |
| 2 | POST | `/view-entity-map/search` | 8 | Covered | Test_001–Test_003, Test_008, `mapping.util.ts` (**LM-V2** variant) |
| 3 | POST | `/view-entity-map/clear` | 2 | Covered | Test_001–Test_003 through `clearAllEntityViews` |
| 4 | POST | `/entity-view-procedure-map` | 2 | Covered | Test_004–Test_007 |
| 5 | POST | `/entity-view-procedure-map/search` | 5 | Covered | Test_004–Test_007 through `searchProcedures` |
| 6 | POST | `/preset` | 3 | Covered | Test_009, Test_011 (**LM-V1** variant) |
| 7 | POST | `/search-preset` | 3 | Covered | Test_009, Test_011 (**LM-V1** variant) |
| 8 | POST | `/preset/clear` | 3 | Covered | Test_009, Test_011 (**LM-V1** variant) |
| 9 | PUT | `/view-entity-map/views/{v}/type/{t}/entity/{e}` | 2 | Covered | Test_008 |
| 10 | DELETE | `/view-entity-map/views/{v}/type/{t}/entity/{e}` | 2 | Covered | Test_008 |
| 11 | PUT | `/scope?entityType&entityId&viewId` | 2 | Covered | Test_010 |
| 12 | GET | `/scope?entityType&entityId&viewId` | 3 | Covered | Test_010 |
| 13 | POST | `/view-entity-map/lm-search/v2` | 1 | None | **LM-01** |
| 14 | GET | `/entity/{entityId}/views` | 2 | None | **LM-02** |
| 15 | GET | `/type/{type}/entity/{entity}/views` | 1 | None | **LM-03** |
| 16 | POST | `/entity/{entityId}/views` | 1 | None | **LM-04** |
| 17 | POST | `/type/{type}/entity/{entity}/views` | 1 | None | **LM-05** |
| 18 | DELETE | `/entity/{entityId}/views/{favouriteId}` | 1 | None | **LM-06** |
| 19 | DELETE | `/type/{type}/entity/{entity}/views/{favouriteId}` | 1 | None | **LM-07** |

Variant gaps:

| ID | Covered route | PSR shape not sent by any Playwright test | PSR samplers |
| --- | --- | --- | --- |
| LM-V1 | `/preset`, `/search-preset`, `/preset/clear` | **Global preset**: `entityId: "*"`, `entityType: "*"`, followed by a search in a subprocess context that falls back to the global preset. Test_009 and Test_011 data contain no `"*"`. Test_011 covers `applyToAllUsers` for entity contexts only. | PresetVariant1, PresetVariant2, PresetVariant3 |
| LM-V2 | `/view-entity-map/search` | One request with **75 entity ids** of type `SCP-Launch-Interactive-Planning`. Test_008 searches one procedure entity at a time. | PO To PS 7, AI To PS 7 |

## 5. Repository usage matrix for the gap APIs

Legend: **O** owns (implements) the route. **UI** calls it from browser code. **S2S** calls it service to service. **-** means no usage was found in non-test source. `plan-sop-po-be-commons` supplies shared auth, logging and routing to every service and calls none of these routes, so it has no column.

| ID | Route | Link Mgmt | planning-mfe | lui | PO service | Action Item | UI Fields |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LM-01 | POST `/view-entity-map/lm-search/v2` | O | UI | - | - | - | - |
| LM-02 | GET `/entity/{e}/views` | O | UI | - | - | - | - |
| LM-03 | GET `/type/{t}/entity/{e}/views` | O | UI | - | - | - | - |
| LM-04 | POST `/entity/{e}/views` | O | UI | - | - | - | - |
| LM-05 | POST `/type/{t}/entity/{e}/views` | O | UI | - | - | - | - |
| LM-06 | DELETE `/entity/{e}/views/{id}` | O | UI | - | (indirect: see note) | - | - |
| LM-07 | DELETE `/type/{t}/entity/{e}/views/{id}` | O | UI | - | - | - | - |
| LM-V1 | `/preset` (global) | O | UI (`SetDefaultFilterPopup.tsx:161`, `:207`; `SideNavWithRightPanel.tsx:2994`) | - | - | - | - |

lui has no favourites or `lm-search/v2` call. Its `config.ts` key `favourites` (`/favorites/...`) is a legacy key that nothing uses.

Note on LM-06: the untyped favourites of a process are keyed by the process's **`linkEntityId`**. PO creates that LM source entity through `POST /entity` (`LinksProxyService.java:80`). When the source entity is deleted (`DELETE /entity/{id}`), LM removes all favourites of that entity internally (`SourceEntityService.java:179` → `LinksService.deleteFavoritesByEntity`). That is a cascade, not a call to the favourites route.

## 6. Gap API contracts

### Shared conventions

| Aspect | Value |
| --- | --- |
| Base URL | `${API_BASE_URL}` + `VIEW_ENTITY_MAP` with `/view-entity-map` removed. That gives `cbp/<env>/ibp/links/v1` in OLD mode and `lm/api/v1` (`qa/lm/api/v1` on QA) in NEW mode. |
| PSR equivalent | `https://${API_HOST}/cbp/psr/ibp/links/v1/...` |
| Auth | Bearer. LM resolves `tenantId` **and `userId`** from the token. Favourites are **per user**: a machine token's favourites belong to the machine subject. |
| Entity-type strings | Lower-case. Actors are `maasactor`, `scsactor`, `insightactor` and `uicacheactor`. The procedure type is `SCP-Launch-Interactive-Planning`. Others are `subprocess` and `assumptiontype`. The favourites routes do **not** validate the type. |
| Global marker | `Constants.GLOBAL = "*"`. Untyped favourites are stored with entity type `*`. A blank or `*` preset entity is stored as a global preset. |

### LM-01 POST `/view-entity-map/lm-search/v2` (P1)

| Item | Detail |
| --- | --- |
| Handler | `v2/refactor/viewtoentity/ViewEntityMapController.java:86` → `ViewToEntityMappingService.getViewsForEntities` |
| Request | `SearchEntityViewListRequestDto { requests: [ { entityType: string (@NotEmpty), entityId: string[] (@NotEmpty) } ] }`. `requests` is `@NotEmpty` and `@Valid`. |
| Behaviour | Runs one DB query per request group **in parallel** (`CompletableFuture.supplyAsync`), flattens the results and **groups them by viewId**. Entities with no mapping are **left out**. `/view-entity-map/search` returns them with an empty `views` list. |
| Response 200 | `{ "views": [ { "id": <viewId>, "sequence": <int>, "hidden": <bool>, "scopeId": null, "entities": [ { "entityType", "entityId", "quickFilterEnabled": <bool>, "quickFilterConfigId": <string|null> } ] } ] }` |
| Order | **Not deterministic.** The grouping uses a hash map, so compare as sets. |
| Errors | `400` when `requests` is empty, when a group has an empty `entityId` list or no `entityType`, or when the JSON is malformed. `401` without a token. **Any internal exception is swallowed and returns `200 {views: []}`**. |
| PSR sampler | LMSearch1: 4 groups (`scsactor`, `insightactor`, `maasactor`, `SCP-Launch-Interactive-Planning`), asserting `200` and that `$.views` exists |
| Used by | planning-mfe `src/hooks/useFetchAllActors.ts:251` (`config.apiLinksURL + /view-entity-map/lm-search/v2`), called by `SCASideNav` → `getEntities` on every Planning Space load |

```jsonc
// Request (PSR LMSearch1 shape)
{ "requests": [
  { "entityType": "scsactor",    "entityId": ["SCSMetadataFillRate", "SCSMetadata"] },
  { "entityType": "insightactor","entityId": ["Insight_Actor1", "Insight_Actor2"] },
  { "entityType": "maasactor",   "entityId": ["ActorCfgBringUpOnDemandMaas", "OnDemandMaas"] },
  { "entityType": "SCP-Launch-Interactive-Planning", "entityId": ["Procedure1", "Procedure2"] } ] }
```

### LM-02 and LM-03 GET favourites (P1)

| Item | Untyped LM-02 | Typed LM-03 |
| --- | --- | --- |
| Route | `GET /entity/{entityId}/views` | `GET /type/{type}/entity/{entity}/views` |
| Handler | `controllers/LinksController.java:95` | `controllers/LinksController.java:115` |
| Query | Favourites where `userId`, `entityId` and `tenantId` match. **The entity type is not filtered**, so typed favourites of the same entity id are returned too. | Favourites where `userId`, `entityType`, `entityId` and `tenantId` match |
| Response 200 | `{ "views": [ { "id", "name", "viewId", "containerId", "isActive", "isScopeEnabled" } ] }` | Same |
| Unknown entity | `200 {views: []}` | `200 {views: []}` |
| PSR samplers | PO To PS 10 and AI To PS 10 (`entity/<IBP linkEntityId>/views`), no assertions | Subprocess To PS 8 (`type/subprocess/entity/IntegratedBusinessPlanningInitiativesAndAssumptionsReview/views`), no assertions |
| Used by | planning-mfe `src/reducers/favourites.ts:47`, for a process, with `entityId` set to the process `linkEntityId` | planning-mfe `src/reducers/favourites.ts:59` (subprocess, entity `<process><subprocess>`) and `:74` (actor type, entity `<clusterID>`) |

### LM-04 and LM-05 POST favourites (P2)

| Item | Untyped LM-04 | Typed LM-05 |
| --- | --- | --- |
| Route | `POST /entity/{entityId}/views` | `POST /type/{type}/entity/{entity}/views` |
| Handler | `LinksController.java:168` → `LinksService.createUserFavorite(dto, "*", entityId)` | `LinksController.java:190` → `createUserFavorite(dto, type, entity)` |
| Body | `ViewRequestDto { name (@NotEmpty, ≤100), viewId (@NotEmpty, ≤36), containerId (@NotEmpty, ≤36), isActive = true, isScopeEnabled = false }` | Same |
| Behaviour | **Find or create** the catalogue row `(viewId, containerId, tenant)`, then add a `(user, entityType, entity, dashboardId)` association if it does not exist yet. This makes the route **idempotent**. When the catalogue row already exists, the request `name` is ignored. | Same |
| Response 201 | `ViewResponseDto { id (catalogue/dashboard id, used by DELETE), name, viewId, containerId, isActive, isScopeEnabled }` | Same |
| Errors | `400` on bean validation, `401` without a token | Same |
| PSR samplers | Favourites1. Asserts `201` and `$.viewId`, and extracts `$.id`. | Favourites3, same assertions |
| Used by | planning-mfe `src/components/SideNav/SideNavWithRightPanel.tsx:2314` (process, `context.linkEntityId`) | planning-mfe `SideNavWithRightPanel.tsx:2306` (subprocess) and `:2310` (interactive cluster) |

```jsonc
// Request (PSR Favourites1 and Favourites3)
{ "name": "JMeterPerfView", "viewId": "<view id>", "containerId": "JMeterPerfContainer",
  "isActive": true, "isScopeEnabled": false }
```

### LM-06 and LM-07 DELETE favourites (P2)

| Item | Untyped LM-06 | Typed LM-07 |
| --- | --- | --- |
| Route | `DELETE /entity/{entityId}/views/{viewId}` | `DELETE /type/{type}/entity/{entity}/views/{viewId}` |
| Path `viewId` | The **favourite or catalogue `id` returned by POST**, not the dashboard view id | Same |
| Handler | `LinksController.java:219` → `deleteUserFavorite(id, "*", entityId)` | `LinksController.java:243` → `deleteUserFavorite(id, type, entity)` |
| Behaviour | Deletes the user association only. **The catalogue row stays.** | Same |
| Response 200 | Text, HTML-escaped: `View with id [<id>] deleted for Entity Id [<entityId>]` | Text, HTML-escaped: `View with id [<id>] deleted for Entity Id [<entity>] of type [<type>]` |
| Errors | No association for this user, type and entity raises `ENTITY_NOT_FOUND` (RbacServiceException). The expected status is `404`; confirm it on the first run. | Same |
| PSR samplers | Favourites2. Asserts `200` and `deleted for Entity Id [JMeterPerfProcess]`. | Favourites4. Asserts `200` and `of type [subprocess]`. |
| Used by | planning-mfe `SideNavWithRightPanel.tsx:2362` | planning-mfe `SideNavWithRightPanel.tsx:2352` (subprocess) and `:2357` (actor type). This code builds the URL **with a double slash**: `${linksUrl}/` + `/type/...`. |

### LM-V1 Global preset variant (P2)

| Step | Request | Behaviour (`service/FilterPresetService.java`) |
| --- | --- | --- |
| Create | `POST /preset {viewId, entityId:"*", entityType:"*", filterId, entityName, applyToAllUsers:false}` | A blank or `*` entity is stored as GLOBAL/GLOBAL. Returns `201` with `viewId`. |
| Search | `POST /search-preset {viewIds:[viewId], entityId:<subprocess sourceId>, entityType:"subprocess", entityName}` | For any entity other than `*` the search **adds GLOBAL** to the entity list, so the global preset is returned as a fallback. PSR asserts `$.presets[0].filterId == sharedFilterId`. |
| Clear | `POST /preset/clear {viewIds:[viewId], entityId:"*", entityType:"*"}` | Returns `200` text `Deleted filters as per search request` |

### LM-V2 Multi-entity procedure search (P3)

`POST /view-entity-map/search {entityId:[75 ids], entityType:"SCP-Launch-Interactive-Planning"}` returns `200`. There is one result entry per requested id, including ids with empty `views`. This is the shape planning-mfe uses to map procedures to views for a process (PO To PS 7).

## 7. Test cases

Type: **P** positive, **N** negative, **E** edge.

### LM-01 lm-search/v2 (15)

Setup: use `PUT /view-entity-map/views/{v}/type/{t}/entity/{e}` (the Test_008 pattern) to map `maasactor/PWActor_<run>` and `SCP-Launch-Interactive-Planning/PWProc_<run>` to `PWView_<run>`, plus `scsactor/PWScs_<run>` to a second view. Remove all three with `DELETE` in `afterAll`.

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| LM-01-P01 | P | 4-group request mirroring PSR, with the seeded ids added to their groups | `200`. `views` contains `PWView_<run>`, whose `entities` hold both `PWActor_<run>` (`maasactor`) and `PWProc_<run>` (procedure type). |
| LM-01-P02 | P | View contract | Each view has string `id`, integer `sequence`, boolean `hidden`, `scopeId === null` and a non-empty `entities` array. Each entity has `entityType`, `entityId`, boolean `quickFilterEnabled` and `quickFilterConfigId`. |
| LM-01-P03 | P | Single-group request (`maasactor` only) | Only views mapped to the requested actor ids. `entities` include no other types. |
| LM-01-P04 | P | Parity with `/view-entity-map/search`, compared per type | The set of view ids returned by v2 equals the union of `/search` view ids across the same groups |
| LM-01-P05 | P | Quick filter: `PUT /scope` with `quickFilterEnabled:true` for `(maasactor, PWActor_<run>, PWView_<run>)` (Test_010 body) | The entity in v2 shows `quickFilterEnabled === true`. Reset the scope in cleanup. |
| LM-01-N01 | N | `{ "requests": [] }` | `"400"` (`Request list cannot be empty`) |
| LM-01-N02 | N | Group with `entityId: []` | `"400"` |
| LM-01-N03 | N | Group without `entityType` | `"400"` |
| LM-01-N04 | N | Body `{}`, and separately malformed JSON | `"400"` |
| LM-01-N05 | N | No token | `"401"` |
| LM-01-E01 | E | Every requested id is unmapped | `200 {views: []}`, unlike `/search`, which lists the entities with empty views |
| LM-01-E02 | E | The same entity id twice in one group | No duplicate entity inside a view. If duplicates appear, record them. |
| LM-01-E03 | E | Unknown type `"foo"` | `200 {views: []}` (no type validation) |
| LM-01-E04 | E | Order independence | Compare views and entities as sets; never by index |
| LM-01-E05 | E | Large request: 4 groups × 50 ids | `200` within `getTimeout('LONG')`. The parallel queries return the complete union. Because the service swallows errors, also assert that the seeded view **is** returned, so a silent `views: []` cannot pass. |

### LM-02 and LM-03 GET favourites (9)

Setup: create the favourites with LM-04 and LM-05 first, using stable synthetic ids (see section 8).

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| LM-02-P01 | P | Untyped GET for the entity used in LM-04 | `200`. `views` contains the favourite: `id` equals the POST `id`, and `viewId` and `containerId` match. |
| LM-02-P02 | P | Item contract | `id`, `name`, `viewId` and `containerId` are strings. `isActive` and `isScopeEnabled` are booleans. |
| LM-03-P01 | P | Typed GET for `type/subprocess/entity/<process><subprocess>` | Contains the typed favourite from LM-05 |
| LM-03-P02 | P | Typed GET for an actor type (`type/<clusterType>/entity/<clusterId>`, the planning-mfe interactive-cluster shape) | Contains the favourite created for that type |
| LM-03-P03 | P | The typed GET filters by type | A favourite created untyped (`*`) for the same entity id is **not** returned |
| LM-02-E01 | E | The untyped GET ignores type: create a typed favourite for entity X, then `GET /entity/X/views` | The typed favourite **is** returned. Record this cross-type visibility as current behaviour. |
| LM-02-E02 | E | Unknown entity | `200 {views: []}` |
| LM-02-E03 | E | Per-user isolation, using a user token from `util/user-token.util.ts` when one is configured | The machine's favourites are not visible to the user |
| LM-02-N01 | N | No token (both routes) | `"401"` |

### LM-04 and LM-05 POST favourites (11)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| LM-04-P01 | P | Untyped POST with the PSR body | `201`. `id` is a non-empty string. `viewId` and `containerId` echo the request. `isActive` is `true` and `isScopeEnabled` is `false`. |
| LM-05-P01 | P | Typed POST `type/subprocess/entity/<process><subprocess>` | `201`, same contract |
| LM-04-P02 | P | Idempotency: POST the same body twice | Both return `201` with the **same `id`**. GET lists the favourite once. |
| LM-04-P03 | P | The same `(viewId, containerId)` under two different entities | Same `id` in both responses (shared catalogue row). Each entity's GET lists it. |
| LM-04-N01 | N | `name` missing; separately `viewId` missing; separately `containerId` missing | `"400"` each |
| LM-04-N02 | N | `viewId` of 37 characters; separately `name` of 101 characters | `"400"` |
| LM-04-N03 | N | Malformed JSON | `"400"` |
| LM-04-N04 | N | No token | `"401"` |
| LM-04-E01 | E | Existing catalogue row, POST with a different `name` | `201`, and the response `name` is the **original** one (the request name is ignored). Record this. |
| LM-04-E02 | E | Entity id with URL-reserved characters (`PW Auto&1`, encoded) | `201`. GET with the same encoding returns it. |
| LM-05-E01 | E | `isScopeEnabled: true` in the body | Persisted, and visible in GET |

### LM-06 and LM-07 DELETE favourites (12)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| LM-06-P01 | P | Untyped DELETE `/entity/{e}/views/{id}` | `200` text `View with id [<id>] deleted for Entity Id [<e>]`. GET no longer lists it. |
| LM-07-P01 | P | Typed DELETE `/type/subprocess/entity/{e}/views/{id}` | `200` text ending `of type [subprocess]`. The typed GET no longer lists it. |
| LM-06-P02 | P | Re-POST after DELETE | `201` with the **same `id`**, because the catalogue row survives the DELETE |
| LM-06-N01 | N | DELETE the same favourite again | Not found (`ENTITY_NOT_FOUND`). Expect `"404"`; confirm on the first run. |
| LM-06-N02 | N | Unknown favourite id | Same as N01 |
| LM-07-N01 | N | Typed favourite deleted through the untyped route | Not found, because the type is `*` ≠ `subprocess`. The typed favourite is still listed. |
| LM-07-N02 | N | Wrong type in the typed route (`type/maasactor/...` for a subprocess favourite) | Not found |
| LM-06-N03 | N | No token | `"401"` |
| LM-07-E01 | E | Double-slash URL exactly as planning-mfe sends it (`.../links/v1//type/subprocess/entity/{e}/views/{id}`) | Accepted (`200`) after gateway normalisation. If it fails with `400` or `500` (Spring `StrictHttpFirewall`), raise a planning-mfe defect. |
| LM-06-E01 | E | The entity id contains `&` | The response text HTML-escapes it as `&amp;` (`escapeHtml4`) |
| LM-06-E02 | E | Cascade: delete the source entity with `DELETE /entity/{id}` (LM) for a synthetic source entity created with `POST /entity` | The favourites of that entity disappear. Optional; needs the source-entity routes. |
| LM-07-E02 | E | Favourites of another user | Cannot be deleted with the machine token (not found) |

### LM-V1 Global preset (8)

Setup: synthetic `viewId` and `filterId` (LM does not check that they exist). Clear the global preset in both `beforeAll` and `afterAll`.

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| LM-V1-P01 | P | Create a global preset `{entityId:"*", entityType:"*"}` | `201`, `viewId` echoes |
| LM-V1-P02 | P | Search in a subprocess context that has no entity-specific preset | `200`. `presets` includes `filterId === <global filterId>`. |
| LM-V1-P03 | P | Search in a process context that has no entity-specific preset | The global preset is returned the same way |
| LM-V1-P04 | P | Clear the global preset | `200` text `Deleted filters as per search request`. A following subprocess search returns no global preset. |
| LM-V1-P05 | P | Entity-specific preset plus global preset on the same view | Verified: search keeps one preset per view, so only the entity-specific preset is returned and the global one is dropped. After the entity preset is cleared, the global fallback returns. |
| LM-V1-E01 | E | `entityId: ""` (blank) | Stored as global (source rule). The search fallback returns it. |
| LM-V1-E02 | E | Global plus `applyToAllUsers: true` (admin) | Verified: `404 IBP_LINK_40_SRV_006_404` ("LIAM resource *.* was not found"); the admin flow does not support a global entity. |
| LM-V1-N01 | N | Clear a global preset that does not exist | `200` no-op, consistent with the Test_009 idempotent clear |

### LM-V2 Multi-entity procedure search (4)

| ID | Type | Scenario | Expected |
| --- | --- | --- | --- |
| LM-V2-P01 | P | 75 procedure ids (PSR PO To PS 7 list), 2 of which are seeded and mapped | `200`. 75 result entries, one per id. The 2 seeded ids have non-empty `views`. |
| LM-V2-P02 | P | Mixed mapped and unmapped ids | Unmapped ids are present with `views: []` |
| LM-V2-E01 | E | Duplicate ids in the request | Record whether duplicate entries come back |
| LM-V2-E02 | E | Latency | Under `getTimeout('MEDIUM')`. Soft check. |

**Total: 59 test cases.**

## 8. Data dependencies and environment prerequisites

| Dependency | Needed by | Notes |
| --- | --- | --- |
| Synthetic view ids (24-character hex) and container ids | LM-01, LM-04 to LM-07, LM-V1 | LM does not check that views exist. **Never** reuse real view ids from the Planning Space UI suites (Views, Scope, WorkflowFilter batches). |
| **Stable** favourite ids per environment, for example `viewId=6650aaaa0000000000000001` and `containerId=PWAutoFavContainer` | LM-04 to LM-07 | DELETE never removes catalogue rows, and there is no route to delete them. Random ids add one permanent row per run. Reuse fixed values. |
| Process `linkEntityId` | LM-02 and LM-04 (realistic untyped entity) | Read it from `GET /process/{p}` or `POST /process/search` (`linkEntityId`). Synthetic ids also work, as in PSR `JMeterPerfProcess`. |
| Subprocess entity id `<processName><subprocessName>` | LM-03, LM-05, LM-07 | For example `IntegratedBusinessPlanningSupplyReview` |
| Actor and procedure entities | LM-01 | Synthetic, created through the single-mapping PUT and removed in `afterAll` |
| Token identity | All favourites tests | Favourites belong to the token's user, so machine-token data never appears for human testers |
| Existing scope or quick-filter configuration | LM-01-P05 | Reuse the Test_010 `putScopeRequest` and reset with `putNullScopeDisabledRequest` |
| PSR test data fix | All LM specs on PSR | `testdata/PSR/ProcessOrchestrationBackend/LinkManagement/Test_008_EntityViewActorsProcedures.json` has `deleteEndpoint` values that use the **`cbp/interop/...`** path. Correct them before LM specs run in PSR. |

Cleanup order in `afterAll`: favourites (DELETE, accepting `200` or `404`), single mappings (DELETE), scope reset, global preset clear.

## 9. Implementation blueprint

| Spec (new) | Covers | Suite | Testdata |
| --- | --- | --- | --- |
| `LinkManagement/Test_012_LmSearchV2ActorsAndProcedures.spec.ts` | LM-01, LM-V2 | `POBackendLinkManagementBatch.json`, plus LM-01-P01/P02 in `POBackendSmokeBatch.json` | `testdata/<ENV>/ProcessOrchestrationBackend/LinkManagement/Test_012_LmSearchV2ActorsAndProcedures.json` (`VIEW_IDS`, `ACTORS`, `PROCEDURES`, `PSR_PROCEDURE_IDS`) |
| `LinkManagement/Test_013_UserFavouriteViews.spec.ts` | LM-02 to LM-07 | `POBackendLinkManagementBatch.json` | `.../Test_013_UserFavouriteViews.json` (`FAV_VIEW_ID`, `FAV_CONTAINER_ID`, `PROCESS_ENTITY_ID`, `SUBPROCESS_ENTITY_ID`, `ACTOR_TYPE`, `ACTOR_ENTITY_ID`) |
| `LinkManagement/Test_014_GlobalPresetFilter.spec.ts` | LM-V1 | `POBackendLinkManagementBatch.json` | `.../Test_014_GlobalPresetFilter.json` |

Notes:
- The numbers continue after `Test_011_AdminFilterManagement`. The 2026-08-31 LM gap report proposed `Test_011`–`Test_017`, which is stale because `Test_011` is now taken.
- Reuse the `linksBasePath` derivation from Test_009 and Test_010. Put the URL builders and the favourite create/delete helpers in `util/mapping.util.ts` rather than repeating them in each spec.
- Assert error statuses as strings (`"400"`), as [playwright-api.instructions.md](../../../../.github/instructions/playwright-api.instructions.md) requires.
- Favourites tests must stay `test.describe.serial` (create, read, delete).

## 10. Defect candidates and risks found in the source

| ID | Route | Finding | Test |
| --- | --- | --- | --- |
| L1 | `lm-search/v2` | Every exception in the parallel lookups is logged and swallowed, and the route returns `200 {views: []}`. A DB outage looks like "no views mapped" in Planning Space. | LM-01-E05 |
| L2 | `lm-search/v2` | The view order is not deterministic (hash grouping). The UI must not rely on it. | LM-01-E04 |
| L3 | Favourites GET (untyped) | Filters only by user and entity, so typed favourites appear in the untyped list | LM-02-E01 |
| L4 | Favourites DELETE | Catalogue rows are never removed, and there is no delete route for them, so rows accumulate | LM-06-P02 |
| L5 | Favourites POST | When the catalogue row exists, the request `name` is silently ignored | LM-04-E01 |
| L6 | planning-mfe | The typed DELETE URL contains `//` (`SideNavWithRightPanel.tsx` removeFavourite). **Confirmed 2026-10-01:** Azure accepts it (`200`); Gravitee rejects it with `400 BY-API-G-C40020` ("No API path found"), so removing a typed favourite fails in planning-mfe behind Gravitee. Raise a planning-mfe defect. | LM-07-E01 |
| L7 | Preset (known) | Test_009 TC11 already records that an invalid `entityType` is accepted (`201`) | (existing) |

## 11. Other recommendations

- **R1. Assert more in PSR.** PO To PS 10, AI To PS 10 and Subprocess To PS 8 (favourites GET) have **no assertions** in PSR. Add `200` and `$.views` checks.
- **R2. Probe the gateway.** Add a JMX sampler, or a one-off check, that sends the planning-mfe double-slash DELETE through both gateways.
- **R3. Test the cascade.** Add LM-06-E02 once a synthetic source-entity flow (`POST /entity`, then `DELETE /entity/{id}`) is approved. PO uses the same LM route to create the process `linkEntityId`.

## 12. Open questions

1. What fixed favourite `viewId` and `containerId` should each environment use, so that catalogue rows do not keep growing?
2. Should LM-01-E05, the silent-failure guard, fail the build, or only annotate it?

## 13. Related documents

- [LM API contract](../../repositories/plan-sop-link-management/api-contract.md) and [LM automation coverage](../../repositories/plan-sop-link-management/automation-coverage.md)
- [PSRGatewayTest-LinkManagement-Coverage.html](../../../../jmeter/plans/PSRGatewayTest-LinkManagement-Coverage.html)
- [link-management-api-coverage-matrix.html](../link-management-api-coverage-matrix.html) and the [backend API coverage dashboard](../backend-api-coverage-dashboard.html)
