import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { assertDestructiveRunAllowed } from '../../../util/destructive-guard.util';
import { getTimeout } from '../../../constants/timeouts';
import { cleanupAssumptionKpis, cleanupActionItemKpis, AlmCleanupContext } from '../../../util/alm-migration.util';

test.describe.serial('Data Setup Batch - Delete all assumption and action item KPI configurations', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let ctx: AlmCleanupContext;
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

  test('Test Case 1: Fetch and delete all assumption KPI configurations', async () => {
    test.setTimeout(getTimeout('TEST'));
    const validations = await cleanupAssumptionKpis('', ctx);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });

  test('Test Case 2: Fetch and delete all action item KPI configurations', async () => {
    test.setTimeout(getTimeout('TEST'));
    const validations = await cleanupActionItemKpis('', ctx);
    expect(validations.every((v: boolean) => v)).toBeTruthy();
  });
});
