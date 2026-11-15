const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_005_BDECard.json");
import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
describe('BDE should load with supplied scenario & scope', async () => {
    // Mapping for toggle icon labels to match aria-labels in the DOM
    const toggleLabelMap: Record<string, string> = {
        'Download': 'download',
        'Status': 'Process status',
        'Settings': 'Settings',
        'Filter': 'Filter options',
        'Updload': 'updload', // Note: 'upload' is intentionally misspelled to match the original code
    };

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });

    it(` Test Case 1: verify actions in ${TestData.CARD_NAME} card`, async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        const bValidation1: boolean = await PlanningSpace.verifyRefreshIconInBDE(TestData.CARD_NAME);
        await CommonFunctions.compareTwoValues(bValidation1, true, `Is Refresh icon exist in ${TestData.CARD_NAME} card`);
        const bValidation2: boolean = await PlanningSpace.verifyMinimizeIconInBDE(TestData.CARD_NAME);
        await CommonFunctions.compareTwoValues(bValidation2, true, `Is minimize icon exist in ${TestData.CARD_NAME} card`);
        const bValidation3: boolean = await PlanningSpace.verifyToggleIconInBDE(TestData.CARD_NAME, toggleLabelMap['Download']);
        await CommonFunctions.compareTwoValues(bValidation3, true, `Is download csv icon exist in ${TestData.CARD_NAME} card`);
        const bValidation4: boolean = await PlanningSpace.verifyToggleIconInBDE(TestData.CARD_NAME, toggleLabelMap['Status']);
        await CommonFunctions.compareTwoValues(bValidation4, true, `Is process status icon exist in ${TestData.CARD_NAME} card`);
        const bValidation5: boolean = await PlanningSpace.verifyToggleIconInBDE(TestData.CARD_NAME, toggleLabelMap['Settings']);
        await CommonFunctions.compareTwoValues(bValidation5, true, `Is settings icon exist in ${TestData.CARD_NAME} card`);
        const bValidation6: boolean = await PlanningSpace.verifyToggleIconInBDE(TestData.CARD_NAME, toggleLabelMap['Filter']);
        await CommonFunctions.compareTwoValues(bValidation6, true, `Is filter options icon exist in ${TestData.CARD_NAME} card`);
        const bValidation7: boolean = await PlanningSpace.verifyToggleIconInBDE(TestData.CARD_NAME, toggleLabelMap['Updload']);
        await CommonFunctions.compareTwoValues(bValidation7, true, `Is upload csv icon exist in ${TestData.CARD_NAME} card`);
        const bValidation8: boolean = await PlanningSpace.verifyPaginationInBDE(TestData.CARD_NAME);
        await CommonFunctions.compareTwoValues(bValidation8, true, `Is pagination exist in ${TestData.CARD_NAME} card`);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation8).toBeTruthy();
    });

    it(`Test Case 2: Is filter input available for each column in ${TestData.CARD_NAME} table`, async () => {
        const bValidation: boolean = await PlanningSpace.verifyFilterInputInEachColumnAvailable(TestData.CARD_NAME);
        await CommonFunctions.compareTwoValues(bValidation, true, `Is filter input available for each column in ${TestData.CARD_NAME} table`);
        expect(bValidation).toBeTruthy();
    })

})