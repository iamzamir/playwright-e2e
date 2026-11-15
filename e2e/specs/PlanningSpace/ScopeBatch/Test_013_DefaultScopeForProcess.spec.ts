import PlanningSpace from "../../../pageobjects/planning.page";
import scope from "../../../pageobjects/scope.page"
import CommonFunctions from "../../../util/common.util";
const TestData = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/ScopeBatch/Test_013_DefaultScopeForProcess.json");

describe(`Default Scope filter Page Context`, async () => {

    before(async () => {
        await PlanningSpace.loginToPlanningSpaceWithProcess(TestData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, TestData.PROCESS_NAME);
        await browser.pause(5000);
    });

    it(`Test Case 1: Is Default scope passed correctly to ${TestData.CARD_NAME} when page context is enabled in views`, async () => {
        for (let eachView of TestData.DEFAULT_SCOPE_FOR_VIEWS) {
            await PlanningSpace.clickViewsDropDown();
            await PlanningSpace.clickDashBoard(eachView.VIEW_NAME);
            await browser.pause(5000);
            await scope.clickOnTab("Scope");
            await browser.pause(5000);
            const filterName = await scope.getFilterName();
            const bValidation: boolean = await CommonFunctions.compareTwoValues(filterName.toLowerCase().replace(/\*/g, ''), eachView.FILTER_NAME.toLowerCase(), `Applied filter for ${eachView.VIEW_NAME} view is ${filterName}`);
            expect(bValidation).toBeTruthy();
            const isSame = await PlanningSpace.verifyScopeInBudgeAndVF();
            expect(isSame).toBeTruthy();
            await scope.closeDrawer();
            for (let eachDimension of eachView.DIMENSIONS) {
                const isDimensionExist = await scope.isDimensionExistInTopFacetsOfMaas(eachDimension.LABEL, TestData.CARD_NAME);
                await CommonFunctions.compareTwoValues(isDimensionExist, true, `${eachDimension.LABEL} is present in the top facets of ${TestData.CARD_NAME}`);
                expect(isDimensionExist).toBeTruthy();
                for (let eachSelectedProperty of eachDimension.SELECTED_PROPERTIES) {
                    const properties = eachSelectedProperty.VALUES.map((ele) => ele.VALUE);
                    const isPropertiesExist = await scope.doesSelectedPropertiesReflectedInMaasAsColumns(properties, TestData.CARD_NAME);
                    await CommonFunctions.compareTwoValues(isPropertiesExist, true, `${properties} is present in the ${TestData.CARD_NAME}`);
                    expect(isPropertiesExist).toBeTruthy();
                    for(let property of properties) {
                        await scope.clickOnTab("Scope");
                        const bValidation: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope(eachDimension.SELECTED_PROPERTIES[0].LABEL, property), true, `Is ${property} filter applied in VF`);
                        expect(bValidation).toBeTruthy();
                        await scope.closeDrawer();
                    }
                }
            }
            // await scope.clickOnTab("Views");
            await browser.pause(2000);
        }
    });

    it(`Test Case 2: Is Scope passed correctly to ${TestData.CARD_NAME} when change in current default scope of ${TestData.DEFAULT_SCOPE_FOR_VIEWS[1].VIEW_NAME} view`, async () => {
        const properties = TestData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].SELECTED_PROPERTIES[0].VALUES.map((ele) => ele.VALUE);
        const updatedProperties = [...properties,'CY-2024']
        await scope.clickOnTab("Scope");
        await browser.pause(5000);
        await scope.addFiltersToDimensionHierarchyInScope(TestData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].LABEL,TestData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].SELECTED_PROPERTIES[0].LABEL, ['CY-2024']);
        await browser.keys('Escape');
        await scope.clickOnApplyFiltersBtn()
        await browser.pause(20000);
        await scope.clickOnTab("Scope");
        const filterName = await scope.getAppliedVFTitle();

        const bValidation1: boolean = await CommonFunctions.compareTwoValues(filterName.toLowerCase(), TestData.DEFAULT_SCOPE_FOR_VIEWS[1].FILTER_NAME.toLowerCase(), `Applied filter for ${TestData.DEFAULT_SCOPE_FOR_VIEWS[1].VIEW_NAME} view is ${filterName}`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.verifyScopeInBudgeAndVF(), true, `Is scope name matched in Budget and VF`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.isDimensionExistInTopFacetsOfMaas(TestData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].LABEL, TestData.CARD_NAME), true, `${TestData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].LABEL} is present in the top facets of ${TestData.CARD_NAME}`);
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(await scope.doesSelectedPropertiesReflectedInMaasAsColumns(updatedProperties, TestData.CARD_NAME), true, `${updatedProperties} is present in the ${TestData.CARD_NAME}`);
        let bValidation5: boolean = true;
        for(let property of updatedProperties) {
            const bValidation: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope(TestData.DEFAULT_SCOPE_FOR_VIEWS[1].DIMENSIONS[0].SELECTED_PROPERTIES[0].LABEL, property), true, `Is ${property} filter applied in VF`);
            if(bValidation == false) {
                bValidation5 = false;
            }
        }
        await scope.closeDrawer()
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
    });

    it(`Test Case 3: Is Scope remain same to ${TestData.CARD_NAME} when revisit to ${TestData.DEFAULT_SCOPE_FOR_VIEWS[0].VIEW_NAME} view`, async () => {
        const properties = TestData.DEFAULT_SCOPE_FOR_VIEWS[0].DIMENSIONS[0].SELECTED_PROPERTIES[0].VALUES.map((ele) => ele.VALUE);
        // await scope.clickOnTab("Views");
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.DEFAULT_SCOPE_FOR_VIEWS[0].VIEW_NAME);
        await browser.pause(5000);
        await scope.clickOnTab("Scope");
        await browser.pause(5000);
        const filterName = await scope.getAppliedVFTitle();
        const bValidation1: boolean = await CommonFunctions.compareTwoValues(filterName.toLowerCase(), TestData.DEFAULT_SCOPE_FOR_VIEWS[0].FILTER_NAME.toLowerCase(), `Applied filter for ${TestData.DEFAULT_SCOPE_FOR_VIEWS[0].VIEW_NAME} view is ${filterName}`);
        const bValidation2: boolean = await CommonFunctions.compareTwoValues(await PlanningSpace.verifyScopeInBudgeAndVF(), true, `Is scope name matched in Budget and VF`);
        const bValidation3: boolean = await CommonFunctions.compareTwoValues(await scope.isDimensionExistInTopFacetsOfMaas(TestData.DEFAULT_SCOPE_FOR_VIEWS[0].DIMENSIONS[0].LABEL, TestData.CARD_NAME), true, `${TestData.DEFAULT_SCOPE_FOR_VIEWS[0].DIMENSIONS[0].LABEL} is present in the top facets of ${TestData.CARD_NAME}`);
        const bValidation4: boolean = await CommonFunctions.compareTwoValues(await scope.doesSelectedPropertiesReflectedInMaasAsColumns(properties, TestData.CARD_NAME), true, `${properties} is present in the ${TestData.CARD_NAME}`);
        let bValidation5: boolean = true;
        for(let property of properties) {
            const bValidation: boolean = await CommonFunctions.compareTwoValues(await scope.verifyAppliedFilterInScope(TestData.DEFAULT_SCOPE_FOR_VIEWS[0].DIMENSIONS[0].SELECTED_PROPERTIES[0].LABEL, property), true, `Is ${property} filter applied in VF`);
            if(bValidation == false) {
                bValidation5 = false;
            }
        }
        await scope.closeDrawer();
        expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5).toBeTruthy();
    });

    after(async () => {
        await PlanningSpace.clickViewsDropDown();
        await PlanningSpace.clickDashBoard(TestData.DEFAULT_SCOPE_FOR_VIEWS[1].VIEW_NAME);
        await browser.pause(5000);
        await scope.clickOnTab("Scope");
        await browser.pause(5000);
        await scope.clickRevertVFChanges();
        await browser.pause(5000);
    });
});
