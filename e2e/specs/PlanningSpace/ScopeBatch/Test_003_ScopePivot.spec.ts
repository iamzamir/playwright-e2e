import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_003_ScopePivot.json");
// import TestData from "../../../Testdata/PlanningSpace/ScopeBatch/Test_003_ScopePivot.json";
import scope from "../../../pageobjects/scope.page";

describe("Pivot reflects correct scope", () => {

  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it(`Test Case 1: Click on ${TestData.VIEW_NAME} view in planning space`, async () => {
    await PlanningSpace.clickViewsDropDown();
    const bValidation: boolean = await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    await CommonFunctions.compareTwoValues(bValidation, true, `${TestData.VIEW_NAME} is exist under views tab in planning space`);
    expect(bValidation).toBeTruthy();
  })

  it('Test Case 2: Verify Scope tab in planning space', async () => {
    await scope.clickOnTab("Scope");
    const eleExist: boolean = await scope.doesDrawerOpened('Scope');
    let bValidation: boolean = await CommonFunctions.compareTwoValues(eleExist, true, "Scope Tab is enabled Assertion");
    expect(bValidation).toEqual(true);
  });

  it('Test Case 3: Configure filter in scope', async () => {
    await CommonFunctions.logMessage("INFO", "Looking for three dots under scope tab");
    await scope.click3Dot();
    await browser.pause(1000)
    await scope.select3DotOption('Edit Configuration');
    await browser.pause(1000);
    await scope.selectFilterEntryFromDialogConfig('Select', 'ITEM');
    await scope.selectFilterEntryFromDialogConfig('Select', 'LOCATION');
    await scope.selectFilterEntryFromDialogConfig('Select', 'CUSTOMER');
    await browser.pause(1000);
    await scope.filterDialogSaveCancel('Next');
    await scope.selectDimensionHierarchyLevel('ITEM', ['AllProducts'], 'check');
    await scope.selectDimensionHierarchyLevel('LOCATION', ['AllLocations'], 'check');
    await scope.selectDimensionHierarchyLevel('CUSTOMER', ['AllChannels'], 'check');
    const bValidation1: boolean = await scope.filterDialogSaveCancel('Save');
    expect(bValidation1).toBeTruthy();
  });

  it('Test Case 4: Verify pivot relects correct scope', async () => {
    const locationWithData: string = 'REGION-00';
    const locationWithNoData: string = 'CNTRY-16';
    await scope.clickOnApplyFiltersBtn();
    const bValidation1: boolean = await scope.verifyExistingLocationCellInTable(locationWithData);
    await CommonFunctions.compareTwoValues(bValidation1,true,`Provided ${locationWithData} location exist in table`);
    const bValidation2: boolean = await scope.isEmptyStateExistInScope();
    await CommonFunctions.compareTwoValues(bValidation2,false,`Data exist for selected filter`);
    await scope.clickOnTab("Scope");
    await scope.clickRevertVFChanges();
    await scope.clickOnTab("Scope");
    await scope.clickOnApplyFiltersBtn();
    const bValidation5: boolean = await scope.isEmptyStateExistInScope();
    await CommonFunctions.compareTwoValues(bValidation5,false,`Is card empty`);
    expect(bValidation1 && !bValidation2 && !bValidation5).toBeTruthy();
  })
})