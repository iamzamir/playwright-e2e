import { uniqueName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { getTimeout } from '../../../constants/timeouts';
import { pollUntil, downloadZipBuffer, extractPoJson, getProcessNames, getCalendarNames, getSupplyChainActionNames, getEntityViewKeys, getEntityViewProcedureKeys, getActionItemKeys, getAssumptionKeys, assertSubset, assertAbsent, cleanupGroupContent, deleteAlmResource, SHARED_CALENDARS } from '../../../util/alm-migration.util';

const TestData = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/Migration/Test_009_ALMDeployResourceMigration.json');

const sourceRealm = process.env.REALM_NAME_SOURCE || '';
const targetRealm = process.env.REALM_NAME_TARGET || '';
const isGraviteeGateway = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase() === 'GRAVITEE';
const sourceRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_SOURCE || process.env.REALM_KEY || sourceRealm)
  : sourceRealm;
const targetRealmTitle = isGraviteeGateway
  ? (process.env.REALM_KEY_TARGET || process.env.REALM_KEY || targetRealm)
  : targetRealm;
const sourceRealmId = process.env.REALM_ID_SOURCE || '';
const targetRealmId = process.env.REALM_ID_TARGET || '';
const sourceMachineClientId = process.env.REALM_CLIENT_ID_SOURCE || '';
const targetMachineClientId = process.env.REALM_CLIENT_ID_TARGET || '';
const sourceMachineClientSecret = process.env.REALM_CLIENT_SECRET_SOURCE || '';
const targetMachineClientSecret = process.env.REALM_CLIENT_SECRET_TARGET || '';

// Gravitee scopes each realm by hostname, so source and target may use distinct API and auth
// hosts. These fall back to the single API_BASE_URL/AUTH_URL for non-Gravitee environments.
const sourceBaseUrl = (process.env.API_BASE_URL_SOURCE || process.env.API_BASE_URL) as string;
const targetBaseUrl = (process.env.API_BASE_URL_TARGET || process.env.API_BASE_URL) as string;
const sourceAuthUrl = process.env.AUTH_URL_SOURCE || process.env.AUTH_URL;
const targetAuthUrl = process.env.AUTH_URL_TARGET || process.env.AUTH_URL;

const now = new Date();
const dateStamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
const PROCESS_PUBLISH_LIMIT = 3;

type PublishedResourceReference = {
  resourceId: string;
  resourceVersion: string;
  source: 'structured' | 'message';
};

test.describe.serial(`ALM Deploy Resource Migration from ${sourceRealmTitle} to ${targetRealmTitle}`, () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let headersForTarget: Record<string, string>;

  let resourceId = '';
  let resourceVersion: string = TestData.DEPLOY_PAYLOAD.resourceVersion;
  let deploymentId = '';
  let jobStatusPath = '';
  let resourceName = '';
  let poJson: any;
  let targetExport: any;
  let scopedPayload: any;
  let cleanupCompleted = false;

  const isStatus = (status: unknown, code: number): boolean => commonFunctions.isStatus(status, code);
  const isSuccessStatus = (status: unknown): boolean => commonFunctions.isSuccessStatus(status);

  function getPublishedResourceReference(responseData: any): PublishedResourceReference | undefined {
    const structuredCandidates = [
      { resourceId: responseData?.resourceId, resourceVersion: responseData?.resourceVersion || responseData?.version },
      { resourceId: responseData?.resource?.id || responseData?.resource?.resourceId, resourceVersion: responseData?.resource?.version || responseData?.resource?.resourceVersion },
      { resourceId: responseData?.result?.resourceId, resourceVersion: responseData?.result?.resourceVersion || responseData?.result?.version }
    ];
    const structured = structuredCandidates.find((candidate) => typeof candidate.resourceId === 'string' && typeof candidate.resourceVersion === 'string');
    if (structured) {
      return { resourceId: structured.resourceId, resourceVersion: structured.resourceVersion, source: 'structured' };
    }

    const messageMatch = /resource:\s*([0-9a-fA-F-]+)\s+version:\s*([\d.]+)/.exec(String(responseData?.message || ''));
    if (messageMatch) {
      return { resourceId: messageMatch[1], resourceVersion: messageMatch[2], source: 'message' };
    }
    return undefined;
  }

  function extractProcessNames(listResponse: any): string[] {
    const entities = Array.isArray(listResponse.data)
      ? listResponse.data
      : listResponse.data?.data?.entities || listResponse.data?.entities || [];
    const names: string[] = [];
    for (const entity of entities) {
      const name = entity?.name;
      if (typeof name === 'string' && name.trim().length > 0 && !names.includes(name)) {
        names.push(name);
      }
    }
    return names;
  }

  test.beforeAll(async ({ }, testInfo) => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    const attemptSuffix = testInfo.retry > 0 ? `r${testInfo.retry}` : '';
    resourceName = uniqueName(`${TestData.RESOURCE_NAME_PREFIX}${dateStamp}`);
    headers = await apiUtil.buildAuthHeaders(sourceMachineClientId, sourceMachineClientSecret, sourceRealmId, sourceAuthUrl);
    headersForTarget = await apiUtil.buildAuthHeaders(targetMachineClientId, targetMachineClientSecret, targetRealmId, targetAuthUrl);
  });

  async function capturePoJson(baseUrl: string, requestHeaders: Record<string, string>): Promise<Buffer> {
    const downloadUrl = baseUrl + (process.env.ALM_DOWNLOAD_ZIP as string).replace('{resourceId}', resourceId) + '?version=' + resourceVersion;
    const zipBuffer = await downloadZipBuffer(downloadUrl, requestHeaders, commonFunctions);
    poJson = extractPoJson(zipBuffer);
    await commonFunctions.logMessage('INFO', `Extracted po.json in memory for cleanup and migration validation (${getProcessNames(poJson).length} processes, ${zipBuffer.length} bytes)`);
    return zipBuffer;
  }

  async function runCleanup(): Promise<boolean[]> {
    const cleanupValidations: boolean[] = [];
    const ctx = { apiUtil, commonFunctions, sourceHeaders: headers, targetHeaders: headersForTarget, sourceBaseUrl, targetBaseUrl };

    if (poJson) {
      cleanupValidations.push(...await cleanupGroupContent(poJson, '', ctx));
    } else {
      await commonFunctions.logMessage('WARN', '[cleanup] po.json not captured - skipping migrated content cleanup');
    }

    if (resourceId) {
      cleanupValidations.push(await deleteAlmResource(resourceId, '', ctx));
    }

    return cleanupValidations;
  }

  test.afterAll(async () => {
    test.setTimeout(getTimeout('EXTENDED'));
    if (cleanupCompleted) {
      return;
    }
    if (!poJson && !resourceId) {
      return;
    }
    await commonFunctions.logMessage('INFO', '[afterAll] Cleanup test did not complete - cleaning migrated data and the ALM resource');
    let cleanupSuccessful = false;
    try {
      const cleanupValidations = await runCleanup();
      cleanupSuccessful = cleanupValidations.length > 0 && cleanupValidations.every(Boolean);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await commonFunctions.logMessage('ERROR', `[afterAll] Cleanup encountered an error: ${message}`);
    }
    expect(cleanupSuccessful, 'ALM migration afterAll cleanup should succeed').toBeTruthy();
  });

  test(`Test Case 1: Publish PO resource in source realm ${sourceRealmTitle}`, async () => {
    const getProcessListUrl = sourceBaseUrl + (process.env.GET_PROCESS_WITH_NAME as string) + '?pageNumber=0&pageSize=500';
    const listResponse = await apiUtil.processAPIRequest('GET', getProcessListUrl, null, headers, 'Get source realm processes', 'full');
    const listStatusValidation = await commonFunctions.compareTwoValues(isStatus(listResponse.status, 200), true, 'Get source realm processes success status assertion');

    const processNames = extractProcessNames(listResponse).slice(0, PROCESS_PUBLISH_LIMIT);
    await commonFunctions.logMessage('INFO', `Source realm processes selected for publish: ${processNames.join(', ')}`);
    const processCountValidation = await commonFunctions.compareTwoValues(processNames.length, PROCESS_PUBLISH_LIMIT, `Source realm has ${PROCESS_PUBLISH_LIMIT} processes to publish assertion`);

    scopedPayload = { ...TestData.PUBLISH_PAYLOAD, processes: processNames };
    const publishUrl = sourceBaseUrl + (process.env.EXCHANGE_PUBLISH as string) + '?name=' + resourceName;
    await commonFunctions.logMessage('INFO', `Publishing PO resource with name '${resourceName}' for ${processNames.length} processes`);
    const response = await apiUtil.processAPIRequest('POST', publishUrl, scopedPayload, headers, 'Publish PO resource', 'full');

    const validation1 = await commonFunctions.compareTwoValues(isSuccessStatus(response.status), true, 'Publish PO resource success status assertion');
    const validation2 = await commonFunctions.compareTwoValues(typeof response.data?.statusUrl, 'string', 'Publish PO resource statusUrl present assertion');
    if (typeof response.data?.statusUrl === 'string') {
      jobStatusPath = response.data.statusUrl;
      await commonFunctions.logMessage('INFO', `Captured job statusUrl=${jobStatusPath}`);
    }
    expect(listStatusValidation && processCountValidation && validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 2: Poll job status until COMPLETED in source realm ${sourceRealmTitle}`, async () => {
    test.setTimeout(getTimeout('TEST'));
    expect(jobStatusPath, 'job statusUrl captured from publish').not.toBe('');
    const statusUrl = sourceBaseUrl + (process.env.PO_JOB_STATUS_BASE as string) + jobStatusPath;
    const finalResponse = await pollUntil(
      () => apiUtil.processAPIRequest('GET', statusUrl, null, headers, 'Get job status', 'full'),
      (response) => isStatus(response.status, 200) && ['COMPLETED', 'FAILED'].includes(String(response.data?.status).toUpperCase()),
      'PO job status',
      commonFunctions
    );

    const validation1 = await commonFunctions.compareTwoValues(isStatus(finalResponse.status, 200), true, 'Get job status success status assertion');
    const validation2 = await commonFunctions.compareTwoValues(String(finalResponse.data?.status).toUpperCase(), 'COMPLETED', 'Job status COMPLETED assertion');

    const publishedResource = getPublishedResourceReference(finalResponse.data);
    const validation3 = await commonFunctions.compareTwoValues(publishedResource !== undefined, true, 'Job status exposes resource id and version assertion');
    if (publishedResource) {
      resourceId = publishedResource.resourceId;
      resourceVersion = publishedResource.resourceVersion;
      await commonFunctions.logMessage('INFO', `Captured resourceId=${resourceId}, version=${resourceVersion} from ${publishedResource.source} fields`);
    }

    // Capture po.json from the published source resource so afterAll can clean
    // target orphans even when later deploy/status cases fail and skip TC5.
    let zipBuffer: Buffer | undefined;
    if (resourceId) {
      zipBuffer = await capturePoJson(sourceBaseUrl, headers);
    }
    const validation4 = await commonFunctions.compareTwoValues(Boolean(zipBuffer && zipBuffer.length > 0), true, 'Published resource ZIP is non-empty assertion');
    const validation5 = await commonFunctions.compareTwoValues(poJson !== null && typeof poJson === 'object', true, 'po.json parsed to object assertion');
    expect(validation1 && validation2 && validation3 && validation4 && validation5).toBeTruthy();
  });

  test(`Test Case 3: Deploy resource to target realm ${targetRealmTitle}`, async () => {
    expect(resourceId, 'resourceId captured from job status').not.toBe('');
    const deployUrl = targetBaseUrl + (process.env.ALM_DEPLOY_RESOURCE as string).replace('{resourceId}', resourceId);
    const deployPayload = { ...TestData.DEPLOY_PAYLOAD, resourceVersion };
    const response = await apiUtil.processAPIRequest('POST', deployUrl, deployPayload, headersForTarget, 'Deploy resource to target realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(isSuccessStatus(response.status), true, 'Deploy resource success status assertion');
    const validation2 = await commonFunctions.compareTwoValues(typeof response.data?.id, 'string', 'Deployment id present assertion');
    if (typeof response.data?.id === 'string') {
      deploymentId = response.data.id;
      await commonFunctions.logMessage('INFO', `Captured deploymentId=${deploymentId}`);
    }
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 4: Poll deployment status until success in target realm ${targetRealmTitle}`, async () => {
    test.setTimeout(getTimeout('EXTENDED'));
    expect(deploymentId, 'deploymentId captured from deploy').not.toBe('');
    const deploymentStatusUrl = targetBaseUrl + (process.env.ALM_DEPLOYMENT_STATUS as string).replace('{deploymentId}', deploymentId);
    const finalResponse = await pollUntil(
      () => apiUtil.processAPIRequest('GET', deploymentStatusUrl, null, headersForTarget, 'Get deployment status', 'full'),
      (response) => isStatus(response.status, 200) && ['success', 'failure', 'failed', 'error'].includes(String(response.data?.status).toLowerCase()),
      'ALM deployment status',
      commonFunctions
    );

    const validation1 = await commonFunctions.compareTwoValues(isStatus(finalResponse.status, 200), true, 'Get deployment status success status assertion');
    const deploymentReason = finalResponse.data?.reason ? `; reason: ${finalResponse.data.reason}` : '';
    const validation2 = await commonFunctions.compareTwoValues(String(finalResponse.data?.status).toLowerCase(), 'success', `Deployment status success assertion${deploymentReason}`);
    const validation3 = await commonFunctions.compareTwoValues(finalResponse.data?.resourceId, resourceId, 'Deployment resourceId matches assertion');
    expect(validation1 && validation2 && validation3).toBeTruthy();
  });

  test(`Test Case 5: Download and extract deployed resource ZIP (po.json)`, async () => {
    expect(resourceId, 'resourceId captured from job status').not.toBe('');
    const zipBuffer = await capturePoJson(targetBaseUrl, headersForTarget);
    const validation1 = await commonFunctions.compareTwoValues(zipBuffer.length > 0, true, 'Downloaded ZIP is non-empty assertion');
    const validation2 = await commonFunctions.compareTwoValues(poJson !== null && typeof poJson === 'object', true, 'po.json parsed to object assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 6: Export data from target realm ${targetRealmTitle}`, async () => {
    const exportUrl = targetBaseUrl + (process.env.EXPORT_DATA as string);
    const exportPayload = scopedPayload || TestData.EXPORT_PAYLOAD;
    const response = await apiUtil.processAPIRequest('POST', exportUrl, exportPayload, headersForTarget, 'Export data from target realm', 'full');

    const validation1 = await commonFunctions.compareTwoValues(isStatus(response.status, 200), true, 'Target realm export success status assertion');
    targetExport = response.data;
    const validation2 = await commonFunctions.compareTwoValues(targetExport !== null && typeof targetExport === 'object', true, 'Target realm export payload present assertion');
    expect(validation1 && validation2).toBeTruthy();
  });

  test(`Test Case 7: Validate po.json content migrated into target realm export`, async () => {
    const processValidation = await assertSubset(getProcessNames(poJson), getProcessNames(targetExport), 'Process migration validation', commonFunctions);
    const calendarValidation = await assertSubset(getCalendarNames(poJson), getCalendarNames(targetExport), 'Calendar migration validation', commonFunctions);
    const scaValidation = await assertSubset(getSupplyChainActionNames(poJson), getSupplyChainActionNames(targetExport), 'Supply chain action migration validation', commonFunctions);
    const entityViewValidation = await assertSubset(getEntityViewKeys(poJson), getEntityViewKeys(targetExport), 'Entity view mapping migration validation', commonFunctions);
    const entityViewProcedureValidation = await assertSubset(getEntityViewProcedureKeys(poJson), getEntityViewProcedureKeys(targetExport), 'Entity view procedure mapping migration validation', commonFunctions);
    const actionItemValidation = await assertSubset(getActionItemKeys(poJson), getActionItemKeys(targetExport), 'Action item migration validation', commonFunctions);
    const assumptionValidation = await assertSubset(getAssumptionKeys(poJson), getAssumptionKeys(targetExport), 'Assumption migration validation', commonFunctions);

    expect(processValidation && calendarValidation && scaValidation && entityViewValidation && entityViewProcedureValidation && actionItemValidation && assumptionValidation).toBeTruthy();
  });

  test(`Test Case 8: Clean up migrated content in target realm ${targetRealmTitle}`, async () => {
    test.setTimeout(getTimeout('EXTENDED'));
    const cleanupValidations = await runCleanup();
    const cleanupSuccessful = cleanupValidations.length > 0 && cleanupValidations.every(Boolean);
    cleanupCompleted = cleanupSuccessful;
    await commonFunctions.logMessage('INFO', `Cleanup completed with ${cleanupValidations.filter(v => v).length} successful validations out of ${cleanupValidations.length}`);
    await commonFunctions.logMessage('INFO', `Cleanup successful: ${cleanupSuccessful}`);
    expect(cleanupSuccessful, 'ALM migration cleanup should succeed in the target realm').toBeTruthy();
  });

  test(`Test Case 9: Re-export from target realm and verify migrated content removed`, async () => {
    const exportUrl = targetBaseUrl + (process.env.EXPORT_DATA as string);
    const exportPayload = scopedPayload || TestData.EXPORT_PAYLOAD;
    const response = await apiUtil.processAPIRequest('POST', exportUrl, exportPayload, headersForTarget, 'Re-export data from target realm', 'full');
    const validation1 = await commonFunctions.compareTwoValues(isStatus(response.status, 200), true, 'Target realm re-export success status assertion');
    const exportAfterCleanup = response.data;

    const processValidation = await assertAbsent(getProcessNames(poJson), getProcessNames(exportAfterCleanup), 'Process cleanup validation', commonFunctions);
    const candidateCalendars = getCalendarNames(poJson).filter((name: string) => !SHARED_CALENDARS.has(name));
    const calendarValidation = await assertAbsent(candidateCalendars, getCalendarNames(exportAfterCleanup), 'Calendar cleanup validation', commonFunctions);
    const scaValidation = await assertAbsent(getSupplyChainActionNames(poJson), getSupplyChainActionNames(exportAfterCleanup), 'Supply chain action cleanup validation', commonFunctions);
    const entityViewValidation = await assertAbsent(getEntityViewKeys(poJson), getEntityViewKeys(exportAfterCleanup), 'Entity view mapping cleanup validation', commonFunctions);
    const entityViewProcedureValidation = await assertAbsent(getEntityViewProcedureKeys(poJson), getEntityViewProcedureKeys(exportAfterCleanup), 'Entity view procedure mapping cleanup validation', commonFunctions);

    expect(validation1 && processValidation && calendarValidation && scaValidation && entityViewValidation && entityViewProcedureValidation).toBeTruthy();
  });
});
