# Architecture — plan-sop-link-management

## 1. Context
```mermaid
graph TB
    subgraph Clients
        PS["plan-sop-planning-mfe<br/>which views to render"]
        LUI["plan-sop-lui<br/>view manager, settings"]
        PO["plan-sop-process-orchestration-service<br/>scope and view context"]
        AUTO["plan-sop-ui-automation<br/>17 backend specs + most PS suites"]
    end

    GW{{"API Gateway"}}

    LM["<b>plan-sop-link-management</b><br/>10 controllers · 15 entities<br/>Java 21 · Spring Boot 3.5.16"]

    subgraph Downstream
        LIAM["LIAM — RBAC"]
        PROC["Procedure service"]
    end

    DB[("Azure SQL<br/>linkMgr")]
    KAFKA{{"Kafka<br/>EFS audit log"}}
    LOCK[("ShedLock<br/>JDBC provider")]

    PS --> GW
    LUI --> GW
    PO --> GW
    AUTO --> GW
    GW --> LM
    LM --> LIAM
    LM --> PROC
    LM --> DB
    LM --> KAFKA
    LM --> LOCK
```

## 2. Two architectures in one repo
The repo contains a **legacy v1 layering** and a **v2 vertical-slice refactor**. Every heavily tested endpoint lives in v2.

```mermaid
graph TB
    subgraph V1["com.blueyonder.linkmanagement — legacy layered"]
        V1C["controllers — 5<br/>FilterPreset · Links · SourceEntity<br/>Tenant · User"]
        V1S["service — 7"]
        V1R["repositories — 6"]
        V1E["entities — 9"]
        V1M["mappers — 4 · dto 10<br/>requests 12 · responses 9"]
        V1C --> V1S --> V1R --> V1E
    end

    subgraph V2["v2.refactor — vertical slices"]
        VTE["viewtoentity — 8<br/><b>ViewEntityMapController</b>"]
        PTV["proceduretoview — 3<br/><b>EntityViewProcedureMapController</b><br/>+ ProcedureToViewScheduler"]
        SCP["scope — 6<br/><b>ScopeController</b> + entity + repo"]
        VAL["validation — 21<br/><b>EntityValidationController</b>"]
        EXI["exportimport — 2+<br/><b>ImportExportController</b>"]
    end

    subgraph SHARED["v2.refactor shared"]
        DAL["dal — JDBC + JPA + projections"]
        ERR["errhandling<br/>LMErrorCodes · LmSQLException"]
        EFS["efs — AuditLogService"]
        LOG["logging — MDC"]
        ASY["springconfig — AsyncConfig · Beans"]
    end

    DB[("linkMgr")]

    VTE --> DAL
    PTV --> DAL
    SCP --> DAL
    VAL --> DAL
    EXI --> DAL
    VTE --> ERR
    VTE --> EFS
    VTE --> LOG
    VAL --> ASY
    DAL --> DB
    V1R --> DB

    style V2 fill:#eef6ff,stroke:#4477aa
    style SHARED fill:#eef6ff,stroke:#4477aa
```

Practical consequence: when a mapping, scope, or validation endpoint misbehaves, look in `v2/refactor/**`, not in `controllers/` or `service/`.

## 3. The dual data-access layer
v2 deliberately runs JDBC **and** JPA side by side.

```mermaid
graph LR
    SVC["Slice service<br/>viewtoentity · scope · proceduretoview"]

    subgraph DAL["v2.refactor.dal"]
        OPS["CommonDbOps<br/>DeleteOperations<br/>ReadDataService"]
        JDBC["dal.jdbc<br/>AbstractJDBCRepository<br/>EntityView · EntityViewProcedure<br/>EntityTypeMapping · ScopeMapping"]
        JPAR["dal.jpa<br/>EntityView · EntityViewProcedure<br/>EntityTypeMapping"]
        PROJ["dal.projections<br/>Search + Export projections"]
    end

    DB[("linkMgr")]

    SVC --> OPS
    OPS --> JDBC
    OPS --> JPAR
    JDBC --> PROJ
    JPAR --> PROJ
    JDBC --> DB
    JPAR --> DB
```

Projections (`EntityViewSearchProjection`, `EntityViewProcedureSearchProjection`, and the export variants) are why `POST /view-entity-map/lm-search/v2` returns a narrower shape than the single-entity `search` — the bulk read is projection-backed for volume.

## 4. Domain model
```mermaid
erDiagram
    EntityTypes ||--o{ SourceEntity : "typed as"
    EntityTypes ||--o{ EntityTypeMapping : "relates"
    DashboardViews ||--o{ EntityView : "view mapped"
    SourceEntity ||--o{ EntityView : "entity has views"
    EntityView ||--o{ EntityViewProcedureMapping : "runs procedure"
    EntityView ||--o{ EntityViewScopeMapping : "scope preset"
    DashboardViews ||--o{ ViewFilterMapping : "filters"
    SourceEntity ||--o{ UserEntityDashboard : "favourites"
    Job ||--|| EntityView : "validates"
    ArchivedRecord }o--|| EntityView : "soft delete"
```

`EntityTypes` holds `process`, `subprocess`, `assumption`. An unrecognised `{type}` returns **400, not 404** — a frequent source of confusing failures.

## 5. View resolution flow
What happens on every Planning Space page load.

```mermaid
sequenceDiagram
    participant PS as Planning Space
    participant VC as ViewEntityMapController
    participant S as viewtoentity service
    participant D as dal (JDBC)
    participant DB as linkMgr

    PS->>VC: POST /view-entity-map/lm-search/v2
    VC->>S: getViewsForEntities(entities)
    S->>D: projection query
    D->>DB: SELECT via EntityViewJdbcRepository
    DB-->>D: EntityViewSearchProjection rows
    D-->>S: projections
    S->>S: filter by user visibility
    S-->>VC: ViewEntityMappingsResponseDto
    VC-->>PS: views + ordering
    note over PS: If this returns the wrong set,<br/>the UI renders the wrong views<br/>with no visible error
```

## 6. Async validation job
```mermaid
sequenceDiagram
    participant T as Test
    participant C as EntityValidationController
    participant A as AsyncConfig pool
    participant V as validation (21 files)
    participant J as Job table

    T->>C: POST /validate
    C->>J: create job
    C->>A: submit async
    C-->>T: JobResponseDto (task_id)
    A->>V: run validators
    V->>J: update status

    loop expect.poll
        T->>C: GET /job/validation/{task_id}
        C->>J: read
        C-->>T: status
    end
```

`validation` is the largest v2 slice at 21 files, includes `ActorValidationUtility`, and has **no test coverage**.

## 7. Scheduled work
```mermaid
graph LR
    SCHED["ProcedureToViewScheduler"] -->|ShedLock JDBC| LOCK[("shedlock table")]
    SCHED --> PTV["ProceduresToViewsMappingService"]
    PTV --> DAL["dal"]
    AUD["efs.AuditLogService"] --> KAFKA{{"Kafka<br/>audit topic"}}
```

A scheduled remapping can change view state between two assertions in a spec. Scope assertions by entity and re-read rather than caching a view list.

## 8. Automation touchpoints
```mermaid
graph LR
    subgraph Specs["17 backend specs — 70% of active routes"]
        S1["Test_001..003<br/>view↔entity mapping"]
        S2["Test_004..008<br/>procedure mapping"]
        S3["Test_009, 011, 014<br/>preset + admin + global preset"]
        S4["Test_010<br/>scope mapping"]
        S6["Test_012<br/>lm-search/v2"]
        S7["Test_013<br/>favourites"]
        S5["Migration Test_006..008"]
    end

    subgraph Slices["v2 slices"]
        VTE["viewtoentity"]
        PTV["proceduretoview"]
        SCP["scope"]
        EXI["exportimport<br/>reason codes since SM-33313"]
        VAL["validation — UNTESTED"]
    end

    LEG["legacy controllers<br/>Links (favourites), FilterPreset"]

    S1 --> VTE
    S2 --> PTV
    S3 --> SCP
    S3 --> LEG
    S4 --> SCP
    S6 --> VTE
    S7 --> LEG
    S5 --> EXI

    style VAL fill:#fff0f0,stroke:#cc6666
```

Related: [api-contract.md](api-contract.md) · [data-model.md](data-model.md) · [automation-coverage.md](automation-coverage.md)
