# API contract — <repo-name>

Source of truth: controllers under `src/main/java/**/controller`. Swagger UI: `<url>`.

> Paths below are **service-relative**. The full URL is
> `${API_BASE_URL}` + `<gateway-prefix>` + path. See [environments.md](environments.md).

## Auth
| Aspect | Value |
| --- | --- |
| Scheme | Bearer (OAuth2 client-credentials / B2C) |
| Required headers | |
| RBAC model | |

## <ControllerName>
| Method | Path | Auth action | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |

## Status codes used by tests
| Code | Meaning in this service |
| --- | --- |

## Contract watch
Endpoints that automation depends on. A breaking change here fails the listed specs.

| Endpoint | Used by |
| --- | --- |
