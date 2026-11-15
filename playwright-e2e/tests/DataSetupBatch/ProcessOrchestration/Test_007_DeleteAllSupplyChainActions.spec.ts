import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { assertDestructiveRunAllowed } from '../../../util/destructive-guard.util';
import { getTimeout } from '../../../constants/timeouts';
import { cleanupSupplyChainActions, AlmCleanupContext } from '../../../util/alm-migration.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/DataSetupBatch/ProcessOrchestration/Test_007_DeleteAllSupplyChainActions.json');

test.describe.serial('Data Setup Batch - Delete all supply chain actions', () => {
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

  test('Test Case 1: Fetch all supply chain actions via exportData', async () => {
    const exportUrl = targetBaseUrl + (process.env.EXPORT_DATA as string);
    const response = await apiUtil.processAPIRequest('POST', exportUrl, TestData.EXPORT_PAYLOAD, headers, 'Export all supply chain actions', 'full');

    const validation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Export supply chain actions success status assertion');
    exportedData = response.data;
    const validation2 = await commonFunctions.compareTwoValues(exportedData !== null && typeof exportedData === 'object', true, 'Export supply chain actions payload present assertion');

    const scaCount = (exportedData?.supplyChainActions || []).length;
    await commonFunctions.logMessage('INFO', `Fetched ${scaCount} supply chain actions for deletion`);

    expect(validation1 && validation2).toBeTruthy();
  });

  test('Test Case 2: Delete all supply chain actions', async () => {
    test.setTimeout(getTimeout('TEST'));
    const validations = await cleanupSupplyChainActions(exportedData, '', ctx);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });
});
