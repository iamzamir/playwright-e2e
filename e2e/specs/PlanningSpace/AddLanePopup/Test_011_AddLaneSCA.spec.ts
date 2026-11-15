import PlanningSpace from "../../../pageobjects/planning.page";
import TestData from "../../../Testdata/INTEROP/PlanningSpace/AddLanePopup/Test_011_AddLaneSCA.json";
import supplyChainPage from "../../../pageobjects/sca.page";
import CommonFunctions from "../../../util/common.util";
import { InputField } from "../../../pageobjects/page";

describe(`Tests for ${TestData.PROCEDURE_NAME} procedure`, async () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites('All Views')
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
    })

    it(`Test Case 1: Start SPARQ Engine if it is down then open ${TestData.PROCEDURE_NAME} popup modal`, async () => {
        await supplyChainPage.clickProcedureItemFromDropdown(TestData.PROCEDURE_NAME);
        const isSparqEngineDown = await supplyChainPage.isSparqEngineDown();
        CommonFunctions.logMessage('INFO', `Is SPARQ engine down:: ${isSparqEngineDown}`)
        if(isSparqEngineDown) {
            const closeModal = await PlanningSpace.closePopupModal();
            await CommonFunctions.compareTwoValues(closeModal,true, `Is ${TestData.PROCEDURE_NAME} popup closed:: ${closeModal}`);
            await supplyChainPage.startSparqEngine(TestData.SPARQ_ENGINE_PROCEDURE_NAME)
            await PlanningSpace.closeWizard();
            const isSparqExecuted = await CommonFunctions.verifyAlertMsg('Success! Start SPARQ Interactive Planning procedure is completed', 300000);
            await CommonFunctions.compareTwoValues(isSparqExecuted,true, `Is SPARQ engine executed successfully:: ${isSparqExecuted}`);
            await browser.pause(10000);
            const isProcedureItemClicked: boolean = await supplyChainPage.clickProcedureItemFromDropdown(TestData.PROCEDURE_NAME);
            await CommonFunctions.compareTwoValues(isProcedureItemClicked, true, `Is ${TestData.PROCEDURE_NAME} item clicked:: ${isProcedureItemClicked}`);
        }
        const isPopupOpened = await supplyChainPage.isPopupOpened(TestData.PROCEDURE_NAME);
        const bValidation1 = await CommonFunctions.compareTwoValues(isPopupOpened, true, `Is popup opended with title ${TestData.PROCEDURE_NAME}:: ${isPopupOpened}`)
        expect(bValidation1).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 1 completed successfully.');
    });

    it(`Test Case 2: Is ${TestData.PROCEDURE_NAME} form saved successfully`, async () => {
        await browser.pause(10000);
        await PlanningSpace.fillFormData(TestData.ADDLANE_FORM_INPUT_FIELDS as unknown as InputField[]);
        await supplyChainPage.saveAddLaneForm();
        await CommonFunctions.logMessage('INFO', `verify alertmsg 1: ${TestData.PROCEDURE_NAME} procedure is running`)
        const runningAlertMsg = await CommonFunctions.verifyAlertMsg(`${TestData.PROCEDURE_NAME} procedure is running`);
        const bValidation1 = await CommonFunctions.compareTwoValues(runningAlertMsg, true, `verify ${TestData.PROCEDURE_NAME} procedure running alert msg`);
        await CommonFunctions.logMessage('INFO', `verify alert msg 2: ${TestData.PROCEDURE_NAME} procedure is completed `)
        const successAlertMsg = await CommonFunctions.verifyAlertMsg(`Success! ${TestData.PROCEDURE_NAME} procedure is completed`);
        const bValidation2 = await CommonFunctions.compareTwoValues(successAlertMsg, true, `verify ${TestData.PROCEDURE_NAME} procedure completed alert msg`);
        expect(bValidation1 && bValidation2).toBeTruthy();
        await CommonFunctions.logMessage('PASS', 'Test Case 2 completed successfully.');
    });
})