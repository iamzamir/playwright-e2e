// Page 4 (plan §9.1): one compact row per test over the last 30 nights, oldest night first.
const { serviceFor } = require('./registry');

const CATEGORY_CODES = {
  ENVIRONMENT_ISSUE: 'E',
  PRODUCT_DEFECT: 'P',
  TEST_DATA_ISSUE: 'T',
  AUTOMATION_ISSUE: 'A',
  TO_INVESTIGATE: 'I',
  KNOWN_ISSUE: 'K',
  FLAKY: 'Q'
};

// P passed, R passed on retry, F failed, B blocked, S skipped, - not run that night.
function statusCode(test) {
  if (test.status === 'passed') return test.flaky ? 'R' : 'P';
  if (test.status === 'failed') return 'F';
  if (test.status === 'blocked') return 'B';
  if (test.status === 'skipped') return 'S';
  return '-';
}

/**
 * nights: [{ date, runs, clusters }] oldest first; runs are the selected run per suite, clusters the night's groups.
 * Returns { nights: [dates], services: { key: name }, tests: [{ suite, spec, name, service, s, d, c }] } where s and c
 * have one character per night and d holds durations in seconds (null when the test did not run).
 */
function buildTestHistory({ nights, services = [] }) {
  const rows = new Map();
  const serviceNames = {};
  nights.forEach(({ runs, clusters }, index) => {
    const categories = new Map();
    for (const cluster of clusters || []) {
      for (const test of cluster.tests || []) categories.set(`${test.suite}|${test.spec}|${test.name}`, CATEGORY_CODES[cluster.category] || '.');
    }
    for (const run of runs) {
      for (const test of run.tests || []) {
        const key = `${run.suite}|${test.spec}|${test.name}`;
        if (!rows.has(key)) {
          const service = serviceFor(services, { spec: test.spec });
          if (service) serviceNames[service.key] = service.name;
          rows.set(key, { suite: run.suite, spec: test.spec, name: test.name, service: service ? service.key : null, s: Array(nights.length).fill('-'), d: Array(nights.length).fill(null), c: Array(nights.length).fill('.') });
        }
        const row = rows.get(key);
        row.s[index] = statusCode(test);
        row.d[index] = typeof test.durationMs === 'number' ? Math.round(test.durationMs / 1000) : null;
        if (test.status === 'failed') row.c[index] = categories.get(key) || '.';
      }
    }
  });
  const failures = (row) => (row.s.match(/F/g) || []).length * 2 + (row.s.match(/R/g) || []).length;
  const tests = [...rows.values()]
    .map((row) => ({ ...row, s: row.s.join(''), c: row.c.join('') }))
    .sort((a, b) => failures(b) - failures(a) || a.suite.localeCompare(b.suite) || a.name.localeCompare(b.name));
  return { nights: nights.map((night) => night.date), services: serviceNames, tests };
}

module.exports = { buildTestHistory, statusCode, CATEGORY_CODES };
