import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_018_ViewGroupExpand.json");

describe('verify aria-expanded attribute for all tree items', () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

      it('Test Case 1: should check if all aria-expanded attributes are true on first render', async () => {
             await CommonFunctions.logMessage('INFO', 'Starting Test Case 1: Should check all view group initially expaneded');
            //  await PlanningSpace.expandPlanningSpaceLeftSection();
            await PlanningSpace.clickViewsDropDown();
            let allViewExpand= await PlanningSpace.CheckAllViewGroupExpaneded()
            expect(allViewExpand).toBe(true);
        });
          
        it('Test Case 2: should check if all aria-expanded attributes are false after minimizing', async () => {
            await CommonFunctions.logMessage('INFO', 'Starting Test Case 2: minimize All view Group and check if all minimized');
            // Verify aria-expanded is false for all items
            await PlanningSpace.MinimizeAllViewGroup()
            const allViewMinimized = await PlanningSpace.CheckAllViewGroupMinimized();
            const bvalidation: boolean = await CommonFunctions.compareTwoValues(allViewMinimized, true, 'All view group should be minimized');
            expect(bvalidation).toBeTruthy();
        });

        it('Test Case 3: should check if all aria-expanded attributes are true after expanding', async () => {
            await CommonFunctions.logMessage('INFO', 'Starting Test Case 3: Expand All view Group and check if all minimized');
            await PlanningSpace.ExpandAllViewGroup()
            // Verify aria-expanded is true for all items
            let allViewExpanded=await PlanningSpace.CheckAllViewGroupExpaneded()
            expect(allViewExpanded).toBe(true);
        });
      
       
})