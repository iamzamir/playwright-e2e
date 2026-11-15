import { test, expect } from '../../../../configs/fixtures';
import { getTimeout } from '../../../../constants/timeouts';
import { clearCachedProcessFeatures, enableProcessFeature, JsonMockHandle, MockHandle, mockJson, patchScenarioList } from '../../../../util/api-mock.util';
import { ScenarioMenuItem } from '../../../../pageobjects/scenario/manage-scenarios.component';
import { ScenarioPage } from '../../../../pageobjects/scenario.page';
import { RebaseStrategy } from '../../../../pageobjects/scenario/resolve-conflicts.component';

/**
 * Mocked UI contract for scenario sync status (publish, re-baseline and Resolve Conflicts). These states can't be set up
 * on shared data: a scenario only goes out of sync when its parent changes. The flag is switched on for this run, the
 * live list is replaced by Base plus the rows below, and publish and rebase never reach the server.
 * Rules come from planning-mfe `buildScenarioMenuActions.tsx` and `useScenarioRowMenuActions.tsx`.
 */
const CONFLICTS_FLAG = 'WITH_SCENAIRO_CONFLICTS_CHECK';
const PUBLISH = 'Publish';
const REBASELINE = 'Re-Baseline';
const CREATE_CHILD = 'Create Child Scenario';

const OUT_OF_SYNC_TOOLTIP = 'Publishing is unavailable while this scenario is out of sync';
const IN_PROGRESS_TOOLTIP = 'Rebaseline in progress';
const PARENT_OUT_OF_SYNC_TOOLTIP = 'its parent is also out of sync';
const PARENT_CORRUPTED_TOOLTIP = 'the parent scenario is corrupted';

const IN_SYNC = 'Mock_InSync';
const OUT_OF_SYNC = 'Mock_OutOfSync';
const RUNNING = 'Mock_RebaseRunning';
const FAILED = 'Mock_RebaseFailed';
const CHILD_OF_OUT_OF_SYNC = 'Mock_ChildOfOutOfSync';
const CHILD_OF_FAILED = 'Mock_ChildOfRebaseFailed';
const NOT_IN_MEMORY = 'Mock_NotInMemory';

const idOf = (name: string): string => `mock-${name.toLowerCase()}`;

const mockRow = (template: Record<string, unknown>, name: string, dataStatus: string, parentScenarioId: unknown, inMemoryScenario = true): Record<string, unknown> => ({
  ...template,
  scenarioId: idOf(name),
  simulationId: idOf(name),
  scenarioName: name,
  scenarioDisplayName: name,
  parentScenarioId,
  visibility: 'PUBLIC',
  isDefault: false,
  isPinned: false,
  dataStatus,
  inMemoryScenario,
});

const buildRows = (entities: Array<Record<string, unknown>>): Array<Record<string, unknown>> => {
  const base = entities.find((scenario) => scenario.scenarioType === 'BASE' && scenario.isCurrent);
  const child = entities.find((scenario) => scenario.scenarioType !== 'BASE');
  if (!base || !child) {
    return entities;
  }
  return [
    base,
    mockRow(child, IN_SYNC, 'NORMAL', base.scenarioId),
    mockRow(child, OUT_OF_SYNC, 'DEFUNCT', base.scenarioId),
    mockRow(child, RUNNING, 'REBASE_IN_PROGRESS', base.scenarioId),
    mockRow(child, FAILED, 'REBASE_FAILED', base.scenarioId),
    mockRow(child, CHILD_OF_OUT_OF_SYNC, 'NORMAL', idOf(OUT_OF_SYNC)),
    mockRow(child, CHILD_OF_FAILED, 'NORMAL', idOf(FAILED)),
    mockRow(child, NOT_IN_MEMORY, 'DEFUNCT', base.scenarioId, false),
  ];
};

/** The URL of the latest call a mock received, '' before the first one. */
const lastUrl = (mock: MockHandle): string => mock.calls[mock.calls.length - 1]?.url ?? '';

/** The MFE sends rebase as a POST with no body, so the method is the rest of the request contract. */
const expectLastCallIsPost = (mock: MockHandle): void => expect(mock.calls[mock.calls.length - 1]?.method).toBe('POST');

const find = (items: ScenarioMenuItem[], label: string): ScenarioMenuItem | undefined => items.find((item) => item.label === label);

test.describe.serial('Scenario sync status, mocked flag and scenario list', () => {
  const routes: MockHandle[] = [];
  let statusMock: JsonMockHandle;
  let publishMock: JsonMockHandle;
  let rebaseMock: JsonMockHandle;

  // Test data exists only for INTEROP on the Azure gateway; test:qa and test:psr run every spec.
  test.skip((process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim().toUpperCase() !== 'INTEROP', 'Test data configured on INTEROP only');
  test.skip((process.env.GATEWAY_TYPE || '').toUpperCase() === 'GRAVITEE', 'Test data configured for the Azure gateway');

  test.beforeAll(async ({ page, testUtil, testData }) => {
    const context = page.context();
    statusMock = await mockJson(context, /\/scenarios\/mock-[^/?]+/, { dataStatus: 'NORMAL' });
    publishMock = await mockJson(context, /\/scenario\/[^/]+\/planningInstance\/[^/]*\/enginePublish/, { status: 'COMPLETED' });
    rebaseMock = await mockJson(context, /\/scenario\/[^/]+\/planningInstance\/[^/]*\/rebase\?strategy=/, { status: 'INPROGRESS' });
    routes.push(statusMock, publishMock, rebaseMock, await enableProcessFeature(context, CONFLICTS_FLAG), await patchScenarioList(context, buildRows));
    await testUtil.loginToPlanningSpaceWithProcess(testData.REALM_NAME, process.env.FUNCTIONAL_TEST_USERNAME as string, process.env.FUNCTIONAL_TEST_PASSWORD as string, testData.PROCESS_NAME);
  });

  test.afterAll(async ({ page, scenarioPage }) => {
    await scenarioPage.closeManageScenarios().catch(() => undefined);
    await clearCachedProcessFeatures(page);
    await Promise.all(routes.map((route) => route()));
  });

  test('Test Case 1: Rows show the sync status icon for out-of-sync, rebasing and failed scenarios', async ({ planningPage, scenarioPage, commonFunctions }) => {
    await planningPage.goToManageScenarios();
    await scenarioPage.waitForScenarioTable();
    const table = scenarioPage.manageScenarios;
    const checks = [
      await commonFunctions.compareTwoValues(await table.getSyncStatusTooltip(IN_SYNC), null, 'In sync row has no status icon'),
      await commonFunctions.compareTwoValues((await table.getSyncStatusTooltip(OUT_OF_SYNC))?.includes('Parent Scenario Changed'), true, 'Out of sync icon'),
      await commonFunctions.compareTwoValues((await table.getSyncStatusTooltip(RUNNING))?.includes(IN_PROGRESS_TOOLTIP), true, 'Rebase in progress icon'),
      await commonFunctions.compareTwoValues((await table.getSyncStatusTooltip(FAILED))?.includes('corrupted data'), true, 'Rebase failed icon'),
    ];
    expect(checks.every(Boolean)).toBe(true);
  });

  test('Test Case 2: In sync scenario can be published but not re-baselined', async ({ scenarioPage }) => {
    const items = await scenarioPage.manageScenarios.getRowMenuItems(IN_SYNC);
    expect(find(items, PUBLISH)?.disabled).toBe(false);
    expect(find(items, REBASELINE)).toMatchObject({ disabled: true, tooltip: null });
  });

  test('Test Case 3: Out of sync scenario can be re-baselined but not published', async ({ scenarioPage }) => {
    const items = await scenarioPage.manageScenarios.getRowMenuItems(OUT_OF_SYNC);
    expect(find(items, PUBLISH)?.tooltip).toContain(OUT_OF_SYNC_TOOLTIP);
    expect(find(items, REBASELINE)?.disabled).toBe(false);
  });

  test('Test Case 4: Publish and re-baseline are blocked while a rebase is running', async ({ scenarioPage }) => {
    const items = await scenarioPage.manageScenarios.getRowMenuItems(RUNNING);
    expect(find(items, PUBLISH)?.tooltip).toContain(IN_PROGRESS_TOOLTIP);
    expect(find(items, REBASELINE)?.tooltip).toContain(IN_PROGRESS_TOOLTIP);
  });

  test('Test Case 5: A failed rebase leaves only Edit and Delete', async ({ scenarioPage }) => {
    const items = await scenarioPage.manageScenarios.getRowMenuItems(FAILED);
    expect(items.map((item) => item.label).sort()).toEqual(['Delete', 'Edit']);
  });

  test('Test Case 6: Child of an out-of-sync scenario is blocked until its parent is re-baselined', async ({ scenarioPage }) => {
    await scenarioPage.manageScenarios.expandScenario(OUT_OF_SYNC);
    const items = await scenarioPage.manageScenarios.getRowMenuItems(CHILD_OF_OUT_OF_SYNC);
    expect(find(items, PUBLISH)?.tooltip).toContain(PARENT_OUT_OF_SYNC_TOOLTIP);
    expect(find(items, REBASELINE)?.tooltip).toContain(PARENT_OUT_OF_SYNC_TOOLTIP);
  });

  test('Test Case 7: Child of a failed rebase cannot create, publish or re-baseline', async ({ scenarioPage }) => {
    await scenarioPage.manageScenarios.expandScenario(FAILED);
    const items = await scenarioPage.manageScenarios.getRowMenuItems(CHILD_OF_FAILED);
    for (const label of [CREATE_CHILD, PUBLISH, REBASELINE]) {
      expect(find(items, label)?.tooltip, label).toContain(PARENT_CORRUPTED_TOOLTIP);
    }
  });

  test('Test Case 8: A scenario that is not in-memory keeps the procedure publish and has no re-baseline', async ({ scenarioPage }) => {
    const items = await scenarioPage.manageScenarios.getRowMenuItems(NOT_IN_MEMORY);
    expect(find(items, REBASELINE)).toBeUndefined();
    // No sync-status tooltip. Whether it is enabled depends on the process having a publish procedure, so that isn't asserted.
    expect(find(items, PUBLISH)).toMatchObject({ tooltip: null });
  });

  test('Test Case 9: Publishing an in sync scenario calls the engine publish API', async ({ scenarioPage, commonFunctions }) => {
    statusMock.respondWith({ dataStatus: 'NORMAL' });
    await scenarioPage.manageScenarios.runRowAction(IN_SYNC, PUBLISH);
    await expect.poll(() => publishMock.calls.filter((call) => call.method === 'POST' && call.url.includes(`/scenario/${idOf(IN_SYNC)}/`)).length, { timeout: getTimeout('LONG') }).toBe(1);
    const toast = await commonFunctions.compareTwoValues(await scenarioPage.verifyAlertMsg('Scenario published', getTimeout('XLARGE')), true, 'Publish success message');
    expect(toast).toBe(true);
  });

  test('Test Case 10: Publish opens Resolve Conflicts when the server says the row went out of sync, without publishing', async ({ scenarioPage }) => {
    statusMock.respondWith({ dataStatus: 'DEFUNCT' });
    const publishesBefore = publishMock.calls.length;
    await scenarioPage.manageScenarios.runRowAction(IN_SYNC, PUBLISH);
    expect(await scenarioPage.resolveConflicts.isOpen()).toBe(true);
    expect(await scenarioPage.resolveConflicts.getTargetScenario()).toBe(IN_SYNC);
    expect(publishMock.calls.length).toBe(publishesBefore);
    await scenarioPage.resolveConflicts.choose('INHERIT_ALL');
    await expect.poll(() => lastUrl(rebaseMock), { timeout: getTimeout('LONG') }).toContain(`/scenario/${idOf(IN_SYNC)}/`);
    expect(lastUrl(rebaseMock)).toContain('strategy=INHERIT_ALL');
    expectLastCallIsPost(rebaseMock);
    expect(publishMock.calls.length).toBe(publishesBefore);
  });

  /** Re-baselines the out-of-sync row through Resolve Conflicts and checks the strategy sent. */
  const rebaselineWith = async (scenarioPage: ScenarioPage, strategy: RebaseStrategy): Promise<void> => {
    statusMock.respondWith({ dataStatus: 'DEFUNCT' });
    const rebasesBefore = rebaseMock.calls.length;
    await scenarioPage.manageScenarios.runRowAction(OUT_OF_SYNC, REBASELINE);
    expect(await scenarioPage.resolveConflicts.isOpen()).toBe(true);
    await scenarioPage.resolveConflicts.choose(strategy);
    await expect.poll(() => rebaseMock.calls.length, { timeout: getTimeout('LONG') }).toBe(rebasesBefore + 1);
    expect(lastUrl(rebaseMock)).toContain(`/scenario/${idOf(OUT_OF_SYNC)}/`);
    expect(lastUrl(rebaseMock)).toContain(`strategy=${strategy}`);
    expectLastCallIsPost(rebaseMock);
  };

  test('Test Case 11: Re-baseline with Apply Override sends INHERIT_ALL', async ({ scenarioPage }) => {
    await rebaselineWith(scenarioPage, 'INHERIT_ALL');
  });

  test('Test Case 12: Re-baseline without overrides sends INHERIT_NONE', async ({ scenarioPage }) => {
    await rebaselineWith(scenarioPage, 'INHERIT_NONE');
  });

  test('Test Case 13: Re-baseline skips Resolve Conflicts when the server says the row is back in sync', async ({ scenarioPage, commonFunctions }) => {
    statusMock.respondWith({ dataStatus: 'NORMAL' });
    const rebasesBefore = rebaseMock.calls.length;
    await scenarioPage.manageScenarios.runRowAction(OUT_OF_SYNC, REBASELINE);
    await expect.poll(() => rebaseMock.calls.length, { timeout: getTimeout('LONG') }).toBe(rebasesBefore + 1);
    expect(lastUrl(rebaseMock)).toContain('strategy=INHERIT_ALL');
    expectLastCallIsPost(rebaseMock);
    expect(await scenarioPage.resolveConflicts.isOpen(getTimeout('TINY'))).toBe(false);
    const toast = await commonFunctions.compareTwoValues(await scenarioPage.verifyAlertMsg('Re-baseline started', getTimeout('XLARGE')), true, 'Re-baseline started message');
    expect(toast).toBe(true);
  });
});
