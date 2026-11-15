# Test hooks — <repo-name>

How automation drives this repo: setup, teardown, and the deterministic conditions to wait on.

## Automation entry points
| Asset | Path |
| --- | --- |
| API helper | `playwright-e2e/util/api.util.ts` |
| Page object(s) | |
| Fixture(s) | |
| Test data | `playwright-e2e/testdata/<ENV>/<area>/` |

## Setup recipes
### <Scenario>
| Step | Call | Notes |
| --- | --- | --- |

## Teardown / cleanup
| Step | Call | Notes |
| --- | --- | --- |

## Async behaviour — what to wait on
Never use a static sleep. Use `getTimeout(tier)` from `constants/timeouts.ts` and poll a real condition.

| Operation | Async? | Deterministic wait |
| --- | --- | --- |

## Idempotency and isolation
<Whether repeated runs collide; required unique-name strategy; parallel-safety.>
