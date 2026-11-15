---
name: psr-gap-api-tests
description: 'Implement a PSR gap plan item as Playwright backend API tests (PO, Link Management, Action Items, UI Fields). Use when turning a plan in playwright-e2e/docs/Coverage/PSR-Gap-Plans into specs, adding backend API coverage, recording service defects, or refreshing the API coverage reports.'
argument-hint: 'Gap plan file and item ids (for example 01-ProcessOrchestration-PSR-Gap-Plan.md PO-03 to PO-06)'
---

# Implementing PSR gap API tests

## When to use
- You are implementing items from `playwright-e2e/docs/Coverage/PSR-Gap-Plans/0N-*-PSR-Gap-Plan.md`.
- You are adding backend specs under `playwright-e2e/tests/ProcessOrchestrationBackend/<area>/`.
- You found a service defect while testing and need to record it.

## Procedure
1. **Read first.** Read the plan item, the matching section of `.agents/learnings.md`, and the sibling specs in the target folder. Reuse their structure and helpers.
2. **Confirm the contract from service source.** The sibling repos are at `C:\Backend\<repo>`. Read the controller, DTO, entity and service, not an older analysis or a subagent summary. Search with `Select-String` in a terminal, because workspace search can't see sibling repos.
3. **Write the spec** following `.github/instructions/playwright-api.instructions.md`:
   - Token once per file in `beforeAll`; unique names for created data; cleanup in `afterAll`.
   - Use `process-fixture.util.ts` for any writable process, `ActionItemApiHelper.write()` for Action Item writes, and `MappingUtil` for Link Management seeds.
   - Writes to shared data must be no-op round trips (read, send back unchanged, read again).
4. **Test data.** Add `testdata/{INTEROP,QA,PSR}/ProcessOrchestrationBackend/<area>/<Spec>.json` with a `_schema` block. Values differ per environment, so confirm each one.
5. **Register** the spec in the matching `tests/TestSuites/POBackend<Area>Batch.json`, and in `POBackendSmokeBatch.json` if it is a smoke check.
6. **Run it on both gateways** (`GATEWAY_TYPE=AZURE` and `GRAVITEE`) for INTEROP and QA, with `USE_SPECIFIC_TESTS=false` and `--workers=1`. A blanket 500 across one service is an environment problem; see `learnings.md` before blaming the test.
7. **Defects.** Do not assert a defect as correct behaviour. Add it to `docs/Coverage/PSR-Gap-Plans/ActionItems-UIFields-Defect-Report.html` (request, response, expected, actual) with the next free id for its service prefix (`PO-`, `LM-`, `AI-`, `UF-`); search the report for the highest existing `<prefix>-Dnn` first so ids are never reused, and update the plan's Status row.
8. **Finalize.** From `playwright-e2e/`: `node scripts/finalize-spec.js <spec> --run` (call node directly, because PowerShell drops `--` for npm). Then `npm run docs:testcases` and commit the regenerated catalog with the spec.
9. **Coverage reports.** If route coverage changed, pull `main` in every sibling repo and run `node scripts/generate-api-coverage-report.js`. Do not hand-edit the generated dashboard or matrices; fix wording in `docs/Coverage/data/endpoint-notes.json`.
10. **Record learnings.** Add new verified, non-obvious facts to `.agents/learnings.md` under the right service heading, one line each, with the date and environments verified.

## Rules
- Branch per `workflow.instructions.md` (`test/<name>` for coverage-only work). Never commit to `main`.
- Keep commits focused. The existing style is `test(<area>): <summary> (PSR gap plan NN)`.
