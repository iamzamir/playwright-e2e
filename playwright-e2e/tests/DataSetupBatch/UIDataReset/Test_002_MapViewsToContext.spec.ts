import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { applyGatewayOverrides, applyRealmKeyOverride } from '../../../util/gateway.util';

const testDataPath = 'testdata/' + process.env.PSENV + '/DataSetupBatch/UIDataReset/Test_002_MapViewsToContext.json';
const TestData = applyGatewayOverrides(require('../../../' + testDataPath), testDataPath);

type EntityPayload = { type: string; entityId: string[] };

// POST /view-entity-map replaces every mapping of the requested entities with the requested views, so one call per
// entity gives the same end state as one bulk call and can be retried safely. The bulk call (6 entities x 116 views)
// hit the gateway's 60s limit every night with 504 "upstream request timeout".
const MAX_ATTEMPTS = 2;
const CONCURRENCY = 2;

test.describe.serial('Map Views to Context', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let url: string;
  let headers: Record<string, string>;
  let restoreRealmKey: () => void = () => {};

  test.beforeAll(async () => {
    // API fixtures have no realm-key override, so pin the Gravitee tenant here before reading the URLs and token.
    restoreRealmKey = applyRealmKeyOverride(TestData.REALM_KEY);
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    url = (process.env.API_BASE_URL as string) + (process.env.VIEW_ENTITY_MAP as string);

    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  });

  test.afterAll(() => restoreRealmKey());

  test('Test Case 1: Map views to process, subprocess, assumption via API call', async () => {
    const entities: EntityPayload[] = TestData.PAYLOAD.entities.flatMap((entity: EntityPayload) =>
      entity.entityId.map((id) => ({ type: entity.type, entityId: [id] }))
    );
    const failures: string[] = [];

    const isEntityAlreadyMapped = async (entity: EntityPayload): Promise<boolean> => {
      const entityId = entity.entityId[0];
      const searchResponse = await apiUtil.processAPIRequest(
        'POST',
        `${url}/search`,
        { entityId: [entityId], entityType: entity.type },
        headers,
        `Check existing view mapping for ${entity.type} ${entityId}`,
        'full'
      );
      if (Number(searchResponse?.status) !== 200) {
        return false;
      }
      const entityEntry = (searchResponse.data?.views ?? []).find((v: any) => v.entityId === entityId) ?? searchResponse.data?.views?.[0];
      const actualViews: any[] = Array.isArray(entityEntry?.views) ? entityEntry.views : [];
      const expectedViews: any[] = TestData.PAYLOAD.views;
      if (actualViews.length !== expectedViews.length) {
        return false;
      }
      const actualById = new Map<string, any>(actualViews.map((v: any) => [v.id, v]));
      return expectedViews.every((exp: any) => {
        const act = actualById.get(exp.id);
        return Boolean(act && act.sequence === exp.sequence && Boolean(act.hidden) === Boolean(exp.hidden));
      });
    };

    const mapSingleEntity = async (entity: EntityPayload): Promise<void> => {
      const entityId = entity.entityId[0];
      const label = `Mapping ${TestData.PAYLOAD.views.length} views to ${entity.type} ${entityId}`;
      if (await isEntityAlreadyMapped(entity)) {
        await commonFunctions.logMessage('INFO', `Skipping remap for ${entity.type} ${entityId}: all ${TestData.PAYLOAD.views.length} views already match`);
        await commonFunctions.compareTwoValues(200, 200, `${label} already up-to-date assertion`);
        return;
      }
      let status: number | string = 'ERROR';
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const response = await apiUtil.processAPIRequest('POST', url, { entities: [entity], views: TestData.PAYLOAD.views }, headers, `${label} (attempt ${attempt})`, 'full');
        status = response.status;
        if (Number(status) < 500) break;
      }
      if (!(await commonFunctions.compareTwoValues(Number(status), 200, `${label} success assertion`))) {
        failures.push(`${entity.type} ${entityId}: ${status}`);
      }
    };

    for (let i = 0; i < entities.length; i += CONCURRENCY) {
      const batch = entities.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((entity) => mapSingleEntity(entity)));
    }

    expect(failures, `Failed mappings: ${failures.join(', ')}`).toEqual([]);
  });
});
