import type { Page, Request } from '@playwright/test';
import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { launchEntityContext, PlanningEntity } from '../../../../util/planning-entity.util';
import { CommonFunctions } from '../../../../util/common.util';
import { finishApiHar, trackApiHarResult, useApiHar, ApiHarHandle } from '../../../../util/har.util';
import { ScenarioPage } from '../../../../pageobjects/scenario.page';
import { VisibilityFilter } from '../../../../pageobjects/scenario/manage-scenarios.component';

/**
 * Mocked UI contract for ScenarioBatch Test_003 (plan T9.1): the scenario list comes from a HAR recorded on INTEROP,
 * so the filter permutations don't depend on creating scenarios on shared data. The real Test_003 keeps creating them.
 * Record: npm run har:record:interop -- tests/PlanningSpace/Mocked/ScenarioBatch (after the real Test_003 has run).
 * The HAR holds INTEROP Azure gateway URLs, so the spec has no GRAVITEE block or QA/PSR data and skips outside INTEROP Azure.
 */
const SCENARIO_SEARCH = '**/simulations/search**';
/** Any other call on the simulations resource is blocked in replay, so a renamed search endpoint can't reach live data. */
const SIMULATIONS_GUARD = '**/simulations/**';

const entities: { name: string; entity: PlanningEntity; privateScenarioName: string; publicScenarioName: string }[] = [
  { name: 'Process', entity: 'Process', privateScenarioName: 'test_private_scenario_do_not_delete', publicScenarioName: 'test_scenario_do_not_delete' },
  { name: 'Subprocess', entity: 'Subprocess', privateScenarioName: 'test_private_scenario_do_not_delete', publicScenarioName: 'test_scenario_do_not_delete' },
];

/** The `visibility` key of a Manage Scenarios search (`filter=visibility="<key>";sourceType=...`), or undefined when not filtered. */
const sentVisibility = (request: Request): string | undefined =>
  (new URL(request.url()).searchParams.get('filter') || '').match(/visibility="?([^";]+)"?/i)?.[1];

const hasVisibilityFilter = (request: Request): boolean => /visibility/i.test(new URL(request.url()).searchParams.get('filter') || '');

const isScenarioSearch = (request: Request): boolean => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/simulations/search');

/**
 * Applies the Visibility filter and checks both sides of the contract: the MFE sends the matching `visibility` key
 * ("All" sends none, since every value is selected) and the table shows only rows of that visibility.
 */
const applyVisibilityFilter = async (page: Page, scenarioPage: ScenarioPage, commonFunctions: CommonFunctions, filterToApply: VisibilityFilter): Promise<boolean> => {
  const expectedKey = filterToApply === 'All' ? undefined : filterToApply.toLowerCase();
  const search = page.waitForRequest((request) => isScenarioSearch(request)
    && (expectedKey ? sentVisibility(request)?.toLowerCase() === expectedKey : !hasVisibilityFilter(request)), { timeout: getTimeout('LONG') });
  await scenarioPage.selectFilter(filterToApply);
  await scenarioPage.clickApplyFilters();
  const isSent = await search.then(() => true, () => false);
  const isRendered = await expect.poll(
    async () => scenarioPage.verifyFilterApplied(filterToApply, await scenarioPage.getScenariosTableDataByColumnName('Visibility')),
    { timeout: getTimeout('LONG') },
  ).toBe(true).then(() => true, () => false);
  const sentCheck = await commonFunctions.compareTwoValues(isSent, true, `${filterToApply} filter sent as visibility=${expectedKey ?? '(none)'}`);
  const renderedCheck = await commonFunctions.compareTwoValues(isRendered, true, `${filterToApply} filter validation`);
  return sentCheck && renderedCheck;
};

test.describe.serial('Scenario Visibility Filter, mocked scenario search (Process and Subprocess)', () => {
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

  entities.forEach(({ name, entity, privateScenarioName, publicScenarioName }) => {
    test(`${name} - Test Case 1: Recorded private and public scenarios are listed`, async ({ testUtil, planningListingPage, planningPage, scenarioPage, commonFunctions, testData }) => {
      await testUtil.navigateToPlanningListingPage();
      await launchEntityContext(planningListingPage, entity, testData);
      await planningPage.goToManageScenarios();
      await scenarioPage.clickResetButton();
      const privateListed = await commonFunctions.compareTwoValues(await scenarioPage.isScenarioVisible(privateScenarioName, getTimeout('LONG')), true, `Private scenario - ${privateScenarioName} listed`);
      const publicListed = await commonFunctions.compareTwoValues(await scenarioPage.isScenarioVisible(publicScenarioName, getTimeout('LONG')), true, `Public scenario - ${publicScenarioName} listed`);
      expect(privateListed && publicListed).toBe(true);
    });

    test(`${name} - Test Case 2: Filter With Private Visibility`, async ({ page, scenarioPage, commonFunctions }) => {
      expect(await applyVisibilityFilter(page, scenarioPage, commonFunctions, 'Private')).toBe(true);
    });

    test(`${name} - Test Case 3: Filter With Public Visibility`, async ({ page, scenarioPage, commonFunctions }) => {
      expect(await applyVisibilityFilter(page, scenarioPage, commonFunctions, 'Public')).toBe(true);
    });

    test(`${name} - Test Case 4: Filter With All Visibility`, async ({ page, scenarioPage, commonFunctions }) => {
      expect(await applyVisibilityFilter(page, scenarioPage, commonFunctions, 'All')).toBe(true);
    });
  });
});
