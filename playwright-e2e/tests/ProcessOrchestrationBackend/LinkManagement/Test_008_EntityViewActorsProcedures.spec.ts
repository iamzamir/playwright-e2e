import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';

let psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/LinkManagement/Test_008_EntityViewActorsProcedures.json');

test.describe('Planning View Actor/Procedure Mapping', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let baseUrl: string;

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
    baseUrl = (process.env.API_BASE_URL as string) + (process.env.VIEW_ENTITY_MAP as string);
  });

  async function performActorProcedureMapping(combo: any) {
    const endpoint = `${baseUrl}/views/${combo.viewId}/type/${combo.entityType}/entity/${combo.entityId}`;

    const mapResponse = await apiUtil.processAPIRequest('PUT', endpoint, combo.mapRequest, headers, 'Map Actor/Procedure to View', 'full');
    let bvalidation1: boolean = await commonFunctions.compareTwoValues(mapResponse.status, 200, 'Map Actor/Procedure to View - Status Code Validation');

    const searchResponse = await apiUtil.processAPIRequest('POST', baseUrl + '/search', combo.searchRequest, headers, 'Search Mapping', 'full');
    let bvalidation2: boolean = await commonFunctions.compareTwoValues(searchResponse.status, 200, 'Search Mapping - Status Code Validation');

    let foundView: any = undefined;
    if (searchResponse.data && searchResponse.data.views) {
      for (const entityEntry of searchResponse.data.views) {
        if (entityEntry.views) {
          for (const view of entityEntry.views) {
            if (view.id === TestData.VIEW_ID) {
              foundView = view;
              break;
            }
          }
        }
        if (foundView) break;
      }
    }
    expect(foundView).toBeDefined();

    // Delete through the same configured route as the mapping, so it follows URL_MODE and the environment's gateway prefix.
    const deleteResponse = await apiUtil.processAPIRequest('DELETE', endpoint, null, headers, 'Delete Mapping', 'full');
    let bvalidation3: boolean = await commonFunctions.compareTwoValues(deleteResponse.status, 200, 'Delete Mapping - Status Code Validation');

    const searchAfterDelete = await apiUtil.processAPIRequest('POST', baseUrl + '/search', combo.searchRequest, headers, 'Search Mapping After Delete', 'full');
    let bvalidation4: boolean = await commonFunctions.compareTwoValues(searchAfterDelete.status, 200, 'Search Mapping After Delete - Status Code Validation');

    let deletedView: any = undefined;
    if (searchAfterDelete.data && searchAfterDelete.data.views) {
      for (const entityEntry of searchAfterDelete.data.views) {
        if (entityEntry.views) {
          for (const view of entityEntry.views) {
            if (view.id === TestData.VIEW_ID) {
              deletedView = view;
              break;
            }
          }
        }
        if (deletedView) break;
      }
    }
    expect(bvalidation1 && bvalidation2 && bvalidation3 && bvalidation4).toBeTruthy();
    expect(deletedView).toBeUndefined();
  }

  test('Test Case 1: Map, verify, search, delete, and confirm mapping for actor: Default, procedure: Default', async () => {
    await performActorProcedureMapping(TestData.combinations[0]);
  });

  test('Test Case 2: Map, verify, search, delete, and confirm mapping for actor: Maas, procedure: Default', async () => {
    await performActorProcedureMapping(TestData.combinations[1]);
  });

  test('Test Case 3: Map, verify, search, delete, and confirm mapping for actor: UI Cache, procedure: Default', async () => {
    await performActorProcedureMapping(TestData.combinations[2]);
  });

  test('Test Case 4: Map, verify, search, delete, and confirm mapping for actor: Scenario Comparison, procedure: Default', async () => {
    await performActorProcedureMapping(TestData.combinations[3]);
  });
});

