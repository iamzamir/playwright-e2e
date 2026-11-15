/**
 * Change correlation (plan §7.5), first part: what changed since the previous night for a group that is new tonight.
 *   - app:        a UI app build (E7) that differs from the previous night's run of one of the group's suites. Only for
 *                 groups with a UI test, since the API suites don't load the apps.
 *   - automation: this repo's commit differs from the previous night's run of one of the group's suites, and the
 *                 commit range touched the group's spec or the file of its failing frame.
 * Only new groups that aren't tracked or ENVIRONMENT_ISSUE. Backend service changes aren't covered: the services
 * expose no version (§4.2).
 */
const { deriveLabels } = require('../enrich-allure-results');

const MAX_SUSPECTS = 5;
// Tracked groups already have an owner; environment issues are explained by the environment, not by a code change.
const SKIPPED = new Set(['KNOWN_ISSUE', 'FLAKY', 'ENVIRONMENT_ISSUE']);
const SHA = /^[0-9a-f]{7,40}$/i;
const REPOSITORY = /^[\w.-]+\/[\w.-]+$/;
const DEFAULT_OWNER = 'BY-Product-Development';
// Repo paths are relative to the repository root; specs and frames are relative to playwright-e2e/.
const E2E_ROOT = 'playwright-e2e/';

function isUiTest(test) {
  return deriveLabels(String(test.spec || '')).some((label) => label.name === 'layer' && label.value === 'ui');
}

// Files a group depends on, as repo paths: its specs and the file of its failing frame. Run data gives specs relative
// to tests/ ("PlanningSpace/x.spec.ts") and frames relative to playwright-e2e/ ("tests/PlanningSpace/x.spec.ts",
// "pageobjects/x.page.ts › X.y"); an optional playwright-e2e/ or tests/ prefix is tolerated on either.
function groupFiles(cluster) {
  const fromE2e = (file) => String(file || '').trim().replace(/^\.?\/?/, '').replace(/^playwright-e2e\//, '');
  const files = new Set((cluster.tests || []).filter((test) => test.spec)
    .map((test) => `${E2E_ROOT}tests/${fromE2e(test.spec).replace(/^tests\//, '')}`));
  const location = fromE2e(String(cluster.location || '').split(' › ')[0]);
  if (location) files.add(`${E2E_ROOT}${location}`);
  return files;
}

// The app's repository: what its bundle reported (GITHUB_REPOSITORY), else its service-map `repo` under the owner of
// the bundle or of this repo (same rule as commitRepo in dashboard/app.js).
function appRepository(build, ownRepository) {
  const bundle = REPOSITORY.test(String(build.repository || '')) ? build.repository.split('/') : null;
  const name = /^[\w.-]+$/.test(String(build.repo || '')) ? build.repo : bundle ? bundle[1] : null;
  const owner = bundle ? bundle[0] : REPOSITORY.test(String(ownRepository || '')) ? ownRepository.split('/')[0] : DEFAULT_OWNER;
  return name ? `${owner}/${name}` : null;
}

function compareUrl(repository, from, to) {
  return REPOSITORY.test(String(repository)) && SHA.test(from) && SHA.test(to) ? `https://github.com/${repository}/compare/${from}...${to}` : null;
}

/**
 * @param clusters    tonight's groups after withHistory (trend set)
 * @param suites      tonight's day-file suites: buildChanges, builds, automationChange
 * @param options     { repository: "owner/name" of this repo, changedFiles: async (from, to) => string[] | null }
 */
async function withSuspectChanges(clusters, suites, { repository = null, changedFiles = async () => null } = {}) {
  const byKey = new Map((suites || []).map((suite) => [suite.key, suite]));
  const filesCache = new Map();
  const filesBetween = (from, to) => {
    const key = `${from}...${to}`;
    if (!filesCache.has(key)) filesCache.set(key, Promise.resolve(changedFiles(from, to)).catch(() => null));
    return filesCache.get(key);
  };

  const out = [];
  for (const cluster of clusters) {
    if (cluster.trend !== 'new' || SKIPPED.has(cluster.category)) {
      out.push(cluster);
      continue;
    }
    const groupSuites = (cluster.suites || []).map((key) => byKey.get(key)).filter(Boolean);
    const suspects = new Map();

    if ((cluster.tests || []).some(isUiTest)) {
      for (const suite of groupSuites) {
        for (const change of suite.buildChanges || []) {
          const id = `app:${change.key}:${change.from}:${change.to}`;
          if (suspects.has(id)) {
            suspects.get(id).suites.push(suite.key);
            continue;
          }
          const build = (suite.builds || []).find((item) => item.key === change.key) || {};
          const appRepo = appRepository(build, repository);
          suspects.set(id, {
            kind: 'app', key: change.key, name: change.name || change.key, repository: appRepo,
            from: change.from, to: change.to, url: compareUrl(appRepo, change.from, change.to), suites: [suite.key]
          });
        }
      }
    }

    const needed = groupFiles(cluster);
    for (const suite of groupSuites) {
      const change = suite.automationChange;
      if (!change || !SHA.test(change.from) || !SHA.test(change.to)) continue;
      const id = `automation:${change.from}:${change.to}`;
      if (suspects.has(id)) {
        suspects.get(id).suites.push(suite.key);
        continue;
      }
      const changed = await filesBetween(change.from, change.to);
      // Unknown file list (no token, API error): still worth naming, but say so. Known and unrelated: not a suspect.
      const touched = Array.isArray(changed) ? changed.filter((file) => needed.has(file)) : null;
      if (Array.isArray(touched) && !touched.length) continue;
      suspects.set(id, {
        kind: 'automation', repository, from: change.from, to: change.to, url: compareUrl(repository, change.from, change.to),
        files: touched, suites: [suite.key]
      });
    }

    const list = [...suspects.values()].slice(0, MAX_SUSPECTS);
    out.push(list.length ? { ...cluster, suspectChanges: list } : cluster);
  }
  return out;
}

module.exports = { withSuspectChanges, groupFiles, MAX_SUSPECTS };
