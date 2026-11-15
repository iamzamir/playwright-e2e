
import PlanningSpace from "../../../pageobjects/planning.page";
import CommonFunctions from "../../../util/common.util";
import TestUtil from "../../../util/test.util";

const Testdata = require("../../../Testdata/" + process.env.PSENV + "/PlanningSpace/LiveBlocks/Test_003_LiveBlocksExtended.json");

describe('Live Blocks - Extended', () => {
	const selectView = async (viewName: string) => {
		await PlanningSpace.clickViewsDropDown();
		await PlanningSpace.selectAllViewsOrFavourites("All Views");
		await PlanningSpace.clickDashBoard(viewName);
		await browser.pause(5000);
	};

	before(async () => {
		await PlanningSpace.loginToPlanningSpaceWithProcess(
			Testdata.REALM_NAME,
			process.env.FUNCTIONAL_TEST_USERNAME as string,
			process.env.FUNCTIONAL_TEST_PASSWORD as string,
			Testdata.PROCESS_NAME,
			false,
			false
		);
		await browser.pause(5000);
		await selectView(Testdata.VIEW_NAME);
	});

	it('Test case 1: Validate that user avatars are displayed prominently in the planning space view when users are active', async () => {
		const avatarGroupDisplayed = await PlanningSpace.isLiveblocksAvatarGroupDisplayed();
		const bValidation1 = await CommonFunctions.compareTwoValues(
			avatarGroupDisplayed,
			true,
			`Avatar group displayed for user1: ${avatarGroupDisplayed}`
		);

		const avatarCount = await PlanningSpace.getLiveblocksAvatarCount();
		const bValidation2 = await CommonFunctions.compareTwoValues(
			avatarCount > 0,
			true,
			`Avatar count should be > 0 for user1, actual: ${avatarCount}`
		);

		expect(bValidation1 && bValidation2).toBeTruthy();
	});

	it('Test case 2: Validate display of users currently viewing the same planning space view', async () => {
		// NOTE: With a single browser session (Test_001 pattern), we cannot validate true real-time
		// multi-user presence at the same moment. This test validates that the presence UI is visible
		// and renders viewer avatars when the second user opens the same view.

		await TestUtil.signOutAndLoginToPlanningSpaceWithProcess(
			Testdata.REALM_NAME,
			process.env.FUNCTIONAL_TEST_USERNAME2 as string,
			process.env.FUNCTIONAL_TEST_PASSWORD as string,
			Testdata.PROCESS_NAME
		);
		await selectView(Testdata.VIEW_NAME);

		const avatarGroupDisplayed = await PlanningSpace.isLiveblocksAvatarGroupDisplayed();
		const avatarCount = await PlanningSpace.getLiveblocksAvatarCount();
		const labels = await PlanningSpace.getLiveblocksAvatarLabels();

		const bValidation1 = await CommonFunctions.compareTwoValues(
			avatarGroupDisplayed,
			true,
			`Avatar group displayed for user2: ${avatarGroupDisplayed}`
		);
		const bValidation2 = await CommonFunctions.compareTwoValues(
			avatarCount > 0,
			true,
			`Avatar count should be > 0 for user2, actual: ${avatarCount}`
		);
		const bValidation3 = await CommonFunctions.compareTwoValues(
			labels.some(l => (l || '').trim().length > 0),
			true,
			`At least one avatar should have aria-label for user2, labels: ${JSON.stringify(labels)}`
		);

		expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
	});
});

