const fs = require('fs');
const path = require('path');

// 'unknown' is an interrupted or unfinished result; treat it as a failure so it can never pass as a skip.
const FAILURE_STATUSES = new Set(['failed', 'broken', 'unknown']);
const BLOCKED_PREFIX = 'Blocked:';

function isFailure(status) {
  return FAILURE_STATUSES.has(status);
}

// Reads every *-result.json under resultsDir (shard sub-folders included), skipping Allure's history folder.
function readResults(resultsDir) {
  const results = [];
  if (!resultsDir || !fs.existsSync(resultsDir)) {
    return results;
  }
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'history') walk(fullPath);
      } else if (entry.name.endsWith('-result.json')) {
        try {
          const result = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          Object.defineProperty(result, '_file', { value: fullPath, enumerable: false });
          results.push(result);
        } catch (err) {
          console.warn(`[triage] Skipping unreadable result ${fullPath}: ${err.message}`);
        }
      }
    }
  };
  walk(resultsDir);
  return results;
}

function getLabel(result, name) {
  const label = (result.labels || []).find((item) => item.name === name);
  return label ? label.value : undefined;
}

// Spec path relative to tests/, e.g. "PlanningSpace/CardsBatch/Test_004_MaasChartCard.spec.ts".
function specOf(result) {
  const fromFullName = String(result.fullName || '').split(':')[0];
  if (fromFullName.endsWith('.spec.ts')) return fromFullName.replace(/\\/g, '/');
  return String(getLabel(result, 'suite') || getLabel(result, 'package') || 'unknown').replace(/\\/g, '/');
}

function testKey(result) {
  return result.historyId || result.testCaseId || result.fullName || result.name;
}

function firstLine(text) {
  return String(text || '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').map((line) => line.trim()).find(Boolean) || '';
}

// Stable error signature: dynamic values (numbers, ids, quoted names) are masked so repeats group together.
function errorSignature(message) {
  return firstLine(message)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '{uuid}')
    .replace(/\b[0-9a-f]{20,}\b/gi, '{id}')
    .replace(/\d+/g, 'N')
    .replace(/(["`])[^"`]+\1/g, '$1…$1')
    // Single quotes only after a non-letter, so apostrophes (couldn't) are left alone.
    .replace(/(^|[^A-Za-z])'[^']+'/g, "$1'…'")
    .slice(0, 160);
}

/**
 * Collapses retries into one entry per test (last attempt wins) and derives:
 * - flaky: passed on the last attempt after a failed one;
 * - blocked: skipped without a reason in a spec where another test failed
 *   (describe.serial stops the file after the first failure).
 */
function summarizeTests(results) {
  const groups = new Map();
  for (const result of results) {
    const key = testKey(result);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(result);
  }

  const tests = [];
  for (const [key, attempts] of groups) {
    attempts.sort((a, b) => (a.stop || a.start || 0) - (b.stop || b.start || 0));
    const final = attempts[attempts.length - 1];
    const message = (final.statusDetails && final.statusDetails.message) || '';
    tests.push({
      key,
      historyId: final.historyId,
      spec: specOf(final),
      name: final.name,
      fullName: final.fullName,
      status: final.status,
      message: firstLine(message),
      fullMessage: String(message).replace(/\u001b\[[0-9;]*m/g, ''),
      signature: isFailure(final.status) ? errorSignature(message) : '',
      attempts: attempts.length,
      flaky: final.status === 'passed' && attempts.some((attempt) => isFailure(attempt.status)),
      start: final.start || 0,
      stop: final.stop || 0,
      blockedBy: null,
      result: final
    });
  }

  const failuresBySpec = new Map();
  for (const test of tests) {
    if (!isFailure(test.status)) continue;
    if (!failuresBySpec.has(test.spec)) failuresBySpec.set(test.spec, []);
    failuresBySpec.get(test.spec).push(test);
  }
  for (const test of tests) {
    if (test.status !== 'skipped') continue;
    const hasReason = test.message && !test.message.startsWith(BLOCKED_PREFIX);
    const specFailures = failuresBySpec.get(test.spec);
    if (hasReason || !specFailures) continue;
    const earlier = specFailures.filter((failure) => !test.start || failure.start <= test.start);
    const blocker = (earlier.length ? earlier : specFailures).sort((a, b) => b.start - a.start)[0];
    test.blockedBy = blocker.name;
    test.blockedById = blocker.historyId;
  }

  return tests;
}

function countTests(tests) {
  const counts = { total: tests.length, passed: 0, failed: 0, skipped: 0, blocked: 0, flaky: 0 };
  for (const test of tests) {
    if (test.status === 'passed') counts.passed++;
    else if (isFailure(test.status)) counts.failed++;
    else if (test.blockedBy) counts.blocked++;
    else counts.skipped++;
    if (test.flaky) counts.flaky++;
  }
  return counts;
}

module.exports = { BLOCKED_PREFIX, isFailure, readResults, getLabel, specOf, errorSignature, summarizeTests, countTests };
