# Architecture — plan-sop-ui-automation

## 1. Context
```mermaid
graph TB
    DEV["Engineer"]
    CI["GitHub Actions"]
    SAUCE["Sauce Labs"]

    REPO["<b>plan-sop-ui-automation</b><br/>226 specs · 22 POMs · 22 utils · 21 suites"]

    subgraph Targets["Systems under test"]
        PS["planning-mfe"]
        LUI["lui"]
        PO["process-orchestration-service"]
        AI["actionitem"]
        LM["link-management"]
        UF["ui-fields-service — 2 specs, 4 of 28 routes"]
    end

    subgraph Out["Outputs"]
        ALLURE["Allure → GitHub Pages"]
        MONO["Monocart"]
        HTML["Playwright HTML"]
        TEAMS["Teams notifications"]
    end

    DEV --> REPO
    CI --> REPO
    REPO --> SAUCE
    SAUCE --> Targets
    REPO -->|UI specs| PS
    REPO -->|UI specs| LUI
    REPO -->|API specs| PO
    REPO -->|API specs| AI
    REPO -->|API specs| LM
    REPO -->|API specs| UF
    REPO --> Out

    style UF fill:#fff8e9,stroke:#b25e09
```

UI Fields gained its first direct specs in 2026-10 (`POBackendUIFieldsBatch`); it is amber, not red, because only the page-config routes lui uses are covered.

## 2. Framework layering
```mermaid
graph TD
    subgraph SPEC["tests/** — assertions only"]
        T1["PlanningSpace 126"]
        T2["ProcessOrchestration 29"]
        T3["ProcessOrchestrationBackend 45"]
        T4["DataSetupBatch 19"]
        T5["Performance 4 · VisualAutomation 3"]
    end

    FIX["configs/fixtures.ts<br/>20 POM fixtures + visual + testUtil"]

    subgraph POM["pageobjects/** — locators only"]
        BASE["page.ts — base class"]
        P["22 page objects"]
    end

    subgraph UTIL["util/** — 22 utilities"]
        API["api.util.ts<br/>axios + token cache + raw requests"]
        WAIT["wait-helpers.ts"]
        DB["db.util.ts"]
        DOMAIN["alm-migration · calendar-cycle<br/>process-start · mapping"]
        APIH["action-item · process-fixture<br/>ui-fields — API spec helpers"]
        PERF["performance.* — 4 files"]
        VIS["visual-helper · visual-diff"]
        LOG["logger.ts"]
    end

    CONST["constants/timeouts.ts<br/>11 tiers + PW_TIMEOUT_MULTIPLIER"]
    SETUP["configs/setup.js<br/>env resolution"]
    DATA["testdata/&lt;ENV&gt;/&lt;area&gt;/*.json"]

    SUT["Systems under test"]

    SPEC --> FIX
    SPEC --> DATA
    FIX --> POM
    P --> BASE
    POM --> CONST
    POM --> SUT
    SPEC --> UTIL
    API --> SUT
    UTIL --> CONST
    SETUP --> API
    SETUP --> POM

    style SPEC fill:#eef8ee,stroke:#559955
```

The rule this diagram encodes: **specs assert, page objects locate, utils call.** A selector in a spec, or an assertion in a page object, breaks the layering.

## 3. Environment resolution
```mermaid
graph TD
    E1["ENVIRONMENT<br/>QA / INTEROP / PSR"]
    E2["URL_MODE<br/>OLD / NEW"]
    E3["GATEWAY_TYPE<br/>AZURE / GRAVITEE"]

    SETUP["configs/setup.js"]

    OUT1["API_BASE_URL · AUTH_URL · SCOPE"]
    OUT2["Service prefixes<br/>CALENDAR · ACTIONITEM · VIEW_ENTITY_MAP …"]
    OUT3["LUMINATE_PORTAL_URL + PSLINK/POLINK/SNALINK"]
    OUT4["REALM_NAME · REALM_KEY · REALM_ID · SUBJECT_ID"]
    OUT5["Migration source/target realms"]
    LOGLINE["[setup] ENVIRONMENT=… URL_MODE=… GATEWAY_TYPE=… REALM_KEY=…"]

    E1 --> SETUP
    E2 --> SETUP
    E3 --> SETUP
    SETUP --> OUT1
    SETUP --> OUT2
    SETUP --> OUT3
    SETUP --> OUT4
    SETUP --> OUT5
    SETUP --> LOGLINE

    SECRETS["process.env<br/>TEST_AUTOMATION_USER_1/2<br/>CLIENT_SECRET · SAUCE_*"] --> SETUP

    style LOGLINE fill:#eef6ff,stroke:#4477aa
```

`[setup]` is the first line to read in any triage — most misrouting is visible there.

## 4. Test execution lifecycle
```mermaid
sequenceDiagram
    participant N as npm script
    participant S as setup.js
    participant G as global-setup.ts
    participant W as Worker
    participant F as fixtures.ts
    participant T as Spec
    participant H as failure-hook.ts
    participant R as Reporters

    N->>S: cross-env ENVIRONMENT + TZ
    S->>S: resolve URLs, realms, endpoints
    S->>S: print [setup] line
    N->>G: global setup (PW_ENABLE_GLOBAL_SETUP)
    G->>G: auth, token cache warm
    loop per spec file
        W->>F: build fixtures
        F->>F: page (PW_PAGE_CACHE_SCOPE)
        F->>T: inject POMs + utils
        T->>T: run assertions
        alt failure
            T->>H: failure-hook
            H->>R: trace, video, network artifacts
        end
    end
    W->>R: allure-trace-filter, visual-attachment-filter
    R->>R: strip-allure-traces.js before Pages publish
```

## 5. Suite selection
```mermaid
graph LR
    SUITENAME["SUITENAME env var"] --> JSON["tests/TestSuites/&lt;name&gt;.json"]
    JSON --> GLOBS["testFiles: [ **/playwright-e2e/tests/… ]"]
    GLOBS --> RUN["Playwright run"]

    SPECIFIC["USE_SPECIFIC_TESTS=false<br/>+ explicit path"] --> RUN
    IGNORE["TEST_IGNORE<br/>3 quarantined specs"] -.excludes.-> RUN

    UNREG["Spec not in any suite JSON"] -.never runs in CI.-x RUN

    style UNREG fill:#fff0f0,stroke:#cc6666
```

## 6. Timeout model
```mermaid
graph TD
    TIERS["constants/timeouts.ts"]
    T1["TINY 2s · SHORT 5s · MEDIUM 10s"]
    T2["LONG 15s · XLARGE 30s"]
    T3["EXTREME / ACTION 60s"]
    T4["TEST 15min · EXTENDED 30min"]
    T5["POLL_INTERVAL 500ms<br/>TYPE_CHAR_DELAY 50ms<br/>POST_INPUT_SETTLE 200ms"]

    MULT["PW_TIMEOUT_MULTIPLIER<br/>scales every tier"]
    GET["getTimeout(tier)"]
    USE["Page objects + utils"]

    TIERS --> T1 & T2 & T3 & T4 & T5
    MULT --> GET
    TIERS --> GET
    GET --> USE

    HARD["Hardcoded waitForTimeout"] -.prohibited.-x USE

    style HARD fill:#fff0f0,stroke:#cc6666
```

Slow environment? Raise `PW_TIMEOUT_MULTIPLIER` — never edit individual tiers.

## 7. Spec-to-service routing
```mermaid
graph LR
    subgraph UI["UI specs"]
        PSS["PlanningSpace"]
        POS["ProcessOrchestration"]
    end
    subgraph APIS["API specs"]
        PB["ProcessBatch 9"]
        CB["Calendar 3"]
        AB["ActionItem 8"]
        LB["LinkManagement 14"]
        MB["Migration 9"]
        UB["UIFields 2"]
    end
    subgraph DS["DataSetupBatch — destructive"]
        D1["ProcessOrchestration 7"]
        D2["UIDataReset 5"]
        D3["Scenarios 4"]
        D4["ODM 3"]
    end

    PSS --> MFE["planning-mfe"]
    POS --> LUI["lui"]
    PB --> PO["po-service"]
    CB --> PO
    AB --> AI["actionitem"]
    AB -.Test_004/005 via PO proxy.-> PO
    LB --> LM["link-management"]
    UB --> UF["ui-fields-service"]
    MB --> PO
    MB --> LM
    D1 --> PO
    D2 --> LM
    D3 --> MAAS["MaaS / simulation"]
    D4 --> MAAS
```

## 8. Isolation model
```mermaid
graph TD
    REALM["Shared realm<br/>one per environment"]

    F["Functional suites"] --> REALM
    D["DataSetupBatch<br/>deletes processes, calendars,<br/>views, scenarios, SCAs, roles"] --> REALM

    D -.corrupts in-flight runs.-> F

    RULE["Rule: never interleave<br/>data setup with functional suites"]
    W["--workers=1 on most scripts"]
    UNIQ["Run-scoped unique names"]

    REALM --> RULE
    RULE --> W
    RULE --> UNIQ

    style D fill:#fff0f0,stroke:#cc6666
```

Related: [framework-reference.md](framework-reference.md) · [test-hooks.md](test-hooks.md) · [environments.md](environments.md) · [platform map](../repo-map.md)
