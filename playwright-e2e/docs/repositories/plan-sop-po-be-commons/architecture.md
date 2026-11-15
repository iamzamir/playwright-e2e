# Architecture — plan-sop-po-be-commons

## 1. Context
Not deployed. Packaged **into** each backend service.

```mermaid
graph TB
    REPO["<b>plan-sop-po-be-commons</b><br/>com.by.po.commons<br/>Java 21 + Kotlin · Spring Boot 3.4.3"]
    JFROG[("JFrog Artifactory<br/>git-SHA SNAPSHOT")]

    subgraph Consumers["Consuming services"]
        PO["plan-sop-process-orchestration-service"]
        AI["plan-sop-actionitem"]
        LM["plan-sop-link-management"]
        UF["plan-sop-ui-fields-service"]
        PIN["all four pin 2dacec2-SNAPSHOT<br/>(commons main HEAD, 2026-10-05)"]
    end

    KV[("Azure Key Vault<br/>secrets starter only")]
    KAFKA{{"Kafka<br/>EFS audit topic"}}
    APM["Elastic APM"]
    GRAV["Gravitee gateway"]

    REPO -->|publish.yml| JFROG
    JFROG -.compiled into.-> PO
    JFROG -.compiled into.-> AI
    JFROG -.compiled into.-> LM
    JFROG -.compiled into.-> UF
    REPO --> KV
    REPO --> KAFKA
    REPO --> APM
    REPO --> GRAV

    style REPO fill:#eef6ff,stroke:#4477aa
```

## 2. Internal modules
Packages under `com.by.po.commons`, with file counts.

```mermaid
graph TD
    ROOT["commons — 6<br/>core config"]

    subgraph SEC["Security and gateway"]
        FIL["filters — 4<br/>request filters"]
        GRV["gravitee — 5<br/>gateway integration"]
        JWT["nimbus-jose-jwt 10.9"]
    end

    subgraph INFRA["Infrastructure"]
        AZ["azure — 2<br/>Key Vault"]
        HTTP["http — 2<br/>WebClient"]
        LOG["logging — 1<br/>ECS layout"]
        UTL["utils — 2"]
    end

    subgraph EVT["Eventing"]
        EFS["efs — 1"]
        PUB["efs.publish — 1<br/>po-audit-log-producer"]
    end

    subgraph OPS["Operations"]
        O["ops — 1<br/>PO_OPS_ADMINS"]
        ODB["ops.dbstate — 6"]
        OGR["ops.gravitee — 2"]
    end

    KAFKA{{Kafka}}
    KV[("Key Vault")]

    ROOT --> FIL
    ROOT --> GRV
    FIL --> JWT
    ROOT --> AZ
    ROOT --> HTTP
    ROOT --> LOG
    ROOT --> EFS
    EFS --> PUB
    PUB --> KAFKA
    AZ --> KV
    ROOT --> O
    O --> ODB
    O --> OGR
```

`ops.dbstate` (6 files) gives central operations visibility into consumer database state — relevant when a service reports healthy but its migrations have not applied.

## 3. What each consumer inherits
```mermaid
graph LR
    subgraph Provided["Provided by commons"]
        P1["JWT validation → uniform 401"]
        P2["@ibp.hasAction root → uniform 403"]
        P3["WebClient + codec 30MB"]
        P4["Kafka audit producer"]
        P5["ECS structured logging"]
        P6["Elastic APM tracing"]
        P7["Liquibase core (disabled here)"]
        P8["MapStruct"]
        P9["springdoc → /swagger-ui"]
        P10["Auditable superclass"]
    end

    subgraph Observable["Observable in tests"]
        O1["401 shape identical across services"]
        O2["403 shape identical across services"]
        O3["413 boundary identical"]
        O4["createdBy / updatedBy on every entity"]
        O5["Swagger present on every service"]
        O6["Correlatable trace IDs"]
    end

    P1 --> O1
    P2 --> O2
    P3 --> O3
    P10 --> O4
    P9 --> O5
    P6 --> O6
```

## 4. Audit-event flow
```mermaid
sequenceDiagram
    participant T as Test
    participant S as Any backend service
    participant A as efs.publish
    participant K as Kafka
    participant E as EFS audit store

    T->>S: mutating API call
    S->>S: apply change + set createdBy/updatedBy
    S-->>T: 200 (request path complete)
    S--)A: async audit event
    A->>A: realm in AUDIT_LOG_ENABLED_REALM_IDS?
    alt allowlisted
        A--)K: publish (fire and forget)
        K--)E: persist
    else not allowlisted
        A->>A: drop silently
    end
    note over T,E: Broker failure does NOT fail the API call —<br/>a green suite says nothing about audit health
```

Allowlisted realms default to `ca7623d3-b234-431c-a445-4a1d5444668e` and `9beb5e0f-8e95-4979-b438-edbc7b054981`. The first matches `REALM_ID` in `configs/setup.js`, so the INTEROP automation realm **does** emit audit events.

## 5. Version drift — the structural risk
```mermaid
graph TD
    SRC["commons source"] -->|build| SNAP["&lt;sha&gt;-SNAPSHOT"]
    SNAP --> JF[("JFrog")]

    JF --> PIN1["PO pins SHA-A"]
    JF --> PIN2["Action Item pins SHA-B"]
    JF --> PIN3["Link Mgmt pins SHA-C"]
    JF --> PIN4["UI Fields pins SHA-D"]

    PIN1 --> RISK{"Different builds<br/>in one environment"}
    PIN2 --> RISK
    PIN3 --> RISK
    PIN4 --> RISK

    RISK --> SYM["Auth / logging / migrations<br/>behave differently per service"]

    REPUB["SNAPSHOT republished<br/>under the same coordinate"] -.same version, different bytes.-> RISK

    style RISK fill:#fff0f0,stroke:#cc6666
```

This is the failure mode, not the current state. On 2026-09-16 Link Management pinned `251ccd3` while the other three pinned `aa6e444`; since the ABP-19137 CVE work (2026-09-17) **all four pin `2dacec2-SNAPSHOT`**, which is also the commons `main` HEAD. Nothing enforces that alignment, so the recommended guard is still a CI check that all four consumers pin the same SHA. See [automation-coverage.md](automation-coverage.md#recommended-additions).

## 6. Blast radius
```mermaid
graph LR
    C["Change in commons"] --> PO["PO service"]
    C --> AI["Action Item"]
    C --> LM["Link Management"]
    C --> UF["UI Fields"]
    PO --> UI1["PO UI suites"]
    PO --> UI2["Planning Space suites"]
    LM --> UI2
    UF --> UI1
    UF --> UI2
    AI --> UI1

    style C fill:#fff0f0,stroke:#cc6666
```

**Diagnostic rule:** a failure appearing in more than one backend service at the same time is a commons change until proven otherwise.

## 7. Test strategy
```mermaid
graph TD
    OWN["Own tests in-repo<br/>Testcontainers + Kafka 2.0.3<br/>efs.is-enabled = false"]
    E2E["End-to-end specs"]
    NEVER["Never target /hello or port 9999"]

    OWN -->|correct level| REPO["commons"]
    E2E -->|exercise indirectly<br/>via every backend call| REPO
    NEVER -.-x REPO

    style NEVER fill:#fff0f0,stroke:#cc6666
```

Related: [api-contract.md](api-contract.md#capabilities-contributed-to-consumers) · [troubleshooting.md](troubleshooting.md) · [platform map](../repo-map.md#blast-radius)
