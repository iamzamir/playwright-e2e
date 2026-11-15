/* Nightly test triage dashboard: static, no dependencies. Reads data/index.json and data/days/<date>.json
 * written by scripts/triage/build-day.js. All data is rendered as text (never as HTML). */
(function () {
  'use strict';

  const CATEGORIES = {
    ENVIRONMENT_ISSUE: { label: 'Environment', hint: 'Check gateway, service health or configuration; ping the environment owner.' },
    PRODUCT_DEFECT: { label: 'Product defect', hint: 'Confirm, then file or link a Jira defect.' },
    TEST_DATA_ISSUE: { label: 'Test data', hint: 'Fix data setup or cleanup for these tests.' },
    AUTOMATION_ISSUE: { label: 'Automation', hint: 'Fix the spec or page object.' },
    TO_INVESTIGATE: { label: 'To investigate', hint: 'Open the evidence and decide the category.' },
    KNOWN_ISSUE: { label: 'Known issue', hint: 'Already tracked in triage/known-issues.json; no action.' },
    FLAKY: { label: 'Quarantined', hint: 'Listed in triage/quarantine.json; being stabilised by its owner.' }
  };
  const CATEGORY_ORDER = Object.keys(CATEGORIES);
  const KIND_LABELS = { regression: 'regression', 'new-test': 'new test', persistent: 'persistent', recurring: 'recurring' };
  const TREND_HINTS = {
    new: 'First failure of this group in 30 nights',
    recurring: 'Failed on earlier nights in the last 30',
    persistent: 'Failed on at least 5 of the last 7 nights'
  };

  const view = window.TriageView;
  const app = document.getElementById('app');
  const dateSelect = document.getElementById('date-select');
  const state = { index: null, days: new Map(), labels: new Map(), filter: null, registry: null, tests: null };

  // ---------- helpers ----------
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  // replaceChildren() does not flatten arrays, so pages are mounted through this.
  function mount(...children) {
    app.replaceChildren(...children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false));
  }

  function safeUrl(url) {
    return typeof url === 'string' && /^https:\/\//i.test(url) ? url : null;
  }

  function extLink(url, label, cls) {
    const href = safeUrl(url);
    return href ? h('a', { href, target: '_blank', rel: 'noopener', class: cls }, label) : null;
  }

  function formatDate(date, long) {
    const options = long ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' };
    return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, options);
  }

  function formatTime(iso) {
    return iso ? `${new Date(iso).toISOString().slice(11, 16)} UTC` : '';
  }

  function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
  }

  const ALLOWED_DATA_PATH = /^data\/(index|registry|tests|days\/\d{4}-\d{2}-\d{2})\.json$/;

  async function getJson(url) {
    if (typeof url !== 'string' || !ALLOWED_DATA_PATH.test(url)) {
      throw new Error(`Invalid data URL: ${String(url).slice(0, 50)}`);
    }
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function loadDay(date) {
    // The date comes from the URL, so resolve it from the trusted index allow-list only.
    const matchedDay = (state.index.days || []).find((day) => day.date === date);
    if (!matchedDay || !/^\d{4}-\d{2}-\d{2}$/.test(matchedDay.date)) {
      throw new Error(`no data for the night "${String(date).slice(0, 20)}"`);
    }
    const safeDate = matchedDay.date;
    if (!state.days.has(safeDate)) {
      const day = await getJson(`data/days/${safeDate}.json`);
      for (const suite of day.suites || []) state.labels.set(suite.key, suite.label || suite.key);
      state.days.set(safeDate, day);
    }
    return state.days.get(safeDate);
  }

  function suiteName(key) {
    return state.labels.get(key) || key;
  }

  function suiteTone(suite) {
    if (!suite || suite.status === 'pending' || suite.status === 'running') return 'idle';
    if (suite.status !== 'reported') return 'bad';
    if (suite.verdict === 'DEGRADED') return 'warn';
    if (suite.red) return 'bad';
    if (suite.verdict === 'KNOWN_FAILURES_ONLY' || suite.verdict === 'ALL_PASSED') return 'good';
    return 'idle';
  }

  // GitHub "owner/name" for a build's commit link. The repo name comes from service-map.json (trusted, always set);
  // the bundle's GITHUB_REPOSITORY only supplies the owner, and stands in when the map has no repo.
  const DEFAULT_REPO_OWNER = 'BY-Product-Development';
  function commitRepo(build) {
    const bundle = /^[\w.-]+\/[\w.-]+$/.test(String(build.repository || '')) ? build.repository.split('/') : null;
    const name = /^[\w.-]+$/.test(String(build.repo || '')) ? build.repo : bundle ? bundle[1] : null;
    return name ? `${bundle ? bundle[0] : DEFAULT_REPO_OWNER}/${name}` : null;
  }

  // §7.5 suspect changes on a new group (scripts/triage/lib/suspect-changes.js): short label for the queue, full text for the group page.
  function suspectLabel(suspect) {
    if (suspect.kind === 'app') return `${suspect.key} changed`;
    return Array.isArray(suspect.files) ? 'test code changed' : 'automation changed';
  }

  function suspectText(suspect) {
    const range = `${String(suspect.from).slice(0, 7)}…${String(suspect.to).slice(0, 7)}`;
    if (suspect.kind === 'app') return `${suspect.name || suspect.key} build ${range}`;
    return Array.isArray(suspect.files) ? `${suspect.files.map((file) => file.replace(/^playwright-e2e\//, '')).join(', ')} (${range})` : `automation commit ${range} (files not checked)`;
  }

  function suspectPills(cluster) {
    return (cluster.suspectChanges || []).map((suspect) => h('span', { class: 'pill warn', title: `Changed since the previous night: ${suspectText(suspect)}` }, suspectLabel(suspect)));
  }

  // E7: one build as "planning-mfe cf39328", linked to the commit when the repository is known.
  function buildLink(build) {
    const short = String(build.sha || '').slice(0, 7);
    const label = `${build.key} ${short}`;
    const title = `${build.name || build.key}${build.buildTime ? ` · built ${build.buildTime}` : ''}${build.runNumber ? ` · build #${build.runNumber}` : ''}`;
    const repo = /^[0-9a-f]{40}$/.test(String(build.sha || '')) ? commitRepo(build) : null;
    return repo
      ? h('a', { class: 'mono', href: `https://github.com/${repo}/commit/${build.sha}`, target: '_blank', rel: 'noopener', title }, label)
      : h('span', { class: 'mono', title }, label);
  }

  // E8: shown only when the environment probe did not come back healthy.
  function suiteHealth(suite) {
    const health = suite.envHealth;
    if (health && health.healthy === false) {
      return h('div', { class: 'sg-reason bad-text' }, `Environment unhealthy before tests: ${health.failed.join(', ') || 'see run summary'}`);
    }
    if (health && health.healthy === null) {
      return h('div', { class: 'sg-reason muted' }, health.error ? `Environment probe: ${health.error}` : 'Environment probe did not run');
    }
    return null;
  }

  function suiteStatusLabel(suite) {
    switch (suite.status) {
      case 'pending': return 'Not yet due';
      case 'running': return 'Running';
      case 'no-data': return `No report${suite.conclusion ? ` (${suite.conclusion})` : ''}`;
      case 'missing': return 'Did not run';
      default: break;
    }
    return {
      BROKEN: 'Broken run',
      UNEXPLAINED_FAILURES: 'Unexplained failures',
      DEGRADED: 'Degraded',
      KNOWN_FAILURES_ONLY: 'Known failures only',
      ALL_PASSED: 'All passed'
    }[suite.verdict] || 'Reported';
  }

  function catBadge(category) {
    const meta = CATEGORIES[category] || { label: category };
    return h('span', { class: `cat-badge cat-${category}` }, meta.label);
  }

  function kindBadges(kinds) {
    return Object.entries(kinds || {})
      .sort((a, b) => b[1] - a[1])
      .map(([kind, n]) => h('span', { class: `kind ${kind}`, title: 'How these tests behaved in previous runs' }, `${n} ${KIND_LABELS[kind] || kind}`));
  }

  function historyStrip(last7) {
    if (!last7) return null;
    return h('span', { class: 'history', title: 'Previous runs, newest first (green passed, red failed, grey skipped)' },
      [...last7].map((c) => h('i', { class: c })));
  }

  function trendBadge(cluster) {
    if (!TREND_HINTS[cluster.trend]) return null;
    return h('span', { class: `trend ${cluster.trend}`, title: TREND_HINTS[cluster.trend] }, cluster.trend.toUpperCase());
  }

  function occurrences(cluster) {
    return cluster.occurrences30d ? `${cluster.occurrences30d} of ${plural(cluster.nights30d || cluster.occurrences30d, 'night')}` : null;
  }

  function failingSince(cluster) {
    return view.isLongRunning(cluster) && cluster.firstSeen
      ? h('span', { class: 'pill warn', title: `Failed on ${cluster.occurrences14d} of the last ${plural(cluster.nights14d, 'night')} with data` }, `failing since ${formatDate(cluster.firstSeen)}`)
      : null;
  }

  function triagePill(cluster) {
    const triage = cluster.triage;
    if (!triage) return null;
    const closed = `closed${triage.resolution && triage.resolution !== 'closed' ? ` (${triage.resolution})` : ''}`;
    if (view.isFailingAgain(cluster)) {
      const decided = triage.reclassified ? 'reclassified' : triage.decision === 'confirmed' ? 'confirmed' : null;
      const label = [decided, closed, 'failing again'].filter(Boolean).join(' · ');
      return h('span', { class: 'pill warn', title: `Issue #${triage.issue} was closed${triage.closedAt ? ` on ${formatDate(triage.closedAt.slice(0, 10))}` : ''}, but this group failed again; reopen it` }, `${label} · #${triage.issue}`);
    }
    const label = triage.reclassified ? `reclassified · #${triage.issue}` : triage.decision === 'confirmed' ? `confirmed · #${triage.issue}` : `${triage.state === 'closed' ? `${closed}, no decision · ` : ''}#${triage.issue}`;
    return h('span', { class: `pill ${triage.decision === 'confirmed' || triage.reclassified ? 'good' : ''}`, title: 'GitHub triage issue for this group' }, label);
  }

  function copyButton(text, label) {
    const button = h('button', { type: 'button', class: 'button' }, label);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = 'Copied';
      } catch (err) {
        button.textContent = 'Copy failed; select the text instead';
      }
    });
    return button;
  }

  // ---------- pages ----------
  function buildsLine(entries) {
    if (!entries.length) return null;
    return h('div', { class: 'sg-builds' }, h('span', { class: 'muted' }, 'Builds '),
      entries.map(({ build, changed }, i) => [i ? ', ' : '', buildLink(build), changed ? h('span', { class: 'badge-new', title: 'Different build from the previous night' }, 'new') : null]));
  }

  function renderSuiteRow(suite) {
    const tone = suiteTone(suite);
    const t = suite.totals || {};
    const delta = suite.deltaPassRate;
    const reason = view.brokenReason(suite);
    const counts = [t.failed ? `${t.failed} failed` : null, t.blocked ? `${t.blocked} blocked` : null, t.flaky ? `${t.flaky} flaky` : null].filter(Boolean).join(' · ');
    return h('div', { class: 'sg-row' },
      h('div', { class: 'sg-line' },
        h('span', { class: 'sg-name', title: suite.label || suite.key }, view.suiteShortName(suite)),
        h('span', { class: 'sg-rate' }, typeof suite.passRate === 'number' ? `${suite.passRate}%` : '–'),
        typeof delta === 'number' && Math.abs(delta) >= 1
          ? h('span', { class: `delta ${delta > 0 ? 'up' : 'down'}`, title: 'Change in pass rate vs the previous night' }, `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}`)
          : null,
        h('span', { class: `pill ${tone}`, title: suite.headline || null }, suiteStatusLabel(suite), suite.manual ? ' · manual' : '')),
      reason ? h('div', { class: 'sg-reason bad-text' }, reason) : null,
      suiteHealth(suite),
      h('div', { class: 'sg-foot' },
        suite.status === 'reported' ? h('span', { title: `${t.passed || 0} passed of ${t.total || 0}` }, counts || `${t.passed || 0} passed`) : null,
        h('span', { class: 'sg-links' },
          extLink(suite.links && suite.links.report, 'Allure'),
          extLink(suite.links && suite.links.workflow, 'Run'))));
  }

  function renderSuites(day) {
    return h('div', { class: 'suite-groups' }, view.groupSuites(day.suites).map((group) => h('section', { class: 'suite-group' },
      h('div', { class: 'sg-title' }, group.title),
      group.suites.map(renderSuiteRow),
      buildsLine(view.groupBuilds(group.suites)))));
  }

  function renderSparkline(date) {
    const series = view.passRateSeries(state.index.days, date);
    const width = 180;
    const height = 44;
    const points = view.sparklinePoints(series, width, height);
    if (!points.length) return null;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Pass rate over ${series.length} nights: ${series[0].passRate}% to ${series[series.length - 1].passRate}%`);
    const line = document.createElementNS(NS, 'polyline');
    line.setAttribute('points', points.map((point) => `${point.x},${point.y}`).join(' '));
    line.setAttribute('class', 'spark-line');
    svg.append(line);
    points.forEach((point, i) => {
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', String(point.x));
      dot.setAttribute('cy', String(point.y));
      dot.setAttribute('r', i === points.length - 1 ? '3' : '6');
      dot.setAttribute('class', i === points.length - 1 ? 'spark-end' : 'spark-hit');
      const title = document.createElementNS(NS, 'title');
      title.textContent = `${formatDate(series[i].date)}: ${series[i].passRate}%`;
      dot.append(title);
      svg.append(dot);
    });
    return svg;
  }

  function previousRate(date) {
    const days = state.index.days || [];
    const at = days.findIndex((item) => item.date === date);
    const previous = at >= 0 ? days.slice(at + 1).find((item) => typeof item.passRate === 'number') : null;
    return previous ? previous.passRate : null;
  }

  function renderHero(day, summary) {
    const previous = previousRate(day.date);
    const delta = previous !== null && typeof day.passRate === 'number' ? Math.round((day.passRate - previous) * 10) / 10 : null;
    const facts = [
      summary.broken && summary.newGroups ? plural(summary.broken, 'broken run') : null,
      summary.notReported && (summary.newGroups || summary.broken) ? `${plural(summary.notReported, 'suite')} did not report` : null,
      summary.failingAgain ? `${plural(summary.failingAgain, 'group')} failing again on a closed issue` : null,
      summary.waiting ? `${plural(summary.waiting, 'group')} waiting on a decision` : null,
      summary.longRunning ? `${summary.longRunning} long-running` : null,
      summary.tracked ? `${summary.tracked} already tracked` : null,
      summary.blocked ? `${summary.blocked} tests blocked` : null
    ].filter(Boolean);
    return h('section', { class: 'hero' },
      h('div', { class: 'hero-main' },
        h('div', { class: 'hero-night' }, `Night of ${formatDate(day.date, true)} · ${summary.reported} of ${plural(day.suites.length, 'suite')} reported · updated ${formatTime(day.generatedAt)}`),
        h('h1', {}, view.nightHeadline(summary)),
        facts.length ? h('div', { class: 'hero-facts' }, facts.join(' · ')) : null),
      typeof day.passRate === 'number'
        ? h('div', { class: 'hero-trend' },
          renderSparkline(day.date),
          h('div', { class: 'hero-rate' },
            h('strong', {}, `${day.passRate}%`),
            delta ? h('span', { class: `delta ${delta > 0 ? 'up' : 'down'}`, title: 'Change vs the previous night' }, `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}`) : null,
            h('div', { class: 'muted hero-rate-label' }, 'pass rate, 14 nights')))
        : null);
  }

  function setFilter(date, category) {
    location.hash = category && state.filter !== category ? `#/day/${date}/${category}` : `#/day/${date}`;
  }

  function renderBreakdown(day, summary) {
    const present = CATEGORY_ORDER.filter((category) => day.categories[category]);
    const stats = day.decisionStats;
    const precisionText = [
      stats && stats.decided ? ` · ${stats.precisionPct}% rule precision (${stats.confirmed}/${stats.decided} confirmed)` : '',
      stats && stats.resolved ? ` · ${stats.resolved} to-investigate ${stats.resolved === 1 ? 'group' : 'groups'} resolved by people` : ''
    ].join('');
    return h('section', { class: 'panel breakdown' },
      h('div', { class: 'breakdown-head' },
        h('span', {}, h('strong', {}, summary.failed), ` failures in ${plural(summary.groups, 'group')}`),
        h('span', { class: 'muted', title: 'Failures with a category other than To investigate, plus rule precision on human-decided groups' }, `${summary.explainedPct}% explained${precisionText}`)),
      h('div', { class: 'cat-bar', 'aria-hidden': 'true' }, present.map((category) => h('i', {
        class: `cat-${category}${state.filter && state.filter !== category ? ' dim' : ''}`,
        style: `flex-grow:${day.categories[category]}`,
        title: `${CATEGORIES[category].label}: ${day.categories[category]}`
      }))),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by category' }, present.map((category) => h('button', {
        type: 'button',
        class: `chip cat-${category}`,
        'aria-pressed': String(state.filter === category),
        title: CATEGORIES[category].hint,
        onclick: () => setFilter(day.date, category)
      }, h('span', { class: 'dot' }), CATEGORIES[category].label, h('span', { class: 'muted' }, day.categories[category])))));
  }

  // The one thing to do next on a group; the dashboard is static, so decisions happen on the GitHub issue.
  function queueAction(day, cluster) {
    const reopen = view.isFailingAgain(cluster) && safeUrl(cluster.triage.url);
    if (reopen) return h('a', { class: 'button', href: reopen, target: '_blank', rel: 'noopener', title: 'The issue is closed but this group failed again: reopen it (the nightly sync never reopens issues)' }, `Reopen #${cluster.triage.issue}`);
    if (cluster.category === 'PRODUCT_DEFECT' && cluster.draft) {
      const button = copyButton(cluster.draft.text, 'Copy for Jira');
      button.dataset.copy = 'true';
      return button;
    }
    const url = cluster.triage && !view.isTracked(cluster) && view.needsDecision(cluster) && safeUrl(cluster.triage.url);
    if (url) return h('a', { class: 'button', href: url, target: '_blank', rel: 'noopener', title: 'Tick one box under Decision on the issue (or swap its category label)' }, `Decide on #${cluster.triage.issue}`);
    return h('a', { class: 'button', href: `#/cluster/${day.date}/${cluster.id}` }, 'Open');
  }

  function renderQueueRow(day, cluster) {
    const seen = occurrences(cluster);
    return h('div', { class: `q-row cat-${cluster.category}` },
      h('div', { class: 'q-impact', title: `${plural(cluster.counts.failed, 'failed test')}${cluster.counts.blocked ? `, ${cluster.counts.blocked} blocked` : ''}` },
        h('strong', {}, cluster.counts.failed),
        cluster.counts.blocked ? h('span', { class: 'muted' }, `+${cluster.counts.blocked}`) : null),
      h('div', { class: 'q-body' },
        h('div', { class: 'q-line' },
          trendBadge(cluster),
          h('a', { class: 'q-title', href: `#/cluster/${day.date}/${cluster.id}` }, cluster.title)),
        h('div', { class: 'q-meta' },
          catBadge(cluster.category),
          h('span', { title: cluster.suites.map(suiteName).join(', ') }, view.compactSuites(cluster.suites, day.suites)),
          cluster.service ? h('span', { title: 'Service under test' }, cluster.service.name) : null,
          seen ? h('span', { title: 'Nights this group failed, out of the last 30 with data' }, seen) : null,
          failingSince(cluster),
          suspectPills(cluster),
          triagePill(cluster)),
        cluster.reasons[0] ? h('div', { class: 'q-reason', title: cluster.reasons[0] }, cluster.reasons[0]) : null),
      h('div', { class: 'q-action' }, queueAction(day, cluster)));
  }

  function renderQueue(day) {
    const rows = view.actionQueue(day.clusters, state.filter);
    const hint = state.filter
      ? h('span', { class: 'group-hint' }, CATEGORIES[state.filter].hint, ' ', h('a', { href: `#/day/${day.date}` }, 'Show all'))
      : h('span', { class: 'group-hint q-keys' }, 'new first, then by tests affected · ', h('kbd', {}, 'j'), ' ', h('kbd', {}, 'k'), ' move · ', h('kbd', {}, 'Enter'), ' open · ', h('kbd', {}, 'c'), ' copy Jira draft');
    return h('section', {},
      h('h2', {}, state.filter ? CATEGORIES[state.filter].label : 'Action queue', hint),
      rows.length
        ? h('div', { class: 'queue' }, rows.map((cluster) => renderQueueRow(day, cluster)))
        : h('div', { class: 'empty' }, 'Nothing here for this night.'));
  }

  // Groups failing nearly every night for two weeks or more: kept out of the action queue so new failures stand out.
  function renderLongRunning(day) {
    const rows = view.longRunningQueue(day.clusters);
    if (!rows.length || state.filter) return null;
    return h('section', {},
      h('h2', {}, `Long-running failures (${rows.length})`,
        h('span', { class: 'group-hint' }, 'nearly every night for 2+ weeks · fix, or register a known issue')),
      h('div', { class: 'queue long-running' }, rows.map((cluster) => renderQueueRow(day, cluster))));
  }

  function moreSection(summary, children, open) {
    return h('details', { class: 'more', open }, h('summary', {}, summary), h('div', { class: 'more-body' }, children));
  }

  function renderTracked(day) {
    const tracked = day.clusters.filter(view.isTracked);
    if (!tracked.length || state.filter) return null;
    return moreSection([h('strong', {}, `Already tracked (${tracked.length})`), h('span', { class: 'muted' }, ' · known issues and quarantined tests; no action needed')],
      h('div', { class: 'queue' }, view.byPriority(tracked).map((cluster) => renderQueueRow(day, cluster))));
  }

  function renderWidespread(day) {
    if (!day.widespread || !day.widespread.length) return null;
    const crossEnvironment = day.widespread.filter((item) => item.crossEnvironment).length;
    return moreSection([h('strong', {}, `Widespread errors (${day.widespread.length})`), h('span', { class: 'muted' }, ' · across many unrelated failures, so not used to explain individual tests'),
      crossEnvironment ? h('span', { class: 'pill bad', style: 'margin-left:8px' }, `${crossEnvironment} from another environment`) : null],
      day.widespread.map((item) => h('details', { class: 'spread' },
        h('summary', {},
          h('span', { class: 'mono' }, `${item.method} ${item.status} ${item.endpoint}`),
          item.crossEnvironment ? h('span', { class: 'pill bad' }, 'other environment URL') : null,
          item.knownNoise ? h('span', { class: 'pill' }, 'confirmed noise') : null,
          h('span', { class: 'muted spread-count' }, `${plural(item.tests, 'test')} · ${item.share}%`)),
        h('div', { class: 'more-body' },
          h('div', { class: 'muted' }, `In ${plural(item.tests, 'failing test')} (${item.share}% of failures with network logs), ${plural(item.signatures, 'different error')} · ${item.suites.map(suiteName).join(', ')}`),
          item.sample && item.sample.requestId ? h('div', { class: 'mono muted' }, item.sample.requestId) : null,
          item.sample && item.sample.body ? h('pre', {}, item.sample.body) : null))));
  }

  function renderBackground(day) {
    if (!day.backgroundErrors || !day.backgroundErrors.length) return null;
    return moreSection([h('strong', {}, `Background errors (${day.backgroundErrors.length})`), h('span', { class: 'muted' }, ' · also on passing tests in the last 14 nights; never used to explain a failure')],
      day.backgroundErrors.map((item) => h('div', { class: 'widespread-item' },
        h('span', { class: 'mono' }, item.key),
        h('span', { class: 'muted' }, `${item.share}% of passing UI tests (${item.tests} of ${item.passedTests})`))));
  }

  function renderRecovered(day) {
    if (!day.recovered || !day.recovered.length) return null;
    return moreSection([h('strong', {}, `Known issues that may be fixed (${new Set(day.recovered.map((item) => item.id)).size})`), h('span', { class: 'muted' }, ' · passed consecutively; verify before closing the issue')],
      day.recovered.map((item) => h('div', { class: 'widespread-item' },
        h('div', {}, h('strong', {}, `${item.id}${item.jira ? ` · ${item.jira}` : ''}`), ` — ${item.title}`),
        h('div', { class: 'muted' }, `${item.consecutivePasses} consecutive passes (threshold ${item.requiredPasses}) · ${suiteName(item.suite)} · ${item.spec} · ${item.name}`),
        extLink(item.testLink, 'Allure test'))), true);
  }

  function renderRecovering(day) {
    if (!day.recovering || !day.recovering.length) return null;
    return moreSection([h('strong', {}, `No longer failing (${day.recovering.length})`), h('span', { class: 'muted' }, ' · failed on the previous night, not tonight; check before closing related work')],
      day.recovering.map((item) => h('div', { class: 'widespread-item' },
        h('div', {}, catBadge(item.category), ' ', item.title),
        h('div', { class: 'muted' }, `${plural(item.failed, 'failure')} on ${formatDate(item.lastSeen, true)} · ${item.suites.map(suiteName).join(', ')}`))));
  }

  function renderFlaky(day) {
    if (!day.flaky || !day.flaky.length) return null;
    return moreSection([h('strong', {}, `Passed on retry (${day.flaky.length})`), h('span', { class: 'muted' }, ' · flaky tonight; quarantine if it repeats')],
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Suite'), h('th', {}, 'Spec'), h('th', {}, 'Test'), h('th', {}, 'Attempts'))),
        h('tbody', {}, day.flaky.map((item) => h('tr', {},
          h('td', {}, suiteName(item.suite)), h('td', { class: 'mono' }, item.spec), h('td', {}, item.name), h('td', { class: 'num' }, item.attempts)))))));
  }

  async function renderDay(date) {
    const day = await loadDay(date);
    const summary = view.nightSummary(day);
    const more = [renderRecovered(day), renderTracked(day), renderWidespread(day), renderRecovering(day), renderFlaky(day), renderBackground(day)].filter(Boolean);
    mount(
      renderHero(day, summary),
      renderSuites(day),
      day.clusters.length
        ? [renderBreakdown(day, summary), renderQueue(day), renderLongRunning(day)]
        : h('div', { class: 'empty', style: 'margin-top:18px' }, summary.reported ? 'No failures in the reported suites.' : 'No suite has reported yet for this night.'),
      more.length ? h('section', {}, h('h2', {}, 'Also tonight'), h('div', { class: 'more-list' }, more)) : null,
      h('p', { class: 'footer' }, 'Categories are automatic and need a human check. ',
        h('a', { href: `data/days/${date}.json` }, 'Raw data')));
  }

  // j/k move through the queue, c copies the focused row's Jira draft. Enter opens the focused link natively.
  function onQueueKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    const titles = [...document.querySelectorAll('main > section > .queue .q-title')];
    if (!titles.length) return;
    const at = titles.indexOf(document.activeElement);
    if (event.key === 'j' || event.key === 'k') {
      event.preventDefault();
      const next = event.key === 'j' ? Math.min(at + 1, titles.length - 1) : Math.max(at - 1, 0);
      titles[next].focus();
      titles[next].closest('.q-row').scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'c' && at >= 0) {
      const copy = titles[at].closest('.q-row').querySelector('[data-copy]');
      if (copy) copy.click();
    }
  }

  function renderHttpErrors(errors, label = 'HTTP errors around the failure') {
    if (!errors || !errors.length) return null;
    return h('div', {},
      h('div', { class: 'section-label' }, label),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Before failure'), h('th', {}, 'Call'), h('th', {}, 'Status'), h('th', {}, 'Request id'))),
        h('tbody', {}, errors.map((error) => [
          h('tr', {},
            h('td', { class: 'num' }, error.msBeforeFailure !== null && error.msBeforeFailure !== undefined ? `${Math.round(error.msBeforeFailure / 1000)}s` : ''),
            h('td', { class: 'mono' }, `${error.method} ${error.endpoint}`),
            h('td', { class: 'num' }, error.status || error.failure || ''),
            h('td', { class: 'mono' }, error.requestId || '')),
          error.body ? h('tr', {}, h('td', {}), h('td', { colspan: '3' }, h('pre', {}, error.body))) : null
        ])))));
  }

  function renderTest(test, suiteLinks, open) {
    const trail = (test.stepTrail || []).slice(-12);
    return h('details', { class: 'test', open },
      h('summary', {},
        h('div', { style: 'font-weight:600; overflow-wrap:anywhere' }, test.name),
        h('div', { class: 'card-meta' },
          h('span', {}, suiteName(test.suite)), h('span', { class: 'mono' }, test.spec),
          test.kind ? h('span', { class: `kind ${test.kind}` }, KIND_LABELS[test.kind] || test.kind) : null,
          historyStrip(test.last7),
          h('a', { href: `#/tests/${encodeURIComponent(test.name)}`, title: '30-night history of this test' }, 'History'),
          test.attempts > 1 ? h('span', {}, `${test.attempts} attempts`) : null,
          test.blocked ? h('span', {}, `${test.blocked} blocked after it`) : null)),
      h('div', { class: 'test-body' },
        test.reasons && test.reasons.length ? h('div', {}, h('div', { class: 'section-label' }, 'Why this category'), h('ul', { class: 'reasons' }, test.reasons.map((reason) => h('li', {}, reason)))) : null,
        h('div', {}, h('div', { class: 'section-label' }, 'Error'), h('pre', {}, (test.error && test.error.message) || 'No message')),
        test.error && test.error.location
          ? h('div', {}, h('div', { class: 'section-label' }, 'Where'), h('span', { class: 'mono' }, `${test.error.location.file}:${test.error.location.line}${test.error.location.function ? ` · ${test.error.location.function}` : ''}`))
          : null,
        trail.length ? h('div', {},
          h('div', { class: 'section-label' }, test.failedStep ? 'Steps (failed check highlighted)' : 'Last steps before the failure'),
          h('ol', { class: 'trail', start: String(Math.max(1, (test.stepTrail || []).length - trail.length + 1)) },
            trail.map((step) => h('li', { class: step.status === 'failed' || step.status === 'broken' ? 'failed' : '' }, h('span', { class: 'lvl' }, step.level), step.text)))) : null,
        renderHttpErrors(test.httpErrors),
        renderHttpErrors(test.apiCalls, 'Last API calls, newest first (curl repro in Allure: api-repro.sh)'),
        h('div', { class: 'links' },
          extLink(test.links && test.links.test, 'Open in Allure', 'button'),
          extLink(test.links && test.links.screenshot, 'Screenshot', 'button'),
          extLink(suiteLinks && suiteLinks.workflow, 'Workflow run', 'button'))));
  }

  async function renderCluster(date, id) {
    const day = await loadDay(date);
    const cluster = day.clusters.find((item) => item.id === id);
    if (!cluster) {
      mount(h('a', { class: 'back', href: `#/day/${date}` }, '← Back to the night'), h('div', { class: 'empty' }, 'This group is not in the data for that night.'));
      return;
    }
    const suiteLinks = Object.fromEntries(day.suites.map((suite) => [suite.key, suite.links]));
    const cause = cluster.cause;
    // E7/E8 for the suites this group failed in: the builds they tested and whether the environment probe was healthy.
    const groupSuites = day.suites.filter((suite) => cluster.suites.includes(suite.key));
    const buildsByKey = new Map();
    const changedKeys = new Set();
    for (const suite of groupSuites) {
      for (const build of suite.builds || []) buildsByKey.set(`${build.key}:${build.sha}`, build);
      for (const change of suite.buildChanges || []) changedKeys.add(`${change.key}:${change.to}`);
    }
    const unhealthy = groupSuites.filter((suite) => suite.envHealth && suite.envHealth.healthy === false);
    mount(
      h('a', { class: 'back', href: `#/day/${date}` }, `← ${formatDate(date, true)}`),
      h('div', { class: 'detail-head' },
        h('div', {}, catBadge(cluster.category), ' ', h('span', { class: 'muted' }, `${cluster.confidence} confidence`)),
        h('h1', {}, cluster.title),
        h('ul', { class: 'reasons' }, cluster.reasons.map((reason) => h('li', {}, reason))),
        h('dl', { class: 'kv panel' },
          h('dt', {}, 'Failed tests'), h('dd', {}, `${cluster.counts.failed}${cluster.counts.blocked ? ` (+${cluster.counts.blocked} blocked)` : ''}`),
          h('dt', {}, 'Suites'), h('dd', {}, cluster.suites.map(suiteName).join(', ')),
          cluster.environments.length ? [h('dt', {}, 'Environment'), h('dd', {}, cluster.environments.join(', '))] : null,
          cluster.gateways.length ? [h('dt', {}, 'Gateway'), h('dd', {}, cluster.gateways.join(', '))] : null,
          cluster.location ? [h('dt', {}, 'Code location'), h('dd', { class: 'mono' }, cluster.location)] : null,
          cause ? [h('dt', {}, 'Likely cause'), h('dd', { class: 'mono' }, `${cause.method} ${cause.status || cause.failure} ${cause.endpoint}${cause.requestId ? ` · ${cause.requestId}` : ''}`)] : null,
          cluster.knownIssue ? [h('dt', {}, 'Known issue'), h('dd', {}, `${cluster.knownIssue.id}${cluster.knownIssue.jira ? ` · ${cluster.knownIssue.jira}` : ''}`)] : null,
          cluster.service ? [h('dt', {}, 'Service'), h('dd', {}, `${cluster.service.name}${cluster.service.repo ? ` (${cluster.service.repo})` : ''}`)] : null,
          buildsByKey.size ? [h('dt', {}, 'Builds tested'), h('dd', {}, [...buildsByKey.entries()].map(([id, build], i) => [i ? ', ' : '', buildLink(build),
            build.buildTime ? h('span', { class: 'muted' }, ` (${build.buildTime.slice(0, 10)})`) : null,
            changedKeys.has(id) ? h('span', { class: 'badge-new', title: 'Different build from the previous night' }, 'new') : null]))] : null,
          unhealthy.length ? [h('dt', {}, 'Environment'), h('dd', { class: 'bad-text' }, `Unhealthy before tests in ${unhealthy.map((suite) => `${suiteName(suite.key)} (${suite.envHealth.failed.join(', ')})`).join('; ')}`)] : null,
          cluster.triage ? [h('dt', {}, 'Triage issue'), h('dd', {}, extLink(cluster.triage.url, `#${cluster.triage.issue}`) || `#${cluster.triage.issue}`, ' ', triagePill(cluster),
            cluster.triage.jira ? ` · Jira ${cluster.triage.jira}` : '', cluster.autoCategory ? ` · rules said ${CATEGORIES[cluster.autoCategory] ? CATEGORIES[cluster.autoCategory].label : cluster.autoCategory}` : '')] : null,
          h('dt', {}, 'History'), h('dd', {}, trendBadge(cluster), ' ', failingSince(cluster), ' ', kindBadges(cluster.kinds)),
          cluster.firstSeen ? [h('dt', {}, 'First seen'), h('dd', {}, formatDate(cluster.firstSeen, true))] : null,
          (cluster.suspectChanges || []).length ? [h('dt', { title: 'What changed since the previous night in the suites this new group failed in' }, 'Changed since last night'),
            h('dd', {}, cluster.suspectChanges.map((suspect, i) => [i ? h('br') : null,
              extLink(suspect.url, suspectText(suspect), 'mono') || h('span', { class: 'mono' }, suspectText(suspect))]))] : null,
          occurrences(cluster) ? [h('dt', {}, 'Failed (30 nights)'), h('dd', {}, occurrences(cluster))] : null)),
      cluster.draft ? [
        h('h2', {}, cluster.category === 'PRODUCT_DEFECT' ? 'Defect draft' : 'Triage summary', h('span', { class: 'group-hint' }, '· generated; check before filing')),
        h('div', { class: 'links', style: 'margin-bottom:8px' },
          copyButton(cluster.draft.text, cluster.category === 'PRODUCT_DEFECT' ? 'Copy for Jira' : 'Copy summary'),
          cluster.draft.healerPrompt ? copyButton(cluster.draft.healerPrompt, 'Copy healer prompt') : null),
        h('pre', { class: 'draft' }, cluster.draft.text)
      ] : null,
      h('h2', {}, `Affected tests (${cluster.tests.length})`),
      cluster.tests.map((test, i) => renderTest(test, suiteLinks[test.suite], i === 0)));
    window.scrollTo(0, 0);
  }

  function matrixCell(entry, date) {
    if (!entry) return h('td', { class: 'cell' }, h('a', { href: `#/day/${date}`, title: 'No data' }, '·'));
    const tone = suiteTone({ status: entry.status, verdict: entry.verdict, red: entry.red });
    const text = entry.status === 'reported' ? (typeof entry.passRate === 'number' ? `${Math.round(entry.passRate)}%` : '✓') : entry.status === 'running' ? '…' : entry.status === 'pending' ? '·' : '✕';
    const title = `${formatDate(date)} · ${suiteStatusLabel(entry)}${entry.failed ? ` · ${entry.failed} failed` : ''}${entry.manual ? ' · manual run' : ''}`;
    return h('td', { class: 'cell' }, h('a', { class: tone, href: `#/day/${date}`, title }, text));
  }

  async function renderMatrix() {
    const index = state.index;
    const days = (index.days || []).slice(0, 30);
    const selected = dateSelect.value || (days[0] && days[0].date);
    const backend = (index.suites || []).filter((suite) => suite.area === 'PO Backend');
    const selectedDay = days.find((day) => day.date === selected);
    const environments = [...new Set(backend.map((suite) => suite.environment))];
    const gateways = [...new Set(backend.map((suite) => suite.gateway))];

    mount(
      h('h1', {}, 'Run matrix'),
      h('p', { class: 'sub' }, `Last ${plural(days.length, 'night')}, newest first. Each cell is the suite's pass rate; colour is the run verdict.`),
      days.length ? h('div', { class: 'table-wrap matrix-wrap' }, h('table', { class: 'matrix' },
        h('thead', {}, h('tr', {}, h('th', { class: 'sticky' }, 'Suite'), days.map((day) => h('th', { title: day.date }, formatDate(day.date))))),
        h('tbody', {}, (index.suites || []).map((suite) => h('tr', {},
          h('td', { class: 'sticky' }, suite.label),
          days.map((day) => matrixCell(day.suites && day.suites[suite.key], day.date))))))) : h('div', { class: 'empty' }, 'No nights recorded yet.'),
      h('div', { class: 'legend' },
        h('span', {}, h('i', { style: 'background:var(--good)' }), 'Only known failures or all passed'),
        h('span', {}, h('i', { style: 'background:var(--bad)' }), 'Unexplained failures, broken, or did not report'),
        h('span', {}, h('i', { style: 'background:var(--warn)' }), 'Degraded'),
        h('span', {}, h('i', { style: 'background:var(--idle)' }), 'Running, not due, or no verdict')),
      backend.length && selectedDay ? [
        h('h2', {}, `PO Backend by environment and gateway · ${formatDate(selectedDay.date, true)}`),
        h('div', { class: 'grid2' },
          h('div', {}), gateways.map((gateway) => h('div', { class: 'head' }, gateway)),
          environments.map((environment) => [
            h('div', { class: 'head', style: 'align-self:center' }, environment),
            gateways.map((gateway) => {
              const suite = backend.find((item) => item.environment === environment && item.gateway === gateway);
              const entry = suite && selectedDay.suites[suite.key];
              const tone = entry ? suiteTone(entry) : 'idle';
              return h('a', { class: `tile ${tone}`, href: `#/day/${selectedDay.date}`, style: 'color:inherit' },
                h('div', { class: 'tile-rate' }, entry && typeof entry.passRate === 'number' ? `${entry.passRate}%` : '–'),
                entry ? h('span', { class: `pill ${tone}` }, suiteStatusLabel(entry)) : h('span', { class: 'pill' }, 'No data'),
                entry && entry.failed ? h('div', { class: 'tile-counts', style: 'margin-top:6px' }, `${entry.failed} failed`) : null);
            })
          ])),
        h('p', { class: 'muted' }, 'A failure on one gateway only usually points to the gateway (routing, auth, permissions); on both, to the service.')
      ] : null);
  }

  // ---------- routing ----------
  async function loadRegistry() {
    if (!state.registry) state.registry = await getJson('data/registry.json');
    return state.registry;
  }

  function statusPill(status) {
    if (status === 'expired') return h('span', { class: 'pill bad' }, 'expired');
    if (status === 'expiring') return h('span', { class: 'pill warn' }, 'expires soon');
    return null;
  }

  function formatMinutes(ms) {
    const minutes = Math.round(ms / 60000);
    return minutes >= 120 ? `${Math.round(minutes / 6) / 10} h` : `${minutes} min`;
  }

  function selectorText(match) {
    if (!match) return '';
    return [match.spec, match.test ? `"${match.test}"` : null, match.testRegex ? `/${match.testRegex}/` : null, match.environment ? match.environment.join('/') : null, match.gateway ? match.gateway.join('/') : null].filter(Boolean).join(' · ');
  }

  async function renderKnownIssues() {
    const data = await loadRegistry();
    mount(
      h('h1', {}, 'Known issues'),
      h('p', { class: 'sub' }, `From triage/known-issues.json and triage/quarantine.json, as of the night of ${formatDate(data.date, true)}. Failures that match an entry do not turn the run red.`),
      data.knownIssues.length ? h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Issue'), h('th', {}, 'Title'), h('th', {}, 'Tonight'), h('th', {}, 'Nights failed (30)'), h('th', {}, 'Last seen'), h('th', {}, 'Age'), h('th', {}, 'Expires'), h('th', {}, 'Owner'))),
        h('tbody', {}, data.knownIssues.map((issue) => h('tr', {},
          h('td', { class: 'nowrap' }, h('strong', {}, issue.id), issue.jira ? h('div', { class: 'mono' }, issue.jira) : null),
          h('td', {}, issue.title, issue.category ? h('div', {}, catBadge(issue.category)) : null,
            h('div', { class: 'mono muted' }, selectorText(issue.match)),
            issue.mayBeFixed ? h('div', {}, h('span', { class: 'pill good' }, `may be fixed · ${issue.mayBeFixed.consecutivePasses} passes in a row`)) : null),
          h('td', { class: 'num' }, issue.failedTonight ? `${issue.failedTonight} failed` : '–'),
          h('td', { class: 'num' }, issue.nightsFailed30),
          h('td', {}, issue.lastSeen ? h('a', { href: `#/day/${issue.lastSeen}` }, formatDate(issue.lastSeen)) : '–'),
          h('td', { class: 'num nowrap' }, issue.ageDays === null ? '–' : plural(issue.ageDays, 'day')),
          h('td', {}, issue.expires ? formatDate(issue.expires) : '–', ' ', statusPill(issue.status)),
          h('td', {}, issue.owner || '–')))))) : h('div', { class: 'empty' }, 'No known issues registered.'),
      h('h2', {}, `Quarantine (${data.quarantine.length})`, h('span', { class: 'group-hint' }, '· flaky tests being stabilised; entries expire after at most 30 days')),
      data.quarantine.length ? h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Id'), h('th', {}, 'Reason'), h('th', {}, 'Tonight'), h('th', {}, 'Since'), h('th', {}, 'Expires'), h('th', {}, 'Owner'))),
        h('tbody', {}, data.quarantine.map((entry) => h('tr', {},
          h('td', {}, h('strong', {}, entry.id)),
          h('td', {}, entry.reason || '', h('div', { class: 'mono muted' }, selectorText(entry.match))),
          h('td', { class: 'num' }, entry.failedTonight ? `${entry.failedTonight} failed` : '–'),
          h('td', {}, entry.since ? formatDate(entry.since) : '–'),
          h('td', {}, entry.expires ? formatDate(entry.expires) : '–', ' ', statusPill(entry.status)),
          h('td', {}, entry.owner || '–')))))) : h('div', { class: 'empty' }, 'Nothing is quarantined.'));
  }

  function flakyTable(rows) {
    return h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Suite'), h('th', {}, 'Spec'), h('th', {}, 'Test'), h('th', {}, 'Passed on retry'), h('th', {}, 'Flake rate'), h('th', {}, 'Failed'), h('th', {}, '≈ Time lost'), h('th', {}, 'Last flaky'))),
      h('tbody', {}, rows.map((item) => h('tr', {},
        h('td', {}, suiteName(item.suite)),
        h('td', { class: 'mono' }, item.spec),
        h('td', {}, item.name, item.quarantine ? h('div', {}, h('span', { class: 'pill' }, `quarantined · ${item.quarantine}`)) : null),
        h('td', { class: 'num' }, `${item.flakyRuns} of ${item.runs}`),
        h('td', { class: 'num' }, `${item.flakeRate}%`),
        h('td', { class: 'num' }, item.failedRuns || '–'),
        h('td', { class: 'num' }, formatMinutes(item.lostMs)),
        h('td', {}, item.lastFlaky ? h('a', { href: `#/day/${item.lastFlaky}` }, formatDate(item.lastFlaky)) : '–'))))));
  }

  async function renderFlakyPage() {
    const data = await loadRegistry();
    const flaky = data.flaky;
    mount(
      h('h1', {}, 'Flaky tests'),
      h('p', { class: 'sub' }, `Tests that passed on retry over the last ${plural(flaky.nights, 'night')} with data, up to the night of ${formatDate(data.date, true)}.`),
      h('div', { class: 'summary' },
        h('span', {}, h('strong', {}, flaky.tests.length), ' flaky tests'),
        h('span', {}, h('strong', {}, flaky.retries), ' retries'),
        h('span', {}, '≈ ', h('strong', {}, formatMinutes(flaky.lostMs)), ' spent on retries')),
      h('h2', {}, `Quarantine candidates (${flaky.candidates.length})`, h('span', { class: 'group-hint' }, '· flake rate above 20% and at least 2 retried passes; add to triage/quarantine.json with an owner, or fix')),
      flaky.candidates.length ? flakyTable(flaky.candidates) : h('div', { class: 'empty' }, 'No test is flaky enough to quarantine.'),
      h('h2', {}, 'All flaky tests'),
      flaky.tests.length ? flakyTable(flaky.tests) : h('div', { class: 'empty' }, 'No test passed on retry in this window.'),
      h('p', { class: 'footer' }, 'Time lost assumes each retried attempt took as long as the final one.'));
  }

  const STATUS_TITLES = { P: 'passed', R: 'passed on retry', F: 'failed', B: 'blocked', S: 'skipped', '-': 'not run' };
  const CATEGORY_CODES = { E: 'ENVIRONMENT_ISSUE', P: 'PRODUCT_DEFECT', T: 'TEST_DATA_ISSUE', A: 'AUTOMATION_ISSUE', I: 'TO_INVESTIGATE', K: 'KNOWN_ISSUE', Q: 'FLAKY' };
  const MAX_TEST_ROWS = 200;

  function nightStrip(row, nights) {
    return h('span', { class: 'history' }, [...row.s].map((code, i) => {
      const category = CATEGORY_CODES[row.c[i]];
      const title = `${formatDate(nights[i])}: ${STATUS_TITLES[code] || code}${category ? ` · ${CATEGORIES[category].label}` : ''}${row.d[i] !== null ? ` · ${row.d[i]}s` : ''}`;
      return h('i', { class: code === '-' ? 'N' : code, title });
    }));
  }

  function median(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  function testRow(row, data) {
    const ran = [...row.s].filter((code) => 'PRF'.includes(code)).length;
    const passed = [...row.s].filter((code) => 'PR'.includes(code)).length;
    const retries = [...row.s].filter((code) => code === 'R').length;
    const durations = row.d.filter((value) => value !== null);
    const last = durations[durations.length - 1];
    const typical = median(durations);
    const slower = last !== undefined && typical && last > typical * 1.5;
    return h('tr', {},
      h('td', {}, suiteName(row.suite)),
      h('td', {}, row.name, h('div', { class: 'mono muted' }, row.spec)),
      h('td', {}, nightStrip(row, data.nights)),
      h('td', { class: 'num' }, ran ? `${Math.round((passed / ran) * 100)}%` : '–'),
      h('td', { class: 'num' }, retries || '–'),
      h('td', { class: `num ${slower ? 'slower' : ''}`, title: 'Last run · median over the window' }, last === undefined ? '–' : `${last}s · ${typical}s`),
      h('td', {}, row.service ? data.services[row.service] || row.service : '–'));
  }

  async function renderTests(query) {
    if (!state.tests) state.tests = await getJson('data/tests.json');
    const data = state.tests;
    const input = h('input', { type: 'search', value: query, placeholder: 'Filter by test, spec or suite', 'aria-label': 'Filter tests', class: 'search' });
    const onlyIssues = h('input', { type: 'checkbox', checked: !query, id: 'only-issues' });
    const results = h('div', {});
    const update = () => {
      const text = input.value.trim().toLowerCase();
      const rows = data.tests.filter((row) => (!onlyIssues.checked || /[FR]/.test(row.s))
        && (!text || `${row.name} ${row.spec} ${suiteName(row.suite)}`.toLowerCase().includes(text)));
      results.replaceChildren(...[
        h('p', { class: 'muted' }, rows.length > MAX_TEST_ROWS ? `Showing the first ${MAX_TEST_ROWS} of ${rows.length} tests, most failures first.` : plural(rows.length, 'test')),
        rows.length ? h('div', { class: 'table-wrap' }, h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Suite'), h('th', {}, 'Test'), h('th', {}, `Last ${plural(data.nights.length, 'night')} (oldest first)`), h('th', {}, 'Pass rate'), h('th', {}, 'Retried'), h('th', {}, 'Duration'), h('th', {}, 'Service'))),
          h('tbody', {}, rows.slice(0, MAX_TEST_ROWS).map((row) => testRow(row, data))))) : null
      ].filter(Boolean));
      history.replaceState(null, '', `#/tests/${encodeURIComponent(input.value.trim())}`);
    };
    input.addEventListener('input', update);
    onlyIssues.addEventListener('change', update);
    mount(
      h('h1', {}, 'Test history'),
      h('p', { class: 'sub' }, `One row per test, up to the night of ${formatDate(data.date, true)}. Hover a square for the night, status, category and duration.`),
      h('div', { class: 'filters' }, input, h('label', { for: 'only-issues' }, onlyIssues, ' Only tests that failed or passed on retry')),
      results,
      h('div', { class: 'legend' },
        h('span', {}, h('i', { style: 'background:var(--good)' }), 'Passed'),
        h('span', {}, h('i', { style: 'background:var(--warn)' }), 'Passed on retry'),
        h('span', {}, h('i', { style: 'background:var(--bad)' }), 'Failed'),
        h('span', {}, h('i', { style: 'background:var(--idle-bg)' }), 'Skipped or blocked'),
        h('span', {}, h('i', { style: 'background:transparent; outline:1px dashed var(--border)' }), 'Not run')));
    update();
  }

  function setNav(page) {
    document.querySelectorAll('[data-nav]').forEach((link) => {
      if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  async function render() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const latest = state.index.days[0] && state.index.days[0].date;
    try {
      if (parts[0] === 'matrix') {
        setNav('matrix');
        await renderMatrix();
      } else if (parts[0] === 'known') {
        setNav('known');
        await renderKnownIssues();
      } else if (parts[0] === 'flaky') {
        setNav('flaky');
        await renderFlakyPage();
      } else if (parts[0] === 'tests') {
        setNav('tests');
        let query = '';
        try { query = decodeURIComponent(parts.slice(1).join('/')); } catch (err) { query = ''; }
        await renderTests(query);
      } else if (parts[0] === 'cluster' && parts[1] && parts[2]) {
        setNav('day');
        dateSelect.value = parts[1];
        await renderCluster(parts[1], parts[2]);
      } else {
        setNav('day');
        const date = parts[0] === 'day' && parts[1] ? parts[1] : latest;
        state.filter = parts[0] === 'day' && CATEGORY_ORDER.includes(parts[2]) ? parts[2] : null;
        if (!date) {
          mount(h('div', { class: 'empty' }, 'No nights recorded yet. Data appears after the first nightly-triage run.'));
          return;
        }
        dateSelect.value = date;
        await renderDay(date);
      }
    } catch (err) {
      mount(h('div', { class: 'empty' }, `Could not load the data: ${err.message}`));
    }
  }

  function initTheme() {
    const button = document.getElementById('theme-toggle');
    let saved = null;
    try { saved = localStorage.getItem('triage-theme'); } catch (err) { saved = null; }
    if (saved) document.documentElement.dataset.theme = saved;
    button.addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      const next = dark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('triage-theme', next); } catch (err) { /* private mode: theme just isn't remembered */ }
    });
  }

  async function start() {
    initTheme();
    try {
      state.index = await getJson('data/index.json');
    } catch (err) {
      mount(h('div', { class: 'empty' }, 'No dashboard data yet. It appears after the first nightly-triage run.'));
      return;
    }
    for (const suite of state.index.suites || []) state.labels.set(suite.key, suite.label || suite.key);
    for (const day of state.index.days || []) {
      dateSelect.append(h('option', { value: day.date }, `${formatDate(day.date, true)}${day.red ? ` · ${day.red} red` : ''}`));
    }
    dateSelect.addEventListener('change', () => {
      location.hash = location.hash.startsWith('#/matrix') ? '#/matrix' : `#/day/${dateSelect.value}`;
      if (location.hash.startsWith('#/matrix')) render();
    });
    window.addEventListener('hashchange', render);
    document.addEventListener('keydown', onQueueKey);
    render();
  }

  start();
}());
