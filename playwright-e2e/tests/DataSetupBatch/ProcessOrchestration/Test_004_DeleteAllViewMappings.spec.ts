import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { assertDestructiveRunAllowed } from '../../../util/destructive-guard.util';
import { getTimeout } from '../../../constants/timeouts';
import { cleanupEntityViewMaps, cleanupEntityViewProcedureMaps, AlmCleanupContext } from '../../../util/alm-migration.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/DataSetupBatch/ProcessOrchestration/Test_004_DeleteAllViewMappings.json');

test.describe.serial('Data Setup Batch - Delete all entity view and entity view procedure mappings', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let ctx: AlmCleanupContext;
  let exportedData: any;
  const targetBaseUrl = (process.env.API_BASE_URL_TARGET || process.env.API_BASE_URL) as string;

  test.beforeAll(async () => {
    assertDestructiveRunAllowed(['REALM_ID_TARGET', 'REALM_CLIENT_ID_TARGET']);
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();

    const accessToken = await apiUtil.getBearerToken(
      process.env.AUTH_URL as string,
      process.env.REALM_CLIENT_ID_TARGET as string,
      process.env.REALM_CLIENT_SECRET_TARGET as string,
      process.env.SCOPE as string,
      process.env.REALM_ID_TARGET as string
    );
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
    ctx = { apiUtil, commonFunctions, sourceHeaders: headers, targetHeaders: headers, targetBaseUrl };
  });

  test('Test Case 1: Fetch all entity view and entity view procedure mappings via exportData', async () => {
    const exportUrl = targetBaseUrl + (process.env.EXPORT_DATA as string);
    const response = await apiUtil.processAPIRequest('POST', exportUrl, TestData.EXPORT_PAYLOAD, headers, 'Export all entity view and procedure mappings', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Export mappings success status assertion');
    exportedData = response.data;
    const validation2 = await commonFunctions.compareTwoValues(exportedData !== null && typeof exportedData === 'object', true, 'Export mappings payload present assertion');

    const entityViewCount = (exportedData?.links?.entityViews || []).length;
    const entityViewProcedureCount = (exportedData?.links?.entityViewsProcedure || []).length;
    await commonFunctions.logMessage('INFO', `Fetched ${entityViewCount} entity view entries and ${entityViewProcedureCount} entity view procedure entries for deletion`);

    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 2: Clear all entity view mappings', async () => {
    test.setTimeout(getTimeout('TEST'));
    const validations = await cleanupEntityViewMaps(exportedData, '', ctx);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 3: Delete all entity view procedure mappings', async () => {
    test.setTimeout(getTimeout('TEST'));
    const validations = await cleanupEntityViewProcedureMaps(exportedData, '', ctx);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });
});
