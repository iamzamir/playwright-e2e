import fs from 'fs';
import path from 'path';
import type { TestInfo } from '@playwright/test';
import { test, expect } from '../../configs/api-fixtures';
import { checkLedgerFixture, CommonFunctions, getUnassertedChecksMode } from '../../util/common.util';

const log = new CommonFunctions();

// A call at module load has no running test, as in global setup or a plain script.
const outsideTestCall = log.compareTwoValues(1, 2, 'outside a test');

type Status = TestInfo['status'];

/** Runs the ledger fixture around `body` with a stubbed status, so a test can read what it reported. */
async function runLedger(body: () => Promise<unknown>, status: Status = 'passed', mode?: string): Promise<TestInfo['annotations']> {
  const annotations: TestInfo['annotations'] = [];
  const testInfo = { testId: test.info().testId, status, annotations } as unknown as TestInfo;
  const previousMode = process.env.PW_UNASSERTED_CHECKS;
  process.env.PW_UNASSERTED_CHECKS = mode ?? 'warn';
  try {
    await checkLedgerFixture({}, async () => { await body(); }, testInfo);
  } finally {
    if (previousMode === undefined) {
      delete process.env.PW_UNASSERTED_CHECKS;
    } else {
      process.env.PW_UNASSERTED_CHECKS = previousMode;
    }
  }
  return annotations;
}

/**
 * A spec cannot inspect its own attachments, so this reads the source:
 * tearing down first is what lets evidence fixtures see a test the ledger fails.
 */
function expectLedgerIsLastAutoFixture(file: string): void {
  const source = fs.readFileSync(path.join(__dirname, '../../configs', file), 'utf8');
  const declaration = '_checkLedger: [checkLedgerFixture, { auto: true }]';
  const ledger = source.indexOf(declaration);
  expect(ledger).toBeGreaterThan(-1);
  expect(source.indexOf('{ auto: true }', ledger + declaration.length)).toBe(-1);
}

test.describe('compareTwoValues and the failed-check ledger', () => {
  // Real hooks run outside the auto fixture, so each checks its own annotation here; a failure fails the first or last test.
  test.beforeAll(async () => {
    await log.compareTwoValues(1, 2, 'beforeAll check');
    expect(test.info().annotations).toContainEqual({ type: 'hook-failed-check', description: 'beforeAll check (expected 2, actual 1)' });
  });

  test.afterAll(async () => {
    await log.compareTwoValues(1, 2, 'afterAll check');
    expect(test.info().annotations).toContainEqual({ type: 'hook-failed-check', description: 'afterAll check (expected 2, actual 1)' });
  });

  test('a call outside a test does not throw and is not recorded against a later test', async () => {
    const annotations = await runLedger(async () => { expect(await outsideTestCall).toBe(false); });
    expect(annotations).toEqual([]);
  });

  test('match returns true and records nothing', async () => {
    let result = false;
    const annotations = await runLedger(async () => { result = await log.compareTwoValues('a', 'a', 'same value'); });
    expect(result).toBe(true);
    expect(annotations).toEqual([]);
  });

  test('case is ignored only with bIgnoreCase', async () => {
    const annotations = await runLedger(async () => {
      expect(await log.compareTwoValues('ABC', 'abc', 'ignore case', true)).toBe(true);
    });
    expect(annotations).toEqual([]);
    const caseSensitive = await runLedger(async () => {
      expect(await log.compareTwoValues('ABC', 'abc', 'case sensitive')).toBe(false);
    });
    expect(caseSensitive[0]?.description).toContain('case sensitive');
  });

  test('null and undefined do not match each other, with or without bIgnoreCase', async () => {
    await runLedger(async () => {
      expect(await log.compareTwoValues(null, undefined, 'null vs undefined')).toBe(false);
      expect(await log.compareTwoValues(null, undefined, 'null vs undefined, ignore case', true)).toBe(false);
      expect(await log.compareTwoValues(null, null, 'null vs null')).toBe(true);
    });
  });

  test('a number matches its string form', async () => {
    const annotations = await runLedger(async () => {
      expect(await log.compareTwoValues(1, '1', 'number vs string')).toBe(true);
    });
    expect(annotations).toEqual([]);
  });

  test('a failed test names its failed checks', async () => {
    const annotations = await runLedger(async () => {
      await log.compareTwoValues('Draft', 'Published', 'Scenario status');
      await log.compareTwoValues(1, 1, 'A check that passed');
    }, 'failed');
    expect(annotations).toEqual([{ type: 'failed-checks', description: 'Scenario status (expected Published, actual Draft)' }]);
  });

  test('a timed out test names its failed checks', async () => {
    const annotations = await runLedger(async () => { await log.compareTwoValues(1, 2, 'Row count'); }, 'timedOut');
    expect(annotations[0]?.type).toBe('failed-checks');
  });

  test('fail mode never replaces the error of a test that already failed', async () => {
    const annotations = await runLedger(async () => { await log.compareTwoValues(1, 2, 'Row count'); }, 'failed', 'fail');
    expect(annotations[0]?.type).toBe('failed-checks');
  });

  test('a passing test with a mismatch is annotated in warn mode', async () => {
    const annotations = await runLedger(async () => { await log.compareTwoValues(1, 2, 'Row count'); }, 'passed', 'warn');
    expect(annotations).toEqual([{ type: 'unasserted-check', description: 'Row count (expected 2, actual 1)' }]);
  });

  test('a passing test with a mismatch fails in fail mode, one line per check', async () => {
    const run = runLedger(async () => {
      await log.compareTwoValues(1, 2, 'Row count');
      await log.compareTwoValues('a', 'b', 'Name');
    }, 'passed', 'fail');
    await expect(run).rejects.toThrow('Unasserted check failed: Row count (expected 2, actual 1)\nUnasserted check failed: Name (expected b, actual a)');
  });

  test('off mode reports nothing', async () => {
    const annotations = await runLedger(async () => { await log.compareTwoValues(1, 2, 'Row count'); }, 'passed', 'off');
    expect(annotations).toEqual([]);
  });

  test('a skipped test reports nothing', async () => {
    const annotations = await runLedger(async () => { await log.compareTwoValues(1, 2, 'Row count'); }, 'skipped', 'fail');
    expect(annotations).toEqual([]);
  });

  test('the ledger is cleared on every path', async () => {
    for (const [status, mode] of [['passed', 'off'], ['passed', 'warn'], ['failed', 'warn'], ['timedOut', 'warn'], ['skipped', 'warn']] as [Status, string][]) {
      await runLedger(async () => { await log.compareTwoValues(1, 2, 'Row count'); }, status, mode);
      expect(await runLedger(async () => undefined, 'passed', 'warn')).toEqual([]);
    }
    await runLedger(async () => { await log.compareTwoValues(1, 2, 'Row count'); }, 'passed', 'fail').catch(() => undefined);
    expect(await runLedger(async () => undefined, 'passed', 'warn')).toEqual([]);
  });

  test('a mismatch outside the fixture, as in beforeAll or afterAll, is named at once and not enforced', async () => {
    const realAnnotations = test.info().annotations;
    const before = realAnnotations.length;
    await runLedger(async () => undefined);
    await log.compareTwoValues(1, 2, 'Cleanup status');
    expect(realAnnotations.slice(before)).toEqual([{ type: 'hook-failed-check', description: 'Cleanup status (expected 2, actual 1)' }]);
    realAnnotations.length = before;
    expect(await runLedger(async () => undefined, 'passed', 'fail')).toEqual([]);
  });

  test('long values are truncated', async () => {
    const annotations = await runLedger(async () => { await log.compareTwoValues('x'.repeat(5000), 'y', 'Baseline'); });
    expect(annotations[0]?.description).toContain('... (5000 chars)');
    expect(annotations[0]?.description?.length).toBeLessThan(400);
  });

  test('an unknown or empty mode means warn', async () => {
    const previousMode = process.env.PW_UNASSERTED_CHECKS;
    try {
      process.env.PW_UNASSERTED_CHECKS = 'nonsense';
      expect(getUnassertedChecksMode()).toBe('warn');
      delete process.env.PW_UNASSERTED_CHECKS;
      expect(getUnassertedChecksMode()).toBe('warn');
      process.env.PW_UNASSERTED_CHECKS = ' FAIL ';
      expect(getUnassertedChecksMode()).toBe('fail');
    } finally {
      if (previousMode === undefined) {
        delete process.env.PW_UNASSERTED_CHECKS;
      } else {
        process.env.PW_UNASSERTED_CHECKS = previousMode;
      }
    }
  });

  test('valuesMatch compares the same way and never records', async () => {
    const annotations = await runLedger(async () => {
      expect(await log.valuesMatch(1, 2, 'probe')).toBe(false);
      expect(await log.valuesMatch(1, '1', 'probe')).toBe(true);
      expect(await log.valuesMatch('ABC', 'abc', 'probe', true)).toBe(true);
    });
    expect(annotations).toEqual([]);
  });

  test('fixtures.ts declares the ledger as its last auto fixture', () => {
    expectLedgerIsLastAutoFixture('fixtures.ts');
  });

  test('api-fixtures.ts declares the ledger as its last auto fixture', () => {
    expectLedgerIsLastAutoFixture('api-fixtures.ts');
  });

  // The last two run through the real auto fixture rather than the stub above.
  test('mismatch asserted at the end fails the test', async () => {
    test.fail();
    const check = await log.compareTwoValues(1, 2, 'Asserted check');
    expect(check).toBeTruthy();
  });

  // Passes in warn and off; fails in fail mode. Run with PW_UNASSERTED_CHECKS=fail to see that.
  test('mismatch never asserted', async () => {
    await log.compareTwoValues(1, 2, 'Unasserted check');
  });
});
