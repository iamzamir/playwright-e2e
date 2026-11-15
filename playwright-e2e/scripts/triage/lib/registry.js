const fs = require('fs');
const { isFailure } = require('./allure-results');

const DEFAULT_RECOVERY_PASSES = 3;

// Glob for spec paths relative to tests/: "**" spans folders, "*" stays inside one segment.
function globToRegExp(glob) {
  const escaped = String(glob)
    .replace(/\\/g, '/')
    .replace(/[\\.+^${}()|[\]]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^(?:.*/)?${escaped}$`);
}

function loadEntries(filePath, key) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return Array.isArray(data[key]) ? data[key] : [];
}

function isExpired(entry, today) {
  return Boolean(entry.expires) && entry.expires < today;
}

function inList(list, value) {
  if (!Array.isArray(list) || list.length === 0 || !value) return true;
  return list.map((item) => String(item).toUpperCase()).includes(String(value).toUpperCase());
}

// Every selector present on the entry must match; absent selectors match anything.
function matchesTest(match, test, context, { ignoreMessage = false } = {}) {
  if (!match) return false;
  if (match.spec && !globToRegExp(match.spec).test(test.spec)) return false;
  if (match.test && !String(test.name || '').toLowerCase().includes(String(match.test).toLowerCase())) return false;
  if (match.testRegex && !new RegExp(match.testRegex, 'i').test(String(test.name || ''))) return false;
  if (!ignoreMessage && match.messageRegex && !new RegExp(match.messageRegex, 'i').test(test.fullMessage || test.message || '')) return false;
  if (!inList(match.environment, context.environment)) return false;
  if (!inList(match.gateway, context.gateway)) return false;
  return Boolean(match.spec || match.test || match.testRegex || match.messageRegex);
}

/**
 * Loads triage/known-issues.json and triage/quarantine.json.
 * Expired entries are returned separately so the verdict can ask for a re-check instead of silently applying them.
 */
function loadRegistry({ knownIssuesPath, quarantinePath, today = new Date().toISOString().slice(0, 10) }) {
  const knownIssues = loadEntries(knownIssuesPath, 'issues');
  const quarantine = loadEntries(quarantinePath, 'tests');
  return {
    knownIssues: knownIssues.filter((entry) => !isExpired(entry, today)),
    quarantine: quarantine.filter((entry) => !isExpired(entry, today)),
    expired: [
      ...knownIssues.filter((entry) => isExpired(entry, today)).map((entry) => ({ ...entry, type: 'known-issue', id: entry.id, title: entry.title, expires: entry.expires })),
      ...quarantine.filter((entry) => isExpired(entry, today)).map((entry) => ({ ...entry, type: 'quarantine', id: entry.id, title: entry.reason, expires: entry.expires }))
    ]
  };
}

function findKnownIssue(registry, test, context) {
  return registry.knownIssues.find((entry) => matchesTest(entry.match, test, context)) || null;
}

function requiredPasses(issue) {
  const configured = Number(issue.autoCloseAfterPasses);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_RECOVERY_PASSES;
}

function findRecoveredKnownIssues(registry, tests, history, context) {
  const recovered = [];
  for (const issue of registry.knownIssues) {
    if (!issue.match || !(issue.match.spec || issue.match.test || issue.match.testRegex)) continue;
    const covered = tests.filter((test) => matchesTest(issue.match, test, context, { ignoreMessage: true }));
    if (!covered.length || covered.some((test) => test.status !== 'passed' || test.flaky)) continue;
    const required = requiredPasses(issue);
    let failedBefore = false;
    const streaks = covered.map((test) => {
      const items = (history[test.historyId] || {}).items || [];
      if (items.some((item) => isFailure(item.status))) failedBefore = true;
      const firstNonPass = items.findIndex((item) => item.status !== 'passed');
      return { test, consecutivePasses: 1 + (firstNonPass === -1 ? items.length : firstNonPass) };
    });
    if (!failedBefore || streaks.some((streak) => streak.consecutivePasses < required)) continue;
    recovered.push({ issue, requiredPasses: required, tests: streaks });
  }
  return recovered;
}

function findQuarantine(registry, test, context) {
  return registry.quarantine.find((entry) => matchesTest(entry.match, test, context, { ignoreMessage: true })) || null;
}

function loadServiceMap(filePath) {
  return loadEntries(filePath, 'services').map((entry) => ({ ...entry, regex: entry.endpointRegex ? new RegExp(entry.endpointRegex, 'i') : null }));
}

// The causal endpoint decides when it belongs to a known service; otherwise the spec folder does.
function serviceFor(services, { endpoint, spec }) {
  const found = (endpoint && services.find((entry) => entry.regex && entry.regex.test(endpoint)))
    || (spec && services.find((entry) => (entry.specPrefixes || []).some((prefix) => String(spec).replace(/\\/g, '/').startsWith(prefix))));
  return found ? { key: found.key, name: found.name, repo: found.repo || null, team: found.team || null } : null;
}

module.exports = { globToRegExp, matchesTest, loadRegistry, findKnownIssue, findRecoveredKnownIssues, findQuarantine, loadServiceMap, serviceFor };
