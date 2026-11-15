// Unit tests for the E7 system-under-test versions and how run data and the day file carry them. Run: npm run test:triage
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { collectVersions, extractBuildInfo, findScripts, describeVersions } = require('../collect-versions');
const { buildRunData, versionsRecord } = require('../build-run-data');
const { buildDay, runBuilds, buildChanges } = require('../build-day');

const SHA_A = 'cf3932855a9a1f053d68c4ab73f090dc880ff304';
const SHA_B = '8046368253c211f3ba6f974daeab95d9dbb5de7b';
const BUNDLE = `var e={ALLUSERSPROFILE:"C:\\\\x",SECRET_THING:"do-not-store",BUILD_TIME:"2026-11-04T15:41Z",GITHUB_SHA:"${SHA_A}",GITHUB_RUN_NUMBER:"843",GITHUB_REF_NAME:"main",GITHUB_REPOSITORY:"BY-Product-Development/plan-sop-planning-mfe",COMMIT_HASH:""};`;
const PAGE = '<html><head><script type="module" src="/s1/x/1-ps-mfe/env.js"></script><script type="module" crossorigin src="/s1/x/1-ps-mfe/ps-bundle.ClX0GxMm.js"></script></head></html>';
const CONFIG = { environments: { INTEROP: { apps: [{ key: 'planning-mfe', url: 'https://static.example.test/s1/x/1-ps-mfe/' }] } } };
const SERVICES = [{ key: 'planning-mfe', name: 'Planning Space UI', repo: 'plan-sop-planning-mfe' }];

function response(status, text = '', location = null) {
  return { status, ok: status >= 200 && status < 300, text: async () => text, headers: { get: (name) => (name === 'location' ? location : null) } };
}

function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const key = Object.keys(routes).find((part) => url.includes(part));
    const entry = key ? routes[key] : response(404);
    return typeof entry === 'function' ? entry(url) : entry;
  };
  return { impl, calls };
}

const collect = (fetchImpl, extra = {}) => collectVersions({ environment: 'INTEROP', config: CONFIG, services: SERVICES, fetchImpl, sleep: async () => {}, now: () => new Date('2026-11-05T19:00:00Z'), ...extra });

test('versions: only the whitelisted build fields are read, and only when they look right', () => {
  assert.deepEqual(extractBuildInfo(BUNDLE), { sha: SHA_A, buildTime: '2026-11-04T15:41Z', runNumber: 843, ref: 'main', repository: 'BY-Product-Development/plan-sop-planning-mfe' });
  assert.equal(extractBuildInfo('GITHUB_SHA:"not-a-sha",BUILD_TIME:"2026-11-04T15:41Z"'), null, 'no valid SHA, no build');
  const odd = extractBuildInfo(`GITHUB_SHA:"${SHA_B}",GITHUB_REF_NAME:"main; rm -rf /",GITHUB_RUN_NUMBER:"x"`);
  assert.deepEqual(odd, { sha: SHA_B }, 'malformed fields are dropped');
  assert.doesNotMatch(JSON.stringify(extractBuildInfo(BUNDLE)), /SECRET|ALLUSERS/);
});

test('versions: scripts from another host or over http are never picked', () => {
  const page = '<script src="https://169.254.169.254/latest/x.js"></script><script src="http://static.example.test/s1/x/1-ps-mfe/plain.js"></script>'
    + '<script src="//evil.example/ps-bundle.A1.js"></script>' + PAGE;
  assert.deepEqual(findScripts(page, 'https://static.example.test/s1/x/1-ps-mfe/'), ['https://static.example.test/s1/x/1-ps-mfe/ps-bundle.ClX0GxMm.js']);
  assert.deepEqual(findScripts(PAGE, 'http://static.example.test/s1/x/1-ps-mfe/'), [], 'an http app page yields nothing');
});

test('versions: relative scripts resolve against the page a redirect lands on', async () => {
  const { impl, calls } = fakeFetch({
    '/new/1-ps-mfe/assets/index-Ab1.js': response(200, BUNDLE),
    '/old': response(301, '', '/new/1-ps-mfe/'),
    '/new/1-ps-mfe/': response(200, '<script type="module" src="./assets/index-Ab1.js"></script>')
  });
  const versions = await collectVersions({ environment: 'INTEROP', config: { environments: { INTEROP: { apps: [{ key: 'planning-mfe', url: 'https://static.example.test/old' }] } } }, services: SERVICES, fetchImpl: impl, sleep: async () => {} });
  assert.equal(versions.apps[0].ok, true);
  assert.equal(versions.apps[0].bundle, 'https://static.example.test/new/1-ps-mfe/assets/index-Ab1.js');
  assert.ok(!calls.some((call) => call.url === 'https://static.example.test/assets/index-Ab1.js'), 'not resolved against the configured URL');
});

test('versions: redirects are followed only within the app origin', async () => {
  const sameOrigin = fakeFetch({
    'ps-bundle': response(200, BUNDLE),
    '1-ps-mfe/old': response(301, '', '/s1/x/1-ps-mfe/'),
    '1-ps-mfe/': response(200, PAGE)
  });
  const moved = await collectVersions({ environment: 'INTEROP', config: { environments: { INTEROP: { apps: [{ key: 'planning-mfe', url: 'https://static.example.test/s1/x/1-ps-mfe/old' }] } } }, services: SERVICES, fetchImpl: sameOrigin.impl, sleep: async () => {} });
  assert.equal(moved.apps[0].ok, true);
  assert.ok(sameOrigin.calls.every((call) => call.init.redirect === 'manual'));

  const away = fakeFetch({ '1-ps-mfe/': response(302, '', 'https://169.254.169.254/latest/meta-data/') });
  const refused = await collect(away.impl);
  assert.deepEqual([refused.apps[0].ok, refused.apps[0].error], [false, 'page: refused redirect outside https://static.example.test']);
  assert.ok(away.calls.every((call) => call.url.startsWith('https://static.example.test/')), 'the other host is never requested');

  const loop = fakeFetch({ '1-ps-mfe/': response(302, '', '/s1/x/1-ps-mfe/') });
  assert.equal((await collect(loop.impl)).apps[0].error, 'page: too many redirects');
});

test('versions: bundle scripts come first and env.js is skipped', () => {
  const scripts = findScripts('<script src="./vendor.js"></script>' + PAGE, 'https://static.example.test/s1/x/1-ps-mfe/');
  assert.deepEqual(scripts, ['https://static.example.test/s1/x/1-ps-mfe/ps-bundle.ClX0GxMm.js', 'https://static.example.test/s1/x/1-ps-mfe/vendor.js']);
});

test('versions: reads the build from the app page and names it from the service map', async () => {
  const { impl, calls } = fakeFetch({ 'ps-bundle': response(200, BUNDLE), '1-ps-mfe/': response(200, PAGE) });
  const versions = await collect(impl);
  assert.equal(versions.environment, 'INTEROP');
  assert.equal(versions.apps.length, 1);
  const [app] = versions.apps;
  assert.equal(app.ok, true);
  assert.equal(app.sha, SHA_A);
  assert.equal(app.name, 'Planning Space UI');
  assert.equal(app.repo, 'plan-sop-planning-mfe');
  assert.match(app.bundle, /ps-bundle\.ClX0GxMm\.js$/);
  assert.ok(calls.every((call) => call.init.method === 'GET' && !(call.init.headers && call.init.headers.Authorization)), 'read-only, no token');
  assert.equal(describeVersions(versions), 'planning-mfe cf39328 (2026-11-04)');
});

test('versions: failure paths are recorded, not thrown (page 404, timeout, no bundle, no build info)', async () => {
  const notFound = await collect(fakeFetch({ '1-ps-mfe/': response(404) }).impl);
  assert.deepEqual([notFound.apps[0].ok, notFound.apps[0].error], [false, 'page: HTTP 404']);

  const timeout = async () => { const err = new Error('aborted'); err.name = 'TimeoutError'; throw err; };
  const slow = await collect(fakeFetch({ '1-ps-mfe/': timeout }).impl);
  assert.equal(slow.apps[0].error, 'page: timeout');

  const noScripts = await collect(fakeFetch({ '1-ps-mfe/': response(200, '<html></html>') }).impl);
  assert.equal(noScripts.apps[0].error, 'no script bundle on the page');

  const noInfo = await collect(fakeFetch({ 'ps-bundle': response(200, 'var a=1;'), '1-ps-mfe/': response(200, PAGE) }).impl);
  assert.deepEqual([noInfo.apps[0].ok, noInfo.apps[0].error, noInfo.apps[0].sha], [false, 'no build information in the bundle', undefined]);
  assert.match(describeVersions(noInfo), /planning-mfe unknown/);
});

test('versions: a 5xx is retried once, an environment without apps says so', async () => {
  let pageCalls = 0;
  const { impl } = fakeFetch({ 'ps-bundle': response(200, BUNDLE), '1-ps-mfe/': () => (++pageCalls === 1 ? response(503) : response(200, PAGE)) });
  assert.equal((await collect(impl)).apps[0].ok, true);
  assert.equal(pageCalls, 2);
  const qa = await collect(impl, { environment: 'QA' });
  assert.deepEqual(qa.apps, []);
  assert.match(qa.note, /no apps configured for QA/);
});

test('run data: versions are copied field by field; a bad SHA is dropped', () => {
  const record = versionsRecord({ collectedAt: 'x', apps: [{ key: 'lui', ok: true, sha: SHA_B, extra: 'drop', buildTime: '2026-09-29T13:38Z' }, { key: 'planning-mfe', ok: true, sha: 'bad' }] });
  assert.equal(record.apps[0].sha, SHA_B);
  assert.equal(record.apps[0].extra, undefined);
  assert.equal(record.apps[1].sha, null);
  assert.equal(versionsRecord(null), null);
  assert.equal(versionsRecord({ apps: 'nope' }), null);
});

test('run data: a run with no test results keeps its probe and builds and lands on the probe night', () => {
  const data = buildRunData({
    tests: [],
    history: {},
    registry: { knownIssues: [], quarantine: [], expired: [] },
    reportIndex: new Map(),
    verdict: { verdict: 'BROKEN', red: true, headline: 'no test results', mode: 'report', passRate: 0 },
    envHealth: { healthy: false, checkedAt: '2026-11-05T22:01:00.000Z', failed: ['po-gateway'], checks: [] },
    versions: { collectedAt: '2026-11-05T22:01:05.000Z', apps: [{ key: 'lui', ok: true, sha: SHA_B }] },
    meta: { suite: 'S1', runNumber: 7 }
  });
  assert.equal(data.date, '2026-11-05');
  assert.deepEqual(data.tests, []);
  assert.equal(data.envHealth.healthy, false);
  assert.equal(data.versions.apps[0].sha, SHA_B);
});

test('day file: builds per suite, new builds since the previous night, and the probe result', async () => {
  assert.deepEqual(runBuilds({ versions: { apps: [{ key: 'lui', ok: false }, { key: 'planning-mfe', ok: true, sha: SHA_A, repository: 'o/r' }] } }).map((build) => build.key), ['planning-mfe']);
  assert.deepEqual(buildChanges([{ key: 'planning-mfe', name: 'P', sha: SHA_A }], { builds: { 'planning-mfe': SHA_B } }), [{ key: 'planning-mfe', name: 'P', from: SHA_B, to: SHA_A }]);
  assert.deepEqual(buildChanges([{ key: 'planning-mfe', sha: SHA_A }], { builds: { 'planning-mfe': SHA_A } }), []);
  assert.deepEqual(buildChanges([{ key: 'planning-mfe', sha: SHA_A }], null), [], 'no previous night, nothing to compare');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-versions-'));
  const saved = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  const suitesConfig = { suites: [{ key: 'S1', label: 'Suite 1' }] };
  const runOn = (date, sha, extra = {}) => {
    fs.mkdirSync(path.join(dir, 'runs', date), { recursive: true });
    const data = { suite: 'S1', runNumber: 1, trigger: 'schedule', totals: { total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, flaky: 0 }, tests: [],
      verdict: { verdict: 'BROKEN', red: true, headline: 'no test results' },
      versions: { apps: [{ key: 'planning-mfe', name: 'Planning Space UI', ok: true, sha, repository: 'BY-Product-Development/plan-sop-planning-mfe', buildTime: '2026-11-04T15:41Z' }] }, ...extra };
    fs.writeFileSync(path.join(dir, 'runs', date, 'S1__1.json'), JSON.stringify(data));
  };
  runOn('2026-11-04', SHA_B);
  await buildDay({ dataDir: dir, date: '2026-11-04', now: Date.parse('2026-11-04T23:45:00Z'), suitesConfig, manualNoise: [] });
  runOn('2026-11-05', SHA_A, { envHealth: { healthy: false, failed: ['po-gateway'] } });
  const { day } = await buildDay({ dataDir: dir, date: '2026-11-05', now: Date.parse('2026-11-05T23:45:00Z'), suitesConfig, manualNoise: [] });
  if (saved) process.env.GITHUB_TOKEN = saved;

  const [suite] = day.suites;
  assert.equal(suite.status, 'reported', 'a zero-result run is reported (as broken), not missing');
  assert.equal(suite.builds[0].sha, SHA_A);
  assert.deepEqual(suite.buildChanges.map((change) => [change.key, change.from, change.to]), [['planning-mfe', SHA_B, SHA_A]]);
  assert.deepEqual(suite.envHealth, { healthy: false, failed: ['po-gateway'], error: null });
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf-8'));
  assert.deepEqual(index.days[0].suites.S1.builds, { 'planning-mfe': SHA_A });
});
