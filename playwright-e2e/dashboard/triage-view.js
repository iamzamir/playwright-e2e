/* What the Triage page shows, as plain functions over a night's data, so they can be unit tested without a browser.
 * Loaded by index.html before app.js (window.TriageView) and by scripts/triage/tests/dashboard.test.js (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TriageView = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TRACKED = new Set(['KNOWN_ISSUE', 'FLAKY']);
  const GATEWAYS = { AZURE: 'Azure', GRAVITEE: 'Gravitee' };

  function isTracked(cluster) {
    return TRACKED.has(cluster.category);
  }

  // Failing nearly every night for two weeks or more (build-day.js sets longRunning) and not already tracked.
  function isLongRunning(cluster) {
    return Boolean(cluster.longRunning) && !isTracked(cluster);
  }

  // A person still has to look at it: not tracked, and nobody confirmed or reclassified it on its triage issue.
  function needsDecision(cluster) {
    if (isTracked(cluster)) return false;
    const triage = cluster.triage;
    return !(triage && (triage.decision === 'confirmed' || triage.reclassified));
  }

  // Its triage issue was closed, yet the group failed again: the issue needs reopening (the sync never reopens one).
  function isFailingAgain(cluster) {
    return !isTracked(cluster) && Boolean(cluster.triage && cluster.triage.state === 'closed');
  }

  function impact(cluster) {
    return cluster.counts.failed + cluster.counts.blocked;
  }

  // New failures first, then groups failing again on a closed issue, then groups still waiting on a decision, then by
  // how many tests they take down.
  function byPriority(clusters) {
    return clusters.slice().sort((a, b) => Number(b.trend === 'new') - Number(a.trend === 'new')
        || Number(isFailingAgain(b)) - Number(isFailingAgain(a))
        || Number(needsDecision(b)) - Number(needsDecision(a))
        || impact(b) - impact(a)
        || String(a.title).localeCompare(String(b.title)));
  }

  // The page's main list: what isn't already tracked or long-running, or all of one category when a filter is on.
  function actionQueue(clusters, filter) {
    return byPriority(clusters.filter((cluster) => (filter ? cluster.category === filter : !isTracked(cluster) && !isLongRunning(cluster))));
  }

  // Long-running groups, longest first, then by tests affected: each needs a fix or a known-issue entry, not a fresh look.
  function longRunningQueue(clusters) {
    return clusters.filter(isLongRunning).sort((a, b) => String(a.firstSeen).localeCompare(String(b.firstSeen))
      || impact(b) - impact(a)
      || String(a.title).localeCompare(String(b.title)));
  }

  function nightSummary(day) {
    const clusters = day.clusters || [];
    const suites = day.suites || [];
    const categories = day.categories || {};
    const failed = clusters.reduce((n, cluster) => n + cluster.counts.failed, 0);
    const uninvestigated = categories.TO_INVESTIGATE || 0;
    return {
      failed,
      blocked: clusters.reduce((n, cluster) => n + cluster.counts.blocked, 0),
      groups: clusters.length,
      newGroups: clusters.filter((cluster) => cluster.trend === 'new' && !isTracked(cluster)).length,
      waiting: clusters.filter((cluster) => needsDecision(cluster) && !isLongRunning(cluster)).length,
      longRunning: clusters.filter(isLongRunning).length,
      failingAgain: clusters.filter(isFailingAgain).length,
      tracked: clusters.filter(isTracked).length,
      explainedPct: failed ? Math.round((100 * (failed - uninvestigated)) / failed) : null,
      reported: suites.filter((suite) => suite.status === 'reported').length,
      broken: suites.filter((suite) => suite.status === 'reported' && suite.verdict === 'BROKEN').length,
      notReported: suites.filter((suite) => suite.status === 'missing' || suite.status === 'no-data').length,
      pending: suites.filter((suite) => suite.status === 'pending' || suite.status === 'running').length
    };
  }

  function count(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
  }

  // The one sentence the page opens with: what deserves attention first.
  function nightHeadline(summary) {
    if (!summary.reported && !summary.notReported) return 'Waiting for suites to report';
    if (summary.newGroups) return `${count(summary.newGroups, 'new failure group')} to look at`;
    if (summary.broken) return `${count(summary.broken, 'broken run')} to look at`;
    if (summary.notReported) return `${count(summary.notReported, 'suite')} did not report`;
    if (summary.failingAgain) return `No new failures · ${count(summary.failingAgain, 'group')} failing again on a closed issue`;
    if (summary.waiting) return `No new failures · ${count(summary.waiting, 'group')} waiting on a decision`;
    if (summary.longRunning) return `No new failures · ${count(summary.longRunning, 'long-running group')} still failing`;
    // Suites still to come: the night isn't clear yet, whatever the finished ones say.
    const still = summary.pending ? ` · ${count(summary.pending, 'suite')} still to report` : '';
    if (summary.failed) return summary.pending ? `Only known failures so far${still}` : 'Only known failures tonight';
    return summary.pending ? `No failures so far${still}` : 'All clear';
  }

  // Suites side by side per area and environment: one tile for "PO Backend · QA" with its Azure and Gravitee runs.
  function groupSuites(suites) {
    const groups = new Map();
    for (const suite of suites || []) {
      const title = [suite.area, suite.environment].filter(Boolean).join(' · ') || suite.label || suite.key;
      if (!groups.has(title)) groups.set(title, { title, suites: [] });
      groups.get(title).suites.push(suite);
    }
    return [...groups.values()];
  }

  function suiteShortName(suite) {
    return GATEWAYS[suite.gateway] || suite.gateway || String(suite.label || suite.key).split(' · ')[0];
  }

  // "run broken: only 63 tests ran (usually 90) · 30 passed…" → "only 63 tests ran (usually 90)".
  function brokenReason(suite) {
    if (suite.verdict !== 'BROKEN') return null;
    const match = String(suite.headline || '').match(/run broken:\s*([^·]+?)\s*(?:·|$)/);
    return match ? match[1] : null;
  }

  // The builds a tile's runs tested, once each even when both gateways tested the same one.
  function groupBuilds(suites) {
    const builds = new Map();
    for (const suite of suites) {
      const changed = new Set((suite.buildChanges || []).map((change) => change.key));
      for (const build of suite.builds || []) {
        const id = `${build.key}:${build.sha}`;
        const entry = builds.get(id) || { build, changed: false };
        entry.changed = entry.changed || changed.has(build.key);
        builds.set(id, entry);
      }
    }
    return [...builds.values()];
  }

  // "PO Backend QA (Azure, Gravitee), PS UI INTEROP (Azure)": a group's suites in the space of one line.
  function compactSuites(keys, suites) {
    const byKey = new Map((suites || []).map((suite) => [suite.key, suite]));
    const groups = new Map();
    for (const key of keys || []) {
      const suite = byKey.get(key);
      const title = suite ? [suite.area, suite.environment].filter(Boolean).join(' ') || suite.label || key : key;
      if (!groups.has(title)) groups.set(title, []);
      if (suite && suite.gateway) groups.get(title).push(suiteShortName(suite));
    }
    return [...groups.entries()].map(([title, names]) => (names.length ? `${title} (${names.join(', ')})` : title)).join(', ');
  }

  // Pass rates of the last `nights` nights up to `date`, oldest first. index.json lists nights newest first.
  function passRateSeries(days, date, nights = 14) {
    const list = days || [];
    const start = list.findIndex((day) => day.date === date);
    if (start < 0) return [];
    return list.slice(start, start + nights)
      .filter((day) => typeof day.passRate === 'number')
      .map((day) => ({ date: day.date, passRate: day.passRate }))
      .reverse();
  }

  // Polyline points for the series, leaving `pad` pixels around it so the end marker isn't clipped.
  function sparklinePoints(series, width, height, pad = 4) {
    if (series.length < 2) return [];
    const rates = series.map((point) => point.passRate);
    const min = Math.min(...rates);
    const range = Math.max(...rates) - min || 1;
    return series.map((point, i) => ({
      x: Math.round((pad + (i * (width - 2 * pad)) / (series.length - 1)) * 10) / 10,
      y: Math.round((pad + ((Math.max(...rates) - point.passRate) * (height - 2 * pad)) / range) * 10) / 10
    }));
  }

  return { isTracked, isLongRunning, isFailingAgain, needsDecision, byPriority, actionQueue, longRunningQueue, nightSummary, nightHeadline, groupSuites, suiteShortName, brokenReason, groupBuilds, compactSuites, passRateSeries, sparklinePoints };
}));
