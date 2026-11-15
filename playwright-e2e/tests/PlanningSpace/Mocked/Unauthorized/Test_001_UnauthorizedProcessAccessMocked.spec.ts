import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { mockStatus, MockHandle } from '../../../../util/api-mock.util';

/**
 * Mocked UI contract for the Unauthorized access page. Replaces the role removal that used to run in
 * LastAccessedContext Test_001 (it unassigned a role from a realm user through IAM, which other lanes share).
 * planning-mfe (`useApi.tsx` handleErrorResponse) routes to `/unauthorized` when `GET /process/<name>/context`
 * answers 401, which is what the backend returns for a user who lacks view permission on the process.
 * The MFE relays its calls through the portal, so the route is set on the BrowserContext before the first navigation.
 */
const ACCESS_DENIED = { errorCode: 'IBP_40_1032', message: 'Access denied:User lacks view permission on resource' };
const UNAUTHORIZED_TITLE = 'Unauthorized access';

test.describe('Unauthorized access page when the process context is denied (Mocked UI Contract)', () => {
  const routes: MockHandle[] = [];

  // Test data exists only for INTEROP on the Azure gateway; the mocked lane does not run on Gravitee.
  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Mocked test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.afterEach(async () => {
    await Promise.all(routes.splice(0).map((unroute) => unroute()));
  });

  test('Test Case 1: A 401 on the process context shows the Unauthorized access page', async ({ testUtil, planningPage, testData, page }) => {
    const processName = testData.PROCESS_NAME.replace(/\s/g, '');
    const contextMock = await mockStatus(page.context(), new RegExp(`/process/${processName}/context(\\?|$)`), 401, ACCESS_DENIED);
    routes.push(contextMock);

    await testUtil.loginToPlanningSpaceProcessWithoutViewWait(
      testData.REALM_NAME,
      process.env.FUNCTIONAL_TEST_USERNAME as string,
      process.env.FUNCTIONAL_TEST_PASSWORD as string,
      testData.PROCESS_NAME
    );

    await expect
      .poll(() => contextMock.calls.some((call) => call.method === 'GET'), {
        message: `GET /process/${processName}/context should go through the mock`,
        timeout: getTimeout('XLARGE'),
      })
      .toBe(true);

    // Without the redirect the page stays on "Setting up your page" and this title never appears.
    expect(await planningPage.getUnAuthorizedErrorMsg()).toBe(UNAUTHORIZED_TITLE);
  });
});
