import PlanningSpace from '../../../pageobjects/planning.page';
import TestData from '../../../Testdata/INTEROP/PlanningSpace/SupplyChainActionsBatch/Test_012_ProcessModelProcedures.json';
import CommonFunctions from '../../../util/common.util';

describe('UiConfig precedance from process model than from SCA', () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME_WITH_UI_CONFIG);
  });
 
  it('Test Case 1.1: Process model Ui config is shown in Create scenario popup', async () => {
    await CommonFunctions.logMessage('INFO', 'Navigate to Planning space Access');
    let isDropdownExists = await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
    let validation1: boolean = await CommonFunctions.compareTwoValues(isDropdownExists, true, `SCA procedures dropdown & procedure option should exists Assertion`);
    let procedurePopupExists =  await PlanningSpace.openSCProcedurePopup();
    let validation2: boolean = await CommonFunctions.compareTwoValues(procedurePopupExists, true, `Create Scenario Popup from uiConfig exists Assertion `);
    expect(validation1 && validation2).toEqual(true);
  });
});