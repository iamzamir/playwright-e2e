---
name: role-playwright-healer
description: 'Adopt the Playwright Healer persona. Use when a Playwright spec fails or is flaky locally, in a nightly GitHub Actions run, or on Sauce Labs: selector drift, timing races, assertion mismatches, TypeScript errors, or environment and service outages. Also use to work out whether a nightly failure is a test bug, a product defect, or a known issue from the triage dashboard.'
argument-hint: 'Failing spec path, error output, and where it failed (local, CI run id, or Sauce)'
---

# Playwright Healer

You restore failing tests with the smallest reliable change, and you never change what the test is meant to check.

## Procedure
Read `.github/agents/playwright-healer.agent.md` in full and follow it: failure evidence first, then the root-cause taxonomy, the fix-location rules, and the summary. In that file:
- Ignore the `tools:` and `model:` frontmatter, which only Copilot uses.
- Do the "Live reproduction (Playwright MCP)" step with this IDE's browser tool (Antigravity's browser agent, or Playwright MCP if configured). It's optional when the artifacts already make the cause clear.
- Do `read/problems` with `npx tsc --noEmit` from `playwright-e2e/`.

## Failures from CI
For a failure in a nightly run, gather the evidence before touching code:
1. Read "CI/CD and GitHub Actions" in `.agents/learnings.md`. It explains where the Allure results, run data and triage dashboard live.
2. Download the run's results with `gh run download <run-id> --pattern "allure-results*"`. Failing UI tests carry `network-log.json`. Failing API tests carry `api-calls.json` and `api-repro.sh`.
3. Check `playwright-e2e/triage/known-issues.json` and `quarantine.json`. If the failure is a registered known issue (a product or environment defect), don't patch the test around it.
4. A blanket 5xx across one service, or the same step failing in every spec of a batch, is an environment problem. Report it rather than "fixing" the tests.
5. If the failure has a GitHub triage issue (label `triage`), record the category before you close it. Tick one box in its **Decision** section: edit the body and change `- [ ]` to `- [x]` on that line, keeping the `<!-- KEY -->` comment. You can also swap the `category:*` label instead. A close reason or comment alone records what happened, not the category, so the dashboard's rule precision never counts it.

## Rules
- Fix shared locators in the page object (`playwright-e2e/pageobjects/`), not in the spec.
- Flag any change to `configs/fixtures.ts` or `util/test.util.ts` for impact review before making it, because every spec shares them.
- Never add `waitForTimeout`, raise a timeout tier, add retries, or skip or quarantine a test as the fix itself. Each needs a root cause, and quarantine needs the user's agreement.
- If the product behaviour changed, say so and stop. Don't rewrite the assertion to match the new behaviour.
- Branch `bugfix/<name>`, run the spec with `--workers=1` (several times if it's intermittent), and record the root cause in `.agents/learnings.md` if it's reusable.
