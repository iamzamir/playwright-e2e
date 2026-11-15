import CommonFunctions from "../../../util/common.util";
import TestData from "../../../Testdata/INTEROP/PlanningSpace/SupplyChainActionsBatch/Test_007_SCPInlineLayout.json";
import SNAConfigurePage from "../../../pageobjects/actors-and-procedures.page";
import PlanningSpace from '../../../pageobjects/planning.page';
import ScenarioPage from '../../../pageobjects/scenario.page';
import ProcessPage from '../../../pageobjects/process.page';

describe("Verify SCP inline layout", async () => {

    let oldDefaultScenario: string;
    before(async () => {
        await PlanningSpace.loginToPlanningSpace(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string);
        await PlanningSpace.navToSNA();
    });

    it(`Test Case 1: Is UI config set for ${TestData.PROCEDURE_NAME} procedure`, async () => {
        const metaData = JSON.stringify(TestData.UICONFIG_METADATA);
        const isMetaDataSetForProcedure = await SNAConfigurePage.setMetaDataForProcedure(TestData.PROCEDURE_NAME, metaData);
        await CommonFunctions.compareTwoValues(isMetaDataSetForProcedure, true, `Is UICONFIG set for ${TestData.PROCEDURE_NAME} procedure`);
        expect(isMetaDataSetForProcedure).toBeTruthy();
    });

    // use this test case when it is a drill through
    xit("Test Case 2: Does context id exists in url", async () => {
        let sCurrentUrl: string = await browser.getUrl();
        await CommonFunctions.logMessage('INFO',`current url is ${sCurrentUrl}`)
        let sSplitUrl = sCurrentUrl.split("&");
        let sContextID: string = "";
        for (let i = 0; i < sSplitUrl.length; i++) {
            if (sSplitUrl[i].includes("contextId=")) {
                sContextID = sSplitUrl[i].split("=")[1];
            }
        }
        await CommonFunctions.logMessage('INFO',`context id is  ${sContextID}`)
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(sCurrentUrl.includes("contextId="), true, "URL includes Context ID Assertion");
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(sContextID.length > 1, true, "Context ID Assertion, it should have some ID and its length should be greated than 1");
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 3: Validate default scenario `, async () => {
        await browser.pause(10000);
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.goToManageScenarios();
        oldDefaultScenario = await ScenarioPage.getDefaultScenario();
        const isDefaultScenarioExist:boolean = oldDefaultScenario.trim().length > 1 ;
        await CommonFunctions.compareTwoValues(isDefaultScenarioExist, true, `Is default scenario fetched`)
        expect(isDefaultScenarioExist).toBeTruthy();
    });

    it(`Test Case 4: Is ${TestData.PROCEDURE_NAME} procedure exists in SCA`, async () => {
        await ProcessPage.clickLeftpaneLinks('Planning');
        const isProcedureClicked: boolean = await PlanningSpace.selectSupplyChainProceduresAction(TestData.PROCEDURE_NAME);
        await CommonFunctions.compareTwoValues(isProcedureClicked,true,`Should display ${TestData.PROCEDURE_NAME} in SCP dropdown Assertion`);
        expect(isProcedureClicked).toBeTruthy();
    });

    it("Test Case 5: Does procedure is running", async () => {
        const running = await CommonFunctions.verifyAlertMsg(`procedure is running`);
        await CommonFunctions.compareTwoValues(running, true, 'verify alert')
        await browser.pause(10000);
        const success = await CommonFunctions.verifyAlertMsg('Success');
        await CommonFunctions.compareTwoValues(success, true, 'Success')
        expect(running && success).toEqual(true);
    });

    it("Test Case 6: Is scenarios deleted created using SCA inline layout", async () => {
        const newlyCreatedScenarioFormat: string = 'CopyOf-'+ oldDefaultScenario;
        await PlanningSpace.goToManageScenarios();
        await ScenarioPage.clickAllScenarios();
        await browser.pause(15000);
        const scenarios: string[] = await ScenarioPage.getInlineScenariosCreatedWithSCA(newlyCreatedScenarioFormat);
        for(let scenario of scenarios){
            await browser.pause(2000);
            const isScenarioDelete: boolean = await ScenarioPage.deleteChildScenario(scenario);
            expect(isScenarioDelete).toBeTruthy();
        }
    });
});