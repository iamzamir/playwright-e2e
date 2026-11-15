import PlanningSpace from "../../../pageobjects/planning.page";
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ObjectiveBar/Test_001_ObjectiveBarInPO.json");

describe('objective bar for process', () => {
    before(async () => {
        await TestUtil.launchAppFromCatalog(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, process.env.POLINK as string);
        await browser.pause(5000);
    })

    it('Test Case 1: Verify objective bar details', async () => {
        await ProcessPage.clickOnProcess(TestData.PROCESS_NAME);
        await browser.pause(5000);
        const validation1 = await PlanningSpace.verifyObjectiveBarDetails();
        await CommonFunctions.compareTwoValues(validation1, true, "verify details in objective bar");
        expect(validation1).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 1: Objective bar details verified successfully");
    });

    it('Test Case 2: Verify objective bar if there is no data is configured', async () => {
        await browser.pause(5000);
        await browser.url("https://bylumuiportalpltna.azureedge.net/pointegration/");
        await ProcessPage.clickOnProcess(TestData.PROCESS);
        await browser.pause(5000);
        const validation1 = await PlanningSpace.verifyObjectiveBarDetails();
        await CommonFunctions.compareTwoValues(validation1, false, "verify objective bar details when no data is configured");
        expect(validation1).toEqual(true);
        await CommonFunctions.logMessage("INFO", "Test case 2: Objective bar is not displayed when no data is configured successfully");
    });
})