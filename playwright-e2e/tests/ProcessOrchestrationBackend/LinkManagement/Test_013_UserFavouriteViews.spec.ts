import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { FavouriteRequest, MappingUtil, buildLinksUrl, favouritesRoute } from '../../../util/mapping.util';
import { getUserBearerToken } from '../../../util/user-token.util';

const psEnv = process.env.PSENV ?? 'INTEROP';
const TestData = require('../../../testdata/' + psEnv + '/ProcessOrchestrationBackend/LinkManagement/Test_013_UserFavouriteViews.json');

type FavouriteContext = { entityId: string; entityType?: string };

const FAVOURITE: FavouriteRequest = { ...TestData.FAVOURITE, isActive: true, isScopeEnabled: false };
const SCOPED_FAVOURITE: FavouriteRequest = { ...TestData.SCOPED_FAVOURITE, isActive: true };
const PROCESS: FavouriteContext = { entityId: TestData.PROCESS_ENTITY_ID };
const SECOND_PROCESS: FavouriteContext = { entityId: TestData.SECOND_PROCESS_ENTITY_ID };
const RESERVED: FavouriteContext = { entityId: TestData.RESERVED_CHAR_ENTITY_ID };
const SUBPROCESS: FavouriteContext = { entityId: TestData.SUBPROCESS_ENTITY_ID, entityType: TestData.SUBPROCESS_TYPE };
const ACTOR: FavouriteContext = { entityId: TestData.ACTOR_ENTITY_ID, entityType: TestData.ACTOR_TYPE };
const ALL_CONTEXTS: FavouriteContext[] = [PROCESS, SECOND_PROCESS, RESERVED, SUBPROCESS, ACTOR];
const FAVOURITE_VIEW_IDS: string[] = [FAVOURITE.viewId, SCOPED_FAVOURITE.viewId];

test.describe.serial('Link Management - user favourite views', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let mappingUtil: MappingUtil;
  let headers: Record<string, string>;
  let noTokenHeaders: Record<string, string>;
  let userHeaders: Record<string, string> | undefined;
  let favouriteId: string;

  const hasUserCredentials = !!process.env.FUNCTIONAL_TEST_USERNAME && !!process.env.FUNCTIONAL_TEST_PASSWORD;

  const create = (context: FavouriteContext, body: FavouriteRequest | Record<string, unknown>, requestHeaders: Record<string, string> = headers): Promise<any> =>
    mappingUtil.createFavourite(body as FavouriteRequest, requestHeaders, context.entityId, context.entityType);
  const list = (context: FavouriteContext, requestHeaders: Record<string, string> = headers): Promise<any> =>
    mappingUtil.getFavourites(requestHeaders, context.entityId, context.entityType);
  const remove = (id: string, context: FavouriteContext, requestHeaders: Record<string, string> = headers): Promise<any> =>
    mappingUtil.deleteFavourite(id, requestHeaders, context.entityId, context.entityType);

  const viewsOf = (response: any): any[] => (Array.isArray(response?.data?.views) ? response.data.views : []);
  const countOf = (response: any, id: string): number => viewsOf(response).filter((view: any) => view?.id === id).length;
  const isValidFavourite = (view: any): boolean => ['id', 'name', 'viewId', 'containerId'].every((key) => typeof view?.[key] === 'string' && view[key].length > 0) && typeof view?.isActive === 'boolean' && typeof view?.isScopeEnabled === 'boolean';
  const deleteMessage = (id: string, context: FavouriteContext): string => `View with id [${id}] deleted for Entity Id [${context.entityId}]${context.entityType ? ` of type [${context.entityType}]` : ''}`;

  async function getUserHeaders(): Promise<Record<string, string>> {
    if (!userHeaders) {
      userHeaders = { accept: 'application/json', Authorization: 'Bearer ' + (await getUserBearerToken()) };
    }
    return userHeaders;
  }

  async function purgeAll(requestHeaders: Record<string, string>): Promise<void> {
    for (const context of ALL_CONTEXTS) {
      await mappingUtil.purgeFavourites(FAVOURITE_VIEW_IDS, requestHeaders, context.entityId, context.entityType);
    }
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    mappingUtil = new MappingUtil(apiUtil, commonFunctions);
    const accessToken = await apiUtil.getBearerToken();
    headers = { accept: 'application/json', Authorization: 'Bearer ' + accessToken };
    noTokenHeaders = { accept: 'application/json' };
    await purgeAll(headers);
  });

  test.afterAll(async () => {
    await purgeAll(headers);
    if (userHeaders) {
      await purgeAll(userHeaders);
    }
  });

  test('Test Case 1: LM-04-P01 untyped POST creates a favourite and returns the catalogue contract', async () => {
    const response = await create(PROCESS, FAVOURITE);
    favouriteId = response.data?.id;
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 201, 'LM-04-P01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(typeof favouriteId === 'string' && favouriteId.length > 0, true, 'LM-04-P01 - id is a non-empty string'),
      await commonFunctions.compareTwoValues(response.data?.viewId, FAVOURITE.viewId, 'LM-04-P01 - viewId echoes the request'),
      await commonFunctions.compareTwoValues(response.data?.containerId, FAVOURITE.containerId, 'LM-04-P01 - containerId echoes the request'),
      await commonFunctions.compareTwoValues(response.data?.isActive, true, 'LM-04-P01 - isActive is true'),
      await commonFunctions.compareTwoValues(response.data?.isScopeEnabled, false, 'LM-04-P01 - isScopeEnabled is false')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 2: LM-02-P01 untyped GET lists the created favourite', async () => {
    const response = await list(PROCESS);
    const favourite = viewsOf(response).find((view: any) => view.id === favouriteId);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-02-P01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(favourite?.viewId, FAVOURITE.viewId, 'LM-02-P01 - favourite viewId matches'),
      await commonFunctions.compareTwoValues(favourite?.containerId, FAVOURITE.containerId, 'LM-02-P01 - favourite containerId matches')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 3: LM-02-P02 every listed favourite matches the item contract', async () => {
    const response = await list(PROCESS);
    const views = viewsOf(response);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-02-P02 - Status Code Validation'),
      await commonFunctions.compareTwoValues(views.length > 0, true, 'LM-02-P02 - views is not empty'),
      await commonFunctions.compareTwoValues(views.every(isValidFavourite), true, 'LM-02-P02 - string id/name/viewId/containerId and boolean isActive/isScopeEnabled')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 4: LM-02-E03 a user token does not see the machine favourites', async () => {
    test.skip(!hasUserCredentials, 'FUNCTIONAL_TEST_USERNAME/PASSWORD not set; no user token for the isolation check');
    const response = await list(PROCESS, await getUserHeaders());
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-02-E03 - Status Code Validation'),
      await commonFunctions.compareTwoValues(countOf(response, favouriteId), 0, 'LM-02-E03 - machine favourite is not visible to the user')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 5: LM-04-P02 posting the same favourite twice is idempotent', async () => {
    const first = await create(PROCESS, FAVOURITE);
    const second = await create(PROCESS, FAVOURITE);
    const listResponse = await list(PROCESS);
    const validations = [
      await commonFunctions.compareTwoValues(first.status, 201, 'LM-04-P02 first POST - Status Code Validation'),
      await commonFunctions.compareTwoValues(second.status, 201, 'LM-04-P02 second POST - Status Code Validation'),
      await commonFunctions.compareTwoValues(first.data?.id, favouriteId, 'LM-04-P02 - first POST returns the same id'),
      await commonFunctions.compareTwoValues(second.data?.id, favouriteId, 'LM-04-P02 - second POST returns the same id'),
      await commonFunctions.compareTwoValues(countOf(listResponse, favouriteId), 1, 'LM-04-P02 - GET lists the favourite once')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 6: LM-04-P03 the same view under a second entity shares the catalogue id', async () => {
    const response = await create(SECOND_PROCESS, FAVOURITE);
    const firstList = await list(PROCESS);
    const secondList = await list(SECOND_PROCESS);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 201, 'LM-04-P03 - Status Code Validation'),
      await commonFunctions.compareTwoValues(response.data?.id, favouriteId, 'LM-04-P03 - same catalogue id for the second entity'),
      await commonFunctions.compareTwoValues(countOf(firstList, favouriteId), 1, 'LM-04-P03 - first entity still lists it'),
      await commonFunctions.compareTwoValues(countOf(secondList, favouriteId), 1, 'LM-04-P03 - second entity lists it')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 7: LM-05-P01 typed POST creates a subprocess favourite', async () => {
    const response = await create(SUBPROCESS, FAVOURITE);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 201, 'LM-05-P01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(response.data?.id, favouriteId, 'LM-05-P01 - typed favourite reuses the catalogue id'),
      await commonFunctions.compareTwoValues(response.data?.viewId, FAVOURITE.viewId, 'LM-05-P01 - viewId echoes the request'),
      await commonFunctions.compareTwoValues(response.data?.containerId, FAVOURITE.containerId, 'LM-05-P01 - containerId echoes the request'),
      await commonFunctions.compareTwoValues(response.data?.isActive, true, 'LM-05-P01 - isActive is true')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 8: LM-03-P01 typed GET lists the subprocess favourite', async () => {
    const response = await list(SUBPROCESS);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-03-P01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(countOf(response, favouriteId), 1, 'LM-03-P01 - typed favourite is listed'),
      await commonFunctions.compareTwoValues(viewsOf(response).every(isValidFavourite), true, 'LM-03-P01 - items match the contract')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 9: LM-03-P02 typed favourite for an interactive cluster actor type is created and listed', async () => {
    const createResponse = await create(ACTOR, FAVOURITE);
    const listResponse = await list(ACTOR);
    const validations = [
      await commonFunctions.compareTwoValues(createResponse.status, 201, 'LM-03-P02 POST - Status Code Validation'),
      await commonFunctions.compareTwoValues(listResponse.status, 200, 'LM-03-P02 GET - Status Code Validation'),
      await commonFunctions.compareTwoValues(countOf(listResponse, favouriteId), 1, 'LM-03-P02 - actor-type favourite is listed')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 10: LM-03-P03 typed GET does not return a favourite stored untyped for the same entity', async () => {
    const response = await list({ entityId: PROCESS.entityId, entityType: TestData.SUBPROCESS_TYPE });
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, 'LM-03-P03 - Status Code Validation'),
      await commonFunctions.compareTwoValues(countOf(response, favouriteId), 0, 'LM-03-P03 - untyped favourite is not returned by the typed route')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 11: LM-02-E02 GET for an unknown entity returns an empty list', async () => {
    const untyped = await list({ entityId: TestData.UNKNOWN_ENTITY_ID });
    const typed = await list({ entityId: TestData.UNKNOWN_ENTITY_ID, entityType: TestData.SUBPROCESS_TYPE });
    const validations = [
      await commonFunctions.compareTwoValues(untyped.status, 200, 'LM-02-E02 untyped - Status Code Validation'),
      await commonFunctions.compareTwoValues(Array.isArray(untyped.data?.views) && untyped.data.views.length === 0, true, 'LM-02-E02 untyped - views is empty'),
      await commonFunctions.compareTwoValues(typed.status, 200, 'LM-02-E02 typed - Status Code Validation'),
      await commonFunctions.compareTwoValues(Array.isArray(typed.data?.views) && typed.data.views.length === 0, true, 'LM-02-E02 typed - views is empty')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 12: LM-05-E01 isScopeEnabled true is persisted and visible in GET', async () => {
    const createResponse = await create(SUBPROCESS, SCOPED_FAVOURITE);
    const listResponse = await list(SUBPROCESS);
    const scopedFavourite = viewsOf(listResponse).find((view: any) => view.id === createResponse.data?.id);
    const validations = [
      await commonFunctions.compareTwoValues(createResponse.status, 201, 'LM-05-E01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(createResponse.data?.isScopeEnabled, true, 'LM-05-E01 - POST returns isScopeEnabled true'),
      await commonFunctions.compareTwoValues(scopedFavourite?.isScopeEnabled, true, 'LM-05-E01 - GET returns isScopeEnabled true')
    ];
    await remove(createResponse.data?.id, SUBPROCESS);

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 13: LM-04-E02 and LM-06-E01 entity id with reserved characters round-trips and the DELETE text is HTML-escaped', async () => {
    const createResponse = await create(RESERVED, FAVOURITE);
    const listResponse = await list(RESERVED);
    const deleteResponse = await remove(favouriteId, RESERVED);
    const escapedEntity = RESERVED.entityId.replace(/&/g, '&amp;');
    const validations = [
      await commonFunctions.compareTwoValues(createResponse.status, 201, 'LM-04-E02 POST - Status Code Validation'),
      await commonFunctions.compareTwoValues(countOf(listResponse, favouriteId), 1, 'LM-04-E02 - GET with the same encoding lists the favourite'),
      await commonFunctions.compareTwoValues(deleteResponse.status, 200, 'LM-06-E01 DELETE - Status Code Validation'),
      await commonFunctions.compareTwoValues(String(deleteResponse.data), `View with id [${favouriteId}] deleted for Entity Id [${escapedEntity}]`, 'LM-06-E01 - response text HTML-escapes the entity id')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 14: LM-04-N01 POST without name, viewId or containerId returns 400', async () => {
    const validations: boolean[] = [];
    for (const field of ['name', 'viewId', 'containerId']) {
      const body: Record<string, unknown> = { ...FAVOURITE };
      delete body[field];
      const response = await create(PROCESS, body);
      validations.push(await commonFunctions.compareTwoValues(response.status, '400', `LM-04-N01 missing ${field} - Status Code Validation`));
    }

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 15: LM-04-N02 POST with a viewId over 36 or a name over 100 characters returns 400', async () => {
    const longViewId = await create(PROCESS, { ...FAVOURITE, viewId: '6'.repeat(TestData.LONG_VIEW_ID_LENGTH) });
    const longName = await create(PROCESS, { ...FAVOURITE, name: 'N'.repeat(TestData.LONG_NAME_LENGTH) });
    const validations = [
      await commonFunctions.compareTwoValues(longViewId.status, '400', 'LM-04-N02 long viewId - Status Code Validation'),
      await commonFunctions.compareTwoValues(longName.status, '400', 'LM-04-N02 long name - Status Code Validation')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 16: LM-04-N03 POST with malformed JSON returns 400', async () => {
    const response = await apiUtil.processRawRequest('POST', buildLinksUrl(favouritesRoute(PROCESS.entityId)), '{"name":', headers, 'LM-04-N03 malformed JSON');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '400', 'LM-04-N03 - Status Code Validation');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.errorCode, TestData.INVALID_JSON_ERROR_CODE, 'LM-04-N03 - errorCode');

    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 17: LM-04-N04 and LM-02-N01 favourites POST and GET without a token return 401', async () => {
    const postResponse = await create(PROCESS, FAVOURITE, noTokenHeaders);
    const untypedGet = await list(PROCESS, noTokenHeaders);
    const typedGet = await list(SUBPROCESS, noTokenHeaders);
    const validations = [
      await commonFunctions.compareTwoValues(postResponse.status, '401', 'LM-04-N04 POST without token - Status Code Validation'),
      await commonFunctions.compareTwoValues(untypedGet.status, '401', 'LM-02-N01 untyped GET without token - Status Code Validation'),
      await commonFunctions.compareTwoValues(typedGet.status, '401', 'LM-02-N01 typed GET without token - Status Code Validation')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 18: LM-06-P01 untyped DELETE removes the favourite', async () => {
    const deleteResponse = await remove(favouriteId, PROCESS);
    const listResponse = await list(PROCESS);
    const validations = [
      await commonFunctions.compareTwoValues(deleteResponse.status, 200, 'LM-06-P01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(String(deleteResponse.data), deleteMessage(favouriteId, PROCESS), 'LM-06-P01 - response text'),
      await commonFunctions.compareTwoValues(countOf(listResponse, favouriteId), 0, 'LM-06-P01 - GET no longer lists the favourite')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 19: LM-06-N01 and LM-06-N02 deleting a removed or unknown favourite returns 404', async () => {
    const again = await remove(favouriteId, PROCESS);
    const unknown = await remove(TestData.UNKNOWN_FAVOURITE_ID, PROCESS);
    const validations = [
      await commonFunctions.compareTwoValues(again.status, '404', 'LM-06-N01 repeat DELETE - Status Code Validation'),
      await commonFunctions.compareTwoValues(unknown.status, '404', 'LM-06-N02 unknown id - Status Code Validation')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 20: LM-07-N01 and LM-07-N02 a typed favourite cannot be deleted through the untyped route or a wrong type', async () => {
    const untypedRoute = await remove(favouriteId, { entityId: SUBPROCESS.entityId });
    const wrongType = await remove(favouriteId, { entityId: SUBPROCESS.entityId, entityType: TestData.ACTOR_TYPE });
    const listResponse = await list(SUBPROCESS);
    const validations = [
      await commonFunctions.compareTwoValues(untypedRoute.status, '404', 'LM-07-N01 untyped route - Status Code Validation'),
      await commonFunctions.compareTwoValues(wrongType.status, '404', 'LM-07-N02 wrong type - Status Code Validation'),
      await commonFunctions.compareTwoValues(countOf(listResponse, favouriteId), 1, 'LM-07-N01 - the typed favourite is still listed')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 21: LM-07-P01 typed DELETE removes the subprocess favourite', async () => {
    const deleteResponse = await remove(favouriteId, SUBPROCESS);
    const listResponse = await list(SUBPROCESS);
    const validations = [
      await commonFunctions.compareTwoValues(deleteResponse.status, 200, 'LM-07-P01 - Status Code Validation'),
      await commonFunctions.compareTwoValues(String(deleteResponse.data), deleteMessage(favouriteId, SUBPROCESS), 'LM-07-P01 - response text ends with the type'),
      await commonFunctions.compareTwoValues(countOf(listResponse, favouriteId), 0, 'LM-07-P01 - typed GET no longer lists the favourite')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });

  test('Test Case 22: LM-06-N03 favourites DELETE without a token returns 401', async () => {
    const response = await remove(favouriteId, PROCESS, noTokenHeaders);
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, '401', 'LM-06-N03 - Status Code Validation');

    expect(bValidation1).toBeTruthy();
  });

  test('Test Case 23: LM-07-E02 the machine token cannot delete another user favourite', async () => {
    test.skip(!hasUserCredentials, 'FUNCTIONAL_TEST_USERNAME/PASSWORD not set; no user token for the isolation check');
    const otherUser = await getUserHeaders();
    const userCreate = await create(SUBPROCESS, FAVOURITE, otherUser);
    const userFavouriteId: string = userCreate.data?.id;
    const machineDelete = await remove(userFavouriteId, SUBPROCESS);
    const userList = await list(SUBPROCESS, otherUser);
    const userDelete = await remove(userFavouriteId, SUBPROCESS, otherUser);
    const validations = [
      await commonFunctions.compareTwoValues(userCreate.status, 201, 'LM-07-E02 user POST - Status Code Validation'),
      await commonFunctions.compareTwoValues(machineDelete.status, '404', 'LM-07-E02 machine DELETE - Status Code Validation'),
      await commonFunctions.compareTwoValues(countOf(userList, userFavouriteId), 1, 'LM-07-E02 - the user favourite survives the machine DELETE'),
      await commonFunctions.compareTwoValues(userDelete.status, 200, 'LM-07-E02 user cleanup DELETE - Status Code Validation')
    ];

    expect(validations.every(Boolean)).toBeTruthy();
  });
});
