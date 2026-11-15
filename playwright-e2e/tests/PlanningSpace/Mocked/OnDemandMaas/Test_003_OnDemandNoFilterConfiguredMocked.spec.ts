import { test, expect } from '../../../../configs/fixtures';
import { mockEmptyVerticalFilter, UnrouteFn } from '../../../../util/api-mock.util';
import { getTimeout } from '../../../../constants/timeouts';

/**
 * Mocked UI contract for OnDemandMaas Test_003 (plan T9.6):
 * Tests that an interactive view opened with no configured filter displays the
 * Unified Empty State ("Welcome to the <process>." and "Set Filter" action button)
 * and confirms that the Scope drawer reflects an unconfigured filter state.
 *
 * Vertical Filter BFF endpoints are mocked to return empty presets ({ entities: [] }),
 * making the test deterministic and independent of shared INTEROP tenant filter overrides.
 */
test.describe.serial('OnDemandMaas - Filter Not Configured Mocked UI Contract', () => {
  let unrouteMock: UnrouteFn | undefined;

  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.afterEach(async () => {
    if (unrouteMock) {
      try {
        await Promise.race([
          unrouteMock(),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch {
        // Ignore unroute errors
      }
      unrouteMock = undefined;
    }
  });

  test('Test Case 1: Verify Filter Configuration Prompt Displayed When Filter is Not Configured', async ({
    planningPage,
    scopePage,
    odmPage,
    commonFunctions,
    testUtil,
    testData,
    page,
  }) => {
    // Intercept Vertical Filter BFF config & presets on the BrowserContext before navigating
    unrouteMock = await mockEmptyVerticalFilter(page.context());

    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );

    await planningPage.selectViewInPlanning(testData.VIEW_NAME);
    await planningPage.waitForSpecificDashboardToBeDisplayed(testData.VIEW_NAME);

    // Contract assertion: the view title can render before the MFE sends this request, so poll for it.
    const mock = unrouteMock;
    await expect
      .poll(() => mock.calls.some((c) => c.url.includes('search-preset') && c.method === 'POST'), { timeout: getTimeout('XLARGE') })
      .toBe(true);

    // 1. Verify the empty-state title ("Welcome to the <process>.")
    const isSetFiltersDisplayed = await planningPage.verifySetFiltersText(testData.SET_FILTER_TITLE);
    const titleValidation = await commonFunctions.compareTwoValues(
      isSetFiltersDisplayed,
      true,
      `Empty state title containing '${testData.SET_FILTER_TITLE}' should be displayed`
    );

    // 2. Verify "Set Filter" action button is visible on the canvas
    const isSetFilterBtnVisible = await planningPage.verifySetFilterBtn('Set Filter');
    const setFilterBtnValidation = await commonFunctions.compareTwoValues(
      isSetFilterBtnVisible,
      true,
      '"Set Filter" action button should be visible on the empty state screen'
    );

    // 3. Open the Scope drawer and verify no filter is configured
    await planningPage.openComponent('Scope');
    const isFilterConfigured = await scopePage.isFilterConfigured();
    const filterConfiguredValidation = await commonFunctions.compareTwoValues(
      isFilterConfigured,
      false,
      'Scope drawer should confirm no filter is currently configured'
    );
    await planningPage.closeDrawer();

    // 4. Verify the Interactive Data Status Icon exists and is clickable
    const isIconVisible = await odmPage.clickInteractiveDataStatusIcon();
    const iconValidation = await commonFunctions.compareTwoValues(
      isIconVisible,
      true,
      'Interactive Data Status Icon should be visible in the header'
    );

    // 5. Verify Supply Chain Actions dropdown is disabled on the empty state screen
    const isSCADisabled = await planningPage.validateSCADropdownStatus();
    const scaDisabledValidation = await commonFunctions.compareTwoValues(
      isSCADisabled,
      true,
      'Supply Chain Actions dropdown should be disabled on the unconfigured filter screen'
    );

    expect(
      titleValidation &&
      setFilterBtnValidation &&
      filterConfiguredValidation &&
      iconValidation &&
      scaDisabledValidation
    ).toBe(true);
  });
});
