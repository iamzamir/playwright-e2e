# Architecture — plan-sop-actionitem

## 1. Context
```mermaid
graph TB
    subgraph Clients
        PO["plan-sop-process-orchestration-service<br/>via ActionItemProxyController"]
        LUI["plan-sop-lui<br/>action item UI"]
        PS["plan-sop-planning-mfe<br/>My Task card"]
        AUTO["plan-sop-ui-automation<br/>3 backend + 4 UI specs"]
    end

    GW{{"API Gateway"}}

    AI["<b>plan-sop-actionitem</b><br/>14 controllers · 32 entities<br/>Java 21 · Spring Boot 3.5.16"]

    subgraph Downstream
        COLLAB["Collaboration service<br/>POST /channel"]
        LIAM["LIAM<br/>RBAC"]
    end

    DB[("Azure SQL<br/>actionitem")]
    LOCK[("ShedLock<br/>scheduler locks")]

    PO --> GW
    LUI --> GW
    PS --> GW
    AUTO --> GW
    GW --> AI
    AI --> COLLAB
    AI --> LIAM
    AI --> DB
    AI --> LOCK
```

Automation can reach action items by **two different paths** — directly (`ACTIONITEM2`) or through the PO proxy (`ACTIONITEM`). They enforce different permission scopes.

## 2. Internal layering
Packages under `com.blueyonder.actionitem`, with file counts.

```mermaid
graph TD
    subgraph WEB["HTTP boundary"]
        C["controllers — 11"]
        CC["controllers.configuration — 3"]
        RQ["requests — 29"]
        RS["responses — 29"]
        DTO["dto — 20"]
        IE["dto.importexport — 6"]
        F["filters — 1"]
    end

    subgraph SVC["service"]
        S["service — 22"]
        SC["service.configuration — 3"]
        SCM["service.common — 1"]
    end

    subgraph DATA["persistence"]
        DAO["dao — 4"]
        SPEC["dao.jpaspecs — 1<br/>dynamic criteria"]
        REPO["repositories — 28"]
        ENT["entities — 30"]
        BASE["entities.base — 2<br/>Auditable"]
    end

    subgraph X["cross-cutting"]
        CFG["config — 7"]
        LOG["logging — 6"]
        MAP["mappers — 10 + config"]
        UTL["utils — 11"]
        CON["constants — 1"]
    end

    DB[("Azure SQL")]

    F --> C
    C --> RQ
    C --> RS
    CC --> SC
    C --> S
    S --> SCM
    S --> DAO
    S --> REPO
    DAO --> SPEC
    SPEC --> REPO
    REPO --> ENT
    ENT --> BASE
    REPO --> DB
    MAP -.entity ↔ dto.-> DTO
    S --> IE
```

`dao.jpaspecs` is the JPA Specification layer behind `POST /searchActionItems` — which is why search is a POST, not a GET.

## 3. Domain model — two distinct clusters
```mermaid
graph TD
    subgraph AICluster["Action items"]
        SE["SourceEntity<br/>process / subprocess / assumption"]
        ITEM["ActionItem<br/>action_items"]
        AM["ActionItemAttrMapping"]
        CM["Comments"]
        TPL["ActionItemTemplate"]
        SE --> ITEM
        ITEM --> AM
        ITEM --> CM
        TPL -.instantiates.-> ITEM
    end

    subgraph PB["Playbooks — 18 endpoints, 0 specs"]
        P["Playbook<br/>definition"]
        PAI["PlaybookActionItem<br/>template items"]
        PI["PlaybookInstance<br/>created by /initiate"]
        PII["PlaybookInstanceItem<br/>per-instance status"]
        PA["PlaybookArchive"]
        P --> PAI
        P -->|initiate| PI
        PI --> PII
        PAI -.copied into.-> PII
        P --> PA
    end

    subgraph CFGC["UI config — duplicated in ui-fields-service"]
        ATTR["Attributes"]
        AV["attribute_values"]
        FLD["ui_fields"]
        FG["ui_fields_groups"]
        FR["ui_fields_rules"]
        PG["pages"]
        UC["ui_components"]
        ATTR --> AV
        ATTR --> FLD
        FG --> FLD
        FLD --> FR
        PG --> FG
        UC --> FLD
    end

    subgraph KPIC["KPIs and notifications"]
        KPI["Kpi"]
        KCA["KpiConfigAttributes"]
        KEM["KpiEntityMap"]
        NE["NotificationEvents"]
        NU["NotifyUser"]
        UN["UserNotification"]
        KPI --> KCA
        KPI --> KEM
        NE --> NU
        NU --> UN
    end
```

Editing a `Playbook` does **not** change existing `PlaybookInstance` rows. That separation is the single most important behaviour in this service, and it has no test coverage.

## 4. Playbook lifecycle
```mermaid
stateDiagram-v2
    [*] --> Defined: POST /playbook
    Defined --> Populated: POST /playbook/{name}/action-items
    Populated --> Instantiated: POST /playbook/{name}/initiate
    Populated --> Instantiated: POST /playbook/recurring/initiate<br/>(ShedLock-guarded)
    Instantiated --> InProgress: PUT /playbook/instances/{id}/action-items/{item}
    InProgress --> InProgress: bulk status update
    InProgress --> Complete: all items closed
    Complete --> Archived: PlaybookArchive
    Populated --> Deleted: DELETE /playbook/{name}
    Archived --> [*]
    Deleted --> [*]
```

`recurring/initiate` runs cluster-wide under ShedLock. A spec asserting "exactly one instance" can be broken by a concurrent scheduled run.

## 5. Direct call vs. PO proxy
```mermaid
sequenceDiagram
    participant T as Test
    participant PO as PO ActionItemProxyController
    participant AI as ActionItemController
    participant DB as actionitem DB

    rect rgb(238, 246, 255)
    note over T,DB: Path A — process context (ACTIONITEM env var)
    T->>PO: POST /process/{name}/actionitem
    PO->>PO: enforce process-level RBAC
    PO->>AI: POST /actionitems (entityId resolved)
    AI->>DB: insert
    AI-->>PO: ActionItemDto
    PO-->>T: ActionItemDto
    end

    rect rgb(245, 245, 245)
    note over T,DB: Path B — direct (ACTIONITEM2 env var)
    T->>AI: POST /actionitems
    AI->>DB: insert
    AI-->>T: ActionItemDto
    end
```

Path B skips process-level permission checks. Use Path A when the behaviour under test is authorization.

## 6. Automation touchpoints
```mermaid
graph LR
    subgraph Specs
        BE["ProcessOrchestrationBackend/ActionItem<br/>8 specs"]
        UI["ProcessOrchestration/ActionItemsBatch<br/>4 specs"]
        CARD["PlanningSpace/CardsBatch/Test_013_MyTask"]
    end

    subgraph Covered["Covered by backend specs"]
        E1["/actionitems CRUD"]
        E5["PO-proxy search"]
        E6["/actionitems/editor, /filters"]
        E7["/actionitemTemplates"]
        E8["/kpis CRUD, /kpi/entities/{id}"]
    end

    subgraph UIOnly["Exercised only through the UI"]
        E2["/actionitems/bulk"]
        E3["/actionitems/status"]
        E4["/searchActionItems"]
    end

    subgraph Gap["Untested"]
        G1["/playbook/** — 18 endpoints"]
        G3["/comments/**"]
        G4["/kpi-config-attributes/**, /kpi/map/**"]
        G5["/attribute-config/**, /ui-field-config/**"]
    end

    BE --> E1
    BE --> E5
    BE --> E6
    BE --> E7
    BE --> E8
    UI --> E2
    UI --> E3
    CARD --> E4

    style Covered fill:#eef8ee,stroke:#559955
    style UIOnly fill:#fff8e9,stroke:#b25e09

    style Gap fill:#fff0f0,stroke:#cc6666
```

Related: [api-contract.md](api-contract.md) · [test-hooks.md](test-hooks.md) · [automation-coverage.md](automation-coverage.md)
