import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { MappingUtil, buildLinksUrl } from '../../../util/mapping.util';
import { getTimeout } from '../../../constants/timeouts';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/LinkManagement/Test_012_LmSearchV2ActorsAndProcedures.json');

type SearchGroup = { entityType: string; entityId: string[] };
type Seed = { viewId: string; entityType: string; entityId: string };

const PRIMARY_VIEW: string = TestData.VIEW_IDS.PRIMARY;
const SECONDARY_VIEW: string = TestData.VIEW_IDS.SECONDARY;
const MAAS: string = TestData.ACTOR_TYPES.MAAS;
const SCS: string = TestData.ACTOR_TYPES.SCS;
const INSIGHT: string = TestData.ACTOR_TYPES.INSIGHT;
const PROCEDURE: string = TestData.PROCEDURE_TYPE;

test.describe.serial('Link Management - lm-search/v2 and multi-entity procedure search', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let mappingUtil: MappingUtil;
  let headers: Record<string, string>;
  let noTokenHeaders: Record<string, string>;
  let scopeTouched = false;

  const runId = Date.now().toString(36).toUpperCase();
  const syntheticId = (name: string): string => `${TestData.ENTITY_PREFIX}${name}_${runId}`;
  const actorId = syntheticId('Actor');
  const procedureId = syntheticId('Proc');
  const secondProcedureId = syntheticId('Proc2');
  const scsId = syntheticId('Scs');
  const seeds: Seed[] = [
    { viewId: PRIMARY_VIEW, entityType: MAAS, entityId: actorId },
    { viewId: PRIMARY_VIEW, entityType: PROCEDURE, entityId: procedureId },
    { viewId: SECONDARY_VIEW, entityType: SCS, entityId: scsId },
    { viewId: SECONDARY_VIEW, entityType: PROCEDURE, entityId: secondProcedureId }
  ];
  const seededGroups: SearchGroup[] = [
    { entityType: MAAS, entityId: [actorId] },
    { entityType: PROCEDURE, entityId: [procedureId, secondProcedureId] },
    { entityType: SCS, entityId: [scsId] }
  ];

  const lmSearchV2 = (body: unknown, label: string, requestHeaders: Record<string, string> = headers): Promise<any> =>
    apiUtil.processAPIRequest('POST', buildLinksUrl('view-entity-map/lm-search/v2'), body, requestHeaders, label, 'full');
  const searchByEntities = (body: unknown, label: string): Promise<any> =>
    apiUtil.processAPIRequest('POST', buildLinksUrl('view-entity-map/search'), body, headers, label, 'full');
  const scopeUrl = (): string => buildLinksUrl('scope', { entityType: MAAS, entityId: actorId, viewId: PRIMARY_VIEW });

  const viewsOf = (response: any): any[] => (Array.isArray(response?.data?.views) ? response.data.views : []);
  const findView = (response: any, viewId: string): any => viewsOf(response).find((view: any) => view?.id === viewId);
  const entityKeys = (view: any): string[] => (Array.isArray(view?.entities) ? view.entities.map((entity: any) => `${entity.entityType}|${entity.entityId}`).sort() : []);
  // v2 groups by viewId through a hash map, so views and entities are compared as sorted sets.
  const canonicalViews = (response: any): string => JSON.stringify(viewsOf(response).map((view: any) => `${view.id}:${entityKeys(view).join(',')}`).sort());
  const hasEntity = (view: any, entityType: string, entityId: string): boolean => entityKeys(view).includes(`${entityType}|${entityId}`);
  const isNullableString = (value: unknown): boolean => value == null || typeof value === 'string';
  const isValidEntity = (entity: any): boolean => typeof entity?.entityType === 'string' && typeof entity?.entityId === 'string' && typeof entity?.quickFilterEnabled === 'boolean' && isNullableString(entity?.quickFilterConfigId);
  const isValidView = (view: any): boolean => typeof view?.id === 'string' && Number.isInteger(view?.sequence) && typeof view?.hidden === 'boolean' && view?.scopeId == null && Array.isArray(view?.entities) && view.entities.length > 0 && view.entities.every(isValidEntity);
  const bulkIds = (seed: string | undefined, label: string): string[] => {
    const ids = seed ? [seed] : [];
    for (let index = ids.length; index < TestData.LARGE_GROUP_SIZE; index++) {
      ids.push(syntheticId(`Bulk${label}${index}`));
    }
    return ids;
  };

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    mappingUtil = new MappingUtil(apiUtil, commonFunctions);
    const accessToken = await apiUtil.getBearerToken();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + accessToken };
    noTokenHeaders = { accept: 'application/json' };
    for (const seed of seeds) {
      const response = await mappingUtil.mapSingleView(seed.viewId, seed.entityType, seed.entityId, headers);
      expect(response.status, `Seed mapping ${seed.entityType}/${seed.entityId} -> ${seed.viewId}`).toBe(200);
    }
  });

  test.afterAll(async () => {
    if (scopeTouched) {
      const scopeReset = await apiUtil.processAPIRequest('PUT', scopeUrl(), { scope: null, quickFilterEnabled: false }, headers, 'Cleanup: Reset quick filter scope', 'full');
      await commonFunctions.logMessage('INFO', `Scope reset completed with status: ${scopeReset.status}`);
    }
    for (const seed of seeds) {
      const response = await mappingUtil.unmapSingleView(seed.viewId, seed.entityType, seed.entityId, headers);
      await commonFunctions.logMessage('INFO', `Cleanup unmap ${seed.entityType}/${seed.entityId}: status ${response.status}`);
    }
  });

  test('Test Case 1: LM-01-P01 lm-search/v2 with the PSR 4-group request returns the seeded actor and procedure under one view', async () => {
    const groups: SearchGroup[] = (TestData.PSR_GROUPS as SearchGroup[]).map((group) => ({ entityType: group.entityType, entityId: [...group.entityId] }));
    groups.find((group) => group.entityType === MAAS)?.entityId.push(actorId);
    groups.find((group) => group.entityType === PROCEDURE)?.entityId.push(procedureId);
    groups.find((group) => group.entityType === SCS)?.entityId.push(scsId);

    const response = await lmSearchV2({ requests: groups }, 'LM-01-P01 PSR 4-group lm-search/v2');
    const primaryView = findView(response, PRIMARY_VIEW);
    const secondaryView = findView(response, SECONDARY_VIEW);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-01-P01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(Array.isArray(response.data?.views), true, 'LM-01-P01 - views is an array'),
      await commonFunctions.compareTwoValues(hasEntity(primaryView, MAAS, actorId), true, 'LM-01-P01 - primary view holds the seeded maasactor'),
      await commonFunctions.compareTwoValues(hasEntity(primaryView, PROCEDURE, procedureId), true, 'LM-01-P01 - primary view holds the seeded procedure'),
      await commonFunctions.compareTwoValues(hasEntity(secondaryView, SCS, scsId), true, 'LM-01-P01 - secondary view holds the seeded scsactor')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 2: LM-01-P02 lm-search/v2 views and entities match the response contract', async () => {
    const response = await lmSearchV2({ requests: seededGroups }, 'LM-01-P02 contract');
    const views = viewsOf(response);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-01-P02 - Status Code Validation'),
      await commonFunctions.compareTwoValues(views.length >= 2, true, 'LM-01-P02 - both seeded views are returned'),
      await commonFunctions.compareTwoValues(views.every(isValidView), true, 'LM-01-P02 - every view has id, integer sequence, boolean hidden, null scopeId and valid entities')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 3: LM-01-P03 single-group request returns only views mapped to the requested actor', async () => {
    const response = await lmSearchV2({ requests: [{ entityType: MAAS, entityId: [actorId] }] }, 'LM-01-P03 single maasactor group');
    const views = viewsOf(response);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-01-P03 - Status Code Validation'),
      await commonFunctions.compareTwoValues(JSON.stringify(views.map((view: any) => view.id)), JSON.stringify([PRIMARY_VIEW]), 'LM-01-P03 - only the primary view is returned'),
      await commonFunctions.compareTwoValues(JSON.stringify(entityKeys(views[0])), JSON.stringify([`${MAAS}|${actorId}`]), 'LM-01-P03 - entities hold only the requested maasactor')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 4: LM-01-P04 lm-search/v2 view ids equal the union of /view-entity-map/search per group', async () => {
    const v2Response = await lmSearchV2({ requests: seededGroups }, 'LM-01-P04 lm-search/v2');
    const searchViewIds = new Set<string>();
    const validations: boolean[] = [await commonFunctions.compareTwoValues(v2Response.status, 200, 'LM-01-P04 v2 - Status Code Validation')];
    for (const group of seededGroups) {
      const searchResponse = await searchByEntities(group, `LM-01-P04 /search ${group.entityType}`);
      validations.push(await commonFunctions.compareTwoValues(searchResponse.status, 200, `LM-01-P04 /search ${group.entityType} - Status Code Validation`));
      for (const entry of viewsOf(searchResponse)) {
        (Array.isArray(entry?.views) ? entry.views : []).forEach((view: any) => searchViewIds.add(view.id));
      }
    }
    const v2ViewIds = viewsOf(v2Response).map((view: any) => view.id).sort();
    validations.push(await commonFunctions.compareTwoValues(JSON.stringify(v2ViewIds), JSON.stringify([...searchViewIds].sort()), 'LM-01-P04 - v2 view ids equal the /search union'));

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 5: LM-01-P05 quick filter enabled through PUT /scope is reflected by lm-search/v2', async () => {
    const actorGroup = { requests: [{ entityType: MAAS, entityId: [actorId] }] };
    const quickFilterOf = (response: any): unknown => findView(response, PRIMARY_VIEW)?.entities?.find((entity: any) => entity.entityId === actorId)?.quickFilterEnabled;

    scopeTouched = true;
    const enableResponse = await apiUtil.processAPIRequest('PUT', scopeUrl(), { scope: null, quickFilterEnabled: true }, headers, 'LM-01-P05 enable quick filter', 'full');
    const enabledSearch = await lmSearchV2(actorGroup, 'LM-01-P05 search after enable');
    const disableResponse = await apiUtil.processAPIRequest('PUT', scopeUrl(), { scope: null, quickFilterEnabled: false }, headers, 'LM-01-P05 disable quick filter', 'full');
    const disabledSearch = await lmSearchV2(actorGroup, 'LM-01-P05 search after disable');
    const validations = [
      await commonFunctions.compareTwoValues(enableResponse.status, 200, 'LM-01-P05 enable scope - Status Code Validation'),
      await commonFunctions.compareTwoValues(quickFilterOf(enabledSearch), true, 'LM-01-P05 - quickFilterEnabled is true after enabling'),
      await commonFunctions.compareTwoValues(disableResponse.status, 200, 'LM-01-P05 disable scope - Status Code Validation'),
      await commonFunctions.compareTwoValues(quickFilterOf(disabledSearch), false, 'LM-01-P05 - quickFilterEnabled is false after disabling')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 6: LM-01-N01 empty requests list returns 400', async () => {
    const response = await lmSearchV2({ requests: [] }, 'LM-01-N01 empty requests');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'LM-01-N01 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 7: LM-01-N02 group with an empty entityId list returns 400', async () => {
    const response = await lmSearchV2({ requests: [{ entityType: MAAS, entityId: [] }] }, 'LM-01-N02 empty entityId');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'LM-01-N02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 8: LM-01-N03 group without entityType returns 400', async () => {
    const response = await lmSearchV2({ requests: [{ entityId: [actorId] }] }, 'LM-01-N03 missing entityType');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'LM-01-N03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 9: LM-01-N04 empty body and malformed JSON return 400', async () => {
    const emptyBody = await lmSearchV2({}, 'LM-01-N04 empty body');
    const malformed = await apiUtil.processRawRequest('POST', buildLinksUrl('view-entity-map/lm-search/v2'), '{"requests": [', headers, 'LM-01-N04 malformed JSON');
    const validations = [
      await commonFunctions.compareTwoValues(emptyBody.status, '400', 'LM-01-N04 empty body - Status Code Validation'),
      await commonFunctions.compareTwoValues(malformed.status, '400', 'LM-01-N04 malformed JSON - Status Code Validation'),
      await commonFunctions.compareTwoValues(malformed.data?.errorCode, TestData.INVALID_JSON_ERROR_CODE, 'LM-01-N04 malformed JSON - errorCode')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 10: LM-01-N05 lm-search/v2 without a token returns 401', async () => {
    const response = await lmSearchV2({ requests: seededGroups }, 'LM-01-N05 without token', noTokenHeaders);
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'LM-01-N05 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 11: LM-01-E01 unmapped ids return no views from v2 but empty-view entries from /search', async () => {
    const unmappedGroup = { entityType: MAAS, entityId: [syntheticId('UnmappedA'), syntheticId('UnmappedB')] };
    const v2Response = await lmSearchV2({ requests: [unmappedGroup] }, 'LM-01-E01 v2 unmapped');
    const searchResponse = await searchByEntities(unmappedGroup, 'LM-01-E01 /search unmapped');
    const searchEntries = viewsOf(searchResponse);
    const validations = [
      await commonFunctions.compareTwoValues(v2Response.status, 200, 'LM-01-E01 v2 - Status Code Validation'),
      await commonFunctions.compareTwoValues(Array.isArray(v2Response.data?.views) && v2Response.data.views.length === 0, true, 'LM-01-E01 v2 - views is an empty array'),
      await commonFunctions.compareTwoValues(searchResponse.status, 200, 'LM-01-E01 /search - Status Code Validation'),
      await commonFunctions.compareTwoValues(JSON.stringify(searchEntries.map((entry: any) => entry.entityId).sort()), JSON.stringify([...unmappedGroup.entityId].sort()), 'LM-01-E01 /search - one entry per unmapped id'),
      await commonFunctions.compareTwoValues(searchEntries.every((entry: any) => Array.isArray(entry.views) && entry.views.length === 0), true, 'LM-01-E01 /search - every entry has empty views')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 12: LM-01-E02 a duplicated entity id does not duplicate the entity inside the view', async () => {
    const response = await lmSearchV2({ requests: [{ entityType: MAAS, entityId: [actorId, actorId] }] }, 'LM-01-E02 duplicate entity id');
    const actorEntries = (findView(response, PRIMARY_VIEW)?.entities ?? []).filter((entity: any) => entity.entityId === actorId);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-01-E02 - Status Code Validation'),
      await commonFunctions.compareTwoValues(actorEntries.length, 1, 'LM-01-E02 - the actor appears once in the primary view')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 13: LM-01-E03 an unknown entity type returns 200 with no views', async () => {
    const response = await lmSearchV2({ requests: [{ entityType: TestData.UNKNOWN_ENTITY_TYPE, entityId: [actorId] }] }, 'LM-01-E03 unknown entity type');
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-01-E03 - Status Code Validation'),
      await commonFunctions.compareTwoValues(Array.isArray(response.data?.views) && response.data.views.length === 0, true, 'LM-01-E03 - views is an empty array')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 14: LM-01-E04 reordering groups and ids returns the same set of views and entities', async () => {
    const reversedGroups = [...seededGroups].reverse().map((group) => ({ entityType: group.entityType, entityId: [...group.entityId].reverse() }));
    const forward = await lmSearchV2({ requests: seededGroups }, 'LM-01-E04 forward order');
    const reversed = await lmSearchV2({ requests: reversedGroups }, 'LM-01-E04 reversed order');
    const validations = [
      await commonFunctions.compareTwoValues(forward.status, 200, 'LM-01-E04 forward - Status Code Validation'),
      await commonFunctions.compareTwoValues(reversed.status, 200, 'LM-01-E04 reversed - Status Code Validation'),
      await commonFunctions.compareTwoValues(viewsOf(forward).length > 0, true, 'LM-01-E04 - forward response is not empty'),
      await commonFunctions.compareTwoValues(canonicalViews(reversed), canonicalViews(forward), 'LM-01-E04 - views and entities match as sets')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 15: LM-01-E05 a 4 x 50 id request completes in time and still returns the seeded views', async () => {
    const requests: SearchGroup[] = [
      { entityType: MAAS, entityId: bulkIds(actorId, 'Maas') },
      { entityType: PROCEDURE, entityId: bulkIds(procedureId, 'Proc') },
      { entityType: SCS, entityId: bulkIds(scsId, 'Scs') },
      { entityType: INSIGHT, entityId: bulkIds(undefined, 'Insight') }
    ];
    const startedAt = Date.now();
    const response = await lmSearchV2({ requests }, 'LM-01-E05 large request');
    const elapsedMs = Date.now() - startedAt;
    test.info().annotations.push({ type: 'lm-search/v2 latency', description: `${elapsedMs} ms for 4 x ${TestData.LARGE_GROUP_SIZE} ids` });
    const primaryView = findView(response, PRIMARY_VIEW);
    // The service swallows lookup errors and answers 200 {views: []}, so the seeded views must be present.
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-01-E05 - Status Code Validation'),
      await commonFunctions.compareTwoValues(elapsedMs <= getTimeout('LONG'), true, `LM-01-E05 - response within LONG timeout (${elapsedMs} ms)`),
      await commonFunctions.compareTwoValues(hasEntity(primaryView, MAAS, actorId) && hasEntity(primaryView, PROCEDURE, procedureId), true, 'LM-01-E05 - primary view holds the seeded actor and procedure'),
      await commonFunctions.compareTwoValues(hasEntity(findView(response, SECONDARY_VIEW), SCS, scsId), true, 'LM-01-E05 - secondary view holds the seeded scsactor')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 16: LM-V2-P01 multi-entity procedure /search returns one entry per requested id', async () => {
    const entityIds = [procedureId, secondProcedureId, ...(TestData.PSR_PROCEDURE_IDS as string[]).slice(0, TestData.V2_SEARCH_SIZE - 2)];
    const response = await searchByEntities({ entityType: PROCEDURE, entityId: entityIds }, `LM-V2-P01 /search ${entityIds.length} procedures`);
    const entries = viewsOf(response);
    const viewIdsOf = (entityId: string): string[] => (entries.find((entry: any) => entry.entityId === entityId)?.views ?? []).map((view: any) => view.id);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-V2-P01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(entityIds.length, TestData.V2_SEARCH_SIZE, 'LM-V2-P01 - request holds the PSR id count'),
      await commonFunctions.compareTwoValues(entries.length, entityIds.length, 'LM-V2-P01 - one result entry per requested id'),
      await commonFunctions.compareTwoValues(JSON.stringify(entries.map((entry: any) => entry.entityId).sort()), JSON.stringify([...entityIds].sort()), 'LM-V2-P01 - result entity ids match the request'),
      await commonFunctions.compareTwoValues(viewIdsOf(procedureId).includes(PRIMARY_VIEW), true, 'LM-V2-P01 - first seeded procedure maps to the primary view'),
      await commonFunctions.compareTwoValues(viewIdsOf(secondProcedureId).includes(SECONDARY_VIEW), true, 'LM-V2-P01 - second seeded procedure maps to the secondary view')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 17: LM-V2-P02 mixed mapped and unmapped procedure ids keep the unmapped ids with empty views', async () => {
    const unmappedIds = [syntheticId('UnmappedProcA'), syntheticId('UnmappedProcB')];
    const response = await searchByEntities({ entityType: PROCEDURE, entityId: [procedureId, ...unmappedIds] }, 'LM-V2-P02 mixed /search');
    const entries = viewsOf(response);
    const unmappedEntries = entries.filter((entry: any) => unmappedIds.includes(entry.entityId));
    const mappedEntry = entries.find((entry: any) => entry.entityId === procedureId);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-V2-P02 - Status Code Validation'),
      await commonFunctions.compareTwoValues(unmappedEntries.length, unmappedIds.length, 'LM-V2-P02 - every unmapped id is present'),
      await commonFunctions.compareTwoValues(unmappedEntries.every((entry: any) => Array.isArray(entry.views) && entry.views.length === 0), true, 'LM-V2-P02 - unmapped ids have empty views'),
      await commonFunctions.compareTwoValues((mappedEntry?.views ?? []).length > 0, true, 'LM-V2-P02 - the mapped id has views')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 18: LM-V2-E01 duplicate ids in a multi-entity /search are answered and recorded', async () => {
    const unmappedId = syntheticId('UnmappedDup');
    const response = await searchByEntities({ entityType: PROCEDURE, entityId: [procedureId, procedureId, unmappedId, unmappedId] }, 'LM-V2-E01 duplicate ids');
    const entries = viewsOf(response);
    const countOf = (entityId: string): number => entries.filter((entry: any) => entry.entityId === entityId).length;
    test.info().annotations.push({ type: 'duplicate ids', description: `mapped id entries: ${countOf(procedureId)}, unmapped id entries: ${countOf(unmappedId)}` });
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-V2-E01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(countOf(procedureId) >= 1 && countOf(unmappedId) >= 1, true, 'LM-V2-E01 - every requested id appears at least once')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 19: LM-V2-E02 multi-entity procedure /search latency is recorded against the MEDIUM tier', async () => {
    const entityIds = [procedureId, secondProcedureId, ...(TestData.PSR_PROCEDURE_IDS as string[]).slice(0, TestData.V2_SEARCH_SIZE - 2)];
    const startedAt = Date.now();
    const response = await searchByEntities({ entityType: PROCEDURE, entityId: entityIds }, 'LM-V2-E02 latency');
    const elapsedMs = Date.now() - startedAt;
    test.info().annotations.push({ type: '/search latency', description: `${elapsedMs} ms for ${entityIds.length} ids (MEDIUM tier ${getTimeout('MEDIUM')} ms)` });
    // Soft check: latency over the tier is reported, not failed.
    if (elapsedMs > getTimeout('MEDIUM')) {
      await commonFunctions.logMessage('WARNING', `LM-V2-E02 - /search took ${elapsedMs} ms, above the MEDIUM tier`);
    }
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'LM-V2-E02 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });
});
