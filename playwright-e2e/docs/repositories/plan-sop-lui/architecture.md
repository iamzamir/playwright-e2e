# Architecture — plan-sop-lui

## 1. Context
```mermaid
graph TB
    U["User"]
    PORTAL["Luminate Portal<br/>LUMINATE_PORTAL_URL + POLINK"]
    LUI["<b>plan-sop-lui</b><br/>322 tsx/jsx · 910 unique test IDs<br/>React · Vite · Vitest"]

    subgraph Libs["@by component libraries"]
        L1["lui-dashboard-library 10.10.4"]
        L2["lui-dashboard-scaffolding-core 2.25.1"]
        L3["lui-vertical-filter-component 3.25.5"]
        L4["lui-quick-filter-library 3.1.1-rc.1"]
        L7["plan-sop-ui-library 2026.4.3<br/>CCL 3.12.2"]
        L5["lui-settings-ui-library 1.2.5"]
        L6["experience-system 1.1.1"]
    end

    GW{{"API Gateway"}}

    subgraph Services
        PO["process-orchestration-service"]
        LM["link-management"]
        UF["ui-fields-service<br/>listing, details, editors"]
        AI["actionitem"]
        ASV["assumptions service"]
    end

    AUTO["plan-sop-ui-automation<br/>29 specs"]
    WDIO["e2e/ WebdriverIO<br/>legacy — do not extend"]

    U --> PORTAL --> LUI
    LUI --> Libs
    LUI --> GW
    GW --> PO
    GW --> LM
    GW --> UF
    GW --> AI
    GW --> ASV
    AUTO -->|drives| LUI
    WDIO -.superseded.-> LUI

    style WDIO fill:#f5f5f5,stroke:#999999
```

Most shared libraries are at the **same versions as Planning Space** (`lui-dashboard-library` 10.10.4, `lui-quick-filter-library` 3.1.1-rc.1, `lui-settings-ui-library` 1.2.5, `experience-system` 1.1.1, CCL `lui-common-component-library-mui5` 3.12.2), so most `lui-*` test IDs match across both apps. They are **not** all identical: scaffolding-core/-components, `lui-vertical-filter-component` (3.25.5 vs 3.25.7) and `plan-sop-ui-library` (2026.4.3 vs 2026.4.4) differ, so a `vf-*` or scaffolding locator can break in one app only.

lui is the only frontend that calls **UI Fields** (via `src/config.ts` keys) — for the PO listing, process/subprocess/calendar details and all create/edit forms.

## 2. Internal structure
```mermaid
graph TD
    subgraph NAV["Navigation shell"]
        SUB["Components/SubNav"]
        HDR["app-header-block"]
    end

    subgraph FEAT["src/Components — 13"]
        POC["ProcessOrchestration<br/>process + subprocess mgmt"]
        CAL["CalendarManager<br/>+ calendarmodal + cyclemodal"]
        VM["ViewManager"]
        DA["DataAndAttributes<br/>assumption types only"]
        SET["Settings"]
        SSEL["ScenarioSelector"]
        LBP["LeverBasedPlanning<br/>UNTESTED"]
        IFR["IframeComponent"]
        CMN["Common / CustomComponents"]
    end

    subgraph STATE["State and data"]
        ACT["src/actions"]
        RED["src/reducers"]
        HOOK["src/hooks"]
        API["src/apis<br/>apis.ts · apiInfo.ts · useApi.ts"]
        CACHE["src/apis/cache.ts<br/>API response cache"]
        CFG["src/config"]
    end

    GW{{Gateway}}

    NAV --> FEAT
    FEAT --> HOOK
    HOOK --> ACT
    ACT --> RED
    HOOK --> API
    API --> CACHE
    CACHE --> GW
    CFG --> API

    style LBP fill:#fff0f0,stroke:#cc6666
```

Unlike Planning Space (which caches configuration in IndexedDB), this app has an explicit **API response cache** module with its own unit tests.

## 3. Route map
```mermaid
graph LR
    ROOT["/"] --> PROC["/process/:processName"]
    PROC --> SUM["/summary/link/:linkId"]
    PROC --> SUB["/subprocess/:subprocessName/link/:linkId"]
    SUB --> SUBSUM["/summary/link/:linkId"]
    PROC --> ASM["/assumptionView/:assumptionsId/link/:linkId"]
    PROC --> PAGE["/:pageName/link/:linkId"]
    PROC --> SETT["/settings/:settingsId/link/:linkId"]

    SETT --> S1["/assumption-types"]
    SETT --> S2["/data-attributes"]
    SETT --> S3["/schedule-structure"]
    SETT --> S4["/node-transitions"]

    ROOT --> PRODUCTS["/products/:processName<br/>/products/:subprocessName<br/>/products/:assumptionsId"]
    ROOT --> NF["* → NotFoundPage"]

    style S1 fill:#fff0f0,stroke:#cc6666
    style S2 fill:#fff0f0,stroke:#cc6666
    style S3 fill:#fff0f0,stroke:#cc6666
    style S4 fill:#fff0f0,stroke:#cc6666
```

The four red settings screens are untested — and they configure state that other suites depend on.

## 4. Settings screens → backing services
```mermaid
graph LR
    S1["/assumption-types"] --> ASV["assumptions service<br/>assumptions/v1/assumption_type"]
    S2["/data-attributes<br/>(Data & Attributes → AssumptionType)"] --> ASV
    S3["/schedule-structure"] --> PO
    S4["/node-transitions"] --> POT["PO TransitionController"]
    VM["View Manager"] --> LM["link-management"]

    VM -.configures state used by.-> PSS["Planning Space suites"]

    style ASV fill:#fff0f0,stroke:#cc6666
```

Correction (2026-10-05): the Data & Attributes screen (`DATA_AND_ATTRIBUTES_ASSUMPTION` → `AssumptionType`) manages **assumption types** through the assumptions service, not UI Fields. UI Fields is called from the process listing, details and editor flows instead. The settings ids above (`assumption-types`, `data-attributes`, `schedule-structure`, `node-transitions`) appear only in lui unit-test fixtures; confirm the rendered ids in the DOM before locating by them.

## 5. The dominant interaction pattern
`lui-ccl-threedot-menu-icon-button` appears **63 times** — more than any other test ID in the app.

```mermaid
sequenceDiagram
    participant T as Test
    participant R as lui-ccl-table-row
    participant B as lui-ccl-threedot-menu-icon-button
    participant L as lui-ccl-threedot-menu-list
    participant I as menu item

    T->>R: locate target row
    T->>B: click overflow menu (scoped to row)
    B->>L: open
    T->>L: wait for visible
    rect rgb(255, 240, 240)
    note over T,I: AVOID — index based
    T->>I: getByTestId('action-menu-item-2')
    end
    rect rgb(238, 248, 238)
    note over T,I: PREFER — accessible name
    T->>I: getByRole('menuitem', { name })
    end
    I-->>T: action performed
```

Index-based locators break silently on menu reorder — the failure reads as "clicked the wrong action", not "locator not found".

## 6. Test-ID naming drift
```mermaid
graph TD
    C1["Refresh"] --> V1["refresh-icon-button"]
    C1 --> V2["refreshIconBtn"]
    C1 --> V3["refresh-button"]
    C2["Cancel"] --> V4["cancel-btn"]
    C2 --> V5["cancel-button"]
    C3["Overflow menu"] --> V6["lui-ccl-threedot-menu-icon-button"]
    C3 --> V7["threeDotButton"]
    C4["Dropdown"] --> V8["drpdown — misspelled"]
    C4 --> V9["simple-select"]
    C5["Search"] --> V10["lui-searchbar"]
    C5 --> V11["lui-search"]

    style V8 fill:#fff0f0,stroke:#cc6666
```

Verify against the live DOM before adding a locator; do not assume the conventional spelling exists.

## 7. Cache behaviour
```mermaid
sequenceDiagram
    participant T as Test
    participant API as Backend API
    participant C as src/apis/cache.ts
    participant UI as Rendered UI

    T->>API: mutate data directly
    API-->>T: 200
    T->>UI: assert new value
    UI->>C: read
    C-->>UI: STALE cached response
    UI-->>T: old value — assertion fails
    note over T,UI: Fix: reload the page,<br/>or use a fresh browser context
```

## 8. Automation touchpoints
```mermaid
graph LR
    subgraph POM["Page objects"]
        P1["process.page.ts"]
        P2["process-settings.page.ts"]
        P3["action-items.page.ts"]
        P4["powerbar.page.ts"]
        P5["scope.page.ts"]
        P6["global-settings.page.ts"]
    end

    subgraph COV["Covered — 25 specs"]
        A1["ProcessBatch — 9"]
        A2["ActionItemsBatch — 4"]
        A3["PowerBar — 5"]
        A4["ViewSearch — 3"]
        A5["ScopeBatch — 3"]
        A6["Calendar — 2"]
        A7["ViewManagerBatch — 1"]
    end

    subgraph GAP["Untested"]
        G1["LeverBasedPlanning"]
        G2["4 settings screens"]
        G3["Pagination"]
        G4["Accessibility"]
        G5["IframeComponent"]
    end

    P1 --> A1
    P3 --> A2
    P4 --> A3
    P1 --> A4
    P5 --> A5
    P1 --> A6
    P6 --> A7
    P2 -.-> G2

    style GAP fill:#fff0f0,stroke:#cc6666
```

Related: [ui-inventory.md](ui-inventory.md) · [test-hooks.md](test-hooks.md) · [automation-coverage.md](automation-coverage.md)
