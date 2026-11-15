import { ApiUtil } from './api.util';
import { CommonFunctions } from './common.util';
import { processOrchestrationUrl } from './action-item.util';
import { getConfig, endpoint } from '../configs/env';

export type TemplateProcessRequest = { processName: string; templateName: string; calendarName: string; cycleName: string; description: string };

const isStatus = (response: any, code: number): boolean => response?.status === code || response?.status === String(code);

// RBAC-guarded PO process routes answer a process or sub process that no longer exists with 401 IBP_40_1032, not 404.
export const isAbsentOnRbacRoute = (response: any): boolean => isStatus(response, 401) && response?.data?.errorCode === 'IBP_40_1032';

// A client that passes the RBAC check reaches the delete stored procedure instead, which THROWs 'Process or node does not
// exists' for a missing node (delete-node-by-name.xml); the service wraps it as 500 IBP_PO_50_2098 (Gravitee pspoat-test1).
const isMissingNodeOnDelete = (response: any): boolean =>
  isStatus(response, 500) && response?.data?.errorCode === 'IBP_PO_50_2098' && /does not exist/i.test(String(response?.data?.message || ''));

function apiUrl(route: string): string {
  return `${(getConfig().hosts.api as string).replace(/\/+$/, '')}/${route.replace(/^\/+/, '')}`;
}

function entitiesOf(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.entities)) return payload.entities;
  if (Array.isArray(payload?.data?.entities)) return payload.data.entities;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

// Creates a process from a template; the service also creates its IAM roles and Insight Manager procedure.
export async function createProcessFromTemplate(apiUtil: ApiUtil, headers: Record<string, string>, request: TemplateProcessRequest): Promise<any> {
  const body = { attributes: [], templateName: request.templateName, displayName: request.processName, calendarName: request.calendarName, cycleName: request.cycleName, description: request.description };
  return apiUtil.processAPIRequest('POST', apiUrl(endpoint('CREATE_PROCESS_WITH_TEMPLATE')), body, headers, `Create process ${request.processName} from template`, 'full');
}

// Deletes a template process and what the template created for it (process model, procedure, actor, IAM roles); every step tolerates 404.
// `extraSubjectIds` (e.g. a spec's own test subject) are unassigned from the process roles too, in case the role user lookup misses them.
export async function deleteProcessWithReferences(apiUtil: ApiUtil, commonFunctions: CommonFunctions, headers: Record<string, string>, processName: string, extraSubjectIds: Array<string | undefined> = []): Promise<boolean> {
  const results: boolean[] = [];
  const remove = async (url: string, label: string, allowed: number[], absentOnPoErrors = false): Promise<void> => {
    const response = await apiUtil.processAPIRequest('DELETE', url, null, headers, label, 'full');
    const ok = allowed.some((code) => isStatus(response, code)) || (absentOnPoErrors && (isAbsentOnRbacRoute(response) || isMissingNodeOnDelete(response)));
    await commonFunctions.logMessage(ok ? 'INFO' : 'WARNING', `${label} returned ${response?.status}`);
    results.push(ok);
  };
  // A failed lookup would otherwise look like "nothing to delete".
  const discover = async (url: string, label: string): Promise<any[]> => {
    const response = await apiUtil.processAPIRequest('GET', url, null, headers, label, 'full');
    const ok = isStatus(response, 200);
    if (!ok) {
      await commonFunctions.logMessage('WARNING', `${label} returned ${response?.status}`);
    }
    results.push(ok);
    return ok ? entitiesOf(response.data) : [];
  };
  const compactName = processName.replace(/\s/g, '');

  await remove(processOrchestrationUrl(`process/${encodeURIComponent(processName)}`), `Delete process ${processName}`, [200, 204, 404], true);

  const modelEntity = (getConfig().endpoints.GET_PROCESSMODEL_ENTITY || '').replace(/^\/+/, '');
  if (modelEntity) {
    await remove(apiUrl(`${modelEntity}${modelEntity.includes('?') ? '&' : '?'}processName=${encodeURIComponent(compactName)}`), 'Delete process model', [200, 204, 400, 404]);
  }

  const procedures = await discover(apiUrl(endpoint('GET_PROCEDURES').replace('limit=10', 'limit=500')), 'Get procedures for cleanup');
  const procedure = procedures.find((candidate: any) => String(candidate?.name || '').includes(compactName));
  if (procedure?.name) {
    await remove(apiUrl(endpoint('DELETE_PROCEDURE').replace('{procedureName}', procedure.name)), 'Delete process procedure', [200, 204, 400, 404]);
  }
  if (procedure?.actorsConfig?.[0]) {
    await remove(apiUrl(endpoint('DELETE_ACTOR').replace('{actorName}', procedure.actorsConfig[0])), 'Delete process actor', [200, 204, 400, 404]);
  }

  const roles = await discover(apiUrl(getConfig().endpoints.GET_PROCESS_ROLES || 'iam/realm/v1/roles'), 'Get IAM roles for cleanup');
  const roleNames = ['admin', 'user', 'admin_role', 'user_role'].map((suffix) => `${compactName.toLowerCase()}_${suffix}`);
  const unassignTemplate = getConfig().endpoints.UNASSIGN_ROLE_TO_USER || 'iam/realm/v1/roles/{roleId}/subjects/{subjectId}';
  for (const role of roles.filter((candidate: any) => roleNames.includes(String(candidate?.name || '').toLowerCase()))) {
    const subjectIds = new Set<string>([getConfig().subjectId, ...extraSubjectIds].filter((id): id is string => !!id));
    const pageSize = 50;
    // Capped in case the endpoint ignores paging and keeps returning a full page.
    for (let pageNumber = 1; pageNumber <= 20; pageNumber++) {
      const users = await discover(apiUrl(`iam/realm/v1/roles/${role.id}/users?page-number=${pageNumber}&page-size=${pageSize}`), `Get users of role ${role.name} (page ${pageNumber})`);
      for (const user of users) {
        const id = user?.id || user?.userId || user?.subjectId;
        if (id) {
          subjectIds.add(id);
        }
      }
      if (users.length < pageSize) {
        break;
      }
    }
    for (const subjectId of subjectIds) {
      // Strict realms (cbpf-test23) answer 403 when unassigning the machine subject; the role delete below still runs.
      await remove(apiUrl(unassignTemplate.replace('{roleId}', role.id).replace('{subjectId}', subjectId)), `Unassign ${subjectId} from role ${role.name}`, [200, 204, 400, 403, 404]);
    }
    await remove(apiUrl((getConfig().endpoints.DELETE_ROLE || 'iam/realm/v1/roles/{roleId}').replace('{roleId}', role.id)), `Delete role ${role.name}`, [200, 204, 404, 409]);
  }
  return results.every(Boolean);
}
