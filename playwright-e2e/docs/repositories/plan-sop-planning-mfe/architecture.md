# Architecture — plan-sop-planning-mfe

## 1. Context
```mermaid
graph TB
    U["User"]
    PORTAL["Luminate Portal<br/>LUMINATE_PORTAL_URL + PSLINK"]
    PS["<b>plan-sop-planning-mfe</b><br/>507 tsx/jsx · 1,083 unique test IDs<br/>React · Vite · Node 22.13.1"]

    subgraph Libs["@by component libraries"]
        L1["lui-dashboard-library 10.10.4"]
        L2["lui-dashboard-scaffolding-* "]
        L3["lui-*-cardtypes-mui5"]
        L4["jdp-sna-kg-ui-library"]
        L5["experience-system 1.1.1"]
    end

    GW{{"API Gateway"}}

    subgraph Services
        PO["process-orchestration-service"]
        LM["link-management"]
        UICFG["lui uiConfiguration / verticalFilterBff<br/>dashboard v2/v3"]
        AI["actionitem"]
        MAAS["MaaS / simulation /<br/>interactive-planning"]
    end

    AUTO["plan-sop-ui-automation<br/>126 specs"]

    U --> PORTAL --> PS
    PS --> Libs
    PS --> GW
    GW --> PO
    GW --> LM
    GW --> UICFG
    GW --> AI
    GW --> MAAS
    AUTO -->|drives| PS
```

## 2. Internal structure
```mermaid
graph TD
    subgraph SHELL["Shell"]
        PW["pages/PageWrapper"]
        MW["pages/ModalWrapper"]
        FW["pages/FlyoutWrapper"]
        ALW["components/AppLayoutWrapper"]
    end

    subgraph PAGES["src/pages — 14"]
        PDR["PortalDashboardRenderer"]
        IP["InteractivePlanning"]
        IPS["InteractivePlanningScope"]
        AP["ActionPlanner"]
        GW2["GuidedWorkflow"]
        ASM["Assumptions"]
        CS["ContextSetting"]
        SCA1["SCADetails / SCAListTable"]
        SCN["ScenarioDetails / ScenarioTable"]
    end

    subgraph COMP["src/components — 23"]
        DDL["DynamicDashboardLoader"]
        PT["PivotTable"]
        LB["LiveBlocks"]
        QF["QuickFilter"]
        SS["ScenarioSelector"]
        SN["SideNav / SCASideNav"]
        TB["Toolbar"]
        MODALS["ActionItem / Assumption /<br/>Confirmation / DirtyState modals"]
        BANNER["ConfigCacheStaleBanner"]
        SKEL["TextFieldsSkeleton"]
    end

    subgraph STATE["State and data"]
        API["src/apis<br/>apis.ts · apiInfo.ts · useApi.tsx"]
        RED["src/reducers"]
        HOOK["src/hooks"]
        CACHE["src/cache<br/>IndexedDB"]
        CFG["src/config<br/>runtime config from public/"]
    end

    GW{{Gateway}}

    SHELL --> PAGES
    PAGES --> COMP
    COMP --> HOOK
    HOOK --> API
    API --> GW
    API --> RED
    API --> CACHE
    CFG --> API
    CACHE -.stale.-> BANNER
    DDL --> PT
```

## 3. Runtime configuration — generated, not compiled
```mermaid
graph LR
    ENV[".github/envs/&lt;env&gt;.env<br/>16 files"]
    SCRIPT["setRuntimeEnv.js<br/>npm run setLocalEnv:&lt;env&gt;"]
    PUB["public/<br/>generated config"]
    APP["App reads at startup"]
    BACKEND["Backend endpoints"]

    ENV --> SCRIPT --> PUB --> APP --> BACKEND

    STALE["Switching env without<br/>re-running setLocalEnv"] -.->|leaves old config| PUB

    style STALE fill:#fff0f0,stroke:#cc6666
```

This is the usual cause of "the app is pointing at the wrong environment" despite a correct build command.

## 4. Page load sequence
```mermaid
sequenceDiagram
    participant U as Browser
    participant PS as Planning Space
    participant C as IndexedDB cache
    participant PO as PO service
    participant LM as Link Management
    participant UC as lui uiConfiguration
    participant AI as Action Item

    U->>PS: /process/{name}/plan
    PS->>C: read cached config
    alt cache hit
        C-->>PS: config (may be STALE)
        PS->>PS: show ConfigCacheStaleBanner if outdated
    else cache miss
        PS->>UC: GET uiConfiguration/v1 configurations
        UC-->>PS: dashboard/card configuration
        PS->>C: store
    end
    PS->>PO: GET /process/{name}/context
    PS->>LM: POST /view-entity-map/search
    LM-->>PS: views for entity
    PS->>PO: GET /process/{name}/scope
    PS->>AI: POST /searchActionItems
    PS-->>U: skeletons → rendered dashboard
```

## 5. Loading state machine
The deterministic-wait contract for specs.

```mermaid
stateDiagram-v2
    [*] --> Skeleton: navigate
    Skeleton: skeleton-text / text-skeleton present
    Skeleton --> Rendered: data arrives
    Skeleton --> Empty: no data for scope/scenario
    Rendered: lui-card / common-datatable / dashboard-renderer
    Empty: lui-empty-state + heading + subheading
    Rendered --> Skeleton: scope or scenario change
    Empty --> Skeleton: filter change
    Rendered --> [*]
    Empty --> [*]
```

Wait for `skeleton-text` to **detach** — never a fixed delay. Both `Rendered` and `Empty` are valid terminal states; asserting only on `Rendered` produces misleading timeouts when the real result is empty.

## 6. Test-ID ownership
```mermaid
graph TD
    DOM["Rendered DOM<br/>2,063 test-id occurrences"]

    OWN["App-owned IDs<br/>form-modal · side-drawer · save-btn<br/>quick-filter · dimension-scope · power-bar"]
    LIB["Library-owned lui-* IDs<br/>lui-card · lui-modal · lui-popover<br/>lui-ccl-table-row · lui-empty-state"]
    FAKE["NOT real DOM attributes<br/>dataTestId · getTestId · testId · props"]

    OWN --> DOM
    LIB --> DOM
    FAKE -.variable names only.-x DOM

    CHANGE1["App change"] --> OWN
    CHANGE2["@by/lui-* version bump"] --> LIB
    CHANGE3["ui_components config change"] --> LIB

    style FAKE fill:#fff0f0,stroke:#cc6666
```

If a locator break is confined to `lui-*` IDs, the cause is a dependency bump — not this repo. (Planning Space does not call UI Fields, so a UI Fields component swap cannot explain a Planning Space locator break.)

## 7. Automation touchpoints
```mermaid
graph LR
    subgraph POM["Page objects"]
        P1["planning.page.ts"]
        P2["cards.page.ts"]
        P3["scenario.page.ts"]
        P4["scope.page.ts"]
        P5["drillthrough.page.ts"]
        P6["odm.page.ts"]
        P7["sca.page.ts"]
        P8["powerbar.page.ts"]
    end

    subgraph AREA["Feature areas"]
        A1["CardsBatch — 20"]
        A2["ScenarioBatch — 15"]
        A3["ScopeBatch — 16"]
        A4["ViewsBatch — 17"]
        A5["DrillThroughBatch — 10"]
        A6["OnDemandMaas — 9"]
        A7["SupplyChainActions — 6"]
        A8["PowerBar — 7"]
    end

    P2 --> A1
    P3 --> A2
    P4 --> A3
    P1 --> A4
    P5 --> A5
    P6 --> A6
    P7 --> A7
    P8 --> A8
```

Related: [ui-inventory.md](ui-inventory.md) · [test-hooks.md](test-hooks.md) · [data-model.md](data-model.md)
