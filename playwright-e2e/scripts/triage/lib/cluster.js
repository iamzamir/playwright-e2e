const crypto = require('crypto');
const path = require('path');
const { classify, endpointKey, crossEnvironment, isNoise } = require('./classify');
const { errorSignature } = require('./allure-results');
const { serviceFor } = require('./registry');

const CATEGORY_ORDER = ['ENVIRONMENT_ISSUE', 'PRODUCT_DEFECT', 'TEST_DATA_ISSUE', 'AUTOMATION_ISSUE', 'TO_INVESTIGATE', 'KNOWN_ISSUE', 'FLAKY'];
const CONFIDENCE_ORDER = ['low', 'medium', 'high'];
// 15%: a background error such as the VARIANTMASTERs 404 showed up in 11 of 58 logged failures (19%).
const WIDESPREAD = { minTests: 5, minSignatures: 3, minShare: 0.15 };
const GENERIC_ASSERTION = /^(Error:\s*)?expect\(received\)\.\w+\(/;
const DATA_SETUP_SPEC = /(^|\/)DataSetupBatch\//;
// Plan §7.2: an error seen on 5% or more of passing UI tests happens on healthy pages, so it never explains a failure.
const BACKGROUND = { minShare: 0.05, minTests: 3 };
// A widespread 5xx / no-response error that none of tonight's passing UI tests hit is a shared cause, not background
// (2026-11-04: GET 500 /assumptions/v1/assumption/{id} right after launching an assumption context, in 19 failures and
// 0 of 368 passing tests). Needs enough passing tests for "never seen" to mean something.
const FAILING_ONLY_MIN_PASSED = 50;
// Error thrown in an anonymous test body: the frame is the spec itself (no function name).
const SPEC_FRAME = /^tests\//;
// A gateway outage during one suite run: 502/503/504 or no-response errors decide many failures across several API
// areas (2026-11-09: PS UI Gravitee had 13 such failures over 11 areas, each its own one-test group). One run is the
// time window, since run data keeps no clock time for HTTP errors.
const GATEWAY_BURST = { minTests: 5, minAreas: 3 };
const ENV_PREFIX = /^\/cbp\/[^/]+\//;

// Adds up run / day network baselines ({ passedTests, errors: { key: tests } }); nulls (API suites) are skipped.
function mergeBaselines(baselines) {
  const merged = { passedTests: 0, errors: {} };
  for (const baseline of baselines) {
    if (!baseline) continue;
    merged.passedTests += baseline.passedTests || 0;
    for (const [key, tests] of Object.entries(baseline.errors || {})) merged.errors[key] = (merged.errors[key] || 0) + tests;
  }
  return merged;
}

function findBackgroundErrors(baselines) {
  const { passedTests, errors } = mergeBaselines(baselines);
  if (!passedTests) return [];
  return Object.entries(errors)
    .filter(([, tests]) => tests >= BACKGROUND.minTests && tests / passedTests >= BACKGROUND.minShare)
    .map(([key, tests]) => ({ key, tests, passedTests, share: Math.round((tests / passedTests) * 1000) / 10 }))
    .sort((a, b) => b.tests - a.tests);
}

// API area of an endpoint: its first two path segments, after the /cbp/<environment>/ prefix
// (/lui/notification/v1/… → lui/notification, /cbp/interop/foundation/model/v1/… → foundation/model).
function apiArea(endpoint) {
  return String(endpoint || '').replace(ENV_PREFIX, '/').split('/').filter(Boolean).slice(0, 2).join('/');
}

// Runs whose gateway-decided failures form a burst: Map run → { tests, areas }.
function findGatewayBursts(classified) {
  const perRun = new Map();
  for (const item of classified) {
    if (item.classification.category !== 'ENVIRONMENT_ISSUE' || !item.classification.gateway) continue;
    if (!perRun.has(item.run)) perRun.set(item.run, { tests: 0, areas: new Set() });
    const entry = perRun.get(item.run);
    entry.tests++;
    const cause = item.classification.cause;
    if (cause && cause.endpoint) entry.areas.add(apiArea(cause.endpoint));
  }
  for (const [run, entry] of perRun) {
    if (entry.tests < GATEWAY_BURST.minTests || entry.areas.size < GATEWAY_BURST.minAreas) perRun.delete(run);
  }
  return perRun;
}

function burstGroup(run, burst) {
  const where = run.label || run.suite;
  const areas = [...burst.areas].sort();
  return {
    key: `gateway-burst:${run.suite}`,
    title: `Gateway errors across ${areas.length} API areas during ${where}`,
    reason: `Part of a gateway outage during this run: ${burst.tests} failures got 502/503/504 or no response from ${areas.length} API areas (${areas.slice(0, 6).join(', ')}${areas.length > 6 ? ', …' : ''})`
  };
}

function shortHash(text) {
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);
}

function locationLabel(location) {
  if (!location) return '';
  return location.function ? `${location.file} › ${location.function}` : location.file;
}

/**
 * HTTP errors that show up across many unrelated failures in one night are background noise for explaining
 * individual tests (e.g. a widget call failing on every page). They are reported once as their own findings.
 */
function findWidespreadErrors(failures, manualNoise = [], baseline = null) {
  const withLogs = failures.filter((item) => (item.test.httpErrors || []).length);
  const byKey = new Map();
  for (const item of withLogs) {
    for (const error of item.test.httpErrors) {
      if (isNoise(error)) continue;
      const key = endpointKey(error);
      if (!byKey.has(key)) byKey.set(key, { key, error, tests: new Set(), signatures: new Set(), suites: new Set(), environments: new Set() });
      const entry = byKey.get(key);
      entry.tests.add(`${item.run.suite}|${item.test.id}`);
      entry.signatures.add(item.test.signature);
      entry.suites.add(item.run.suite);
      if (item.run.environment) entry.environments.add(item.run.environment);
    }
  }

  const manual = manualNoise.map((entry) => ({ ...entry, regex: new RegExp(entry.endpointRegex || '^$') }));
  const findings = [];
  for (const entry of byKey.values()) {
    const share = withLogs.length ? entry.tests.size / withLogs.length : 0;
    const manualMatch = manual.find((noise) => (!noise.method || noise.method === entry.error.method)
      && (!noise.status || Number(noise.status) === entry.error.status) && noise.regex.test(entry.error.endpoint));
    const widespread = entry.tests.size >= WIDESPREAD.minTests && entry.signatures.size >= WIDESPREAD.minSignatures && share >= WIDESPREAD.minShare;
    if (!widespread && !manualMatch) continue;
    findings.push({
      key: entry.key,
      method: entry.error.method,
      status: entry.error.status,
      endpoint: entry.error.endpoint,
      host: entry.error.host,
      tests: entry.tests.size,
      share: Math.round(share * 100),
      signatures: entry.signatures.size,
      suites: [...entry.suites],
      crossEnvironment: [...entry.environments].some((environment) => crossEnvironment(entry.error.endpoint, environment)),
      knownNoise: manualMatch ? { reason: manualMatch.reason || null, owner: manualMatch.owner || null } : null,
      failingOnly: !manualMatch && failingOnly(entry.error, entry.key, baseline),
      sample: { requestId: entry.error.requestId, body: entry.error.body }
    });
  }
  return findings.sort((a, b) => b.tests - a.tests);
}

function failingOnly(error, key, baseline) {
  if (!baseline || (baseline.passedTests || 0) < FAILING_ONLY_MIN_PASSED) return false;
  if (!(error.status >= 500 || error.failure)) return false;
  return !(baseline.errors || {})[key];
}

// Twin specs (e.g. LinkManagement Test_005 / Test_007) fail the same way in their test bodies; grouping by the spec
// folder keeps them in one group, while page-object frames still group by method.
function locationKey(location) {
  if (!location) return '';
  if (!location.function && SPEC_FRAME.test(location.file || '')) return `${path.posix.dirname(location.file)}/*:`;
  return `${location.file}:${location.function || ''}`;
}

function clusterKey(test, classification) {
  if (classification.category === 'KNOWN_ISSUE') return `known:${test.knownIssue.id}`;
  if (classification.group) return `${classification.category}|${classification.group.key}`;
  if (classification.byCause && classification.cause) {
    return `${classification.category}|${endpointKey(classification.cause)}`;
  }
  const location = locationKey(test.error && test.error.location);
  // Bare assertions (e.g. expect(x).toBeTruthy()) say nothing on their own; the failed check step does.
  // Re-normalised here so run data written by older versions groups the same way.
  const detail = errorSignature(GENERIC_ASSERTION.test(test.signature || '') && test.failedStep ? test.failedStep : test.signature);
  return `${classification.category}|${detail}|${location}`;
}

function clusterTitle(test, classification) {
  if (classification.category === 'KNOWN_ISSUE') return test.knownIssue.title;
  if (classification.group) return classification.group.title;
  const cause = classification.cause;
  if (classification.byCause && cause) {
    return `${cause.status || cause.failure} on ${cause.method} ${cause.endpoint}`;
  }
  const firstLine = String((test.error && test.error.message) || 'Unknown error').split('\n')[0].replace(/^Error:\s*/, '').slice(0, 140);
  const headline = GENERIC_ASSERTION.test(firstLine) && test.failedStep ? `Check failed: ${test.failedStep.slice(0, 140)}` : firstLine;
  const location = test.error && test.error.location && test.error.location.function;
  return location ? `${headline} (in ${location})` : headline;
}

/**
 * Classifies every failed test of the night's runs and groups them into root-cause clusters.
 * @param runs list of run data objects (build-run-data.js output)
 * @returns { clusters, widespread, flaky }
 */
function clusterFailures(runs, { manualNoise = [], background = [], services = [], baseline = null } = {}) {
  const failures = [];
  for (const run of runs) {
    for (const test of run.tests) {
      if (test.status === 'failed') failures.push({ run, test });
    }
  }
  const widespread = findWidespreadErrors(failures, manualNoise, baseline);
  const failingOnlyKeys = new Set(widespread.filter((finding) => finding.failingOnly).map((finding) => finding.key));
  // Tonight's passing tests outrank the 14-night background list: an error none of them hit is not background tonight.
  const ambient = new Set([...widespread.map((finding) => finding.key), ...background.map((item) => item.key)].filter((key) => !failingOnlyKeys.has(key)));

  // DataSetup runs before the UI specs, so its failure can explain missing views, scenarios or mappings later in the run.
  const dataSetupReason = new Map();
  for (const run of runs) {
    const setup = run.tests.find((test) => test.status === 'failed' && DATA_SETUP_SPEC.test(test.spec || ''));
    if (!setup) continue;
    const detail = setup.failedStep || String((setup.error && setup.error.message) || '').split('\n')[0];
    dataSetupReason.set(run, `DataSetup failed earlier in this run (${path.basename(setup.spec)}): ${detail.slice(0, 120)}`);
  }

  const classified = failures.map(({ run, test }) => ({ run, test, classification: classify(test, { environment: run.environment }, ambient) }));
  const bursts = findGatewayBursts(classified);

  const clusters = new Map();
  for (const { run, test, classification } of classified) {
    const burst = bursts.get(run);
    if (burst && classification.category === 'ENVIRONMENT_ISSUE' && classification.gateway) {
      const group = burstGroup(run, burst);
      classification.group = { key: group.key, title: group.title };
      classification.confidence = 'high';
      classification.reasons = [group.reason, ...classification.reasons];
    }
    if (classification.byCause && failingOnlyKeys.has(endpointKey(classification.cause))) {
      classification.reasons = [...classification.reasons, `Seen in many failures tonight but on none of the ${baseline.passedTests} passing UI tests`];
    }
    const setupReason = dataSetupReason.get(run);
    if (setupReason && !DATA_SETUP_SPEC.test(test.spec || '') && classification.category === 'TEST_DATA_ISSUE') {
      classification.reasons = [...classification.reasons, setupReason];
    }
    const key = clusterKey(test, classification);
    if (!clusters.has(key)) {
      clusters.set(key, {
        id: shortHash(key),
        title: clusterTitle(test, classification),
        category: classification.category,
        confidence: classification.confidence,
        reasons: [],
        cause: classification.cause || null,
        // A gateway burst spans many services, so no single one is named.
        service: classification.group && classification.group.key.startsWith('gateway-burst:') ? null
          : serviceFor(services, { endpoint: classification.cause && classification.cause.endpoint, spec: test.spec }),
        location: locationLabel(test.error && test.error.location),
        knownIssue: test.knownIssue || null,
        counts: { failed: 0, blocked: 0 },
        suites: new Set(),
        environments: new Set(),
        gateways: new Set(),
        kinds: {},
        tests: []
      });
    }
    const cluster = clusters.get(key);
    if (CONFIDENCE_ORDER.indexOf(classification.confidence) < CONFIDENCE_ORDER.indexOf(cluster.confidence)) cluster.confidence = classification.confidence;
    // Per-test timing stays on the test; the cluster lists each reason once.
    for (const reason of classification.reasons.map((text) => text.replace(/ -?\d+s before the failure/, ''))) {
      if (cluster.reasons.length < 3 && !cluster.reasons.includes(reason)) cluster.reasons.push(reason);
    }
    const blocked = run.tests.filter((other) => (other.blockedById ? other.blockedById === test.id : other.blockedBy === test.name && other.spec === test.spec)).length;
    cluster.counts.failed++;
    cluster.counts.blocked += blocked;
    cluster.suites.add(run.suite);
    if (run.environment) cluster.environments.add(run.environment);
    if (run.gateway) cluster.gateways.add(run.gateway);
    cluster.kinds[test.kind] = (cluster.kinds[test.kind] || 0) + 1;
    cluster.tests.push({
      suite: run.suite,
      environment: run.environment,
      gateway: run.gateway,
      spec: test.spec,
      name: test.name,
      kind: test.kind,
      last7: test.last7,
      attempts: test.attempts || 1,
      blocked,
      reasons: classification.reasons,
      error: test.error,
      failedStep: test.failedStep,
      stepTrail: test.stepTrail,
      httpErrors: test.httpErrors,
      apiCalls: test.apiCalls,
      links: test.links
    });
  }

  const list = [...clusters.values()].map((cluster) => ({
    ...cluster,
    suites: [...cluster.suites],
    environments: [...cluster.environments],
    gateways: [...cluster.gateways]
  }));
  list.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || b.counts.failed - a.counts.failed);

  const flaky = [];
  for (const run of runs) {
    for (const test of run.tests) {
      if (test.flaky) flaky.push({ suite: run.suite, spec: test.spec, name: test.name, attempts: test.attempts || 2 });
    }
  }
  return { clusters: list, widespread, flaky };
}

module.exports = { clusterFailures, findWidespreadErrors, findBackgroundErrors, findGatewayBursts, mergeBaselines, clusterKey, apiArea, GATEWAY_BURST, CATEGORY_ORDER };
