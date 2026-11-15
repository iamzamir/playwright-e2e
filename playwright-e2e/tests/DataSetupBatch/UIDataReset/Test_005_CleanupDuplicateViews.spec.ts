import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { deleteViewById, deleteViewGroupById } from '../../../util/dashboard.util';
import { applyGatewayOverrides, applyRealmKeyOverride } from '../../../util/gateway.util';

const testDataPath = 'testdata/' + process.env.PSENV + '/DataSetupBatch/UIDataReset/Test_005_CleanupDuplicateViews.json';
const TestData = applyGatewayOverrides(require('../../../' + testDataPath), testDataPath);

test.describe.serial('Cleanup Duplicate Views', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let apiBaseUrl: string;
  let restoreRealmKey: () => void = () => {};

  const TARGET_VIEW_NAMES: string[] = [
    'duplicate view automation assumption - Copy',
    'duplicate view automation subprocess - Copy',
    'duplicate view automation - Copy',
    'copy of duplicate view automation',
    'View Name Test'
  ];

  const TARGET_VIEW_PATTERNS: RegExp[] = [
    /^View\s+\d+$/i
  ];

  const TARGET_CONTAINER_PREFIX = 'View Group';

  test.beforeAll(async () => {
    // API fixtures have no realm-key override, so pin the Gravitee tenant here before reading the URLs and token.
    restoreRealmKey = applyRealmKeyOverride(TestData.REALM_KEY);
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();

    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };

    apiBaseUrl = (process.env.API_BASE_URL || 'https://api-tst.jdadelivers.com/').replace(/\/+$/, '');
  });

  test.afterAll(() => restoreRealmKey());

  const cleanupViewsByFilter = async (
    filterFn: (viewName: string) => boolean,
    logFilterDescription: string,
    dryRun: boolean = false
  ): Promise<void> => {
    const matchingViews: { id: string; name: string }[] = [];
    const seenViewIds = new Set<string>();

    const fetchMatchingViewsFromPage = async (pageNumber: number): Promise<number> => {
      const getViewsUrl = `${apiBaseUrl}/lui/uiRegistration/v1/views?pageNumber=${pageNumber}&pageSize=200&sortOrder=asc&namespace=planningsolutionarea`;
      const response = await apiUtil.processAPIRequest('GET', getViewsUrl, null, headers, `Fetching views with pageNumber=${pageNumber}`, 'full');
      const validation = await commonFunctions.compareTwoValues(response.status, 200, `Get views pageNumber=${pageNumber} success assertion`);
      expect(validation).toBeTruthy();

      const views: any[] = response.data?.views || [];
      for (const view of views) {
        const viewName = String(view?.name || '');
        if (view?.id && !seenViewIds.has(view.id) && filterFn(viewName)) {
          seenViewIds.add(view.id);
          matchingViews.push({ id: view.id, name: viewName });
        }
      }

      return Number(response.data?.page?.totalPages || 1);
    };

    // Fetch initial page (pageNumber=0 as requested)
    const totalPages = await fetchMatchingViewsFromPage(0);

    // Fetch remaining pages if any
    for (let page = 2; page <= totalPages; page++) {
      await fetchMatchingViewsFromPage(page);
    }

    await commonFunctions.logMessage('INFO', `Total views matching ${logFilterDescription} found for cleanup: ${matchingViews.length}`);

    // Print all matching view names before deletion so they can be reviewed/verified
    if (matchingViews.length > 0) {
      console.log(`\n================ Matching Views (${matchingViews.length}) for ${logFilterDescription} ================`);
      matchingViews.forEach((view, index) => {
        console.log(`  ${index + 1}. Name: "${view.name}" | ID: ${view.id}`);
      });
      console.log('========================================================================================\n');

      const viewListStr = matchingViews.map((v, i) => `  ${i + 1}. "${v.name}" (id: ${v.id})`).join('\n');
      await commonFunctions.logMessage('INFO', `Matching views list before delete:\n${viewListStr}`);
    }

    if (dryRun) {
      console.log(`[DRY RUN] Verification mode enabled. Skipping deletion of ${matchingViews.length} views.\n`);
      await commonFunctions.logMessage('INFO', `[DRY RUN] Verification mode enabled. Skipping deletion of ${matchingViews.length} views.`);
      return;
    }

    let hardDeleteFailures = 0;

    for (const view of matchingViews) {
      const deleteResponse = await deleteViewById(view.id, headers, `Delete view: ${view.name} (id: ${view.id})`);

      const numericStatus = Number(deleteResponse.status);
      const isDeleted = [200, 204, 404].includes(numericStatus);
      const validation = await commonFunctions.compareTwoValues(isDeleted, true, `Delete view ${view.name} (id: ${view.id}) status assertion`);

      if (!validation) {
        hardDeleteFailures++;
        await commonFunctions.logMessage('FAIL', `Failed to delete view ${view.name} (id: ${view.id}), status: ${deleteResponse.status}`);
      }
    }

    expect(hardDeleteFailures).toBe(0);
  };

  const cleanupContainersByPrefix = async (namePrefix: string): Promise<void> => {
    const getContainersUrl = `${apiBaseUrl}/lui/dashboard/v3/solutionAreas/planningsolutionarea/containers?includeCardGalleryId=false`;
    const listResponse = await apiUtil.processAPIRequest('GET', getContainersUrl, null, headers, 'Fetching containers for cleanup', 'full');
    const listValidation = await commonFunctions.compareTwoValues(listResponse.status, 200, 'Get containers success assertion');
    expect(listValidation).toBeTruthy();

    const extractContainerList = (payload: any): any[] => {
      if (Array.isArray(payload)) {
        return payload;
      }
      if (!payload || typeof payload !== 'object') {
        return [];
      }

      const candidateKeys = ['containers', 'items', 'content', 'results', 'result', 'viewGroups', 'data'];
      for (const key of candidateKeys) {
        if (Array.isArray(payload[key])) {
          return payload[key];
        }
      }

      if (payload.data && typeof payload.data === 'object') {
        if (Array.isArray(payload.data)) {
          return payload.data;
        }
        for (const key of candidateKeys) {
          if (Array.isArray(payload.data[key])) {
            return payload.data[key];
          }
        }
        const nestedValues = Object.values(payload.data);
        if (nestedValues.length > 0 && nestedValues.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
          return nestedValues;
        }
      }

      const topLevelValues = Object.values(payload);
      if (topLevelValues.length > 0 && topLevelValues.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
        return topLevelValues;
      }

      return [];
    };

    const getContainerName = (container: any): string => {
      return String(container?.displayName || container?.name || container?.title || container?.containerName || '').trim();
    };

    const getContainerId = (container: any): string => {
      return String(container?.id || container?.containerId || container?._id || '').trim();
    };

    const containers: any[] = extractContainerList(listResponse.data);
    const matchingContainers = containers.filter((container: any) => {
      return getContainerName(container).toLowerCase().startsWith(namePrefix.toLowerCase());
    });

    await commonFunctions.logMessage('INFO', `Total containers fetched: ${containers.length}`);
    await commonFunctions.logMessage('INFO', `Total containers matching ${namePrefix} found for cleanup: ${matchingContainers.length}`);

    if (matchingContainers.length === 0 && containers.length > 0) {
      const sampleNames = containers.slice(0, 10).map((container: any) => getContainerName(container) || '<blank>').join(', ');
      await commonFunctions.logMessage('INFO', `Sample container names from GET response: ${sampleNames}`);
    }

    if (matchingContainers.length > 0) {
      matchingContainers.forEach((container: any, index: number) => {
        console.log(`  ${index + 1}. Name: "${getContainerName(container)}" | ID: ${getContainerId(container)}`);
      });
    }

    let hardDeleteFailures = 0;
    for (const container of matchingContainers) {
      const containerName = getContainerName(container);
      const containerId = getContainerId(container);
      if (!containerId) {
        hardDeleteFailures++;
        await commonFunctions.logMessage('FAIL', `Cannot delete container without an ID: ${containerName || '<unnamed>'}`);
        continue;
      }

      const deleteResponse = await deleteViewGroupById(containerId, headers, `Delete container: ${containerName} (id: ${containerId})`);
      const numericStatus = Number(deleteResponse.status);
      const isDeleted = [200, 204, 404].includes(numericStatus);
      const validation = await commonFunctions.compareTwoValues(isDeleted, true, `Delete container ${containerName} (id: ${containerId}) status assertion`);

      if (!validation) {
        hardDeleteFailures++;
        await commonFunctions.logMessage('FAIL', `Failed to delete container ${containerName} (id: ${containerId}), status: ${deleteResponse.status}`);
      }
    }

    expect(hardDeleteFailures).toBe(0);
  };

  test('Test Case 1: Cleanup views matching target view names', async () => {
    await cleanupViewsByFilter(
      (viewName) => TARGET_VIEW_NAMES.some((target) => target && viewName.includes(target)),
      `[${TARGET_VIEW_NAMES.join(', ')}]`
    );
  });

  test('Test Case 2: Cleanup views matching pattern (e.g. View <number>)', async () => {
    await cleanupViewsByFilter(
      (viewName) => TARGET_VIEW_PATTERNS.some((pattern) => pattern.test(viewName.trim())),
      `patterns [${TARGET_VIEW_PATTERNS.map((p) => p.toString()).join(', ')}]`,
      false
      // Pass `true` as the 3rd argument to only print/verify without deleting (dry run)
    );
  });

  test('Test Case 3: Delete containers starting with View Group Test', async () => {
    await cleanupContainersByPrefix(TARGET_CONTAINER_PREFIX);
  });
});
