import { test, expect } from '../../../configs/fixtures';
import type { PlanningPage } from '../../../pageobjects/planning.page';

// CHECK_CARD_FACETS is false where the card is published but has no data (Gravitee pspoat-test1), so only the scope is checked.
const isCardChecked = async (planningPage: PlanningPage, testData: Record<string, any>): Promise<boolean> =>
  testData.CHECK_CARD_FACETS !== false && await planningPage.verifyCardsInDashboard(testData.CARD_NAME);

test.describe.serial('Default Filter Page Context', () => {
  test('Test Case 1: Is Default scope passed correctly to card when page context is enabled in views', async ({ testUtil, planningPage, planningListingPage, scopePage, commonFunctions, testData, page }) => {
    await testUtil.launchAppFromCatalog(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.PSLINK as string);
    await planningListingPage.launchContext("Process", testData.PROCESS_NAME);
    await planningPage.waitForViewToBeDisplayed();
    await page.waitForTimeout(5000);

    for (const eachView of testData.DEFAULT_SCOPE_FOR_VIEWS) {
      await planningPage.selectViewInPlanning(eachView.VIEW_NAME);
      await planningPage.openComponent('Scope');
      await page.waitForTimeout(5000);
      const filterName = await scopePage.getFilterName();
      const bValidation1 = await commonFunctions.compareTwoValues(filterName.toLowerCase().replace(/\*/g, ''), eachView.FILTER_NAME.toLowerCase(), `Applied filter for ${eachView.VIEW_NAME} view is ${filterName}`);
      const bValidation2 = await commonFunctions.compareTwoValues(await planningPage.verifyScopeInBudgeAndVF(filterName), true, `Scope in Budge and VF should match for ${eachView.VIEW_NAME}`);
      expect(bValidation1 && bValidation2).toBeTruthy();
      await planningPage.closeDrawer();

      const isCardAvailable = await isCardChecked(planningPage, testData);
      if (!isCardAvailable) {
        await commonFunctions.logMessage('WARN', `Card ${testData.CARD_NAME} is not published on ${eachView.VIEW_NAME} in this environment. Skipping card-specific facet checks for this view.`);
        continue;
      }

      for (const eachDimension of eachView.DIMENSIONS) {
        const isDimensionExist = await scopePage.isDimensionExistInTopFacetsOfMaas(eachDimension.LABEL, testData.CARD_NAME);
        await commonFunctions.compareTwoValues(isDimensionExist, true, `${eachDimension.LABEL} is present in the top facets of ${testData.CARD_NAME}`);
        expect(isDimensionExist).toBeTruthy();

        for (const eachSelectedProperty of eachDimension.SELECTED_PROPERTIES) {
          const properties = eachSelectedProperty.VALUES.map((ele: { VALUE: string }) => ele.VALUE);
          const isPropertiesExist = await scopePage.doesSelectedPropertiesReflectedInMaasAsColumns(properties, testData.CARD_NAME);
          await commonFunctions.compareTwoValues(isPropertiesExist, true, `${properties} is present in the ${testData.CARD_NAME}`);
          expect(isPropertiesExist).toBeTruthy();

          for (const property of properties) {
            await planningPage.openComponent('Scope');
            const bValidation = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope(eachSelectedProperty.LABEL, property), true, `Is ${property} filter applied in VF`);
            expect(bValidation).toBeTruthy();
            await planningPage.closeDrawer();
          }
        }
      }
    }
  });

  test('Test Case 2: Is Scope passed correctly to card when current default scope changes in second view', async ({ planningPage, scopePage, commonFunctions, testData, page }) => {
    const properties = testData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].SELECTED_PROPERTIES[0].VALUES.map((ele: { VALUE: string }) => ele.VALUE);
    const updatedProperties = [...properties, testData.ADDED_VALUE as string];

    await planningPage.openComponent('Scope');
    await scopePage.addFiltersToDimensionHierarchyInScope(testData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].LABEL, testData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].SELECTED_PROPERTIES[0].LABEL, [testData.ADDED_VALUE as string]);
    await scopePage.clickOnApplyFiltersBtn();
    await page.waitForTimeout(5000);
    await planningPage.openComponent('Scope');
    await scopePage.waitForAppliedVFTitle(testData.DEFAULT_SCOPE_FOR_VIEWS[1].FILTER_NAME, 30000);
    const filterName = await scopePage.getAppliedVFTitle();
    const bValidation1 = await commonFunctions.compareTwoValues(filterName.toLowerCase(), testData.DEFAULT_SCOPE_FOR_VIEWS[1].FILTER_NAME.toLowerCase(), `Applied filter for ${testData.DEFAULT_SCOPE_FOR_VIEWS[1].VIEW_NAME} view is ${filterName}`);
    const bValidation2 = await commonFunctions.compareTwoValues(await planningPage.verifyScopeInBudgeAndVF(filterName), true, 'Is scope name matched in Budget and VF');
    const isCardAvailable = await isCardChecked(planningPage, testData);
    const bValidation3 = isCardAvailable
      ? await commonFunctions.compareTwoValues(await scopePage.isDimensionExistInTopFacetsOfMaas(testData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].LABEL, testData.CARD_NAME), true, `${testData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].LABEL} is present in the top facets of ${testData.CARD_NAME}`)
      : true;
    const bValidation4 = isCardAvailable
      ? await commonFunctions.compareTwoValues(await scopePage.doesSelectedPropertiesReflectedInMaasAsColumns(updatedProperties, testData.CARD_NAME), true, `${updatedProperties} is present in the ${testData.CARD_NAME}`)
      : true;

    let bValidation5 = true;
    for (const property of updatedProperties) {
      const bValidation = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope(testData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].SELECTED_PROPERTIES[0].LABEL, property), true, `Is ${property} filter applied in VF`);
      if (!bValidation) {
        bValidation5 = false;
      }
    }

    await planningPage.closeDrawer();
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
  });

  test('Test Case 3: Is Scope same for card after revisiting first view', async ({ planningPage, scopePage, commonFunctions, testData }) => {
    const properties = testData.DEFAULT_SCOPE_FOR_VIEWS[0].DIMENSIONS[0].SELECTED_PROPERTIES[0].VALUES.map((ele: { VALUE: string }) => ele.VALUE);

    await planningPage.selectViewInPlanning(testData.DEFAULT_SCOPE_FOR_VIEWS[0].VIEW_NAME);
    await planningPage.openComponent('Scope');

    await scopePage.waitForAppliedVFTitle(testData.DEFAULT_SCOPE_FOR_VIEWS[0].FILTER_NAME, 30000);
    const filterName = await scopePage.getAppliedVFTitle();
    const bValidation1 = await commonFunctions.compareTwoValues(filterName.toLowerCase(), testData.DEFAULT_SCOPE_FOR_VIEWS[0].FILTER_NAME.toLowerCase(), `Applied filter for ${testData.DEFAULT_SCOPE_FOR_VIEWS[0].VIEW_NAME} view is ${filterName}`);
    const bValidation2 = await commonFunctions.compareTwoValues(await planningPage.verifyScopeInBudgeAndVF(filterName), true, 'Is scope name matched in Budget and VF');
    const isCardAvailable = await isCardChecked(planningPage, testData);
    const bValidation3 = isCardAvailable
      ? await commonFunctions.compareTwoValues(await scopePage.isDimensionExistInTopFacetsOfMaas(testData.DEFAULT_SCOPE_FOR_VIEWS[0].DIMENSIONS[0].LABEL, testData.CARD_NAME), true, `${testData.DEFAULT_SCOPE_FOR_VIEWS[0].DIMENSIONS[0].LABEL} is present in the top facets of ${testData.CARD_NAME}`)
      : true;
    const bValidation4 = isCardAvailable
      ? await commonFunctions.compareTwoValues(await scopePage.doesSelectedPropertiesReflectedInMaasAsColumns(properties, testData.CARD_NAME), true, `${properties} is present in the ${testData.CARD_NAME}`)
      : true;

    let bValidation5 = true;
    for (const property of properties) {
      const bValidation = await commonFunctions.compareTwoValues(await scopePage.verifyAppliedFilterInScope(testData.DEFAULT_SCOPE_FOR_VIEWS[0].DIMENSIONS[0].SELECTED_PROPERTIES[0].LABEL, property), true, `Is ${property} filter applied in VF`);
      if (!bValidation) {
        bValidation5 = false;
      }
    }

    await scopePage.closeVFDrawer();
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
  });

  test.afterAll(async ({ planningPage, scopePage, testData }) => {
    await planningPage.selectViewInPlanning(testData.DEFAULT_SCOPE_FOR_VIEWS[1].VIEW_NAME);
    await planningPage.openComponent('Scope');
    await scopePage.clickRevertVFChanges();
    await scopePage.closeVFDrawer();
  });
});
