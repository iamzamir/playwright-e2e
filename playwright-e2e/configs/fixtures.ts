import { test as base, expect } from '@playwright/test';
import type { BrowserContextOptions } from '@playwright/test';
import type { Browser, BrowserContext, ConsoleMessage, Page, Request, TestInfo } from '@playwright/test';
import { ActionItemsPage } from '../pageobjects/action-items.page';
import { DrillThroughPage } from '../pageobjects/drillthrough.page';
import { PlanningPage } from '../pageobjects/planning.page';
import { PortalPage } from '../pageobjects/portal.page';
import LoginPage from '../pageobjects/login.page';
import { PlanningListingPage } from '../pageobjects/planning-listing.page';
import { ScopePage } from '../pageobjects/scope.page';
import { ProcessPage } from '../pageobjects/process.page';
import { PowerBarPage } from '../pageobjects/powerbar.page';
import { OdmPage } from '../pageobjects/odm.page';
import { ScenarioPage } from '../pageobjects/scenario.page';
import SCAPage from '../pageobjects/sca.page';
import { GlobalSettingsPage } from '../pageobjects/global-settings.page';
import { AssumptionPage } from '../pageobjects/assumption.page';
import { ProcessSettingsPage } from '../pageobjects/process-settings.page';
import { checkLedgerFixture, CommonFunctions } from '../util/common.util';
import { TestUtil } from '../util/test.util';
import { applyGatewayOverrides, applyRealmKeyOverride, getAuthStateRealmFolder, isGraviteeGateway } from '../util/gateway.util';
import { NetworkInterceptor } from '../network/network.interceptor';
import type { NetworkBodyFidelity } from '../network/network.interceptor';
import { captureFailureState } from './failure-hook';
import { apiCallsFixture, bodyText, redactApiText } from '../util/api-calls.util';
import type { CreatedEntities } from '../util/created-entities.util';
import { createdEntitiesWorkerFixture } from '../util/entity-deleters.util';
import { validateAreaSnapshot, validatePageSnapshot } from '../util/visual-helper.util';
import type { AreaSnapshotOptions, PageLoadOptions } from '../util/visual-helper.util';
import type { Locator } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { CardsPage } from '../pageobjects/cards.page';
import BasePage  from '../pageobjects/page';

type TestFixtures = {
  _realmKeyOverride: void;
  _apiCalls: void;
  _checkLedger: void;
  _networkCapture: void;
  _observability: void;
  _failureCapture: void;
  _visualValidation: void;
  visual: VisualValidator;
  actionItemsPage: ActionItemsPage;
  drillThroughPage: DrillThroughPage;
  planningPage: PlanningPage;
  portalPage: PortalPage;
  loginPage: LoginPage;
  planningListingPage: PlanningListingPage;
  scopePage: ScopePage;
  processPage: ProcessPage;
  powerBarPage: PowerBarPage;
  odmPage: OdmPage;
  scenarioPage: ScenarioPage;
  cardsPage: CardsPage;
  scaPage: SCAPage;
  globalSettingsPage: GlobalSettingsPage;
  assumptionPage: AssumptionPage;
  processSettingsPage: ProcessSettingsPage;
  basePage: BasePage;
  commonFunctions: CommonFunctions;
  testUtil: TestUtil;
  testData: Record<string, any>;
};

type WorkerFixtures = {
  createdEntities: CreatedEntities;
};

/**
 * Visual validation surface exposed to specs.
 * - validatePage: wait for the page to load completely, then baseline the full viewport.
 * - validateArea: baseline only a specific region (locator) of the page.
 * Both are no-ops unless VISUAL_VALIDATION=true, so they are safe to leave in functional specs.
 */
type VisualValidator = {
  validatePage: (name?: string, options?: PageLoadOptions) => Promise<void>;
  validateArea: (area: Locator, name: string, options?: AreaSnapshotOptions) => Promise<void>;
};

// Annotation stamped by the `visual` fixture when a spec runs its own explicit
// visual assertion, signalling the auto full-page fixture to stand down.
const VISUAL_EXPLICIT_ANNOTATION = 'visual-explicit';

type PageCacheScope = 'worker' | 'file-worker';
type NetworkArtifactMode = 'always' | 'failure-only' | 'never';
type ObservabilityArtifactMode = 'always' | 'failure-only' | 'never';

type ArtifactTestInfo = Pick<TestInfo, 'project' | 'file' | 'title' | 'retry'>;

type VideoDirTestInfo = Pick<TestInfo, 'file' | 'workerIndex' | 'title' | 'retry'>;

type ExecutionDetails = {
  testId: string;
  title: string;
  file: string;
  project: string;
  workerIndex: number;
  retry: number;
  status: TestInfo['status'];
  expectedStatus: TestInfo['expectedStatus'];
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  environment: string;
};

type WorkerPageCache = {
  activeFileByWorker: Record<number, string>;
  pagesByKey: Record<string, Page>;
  contextsByKey: Record<string, BrowserContext>;
};

type GlobalWithWorkerPageCache = typeof globalThis & {
  __playwrightPageCache?: WorkerPageCache;
};

type AuthUserAlias = 'user1' | 'user2';

const AUTH_ROOT_DIR = path.join(__dirname, '../testdata/.auth');

/**
 * Resolve the active test environment from a single source of truth.
 * ENVIRONMENT and PSENV are both used across workflows/scripts; unify them so
 * auth-state resolution and test-data loading always agree on the same env.
 */
const getEnvironment = (): string => {
  return (
    process.env.ENVIRONMENT
    || process.env.PSENV
    || 'INTEROP'
  ).trim() || 'INTEROP';
};

/**
 * Worker-scoped page management utility
 * Maintains a cache of pages per worker to enable page reuse across serial tests
 */
const getWorkerPageCache = (): WorkerPageCache => {
  const globalState = globalThis as GlobalWithWorkerPageCache;
  globalState.__playwrightPageCache = globalState.__playwrightPageCache || {
    activeFileByWorker: {},
    pagesByKey: {},
    contextsByKey: {},
  };
  return globalState.__playwrightPageCache;
};

const getPageCacheScope = (): PageCacheScope => {
  const rawScope = process.env.PW_PAGE_CACHE_SCOPE;

  if (!rawScope) {
    return 'file-worker';
  }

  const scope = rawScope.toLowerCase();
  if (scope === 'worker' || scope === 'file-worker') {
    return scope;
  }

  console.warn(
    `[FIXTURE] Invalid PW_PAGE_CACHE_SCOPE value "${rawScope}". ` +
    'Allowed values are "worker" or "file-worker". Falling back to "file-worker".'
  );
  return 'file-worker';
};

const isPageCacheDisabled = (): boolean => {
  return (process.env.PW_DISABLE_PAGE_CACHE || '').trim().toLowerCase() === 'true';
};

const buildPageCacheKey = (workerIndex: number, testFile: string): string => {
  const scope = getPageCacheScope();
  if (scope === 'file-worker') {
    const normalizedFile = testFile.replace(/\\/g, '/').toLowerCase();
    return `page_worker_${workerIndex}_file_${normalizedFile}`;
  }
  // Worker scope spans spec files, and _realmKeyOverride can switch the Gravitee tenant per spec, so key the
  // cached page by the effective REALM_KEY to never reuse another tenant's cookies.
  const realmKey = isGraviteeGateway() ? (process.env.REALM_KEY || '').trim() : '';
  return realmKey ? `page_worker_${workerIndex}_realm_${realmKey}` : `page_worker_${workerIndex}`;
};

const buildContextCacheKey = (pageKey: string): string => {
  return `${pageKey}__context`;
};

const sanitizeName = (value: string, maxLength: number = 60): string => {
  return value
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength) || 'unknown';
};

const sanitizeSensitiveText = (value: string): string => {
  const shouldRedact = (process.env.REDACT_BEARER_TOKEN || 'true').trim().toLowerCase() === 'true';
  return shouldRedact ? bodyText(value) || '' : value;
};

const buildArtifactPrefix = (testInfo: ArtifactTestInfo): string => {
  const project = sanitizeName(testInfo.project.name, 30);
  const file = sanitizeName(path.basename(testInfo.file, path.extname(testInfo.file)), 30);
  const title = sanitizeName(testInfo.title, 50);
  return `${project}__${file}__${title}__r${testInfo.retry}`;
};

const buildVideoDir = (testInfo: VideoDirTestInfo, perTest: boolean = false): string => {
  const fileName = sanitizeName(path.basename(testInfo.file, path.extname(testInfo.file)), 50);
  const reportTag = process.env.PW_REPORT_TAG || '';
  const baseDir = reportTag
    ? path.join('test-results', reportTag, 'videos', `${fileName}__w${testInfo.workerIndex}`)
    : path.join('test-results', 'videos', `${fileName}__w${testInfo.workerIndex}`);
  if (!perTest) {
    return baseDir;
  }
  // Per-test scoping keeps each test's video isolated so that
  // retain-on-failure deletes only the passing tests' recordings.
  const title = sanitizeName(testInfo.title, 50);
  return path.join(baseDir, `${title}__r${testInfo.retry}`);
};

const buildExecutionDetails = (testInfo: TestInfo, startedAt: string, finishedAt: string): ExecutionDetails => {
  return {
    testId: testInfo.testId,
    title: testInfo.title,
    file: testInfo.file,
    project: testInfo.project.name,
    workerIndex: testInfo.workerIndex,
    retry: testInfo.retry,
    status: testInfo.status,
    expectedStatus: testInfo.expectedStatus,
    durationMs: testInfo.duration,
    startedAt,
    finishedAt,
    environment: getEnvironment()
  };
};

const getNetworkArtifactMode = (): NetworkArtifactMode => {
  const raw = (process.env.PW_NETWORK_ARTIFACT_MODE || '').trim().toLowerCase();

  if (raw === 'always' || raw === 'failure-only' || raw === 'never') {
    return raw;
  }

  return 'failure-only';
};

const shouldPersistNetworkArtifact = (testInfo: TestInfo): boolean => {
  const mode = getNetworkArtifactMode();
  if (mode === 'always') {
    return true;
  }
  if (mode === 'never') {
    return false;
  }

  return testInfo.status !== testInfo.expectedStatus;
};

/**
 * Body fidelity for captured network logs (workflow-selectable via env).
 * - 'full'   : keep every captured request/response.
 * - 'capped' : keep only HTTP errors (status >= 400) and genuine network
 *              failures (errorText not in the ignore list); drop successful
 *              calls and aborted teardown beacons.
 * Either way, bodies are redacted and capped at 20,000 chars (see NetworkInterceptor).
 * Default is 'capped' to keep published Allure attachments small.
 */
const getNetworkBodyFidelity = (): NetworkBodyFidelity => {
  const raw = (process.env.PW_NETWORK_BODY_FIDELITY || '').trim().toLowerCase();
  return raw === 'full' ? 'full' : 'capped';
};

/**
 * Failure `errorText` values treated as noise and dropped in 'capped' mode.
 * Defaults to `net::ERR_ABORTED` (beacons cancelled at test teardown).
 * Override with a comma-separated PW_NETWORK_IGNORED_FAILURES.
 */
const getNetworkIgnoredFailures = (): string[] => {
  const raw = (process.env.PW_NETWORK_IGNORED_FAILURES || '').trim();
  if (!raw) {
    return ['net::ERR_ABORTED'];
  }
  return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
};

const getObservabilityArtifactMode = (): ObservabilityArtifactMode => {
  const raw = (process.env.PW_OBSERVABILITY_MODE || '').trim().toLowerCase();

  if (raw === 'always' || raw === 'failure-only' || raw === 'never') {
    return raw;
  }

  return 'failure-only';
};

const shouldPersistObservabilityArtifact = (testInfo: TestInfo): boolean => {
  const mode = getObservabilityArtifactMode();
  if (mode === 'always') {
    return true;
  }
  if (mode === 'never') {
    return false;
  }

  return testInfo.status !== testInfo.expectedStatus;
};

const getActiveFileForWorker = (cache: WorkerPageCache, workerIndex: number): string | undefined => {
  return cache.activeFileByWorker[workerIndex];
};

const setActiveFileForWorker = (cache: WorkerPageCache, workerIndex: number, file: string): void => {
  cache.activeFileByWorker[workerIndex] = file;
};

const getCachedPage = (cache: WorkerPageCache, pageKey: string): Page | undefined => {
  return cache.pagesByKey[pageKey];
};

const getCachedContext = (cache: WorkerPageCache, contextKey: string): BrowserContext | undefined => {
  return cache.contextsByKey[contextKey];
};

const setCachedArtifacts = (cache: WorkerPageCache, pageKey: string, contextKey: string, page: Page, context: BrowserContext): void => {
  cache.pagesByKey[pageKey] = page;
  cache.contextsByKey[contextKey] = context;
};

const deleteCachedArtifacts = (cache: WorkerPageCache, pageKey: string, contextKey: string): void => {
  delete cache.pagesByKey[pageKey];
  delete cache.contextsByKey[contextKey];
};

const closeCachedArtifacts = async (cache: WorkerPageCache, pageKey: string, contextKey: string, workerIndex: number): Promise<void> => {
  const context = getCachedContext(cache, contextKey);
  if (context) {
    await context.close();
    console.log(`[FIXTURE] Closed context for previous file on worker ${workerIndex}`);
    deleteCachedArtifacts(cache, pageKey, contextKey);
    return;
  }

  const page = getCachedPage(cache, pageKey);
  if (page && !page.isClosed()) {
    await page.close();
    console.log(`[FIXTURE] Closed page for previous file on worker ${workerIndex}`);
  }

  deleteCachedArtifacts(cache, pageKey, contextKey);
};

const ensureFreshCachedPage = async (cache: WorkerPageCache, pageKey: string, contextKey: string): Promise<void> => {
  const page = getCachedPage(cache, pageKey);
  if (!page || !page.isClosed()) {
    return;
  }

  const context = getCachedContext(cache, contextKey);
  if (context) {
    await context.close();
  }

  deleteCachedArtifacts(cache, pageKey, contextKey);
};

const slugifyRealm = (realm: string): string => {
  return realm
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
};

const inferUserAliasFromSpecSource = async (testFilePath: string): Promise<AuthUserAlias | undefined> => {
  try {
    if (!fs.existsSync(testFilePath)) {
      return undefined;
    }

    const source = await fs.promises.readFile(testFilePath, 'utf-8');
    if (
      source.includes('FUNCTIONAL_TEST_USERNAME2')
      || source.includes('FUNCTIONAL_TEST_USERNAME_2')
    ) {
      return 'user2';
    }
  } catch {
    // Ignore source-read issues and fall back to other heuristics.
  }

  return undefined;
};

const resolveUserAliasFromHints = async (
  testInfo: TestInfo,
  testData: Record<string, any> | undefined,
): Promise<AuthUserAlias> => {
  const envAliasRaw = (process.env.PW_AUTH_USER_ALIAS || process.env.PW_AUTH_USER || '').trim().toLowerCase();
  if (envAliasRaw === 'user2') {
    return 'user2';
  }
  if (envAliasRaw === 'user1') {
    return 'user1';
  }

  const dataAliasRaw = String(
    testData?.AUTH_USER_ALIAS
    || testData?.TEST_USER_ALIAS
    || ''
  ).trim().toLowerCase();
  if (dataAliasRaw === 'user2') {
    return 'user2';
  }
  // Pins user1 for specs that start as user1 and switch to user2 mid-spec (their source names FUNCTIONAL_TEST_USERNAME2).
  if (dataAliasRaw === 'user1') {
    return 'user1';
  }

  if (
    testData?.IS_SECOND_USER === true
    || testData?.USE_SECOND_USER === true
  ) {
    return 'user2';
  }

  const annotationMatch = testInfo.annotations.some((annotation) => {
    const type = (annotation.type || '').trim().toLowerCase();
    const description = (annotation.description || '').trim().toLowerCase();
    return type === 'user2' || description === 'user2' || (type === 'auth-user' && description === 'user2');
  });
  if (annotationMatch || testInfo.title.includes('@user2')) {
    return 'user2';
  }

  const fromSpecSource = await inferUserAliasFromSpecSource(testInfo.file);
  if (fromSpecSource) {
    return fromSpecSource;
  }

  return 'user1';
};

const resolveAuthStatePathForTest = async (testInfo: TestInfo): Promise<string | undefined> => {
  if ((process.env.PW_DISABLE_AUTH_STATE || '').trim().toLowerCase() === 'true') {
    return undefined;
  }

  const environment = getEnvironment();

  let testData: Record<string, any> | undefined;
  try {
    const testDataPath = resolveTestDataPath(testInfo.file, environment);
    if (fs.existsSync(testDataPath)) {
      testData = applyGatewayOverrides(await loadTestDataCached(testDataPath), testDataPath);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[FIXTURE] Unable to load test data for auth resolution: ${message}`);
  }

  const realmNameRaw = String(testData?.REALM_NAME || process.env.REALM_NAME || '').trim();
  if (!realmNameRaw) {
    return undefined;
  }

  const alias = await resolveUserAliasFromHints(testInfo, testData);
  const realmSlug = slugifyRealm(getAuthStateRealmFolder(realmNameRaw));
  const requestedPath = path.join(AUTH_ROOT_DIR, realmSlug, `${alias}.json`);

  if (fs.existsSync(requestedPath)) {
    console.log(
      `[FIXTURE] Using storageState for test "${path.basename(testInfo.file)}": realm="${realmNameRaw}" userAlias="${alias}" file="${requestedPath}"`
    );
    return requestedPath;
  }

  if (alias === 'user2') {
    const strictUser2State = (process.env.PW_REQUIRE_USER2_STORAGE_STATE || '').trim().toLowerCase() === 'true';
    if (strictUser2State) {
      throw new Error(
        `[FIXTURE] Missing required user2 storageState for realm "${realmNameRaw}" at "${requestedPath}". ` +
        'Refusing fallback to user1. Ensure global setup can generate user2 state.'
      );
    }

    console.warn(
      `[FIXTURE] user2 storageState missing at "${requestedPath}" for realm="${realmNameRaw}". ` +
      'Proceeding without storageState and allowing runtime login with test credentials.'
    );
    return undefined;
  }

  console.warn(
    `[FIXTURE] No storageState found at "${requestedPath}" for realm="${realmNameRaw}" userAlias="${alias}". ` +
    'Proceeding without storageState and allowing runtime login fallback.'
  );

  return undefined;
};

const createContextAndPage = async (
  browser: Browser,
  contextOptions: BrowserContextOptions | undefined,
  testInfo: TestInfo,
  perTestVideo: boolean,
): Promise<{ context: BrowserContext; page: Page }> => {
  const authStatePath = await resolveAuthStatePathForTest(testInfo);

  const mergedContextOptions: BrowserContextOptions = {
    ...(contextOptions || {}),
    ...(contextOptions?.storageState === undefined && authStatePath
      ? { storageState: authStatePath }
      : {}),
    ...(contextOptions?.recordVideo === undefined
      ? { recordVideo: { dir: buildVideoDir(testInfo, perTestVideo) } }
      : {}),
  };

  const context = await browser.newContext(mergedContextOptions);
  const page = await context.newPage();
  return { context, page };
};

const createCachedPage = async (
  browser: Browser,
  contextOptions: BrowserContextOptions | undefined,
  testInfo: TestInfo,
  cache: WorkerPageCache,
  pageKey: string,
  contextKey: string,
): Promise<Page> => {
  const { context, page } = await createContextAndPage(browser, contextOptions, testInfo, false);
  setCachedArtifacts(cache, pageKey, contextKey, page, context);
  console.log(`[FIXTURE] Created page for worker ${testInfo.workerIndex} with cache scope ${getPageCacheScope()}`);
  return page;
};

const resolveTestDataPath = (testFile: string, environment: string): string => {
  const normalizedTestFile = testFile.replace(/\\/g, '/');
  const pathParts = normalizedTestFile.split('/');
  const testsIndex = pathParts.findIndex((part) => part === 'tests');

  if (testsIndex < 0) {
    throw new Error(
      `Unable to determine test data path: expected 'tests' directory segment in test file path, but got "${testFile}".`
    );
  }

  const remainingPath = pathParts.slice(testsIndex + 1).join('/').replace('.spec.ts', '.json');
  return path.join(__dirname, `../testdata/${environment}/${remainingPath}`);
};

const loadTestData = async (testDataPath: string): Promise<Record<string, any>> => {
  try {
    const fileContent = await fs.promises.readFile(testDataPath, 'utf-8');
    console.log(`Loaded test data from: ${testDataPath}`);
    return JSON.parse(fileContent) as Record<string, any>;
  } catch (error: unknown) {
    const fileError = error as NodeJS.ErrnoException;
    if (fileError?.code === 'ENOENT') {
      throw new Error(`Test data file not found: ${testDataPath}`);
    }

    const message = fileError?.message ? String(fileError.message) : String(error);
    throw new Error(`Error parsing test data from ${testDataPath}: ${message}`);
  }
};

/**
 * Per-worker memoization of test-data reads keyed by resolved path.
 * The same spec resolves the same test-data file during both auth-state
 * resolution and the `testData` fixture; caching avoids a duplicate fs read
 * per test. Test data is static for the lifetime of a worker process.
 */
const testDataCache = new Map<string, Promise<Record<string, any>>>();

const loadTestDataCached = (testDataPath: string): Promise<Record<string, any>> => {
  const cached = testDataCache.get(testDataPath);
  if (cached) {
    return cached;
  }

  const pending = loadTestData(testDataPath);
  testDataCache.set(testDataPath, pending);

  // Avoid caching a rejected promise so transient errors can be retried.
  pending.catch(() => {
    testDataCache.delete(testDataPath);
  });

  return pending;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  createdEntities: [createdEntitiesWorkerFixture, { scope: 'worker' }],
  // A spec's test data can pin its Gravitee tenant with REALM_KEY (normally in the GRAVITEE block);
  // the tenant env vars point at it for this test only and are restored afterwards.
  _realmKeyOverride: [async ({ }, use, testInfo) => {
    let realmKey: string | undefined;
    const testDataPath = resolveTestDataPath(testInfo.file, getEnvironment());
    if (fs.existsSync(testDataPath)) {
      realmKey = applyGatewayOverrides(await loadTestDataCached(testDataPath), testDataPath).REALM_KEY;
    }
    const restore = applyRealmKeyOverride(realmKey);
    try {
      await use();
    } finally {
      restore();
    }
  }, { auto: true }],

  _apiCalls: [apiCallsFixture, { auto: true }],

  _networkCapture: [async ({ page }, use, testInfo) => {
    const artifactPrefix = buildArtifactPrefix(testInfo);
    const bodyFidelity = getNetworkBodyFidelity();
    const interceptor = new NetworkInterceptor(page.context(), 'api-only', {
      bodyFidelity,
      ignoredFailureErrors: getNetworkIgnoredFailures()
    });
    interceptor.start();
    console.log(
      `[FIXTURE] Network interception enabled with mode: api-only, body fidelity: ${bodyFidelity}`
    );

    await use();

    await interceptor.stop();

    const shouldPersist = shouldPersistNetworkArtifact(testInfo);

    if (!shouldPersist) {
      const errorSummary = getNetworkArtifactMode() === 'never' ? [] : interceptor.getErrorSummaries();
      if (errorSummary.length > 0) {
        await testInfo.attach(`${artifactPrefix}__network-errors.json`, {
          body: Buffer.from(JSON.stringify(errorSummary), 'utf-8'),
          contentType: 'application/json'
        });
      }
      console.log(
        `[FIXTURE] Captured ${interceptor.getRetainedEntryCount()} retained network calls. ` +
        `Skipped artifact persistence (PW_NETWORK_ARTIFACT_MODE=${getNetworkArtifactMode()}).`
      );
      return;
    }

    const networkEntries = interceptor.getEntries();

    // In 'capped' mode the log holds only errors/failures; if there are none,
    // there is nothing useful to attach. Skip and hint at full mode.
    if (bodyFidelity === 'capped' && networkEntries.length === 0) {
      console.log(
        '[FIXTURE] No error/failure network calls captured (capped mode); ' +
        'skipping empty network-log artifact. Re-run with ' +
        'PW_NETWORK_BODY_FIDELITY=full for complete network capture.'
      );
      return;
    }

    const networkLog = JSON.stringify(networkEntries, null, 2);
    const outputFileName = `${artifactPrefix}__network-log.json`;
    const outputPath = testInfo.outputPath(outputFileName);
    await fs.promises.writeFile(outputPath, networkLog, 'utf-8');

    await testInfo.attach(`${artifactPrefix}__network-log.json`, {
      body: Buffer.from(networkLog, 'utf-8'),
      contentType: 'application/json'
    });

    console.log(`[FIXTURE] Captured ${networkEntries.length} retained network calls. Artifact: ${outputPath}`);
  }, { auto: true }],

  _observability: [async ({ page }, use, testInfo) => {
    const artifactPrefix = buildArtifactPrefix(testInfo);
    const startedAt = new Date().toISOString();
    const consoleEvents: string[] = [];
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];

    const onConsole = (message: ConsoleMessage) => {
      const text = String(message?.text?.() ?? '').trim();
      if (!text) {
        return;
      }
      consoleEvents.push(`[${message.type()}] ${sanitizeSensitiveText(text)}`);
    };

    const onPageError = (error: Error) => {
      const rawError = error?.stack || error?.message || String(error);
      pageErrors.push(sanitizeSensitiveText(rawError));
    };

    const onRequestFailed = (request: Request) => {
      const failureText = request.failure()?.errorText || 'unknown_error';
      requestFailures.push(`${request.method()} ${redactApiText(request.url())} :: ${failureText}`);
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('requestfailed', onRequestFailed);

    await use();

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);

    const finishedAt = new Date().toISOString();
    const executionDetails = buildExecutionDetails(testInfo, startedAt, finishedAt);

    const shouldPersist = shouldPersistObservabilityArtifact(testInfo);
    if (!shouldPersist) {
      console.log(
        `[FIXTURE] Skipped observability artifact persistence ` +
        `(PW_OBSERVABILITY_MODE=${getObservabilityArtifactMode()}). ` +
        `console=${consoleEvents.length} pageErrors=${pageErrors.length} requestFailures=${requestFailures.length}`
      );
      return;
    }

    await testInfo.attach(`${artifactPrefix}__execution.json`, {
      body: Buffer.from(JSON.stringify(executionDetails, null, 2), 'utf-8'),
      contentType: 'application/json'
    });

    if (consoleEvents.length > 0) {
      await testInfo.attach(`${artifactPrefix}__console.log`, {
        body: Buffer.from(consoleEvents.join('\n'), 'utf-8'),
        contentType: 'text/plain'
      });
    }

    if (pageErrors.length > 0) {
      await testInfo.attach(`${artifactPrefix}__page-errors.log`, {
        body: Buffer.from(pageErrors.join('\n\n'), 'utf-8'),
        contentType: 'text/plain'
      });
    }

    if (requestFailures.length > 0) {
      await testInfo.attach(`${artifactPrefix}__request-failures.log`, {
        body: Buffer.from(requestFailures.join('\n'), 'utf-8'),
        contentType: 'text/plain'
      });
    }
  }, { auto: true }],

  // On failure, capture a cleaned DOM + ARIA snapshot and a context packet so
  // the playwright-healer agent can diagnose selector drift against real
  // evidence. Best-effort and non-fatal (see configs/failure-hook.ts).
  //
  // Skipped in visual runs (VISUAL_VALIDATION=true) so the Allure report
  // surfaces the visual expected/actual/diff snapshots instead of generic
  // functional failure evidence (DOM/ARIA/context).
  _failureCapture: [async ({ page }, use, testInfo) => {
    await use();

    if ((process.env.VISUAL_VALIDATION || '').trim().toLowerCase() === 'true') {
      return;
    }

    if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
      await captureFailureState(page, testInfo);
    }
  }, { auto: true }],

  // Gated visual check: on VISUAL_VALIDATION=true, compare each spec's end-state to its baseline.
  // No-op for functional runs, so existing automation, reports, and commands are unaffected.
  _visualValidation: [async ({ page }, use, testInfo) => {
    await use();

    if ((process.env.VISUAL_VALIDATION || '').trim().toLowerCase() !== 'true') {
      return;
    }

    // Skip when the body already failed/timed out or the page is gone — a broken state only misleads.
    if (
      testInfo.errors.length > 0
      || testInfo.status === 'failed'
      || testInfo.status === 'timedOut'
      || page.isClosed()
    ) {
      return;
    }

    // Defer to the spec when it performed its own explicit visual assertion(s)
    // via the `visual` fixture — the generic full-page baseline would otherwise
    // duplicate (and, on data-driven pages, contradict) the precise check.
    if (testInfo.annotations.some(annotation => annotation.type === VISUAL_EXPLICIT_ANNOTATION)) {
      return;
    }

    await validatePageSnapshot(page, testInfo);
  }, { auto: true }],

  // The last auto fixture, so it tears down first: the evidence fixtures above must see a test this fails as failed.
  _checkLedger: [checkLedgerFixture, { auto: true }],

  // On-demand visual validation surface for specs. Unlike the auto full-page
  // check above, this lets a spec explicitly (a) baseline the fully-loaded page
  // at a chosen point, or (b) baseline just one region via a locator. Both calls
  // no-op unless VISUAL_VALIDATION=true, so they are safe in functional specs.
  visual: async ({ page }, use, testInfo) => {
    const enabled = (process.env.VISUAL_VALIDATION || '').trim().toLowerCase() === 'true';

    const validator: VisualValidator = {
      validatePage: async (name?: string, options?: PageLoadOptions) => {
        if (!enabled || page.isClosed()) {
          return;
        }
        // Mark the test as self-validating so the auto full-page fixture stands down.
        testInfo.annotations.push({ type: VISUAL_EXPLICIT_ANNOTATION, description: name ?? 'page' });
        await validatePageSnapshot(page, testInfo, name, options);
      },
      validateArea: async (area: Locator, name: string, options?: AreaSnapshotOptions) => {
        if (!enabled || page.isClosed()) {
          return;
        }
        // Mark the test as self-validating so the auto full-page fixture stands down.
        testInfo.annotations.push({ type: VISUAL_EXPLICIT_ANNOTATION, description: name });
        await validateAreaSnapshot(area, name, testInfo, options);
      }
    };

    await use(validator);
  },

  // Override page fixture to use worker-scoped caching
  //
  // ISOLATION TRADE-OFF: By default this fixture reuses a single page/context
  // across all tests in a worker (or per-file, depending on PW_PAGE_CACHE_SCOPE)
  // for speed. This intentionally breaks Playwright's default per-test isolation,
  // so state (storage, cookies, in-page navigation) can leak between serial tests.
  // Recorded videos are also context-scoped, i.e. they span the whole file.
  // Set PW_DISABLE_PAGE_CACHE=true to opt into strict per-test isolation with a
  // fresh context/page per test and per-test-scoped videos (accurate
  // retain-on-failure pruning).
  // Depends on _realmKeyOverride so the auth state is resolved for the spec's effective REALM_KEY.
  page: async ({ browser, contextOptions, _realmKeyOverride }, use, testInfo) => {
    const workerIndex = testInfo.workerIndex;

    // Opt-out path: strict per-test isolation, fresh context/page per test.
    if (isPageCacheDisabled()) {
      const { context, page } = await createContextAndPage(browser, contextOptions, testInfo, true);
      console.log(`[FIXTURE] Page cache disabled; created isolated page for worker ${workerIndex}`);
      try {
        await use(page);
      } finally {
        await context.close();
      }
      return;
    }

    const pageKey = buildPageCacheKey(workerIndex, testInfo.file);
    const contextKey = buildContextCacheKey(pageKey);
    const pageCache = getWorkerPageCache();
    const cacheScope = getPageCacheScope();

    // In file-worker scope: when the file changes for this worker, close the previous file's page
    if (cacheScope === 'file-worker') {
      const previousFile = getActiveFileForWorker(pageCache, workerIndex);
      if (previousFile && previousFile !== testInfo.file) {
        const oldPageKey = buildPageCacheKey(workerIndex, previousFile);
        const oldContextKey = buildContextCacheKey(oldPageKey);
        await closeCachedArtifacts(pageCache, oldPageKey, oldContextKey, workerIndex);
      }
      setActiveFileForWorker(pageCache, workerIndex, testInfo.file);
    }

    // If cached page exists but is closed/crashed, discard it
    await ensureFreshCachedPage(pageCache, pageKey, contextKey);

    const cachedPage = getCachedPage(pageCache, pageKey)
      || await createCachedPage(browser, contextOptions, testInfo, pageCache, pageKey, contextKey);
    
    await use(cachedPage);
    
    // Don't close the page - keep it for all remaining tests in this worker/file
  },

  actionItemsPage: async ({ page }, use) => {
    await use(new ActionItemsPage(page));
  },

  planningPage: async ({ page }, use) => {
    await use(new PlanningPage(page));
  },

  drillThroughPage: async ({ page }, use) => {
    await use(new DrillThroughPage(page));
  },

  portalPage: async ({ page }, use) => {
    await use(new PortalPage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  planningListingPage: async ({ page }, use) => {
    await use(new PlanningListingPage(page));
  },

  scopePage: async ({ page }, use) => {
    await use(new ScopePage(page));
  },

  processPage: async ({ page }, use) => {
    await use(new ProcessPage(page));
  },

  powerBarPage: async ({ page }, use) => {
    await use(new PowerBarPage(page));
  },

  odmPage: async ({ page }, use) => {
    await use(new OdmPage(page));
  },

  scenarioPage: async ({ page }, use) => {
    await use(new ScenarioPage(page));
  },

  cardsPage: async ({ page }, use) => {
    await use(new CardsPage(page));
  },

  scaPage: async ({ page }, use) => {
    await use(new SCAPage(page));
  },

  globalSettingsPage: async ({ page }, use) => {
    await use(new GlobalSettingsPage(page));
  },

  commonFunctions: async ({}, use) => {
    await use(new CommonFunctions());
  },
  basePage: async ({ page }, use) => {
    await use(new BasePage(page));
  },

  assumptionPage: async ({ page }, use) => {
    await use(new AssumptionPage(page));
  },

  processSettingsPage: async ({ page }, use) => {
    await use(new ProcessSettingsPage(page));
  },

  testUtil: async ({ page }, use) => {
    await use(new TestUtil(page));
  },

  // Auto test fixtures are not set up for beforeAll/afterAll, so depending on _realmKeyOverride makes a hook that
  // reads testData (e.g. API cleanup) run against the spec's pinned Gravitee tenant too.
  testData: async ({ _realmKeyOverride }, use, testInfo) => {
    const psEnv = getEnvironment();
    const testDataPath = resolveTestDataPath(testInfo.file, psEnv);
    const testData = applyGatewayOverrides(await loadTestDataCached(testDataPath), testDataPath);
    await use(testData);
  },
});

export { expect };
