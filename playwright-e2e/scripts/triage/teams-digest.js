/**
 * Posts one Teams digest for the night (plan §9.4): suite status, failures by category, widespread errors,
 * the top root-cause groups, and a link to the dashboard.
 *
 * Usage: node scripts/triage/teams-digest.js --day <data/days/YYYY-MM-DD.json> --dashboard-url <url> [--updated true] [--dry-run]
 * Reads the webhook from TEAMS_WEBHOOK_URL. Never fails the job: problems are logged as warnings.
 */
const fs = require('fs');
const { parseArgs } = require('./verdict');

const CATEGORY_LABELS = {
  ENVIRONMENT_ISSUE: 'Environment',
  PRODUCT_DEFECT: 'Product defect',
  TEST_DATA_ISSUE: 'Test data',
  AUTOMATION_ISSUE: 'Automation',
  TO_INVESTIGATE: 'To investigate',
  KNOWN_ISSUE: 'Known issue',
  FLAKY: 'Quarantined'
};
const STATUS_LABELS = { pending: 'Not yet due', running: 'Still running', 'no-data': 'Ran but did not report', missing: 'Did not run' };
const VERDICT_LABELS = {
  BROKEN: 'Broken run',
  UNEXPLAINED_FAILURES: 'Unexplained failures',
  DEGRADED: 'Degraded',
  KNOWN_FAILURES_ONLY: 'Known failures only',
  ALL_PASSED: 'All passed'
};

function suiteLine(suite) {
  if (suite.status !== 'reported') return `⚪ ${STATUS_LABELS[suite.status] || suite.status}`;
  const icon = suite.verdict === 'DEGRADED' ? '🟠' : suite.red ? '🔴' : '🟢';
  const delta = typeof suite.deltaPassRate === 'number' && suite.deltaPassRate !== 0 ? ` (${suite.deltaPassRate > 0 ? '+' : ''}${suite.deltaPassRate})` : '';
  const failed = suite.totals && suite.totals.failed ? ` · ${suite.totals.failed} failed` : '';
  return `${icon} ${VERDICT_LABELS[suite.verdict] || 'Reported'} · ${suite.passRate}%${delta}${failed}${suite.manual ? ' · manual run' : ''}`;
}

function buildCard(day, dashboardUrl, { updated = false } = {}) {
  const reported = day.suites.filter((suite) => suite.status === 'reported').length;
  const failed = day.clusters.reduce((n, cluster) => n + cluster.counts.failed, 0);
  const blocked = day.clusters.reduce((n, cluster) => n + cluster.counts.blocked, 0);
  const dateLabel = new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const categories = Object.entries(day.categories || {})
    .sort((a, b) => b[1] - a[1])
    .map(([category, n]) => `${CATEGORY_LABELS[category] || category} ${n}`)
    .join(' · ');
  const open = day.clusters.filter((cluster) => !['KNOWN_ISSUE', 'FLAKY'].includes(cluster.category));
  // Long-running groups (build-day.js) fail every night; listing them would hide what changed tonight.
  const longRunning = open.filter((cluster) => cluster.longRunning).length;
  const top = open.filter((cluster) => !cluster.longRunning).slice(0, 3);
  // The sync never reopens an issue, so a group failing again on a closed one would otherwise go unnoticed.
  const failingAgain = open.filter((cluster) => cluster.triage && cluster.triage.state === 'closed');
  const newGroups = day.clusters.filter((cluster) => cluster.trend === 'new' && !['KNOWN_ISSUE', 'FLAKY'].includes(cluster.category)).length;

  const body = [
    { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: `Nightly test triage · ${dateLabel}${updated ? ' (updated: a suite finished late)' : ''}`, wrap: true },
    {
      type: 'TextBlock',
      text: failed ? `${reported} of ${day.suites.length} suites reported · **${failed} failures in ${day.clusters.length} groups**${newGroups ? ` · ${newGroups} new` : ''}${blocked ? ` · ${blocked} blocked` : ''}` : `${reported} of ${day.suites.length} suites reported · no failures`,
      wrap: true,
      spacing: 'Small'
    },
    { type: 'FactSet', facts: day.suites.map((suite) => ({ title: suite.label || suite.key, value: suiteLine(suite) })), spacing: 'Medium' }
  ];
  if (categories) body.push({ type: 'TextBlock', text: `**By category:** ${categories}`, wrap: true, spacing: 'Medium' });
  for (const item of (day.widespread || []).slice(0, 2)) {
    body.push({ type: 'TextBlock', text: `⚠️ Widespread: ${item.method} ${item.status} ${item.endpoint} in ${item.tests} failing tests${item.crossEnvironment ? ' (other environment URL)' : ''}`, wrap: true, spacing: 'Small' });
  }
  if (failingAgain.length) {
    const issues = failingAgain.slice(0, 6).map((cluster) => `#${cluster.triage.issue}`).join(', ');
    body.push({ type: 'TextBlock', text: `🔁 ${failingAgain.length} ${failingAgain.length === 1 ? 'group' : 'groups'} failing again on a closed issue: ${issues}${failingAgain.length > 6 ? ', …' : ''} (reopen)`, wrap: true, spacing: 'Small' });
  }
  if (top.length) {
    body.push({ type: 'TextBlock', text: '**Top groups**', wrap: true, spacing: 'Medium' });
    for (const cluster of top) {
      body.push({
        type: 'TextBlock',
        text: `• [${CATEGORY_LABELS[cluster.category] || cluster.category}] ${cluster.title.slice(0, 140)} (${cluster.counts.failed} failed${cluster.counts.blocked ? `, ${cluster.counts.blocked} blocked` : ''}${cluster.trend === 'new' ? ', new' : ''}${cluster.triage && cluster.triage.state === 'closed' ? `, issue #${cluster.triage.issue} closed` : ''}${(cluster.suspectChanges || []).length ? `; changed: ${cluster.suspectChanges.map((suspect) => (suspect.kind === 'app' ? suspect.key : Array.isArray(suspect.files) ? 'test code' : 'automation')).filter((label, i, all) => all.indexOf(label) === i).join(', ')}` : ''})`,
        wrap: true,
        spacing: 'None'
      });
    }
  }
  if (longRunning) {
    body.push({ type: 'TextBlock', text: `${longRunning} long-running ${longRunning === 1 ? 'group' : 'groups'} (failing nearly every night for 2+ weeks) not listed`, wrap: true, spacing: 'Small', isSubtle: true });
  }

  const base = dashboardUrl.replace(/\/?$/, '/');
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body,
        actions: [
          { type: 'Action.OpenUrl', title: 'Open triage dashboard', url: `${base}#/day/${day.date}` },
          { type: 'Action.OpenUrl', title: 'Run matrix', url: `${base}#/matrix` }
        ]
      }
    }]
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.day || !fs.existsSync(args.day)) throw new Error(`Day file not found: ${args.day}`);
  const day = JSON.parse(fs.readFileSync(args.day, 'utf-8'));
  const card = buildCard(day, args['dashboard-url'] || '', { updated: args.updated === 'true' });
  if (args['dry-run'] === 'true') {
    console.log(JSON.stringify(card, null, 2));
    return;
  }
  const webhook = process.env.TEAMS_WEBHOOK_URL;
  if (!webhook) {
    console.log('[triage:teams] TEAMS_WEBHOOK_URL is empty; digest not sent.');
    return;
  }
  const response = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) });
  if (response.ok) console.log(`[triage:teams] Digest sent (HTTP ${response.status}).`);
  else console.log(`::warning title=Teams digest::Webhook returned HTTP ${response.status}`);
}

if (require.main === module) {
  main().catch((err) => console.log(`::warning title=Teams digest::${err.message}`));
}

module.exports = { buildCard, suiteLine };
