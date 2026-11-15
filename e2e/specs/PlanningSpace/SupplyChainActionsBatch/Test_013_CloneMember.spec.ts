import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from "../../../util/common.util";
import ProcessPage from '../../../pageobjects/process.page';
const TestData = require('../../../Testdata/' + process.env.PSENV + '/PlanningSpace/SupplyChainActionsBatch/Test_013_CloneMember.json');

describe('Test suite for Clone Member testing', () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    await browser.pause(5000);
  });

  it("Test case 01: Test create clone member UI from supply chain actions - New member", async () => {
    await CommonFunctions.logMessage("INFO", "Starting Test case 01: Create a clone member from supply chain actions - New member");
    await PlanningSpace.clickViewsDropDown();
    await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    await PlanningSpace.selectSupplyChainProceduresAction("Clone Member");
    await PlanningSpace.selectCloneMemberType(TestData.CLONE_MEMBER_TYPE.NEW_MEMBER);
    const isCloneMemberEnabledInitial = await PlanningSpace.isCreateCloneMemberEnabled();
    const bValidation1 = await CommonFunctions.compareTwoValues(isCloneMemberEnabledInitial, false, `Verify clone member is enabled`)
    await PlanningSpace.toggleDimension(TestData.DIMENSION_ITEM, true);
    await PlanningSpace.toggleDimension(TestData.DIMENSION_DEMANDITEM, true);
    await PlanningSpace.toggleDimension(TestData.DIMENSION_DEMANDITEM, false);
    await PlanningSpace.toggleDimension(TestData.DIMENSION_DEMANDITEM, true);
    await PlanningSpace.deleteDimension(TestData.DIMENSION_DEMANDITEM);
    await PlanningSpace.selectDimensionValue(TestData.CLONE_MEMBER_TYPE.NEW_MEMBER, TestData.DIMENSION_ITEM, TestData.REF_LEVEL_ATTRIBUTE, TestData.REF_LEVEL_VALUE);
    await browser.pause(2000);
    await PlanningSpace.selectDimensionValue(TestData.CLONE_MEMBER_TYPE.NEW_MEMBER, TestData.DIMENSION_ITEM, TestData.REF_MEMBER_ATTRIBUTE, TestData.REF_MEMBER_VALUE);
    await PlanningSpace.selectDimensionValue(TestData.CLONE_MEMBER_TYPE.NEW_MEMBER, TestData.DIMENSION_ITEM, TestData.TARGET_LEVEL_ATTRIBUTE, TestData.TARGET_LEVEL_VALUE);
    await browser.pause(2000);
    await PlanningSpace.selectTargetDimensionValue(TestData.DIMENSION_ITEM, TestData.TARGET_MEMBER_VALUE);
    await PlanningSpace.selectLaunchDate();
    await PlanningSpace.setNoOfCopies(TestData.COPIES);
    const isCloneMemberEnabledFinal = await PlanningSpace.isCreateCloneMemberEnabled();
    const bValidation2 = await CommonFunctions.compareTwoValues(isCloneMemberEnabledFinal, true, `Verify clone member is enabled`);
    await PlanningSpace.cancelCloneMemberFromModal();
    expect(bValidation1 && bValidation2).toBeTruthy();
    await CommonFunctions.logMessage("PASS", "Completed Test case 01: Test create clone member UI from supply chain actions - New member");
  });

  it("Test case 02: Test create clone member UI from supply chain actions - New intersection", async () => {
    await CommonFunctions.logMessage("INFO", "Starting Test case 02: Create a clone member from supply chain actions - New intersection");
    await PlanningSpace.selectSupplyChainProceduresAction("Clone Member");
    await PlanningSpace.selectCloneMemberType(TestData.CLONE_MEMBER_TYPE.NEW_INTERSECTION);
    const isCloneMemberEnabledInitial = await PlanningSpace.isCreateCloneMemberEnabled();
    const bValidation1 = await CommonFunctions.compareTwoValues(isCloneMemberEnabledInitial, false, `Verify clone member is enabled`);
    await PlanningSpace.toggleDimension(TestData.DIMENSION_ITEM, true);
    await PlanningSpace.selectDimensionValue(TestData.CLONE_MEMBER_TYPE.NEW_INTERSECTION, TestData.DIMENSION_ITEM, 'Target Level', TestData.TARGET_LEVEL_VALUE);
    await browser.pause(2000);
    await PlanningSpace.selectTargetDimensionValue(TestData.DIMENSION_ITEM, TestData.TARGET_MEMBER_VALUE);
    const isCloneMemberEnabledFinal = await PlanningSpace.isCreateCloneMemberEnabled();
    const bValidation2 = await CommonFunctions.compareTwoValues(isCloneMemberEnabledFinal, true, `Verify clone member is enabled`);
    await PlanningSpace.cancelCloneMemberFromModal();
    expect(bValidation1 && bValidation2).toBeTruthy();
    await CommonFunctions.logMessage("PASS", "Completed Test case 02: Test create clone member UI from supply chain actions - New intersection");
  });

  it("Test case 03: Clone member should be triggered from pivot card and Ref. data should be prefilled based on context", async () => {
    await CommonFunctions.logMessage("INFO", "Starting Test case 03: Clone member should be triggered from pivot card and Ref. data should be prefilled based on context");
    await PlanningSpace.clickViewsDropDown();
    const result: boolean = await PlanningSpace.clickDashBoard(TestData.DRILL_THROUGH_VIEW_FROM);
    const bValidation1: boolean = await CommonFunctions.compareTwoValues(result, true, 'View ' + TestData.DRILL_THROUGH_VIEW_FROM + ' Found Assertion');
    await browser.pause(5000);
    await PlanningSpace.performCardCellMoreActions('PivotCard', TestData.DRILL_THROUGH_CELL, TestData.ACTION_NAME);
    await browser.pause(3000);
    const cloneMemberTrigger = await PlanningSpace.verifyCloneMemberTriggered();
    const bValidation2: boolean = await CommonFunctions.compareTwoValues(cloneMemberTrigger, true, "Verify if clone member is triggered from Pivot card");
    // Verify data for New Member
    const dimensionsForMember = await PlanningSpace.getDimensionsSelected();
    await CommonFunctions.logMessage("INFO",`Dimensions for New Member:  ${dimensionsForMember}`);
    const bValidation3 = await PlanningSpace.verifyDimensionsPrefilled(TestData.CLONE_MEMBER_TYPE.NEW_MEMBER, dimensionsForMember);
    // Verify data for New Intersection
    await PlanningSpace.selectCloneMemberType(TestData.CLONE_MEMBER_TYPE.NEW_INTERSECTION);
    await browser.pause(2000);
    const dimensionsForIntersection = await PlanningSpace.getDimensionsSelected();
    await CommonFunctions.logMessage("INFO",`Dimensions for New Intersection:  ${dimensionsForIntersection}`);
    const bValidation4 = await PlanningSpace.verifyDimensionsPrefilled(TestData.CLONE_MEMBER_TYPE.NEW_INTERSECTION, dimensionsForIntersection);
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
    await CommonFunctions.logMessage("PASS", "Completed Test case 03: Clone member should be triggered from pivot card and Ref. data should be prefilled based on context")
  });
});