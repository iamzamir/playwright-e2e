const { matchesTest } = require('./registry');

// Plan §9.1 page 6: quarantine candidates have a flake rate above 20% over 14 nights.
const FLAKY = { nights: 14, minRate: 0.2, minFlakyRuns: 2, maxRows: 100 };
const EXPIRING_DAYS = 14;

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

function entryStatus(entry, date) {
  if (!entry.expires) return 'active';
  const left = daysBetween(date, entry.expires);
  return left < 0 ? 'expired' : left <= EXPIRING_DAYS ? 'expiring' : 'active';
}

// Failed tests per registry id tonight, read from the run data records.
function countTonight(runs, field) {
  const counts = new Map();
  for (const run of runs) {
    for (const test of run.tests || []) {
      const entry = test.status === 'failed' && test[field];
      if (!entry) continue;
      const item = counts.get(entry.id) || { failed: 0, suites: new Set() };
      item.failed++;
      item.suites.add(run.suite);
      counts.set(entry.id, item);
    }
  }
  return counts;
}

/**
 * Page 5: every registry entry with tonight's failures, 30-night history and "may be fixed" suggestions.
 * history: [{ date, knownIssues: { id: failed } }] from earlier index rows.
 */
function knownIssuesReport({ registry, runs, history, recovered, date }) {
  const tonight = countTonight(runs, 'knownIssue');
  const from30 = new Date(Date.parse(`${date}T00:00:00Z`) - 29 * 86400000).toISOString().slice(0, 10);
  const issue = (entry) => {
    const now = tonight.get(entry.id);
    const seen = history.filter((row) => row.knownIssues && row.knownIssues[entry.id]).map((row) => row.date);
    if (now) seen.push(date);
    const fixed = recovered.filter((item) => item.id === entry.id);
    return {
      id: entry.id,
      jira: entry.jira || null,
      title: entry.title,
      category: entry.category || null,
      owner: entry.owner || null,
      since: entry.since || null,
      expires: entry.expires || null,
      ageDays: entry.since ? daysBetween(entry.since, date) : null,
      status: entryStatus(entry, date),
      match: entry.match || null,
      failedTonight: now ? now.failed : 0,
      suitesTonight: now ? [...now.suites] : [],
      nightsFailed30: seen.filter((night) => night >= from30).length,
      lastSeen: seen.sort().pop() || null,
      mayBeFixed: fixed.length ? { tests: fixed.length, consecutivePasses: Math.min(...fixed.map((item) => item.consecutivePasses)) } : null
    };
  };
  const quarantinedTonight = countTonight(runs, 'quarantine');
  return {
    knownIssues: [...registry.knownIssues, ...registry.expired.filter((entry) => entry.type === 'known-issue')].map(issue),
    quarantine: [...registry.quarantine, ...registry.expired.filter((entry) => entry.type === 'quarantine')].map((entry) => ({
      id: entry.id,
      owner: entry.owner || null,
      reason: entry.reason || entry.title || null,
      since: entry.since || null,
      expires: entry.expires || null,
      status: entryStatus(entry, date),
      match: entry.match || null,
      failedTonight: quarantinedTonight.has(entry.id) ? quarantinedTonight.get(entry.id).failed : 0
    }))
  };
}

/**
 * Page 6: flake ranking over the last 14 nights from run data (one selected run per suite and night).
 * nights: [{ date, runs }]. A run counts when the test passed or failed; skipped and blocked runs are left out.
 */
function flakyReport({ nights, registry }) {
  const byTest = new Map();
  for (const { date, runs } of nights) {
    for (const run of runs) {
      const context = { environment: run.environment, gateway: run.gateway };
      for (const test of run.tests || []) {
        if (!['passed', 'failed'].includes(test.status)) continue;
        const key = `${run.suite}|${test.spec}|${test.name}`;
        if (!byTest.has(key)) {
          const quarantine = registry.quarantine.find((entry) => matchesTest(entry.match, test, context, { ignoreMessage: true }));
          byTest.set(key, { suite: run.suite, spec: test.spec, name: test.name, runs: 0, flakyRuns: 0, failedRuns: 0, retries: 0, lostMs: 0, lastFlaky: null, quarantine: quarantine ? quarantine.id : null });
        }
        const item = byTest.get(key);
        const retries = Math.max(0, (test.attempts || 1) - 1);
        item.runs++;
        if (test.status === 'failed') item.failedRuns++;
        if (test.flaky) {
          item.flakyRuns++;
          if (!item.lastFlaky || date > item.lastFlaky) item.lastFlaky = date;
        }
        item.retries += retries;
        // Only the last attempt's duration is recorded, so earlier attempts are assumed to take as long.
        item.lostMs += retries * (test.durationMs || 0);
      }
    }
  }
  const tests = [...byTest.values()]
    .filter((item) => item.flakyRuns > 0)
    .map((item) => ({ ...item, flakeRate: Math.round((item.flakyRuns / item.runs) * 1000) / 10 }))
    .sort((a, b) => b.flakyRuns - a.flakyRuns || b.flakeRate - a.flakeRate);
  const all = [...byTest.values()];
  return {
    nights: nights.length,
    retries: all.reduce((n, item) => n + item.retries, 0),
    lostMs: all.reduce((n, item) => n + item.lostMs, 0),
    candidates: tests.filter((item) => !item.quarantine && item.flakyRuns >= FLAKY.minFlakyRuns && item.flakeRate > FLAKY.minRate * 100),
    tests: tests.slice(0, FLAKY.maxRows)
  };
}

module.exports = { knownIssuesReport, flakyReport, entryStatus, FLAKY };
