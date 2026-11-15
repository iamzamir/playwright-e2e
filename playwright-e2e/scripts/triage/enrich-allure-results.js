/**
 * Enriches raw allure-results before `allure generate` (run in the CI report job):
 * - adds epic / feature / layer / service labels derived from the spec path, so every spec is grouped
 *   without editing specs (backend specs use the base Playwright `test`, so a fixture cannot label them);
 * - gives serial-cascade skips a "Blocked: ..." reason naming the failed test that stopped the file;
 * - copies triage/categories.json in, so Allure buckets failures by cause instead of "Product defects".
 *
 * Usage: node scripts/triage/enrich-allure-results.js <allure-results-dir>
 */
const fs = require('fs');
const path = require('path');
const { BLOCKED_PREFIX, readResults, summarizeTests, getLabel, specOf } = require('./lib/allure-results');

const CATEGORIES_FILE = path.resolve(__dirname, '../../triage/categories.json');

const AREAS = {
  PlanningSpace: { epic: 'Planning Space UI', layer: 'ui', service: 'planning-mfe' },
  ProcessOrchestration: { epic: 'Process Orchestration UI', layer: 'ui', service: 'lui' },
  ProcessOrchestrationBackend: { epic: 'Process Orchestration Backend API', layer: 'api', service: 'process-orchestration-service' },
  DataSetupBatch: { epic: 'Data Setup', layer: 'setup', service: 'data-setup' }
};

const BACKEND_SERVICES = {
  ActionItem: 'actionitem',
  LinkManagement: 'link-management',
  UIFields: 'ui-fields-service'
};

function deriveLabels(spec) {
  const [area, feature] = spec.split('/');
  const known = AREAS[area];
  if (!known) return [];
  const service = area === 'ProcessOrchestrationBackend' ? (BACKEND_SERVICES[feature] || known.service) : known.service;
  const labels = [
    { name: 'epic', value: known.epic },
    { name: 'layer', value: known.layer },
    { name: 'service', value: service }
  ];
  if (feature && !feature.endsWith('.spec.ts')) labels.push({ name: 'feature', value: feature });
  return labels;
}

function enrichAllureResults(resultsDir) {
  if (!resultsDir || !fs.existsSync(resultsDir)) {
    console.warn(`[triage:enrich] Results folder not found: ${resultsDir}`);
    return { labelled: 0, blocked: 0 };
  }

  const results = readResults(resultsDir);
  const tests = summarizeTests(results);
  const blockedByFile = new Map(tests.filter((test) => test.blockedBy).map((test) => [test.result._file, test.blockedBy]));

  let labelled = 0;
  let blocked = 0;
  for (const result of results) {
    let changed = false;
    result.labels = result.labels || [];
    for (const label of deriveLabels(specOf(result))) {
      if (getLabel(result, label.name) === undefined) {
        result.labels.push(label);
        changed = true;
      }
    }
    if (changed) labelled++;

    const blocker = blockedByFile.get(result._file);
    if (blocker) {
      result.statusDetails = { ...(result.statusDetails || {}), message: `${BLOCKED_PREFIX} skipped because "${blocker}" failed earlier in this serial spec.` };
      blocked++;
      changed = true;
    }

    if (changed) fs.writeFileSync(result._file, JSON.stringify(result), 'utf-8');
  }

  if (fs.existsSync(CATEGORIES_FILE)) {
    fs.copyFileSync(CATEGORIES_FILE, path.join(resultsDir, 'categories.json'));
  }

  console.log(`[triage:enrich] ${results.length} result file(s): labelled ${labelled}, marked ${blocked} blocked skip(s), categories ${fs.existsSync(CATEGORIES_FILE) ? 'installed' : 'missing'}.`);
  return { labelled, blocked };
}

if (require.main === module) {
  enrichAllureResults(process.argv[2]);
}

module.exports = { enrichAllureResults, deriveLabels };
