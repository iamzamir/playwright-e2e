/**
 * Lists recurring failures that are not yet registered, as candidate entries for triage/known-issues.json
 * or triage/quarantine.json. A person reviews each one, adds the Jira key and category, and commits it.
 *
 * Usage: node scripts/triage/suggest-known-issues.js --results <allure-results> [--history <dir>]
 *          [--env QA|INTEROP] [--gateway AZURE|GRAVITEE] [--min-failed 3] [--out <file.json>]
 */
const fs = require('fs');
const path = require('path');
const { isFailure, readResults, summarizeTests } = require('./lib/allure-results');
const { loadRegistry, findKnownIssue, findQuarantine } = require('./lib/registry');
const { parseArgs } = require('./verdict');

const TRIAGE_DIR = path.resolve(__dirname, '../../triage');

const CATEGORY_HINTS = [
  [/Bad Gateway|Service Unavailable|Gateway Timeout|status code 50[234]|ECONN|ETIMEDOUT|net::ERR_/i, 'ENVIRONMENT_ISSUE'],
  [/launchAppFromCatalog|Login failed|Unauthorized|status code 401/i, 'ENVIRONMENT_ISSUE'],
  [/strict mode violation|TypeError|ReferenceError|is not a function|with any selector/i, 'AUTOMATION_ISSUE'],
  [/No .*candidate|did not become visible in the .* list|already exists|status code 40[49]/i, 'TEST_DATA_ISSUE'],
  [/Received:\s*"?5\d\d|status code 500|Internal Server Error/i, 'PRODUCT_DEFECT']
];

function suggestCategory(message) {
  const hit = CATEGORY_HINTS.find(([pattern]) => pattern.test(message));
  return hit ? hit[1] : 'TO_CLASSIFY';
}

// Regex for the stable start of the error: literal text, with numbers loosened.
function messagePattern(message) {
  return message.slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\d+/g, '\\d+');
}

function suggest({ tests, history, registry, context, minFailed }) {
  const groups = new Map();
  for (const test of tests.filter((item) => isFailure(item.status))) {
    if (findKnownIssue(registry, test, context) || findQuarantine(registry, test, context)) continue;
    const items = ((history[test.historyId] || {}).items || []).slice(0, 6);
    const failedNights = 1 + items.filter((item) => isFailure(item.status)).length;
    const flips = items.filter((item) => item.status === 'passed').length;
    if (failedNights < minFailed) continue;
    const key = `${test.spec}|${test.signature}`;
    if (!groups.has(key)) groups.set(key, { spec: test.spec, message: test.message, fullMessage: test.fullMessage || test.message, tests: [], failedNights: 0, passedNights: 0 });
    const group = groups.get(key);
    group.tests.push(test.name);
    group.failedNights = Math.max(group.failedNights, failedNights);
    group.passedNights = Math.max(group.passedNights, flips);
  }

  return [...groups.values()]
    .sort((a, b) => b.failedNights - a.failedNights || b.tests.length - a.tests.length)
    .map((group) => ({
      register: group.passedNights > 0 && group.failedNights < 6 ? 'quarantine.json (intermittent) or known-issues.json' : 'known-issues.json',
      failedOfLast7: group.failedNights,
      id: 'KI-?',
      jira: null,
      title: `${path.basename(group.spec, '.spec.ts')}: ${group.message.slice(0, 100)}`,
      category: suggestCategory(group.fullMessage),
      match: {
        spec: group.spec,
        ...(group.tests.length === 1 ? { test: group.tests[0] } : {}),
        messageRegex: messagePattern(group.message),
        ...(context.environment ? { environment: [context.environment] } : {}),
        ...(context.gateway ? { gateway: [context.gateway] } : {})
      },
      tests: group.tests
    }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const resultsDir = args.results || 'reports/allure-results';
  const historyDir = args.history || path.join(resultsDir, 'history');
  const context = { environment: args.env || process.env.TEST_ENV || '', gateway: args.gateway || process.env.GATEWAY_TYPE || '' };
  const registry = loadRegistry({ knownIssuesPath: path.join(TRIAGE_DIR, 'known-issues.json'), quarantinePath: path.join(TRIAGE_DIR, 'quarantine.json') });
  const historyFile = path.join(historyDir, 'history.json');
  const history = fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf-8')) : {};
  const candidates = suggest({ tests: summarizeTests(readResults(resultsDir)), history, registry, context, minFailed: Number(args['min-failed'] || 3) });

  const output = JSON.stringify(candidates, null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, output, 'utf-8');
    console.log(`[triage:suggest] ${candidates.length} candidate(s) written to ${args.out}`);
  } else {
    console.log(output);
  }
}

if (require.main === module) {
  main();
}

module.exports = { suggest, suggestCategory, messagePattern };
