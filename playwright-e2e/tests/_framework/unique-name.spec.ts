import { test, expect } from '@playwright/test';
import {
  uniqueName,
  uniqueAlphanumericName,
  parseUniqueName,
  AUTOMATION_NAME_PATTERN,
  ALPHANUMERIC_AUTOMATION_NAME_PATTERN,
  runId,
  getShardIndex
} from '../../util/unique-name.util';

// Verify that uniqueName works outside of a test execution context (e.g. at module load)
const outsideTestName = uniqueName('OutsideTest');
const outsideAlphanumericName = uniqueAlphanumericName('OutsideTest');

test.describe('uniqueName utility', () => {
  test('works outside a test and matches pattern', () => {
    expect(outsideTestName).toMatch(AUTOMATION_NAME_PATTERN);
    const parsed = parseUniqueName(outsideTestName);
    expect(parsed).toBeDefined();
    expect(parsed?.runId).toBe(runId());
  });

  test('10,000 calls in a tight loop are all distinct', () => {
    const count = 10000;
    const names = new Set<string>();
    for (let i = 0; i < count; i++) {
      names.add(uniqueName('LoopTest'));
    }
    expect(names.size).toBe(count);
  });

  test('every name matches AUTOMATION_NAME_PATTERN and parseUniqueName returns creation time within 1s of now', () => {
    const before = Date.now();
    const name = uniqueName('PatternTest');
    const after = Date.now();

    expect(name).toMatch(AUTOMATION_NAME_PATTERN);
    const parsed = parseUniqueName(name);
    expect(parsed).toBeDefined();
    expect(parsed?.runId).toBe(runId());
    expect(parsed?.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(parsed?.createdAt.getTime()).toBeLessThanOrEqual(after + 1000);
  });

  test('uniqueName(prefix, maxLength) never returns more than maxLength characters', () => {
    const sample = uniqueName('LongPrefixTestingString', 60);
    expect(sample.length).toBeLessThanOrEqual(60);

    const exactLength = 55;
    const fitted = uniqueName('VeryLongPrefixThatNeedsToTruncateToFit', exactLength);
    expect(fitted.length).toBeLessThanOrEqual(exactLength);
    expect(fitted).toMatch(AUTOMATION_NAME_PATTERN);
  });

  test('maxLength shorter than suffix throws an error', () => {
    expect(() => uniqueName('Test', 10)).toThrow(/is too short/);
  });

  test('uniqueAlphanumericName produces only alphanumeric characters and parses correctly', () => {
    expect(outsideAlphanumericName).toMatch(/^[a-zA-Z0-9]+$/);
    expect(outsideAlphanumericName).toMatch(ALPHANUMERIC_AUTOMATION_NAME_PATTERN);
    const parsed = parseUniqueName(outsideAlphanumericName);
    expect(parsed).toBeDefined();
    expect(parsed?.runId).toBe(runId());

    const name = uniqueAlphanumericName('Test_Process-Name 123', 60);
    expect(name).toMatch(/^[a-zA-Z0-9]+$/);
    expect(name.length).toBeLessThanOrEqual(60);
    const parsedName = parseUniqueName(name);
    expect(parsedName).toBeDefined();
    expect(parsedName?.runId).toBe(runId());
  });

  test('uniqueAlphanumericName parses runId correctly even when prefix contains pwauto', () => {
    const pwautoPrefix = 'pwautoProcess';
    const name = uniqueAlphanumericName(pwautoPrefix);
    expect(name).toMatch(ALPHANUMERIC_AUTOMATION_NAME_PATTERN);
    const parsed = parseUniqueName(name);
    expect(parsed).toBeDefined();
    expect(parsed?.runId).toBe(runId());

    const justPwauto = uniqueAlphanumericName('pwauto');
    expect(justPwauto).toMatch(ALPHANUMERIC_AUTOMATION_NAME_PATTERN);
    const parsedJustPwauto = parseUniqueName(justPwauto);
    expect(parsedJustPwauto).toBeDefined();
    expect(parsedJustPwauto?.runId).toBe(runId());
  });

  test('uniqueAlphanumericName 1,000 calls in a tight loop are all distinct', () => {
    const count = 1000;
    const names = new Set<string>();
    for (let i = 0; i < count; i++) {
      names.add(uniqueAlphanumericName('AlphaLoop'));
    }
    expect(names.size).toBe(count);
  });

  test('getShardIndex parses shard from CLI args or environment', () => {
    expect(getShardIndex()).toBeGreaterThanOrEqual(0);

    const origPwShard = process.env.PW_SHARD;
    const origShardIndex = process.env.SHARD_INDEX;
    const origPwShardIndex = process.env.PW_SHARD_INDEX;

    try {
      try {
        process.argv.push('--shard=3/5');
        expect(getShardIndex()).toBe(3);
      } finally {
        process.argv.pop();
      }

      delete process.env.SHARD_INDEX;
      delete process.env.PW_SHARD_INDEX;
      process.env.PW_SHARD = '4';
      expect(getShardIndex()).toBe(4);
    } finally {
      if (origPwShard !== undefined) process.env.PW_SHARD = origPwShard; else delete process.env.PW_SHARD;
      if (origShardIndex !== undefined) process.env.SHARD_INDEX = origShardIndex; else delete process.env.SHARD_INDEX;
      if (origPwShardIndex !== undefined) process.env.PW_SHARD_INDEX = origPwShardIndex; else delete process.env.PW_SHARD_INDEX;
    }
  });
});
