import type { Page, Request } from '@playwright/test';
import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { launchEntityContext, PlanningEntity } from '../../../../util/planning-entity.util';
import { finishApiHar, trackApiHarResult, useApiHar, ApiHarHandle } from '../../../../util/har.util';

/**
 * Mocked UI contract for ScenarioBatch Test_006 (plan T9.5): the Created By filter permutations run against a scenario
 * list recorded on INTEROP. The real Test_006 keeps one golden path (create, then filter by the current user).
 * Record: npm run har:record:interop -- tests/PlanningSpace/Mocked/ScenarioBatch/Test_006_ScenarioUsersFilterMocked.spec.ts
 * The HAR holds INTEROP Azure gateway URLs, so the spec has no GRAVITEE block or QA/PSR data and skips outside INTEROP Azure.
 */
const SCENARIO_SEARCH = '**/simulations/search**';
/** Any other call on the simulations resource is blocked in replay, so a renamed search endpoint can't reach live data. */
const SIMULATIONS_GUARD = '**/simulations/**';

const entities: { name: string; entity: PlanningEntity; privateScenarioName: string }[] = [
  { name: 'Process', entity: 'Process', privateScenarioName: 'test_private_scenario_do_not_delete' },
  { name: 'Sub-process', entity: 'Subprocess', privateScenarioName: 'test_private_scenario_do_not_delete' },
];

/** The quoted user ids of a Manage Scenarios search (`filter=userIdCreatedBy="<id>","<id>";sourceType=...`); empty when not filtered. */
const sentCreatedBy = (request: Request): string[] =>
  ((new URL(request.url()).searchParams.get('filter') || '').match(/userIdCreatedBy=([^;]+)/i)?.[1].match(/"[^"]+"/g) || []);

const hasCreatedByKey = (request: Request): boolean => /userIdCreatedBy/i.test(new URL(request.url()).searchParams.get('filter') || '');

const isScenarioSearch = (request: Request): boolean => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/simulations/search');

/** True once a matching search got a successful (recorded) response, so an aborted or failed call can't pass. */
const waitForScenarioSearch = (page: Page, predicate: (request: Request) => boolean): Promise<boolean> =>
  page.waitForResponse((response) => isScenarioSearch(response.request()) && predicate(response.request()), { timeout: getTimeout('LONG') })
    .then((response) => response.ok(), () => false);

test.describe.serial('Scenario Users Filter, mocked scenario search (Process and Sub-process)', () => {
  let har: ApiHarHandle;

  // Test data and the HAR exist only for INTEROP on the Azure gateway; test:qa and test:psr run every spec.
  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'HAR and test data recorded on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'HAR recorded on the Azure gateway');

  test.beforeAll(async ({ page, testUtil, testData }) => {
    // Before the first navigation, so the context launch's scenario searches are served from the HAR as well.
    har = await useApiHar(page.context(), { area: testData.HAR_AREA, name: testData.HAR_NAME, url: SCENARIO_SEARCH, guard: SIMULATIONS_GUARD });
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
  });

  test.afterEach(async ({}, testInfo) => {
    trackApiHarResult(har, testInfo);
  });

  test.afterAll(async ({ page }) => {
    if (har) {
      await finishApiHar(page.context(), har);
    }
  });

  entities.forEach(({ name, entity, privateScenarioName }) => {
    test(`${name} - Test Case 1: Recorded private scenario shows its creator`, async ({ testUtil, planningListingPage, planningPage, scenarioPage, commonFunctions, testData }) => {
      await testUtil.navigateToPlanningListingPage();
      await launchEntityContext(planningListingPage, entity, testData);
      await planningPage.goToManageScenarios();
      await scenarioPage.clickResetButton();
      const isListed = await commonFunctions.compareTwoValues(await scenarioPage.isScenarioVisible(privateScenarioName, getTimeout('LONG')), true, `${privateScenarioName} listed`);
      const isByUser = await commonFunctions.compareTwoValues(await scenarioPage.verifyScenarioCreatedByUser(testData.USER_AVATAR, privateScenarioName, 'Created By'), true, `${privateScenarioName} created by ${testData.USER_AVATAR}`);
      expect(isListed && isByUser).toBe(true);
    });

    test(`${name} - Test Case 2: Filter by the current user`, async ({ page, scenarioPage, commonFunctions, testData }) => {
      const sent = waitForScenarioSearch(page, (request) => sentCreatedBy(request).length === 1);
      await scenarioPage.selectOrUnselectFilter('Created By', testData.LOGGEDIN_USER);
      await scenarioPage.clickApplyFilters();
      const sentCheck = await commonFunctions.compareTwoValues(await sent, true, 'Created By filter sent as one userIdCreatedBy');
      const isRendered = await expect.poll(() => scenarioPage.verifyUserFilterApplied([testData.USER_AVATAR]), { timeout: getTimeout('LONG') })
        .toBe(true).then(() => true, () => false);
      const renderedCheck = await commonFunctions.compareTwoValues(isRendered, true, `Only scenarios by ${testData.USER_AVATAR} listed`);
      // A creator-less Base row alone would pass the column check, so the user's own scenario must still be listed.
      const ownCheck = await commonFunctions.compareTwoValues(await scenarioPage.isScenarioVisible(privateScenarioName, getTimeout('LONG')), true, `${privateScenarioName} still listed after the filter`);
      expect(sentCheck && renderedCheck && ownCheck).toBe(true);
    });

    test(`${name} - Test Case 3: Reset clears the users filter`, async ({ page, scenarioPage, commonFunctions }) => {
      const sent = waitForScenarioSearch(page, (request) => !hasCreatedByKey(request));
      await scenarioPage.clickResetButton();
      await scenarioPage.clickApplyFilters();
      const sentCheck = await commonFunctions.compareTwoValues(await sent, true, 'Search sent without userIdCreatedBy after Reset');
      const isBaseListed = await expect.poll(async () => scenarioPage.getBaseScenario(), { timeout: getTimeout('LONG') }).not.toEqual('').then(() => true, () => false);
      const baseCheck = await commonFunctions.compareTwoValues(isBaseListed, true, 'Base scenario (no creator) listed again');
      expect(sentCheck && baseCheck).toBe(true);
    });
  });
});
