import PlanningSpace from '../../../pageobjects/planning.page';
import processPage from '../../../pageobjects/process.page';
import scope from '../../../pageobjects/scope.page';
import CommonFunctions from '../../../util/common.util';
import TestUtil from '../../../util/test.util';

const TestData = require('../../../Testdata/' + process.env.PSENV + '/ProcessOrchestration/ScopeBatch/Test_006_VFScopeDimensiondata.spec.json');

describe('PO - Dimension Filter From Process scope', () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    await browser.pause(5000);
    await TestUtil.clickPowerBarLink('Process Settings');
    await CommonFunctions.switchToSpecificWindow(1);
    await browser.pause(5000);
    await PlanningSpace.switchToMFEFrame();
  });

  it('Test Case 1: Select the scope filter from process settings', async () => {
    await processPage.clickLeftpaneLinks('Scope');
    await scope.clickOnEditDimensions();
    await scope.click3Dot();
    await scope.select3DotOption('Edit Configuration');
    await scope.selectFilterEntryFromDialogConfig('Select', 'LOCATION');
    await scope.filterDialogSaveCancel('Next');
    await scope.selectDimensionHierarchyLevel('LOCATION', ['AllLocations'], 'check');
    await scope.filterDialogSaveCancel('Save');
    await scope.addFiltersToDimensionHierarchyInScope("LOCATION", "AllLocations", ['ALL']);
    const bValidation: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope('AllLocations', 'ALL'), true, `Is Location filter applied`);
    expect(bValidation).toBeTruthy();
  })

 it('Test Case 2: Reset the Created Filter', async () => {
    await scope.clickOnApplyFiltersBtnInManageScope();    
    await scope.clickOnResetDimensions();
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(await scope.getNoScopeText(), 'This process has no specific scope set', "Is 'no specific scope' text displayed");
    expect(bValidation1).toBeTruthy();         
     });

});
