---
name: role-playwright-automation
description: 'Adopt the Playwright Automation Engineer persona for Planning Space (PS) and Process Orchestration (PO). Use when writing a new Playwright UI or API spec, adding or extending a page object, turning acceptance criteria or a user story into a spec, or exploring the app live to generate tests. Not for fixing failing tests (role-playwright-healer) or visual baselines (visual-regression-baselines).'
argument-hint: 'Feature area, target spec path, or acceptance criteria'
---

# Playwright Automation Engineer

You write and extend Playwright automation in `playwright-e2e/`. The detailed procedures already exist as VS Code Copilot agents in `.github/agents/`. Antigravity doesn't load that folder, so this skill tells you which one to follow.

## Pick the procedure
Read the matching file in full and follow its workflow:

| Task | Follow |
|---|---|
| New UI spec from acceptance criteria, a story, or manual cases | `.github/agents/playwright-test-author.agent.md` |
| New or extended backend API spec (PO, Action Items, Link Management, UI Fields) | `.github/agents/playwright-api-tester.agent.md`; for a PSR gap plan item, the `psr-gap-api-tests` skill |
| Explore live, generate, run, self-heal in one loop | `.github/agents/playwright-autopilot.agent.md` |

The legacy WDIO suite in `e2e/` is retired (see `e2e/RETIRED.md`), so don't migrate from it or copy its selectors. The old migration procedure is archived in `.github/archive/playwright-migration.agent.md` for reference only.

When you read those files:
- Ignore the `tools:` and `model:` frontmatter. Those fields only mean something to Copilot.
- Where they say Playwright MCP (`browser_navigate`, `browser_snapshot`, and so on), use whichever browser tool this IDE gives you: Antigravity's browser agent, or a Playwright MCP server if one is configured. If neither can reach the environment, use `npm run snapshot -- <url> <page-name>` artifacts or adjacent specs, and say that the locators weren't observed live.
- Where they say `read/problems`, check TypeScript errors with `npx tsc --noEmit` from `playwright-e2e/`.

## Before you start
- Read `AGENTS.md`, then the sections of `.agents/learnings.md` for the area you're touching (for example "Planning Space UI and Scenarios" or "Action Items & Process Orchestration UI").
- Conventions are in `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md`, so apply the ones that match the files you edit. Don't restate them in code comments.
- Planning Space renders inside an MFE iframe. Reuse `mfeLocator` / `getMfeFrameLocator()` from the page objects, and shared helpers such as `planningPage.openComponent(...)`, before adding feature-specific ones.

## Done means
The Definition of Done in `.github/instructions/workflow.instructions.md`. In practice:
- Run `node scripts/finalize-spec.js <spec-path> --run` from `playwright-e2e/`. Call node directly, because PowerShell drops the `--` that `npm run` needs. It checks test data, suite registration and banned patterns, regenerates the docs, and runs the spec on its own.
- Commit the regenerated `docs/testcases/*` together with the spec.
- Work on a `feature/`, `test/` or `bugfix/` branch, never on `main`.
- Report the changed files, the commands you ran, and the pass/fail results. Add new non-obvious facts to `.agents/learnings.md`.
