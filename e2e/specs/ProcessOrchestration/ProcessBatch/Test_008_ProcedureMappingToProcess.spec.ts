import PlanningSpace from '../../../pageobjects/planning.page';
import ProcessPage from "../../../pageobjects/process.page";
import CommonFunctions from '../../../util/common.util';
import SupplyChainPage from "../../../pageobjects/sca.page";
import TestUtil from '../../../util/test.util';
const TestData = require("../../../Testdata/" + process.env.PSENV + "/ProcessOrchestration/ProcessBatch/Test_008_ProcedureMappingToProcess.json");

describe('Map procedures to process and validate in planning space', () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
    });

        it('Case 1: Configure procedures in process settings and validate the creation', async () => {
        await TestUtil.clickPowerBarLink('Process Settings');
        await CommonFunctions.switchToSpecificWindow(1);
        await PlanningSpace.switchToMFEFrame();
        await SupplyChainPage.selectProcess(TestData.PO_PROCESS_NAME);

        const isName1Mapped = await SupplyChainPage.isProcedureMapped(TestData.PROCEDURE.PROCEDURENAME1);
        if (!isName1Mapped) {
            await ProcessPage.clickOnAddProcedureBtn();
            await SupplyChainPage.selectProcessesAndAttributes(TestData.PROCEDURE.PROCEDURENAME1, TestData.ATTRIBUTE_VALUE);
            const firstSuccessMsgAlert = await CommonFunctions.verifyAlertMsg('Process Model PUT Successful', 15000);
            await CommonFunctions.compareTwoValues(firstSuccessMsgAlert, true, 'Procedure 1 mapped successfully');
        }

        const isName2Mapped = await SupplyChainPage.isProcedureMapped(TestData.PROCEDURE.PROCEDURENAME2);
        if (!isName2Mapped) {
            await ProcessPage.clickOnAddProcedureBtn();
            await SupplyChainPage.selectProcessesAndAttributes(TestData.PROCEDURE.PROCEDURENAME2, TestData.ATTRIBUTE_VALUE);
            const secondSuccessMsgAlert = await CommonFunctions.verifyAlertMsg('Process Model PUT Successful', 15000);
            await CommonFunctions.compareTwoValues(secondSuccessMsgAlert, true, 'Procedure 2 mapped successfully');
        }

        const isName3Mapped = await SupplyChainPage.isProcedureMapped(TestData.PROCEDURE.PROCEDURENAME3);
        if (!isName3Mapped) {
            await ProcessPage.clickOnAddProcedureBtn();
            await SupplyChainPage.selectProcessesAndAttributes(TestData.PROCEDURE.PROCEDURENAME3, TestData.ATTRIBUTE_VALUE);
            const thirdSuccessMsgAlert = await CommonFunctions.verifyAlertMsg('Process Model PUT Successful', 15000);
            await CommonFunctions.compareTwoValues(thirdSuccessMsgAlert, true, 'Procedure 3 mapped successfully');
        }

        const [Procedure1, Procedure2, Procedure3] = await Promise.all([SupplyChainPage.isProcedureMapped(TestData.PROCEDURE.PROCEDURENAME1), SupplyChainPage.isProcedureMapped(TestData.PROCEDURE.PROCEDURENAME2), SupplyChainPage.isProcedureMapped(TestData.PROCEDURE.PROCEDURENAME3)]);
        expect(Procedure1 && Procedure2 && Procedure3).toBeTruthy();
    });

    it('Case 2: Validate procedures sequence in planning space', async () => {
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        await PlanningSpace.searchSCAProceduresDropdown();
        const expectedSequence = [ { procedureDisplayName: TestData.PROCEDURE.PROCEDURENAME1 }, { procedureDisplayName: TestData.PROCEDURE.PROCEDURENAME2 }, { procedureDisplayName: TestData.PROCEDURE.PROCEDURENAME3 } ];
        await CommonFunctions.logMessage('INFO', 'Expected Sequence: ' + JSON.stringify(expectedSequence));
        const sequenceValidation = await SupplyChainPage.verifyOtherActionsInProceduresDropdown(expectedSequence);
        await CommonFunctions.logMessage('INFO', 'Sequence Validation Result: ' + sequenceValidation);
        await browser.keys('Escape');         // Close the procedures dropdown for next test case
        await CommonFunctions.logMessage('INFO', 'Procedures dropdown closed');
        expect(sequenceValidation).toBeTruthy();
    });

    it('Case 3: Remove the created procedures in process settings', async () => {
        await TestUtil.clickPowerBarLink('Process Settings');
        await CommonFunctions.switchToSpecificWindow(2);
        await PlanningSpace.switchToMFEFrame();
        await SupplyChainPage.selectProcess(TestData.PO_PROCESS_NAME);
        await SupplyChainPage.deleteProcedure(TestData.PROCEDURE.PROCEDURENAME1);
        const deleteMappedProcedure1 = await CommonFunctions.verifyAlertMsg('Process Model PUT Successful', 10000);
        await CommonFunctions.compareTwoValues(deleteMappedProcedure1, true, 'Procedure 1 deleted successfully');
        await SupplyChainPage.deleteProcedure(TestData.PROCEDURE.PROCEDURENAME2);
        const deleteMappedProcedure2 = await CommonFunctions.verifyAlertMsg('Process Model PUT Successful', 10000);
        await CommonFunctions.compareTwoValues(deleteMappedProcedure2, true, 'Procedure 2 deleted successfully');
        await SupplyChainPage.deleteProcedure(TestData.PROCEDURE.PROCEDURENAME3);
        const deleteMappedProcedure3 = await CommonFunctions.verifyAlertMsg('Process Model PUT Successful', 10000);
        await CommonFunctions.compareTwoValues(deleteMappedProcedure3, true, 'Procedure 3 deleted successfully');
        expect(deleteMappedProcedure1 && deleteMappedProcedure2 && deleteMappedProcedure3).toBeTruthy();
    });

    it('Case 4: Validate SCA procedures button is removed from planning space after deletion', async () => {
        await PlanningSpace.navigateToPlanningSpaceWithProcess(TestData.PROCESS_NAME);
        await PlanningSpace.switchToMFEFrame();
        const isProceduresButtonPresent = await PlanningSpace.searchSCAProceduresDropdown();
        await CommonFunctions.compareTwoValues(isProceduresButtonPresent, false, 'SCA procedures button is removed after deletion');
        expect(isProceduresButtonPresent).toBeFalsy();
    });

});