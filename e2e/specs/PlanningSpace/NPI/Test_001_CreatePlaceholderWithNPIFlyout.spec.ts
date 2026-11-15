import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
import ScenarioPage from "../../../pageobjects/scenario.page";
const Testdata = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/NPI/Test_001_CreatePlaceholderWithNPIFlyout.json");

describe('Create Placeholder with NPI Flyout', () => {
    let randomNumber: number = Math.floor(Math.random() * 1000);
    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(Testdata.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME2 as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, Testdata.PROCESS_NAME, false, false);
        await browser.pause(5000);
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.selectAllViewsOrFavourites("All Views");
        await PlanningSpace.clickDashBoard(Testdata.VIEW_NAME);
        await browser.pause(5000);
    });

    it(`Test Case 1: Validate dimensions in UI with API response`, async () => {
        await browser.setupInterceptor();
        await PlanningSpace.performCardCellMoreActions("PivotCard", Testdata.ITEM_TO_CLONE, Testdata.CARD_ACTION_NAME);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFlyoutOpen(), true, "Flyout is opened");
        await browser.pause(10000);
        const requests = await ScenarioPage.getJsonRequests(Testdata.NODE_CONFIG_BASE_URL);
        const npiProcedureResponse = await ScenarioPage.getApiResponse(requests, Testdata.PROCEDURE_URL+Testdata.PROCEDURE_NAME);
        const actorConfigResponse = await ScenarioPage.getApiResponse(requests, Testdata.ACTOR_CONFIG_BASE_URL+npiProcedureResponse.actorsConfig[0]);
        const planningNodeResponse = await ScenarioPage.getApiResponse(requests, Testdata.NODE_CONFIG_BASE_URL+ actorConfigResponse?.params?.planningNode);
        const expectedDimensions = planningNodeResponse?.dimensions?.map((dimension: any) => dimension.name);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.validateDimesionsInUI(expectedDimensions), true, "Dimensions in UI match with API response");
        await PlanningSpace.clickOnCancelIcon();
        expect(bValidation1 && bValidation2).toBeTruthy();
    });

    it(`Test Case 2: Create Member in reference's assortment mode`, async () => {
        const formData = [{ DIMENSION_NAME: "ITEM", newItemName: "New Item" + randomNumber }];
        await PlanningSpace.performCardCellMoreActions("PivotCard", Testdata.ITEM_TO_CLONE, Testdata.CARD_ACTION_NAME);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFlyoutOpen(), true, "Flyout is opened");
        await PlanningSpace.createMemberForm(formData, "ref-assortment", "Member");
        const bValidation2 = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg("running"),true, "Alert message is displayed as running");
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg('success'),true, "Alert message is displayed as success");
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

    it(`Test Case 3: Create Member with custom values in Choose mode`, async () => {
        const formData = [{ DIMENSION_NAME: "ITEM", VALUE: "NPI>NPI-5>NPI5", newItemName: "New Item 1" + randomNumber, noOfVariants: '2' }, { DIMENSION_NAME: "CUSTOMER", VALUE: ["ALL CUSTOMERS>RETAIL1>RETAIL KEY ACCOUNTS2>HEMA", "ALL CUSTOMERS>WHOLESALE>WHOLESALE OTHER ACCOUNTS>WHOLESALE OTHERS"] }, { DIMENSION_NAME: "LOCATION", VALUE: ["ALL DEMAND LOCATIONS>APAC>CN>SHANGHAI", "ALL DEMAND LOCATIONS>EMEA>SE>STOCKHOLM"] }];
        await PlanningSpace.performCardCellMoreActions("PivotCard", Testdata.ITEM_TO_CLONE, Testdata.CARD_ACTION_NAME);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFlyoutOpen(), true, "Flyout is opened");
        await PlanningSpace.createMemberForm(formData, "choose", "Member");
        const bValidation2 = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg("running"),true, "Alert message is displayed as running");
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg('success'),true, "Alert message is displayed as success");
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    })

    it(`Test Case 4: Create Intersection with custom values`, async () => {
        const formData = [{ DIMENSION_NAME: "ITEM", VALUE: "PF-52>PL-027>CNSUM_FCST_Item93", newItemName: "New Item 11" + randomNumber }, { DIMENSION_NAME: "CUSTOMER", VALUE: ["ALL CUSTOMERS>WHOLESALE>WHOLESALE OTHER ACCOUNTS>KEY ACCOUNT 3"] }, { DIMENSION_NAME: "LOCATION", VALUE: ["ALL DEMAND LOCATIONS>EUROPE>WEST_DC>AmsterdamStore2"] }];
        await PlanningSpace.performCardCellMoreActions("PivotCard", Testdata.ITEM_TO_CLONE, Testdata.CARD_ACTION_NAME);
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.isFlyoutOpen(), true, "Flyout is opened");
        await PlanningSpace.createMemberForm(formData, "choose", "Intersection");
        const bValidation2 = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg("running"),true, "Alert message is displayed as running");
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await CommonFunctions.verifyAlertMsg('success'),true, "Alert message is displayed as success");
        expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
    });

});