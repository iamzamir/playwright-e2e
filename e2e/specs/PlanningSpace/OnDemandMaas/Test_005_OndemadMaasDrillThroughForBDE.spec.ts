import PlanningSpace from '../../../pageobjects/planning.page';
import CommonFunctions from '../../../util/common.util';

const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/OnDemandMaas/Test_005_OnDemandMaasDrillThroughForBDE.json");

describe('Interactive View - On Drill through Popup should be disabled and Navigate to new window ', () => {

    before(async () => {
        // Log in to the Planning Space application with the provided test credentials and process
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        // Navigate to the specified dashboard view
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    });

    it('Test Case :On BDE Card row click navigate to new window ', async () => {
        // Pause to allow the elements to load properly
        await browser.pause(15000);

        // Locate and move to the BDE card element
        const bdeCardElement = await $('//div[@data-testid="lui-dashboard-card-cardHeader"]//span[@data-testid="lui-dashboard-card-title"]//span[text()="' + TestData.CARD_NAME + '"]');
        console.log('//div[@data-testid="lui-dashboard-card-cardHeader"]//span[@data-testid="lui-dashboard-card-title"]//span[text()="' + TestData.CARD_NAME + '"]')
        bdeCardElement.moveTo();
        if (await bdeCardElement.isExisting()) {
            console.log("BDE card (entire data) exists.");
        } else {
            console.warn("BDE card (entire data) not found.");
        }

        // Locate and click on the table cell chevron if it exists
        let tableCellChevron;
        if (process.env.PSENV == "QA")
            tableCellChevron = await $('//tbody//tr[2][@data-testid="tableRow"]//td[7][@data-testid="tableCellChevron"]');
        else
            tableCellChevron = await $('//tbody//tr[2][@data-testid="tableRow"]//td[6][@data-testid="tableCellChevron"]');
        if (await tableCellChevron.isExisting()) {
            await tableCellChevron.click();
            console.log("Clicked on the table cell chevron.");
        } else {
            console.warn("Table cell chevron not found.");
        }
        await browser.pause(10000);
        await CommonFunctions.switchToSpecificWindow(1);
        const actualViewName = await PlanningSpace.getViewTitleName();
        await browser.pause(30000);
        const isViewNameCorrect = await CommonFunctions.compareTwoValues(actualViewName, TestData.VIEW_NAME1, `Process Name Assertion after Drill Through to ${TestData.VIEW_NAME1}`);
        const isViewSelected = await CommonFunctions.compareTwoValues(await PlanningSpace.isViewSelected(TestData.VIEW_NAME1), true, `${TestData.VIEW_NAME1} View Selected Assertion`);
        const currentUrl = await browser.getUrl();
        await CommonFunctions.logMessage('INFO', `Current URL is ${currentUrl}`);
        let contextId = "";
        currentUrl.split("&").forEach(part => {
            if (part.includes("contextId=")) {
                contextId = part.split("=")[1];
            }
        });
        await CommonFunctions.logMessage('INFO', `Context ID is ${contextId}`);
        const isContextIdInUrl = await CommonFunctions.compareTwoValues(currentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
        const isContextIdValid = await CommonFunctions.compareTwoValues(contextId.length > 1, true, "Context ID Assertion - It should have a valid ID");
        // const isRedDotDisplayed = await CommonFunctions.compareTwoValues(await PlanningSpace.isRedDotDisplaysOnPlanningSpace(), true, "Red Dot Display On Planning Space Assertion");
        const isContextOverrideDisplayed = await CommonFunctions.compareTwoValues(await PlanningSpace.isContextOverrideDisplays(), true, "Context Override Button Displays Assertion");
        const isClearButtonDisplayed = await CommonFunctions.compareTwoValues(await PlanningSpace.isClearDisplays(), true, "Clear Button/Link Displays Assertion");
        expect(isViewNameCorrect && isViewSelected && isContextIdInUrl && isContextIdValid && isContextOverrideDisplayed && isClearButtonDisplayed).toEqual(true);
    });

});
