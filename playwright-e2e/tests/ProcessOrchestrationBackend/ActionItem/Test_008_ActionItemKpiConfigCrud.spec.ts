import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { ActionItemApiHelper, ActionItemNodeContext, actionItemServiceUrl, uniqueRunId } from '../../../util/action-item.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/ActionItem/Test_008_ActionItemKpiConfigCrud.json');

const runId = uniqueRunId();
const kpiName = `${TestData.KPI_NAME_PREFIX}${runId}`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type KpiAttribute = { id?: string; kpiId?: string; kpiAttrName: string; attrValue: string; isActive: boolean; isEnabled: boolean };

const attributeByName = (kpi: any, name: string): KpiAttribute | undefined => (Array.isArray(kpi?.kpiConfigAttributes) ? kpi.kpiConfigAttributes.find((attribute: any) => attribute?.kpiAttrName === name) : undefined);
const attributeSummary = (kpi: any): string => JSON.stringify((kpi?.kpiConfigAttributes ?? []).map((attribute: any) => `${attribute.kpiAttrName}=${attribute.attrValue}`).sort());
const attributeIds = (kpi: any): string => JSON.stringify((kpi?.kpiConfigAttributes ?? []).map((attribute: any) => attribute.id).sort());
// An unknown KPI currently returns 200 {"data": null}; 404 is also accepted so these checks do not depend on that defect.
const isKpiAbsent = (response: any): boolean => (response.status === 200 && response.data?.data == null) || response.status === '404';

test.describe.serial('Action Item KPI configuration CRUD (AI-04 to AI-07)', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let helper: ActionItemApiHelper;
  let headers: Record<string, string>;
  let ctx: ActionItemNodeContext;
  let created: any;
  let kpiId: string;
  let entityKpiId: string | undefined;
  const createdIds: string[] = [];

  const kpisUrl = (): string => actionItemServiceUrl('kpis');
  const kpiUrl = (id: string): string => actionItemServiceUrl(`kpis/${id}`);
  const kpiEntitiesUrl = (entityId: string): string => actionItemServiceUrl(`kpi/entities/${entityId}`);
  const createBody = (overrides: Record<string, unknown> = {}): any => ({ ...TestData.KPI_BODY, attrName: kpiName, displayName: kpiName, ...overrides });
  const getKpi = async (label: string): Promise<any> => helper.sendUntilStatus('GET', kpiUrl(kpiId), null, 200, label);
  const updateBody = (attributes: KpiAttribute[]): any => ({
    attrName: kpiName,
    displayName: kpiName,
    description: TestData.UPDATED_DESCRIPTION,
    isActive: true,
    isEnabled: true,
    kpiConfigAttributes: attributes
  });
  const listKpis = async (label: string): Promise<any[]> => {
    const response = await helper.sendUntilStatus('GET', kpisUrl(), null, 200, label);
    return response.data?.data ?? [];
  };
  const findKpi = async (attrName: string): Promise<any | undefined> => (await listKpis(`Find KPI ${attrName}`)).find((kpi) => kpi?.attrName === attrName);
  const createKpi = async (body: any, label: string): Promise<any> => {
    const response = await helper.write('POST', kpisUrl(), body, 201, label, { findCommitted: () => findKpi(body.attrName) });
    track(response);
    return response;
  };
  const updateKpi = async (attributes: KpiAttribute[], label: string): Promise<any> => helper.write('PUT', kpiUrl(kpiId), updateBody(attributes), 200, label, { idempotent: true });
  const track = (response: any): void => {
    if (response?.data?.id) {
      createdIds.push(response.data.id);
    }
  };
  const untrack = (id: string | undefined): void => {
    const index = createdIds.indexOf(id as string);
    if (index >= 0) {
      createdIds.splice(index, 1);
    }
  };

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + await apiUtil.getBearerToken() };
    helper = new ActionItemApiHelper(apiUtil, headers);
    ctx = await helper.resolveNodeContext(TestData.PROCESS_NAME, TestData.SUBPROCESS_NAME);
  });

  test.afterAll(async () => {
    const results: boolean[] = [];
    for (const id of createdIds) {
      const response = await helper.send('DELETE', kpiUrl(id), null, `Cleanup KPI ${id}`);
      results.push(response.status === 200 || response.status === '404');
    }
    // Fallback for KPIs created by a request whose response was lost.
    const list = await helper.send('GET', kpisUrl(), null, 'Cleanup KPI list');
    results.push(await commonFunctions.compareTwoValues(list.status, 200, 'Cleanup KPI list - Status Code Validation'));
    for (const kpi of (list.data?.data ?? []).filter((candidate: any) => String(candidate?.attrName).includes(runId))) {
      const response = await helper.send('DELETE', kpiUrl(kpi.id), null, `Cleanup leftover KPI ${kpi.attrName}`);
      results.push(response.status === 200 || response.status === '404');
    }
    expect(results.every(Boolean)).toBeTruthy();
  });

  // ---------- AI-04 POST /kpis and AI-05 GET /kpis/{id} ----------

  test('Test Case 1: AI-04-P01 create a KPI with the PSR body', async () => {
    const response = await createKpi(createBody(), 'AI-04-P01 create KPI');
    created = response.data;
    kpiId = created?.id;
    const status = attributeByName(created, 'status');
    const priority = attributeByName(created, 'priority');
    const bValidation1 = await commonFunctions.compareTwoValues(UUID_PATTERN.test(String(kpiId)), true, 'AI-04-P01 - id is a UUID');
    const bValidation2 = await commonFunctions.compareTwoValues(created?.attrName, kpiName, 'AI-04-P01 - attrName');
    const bValidation3 = await commonFunctions.compareTwoValues(created?.displayName, kpiName, 'AI-04-P01 - displayName');
    const bValidation4 = await commonFunctions.compareTwoValues(created?.description, TestData.KPI_BODY.description, 'AI-04-P01 - description');
    const bValidation5 = await commonFunctions.compareTwoValues(created?.isActive === true && created?.isEnabled === true, true, 'AI-04-P01 - isActive and isEnabled');
    const bValidation6 = await commonFunctions.compareTwoValues(`${status?.attrValue}|${priority?.attrValue}`, '1|2', 'AI-04-P01 - status and priority attribute values (looked up by kpiAttrName)');
    const bValidation7 = await commonFunctions.compareTwoValues([status, priority].every((attribute) => UUID_PATTERN.test(String(attribute?.id)) && attribute?.kpiId === kpiId), true, 'AI-04-P01 - attributes have ids and point at the KPI');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5 && bValidation6 && bValidation7).toBeTruthy();
  });

  test('Test Case 2: AI-04-P02 the created KPI carries audit fields', async () => {
    const bValidation1 = await commonFunctions.compareTwoValues(typeof created?.createdOn === 'string' && created.createdOn.length > 0, true, 'AI-04-P02 - createdOn');
    const bValidation2 = await commonFunctions.compareTwoValues(typeof created?.createdBy === 'string' && created.createdBy.length > 0, true, 'AI-04-P02 - createdBy');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: AI-05-P01 GET by id returns the created KPI in a list wrapper', async () => {
    const response = await getKpi('AI-05-P01 get KPI');
    const kpi = response.data?.data?.[0];
    const bValidation1 = await commonFunctions.compareTwoValues(Array.isArray(response.data?.data) ? response.data.data.length : -1, 1, 'AI-05-P01 - data has one KPI');
    const bValidation2 = await commonFunctions.compareTwoValues(`${kpi?.id}|${kpi?.attrName}|${kpi?.displayName}|${kpi?.description}|${kpi?.isActive}|${kpi?.isEnabled}`, `${kpiId}|${kpiName}|${kpiName}|${created?.description}|true|true`, 'AI-05-P01 - KPI fields match the POST response');
    const bValidation3 = await commonFunctions.compareTwoValues(attributeSummary(kpi), attributeSummary(created), 'AI-05-P01 - attributes match the POST response');
    const bValidation4 = await commonFunctions.compareTwoValues(attributeIds(kpi), attributeIds(created), 'AI-05-P01 - attribute ids match the POST response');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 4: AI-05-P02 the KPI list contains the created KPI', async () => {
    const kpis = await listKpis('AI-05-P02 list KPIs');
    const bValidation1 = await commonFunctions.compareTwoValues(kpis.some((kpi) => kpi?.id === kpiId), true, 'AI-05-P02 - list contains the KPI');

    expect(bValidation1).toBeTruthy();
  });

  // ---------- AI-06 PUT /kpis/{id} ----------

  test('Test Case 5: AI-06-P01 PUT updates the description and keeps the attribute ids', async () => {
    const attributes = created.kpiConfigAttributes.map((attribute: any) => ({ id: attribute.id, kpiId, kpiAttrName: attribute.kpiAttrName, attrValue: attribute.attrValue, isActive: true, isEnabled: true }));
    const response = await updateKpi(attributes, 'AI-06-P01 update description');
    const bValidation1 = await commonFunctions.compareTwoValues(response.data?.description, TestData.UPDATED_DESCRIPTION, 'AI-06-P01 - description updated');
    const bValidation2 = await commonFunctions.compareTwoValues(attributeIds(response.data), attributeIds(created), 'AI-06-P01 - attribute ids unchanged');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 6: AI-06-P02 changing an attribute value is persisted', async () => {
    const attributes = created.kpiConfigAttributes.map((attribute: any) => ({ id: attribute.id, kpiId, kpiAttrName: attribute.kpiAttrName, attrValue: attribute.kpiAttrName === 'status' ? '0' : attribute.attrValue, isActive: true, isEnabled: true }));
    await updateKpi(attributes, 'AI-06-P02 change status value');
    const kpi = (await getKpi('AI-06-P02 get KPI')).data?.data?.[0];
    const bValidation1 = await commonFunctions.compareTwoValues(attributeByName(kpi, 'status')?.attrValue, '0', 'AI-06-P02 - status attribute value');
    const bValidation2 = await commonFunctions.compareTwoValues(attributeByName(kpi, 'priority')?.attrValue, '2', 'AI-06-P02 - priority attribute value unchanged');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 7: AI-06-P03 leaving an attribute out of the list removes it', async () => {
    const status = attributeByName(created, 'status') as KpiAttribute;
    await updateKpi([{ id: status.id, kpiId, kpiAttrName: 'status', attrValue: '0', isActive: true, isEnabled: true }], 'AI-06-P03 drop priority');
    const kpi = (await getKpi('AI-06-P03 get KPI')).data?.data?.[0];
    const bValidation1 = await commonFunctions.compareTwoValues(attributeSummary(kpi), JSON.stringify(['status=0']), 'AI-06-P03 - only the status attribute remains');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 8: AI-06-P04 a new attribute without an id is added and receives an id', async () => {
    const status = attributeByName(created, 'status') as KpiAttribute;
    const attributes = [
      { id: status.id, kpiId, kpiAttrName: 'status', attrValue: '0', isActive: true, isEnabled: true },
      { kpiId, ...TestData.ADDED_ATTRIBUTE }
    ];
    await updateKpi(attributes, 'AI-06-P04 add attribute');
    const kpi = (await getKpi('AI-06-P04 get KPI')).data?.data?.[0];
    const added = attributeByName(kpi, TestData.ADDED_ATTRIBUTE.kpiAttrName);
    const bValidation1 = await commonFunctions.compareTwoValues(kpi?.kpiConfigAttributes?.length, 2, 'AI-06-P04 - two attributes');
    const bValidation2 = await commonFunctions.compareTwoValues(UUID_PATTERN.test(String(added?.id)), true, 'AI-06-P04 - the new attribute has an id');
    const bValidation3 = await commonFunctions.compareTwoValues(attributeByName(kpi, 'status')?.id, status.id, 'AI-06-P04 - the existing attribute keeps its id');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 9: AI-06-E02 when no attribute carries an id the attributes are replaced', async () => {
    const before = (await getKpi('AI-06-E02 get KPI before')).data?.data?.[0];
    const attributes = before.kpiConfigAttributes.map((attribute: any) => ({ kpiId, kpiAttrName: attribute.kpiAttrName, attrValue: attribute.attrValue, isActive: true, isEnabled: true }));
    await updateKpi(attributes, 'AI-06-E02 attributes without ids');
    const after = (await getKpi('AI-06-E02 get KPI after')).data?.data?.[0];
    const beforeIds = (before.kpiConfigAttributes ?? []).map((attribute: any) => attribute.id);
    const bValidation1 = await commonFunctions.compareTwoValues(attributeSummary(after), attributeSummary(before), 'AI-06-E02 - same attribute names and values');
    const bValidation2 = await commonFunctions.compareTwoValues((after?.kpiConfigAttributes ?? []).every((attribute: any) => !beforeIds.includes(attribute.id)), true, 'AI-06-E02 - every attribute has a new id');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 10: AI-06-N01 PUT on an unknown id returns 404', async () => {
    const response = await helper.send('PUT', kpiUrl(TestData.UNKNOWN_ID), updateBody([]), 'AI-06-N01 unknown id');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '404', 'AI-06-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.NOT_FOUND_ERROR_CODE, 'AI-06-N01 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 11: AI-06-N02 PUT without a token returns 401', async () => {
    const response = await helper.send('PUT', kpiUrl(kpiId), updateBody([]), 'AI-06-N02 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'AI-06-N02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 12: AI-06-N03 PUT with malformed JSON returns 400', async () => {
    const response = await helper.send('PUT', kpiUrl(kpiId), '{"attrName":', 'AI-06-N03 malformed JSON');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'AI-06-N03 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.INVALID_JSON_ERROR_CODE, 'AI-06-N03 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  // ---------- AI-04 POST /kpis negatives ----------

  test('Test Case 13: AI-04-N01 and N02 POST without attrName or displayName returns 400', async () => {
    const missingAttrName = await helper.send('POST', kpisUrl(), createBody({ attrName: undefined }), 'AI-04-N01 missing attrName');
    const missingDisplayName = await helper.send('POST', kpisUrl(), createBody({ attrName: `${kpiName} nodisplay`, displayName: undefined }), 'AI-04-N02 missing displayName');
    track(missingAttrName);
    track(missingDisplayName);
    const bValidation1 = await commonFunctions.compareTwoValues(missingAttrName.status, '400', 'AI-04-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(missingAttrName.data?.rootCause?.error?.violations?.[0]?.fieldName, 'attrName', 'AI-04-N01 - violation field');
    const bValidation3 = await commonFunctions.compareTwoValues(missingDisplayName.status, '400', 'AI-04-N02 - Status Code Validation');
    const bValidation4 = await commonFunctions.compareTwoValues(missingDisplayName.data?.rootCause?.error?.violations?.[0]?.fieldName, 'displayName', 'AI-04-N02 - violation field');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 14: AI-04-N03 and N04 POST beyond the attrName and entityId length limits returns 400', async () => {
    const longName = await helper.send('POST', kpisUrl(), createBody({ attrName: 'a'.repeat(101) }), 'AI-04-N03 attrName 101 characters');
    const longEntity = await helper.send('POST', kpisUrl(), createBody({ attrName: `${kpiName} longentity`, entityId: 'a'.repeat(37) }), 'AI-04-N04 entityId 37 characters');
    track(longName);
    track(longEntity);
    const bValidation1 = await commonFunctions.compareTwoValues(longName.status, '400', 'AI-04-N03 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(longName.data?.message, 'Attribute Name is too long', 'AI-04-N03 - message');
    const bValidation3 = await commonFunctions.compareTwoValues(longEntity.status, '400', 'AI-04-N04 - Status Code Validation');
    const bValidation4 = await commonFunctions.compareTwoValues(longEntity.data?.message, 'Entity Id is too long', 'AI-04-N04 - message');

    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 15: AI-04-N05 POST with an unregistered entityId returns 404 and leaves no orphan KPI', async () => {
    const attrName = `${kpiName} unregistered`;
    const response = await helper.send('POST', kpisUrl(), createBody({ attrName, entityId: TestData.UNKNOWN_ID }), 'AI-04-N05 unregistered entityId');
    track(response);
    const orphan = await findKpi(attrName);
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '404', 'AI-04-N05 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(String(response.data?.message).startsWith('Entity not found'), true, 'AI-04-N05 - message');
    const bValidation3 = await commonFunctions.compareTwoValues(orphan, undefined, 'AI-04-N05 - no orphan KPI is listed');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 16: AI-04-N06 and N07 POST without a token or with malformed JSON is rejected', async () => {
    const noToken = await helper.send('POST', kpisUrl(), createBody({ attrName: `${kpiName} notoken` }), 'AI-04-N06 no token', { accept: 'application/json' });
    const malformed = await helper.send('POST', kpisUrl(), '{"attrName":', 'AI-04-N07 malformed JSON');
    track(noToken);
    const bValidation1 = await commonFunctions.compareTwoValues(noToken.status, '401', 'AI-04-N06 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(malformed.status, '400', 'AI-04-N07 - Status Code Validation');
    const bValidation3 = await commonFunctions.compareTwoValues(malformed.data?.errorCode, TestData.INVALID_JSON_ERROR_CODE, 'AI-04-N07 - errorCode');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 17: AI-04-P03 a KPI created with an entityId is mapped to that entity', async () => {
    const entityId = ctx.processEntityId ?? ctx.subprocessEntityId;
    const response = await createKpi(createBody({ attrName: `${kpiName} entity`, entityId }), 'AI-04-P03 create KPI with entityId');
    entityKpiId = response.data?.id;
    const mapped = await helper.sendUntilStatus('GET', kpiEntitiesUrl(entityId), null, 200, 'AI-04-P03 KPIs mapped to the entity');
    const bValidation1 = await commonFunctions.compareTwoValues(mapped.data?.entityId, entityId, 'AI-04-P03 - entityId echoed');
    const bValidation2 = await commonFunctions.compareTwoValues((mapped.data?.data ?? []).some((kpi: any) => kpi?.id === entityKpiId), true, 'AI-04-P03 - KPI is mapped to the entity');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  // ---------- AI-07 DELETE /kpis/{id} and AI-05 negatives ----------

  test('Test Case 18: AI-07-P02 deleting a mapped KPI removes the entity mapping', async () => {
    const entityId = ctx.processEntityId ?? ctx.subprocessEntityId;
    const remove = await helper.write('DELETE', kpiUrl(entityKpiId as string), null, 200, 'AI-07-P02 delete mapped KPI');
    untrack(entityKpiId);
    const mapped = await helper.sendUntilStatus('GET', kpiEntitiesUrl(entityId), null, 200, 'AI-07-P02 KPIs mapped to the entity after delete');
    const bValidation1 = await commonFunctions.compareTwoValues(remove.data, TestData.KPI_DELETED_MESSAGE, 'AI-07-P02 - delete message');
    const bValidation2 = await commonFunctions.compareTwoValues((mapped.data?.data ?? []).some((kpi: any) => kpi?.id === entityKpiId), false, 'AI-07-P02 - KPI no longer mapped');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 19: AI-05-N02 GET without a token returns 401', async () => {
    const response = await helper.send('GET', kpiUrl(kpiId), null, 'AI-05-N02 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'AI-05-N02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 20: AI-05-E01 another realm cannot read the KPI', async () => {
    const clientId = process.env.REALM_CLIENT_ID_SOURCE;
    const clientSecret = process.env.REALM_CLIENT_SECRET_SOURCE;
    // setup.js copies unset secrets as the string "undefined"; Gravitee only isolates realms by host.
    const isConfigured = !!clientId && !!clientSecret && clientSecret !== 'undefined' && clientId !== process.env.CLIENT_ID;
    const hasSeparateGraviteeRealm = (process.env.GATEWAY_TYPE || 'AZURE').toUpperCase() !== 'GRAVITEE' || process.env.AUTH_URL_SOURCE !== process.env.AUTH_URL;
    test.skip(!isConfigured || !hasSeparateGraviteeRealm, 'Second-realm (REALM_*_SOURCE) machine credentials are not configured for this run');
    const otherRealmHeaders = await apiUtil.buildAuthHeaders(clientId as string, clientSecret as string, process.env.REALM_ID_SOURCE as string, process.env.AUTH_URL_SOURCE as string);
    test.skip(otherRealmHeaders.Authorization === 'Bearer undefined', 'The second-realm (REALM_*_SOURCE) credentials were rejected by the identity provider');
    const otherRealmUrl = kpiUrl(kpiId).replace(process.env.API_BASE_URL as string, process.env.API_BASE_URL_SOURCE as string);
    const response = await helper.send('GET', otherRealmUrl, null, 'AI-05-E01 KPI read from another realm', otherRealmHeaders);
    const bValidation1 = await commonFunctions.compareTwoValues(isKpiAbsent(response), true, `AI-05-E01 - KPI is not visible to another tenant (status ${response.status})`);

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 21: AI-07-P01 DELETE removes the KPI', async () => {
    const remove = await helper.write('DELETE', kpiUrl(kpiId), null, 200, 'AI-07-P01 delete KPI');
    untrack(kpiId);
    const response = await helper.send('GET', kpiUrl(kpiId), null, 'AI-07-P01 get deleted KPI');
    const kpis = await listKpis('AI-07-P01 list KPIs');
    const bValidation1 = await commonFunctions.compareTwoValues(remove.data, TestData.KPI_DELETED_MESSAGE, 'AI-07-P01 - delete message');
    const bValidation2 = await commonFunctions.compareTwoValues(isKpiAbsent(response), true, `AI-07-P01 - GET no longer returns the KPI (status ${response.status})`);
    const bValidation3 = await commonFunctions.compareTwoValues(kpis.some((kpi) => kpi?.id === kpiId), false, 'AI-07-P01 - list no longer contains the KPI');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 22: AI-07-N01 and N02 DELETE of a deleted or unknown id returns 404', async () => {
    const again = await helper.send('DELETE', kpiUrl(kpiId), null, 'AI-07-N01 delete again');
    const unknown = await helper.send('DELETE', kpiUrl(TestData.UNKNOWN_ID), null, 'AI-07-N02 delete unknown id');
    const bValidation1 = await commonFunctions.compareTwoValues(again.status, '404', 'AI-07-N01 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(again.data?.errorCode, TestData.NOT_FOUND_ERROR_CODE, 'AI-07-N01 - errorCode');
    const bValidation3 = await commonFunctions.compareTwoValues(unknown.status, '404', 'AI-07-N02 - Status Code Validation');

    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 23: AI-07-N03 DELETE without a token returns 401', async () => {
    const response = await helper.send('DELETE', kpiUrl(TestData.UNKNOWN_ID), null, 'AI-07-N03 no token', { accept: 'application/json' });
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'AI-07-N03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });
});
