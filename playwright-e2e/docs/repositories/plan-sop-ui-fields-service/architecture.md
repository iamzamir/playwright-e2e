# Architecture — plan-sop-ui-fields-service

## 1. Context
```mermaid
graph TB
    subgraph Clients
        LUI["plan-sop-lui<br/>PO listing, details, editors<br/>4 routes"]
        AUTO["plan-sop-ui-automation<br/>2 specs · POBackendUIFieldsBatch"]
    end

    PS["plan-sop-planning-mfe<br/>no UI Fields call"]

    GW{{"API Gateway<br/>cbp/&lt;env&gt;/ibp/ui-fields/v1"}}

    UF["<b>plan-sop-ui-fields-service</b><br/>9 controllers · 10 entities<br/>root package com.blueyonder.<b>crud</b>"]

    COMMONS["plan-sop-po-be-commons<br/>liquibase + sqlserver excluded"]
    LIAM["LIAM<br/>RBAC + ABAC, cache TTL 0"]
    DB[("Azure SQL<br/>azuresql_dc_database")]

    LUI --> GW
    AUTO -->|UI_FIELDS_BASE| GW
    PS -.no call.-x GW
    GW --> UF
    UF --> LIAM
    UF --> DB
    COMMONS -.packaged into.-> UF

    style PS fill:#f3f3f3,stroke:#999999
```

Earlier versions of this page showed Planning Space as a client and lui as unverified. Source shows the reverse: lui calls UI Fields through config keys in `src/config.ts`, and planning-mfe never does.

The root package is `com.blueyonder.crud`, not `uifields` — worth knowing when searching logs or stack traces.

## 2. Internal layering
```mermaid
graph TD
    subgraph REST["rest — HTTP boundary"]
        C["rest.controller — 8"]
        RQ["rest.dto.request — 6"]
        RS["rest.dto.response — 5"]
        D["rest.dto — 4"]
    end

    subgraph SVC["service"]
        SI["service.interfaces — 8"]
        SM["service.impl — 7"]
    end

    subgraph CUSTOM["custom — extension layer"]
        CSI["custom.service.interfaces — 3"]
        CSM["custom.service.impl — 5"]
        CE["custom.entity — 1"]
    end

    subgraph JPA["jpa — persistence"]
        E["jpa.entity — 8"]
        R["jpa.repository — 7"]
        CV["jpa.converter — 2"]
        B["jpa.entity.base — 2<br/>Auditable"]
    end

    subgraph X["cross-cutting"]
        CFG["config — 4"]
        LOG["logging — 6"]
        MAP["mapper — 3"]
        UTL["utils — 4 + constants + exceptions"]
        DEV["utils.development<br/>controller + filter"]
    end

    MM["hibernate-jpamodelgen<br/>static metamodel"]
    DB[("Azure SQL")]

    C --> RQ
    C --> RS
    C --> SI
    SI -.implemented by.-> SM
    SM --> CSI
    CSI -.implemented by.-> CSM
    CSM --> CE
    SM --> R
    R --> E
    E --> B
    E --> CV
    R --> DB
    MM -.generates criteria metamodel.-> R
    MAP -.entity ↔ dto.-> D

    style DEV fill:#fffbe6,stroke:#ccaa44
```

`utils.development` contains a controller and a filter intended for development only — confirm they are disabled in deployed environments before writing security assertions against this service.

## 3. The configuration model
These eight tables decide what every UI screen renders.

```mermaid
erDiagram
    Page ||--o{ FieldGroup : "page has groups"
    FieldGroup ||--o{ Field : "group has fields"
    Attributes ||--o{ FieldValue : "allowed values"
    Attributes ||--o{ Field : "field renders attribute"
    UiComponents ||--o{ Field : "rendered by widget"
    Field ||--o{ FieldRule : "conditional rules"
    FieldRuleDef ||--o{ FieldRule : "rule definition"
```

`UiComponents` → `Field` is the link that matters most for automation: **the component determines which widget lui renders for a field**, and so which `data-testid` appears in the DOM. A component swap here can silently break `getByTestId` locators in Process Orchestration page objects.

## 4. How configuration reaches the screen (lui)
```mermaid
sequenceDiagram
    participant U as Browser
    participant FE as lui
    participant FC as FieldController / PageController
    participant S as service.impl
    participant DB as config tables

    U->>FE: open the PO process listing
    FE->>FC: GET /list-page-config-with-filter?pageId=1&filterPageId=21&entityName=PROCESS
    FC->>S: resolve columns + filters for tenant
    S->>DB: ui_fields + groups + components
    DB-->>S: field definitions
    S-->>FC: UiMetadata
    FC-->>FE: columns and filters
    U->>FE: open a process
    FE->>FC: GET /detail-page-config?pageId=2&entityName=PROCESS&entityId=null
    FC-->>FE: List<FieldGroupDto>
    U->>FE: create / edit
    FE->>FC: GET /page/PROCESS_EDITOR_PAGE/editor?entityType=PROCESS
    FC-->>FE: editor groups and fields
    FE-->>U: rendered grid / details / form
```

Every step returns 200. If a column is missing, nothing errors anywhere — the UI simply renders fewer columns and a UI spec fails on an assertion. `POBackendUIFieldsBatch` now diffs these responses against per-environment baselines so the drift is caught at the API layer. Page ids are global Liquibase seeds — see [data-model.md](data-model.md#page-ids-used-by-lui-and-the-specs).

## 5. Failure propagation — why this repo matters
```mermaid
graph TD
    CHANGE["Config change here<br/>field removed / component swapped"]
    API["All APIs still return 200"]
    RENDER["UI renders without the field"]
    SPEC["UI spec fails:<br/>locator not found"]
    BLAME["Investigated as a frontend defect"]
    REAL["Actual cause: configuration"]

    CHANGE --> API --> RENDER --> SPEC --> BLAME
    BLAME -.wasted triage.-> REAL

    style CHANGE fill:#fff0f0,stroke:#cc6666
    style REAL fill:#eef8ee,stroke:#559955
```

Short-circuit this with the triage order in [troubleshooting.md](troubleshooting.md#triage-order-for-a-missing-field-failure).

## 6. Duplicated table family
```mermaid
graph LR
    subgraph UFDB["ui-fields DB"]
        A1["attributes · attribute_values"]
        A2["ui_fields · ui_fields_groups"]
        A3["ui_fields_rules · ui_fields_rules_defs"]
        A4["pages · ui_components"]
    end

    subgraph AIDB["actionitem DB"]
        B1["attributes · attribute_values"]
        B2["ui_fields · ui_fields_groups"]
        B3["ui_fields_rules · ui_fields_rules_defs"]
        B4["pages · ui_components"]
    end

    A1 -.same shape, different DB.- B1
    A2 -.-B2
    A3 -.-B3
    A4 -.-B4
```

Two services own structurally identical tables. A migration applied to only one produces a field that renders in action items but not elsewhere — see [Action Item data model](../plan-sop-actionitem/data-model.md#configuration--ui-field-entities).

## 7. Security model
```mermaid
graph LR
    REQ["Request"] --> JWT["JWT validation<br/>via po-be-commons"]
    JWT --> RBAC{"LIAM_RBAC_ENABLED<br/>@ibp.hasAction"}
    RBAC --> ABAC{"LIAM_ABAC_ENABLED"}
    ABAC --> CTRL["Controller"]
    CACHE["liamRbacCacheTimeout = 0<br/>no caching"] -.-> RBAC
```

Because the RBAC cache TTL defaults to `0`, permission changes here take effect **immediately** — unlike Process Orchestration, which needs `GET /cache/clear`.

## 8. Automation touchpoints
```mermaid
graph LR
    subgraph Direct["Direct coverage — POBackendUIFieldsBatch"]
        D1["UIFields/Test_001_PageConfigContracts — 32 tests"]
        D2["UIFields/Test_002_PageEditorConfig — 7 tests"]
    end

    subgraph Indirect["UI specs that render this config (lui only)"]
        I1["ProcessOrchestration/ProcessBatch — listing, details, editors"]
        I2["ProcessOrchestration/Calendar — calendar/cycle details and editors"]
    end

    subgraph EP["lui-used endpoints — covered"]
        E1["/list-page-config<br/>/list-page-config-with-filter"]
        E3["/detail-page-config"]
        E4["/page/{name}/editor"]
    end

    subgraph GAP["Untested"]
        G1["/entity/{type}/attribute/**"]
        G2["/ui-field/**, /ui-component"]
        G3["/filter-config, /page/**"]
    end

    D1 --> E1
    D1 --> E3
    D2 --> E4
    I1 --> E1
    I1 --> E3
    I1 --> E4
    I2 --> E3
    I2 --> E4

    style Direct fill:#eef8ee,stroke:#559955
    style GAP fill:#fff0f0,stroke:#cc6666
```

Related: [automation-coverage.md](automation-coverage.md#coverage-gaps) · [troubleshooting.md](troubleshooting.md)
