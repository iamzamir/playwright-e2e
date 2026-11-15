import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { getRowFilterId, getRowUserId, isSqlConfigured, missingSqlEnvVars, queryViewFilterMapping } from '../../../util/db.util';
import { getUserBearerToken } from '../../../util/user-token.util';

let psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/LinkManagement/Test_011_AdminFilterManagement.json');

const isGraviteeGateway = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase() === 'GRAVITEE';
const useGraviteeData = isGraviteeGateway && !!TestData.gravitee;
// Gravitee hosts the same spec on a different realm, so entities/filters come from a dedicated data block.
const GatewayData = useGraviteeData ? TestData.gravitee : TestData;

type AdminFilterContext = {
  createRequest: {
    viewId: string;
    entityId: string;
    entityType: string;
    entityName: string;
    filterId: string;
    applyToAllUsers: boolean;
  };
  searchRequest: {
    viewIds: string[];
    entityId: string;
    entityType: string;
    entityName: string;
  };
  clearRequest: {
    viewIds: string[];
    entityId: string;
    entityType: string;
    applyToAllUsers: boolean;
    entityName: string;
  };
};

test.describe.serial('Admin Filter Management', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let presetUrl: string;
  let searchPresetUrl: string;
  let clearPresetUrl: string;
  let sqlReady: boolean;
  let defaultRealmKey: string | undefined;
  let defaultApiBaseUrl: string | undefined;
  let defaultAuthUrl: string | undefined;
  let defaultPortalUrl: string | undefined;

  const tenantId: string = GatewayData.tenantId || process.env.REALM_ID;

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    if (useGraviteeData && GatewayData.realmKey) {
      const realmKey: string = GatewayData.realmKey;
      const domainSuffix = process.env.GRAVITEE_DOMAIN_SUFFIX || 'interop.na.blueyonder.dev';
      defaultRealmKey = process.env.REALM_KEY;
      defaultApiBaseUrl = process.env.API_BASE_URL;
      defaultAuthUrl = process.env.AUTH_URL;
      defaultPortalUrl = process.env.LUMINATE_PORTAL_URL;
      process.env.REALM_KEY = realmKey;
      process.env.API_BASE_URL = `https://${realmKey}.api.${domainSuffix}/`;
      process.env.AUTH_URL = `https://${realmKey}.auth.${domainSuffix}/oauth/token`;
      process.env.LUMINATE_PORTAL_URL = `https://${realmKey}.portal.${domainSuffix}/`;
      await commonFunctions.logMessage('INFO', `Gravitee gateway: using REALM_KEY=${realmKey} API_BASE_URL=${process.env.API_BASE_URL} tenantId=${tenantId}`);
    }
    const accessToken = await getUserBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
    const linksBasePath = (process.env.VIEW_ENTITY_MAP as string).replace(/\/view-entity-map$/, '');
    const baseUrl = (process.env.API_BASE_URL as string) + linksBasePath;
    presetUrl = `${baseUrl}/preset`;
    searchPresetUrl = `${baseUrl}/search-preset`;
    clearPresetUrl = `${baseUrl}/preset/clear`;
    sqlReady = isSqlConfigured();
    if (!sqlReady) {
      await commonFunctions.logMessage('WARNING', `SQL env not set (${missingSqlEnvVars().join(', ')}); DB verification cases will be skipped`);
    }
  });

  test.afterAll(async () => {
    const processClear = await apiUtil.processAPIRequest('POST', clearPresetUrl, GatewayData.process.clearRequest, headers, 'Cleanup: Clear Process Admin Filter', 'full');
    await commonFunctions.logMessage('INFO', `Process admin filter cleanup completed with status: ${processClear.status}`);
    const subprocessClear = await apiUtil.processAPIRequest('POST', clearPresetUrl, GatewayData.subprocess.clearRequest, headers, 'Cleanup: Clear Subprocess Admin Filter', 'full');
    await commonFunctions.logMessage('INFO', `Subprocess admin filter cleanup completed with status: ${subprocessClear.status}`);
    if (useGraviteeData && GatewayData.realmKey) {
      process.env.REALM_KEY = defaultRealmKey;
      process.env.API_BASE_URL = defaultApiBaseUrl;
      process.env.AUTH_URL = defaultAuthUrl;
      process.env.LUMINATE_PORTAL_URL = defaultPortalUrl;
    }
  });

  const findMatchingPreset = (presets: any[], viewId: string, filterId: string) => {
    return presets.find((preset: any) => String(preset.viewId) === String(viewId) && String(preset.filterId).toLowerCase() === String(filterId).toLowerCase());
  };

  const hasPresetBody = (data: unknown): data is Record<string, unknown> => {
    return typeof data === 'object' && data !== null && !Array.isArray(data) && Object.keys(data).length > 0;
  };

  const assertPresetCreated = async (response: any, request: AdminFilterContext['createRequest'], label: string): Promise<boolean> => {
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 201, `${label} - Status Code Validation`);
    // Admin applyToAllUsers may return 201 with an empty body; contract fields are verified via search/DB.
    if (!hasPresetBody(response.data)) {
      await commonFunctions.logMessage('INFO', `${label} - create returned empty body; contract fields will be verified via search`);
      return bValidation1;
    }
    const bValidation2: boolean = await commonFunctions.compareTwoValues(!!response.data?.id, true, `${label} - Response id is present`);
    const bValidation3: boolean = await commonFunctions.compareTwoValues(typeof response.data?.id, 'string', `${label} - Response id is a string`);
    const bValidation4: boolean = await commonFunctions.compareTwoValues(response.data?.viewId, request.viewId, `${label} - viewId matches request`);
    const bValidation5: boolean = await commonFunctions.compareTwoValues(response.data?.filterId, request.filterId, `${label} - filterId matches request`, true);
    const bValidation6: boolean = await commonFunctions.compareTwoValues(response.data?.entityId, request.entityId, `${label} - entityId matches request`, true);
    const bValidation7: boolean = await commonFunctions.compareTwoValues(response.data?.entityType, request.entityType, `${label} - entityType matches request`);
    const bValidation8: boolean = await commonFunctions.compareTwoValues(!!response.data?.createdOn, true, `${label} - createdOn is present`);
    const bValidation9: boolean = await commonFunctions.compareTwoValues(!!response.data?.updatedOn, true, `${label} - updatedOn is present`);
    return bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7 && bValidation8 && bValidation9;
  };

  const toSearchPayload = (searchRequest: AdminFilterContext['searchRequest']) => ({
    viewIds: searchRequest.viewIds,
    entityId: searchRequest.entityId,
    entityType: searchRequest.entityType,
    entityName: searchRequest.entityName
  });

  const assertSearchHasFilter = async (response: any, viewId: string, filterId: string, label: string): Promise<boolean> => {
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, `${label} - Status Code Validation`);
    const bValidation2: boolean = await commonFunctions.compareTwoValues(Array.isArray(response.data?.presets), true, `${label} - presets is an array`);
    const presets = Array.isArray(response.data?.presets) ? response.data.presets : [];
    const matchingPreset = findMatchingPreset(presets, viewId, filterId);
    const bValidation3: boolean = await commonFunctions.compareTwoValues(!!matchingPreset, true, `${label} - matching preset found for viewId and filterId`);
    const bValidation4: boolean = matchingPreset
      ? await commonFunctions.compareTwoValues(typeof matchingPreset?.isGlobal, 'boolean', `${label} - isGlobal is a boolean`)
      : true;
    return bValidation1 && bValidation2 && bValidation3 && bValidation4;
  };

  const assertSearchMissingFilter = async (response: any, viewId: string, filterId: string, label: string): Promise<boolean> => {
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, `${label} - Status Code Validation`);
    const bValidation2: boolean = await commonFunctions.compareTwoValues(Array.isArray(response.data?.presets), true, `${label} - presets is an array`);
    const presets = Array.isArray(response.data?.presets) ? response.data.presets : [];
    const matchingPreset = findMatchingPreset(presets, viewId, filterId);
    const bValidation3: boolean = await commonFunctions.compareTwoValues(!!matchingPreset, false, `${label} - matching preset is not returned after admin clear`);
    return bValidation1 && bValidation2 && bValidation3;
  };

  const assertClearSucceeded = async (response: any, label: string): Promise<boolean> => {
    const bValidation1: boolean = await commonFunctions.compareTwoValues(response.status, 200, `${label} - Status Code Validation`);
    const clearBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? '');
    const bValidation2: boolean = clearBody.length === 0
      ? true
      : await commonFunctions.compareTwoValues(clearBody.toLowerCase().includes('deleted filters'), true, `${label} - response indicates filters were deleted`);
    return bValidation1 && bValidation2;
  };

  const assertDbFilterApplied = async (context: AdminFilterContext, label: string): Promise<boolean> => {
    const rows = await queryViewFilterMapping({
      tenantId,
      entityId: context.createRequest.entityId,
      entityType: context.createRequest.entityType,
      viewId: context.createRequest.viewId
    });
    const expectedFilterId = String(context.createRequest.filterId).toLowerCase();
    const bValidation1: boolean = await commonFunctions.compareTwoValues(rows.length > 0, true, `${label} - at least one DB row exists`);
    const mismatched = rows.filter((row) => getRowFilterId(row).toLowerCase() !== expectedFilterId);
    const bValidation2: boolean = await commonFunctions.compareTwoValues(mismatched.length, 0, `${label} - every DB row has the admin filterId`);
    const userIds = new Set(rows.map((row) => getRowUserId(row)).filter(Boolean));
    await commonFunctions.logMessage('INFO', `${label} - distinct user_id count: ${userIds.size}`);
    return bValidation1 && bValidation2;
  };

  const assertDbFilterCleared = async (context: AdminFilterContext, label: string): Promise<boolean> => {
    const rows = await queryViewFilterMapping({
      tenantId,
      entityId: context.createRequest.entityId,
      entityType: context.createRequest.entityType,
      viewId: context.createRequest.viewId
    });
    return commonFunctions.compareTwoValues(rows.length, 0, `${label} - no DB rows remain after admin clear`);
  };

  const registerContextFlow = (contextKey: 'process' | 'subprocess', contextLabel: string) => {
    const context: AdminFilterContext = GatewayData[contextKey];

    test.describe.serial(`${contextLabel} Context`, () => {
      test(`Test Case 1: Set Admin Filter for ${contextLabel}`, async () => {
        const response = await apiUtil.processAPIRequest('POST', presetUrl, context.createRequest, headers, `${contextLabel}: Set Admin Filter`, 'full');
        expect(await assertPresetCreated(response, context.createRequest, `${contextLabel} Set Admin Filter`)).toBeTruthy();
      });

      test(`Test Case 2: Verify via Search for current user - ${contextLabel}`, async () => {
        const response = await apiUtil.processAPIRequest('POST', searchPresetUrl, toSearchPayload(context.searchRequest), headers, `${contextLabel}: Search Admin Filter`, 'full');
        expect(await assertSearchHasFilter(response, context.createRequest.viewId, context.createRequest.filterId, `${contextLabel} Search Admin Filter`)).toBeTruthy();
      });

      test(`Test Case 3: Verify via DB records from all users - ${contextLabel}`, async () => {
        test.skip(!sqlReady, `SQL env not set (${missingSqlEnvVars().join(', ')})`);
        expect(await assertDbFilterApplied(context, `${contextLabel} DB after set`)).toBeTruthy();
      });

      test(`Test Case 4: Clear Filter via Admin for ${contextLabel}`, async () => {
        const response = await apiUtil.processAPIRequest('POST', clearPresetUrl, context.clearRequest, headers, `${contextLabel}: Clear Admin Filter`, 'full');
        expect(await assertClearSucceeded(response, `${contextLabel} Clear Admin Filter`)).toBeTruthy();
      });

      test(`Test Case 5: Verify via Search for current user after clear - ${contextLabel}`, async () => {
        const response = await apiUtil.processAPIRequest('POST', searchPresetUrl, context.searchRequest, headers, `${contextLabel}: Search Admin Filter After Clear`, 'full');
        expect(await assertSearchMissingFilter(response, context.createRequest.viewId, context.createRequest.filterId, `${contextLabel} Search After Clear`)).toBeTruthy();
      });

      test(`Test Case 6: Verify via DB records from all users after clear - ${contextLabel}`, async () => {
        test.skip(!sqlReady, `SQL env not set (${missingSqlEnvVars().join(', ')})`);
        expect(await assertDbFilterCleared(context, `${contextLabel} DB after clear`)).toBeTruthy();
      });
    });
  };

  registerContextFlow('process', 'Process');
  registerContextFlow('subprocess', 'Subprocess');
});
