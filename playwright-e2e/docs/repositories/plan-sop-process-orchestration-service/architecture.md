# Architecture — plan-sop-process-orchestration-service

## 1. Context
Where the service sits in the platform.

```mermaid
graph TB
    subgraph Clients
        LUI["plan-sop-lui<br/>PO UI"]
        PS["plan-sop-planning-mfe<br/>Planning Space UI"]
        AUTO["plan-sop-ui-automation<br/>16 specs"]
    end

    GW{{"API Gateway<br/>AZURE or GRAVITEE"}}

    PO["<b>plan-sop-process-orchestration-service</b><br/>23 controllers · 28 entities<br/>Java 21 · Spring Boot 3.5.16"]

    subgraph Downstream
        AI["plan-sop-actionitem"]
        LIAM["LIAM<br/>RBAC / ABAC"]
        PROC["Procedure service"]
        ALM["ALM / Foundation Model"]
        MAIL["SMTP<br/>spring.mail"]
    end

    DB[("Azure SQL<br/>process_orchestration_db")]
    KAFKA{{"Kafka"}}

    LUI --> GW
    PS --> GW
    AUTO --> GW
    GW --> PO
    PO --> AI
    PO --> LIAM
    PO --> PROC
    PO --> ALM
    PO --> MAIL
    PO --> DB
    PO --> KAFKA
```

## 2. Internal layering
Actual packages under `com.blueyonder.po`, with file counts.

```mermaid
graph TD
    subgraph REST["rest — HTTP boundary"]
        C["rest.controller<br/>22 files"]
        RQ["rest.dto.request<br/>54"]
        RS["rest.dto.response<br/>42"]
        D["rest.dto<br/>23"]
    end

    subgraph SVC["service — business logic"]
        SI["service.interfaces<br/>32"]
        SIMPL["service.impl<br/>34"]
        SH["service.helper<br/>7"]
        SQ["service.helper.quotamanagement<br/>5 + 3 events"]
        SP["service.proxy<br/>18"]
        SO["service.onboard<br/>3"]
    end

    subgraph JPA["jpa — persistence"]
        E["jpa.entity<br/>29"]
        R["jpa.repository<br/>31"]
        CV["jpa.converter<br/>7"]
    end

    subgraph EVT["event — async"]
        EP["event.producer<br/>+ impl"]
        EK["event.kafka"]
        EL["event.listener"]
    end

    subgraph X["cross-cutting"]
        CFG["config — 9"]
        LOG["logging — 10"]
        MAP["mapper — 12"]
        UTL["utils — 6"]
        WH["webhook"]
    end

    DB[("Azure SQL")]
    KAFKA{{Kafka}}
    EXT["External services"]

    C --> RQ
    C --> RS
    C --> SI
    SI -.implemented by.-> SIMPL
    SIMPL --> SH
    SH --> SQ
    SIMPL --> SP
    SIMPL --> SO
    SIMPL --> R
    R --> E
    E --> CV
    R --> DB
    SP --> EXT
    SIMPL --> EP
    EP --> EK
    EK --> KAFKA
    KAFKA --> EL
    MAP -.entity ↔ dto.-> D
```

`service.proxy` (18 files) is the outbound-call layer — it is what makes `ActionItemProxyController` and `RbacProxyController` work, and why an Action Item or LIAM outage surfaces as a PO failure.

## 3. Domain model
```mermaid
graph TD
    ORG["Organisation<br/>realm / ALM config"] --> TEN["Tenant"]
    TEN --> NODE["Node<br/>process AND subprocess"]
    NODE -->|parent/child| NODE
    NODE --> NATTR["NodeAttribute<br/>node_attr_mapping"]
    NODE --> TR["Transition"]
    NODE --> NSCH["NodeSchedule"]
    NODE --> SCA["SupplyChainAction"]
    NODE --> EA["EventAction"]
    EA --> EAX["EventActionExecution"]
    CAL["Calendar"] --> CYC["CalendarCycle"]
    CYC --> NSCH
    TPL["Template"] --> TSCH["TemplateSchema"]
    TPL --> TEX["TemplateExclusionTenants"]
    TPL -.instantiates.-> NODE
    QL["QuotaLimits"] --> SM["ScopeMetering"]
    QMC["QuotaMeteringConfiguration"] --> SM
    NODE --> RPD["ProcessReportDirectory"]
    RC["ReportConfiguration"] --> RPD
    JOB["JobExecutionStatus<br/>backs /job/{id}/status"]
```

`Node` is the single table behind both processes and subprocesses — the distinction is hierarchy, not type.

## 4. Async flow — process start
The pattern every automation spec must follow.

```mermaid
sequenceDiagram
    participant T as Test
    participant C as ProcessController
    participant S as service.impl
    participant J as JobExecutionStatus
    participant K as Kafka
    participant L as event.listener

    T->>C: POST /process/{name}/start
    C->>S: startNode()
    S->>J: create job row
    S->>K: publish start event
    S-->>C: 202 / job reference
    C-->>T: response (NOT "started")
    K->>L: consume
    L->>S: execute transitions
    S->>J: update status

    loop expect.poll, POLL_INTERVAL 500ms
        T->>C: GET /process/{name}/status
        C-->>T: current status
    end
```

Asserting on the `POST` response is the single most common source of false passes here.

## 5. ALM migration flow
```mermaid
sequenceDiagram
    participant T as Migration spec
    participant SRC as PO (source realm)
    participant ALM as ALM Exchange
    participant TGT as PO (target realm)

    T->>SRC: GET /process/{name}/export
    SRC-->>T: export payload
    T->>SRC: POST /configuration/exchange/publish (ZIP ≤10MB)
    SRC-->>T: jobId
    loop poll
        T->>SRC: GET /job/{jobId}/status
    end
    T->>ALM: deploy resource
    ALM->>TGT: apply configuration
    loop poll
        T->>TGT: GET /job/{jobId}/status
    end
    T->>TGT: GET /process/{name}
```

Multipart ceiling is 10MB (`MULTIPART_MAX_FILE_SIZE`); 12MB request size. Exceeding it returns HTTP 413.

## 6. Automation touchpoints
```mermaid
graph LR
    subgraph Specs
        PB["ProcessBatch<br/>9 specs"]
        CAL["Calendar<br/>3 specs"]
        MIG["Migration<br/>9 specs"]
        DS["DataSetupBatch<br/>7 specs — destructive"]
        UI["ProcessOrchestration UI<br/>29 specs"]
    end

    subgraph Endpoints
        EP1["/process/** — search, context, scope,<br/>tree, Gantt, attributes, start/stop"]
        EP2["/calendar/**"]
        EP3["/exportData, /importData<br/>/configuration/exchange/**"]
        EP4["/job/{id}/status"]
        EP5["/supplyChainAction/**"]
    end

    subgraph Untested["Untested (P1 = lui/mfe-used)"]
        G1["transitions — P1"]
        G2["subprocess start/stop — P1"]
        G3["templates, quota, insights,<br/>reporting, event actions"]
    end

    PB --> EP1
    PB --> EP4
    PB --> EP5
    CAL --> EP2
    MIG --> EP3
    MIG --> EP4
    DS --> EP1
    DS --> EP2
    UI --> EP1
    UI -.UI only.-> G1

    style Untested fill:#fff0f0,stroke:#cc6666
```

59 of 144 active routes are exercised by backend specs (2026-10-05).

Related: [api-contract.md](api-contract.md) · [test-hooks.md](test-hooks.md) · [platform map](../repo-map.md)
