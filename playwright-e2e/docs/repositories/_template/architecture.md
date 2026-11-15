# Architecture — <repo-name>

Diagrams use Mermaid so they render in GitHub and VS Code. Keep them derived from source, not idealised.

## 1. Context
Where this repo sits in the platform: who calls it, what it calls.

```mermaid
graph TB
    CLIENT["Caller"]
    REPO["<b>repo-name</b><br/>counts · stack"]
    DOWN["Downstream dependency"]
    DB[("Datastore")]

    CLIENT --> REPO
    REPO --> DOWN
    REPO --> DB
```

## 2. Internal structure
Real packages/folders with file counts — not a generic layer cake.

```mermaid
graph TD
    A["layer — n files"] --> B["layer — n files"]
```

## 3. Domain model
Entities and relationships, or component/state structure for a frontend.

```mermaid
erDiagram
    A ||--o{ B : "relationship"
```

## 4. Key flow
The sequence automation most needs to understand — usually the async one.

```mermaid
sequenceDiagram
    participant T as Test
    participant S as Service
    T->>S: request
    S-->>T: response
```

## 5. Automation touchpoints
Which specs hit which part, and what is uncovered.

```mermaid
graph LR
    SPEC["Spec group"] --> EP["Endpoint / component"]
    GAP["Untested area"]
    style GAP fill:#fff0f0,stroke:#cc6666
```

## Conventions used in these diagrams
| Convention | Meaning |
| --- | --- |
| Red fill `#fff0f0` | Untested area, risk, or anti-pattern |
| Blue fill `#eef6ff` | Notable/modern subsystem worth calling out |
| Green fill `#eef8ee` | Correct pattern to follow |
| Grey fill `#f5f5f5` | Legacy or superseded |
| Solid arrow | Synchronous call |
| `--)` or dotted | Async, fire-and-forget, or packaged-into |
| `-.-x` | Prohibited path |

Related: [overview.md](overview.md) · [test-hooks.md](test-hooks.md)
