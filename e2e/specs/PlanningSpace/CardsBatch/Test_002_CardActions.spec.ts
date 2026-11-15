const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/CardsBatch/Test_002_CardActions.json");
// import TestData from "../../../Testdata/PlanningSpace/CardsBatch/Test_002_CardActions.json";
import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";

const random_name = Math.floor(1000 + Math.random() * 9000);
const cardTitle = 'Card_Actions_test_' + random_name;
const cardDesc = 'Card_Actions_test_' + random_name + '_short_description';
// const cardTitle = 'deletion'
describe("Should Create, Edit, Configure & Delete Card", async () => {
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.VIEW_NAME);
        await browser.pause(5000);
    });
    it('Test Case 1: Should create card',async ()=> {  
        const card: string = 'MaaS Pivot Card Type';                    
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1,true,'Edit button clicked');
        await browser.pause(5000);
        const isCardsExist: boolean = await PlanningSpace.verifyAtleastOneCardExistInView();
        let bValidation2: boolean;
        await browser.pause(1000);
        if(isCardsExist){
            //when already one or more card exists in the current view
            bValidation2 =  await PlanningSpace.addAnotherCardOrContainer('Card');
        }
        else {
            //when zero cards exist in the current view
            bValidation2= await PlanningSpace.addCardOrContainer('Card');
        }
        await CommonFunctions.compareTwoValues(bValidation2,true,`Clicked on add card button`);
        await browser.pause(1000);
        const bValidation3: boolean = await PlanningSpace.clickCreateCardBtn();
        await CommonFunctions.compareTwoValues(bValidation3,true,`Clicked on create card button`);
        const bValidation4: boolean = await PlanningSpace.clickOnCreateCardInItemGallery(card);
        await CommonFunctions.compareTwoValues(bValidation4, true, `Clicked on  create card button in ${card} card`);
        await PlanningSpace.setCardSettingsTitleInput(cardTitle);
        await PlanningSpace.clickPublishBtn();
        await browser.pause(5000);
        const bValidation5: boolean = await PlanningSpace.verifyCardAvailableInCardGallery(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation5,true,`Does card with title ${cardTitle} available in  card gallery`);
        await browser.pause(1000);
        await PlanningSpace.addCardToViewFromGallery(cardTitle);
        await browser.pause(5000);
        const bValidation6: boolean = await PlanningSpace.verifyCardInView(cardTitle,TestData.VIEW_NAME,true);
        await CommonFunctions.compareTwoValues(bValidation6,true,`Does card with title ${cardTitle} available in Edit ${TestData.VIEW_NAME} Page`);
        await PlanningSpace.saveCardInView();
        await browser.pause(5000);
        const bValidation7: boolean = await PlanningSpace.verifyCardafterSavingDashboard(cardTitle,TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(bValidation7,true,`Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7).toBeTruthy();
    });

    it('Test Case 2: Should edit card', async () => {
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await PlanningSpace.addAnotherCardOrContainer('Card');
        const bValidation2: boolean = await PlanningSpace.editCardInGallery(cardTitle,cardDesc);
        await CommonFunctions.compareTwoValues(bValidation2,true,`Is Description field updated successfully for ${cardTitle} card`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    })

    it('Test Case 3: Should config card', async () => {
        const bValidation1: boolean = await PlanningSpace.configCardInGallery(cardTitle,TestData.CONFIG_SERVICE_API,TestData.CONTROLLER_SERVICE_API,TestData.CALC_ENGINE_ID);
        await CommonFunctions.compareTwoValues(bValidation1,true,`Does configuration fields updated successfully`)
        await PlanningSpace.clickBackButtonInCardGallery();
        const bValidation2: boolean = await PlanningSpace.enablePageContext(cardTitle,TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(bValidation2,true,`Does apply page context enabled in ${cardTitle} card settings `);
        await PlanningSpace.saveCardInView();
        const bValidation3: boolean = await PlanningSpace.verifyCardafterSavingDashboard(cardTitle,TestData.VIEW_NAME);
        await CommonFunctions.compareTwoValues(bValidation3,true,`Does card with title ${cardTitle} available in ${TestData.VIEW_NAME} Page`);
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    })

    it('Test Case 4: Should delete card', async ()=> {
        const bValidation1: boolean = await PlanningSpace.clickEditBtn();
        await CommonFunctions.compareTwoValues(bValidation1,true,`Clicked on edit icon in ${TestData.VIEW_NAME} view`);
        await PlanningSpace.addAnotherCardOrContainer('Card');
        const bValidation2: boolean = await PlanningSpace.removerCardFromGallery(cardTitle);
        await CommonFunctions.compareTwoValues(bValidation2,true,`${cardTitle} card is deleted from gallery`);
        expect(bValidation1 && bValidation2).toBeTruthy();
    })
});