import PlanningSpace from '../../../pageobjects/planning.page';
import processPage from '../../../pageobjects/process.page';
import scope from '../../../pageobjects/scope.page';
import CommonFunctions from '../../../util/common.util';
import TestUtil from '../../../util/test.util';

const TestData = require('../../../Testdata/' +
  process.env.PSENV +
  '/ProcessOrchestration/ScopeBatch/Test_005_ScopeRelevantFilterInSettings.json');

describe('PO - Test Relavent Filters functionality in Settings module', () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    await browser.pause(5000);
    await TestUtil.clickPowerBarLink('Process Settings');
    await CommonFunctions.switchToSpecificWindow(1);
    await browser.pause(5000);
    await PlanningSpace.switchToMFEFrame();
  });

  it('Test Case 1: Create Vertical Filter and enable relavent filters option', async () => {
    await processPage.clickLeftpaneLinks('Scope');
    await scope.clickOnEditDimensions();
    await scope.click3Dot();
    await scope.select3DotOption('Edit Configuration');
    await scope.selectFilterEntryFromDialogConfig('Select', 'ITEM');
    await scope.filterDialogSaveCancel('Next');
    await scope.selectDimensionHierarchyLevel('ITEM', ['ProductType', 'Brand'], 'check');
    await scope.filterDialogSaveCancel('Save');
    await scope.addFiltersToDimensionHierarchyInScope('ITEM', 'ProductType', ['PF-00']);
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(
      await scope.verifyAppliedFilterInScope('ITEM', 'PF-00'),
      true,
      `Is Customer filter applied`
    );
    const filterValuesBefore = await scope.getAllSelectedHierarchialValues('ProductType');
    await scope.enableRelaventFilter('ITEM');
    const filterValuesAfter = await scope.getAllSelectedHierarchialValues('ProductType');
    const bValidation2 = await CommonFunctions.compareTwoValues(
      filterValuesBefore.length !== filterValuesAfter.length,
      true,
      'Filters should reset'
    );
    expect(bValidation1 && bValidation2).toEqual(true);
  });

  it('Test Case 2: Test Relavent Filters functionality', async () => {
    // Selected Filter values from "Brand" should disappear when it's related Hierarchies item from "Product" is unselected/removed
    await scope.addFiltersToDimensionHierarchyInScope('ITEM', 'ProductType', ['PF-00', 'PF-10']);
    await scope.addFiltersToDimensionHierarchyInScope('ITEM', 'Brand', ['PL-01', 'PL-11']);
    await scope.checkOrUncheckSelectedHierarchies('ProductType', 'PF-00', 'uncheck');
    let filterValues = await scope.getAllSelectedHierarchialValues('ProductType');
    const bvalidation1 = await CommonFunctions.compareTwoValues(
      filterValues.indexOf('PL-01 | LAGER') === -1,
      true,
      'PL-01 value should be removed from Brand dimension'
    );

    // Should only show the values that are related to the selected "Product" dimension item
    const availableHierarchyItems = await scope.getAvailableHierarchyValuesFromPopup('ITEM', 'Brand');
    const bvalidation2 = await CommonFunctions.compareTwoValues(availableHierarchyItems[0].includes('PF-10'), true, "Check if PF-10 item is present in Brand");
    const bvalidation3 = await CommonFunctions.compareTwoValues(availableHierarchyItems[1].includes('PL-11'), true, "Check if PF-11 item is present in Brand");
    const bvalidation4 = await CommonFunctions.compareTwoValues(availableHierarchyItems[2].includes('PL-12'), true, "Check if PF-12 item is present in Brand");
    expect(bvalidation1 && bvalidation2 && bvalidation3 && bvalidation4).toEqual(true);
  });
});
