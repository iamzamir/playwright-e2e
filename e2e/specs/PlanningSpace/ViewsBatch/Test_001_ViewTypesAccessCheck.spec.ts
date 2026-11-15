import PlanningSpace from "../../../pageobjects/planning.page"
import CommonFunctions from "../../../util/common.util"
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ViewsBatch/Test_001_ViewTypesAccessCheck.json");


describe('View Types Verification for Admin and User Role', async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, false, false);
        await browser.pause(5000);
    })

    it(`Test Case 1: Verify View Types for Process - Admin Role`, async () => {
        await PlanningSpace.clickViewsDropDown();
        let arrViewTypes: string[] = await PlanningSpace.getAllViewTypes();
        let validation: boolean = await CommonFunctions.compareTwoValues(arrViewTypes.toString(), TestData.ADMIN_VIEW_TYPES, 'All 3 view types should be available');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 2: Verify All Views - Admin Role`, async () => {
        await PlanningSpace.selectViewType("All Views");
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        const validation: boolean = await CommonFunctions.compareTwoValues(viewsFromPS.includes(TestData.ALL_VIEWS.split(",")[0]) && viewsFromPS.includes(TestData.ALL_VIEWS.split(",")[1]), true, 'All Views Assertion');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 3: Verify Hidden views - Admin Role`, async () => {
        await PlanningSpace.selectAllViewsOrFavourites("Hidden Views");
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        const validation: boolean = await CommonFunctions.compareTwoValues(viewsFromPS, TestData.HIDDEN_VIEWS, 'Hidden Views Assertion');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 4: Verify Favourites views - Admin Role`, async () => {
        await PlanningSpace.selectAllViewsOrFavourites("Favourites");
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        const validation: boolean = await CommonFunctions.compareTwoValues(viewsFromPS, TestData.FAVOURITES, 'Favourites Views Assertion');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 5: Verify View Types for Sub Process - Admin Role`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_NAME });
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        let arrViewTypes: string[] = await PlanningSpace.getAllViewTypes();
        let validation: boolean = await CommonFunctions.compareTwoValues(arrViewTypes.toString(), TestData.ADMIN_VIEW_TYPES, 'All 3 view types should be available');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 6: Verify View Types for Assumption - Admin Role`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION });
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        let arrViewTypes: string[] = await PlanningSpace.getAllViewTypes();
        let validation: boolean = await CommonFunctions.compareTwoValues(arrViewTypes.toString(), TestData.ADMIN_VIEW_TYPES, 'All 3 view types should be available');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 7: Verify View Types for Process - User Role`, async () => {
        await PlanningSpace.signOut();
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME, true, false);
        await browser.pause(10000);
        await PlanningSpace.clickViewsDropDown();
        let arrViewTypes: string[] = await PlanningSpace.getAllViewTypes();
        let validation: boolean = await CommonFunctions.compareTwoValues(arrViewTypes.toString(), TestData.USER_VIEW_TYPES, 'Only 2 view types should be available');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 8: Verify All Views - User Role`, async () => {
        await PlanningSpace.selectViewType("All Views");
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        const validation: boolean = await CommonFunctions.compareTwoValues(viewsFromPS.includes(TestData.ALL_VIEWS.split(",")[0]) && viewsFromPS.includes(TestData.ALL_VIEWS.split(",")[1]), true, 'All Views Assertion');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 9: Verify Favourites views - User Role`, async () => {
        await PlanningSpace.selectAllViewsOrFavourites("Favourites");
        const viewsFromPS: string[] = await PlanningSpace.getAllViews();
        const validation: boolean = await CommonFunctions.compareTwoValues(viewsFromPS, TestData.FAVOURITES, 'Favourites Views Assertion');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 10: Verify View Types for Sub Process - User Role`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Sub-process", { process: TestData.PROCESS_NAME, subProcess: TestData.SUB_PROCESS_NAME });
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        let arrViewTypes: string[] = await PlanningSpace.getAllViewTypes();
        let validation: boolean = await CommonFunctions.compareTwoValues(arrViewTypes.toString(), TestData.USER_VIEW_TYPES, 'Only 2 view types should be available');
        expect(validation).toBeTruthy();
    });

    it(`Test Case 11: Verify View Types for Assumption - User Role`, async () => {
        await PlanningSpace.navigateToPlanningSpace()
        await PlanningSpace.launchContext("Assumption", { origin: TestData.PROCESS_NAME, assumption: TestData.ASSUMPTION });
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        let arrViewTypes: string[] = await PlanningSpace.getAllViewTypes();
        let validation: boolean = await CommonFunctions.compareTwoValues(arrViewTypes.toString(), TestData.USER_VIEW_TYPES, 'Only 2 view types should be available');
        expect(validation).toBeTruthy();
    });

})