import { test, expect } from '../../../../configs/fixtures';
import { mockEmptyVerticalFilter, UnrouteFn } from '../../../../util/api-mock.util';
import { getTimeout } from '../../../../constants/timeouts';

/**
 * Mocked UI contract for OnDemandMaas Test_008 (Phase 9 - T9.6):
 * Tests the Unified Empty State screen (when Vertical Filter is not configured).
 *
 * This has its own spec so the routes go in before the first navigation of a new browser context. After another test in
 * the same context, the MFE serves search-preset from its IndexedDB cache (`portalCacheWrapper`), so the mock gets no call
 * until later and the real preset can reach the page. `context.route` on a loaded MFE page can also hang.
 */
test.describe('Unified empty state in ODM (Mocked UI Contract)', () => {
  let unrouteMock: UnrouteFn | undefined;

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.afterEach(async () => {
    await unrouteMock?.();
    unrouteMock = undefined;
  });

  test('Test case 2: Verify Unified Empty State Screen when VF is not available', async ({
    planningPage,
    commonFunctions,
    testUtil,
    testData,
    page,
  }) => {
    // Intercept Vertical Filter BFF config & presets to simulate unconfigured filter
    const emptyFilterMock = await mockEmptyVerticalFilter(page.context());
    unrouteMock = emptyFilterMock;

    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );

    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    // Contract assertion: the view title can render before the MFE sends this request, so poll for it.
    await expect
      .poll(() => emptyFilterMock.calls.some((c) => c.url.includes('search-preset') && c.method === 'POST'), { timeout: getTimeout('XLARGE') })
      .toBe(true);

    // 1. Verify "Welcome to the <process>." text on canvas
    const isSetFiltersDisplayed = await planningPage.verifySetFiltersText(testData.SET_FILTER_TITLE);
    const setFiltersValidation = await commonFunctions.compareTwoValues(
      isSetFiltersDisplayed,
      true,
      `"${testData.SET_FILTER_TITLE}" text should be displayed on the empty state screen`
    );

    // 2. Verify "Set Filter" button is displayed
    const configureBtn = await planningPage.verifySetFilterBtn('Set Filter');
    const configureBtnValidation = await commonFunctions.compareTwoValues(
      configureBtn,
      true,
      '"Set Filter" button should be displayed on the empty state screen'
    );

    // 3. Click "Set Filter" -> verify Scope drawer opens -> close drawer
    await planningPage.clickOnSetFilterBtn('Set Filter');
    const isScopeOverlayDisplayed = await planningPage.doesDrawerOpened('Scope');
    const scopeOverlayValidation = await commonFunctions.compareTwoValues(
      isScopeOverlayDisplayed,
      true,
      'Scope overlay with title "Scope" should be displayed after clicking "Set Filter"'
    );
    await planningPage.closeDrawer();

    // 4. Verify Supply Chain Actions is disabled
    const isSCADisabled = await planningPage.validateSCADropdownStatus();
    const scaDisabledValidation = await commonFunctions.compareTwoValues(
      isSCADisabled,
      true,
      'Supply Chain Actions should be disabled on the empty state screen'
    );

    expect(
      setFiltersValidation &&
      configureBtnValidation &&
      scopeOverlayValidation &&
      scaDisabledValidation
    ).toBeTruthy();
  });
});
