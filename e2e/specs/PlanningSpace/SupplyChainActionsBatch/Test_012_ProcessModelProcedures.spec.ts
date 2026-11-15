import PlanningSpace from '../../../pageobjects/planning.page';
import TestData from '../../../Testdata/INTEROP/PlanningSpace/SupplyChainActionsBatch/Test_012_ProcessModelProcedures.json';
import CommonFunctions from '../../../util/common.util';

describe('Show procedures only if present in process model ', () => {
  before(async () => {
    await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
  });

  it('Test Case 1.1: Procedures should not be shown if there is no process model', async () => {
    await CommonFunctions.logMessage('INFO', 'Navigate to Planning space Access');
    let isDropdownExists = await PlanningSpace.searchSCAProceduresDropdown();
    let validation1: boolean = await CommonFunctions.compareTwoValues(isDropdownExists, false, `SCA procedures dropdown should not exists Assertion`);
    expect(validation1).toEqual(true);
  });
});
