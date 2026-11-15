/**
 * Syncs one GitHub triage issue per failure group of the night (plan §9.3) and reads people's decisions back:
 *   - creates an issue for a group that has none (at most --max-create per night, highest priority first),
 *   - refreshes the generated part of the body of an existing issue (labels and anything a person wrote are kept),
 *   - stores every decision in <data-dir>/decisions.json and applies it to the night's day file and index row.
 * People decide by ticking one box in the issue's Decision section (or with labels: decision:confirmed, or a swapped
 * category:* label), and link Jira with a "Jira: ABP-12345" line outside the generated section. An open issue made
 * before the Decision section existed gets it added once; a closed issue's close reason is kept as its resolution.
 *
 * Usage: node scripts/triage/sync-issues.js --data-dir <dir> --date YYYY-MM-DD [--dashboard-url <url>] [--max-create 10] [--dry-run true]
 * Needs GITHUB_TOKEN (issues: write) and GITHUB_REPOSITORY. Never fails the job: problems are logged as warnings.
 */
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('./verdict');
const { categoryCounts, isValidDate } = require('./build-day');
const { CATEGORY_LABELS, LABEL_CATEGORIES, DECISION_SECTION, decisionSection, sectionOf, decisionFrom, applyDecisions, decisionPrecision } = require('./lib/decisions');
const { needsDraft, withDrafts, healerPromptForIssue } = require('./lib/defect-draft');

const TRIAGE_DIR = path.resolve(__dirname, '../../triage');
const MARKER = /<!-- triage-cluster:([0-9a-f]+) -->/;
const DRAFT_SECTION = /<!-- triage-draft:start -->[\s\S]*<!-- triage-draft:end -->/;
const LABEL_COLORS = { triage: '5319e7', category: 'd93f0b', area: '0e8a16', env: '1d76db', decision: 'fbca04' };
const MAX_PAGES = 10;

function readJson(filePath, fallback) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : fallback;
  } catch {
    return fallback;
  }
}

function githubApi(token, repository) {
  return async (method, route, body) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${route}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    return { status: response.status, data };
  };
}

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function labelsFor(cluster, areas) {
  const labels = ['triage', CATEGORY_LABELS[cluster.autoCategory || cluster.category], 'decision:pending'];
  for (const suite of cluster.suites) if (areas[suite]) labels.push(`area:${slug(areas[suite])}`);
  for (const environment of cluster.environments) labels.push(`env:${slug(environment)}`);
  return [...new Set(labels.filter(Boolean))];
}

function draftSection(cluster, date, dashboardUrl) {
  const link = dashboardUrl ? ` · [Dashboard](${dashboardUrl.replace(/\/?$/, '/')}#/cluster/${date}/${cluster.id})` : '';
  const text = cluster.draft ? cluster.draft.text : cluster.title;
  const healer = cluster.draft && cluster.draft.healerPrompt
    ? `\n\n<details>\n<summary>Copilot healer prompt & code context</summary>\n\n\`\`\`text\n${healerPromptForIssue(cluster.draft.healerPrompt).replace(/```/g, "'''")}\n\`\`\`\n</details>`
    : '';
  return `<!-- triage-draft:start -->\n**Last seen:** ${date} · ${cluster.counts.failed} failed${cluster.counts.blocked ? `, ${cluster.counts.blocked} blocked` : ''}${link}\n\n\`\`\`text\n${text.replace(/```/g, "'''")}\n\`\`\`${healer}\n<!-- triage-draft:end -->`;
}

function newBody(cluster, date, dashboardUrl) {
  return [
    `<!-- triage-cluster:${cluster.id} -->`,
    'Created by the nightly triage. To decide, tick one box under **Decision** once you have checked the failure (swapping the `category:*` label also works; a ticked box wins over the label). Closing the issue records what happened, not the category, so decide first. Link a Jira defect with a line that starts with `Jira:` and the key, above the generated section. The draft section is refreshed every night the group fails.',
    '',
    decisionSection(cluster.autoCategory || cluster.category),
    '',
    draftSection(cluster, date, dashboardUrl)
  ].join('\n');
}

async function listTriageIssues(api) {
  const issues = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { status, data } = await api('GET', `/issues?labels=triage&state=all&per_page=100&page=${page}`);
    if (status !== 200 || !Array.isArray(data)) throw new Error(`listing triage issues failed (HTTP ${status})`);
    issues.push(...data.filter((issue) => !issue.pull_request));
    if (data.length < 100) break;
  }
  return issues;
}

async function ensureLabels(api, names) {
  for (const name of names) {
    const { status } = await api('GET', `/labels/${encodeURIComponent(name)}`);
    if (status === 404) await api('POST', '/labels', { name, color: LABEL_COLORS[name.split(':')[0]] || 'ededed' });
  }
}

// The category of the category:* label the issue was created with: the first one in its label history, so a label a
// person swapped before the Decision section existed still counts as a swap. Without readable history, tonight's rules
// category, which keeps the earlier comparison (a label that differs from the rules is a swap).
async function createdLabel(api, issue, autoCategory) {
  const { status, data } = await api('GET', `/issues/${issue.number}/events?per_page=100`).catch(() => ({ status: 0 }));
  if (status !== 200 || !Array.isArray(data)) return autoCategory;
  const first = data.find((event) => event.event === 'labeled' && event.label && LABEL_CATEGORIES[event.label.name]);
  return first ? LABEL_CATEGORIES[first.label.name] : autoCategory;
}

/**
 * Returns { decisions, created, updated, skipped } for the night's groups that need a person (known issues and
 * quarantined groups are left out). Existing decisions of groups that did not fail tonight are kept by the caller.
 */
async function syncIssues({ day, api, areas, dashboardUrl, maxCreate = 10, dryRun = false }) {
  const byCluster = new Map();
  for (const issue of await listTriageIssues(api)) {
    const marker = String(issue.body || '').match(MARKER);
    if (marker && !byCluster.has(marker[1])) byCluster.set(marker[1], issue);
  }
  const decisions = {};
  const result = { created: 0, updated: 0, skipped: 0 };
  const ensured = new Set();
  for (const cluster of day.clusters) {
    const auto = cluster.autoCategory || cluster.category;
    if (!needsDraft({ category: auto })) continue;
    let issue = byCluster.get(cluster.id);
    if (issue) {
      const section = draftSection(cluster, day.date, dashboardUrl);
      let body = DRAFT_SECTION.test(issue.body || '') ? issue.body.replace(DRAFT_SECTION, () => section) : `${issue.body || ''}\n\n${section}`;
      // Open issues get the Decision section above the draft if they have none, and get it rewritten when tonight's
      // rules category differs from the one it was written for and nobody has ticked a box yet.
      const current = sectionOf(body);
      // The label recorded with the section is the one the sync created, so a person's swap before or after still shows;
      // a rewrite keeps it. An older issue's created label comes from its label history.
      if (issue.state === 'open' && (!current || (!current.ticked.length && current.rules !== auto))) {
        const fresh = decisionSection(auto, (current && current.label) || await createdLabel(api, issue, auto));
        body = current ? body.replace(DECISION_SECTION, () => fresh) : body.replace(section, () => `${fresh}\n\n${section}`);
      }
      if (body !== issue.body && !dryRun) {
        const { status } = await api('PATCH', `/issues/${issue.number}`, { body });
        // Decisions are read from what is on GitHub: only a body that was written replaces the listed one.
        if (status === 200) {
          result.updated++;
          issue = { ...issue, body };
        }
      }
    } else if (result.created < maxCreate) {
      const labels = labelsFor(cluster, areas);
      if (dryRun) {
        result.created++;
        continue;
      }
      const missing = labels.filter((name) => !ensured.has(name));
      await ensureLabels(api, missing);
      missing.forEach((name) => ensured.add(name));
      const title = (cluster.draft ? cluster.draft.title : cluster.title).slice(0, 240);
      const { status, data } = await api('POST', '/issues', { title, body: newBody(cluster, day.date, dashboardUrl), labels });
      if (status !== 201) throw new Error(`creating the issue for group ${cluster.id} failed (HTTP ${status})`);
      issue = data;
      result.created++;
    } else {
      result.skipped++;
      continue;
    }
    decisions[cluster.id] = decisionFrom(issue, auto);
  }
  return { decisions, ...result };
}

// Applies decisions to the night's day file and its index row, so the dashboard and digest show them right away.
function applyToNight(dataDir, date, decisions) {
  const dayFile = path.join(dataDir, 'days', `${date}.json`);
  const day = readJson(dayFile, null);
  if (!day) return null;
  day.clusters = withDrafts(applyDecisions(day.clusters, decisions), { suites: day.suites || [] });
  day.categories = categoryCounts(day.clusters);
  day.decisionStats = decisionPrecision(day.clusters);
  fs.writeFileSync(dayFile, JSON.stringify(day), 'utf-8');
  const indexFile = path.join(dataDir, 'index.json');
  const index = readJson(indexFile, null);
  const row = index && (index.days || []).find((item) => item.date === date);
  if (row) {
    row.categories = day.categories;
    row.decisionStats = day.decisionStats;
    fs.writeFileSync(indexFile, JSON.stringify(index), 'utf-8');
  }
  return day;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataDir = args['data-dir'];
  const date = args.date;
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!dataDir || !isValidDate(date)) throw new Error('--data-dir and a valid --date are required');
  if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repository || '')) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
  const day = readJson(path.join(dataDir, 'days', `${date}.json`), null);
  if (!day) throw new Error(`no day file for ${date}`);

  const suites = readJson(path.join(TRIAGE_DIR, 'suites.json'), { suites: [] }).suites || [];
  const areas = Object.fromEntries(suites.map((suite) => [suite.key, suite.area]));
  const dryRun = args['dry-run'] === 'true';
  const maxCreate = Math.max(0, Number(args['max-create'] || 10));
  const { decisions, created, updated, skipped } = await syncIssues({ day, api: githubApi(token, repository), areas, dashboardUrl: args['dashboard-url'] || '', maxCreate, dryRun });

  const summary = `${date}: ${created} issue(s) ${dryRun ? 'would be ' : ''}created, ${updated} updated, ${skipped} left for later nights (limit ${maxCreate}), ${Object.keys(decisions).length} group(s) linked`;
  if (!dryRun) {
    const file = path.join(dataDir, 'decisions.json');
    const stored = readJson(file, { clusters: {} });
    const merged = { updatedAt: new Date().toISOString(), clusters: { ...(stored.clusters || {}), ...decisions } };
    fs.writeFileSync(file, JSON.stringify(merged), 'utf-8');
    applyToNight(dataDir, date, merged.clusters);
  }
  console.log(`[triage:issues] ${summary}`);
  // Issues are never reopened by the sync; say which ones a group failed again on, so the job log shows it too.
  const again = Object.values(decisions).filter((decision) => decision.state === 'closed').map((decision) => `#${decision.issue}`);
  if (again.length) console.log(`::notice title=Triage issues::${again.length} group(s) failed again on a closed issue: ${again.join(', ')}. Reopen them.`);
}

if (require.main === module) {
  main().catch((err) => console.log(`::warning title=Triage issues::${err.message}`));
}

module.exports = { syncIssues, labelsFor, newBody, draftSection, applyToNight };
