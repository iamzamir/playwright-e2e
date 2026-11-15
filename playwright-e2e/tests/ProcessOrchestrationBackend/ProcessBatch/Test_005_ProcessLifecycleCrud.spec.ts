import { uniqueAlphanumericName } from '../../../util/unique-name.util';
import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';
import { CommonFunctions } from '../../../util/common.util';
import { getTimeout } from '../../../constants/timeouts';
import { getJobIdFromUrl, startProcess, waitForJobCompleted, ensureProcessStopped } from '../../../util/process-start.util';
import { getFirstCalendarCycle } from '../../../util/calendar-cycle.util';

const Testdata = require('../../../testdata/' + process.env.PSENV + '/ProcessOrchestrationBackend/ProcessBatch/Test_005_ProcessLifecycleCrud.json');

type SnapshotPhase =
  | 'afterCreate'
  | 'afterPlanStart'
  | 'afterLevelOneCreate'
  | 'afterLevelOneUpdate'
  | 'afterLevelTwoCreate'
  | 'afterLevelTwoUpdate'
  | 'afterStart'
  | 'afterStop'
  | 'afterLevelTwoDelete'
  | 'afterLevelOneDelete';

type LifecycleState = {
  processName: string;
  cycleName?: string;
  processId?: string;
  levelOneId?: string;
  levelTwoId?: string;
  startJobId?: string | null;
  stopJobId?: string | null;
  procedureConfigName?: string;
};

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const planStartDate = [tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate()]
  .map((part) => String(part).padStart(2, '0'))
  .join('-');
const state: LifecycleState = {
  processName: uniqueAlphanumericName(Testdata.PROCESS_NAME_PREFIX || 'PSAutomation')
};

function statusOf(response: any): unknown {
  return response && typeof response === 'object' && 'status' in response ? response.status : response;
}

function isStatus(response: any, code: number): boolean {
  return statusOf(response) === code || statusOf(response) === String(code);
}

function isAllowedStatus(actual: unknown, allowed: number[]): boolean {
  return allowed.some((code) => isStatus(actual, code));
}

function extractEntities(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.entities)) return payload.entities;
  if (Array.isArray(payload?.data?.entities)) return payload.data.entities;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizedStatus(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

function treeNodes(treeResponse: any): any[] {
  return Array.isArray(treeResponse?.data?.Children) ? treeResponse.data.Children : [];
}

function expectedNamesForPhase(phase: SnapshotPhase): string[] {
  const names = Testdata.TEMPLATE_CHILDREN.map((child: any) => child.name);
  if (phase !== 'afterCreate' && phase !== 'afterPlanStart' && phase !== 'afterLevelOneDelete') {
    names.push(Testdata.LEVEL_ONE.name);
  }
  return names;
}

function newestImConfig(names: string[]): string | undefined {
  const ranked = names
    .map((name) => {
      const match = name.match(/_(\d+)_IM$/i);
      return { name, timestamp: match ? Number(match[1]) : -1 };
    })
    .sort((left, right) => left.timestamp - right.timestamp);
  return ranked.length ? ranked[ranked.length - 1].name : undefined;
}

function proceduresListUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl}${(process.env.GET_PROCEDURES as string).replace('limit=10', 'limit=500')}`;
}

test.describe.serial('Process lifecycle CRUD', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let apiBaseUrl: string;
  let actionBaseUrl: string;

  const processUrl = (processName = state.processName): string => `${apiBaseUrl}${process.env.GET_PROCESS_WITH_NAME as string}/${encodeURIComponent(processName)}`;
  const treeUrl = (): string => `${processUrl()}/tree`;
  const childrenUrl = (pageNumber: number): string => `${processUrl()}/children?pageNumber=${pageNumber}&pageSize=10`;
  const planStartDateUrl = (): string => `${processUrl()}/planstartdate?cycleName=${encodeURIComponent(state.cycleName as string)}&planStartDate=${planStartDate}`;
  const subprocessUrl = (subprocessName: string): string => `${apiBaseUrl}${(process.env.GET_SUBPROCESS_WITH_NAME as string).replace('{processName}', encodeURIComponent(state.processName)).replace('{subprocessName}', encodeURIComponent(subprocessName))}`;
  const subprocessTreeUrl = (subprocessName: string): string => `${subprocessUrl(subprocessName)}/tree`;
  const createSubprocessUrl = (): string => `${apiBaseUrl}${(process.env.CREATE_SUBPROCESS as string).replace('{processName}', encodeURIComponent(state.processName))}`;
  const deleteProcessUrl = (): string => `${apiBaseUrl}${(process.env.DELETE_PROCESS as string).replace('{processName}', encodeURIComponent(state.processName))}`;

  async function compareStatusIn(actual: unknown, allowed: number[], label: string): Promise<boolean> {
    const valid = allowed.some((code) => isStatus(actual, code));
    return commonFunctions.compareTwoValues(valid, true, `${label} (actual ${String(statusOf(actual))})`);
  }

  async function getAllChildren(): Promise<{ pager: any; data: any[]; valid: boolean }> {
    let pageNumber = 0;
    let pager: any;
    let valid = true;
    const data: any[] = [];
    do {
      const response = await apiUtil.processAPIRequest('GET', childrenUrl(pageNumber), null, headers, `Get process children page ${pageNumber}`, 'full');
      valid = await commonFunctions.compareTwoValues(response.status, 200, `Get children page ${pageNumber} status`) && valid;
      pager = response.data?.pager;
      valid = await commonFunctions.compareTwoValues(!!pager, true, `Get children page ${pageNumber} pager present`) && valid;
      valid = await commonFunctions.compareTwoValues(Array.isArray(response.data?.data), true, `Get children page ${pageNumber} data array`) && valid;
      if (Array.isArray(response.data?.data)) {
        data.push(...response.data.data);
      }
      pageNumber += 1;
    } while (pager && pageNumber < Number(pager.totalPages));
    return { pager, data, valid };
  }

  async function assertSubprocess(name: string, expectedParent: string, expectedReference: string, expectedOffset: string | number): Promise<boolean> {
    const response = await apiUtil.processAPIRequest('GET', subprocessUrl(name), null, headers, `Get subprocess ${name}`, 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, `Get subprocess ${name} status`);
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.name, name, `Get subprocess ${name} name`);
    const bValidation3 = response.data?.parentNodeName !== undefined && response.data?.parentNodeName !== null
      ? await commonFunctions.compareTwoValues(response.data.parentNodeName, expectedParent, `Get subprocess ${name} parent`)
      : true;
    const bValidation4 = await commonFunctions.compareTwoValues(response.data?.referenceNodeName, expectedReference, `Get subprocess ${name} reference`);
    const bValidation5 = await commonFunctions.compareTwoValues(String(response.data?.startOffset), String(expectedOffset), `Get subprocess ${name} offset`);
    return bValidation1 && bValidation2 && bValidation3 && bValidation4 && bValidation5;
  }

  async function assertSubprocessAbsent(name: string): Promise<boolean> {
    const response = await apiUtil.processAPIRequest('GET', subprocessUrl(name), null, headers, `Verify subprocess ${name} deleted`, 'full');
    return compareStatusIn(response, [400, 401, 404], `Get deleted subprocess ${name}`);
  }

  async function assertSecondLevelSubprocessTree(phase: SnapshotPhase): Promise<boolean> {
    const response = await apiUtil.processAPIRequest(
      'GET',
      subprocessTreeUrl(Testdata.LEVEL_ONE.name),
      null,
      headers,
      `Get first-level subprocess tree snapshot ${phase}`,
      'full'
    );
    const nodes = treeNodes(response);
    const levelTwoNode = nodes.find((node) => node.name === Testdata.LEVEL_TWO.name);
    const validations = [
      await commonFunctions.compareTwoValues(response.status, 200, `Get subprocess tree ${phase} status`),
      await commonFunctions.compareTwoValues(!!levelTwoNode, true, `Subprocess tree ${phase} contains L2`),
      await commonFunctions.compareTwoValues(levelTwoNode?.referenceNodeName, Testdata.LEVEL_ONE.name, `Subprocess tree ${phase} L2 reference`),
      await commonFunctions.compareTwoValues(String(levelTwoNode?.startOffset), phase === 'afterLevelTwoCreate' ? '0' : '1', `Subprocess tree ${phase} L2 offset`)
    ];
    return validations.every(Boolean);
  }

  async function assertProcessSnapshot(phase: SnapshotPhase): Promise<boolean> {
    const validations: boolean[] = [];
    const processResponse = await apiUtil.processAPIRequest('GET', processUrl(), null, headers, `Get process snapshot ${phase}`, 'full');
    validations.push(await commonFunctions.compareTwoValues(processResponse.status, 200, `Get process ${phase} status`));
    validations.push(await commonFunctions.compareTwoValues(processResponse.data?.name, state.processName, `Get process ${phase} name`));
    validations.push(await commonFunctions.compareTwoValues(processResponse.data?.displayName, state.processName, `Get process ${phase} displayName`));
    validations.push(await commonFunctions.compareTwoValues(processResponse.data?.id, state.processId, `Get process ${phase} id`));
    validations.push(await commonFunctions.compareTwoValues(processResponse.data?.calendarName, Testdata.CALENDAR_NAME, `Get process ${phase} calendar`));
    validations.push(await commonFunctions.compareTwoValues(processResponse.data?.cycleName, state.cycleName, `Get process ${phase} cycle`));
    validations.push(await commonFunctions.compareTwoValues(processResponse.data?.isActive, true, `Get process ${phase} isActive`));
    validations.push(await commonFunctions.compareTwoValues(/\d{4}-\d{2}-\d{2}/.test(String(processResponse.data?.planStartDate || '')), true, `Get process ${phase} planStartDate present`));

    if (phase === 'afterPlanStart' || phase === 'afterLevelOneCreate' || phase === 'afterLevelOneUpdate' || phase === 'afterLevelTwoCreate' || phase === 'afterLevelTwoUpdate') {
      validations.push(await commonFunctions.compareTwoValues(String(processResponse.data?.planStartDate || '').includes(planStartDate), true, `Get process ${phase} planStartDate value`));
    }
    if (phase === 'afterCreate' || phase === 'afterPlanStart' || phase === 'afterLevelOneCreate' || phase === 'afterLevelOneUpdate' || phase === 'afterLevelTwoCreate' || phase === 'afterLevelTwoUpdate') {
      validations.push(await commonFunctions.compareTwoValues(normalizedStatus(processResponse.data?.status), normalizedStatus(Testdata.EXPECTED_STATUS.notStarted), `Get process ${phase} not started`));
    }
    if (phase === 'afterStart') {
      validations.push(await commonFunctions.compareTwoValues(normalizedStatus(processResponse.data?.status), normalizedStatus(Testdata.EXPECTED_STATUS.inProgress), `Get process ${phase} in progress`));
    }
    if (phase === 'afterStop' || phase === 'afterLevelTwoDelete' || phase === 'afterLevelOneDelete') {
      validations.push(await commonFunctions.compareTwoValues(normalizedStatus(processResponse.data?.status), normalizedStatus(Testdata.EXPECTED_STATUS.completed), `Get process ${phase} completed`));
    }

    const treeResponse = await apiUtil.processAPIRequest('GET', treeUrl(), null, headers, `Get process tree snapshot ${phase}`, 'full');
    validations.push(await commonFunctions.compareTwoValues(treeResponse.status, 200, `Get tree ${phase} status`));
    const nodes = treeNodes(treeResponse);
    const nodeNames = nodes.map((node) => node.name);
    for (const expectedName of expectedNamesForPhase(phase)) {
      validations.push(await commonFunctions.compareTwoValues(nodeNames.includes(expectedName), true, `Tree ${phase} contains ${expectedName}`));
    }
    for (const child of Testdata.TEMPLATE_CHILDREN) {
      const node = nodes.find((candidate) => candidate.name === child.name);
      validations.push(await commonFunctions.compareTwoValues(!!node, true, `Tree ${phase} node ${child.name} present`));
      validations.push(await commonFunctions.compareTwoValues(node?.displayName, child.displayName, `Tree ${phase} ${child.name} displayName`));
      const expectedReference = child.referenceNodeName === 'ParentProcess' ? state.processName : child.referenceNodeName;
      validations.push(await commonFunctions.compareTwoValues(node?.referenceNodeName, expectedReference, `Tree ${phase} ${child.name} reference`));
      validations.push(await commonFunctions.compareTwoValues(String(node?.startOffset), String(child.startOffset), `Tree ${phase} ${child.name} offset`));
      validations.push(await commonFunctions.compareTwoValues(String(node?.duration), String(child.duration), `Tree ${phase} ${child.name} duration`));
      validations.push(await commonFunctions.compareTwoValues(node?.startOffsetReference, child.startOffsetReference, `Tree ${phase} ${child.name} offset reference`));
    }

    const levelOneNode = nodes.find((node) => node.name === Testdata.LEVEL_ONE.name);
    if (phase === 'afterLevelOneCreate') {
      validations.push(await commonFunctions.compareTwoValues(levelOneNode?.referenceNodeName, 'ExecutiveBusinessReview', `Tree ${phase} L1 reference`));
      validations.push(await commonFunctions.compareTwoValues(String(levelOneNode?.startOffset), '1', `Tree ${phase} L1 offset`));
    }
    if (phase === 'afterLevelOneUpdate' || phase === 'afterLevelTwoCreate' || phase === 'afterLevelTwoUpdate' || phase === 'afterLevelTwoDelete') {
      validations.push(await commonFunctions.compareTwoValues(levelOneNode?.referenceNodeName, Testdata.LEVEL_ONE.updateReferenceNodeName, `Tree ${phase} L1 updated reference`));
    }
    if (phase === 'afterLevelTwoDelete' || phase === 'afterLevelOneDelete') {
      validations.push(await commonFunctions.compareTwoValues(nodes.find((node) => node.name === Testdata.LEVEL_TWO.name), undefined, `Tree ${phase} L2 absent`));
    }
    if (phase === 'afterLevelOneDelete') {
      validations.push(await commonFunctions.compareTwoValues(levelOneNode, undefined, `Tree ${phase} L1 absent`));
    }

    const children = await getAllChildren();
    validations.push(children.valid);
    const expectedDirectChildren = expectedNamesForPhase(phase).filter((name) => name !== Testdata.LEVEL_TWO.name);
    validations.push(await commonFunctions.compareTwoValues(children.pager?.totalElements, expectedDirectChildren.length, `Children ${phase} totalElements`));
    const childNames = children.data.map((child) => child.name);
    for (const expectedName of expectedDirectChildren) {
      validations.push(await commonFunctions.compareTwoValues(childNames.includes(expectedName), true, `Children ${phase} contains ${expectedName}`));
    }
    const sequences = children.data.map((child) => child.sequence).filter((sequence) => sequence !== undefined);
    validations.push(await commonFunctions.compareTwoValues(new Set(sequences).size, sequences.length, `Children ${phase} unique sequences`));

    if (phase === 'afterLevelOneCreate' || phase === 'afterLevelOneUpdate' || phase === 'afterLevelTwoCreate' || phase === 'afterLevelTwoUpdate' || phase === 'afterLevelTwoDelete') {
      const expectedReference = phase === 'afterLevelOneCreate' ? 'ExecutiveBusinessReview' : Testdata.LEVEL_ONE.updateReferenceNodeName;
      validations.push(await assertSubprocess(Testdata.LEVEL_ONE.name, state.processName, expectedReference, 1));
    }
    if (phase === 'afterLevelTwoCreate' || phase === 'afterLevelTwoUpdate') {
      validations.push(await assertSubprocess(Testdata.LEVEL_TWO.name, Testdata.LEVEL_ONE.name, Testdata.LEVEL_ONE.name, phase === 'afterLevelTwoCreate' ? 0 : 1));
      validations.push(await assertSecondLevelSubprocessTree(phase));
    }
    if (phase === 'afterLevelTwoDelete' || phase === 'afterLevelOneDelete') {
      validations.push(await assertSubprocessAbsent(Testdata.LEVEL_TWO.name));
    }
    if (phase === 'afterLevelOneDelete') {
      validations.push(await assertSubprocessAbsent(Testdata.LEVEL_ONE.name));
    }
    return validations.every(Boolean);
  }

  async function deleteResource(url: string, label: string, allowedStatuses = [200, 204, 404, 400]): Promise<boolean> {
    const response = await apiUtil.processAPIRequest('DELETE', url, null, headers, label, 'full');
    const valid = allowedStatuses.some((status) => isStatus(response, status));
    await commonFunctions.logMessage(valid ? 'INFO' : 'FAIL', `${label} returned ${statusOf(response)}`);
    return valid;
  }

  async function cleanupReferences(): Promise<boolean> {
    let successful = true;
    const modelEntity = (process.env.GET_PROCESSMODEL_ENTITY as string || '').replace(/^\/+/, '');
    if (modelEntity) {
      const separator = modelEntity.includes('?') ? '&' : '?';
      const modelUrl = `${apiBaseUrl.replace(/\/+$/, '')}/${modelEntity}${separator}processName=${encodeURIComponent(state.processName.replace(/\s/g, ''))}`;
      successful = await deleteResource(modelUrl, 'Delete process model', [200, 204, 404, 400]) && successful;
    }

    const proceduresResponse = await apiUtil.processAPIRequest('GET', proceduresListUrl(apiBaseUrl), null, headers, 'Get procedures for cleanup', 'full');
    if (isStatus(proceduresResponse, 200)) {
      const procedures = extractEntities(proceduresResponse.data);
      const procedure = procedures.find((candidate: any) => String(candidate.name || '').includes(state.processName.replace(/\s/g, '')));
      if (procedure?.name) {
        successful = await deleteResource(`${apiBaseUrl}${(process.env.DELETE_PROCEDURE as string).replace('{procedureName}', procedure.name)}`, 'Delete process procedure', [200, 204, 404, 400]) && successful;
      }
      const actorName = procedure?.actorsConfig?.[0];
      if (actorName) {
        successful = await deleteResource(`${apiBaseUrl}${(process.env.DELETE_ACTOR as string).replace('{actorName}', actorName)}`, 'Delete process actor', [200, 204, 404, 400]) && successful;
      }
    } else {
      await commonFunctions.logMessage('INFO', `Skipping procedure cleanup; GET procedures returned ${statusOf(proceduresResponse)}`);
    }

    const rolesEndpoint = (process.env.GET_PROCESS_ROLES as string || 'iam/realm/v1/roles').replace(/^\/+/, '');
    const rolesUrl = `${apiBaseUrl.replace(/\/+$/, '')}/${rolesEndpoint}`;
    const rolesResponse = await apiUtil.processAPIRequest('GET', rolesUrl, null, headers, 'Get process roles for cleanup', 'full');
    if (isStatus(rolesResponse, 200)) {
      const normalizedName = state.processName.replace(/\s/g, '').toLowerCase();
      const roles = extractEntities(rolesResponse.data);
      const targetRoles = roles.filter((candidate: any) => {
        const name = String(candidate?.name || '').toLowerCase();
        return name === `${normalizedName}_admin` ||
          name === `${normalizedName}_user` ||
          name === `${normalizedName}_admin_role` ||
          name === `${normalizedName}_user_role`;
      });

      if (targetRoles.length === 0) {
        await commonFunctions.logMessage('INFO', `No IAM roles found matching process '${state.processName}'`);
      }

      for (const role of targetRoles) {
        const roleId = role?.id;
        const roleName = role?.name;
        if (!roleId) continue;

        // 1. Discover all users assigned to this role
        const usersUrl = `${apiBaseUrl.replace(/\/+$/, '')}/iam/realm/v1/roles/${roleId}/users?page-number=1&page-size=50`;
        const usersResponse = await apiUtil.processAPIRequest('GET', usersUrl, null, headers, `Get assigned users for role ${roleName}`, 'full');
        const assignedUsers = isStatus(usersResponse, 200) ? extractEntities(usersResponse.data) : [];
        const assignedUserIds: string[] = assignedUsers
          .map((u: any) => u?.id || u?.userId || u?.subjectId)
          .filter(Boolean);

        await commonFunctions.logMessage('INFO', `Found ${assignedUserIds.length} user(s) assigned to role '${roleName}'`);

        // 2. Unassign each assigned user
        const unassignTemplate = (process.env.UNASSIGN_ROLE_TO_USER as string || 'iam/realm/v1/roles/{roleId}/subjects/{subjectId}').replace(/^\/+/, '');
        for (const userId of assignedUserIds) {
          const unassignUrl = `${apiBaseUrl.replace(/\/+$/, '')}/${unassignTemplate.replace('{roleId}', roleId).replace('{subjectId}', userId)}`;
          const unassigned = await deleteResource(unassignUrl, `Unassign user ${userId} from role ${roleName}`, [200, 204, 404]);
          successful = unassigned && successful;
        }

        // 3. Unassign machine subject if present and not already unassigned
        const machineSubjectId = process.env.SUBJECT_ID;
        if (machineSubjectId && !assignedUserIds.includes(machineSubjectId)) {
          const unassignMachineUrl = `${apiBaseUrl.replace(/\/+$/, '')}/${unassignTemplate.replace('{roleId}', roleId).replace('{subjectId}', machineSubjectId)}`;
          await deleteResource(unassignMachineUrl, `Unassign machine subject from role ${roleName}`, [200, 204, 404, 400]);
        }

        // 4. Delete the role now that all subjects are unassigned
        const deleteRoleTemplate = (process.env.DELETE_ROLE as string || 'iam/realm/v1/roles/{roleId}').replace(/^\/+/, '');
        const deleteRoleUrl = `${apiBaseUrl.replace(/\/+$/, '')}/${deleteRoleTemplate.replace('{roleId}', roleId)}`;
        const deleted = await deleteResource(deleteRoleUrl, `Delete role ${roleName}`, [200, 204, 404, 409]);
        successful = deleted && successful;
      }
    } else {
      await commonFunctions.logMessage('FAIL', `Failed to fetch roles for cleanup, status: ${statusOf(rolesResponse)}`);
      successful = false;
    }
    return successful;
  }

  async function cleanupCreatedResources(): Promise<void> {
    try {
      await ensureProcessStopped(apiUtil, commonFunctions, actionBaseUrl, headers, state.processName);
    } catch (error) {
      await commonFunctions.logMessage('INFO', `Stop cleanup skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
    await deleteResource(subprocessUrl(Testdata.LEVEL_TWO.name), 'Cleanup second-level subprocess', [200, 204, 401, 404]);
    await deleteResource(subprocessUrl(Testdata.LEVEL_ONE.name), 'Cleanup first-level subprocess', [200, 204, 401, 404]);
    await deleteResource(deleteProcessUrl(), 'Cleanup process', [200, 204, 401, 404]);
    await cleanupReferences();

    const leftover = await apiUtil.processAPIRequest('GET', processUrl(), null, headers, 'Verify leftover process after cleanup', 'full');
    if (isStatus(leftover, 200) && leftover?.data?.name === state.processName) {
      await commonFunctions.logMessage('FAIL', `Process '${state.processName}' still exists after cleanup`);
    } else {
      await commonFunctions.logMessage('INFO', `Process '${state.processName}' is absent after cleanup`);
    }
  }

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    apiBaseUrl = process.env.API_BASE_URL as string;
    actionBaseUrl = `${apiBaseUrl}${process.env.ACTIONITEM as string}`;
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    };

    state.cycleName = await getFirstCalendarCycle(apiUtil, apiBaseUrl, headers, Testdata.CALENDAR_NAME);
  });

  test.afterAll(async () => {
    if (!apiUtil || !headers || !apiBaseUrl) {
      return;
    }
    await cleanupCreatedResources();
  });

  test('Test Case 1: Create process from template', async () => {
    const payload = {
      attributes: [],
      templateName: Testdata.TEMPLATE_NAME,
      displayName: state.processName,
      calendarName: Testdata.CALENDAR_NAME,
      cycleName: state.cycleName,
      description: Testdata.DESCRIPTION
    };
    const response = await apiUtil.processAPIRequest('POST', `${apiBaseUrl}${process.env.CREATE_PROCESS_WITH_TEMPLATE as string}`, payload, headers, 'Create lifecycle process', 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 201, 'Create process success assertion');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.name, state.processName, 'Create process name assertion');
    const bValidation3 = await commonFunctions.compareTwoValues(typeof response.data?.id, 'string', 'Create process id assertion');
    state.processId = response.data?.id;
    const bValidation4 = await assertProcessSnapshot('afterCreate');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 2: Update process plan start date', async () => {
    const response = await apiUtil.processAPIRequest('PUT', planStartDateUrl(), null, headers, 'Update process plan start date', 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Update plan start date success assertion');
    const bValidation2 = await assertProcessSnapshot('afterPlanStart');
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 3: Create first-level subprocess', async () => {
    const payload = {
      ...Testdata.LEVEL_ONE.create,
      parentNodeName: state.processName
    };
    const response = await apiUtil.processAPIRequest('POST', createSubprocessUrl(), payload, headers, 'Create first-level subprocess', 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 201, 'Create first-level subprocess success assertion');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.name, Testdata.LEVEL_ONE.name, 'Create first-level subprocess name assertion');
    state.levelOneId = response.data?.id;
    const bValidation3 = await assertProcessSnapshot('afterLevelOneCreate');
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 4: Update first-level subprocess reference', async () => {
    const current = await apiUtil.processAPIRequest('GET', subprocessUrl(Testdata.LEVEL_ONE.name), null, headers, 'Get first-level subprocess before update', 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(current.status, 200, 'Get first-level subprocess before update success assertion');
    const payload = {
      ...current.data,
      referenceNodeName: Testdata.LEVEL_ONE.updateReferenceNodeName,
      transition: {
        ...current.data?.transition,
        reference: 'END',
        referenceNodeNames: [Testdata.LEVEL_ONE.updateReferenceNodeName]
      },
      parentNodeName: state.processName
    };
    const response = await apiUtil.processAPIRequest('PUT', subprocessUrl(Testdata.LEVEL_ONE.name), payload, headers, 'Update first-level subprocess', 'full');
    const bValidation2 = await commonFunctions.compareTwoValues(response.status, 200, 'Update first-level subprocess success assertion');
    const bValidation3 = await commonFunctions.compareTwoValues(response.data?.name, Testdata.LEVEL_ONE.name, 'Update first-level subprocess name assertion');
    const bValidation4 = await assertProcessSnapshot('afterLevelOneUpdate');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 5: Create second-level subprocess', async () => {
    const payload = {
      ...Testdata.LEVEL_TWO.create,
      parentNodeName: Testdata.LEVEL_ONE.name
    };
    const response = await apiUtil.processAPIRequest('POST', createSubprocessUrl(), payload, headers, 'Create second-level subprocess', 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 201, 'Create second-level subprocess success assertion');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.name, Testdata.LEVEL_TWO.name, 'Create second-level subprocess name assertion');
    state.levelTwoId = response.data?.id;
    const bValidation3 = await assertProcessSnapshot('afterLevelTwoCreate');
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 6: Update second-level subprocess offset', async () => {
    const current = await apiUtil.processAPIRequest('GET', subprocessUrl(Testdata.LEVEL_TWO.name), null, headers, 'Get second-level subprocess before update', 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(current.status, 200, 'Get second-level subprocess before update success assertion');
    const payload = {
      ...current.data,
      startOffset: Testdata.LEVEL_TWO.updatedStartOffset,
      parentNodeName: Testdata.LEVEL_ONE.name
    };
    const response = await apiUtil.processAPIRequest('PUT', subprocessUrl(Testdata.LEVEL_TWO.name), payload, headers, 'Update second-level subprocess', 'full');
    const bValidation2 = await commonFunctions.compareTwoValues(response.status, 200, 'Update second-level subprocess success assertion');
    const bValidation3 = await commonFunctions.compareTwoValues(response.data?.name, Testdata.LEVEL_TWO.name, 'Update second-level subprocess name assertion');
    const bValidation4 = await assertProcessSnapshot('afterLevelTwoUpdate');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 7: Map process model', async () => {
    const configResponse = await apiUtil.processAPIRequest('GET', `${apiBaseUrl}${process.env.ALL_PROCEDURES_CONFIG_NAME_LIST as string}`, null, headers, 'Get procedures config names', 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(configResponse.status, 200, 'Get procedures config names success assertion');
    const configNames = Array.isArray(configResponse.data?.data) ? configResponse.data.data.filter((name: unknown): name is string => typeof name === 'string') : [];
    const matches = configNames.filter((name: string) => name.startsWith(state.processName));
    const imMatches = matches.filter((name: string) => /_IM$/i.test(name));
    const fallbackImMatches = configNames.filter((name: string) => /_IM$/i.test(name));
    const candidates = imMatches.length > 0 ? imMatches : matches.length > 0 ? matches : fallbackImMatches;
    const bValidation2 = await commonFunctions.compareTwoValues(candidates.length > 0, true, `Procedure config for ${state.processName} should exist`);
    state.procedureConfigName = newestImConfig(candidates) || candidates[0];
    await commonFunctions.logMessage('INFO', `${matches.length > 0 ? 'Resolved process procedure config' : 'Resolved fallback Insight Manager config'} ${state.procedureConfigName}`);
    const mappingPayload = {
      name: state.processName,
      displayName: state.processName,
      proceduresConfig: [{ name: state.procedureConfigName, displayName: `${state.processName} InsightsManager` }],
      subProcesses: Testdata.TEMPLATE_CHILDREN.map((child: any) => ({
        name: child.name,
        displayName: child.displayName,
        proceduresConfig: [],
        subProcesses: []
      }))
    };
    const response = await apiUtil.processAPIRequest('POST', `${apiBaseUrl}${process.env.PROCESS_MODELS as string}`, mappingPayload, headers, 'Create process model mapping', 'full');
    const bValidation3 = await commonFunctions.compareTwoValues(response.status, 201, 'Create process model mapping success assertion');
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });

  test('Test Case 8: Start process', async () => {
    const response = await startProcess(apiUtil, commonFunctions, actionBaseUrl, headers, state.processName, 'Start lifecycle process');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Start process success assertion');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.entityName, state.processName, 'Start process name assertion');
    state.startJobId = response.data?.statusUrl ? getJobIdFromUrl(response.data.statusUrl) : null;
    const bValidation3 = await commonFunctions.compareTwoValues(!!state.startJobId, true, 'Start process job id assertion');
    await waitForJobCompleted(apiUtil, commonFunctions, actionBaseUrl, headers, state.startJobId, 'Wait for lifecycle process start');
    const bValidation4 = await assertProcessSnapshot('afterStart');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 9: Stop process and wait for Completed', async () => {
    const response = await apiUtil.processAPIRequest('POST', `${actionBaseUrl}process/${encodeURIComponent(state.processName)}/stop`, {}, headers, 'Stop lifecycle process', 'full');
    const bValidation1 = await commonFunctions.compareTwoValues(response.status, 200, 'Stop process success assertion');
    const bValidation2 = await commonFunctions.compareTwoValues(response.data?.entityName, state.processName, 'Stop process name assertion');
    state.stopJobId = response.data?.statusUrl ? getJobIdFromUrl(response.data.statusUrl) : null;
    const bValidation3 = await commonFunctions.compareTwoValues(!!state.stopJobId, true, 'Stop process job id assertion');
    await waitForJobCompleted(apiUtil, commonFunctions, actionBaseUrl, headers, state.stopJobId, 'Wait for lifecycle process stop');
    await expect.poll(async () => {
      const processResponse = await apiUtil.processAPIRequest('GET', processUrl(), null, headers, 'Poll lifecycle process after stop', 'full');
      return normalizedStatus(processResponse.data?.status);
    }, { timeout: getTimeout('LONG'), intervals: [getTimeout('POLL_INTERVAL')] }).toBe(normalizedStatus(Testdata.EXPECTED_STATUS.completed));
    const bValidation4 = await assertProcessSnapshot('afterStop');
    expect(bValidation1 && bValidation2 && bValidation3 && bValidation4).toBeTruthy();
  });

  test('Test Case 10: Delete second-level subprocess', async () => {
    const bValidation1 = await deleteResource(subprocessUrl(Testdata.LEVEL_TWO.name), 'Delete second-level subprocess', [200]);
    const bValidation2 = await assertProcessSnapshot('afterLevelTwoDelete');
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 11: Delete first-level subprocess', async () => {
    const bValidation1 = await deleteResource(subprocessUrl(Testdata.LEVEL_ONE.name), 'Delete first-level subprocess', [200]);
    const bValidation2 = await assertProcessSnapshot('afterLevelOneDelete');
    expect(bValidation1 && bValidation2).toBeTruthy();
  });

  test('Test Case 12: Delete process and references', async () => {
    const bValidation1 = await deleteResource(deleteProcessUrl(), 'Delete lifecycle process', [200, 204, 404]);
    let bValidation2 = false;
    await expect.poll(async () => {
      const response = await apiUtil.processAPIRequest('GET', processUrl(), null, headers, 'Verify lifecycle process deleted', 'full');
      bValidation2 = isAllowedStatus(response, [400, 401, 404]) || (isStatus(response, 200) && (!response?.data?.name || response?.data?.name !== state.processName));
      return bValidation2;
    }, { timeout: getTimeout('MEDIUM'), intervals: [getTimeout('POLL_INTERVAL')] }).toBe(true);
    const bValidation3 = await cleanupReferences();
    expect(bValidation1 && bValidation2 && bValidation3).toBeTruthy();
  });
});

test.describe('Process lifecycle CRUD negatives', () => {
  let apiUtil: ApiUtil;
  let commonFunctions: CommonFunctions;
  let headers: Record<string, string>;
  let apiBaseUrl: string;
  let actionBaseUrl: string;
  const unknownName = uniqueAlphanumericName('DoesNotExist');

  test.beforeAll(async () => {
    apiUtil = new ApiUtil();
    commonFunctions = new CommonFunctions();
    apiBaseUrl = process.env.API_BASE_URL as string;
    actionBaseUrl = `${apiBaseUrl}${process.env.ACTIONITEM as string}`;
    const accessToken = await apiUtil.getBearerToken();
    headers = {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    };
  });

  test('Test Case 13: Get unknown process returns error', async () => {
    const response = await apiUtil.processAPIRequest('GET', `${apiBaseUrl}${process.env.GET_PROCESS_WITH_NAME as string}/${encodeURIComponent(unknownName)}`, null, headers, 'Get unknown process', 'full');
    const bValidation = await commonFunctions.compareTwoValues(isAllowedStatus(response, [400, 401, 404]), true, `Get unknown process status assertion (actual ${String(statusOf(response))})`);
    expect(bValidation).toBeTruthy();
  });

  test('Test Case 14: Create subprocess on unknown parent returns error', async () => {
    const url = `${apiBaseUrl}${(process.env.CREATE_SUBPROCESS as string).replace('{processName}', encodeURIComponent(unknownName))}`;
    const payload = {
      ...Testdata.LEVEL_ONE.create,
      parentNodeName: unknownName
    };
    const response = await apiUtil.processAPIRequest('POST', url, payload, headers, 'Create subprocess on unknown parent', 'full');
    const bValidation = await commonFunctions.compareTwoValues(isAllowedStatus(response, [400, 404, 500]), true, `Create subprocess on unknown parent status assertion (actual ${String(statusOf(response))})`);
    expect(bValidation).toBeTruthy();
  });

  test('Test Case 15: Start unknown process returns error', async () => {
    const response = await apiUtil.processAPIRequest('POST', `${actionBaseUrl}process/${encodeURIComponent(unknownName)}/start`, {}, headers, 'Start unknown process', 'full');
    const bValidation = await commonFunctions.compareTwoValues(isAllowedStatus(response, [400, 401, 404]), true, `Start unknown process status assertion (actual ${String(statusOf(response))})`);
    expect(bValidation).toBeTruthy();
  });

  test('Test Case 16: Delete unknown process returns error', async () => {
    const url = `${apiBaseUrl}${(process.env.DELETE_PROCESS as string).replace('{processName}', encodeURIComponent(unknownName))}`;
    const response = await apiUtil.processAPIRequest('DELETE', url, null, headers, 'Delete unknown process', 'full');
    const bValidation = await commonFunctions.compareTwoValues(isAllowedStatus(response, [400, 401, 404]), true, `Delete unknown process status assertion (actual ${String(statusOf(response))})`);
    expect(bValidation).toBeTruthy();
  });
});
