import { test, expect } from '../../../configs/fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { MappingUtil, buildLinksUrl } from '../../../util/mapping.util';
import { getUserBearerToken } from '../../../util/user-token.util';
import { getConfig } from '../../../configs/env';

/**
 * ABP-19571: when the saved view type is Favourites and a favourite points at a view that no longer exists,
 * Planning Space used to stay on "Setting up your page" (planning-mfe called onViewSelect(undefined)).
 * The stale favourite is created through the real links API with a viewId that is not in the dashboards
 * catalogue, inside a real view group, so the favourite's container still matches but holds no view.
 */
test.describe.serial('Stale favourite falls back to All Views', () => {
  const apiUtil = new ApiUtil();
  const mappingUtil = new MappingUtil(apiUtil, new CommonFunctions());
  const apiBaseUrl = (process.env.API_BASE_URL as string).replace(/\/+$/, '');
  const dashboardsBaseUrl = `${apiBaseUrl}/lui/dashboard/v3/solutionAreas/planningsolutionarea/containers`;
  const pageErrors: string[] = [];
  let headers: Record<string, string>;
  let userHeaders: Record<string, string>;
  let linkEntityId: string;

  // planning-mfe saves the view type under this key (TabPanelContent `getApplicationId`); restoring it by API keeps teardown independent of the page state.
  const restoreAllViewsPreference = async (processName: string): Promise<number> => {
    const psNamespace = (getConfig().links.PSLINK as string).replace(/\/+$/, '');
    const body = {
      applicationId: `plan.sop.lui.${psNamespace}.${processName}.selectedDDOption`,
      preferences: { selectedDDOption: { displayName: 'All Views', id: 'all', dataTestId: 'plan-sop-process-details-all-views', key: 'all' } }
    };
    const response = await apiUtil.processAPIRequest('POST', `${apiBaseUrl}/lui/uiConfiguration/v1/userPreferences`, body, userHeaders, 'Restore All Views as the saved view type', 'full');
    return Number(response.status);
  };

  // The favourite must sit in a view group that holds one of the process's views, so resolve it from the live mapping.
  const resolveContainerOfMappedView = async (processName: string, staleViewId: string): Promise<string> => {
    const mappingResponse = await apiUtil.processAPIRequest('POST', buildLinksUrl('view-entity-map/search'), { entityId: [processName], entityType: 'subprocess' }, headers, 'Search views mapped to the process', 'full');
    const mappedViewIds = new Set<string>((mappingResponse.data?.views?.[0]?.views ?? []).map((view: any) => view.id));
    const containersResponse = await apiUtil.processAPIRequest('GET', `${dashboardsBaseUrl}?includeCardGalleryId=false`, null, headers, 'Get view groups', 'full');
    const containerIds = (Array.isArray(containersResponse.data) ? containersResponse.data : []).map((container: any) => container.id);
    const dashboardsResponse = await apiUtil.processAPIRequest('POST', `${dashboardsBaseUrl}/dashboards/list`, { containerIds }, headers, 'Get views per view group', 'full');
    const viewGroups = Array.isArray(dashboardsResponse.data) ? dashboardsResponse.data : [];
    const catalogueViewIds = viewGroups.flatMap((item: any) => (item.dashboards ?? []).map((dashboard: any) => dashboard.viewId));
    expect(catalogueViewIds, 'Stale favourite viewId is not a real view').not.toContain(staleViewId);
    const container = viewGroups.find((item: any) =>
      (item.dashboards ?? []).some((dashboard: any) => mappedViewIds.has(dashboard.viewId))
    );
    if (!container) {
      throw new Error(`No view group holds a view mapped to process ${processName}`);
    }
    return container.containerId;
  };

  test.beforeAll(async ({ testData }) => {
    headers = { accept: 'application/json', Authorization: 'Bearer ' + (await apiUtil.getBearerToken()) };
    // Favourites are per user, so they are created with the token of the user who logs in to Planning Space.
    userHeaders = { accept: 'application/json', Authorization: 'Bearer ' + (await getUserBearerToken()) };
    const processPath = (process.env.GET_PROCESS_WITH_NAME as string).replace(/^\/+|\/+$/g, '');
    const processResponse = await apiUtil.processAPIRequest('GET', `${apiBaseUrl}/${processPath}/${encodeURIComponent(testData.PROCESS_NAME)}`, null, headers, 'Get process', 'full');
    linkEntityId = processResponse.data?.linkEntityId;
    expect(linkEntityId, 'Process linkEntityId').toBeTruthy();

    // Start from All Views and no stale favourite, in case an earlier run was interrupted before its teardown.
    const restoreStatus = await restoreAllViewsPreference(testData.PROCESS_NAME);
    expect(restoreStatus, 'Restore All Views preference status').toBeGreaterThanOrEqual(200);
    expect(restoreStatus, 'Restore All Views preference status').toBeLessThan(300);
    await mappingUtil.purgeFavourites([testData.STALE_FAVOURITE.viewId], userHeaders, linkEntityId);
    const favouritesResponse = await mappingUtil.getFavourites(userHeaders, linkEntityId);
    expect(Number(favouritesResponse.status), 'Get favourites after purge').toBe(200);
    const leftoverFavourites = (favouritesResponse.data?.views ?? []).filter((view: any) => view.viewId === testData.STALE_FAVOURITE.viewId);
    expect(leftoverFavourites, 'Stale favourite purged before setup').toHaveLength(0);
    const containerId = await resolveContainerOfMappedView(testData.PROCESS_NAME, testData.STALE_FAVOURITE.viewId);
    const createResponse = await mappingUtil.createFavourite({ ...testData.STALE_FAVOURITE, containerId, isActive: true, isScopeEnabled: false }, userHeaders, linkEntityId);
    expect([200, 201]).toContain(Number(createResponse.status));
  });

  test.afterAll(async ({ testData }) => {
    if (!userHeaders) {
      return;
    }
    await restoreAllViewsPreference(testData.PROCESS_NAME);
    if (linkEntityId) {
      await mappingUtil.purgeFavourites([testData.STALE_FAVOURITE.viewId], userHeaders, linkEntityId);
    }
  });

  test('Test Case 1: Save Favourites as the view type while a stale favourite exists', async ({ testUtil, planningPage, commonFunctions, testData }) => {
    await testUtil.loginToPlanningSpaceWithProcess(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );
    await planningPage.waitForViewToBeDisplayed();
    await planningPage.clickViewDropdown();
    const validation = await commonFunctions.compareTwoValues(await planningPage.switchViewTypeAndWaitForSave('Favourites'), true, 'Favourites is saved as the view type');
    expect(validation).toBeTruthy();
  });

  test('Test Case 2: Reload falls back to All Views instead of staying on the loader', async ({ page, testUtil, planningPage, commonFunctions, testData }) => {
    page.on('pageerror', (error) => pageErrors.push(error.message));
    // Throws "Planning Space stuck on the "Setting up your page" loader" if no view gets selected.
    await testUtil.navigateToPlanningSpaceWithProcess(testData.PROCESS_NAME);

    const validations = [
      await commonFunctions.compareTwoValues(await planningPage.isPlanningSpaceLoaderHidden(), true, 'Setting up your page loader is hidden'),
      await commonFunctions.compareTwoValues(await planningPage.isViewTypeSelected('All Views'), true, 'View type falls back to All Views'),
      await commonFunctions.compareTwoValues(pageErrors.filter((message) => message.includes("reading 'name'")).length, 0, 'No view-selection page error')
    ];
    expect(validations.every(Boolean)).toBeTruthy();
  });
});
