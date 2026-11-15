import axios from 'axios';
import AdmZip from 'adm-zip';
import * as path from 'path';
import { expect } from '@playwright/test';
import { CommonFunctions } from './common.util';
import { ApiUtil } from './api.util';
import { TIMEOUTS } from '../constants/timeouts';
import { getConfig, endpoint } from '../configs/env';

/**
 * Shared helpers for the ALM Deploy resource-migration API spec
 * (ProcessOrchestrationBackend/Migration/Test_009).
 *
 * The pure `po.json` extractors have no external dependencies. The polling,
 * download, and assertion helpers accept a `CommonFunctions` instance so they
 * can log and compare via the shared logging/reporting pipeline.
 */

export const ALM_POLL_INTERVAL_MS = 30000;
export const ALM_MAX_POLL_ATTEMPTS = 60;

// Max in-flight requests when deleting independent entity-view-procedure mappings.
export const ALM_CLEANUP_CONCURRENCY = 10;

/**
 * Runs `worker` over `items` with at most `concurrency` promises in flight,
 * preserving result order to match the input.
 */
export async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) {
        return;
      }
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function pollUntil(fetchFn: () => Promise<any>, isDone: (response: any) => boolean, label: string, commonFunctions: CommonFunctions, intervalMs: number = ALM_POLL_INTERVAL_MS, maxAttempts: number = ALM_MAX_POLL_ATTEMPTS): Promise<any> {
  let lastResponse: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResponse = await fetchFn();
    const done = isDone(lastResponse);
    await commonFunctions.logMessage('INFO', `[poll] ${label} - attempt ${attempt}/${maxAttempts}, done=${done}`);
    if (done) {
      return lastResponse;
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return lastResponse;
}

export async function downloadZipBuffer(downloadUrl: string, requestHeaders: Record<string, string>, commonFunctions: CommonFunctions): Promise<Buffer> {
  const safeHeaders: Record<string, string> = {};
  if (requestHeaders && typeof requestHeaders === 'object') {
    for (const [key, value] of Object.entries(requestHeaders)) {
      if (typeof key === 'string' && typeof value === 'string') {
        if (key.toLowerCase() === 'authorization') {
          if (/^Bearer\s+[A-Za-z0-9._~+/=-]+$/i.test(value)) {
            safeHeaders[key] = value;
          }
        } else if (/^[a-zA-Z0-9_-]+$/.test(key) && /^[a-zA-Z0-9_.,/:; -]+$/.test(value)) {
          safeHeaders[key] = value;
        }
      }
    }
  }

  const response = await axios.get(downloadUrl, {
    headers: safeHeaders,
    responseType: 'arraybuffer',
    maxRedirects: 5,
    validateStatus: () => true
  });
  await commonFunctions.logMessage('INFO', `[download] GET ${downloadUrl} -> status ${response.status}, content-type ${response.headers['content-type']}`);

  const contentType = String(response.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('application/json')) {
    const bodyText = Buffer.from(response.data).toString('utf-8');
    const parsed = JSON.parse(bodyText);
    const link = parsed.url || parsed.downloadUrl || parsed.link || parsed.href || parsed.presignedUrl;
    if (!link) {
      throw new Error(`downloadZip returned JSON without a download link: ${bodyText}`);
    }
    await commonFunctions.logMessage('INFO', `[download] Following download link from JSON response`);
    const fileResponse = await axios.get(link, {
      responseType: 'arraybuffer',
      maxRedirects: 5,
      validateStatus: () => true
    });
    return Buffer.from(fileResponse.data);
  }
  return Buffer.from(response.data);
}

export function extractPoJson(zipBuffer: Buffer): any {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const poEntry = entries.find((entry) => !entry.isDirectory && path.basename(entry.entryName).toLowerCase() === 'po.json');
  if (poEntry) {
    return JSON.parse(poEntry.getData().toString('utf-8'));
  }
  for (const entry of entries) {
    if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.zip')) {
      const nested = extractPoJson(entry.getData());
      if (nested) {
        return nested;
      }
    }
  }
  throw new Error('po.json not found in downloaded archive');
}

export function getProcessNames(data: any): string[] {
  const processes = Array.isArray(data?.processes) ? data.processes : [];
  return processes.map((item: any) => (typeof item === 'string' ? item : item?.name || item?.displayName)).filter(Boolean);
}

export function getCalendarNames(data: any): string[] {
  const calendars = Array.isArray(data?.calendars) ? data.calendars : [];
  return calendars.map((item: any) => (typeof item === 'string' ? item : item?.calendarName || item?.name)).filter(Boolean);
}

export function getSupplyChainActionNames(data: any): string[] {
  const actions = Array.isArray(data?.supplyChainActions) ? data.supplyChainActions : [];
  return actions.map((item: any) => (typeof item === 'string' ? item : item?.name)).filter(Boolean);
}

export function getEntityViewKeys(data: any): string[] {
  const keys: string[] = [];
  const entityViews = Array.isArray(data?.links?.entityViews) ? data.links.entityViews : [];
  for (const entity of entityViews) {
    const views = Array.isArray(entity?.views) ? entity.views : [];
    for (const view of views) {
      keys.push(`${entity.entityId}|${view.id}`);
    }
  }
  return keys;
}

export function getEntityViewProcedureKeys(data: any): string[] {
  const keys: string[] = [];
  const entityViewsProcedure = Array.isArray(data?.links?.entityViewsProcedure) ? data.links.entityViewsProcedure : [];
  for (const entity of entityViewsProcedure) {
    const views = Array.isArray(entity?.views) ? entity.views : [];
    for (const view of views) {
      const procedures = Array.isArray(view?.procedures) ? view.procedures : [];
      if (procedures.length > 0) {
        keys.push(`${entity.entityId}|${view.id}`);
      }
    }
  }
  return keys;
}

export function getActionItemKeys(data: any): string[] {
  const actionItems = data?.actionItems || {};
  const collect = (list: any) => (Array.isArray(list) ? list : []).map((item: any) => (typeof item === 'string' ? item : item?.name)).filter(Boolean);
  return [...collect(actionItems.attributes), ...collect(actionItems.kpis), ...collect(actionItems.ui_fields)];
}

export function getAssumptionKeys(data: any): string[] {
  const assumptions = data?.assumptions || {};
  const collect = (list: any) => (Array.isArray(list) ? list : []).map((item: any) => (typeof item === 'string' ? item : item?.name)).filter(Boolean);
  return [
    ...collect(assumptions.attributes),
    ...collect(assumptions.assumption_types),
    ...collect(assumptions.kpi_configs),
    ...collect(assumptions.insight_configs),
    ...collect(assumptions.insight_types)
  ];
}

export async function assertSubset(sourceKeys: string[], targetKeys: string[], label: string, commonFunctions: CommonFunctions): Promise<boolean> {
  const targetSet = new Set(targetKeys);
  let allPresent = true;
  if (sourceKeys.length === 0) {
    await commonFunctions.logMessage('INFO', `${label} - no source items to validate (empty section)`);
    return true;
  }
  for (const key of sourceKeys) {
    const present = targetSet.has(key);
    await commonFunctions.compareTwoValues(present, true, `${label} - '${key}' present in target export`);
    expect.soft(present, `${label} - '${key}' present in target export`).toBeTruthy();
    allPresent = allPresent && present;
  }
  return allPresent;
}

export async function assertAbsent(sourceKeys: string[], targetKeys: string[], label: string, commonFunctions: CommonFunctions): Promise<boolean> {
  const targetSet = new Set(targetKeys);
  let allAbsent = true;
  if (sourceKeys.length === 0) {
    await commonFunctions.logMessage('INFO', `${label} - no source items to verify removed (empty section)`);
    return true;
  }
  for (const key of sourceKeys) {
    const absent = !targetSet.has(key);
    await commonFunctions.compareTwoValues(absent, true, `${label} - '${key}' removed from target export`);
    expect.soft(absent, `${label} - '${key}' removed from target export`).toBeTruthy();
    allAbsent = allAbsent && absent;
  }
  return allAbsent;
}

/**
 * Dependencies required by the cleanup helpers. `sourceHeaders` authenticate
 * against the source realm (ALM resource delete) and `targetHeaders` against
 * the target realm (deployed-content delete).
 */
export interface AlmCleanupContext {
  apiUtil: ApiUtil;
  commonFunctions: CommonFunctions;
  sourceHeaders: Record<string, string>;
  targetHeaders: Record<string, string>;
  sourceBaseUrl?: string;
  targetBaseUrl?: string;
}

function labelPrefix(label: string): string {
  return label ? `[${label}] ` : '';
}

// Read with responseType 'full': 'status' returns an object, not a code, for non-2xx responses, so a 404 would never match.
function isDeletedOrAbsent(commonFunctions: CommonFunctions, status: unknown): boolean {
  return [200, 204, 404].some((code) => commonFunctions.isStatus(status, code));
}

/**
 * Deletes every assumption KPI configuration in the target realm. The target
 * realm assigns new KPI IDs during import, so cleanup must fetch those IDs.
 * Deletions are independent, so they run with bounded concurrency.
 */
export async function cleanupAssumptionKpis(label: string, ctx: AlmCleanupContext): Promise<boolean[]> {
  const { apiUtil, commonFunctions, targetHeaders } = ctx;
  const prefix = labelPrefix(label);
  const getAssumptionKpisUrl = (ctx.targetBaseUrl ?? (getConfig().hosts.api as string)) + endpoint('GET_ASSUMPTION_KPI_CONFIG');
  const getAssumptionKpisResponse = await apiUtil.processAPIRequest('GET', getAssumptionKpisUrl, null, targetHeaders, 'Get assumption KPI configurations', 'full');
  const assumptionKpis = Array.isArray(getAssumptionKpisResponse.data) ? getAssumptionKpisResponse.data : getAssumptionKpisResponse.data?.data || [];
  const deletableKpis = assumptionKpis.filter((assumptionKpi: any) => assumptionKpi?.id);

  return mapWithConcurrency(deletableKpis, ALM_CLEANUP_CONCURRENCY, async (assumptionKpi: any) => {
    const deleteAssumptionKpiUrl = (ctx.targetBaseUrl ?? (getConfig().hosts.api as string)) + endpoint('DELETE_ASSUMPTION_KPI_CONFIG_HARD').replace('{id}', assumptionKpi.id);
    const status = await apiUtil.processAPIRequest('DELETE', deleteAssumptionKpiUrl, null, targetHeaders, `Delete assumption KPI configuration ${assumptionKpi.id}`, 'status');
    return commonFunctions.compareTwoValues(commonFunctions.isStatus(status, 200), true, `${prefix}Delete assumption KPI configuration '${assumptionKpi.id}' status assertion`);
  });
}

/**
 * Deletes every action item KPI configuration in the target realm. The list
 * endpoint is CREATE_ACTIONITEM_KPI_CONFIG; deletions use DELETE_ACTIONITEM_KPI.
 */
export async function cleanupActionItemKpis(label: string, ctx: AlmCleanupContext): Promise<boolean[]> {
  const { apiUtil, commonFunctions, targetHeaders } = ctx;
  const prefix = labelPrefix(label);
  const baseUrl = ctx.targetBaseUrl ?? (getConfig().hosts.api as string);
  const getActionItemKpisUrl = baseUrl + endpoint('CREATE_ACTIONITEM_KPI_CONFIG');
  const getActionItemKpisResponse = await apiUtil.processAPIRequest('GET', getActionItemKpisUrl, null, targetHeaders, 'Get action item KPI configurations', 'full');
  const actionItemKpis = Array.isArray(getActionItemKpisResponse.data) ? getActionItemKpisResponse.data : getActionItemKpisResponse.data?.data || [];
  const deletableKpis = actionItemKpis.filter((actionItemKpi: any) => actionItemKpi?.id);

  await commonFunctions.logMessage('INFO', `${prefix}Action item KPIs matched for cleanup: ${deletableKpis.length}`);

  return mapWithConcurrency(deletableKpis, ALM_CLEANUP_CONCURRENCY, async (actionItemKpi: any) => {
    const deleteActionItemKpiUrl = baseUrl + endpoint('DELETE_ACTIONITEM_KPI').replace('{id}', actionItemKpi.id);
    const response = await apiUtil.processAPIRequest('DELETE', deleteActionItemKpiUrl, null, targetHeaders, `Delete action item KPI configuration ${actionItemKpi.id}`, 'full');
    const deleted = isDeletedOrAbsent(commonFunctions, response?.status);
    return commonFunctions.compareTwoValues(deleted, true, `${prefix}Delete action item KPI configuration '${actionItemKpi.id}' status assertion`);
  });
}

/**
 * Deletes imported process attributes before deleting their owning processes.
 */
async function cleanupProcessAttributes(poJson: any, label: string, ctx: AlmCleanupContext): Promise<boolean[]> {
  const { apiUtil, commonFunctions, targetHeaders } = ctx;
  const prefix = labelPrefix(label);
  const attributes: Array<{ processName: string; attributeName: string; attributeValue: string }> = [];

  const processes = Array.isArray(poJson?.processes) ? poJson.processes : [];
  for (const process of processes) {
    const processName = process?.name || process?.displayName;
    const processAttributes = Array.isArray(process?.attributes) ? process.attributes : [];
    for (const attribute of processAttributes) {
      const attributeName = attribute?.name || attribute?.attrName;
      const attributeValue = attribute?.value;
      if (processName && attributeName && attributeValue !== undefined && attributeValue !== null && String(attributeValue) !== '') {
        attributes.push({ processName, attributeName, attributeValue: String(attributeValue) });
      }
    }
  }

  return mapWithConcurrency(attributes, ALM_CLEANUP_CONCURRENCY, async ({ processName, attributeName, attributeValue }) => {
    const deleteAttributeUrl = (ctx.targetBaseUrl ?? (getConfig().hosts.api as string)) + endpoint('DELETE_PROCESS_ATTRIBUTE')
      .replace('{processName}', encodeURIComponent(processName))
      .replace('{attrName}', encodeURIComponent(attributeName))
      .replace('{attrValue}', encodeURIComponent(attributeValue));
    const status = await apiUtil.processAPIRequest('DELETE', deleteAttributeUrl, null, targetHeaders, `Delete process attribute ${processName}/${attributeName}`, 'status');
    return commonFunctions.compareTwoValues(commonFunctions.isStatus(status, 200), true, `${prefix}Delete process attribute '${processName}/${attributeName}' status assertion`);
  });
}

/**
 * Deletes every process listed in the po.json from the target realm. Deletions
 * are independent, so they run with bounded concurrency to reduce total
 * wall-clock time on resources with many processes.
 */
async function cleanupProcesses(poJson: any, label: string, ctx: AlmCleanupContext): Promise<boolean[]> {
  const { apiUtil, commonFunctions, targetHeaders } = ctx;
  const prefix = labelPrefix(label);

  return mapWithConcurrency(getProcessNames(poJson), ALM_CLEANUP_CONCURRENCY, async (processName: string) => {
    const deleteProcessUrl = (ctx.targetBaseUrl ?? (getConfig().hosts.api as string)) + endpoint('DELETE_PROCESS').replace('{processName}', processName);
    const status = await apiUtil.processAPIRequest('DELETE', deleteProcessUrl, null, targetHeaders, `Delete process ${processName}`, 'status');
    return commonFunctions.compareTwoValues(commonFunctions.isStatus(status, 200), true, `${prefix}Delete process '${processName}' status assertion`);
  });
}

/**
 * Clears all mapped views for each entity in the po.json via the bulk
 * `view-entity-map/clear` endpoint (one call per entity). Clears are
 * independent, so they run with bounded concurrency to reduce total
 * wall-clock time on resources with many entities.
 */
export async function cleanupEntityViewMaps(poJson: any, label: string, ctx: AlmCleanupContext): Promise<boolean[]> {
  const { apiUtil, commonFunctions, targetHeaders } = ctx;
  const prefix = labelPrefix(label);

  const entityViews = Array.isArray(poJson?.links?.entityViews) ? poJson.links.entityViews : [];
  const entities = entityViews.filter((entity: any) => (Array.isArray(entity?.views) ? entity.views : []).length > 0);

  return mapWithConcurrency(entities, ALM_CLEANUP_CONCURRENCY, async (entity: any) => {
    const entityType = entity.entityType || entity.type || 'subprocess';
    const clearUrl = (ctx.targetBaseUrl ?? (getConfig().hosts.api as string)) + endpoint('VIEW_ENTITY_MAP') + '/clear';
    const clearBody = { entityId: [entity.entityId], entityType };
    const response = await apiUtil.processAPIRequest('POST', clearUrl, clearBody, targetHeaders, `Clear entity view map ${entity.entityId}`, 'full');
    const cleared = commonFunctions.isStatus(response.status, 200) && /Deleted\s+\d+\s+views successfully/.test(String(response.data));
    return commonFunctions.compareTwoValues(cleared, true, `${prefix}Clear entity view map '${entity.entityId}' status assertion`);
  });
}

/**
 * Deletes each entity-view-procedure mapping in the po.json from the target realm.
 * Deletions are independent, so they run with bounded concurrency to reduce
 * total wall-clock time on resources with many mappings.
 */
export async function cleanupEntityViewProcedureMaps(poJson: any, label: string, ctx: AlmCleanupContext): Promise<boolean[]> {
  const { apiUtil, commonFunctions, targetHeaders } = ctx;
  const prefix = labelPrefix(label);

  const deletions: Array<{ entityId: string; viewId: string; type: string }> = [];
  const entityViewsProcedure = Array.isArray(poJson?.links?.entityViewsProcedure) ? poJson.links.entityViewsProcedure : [];
  const processNames = new Set(getProcessNames(poJson));

  for (const entity of entityViewsProcedure) {
    const views = Array.isArray(entity?.views) ? entity.views : [];
    const type = (entity?.entityType || entity?.type || (processNames.has(entity?.entityId) ? 'process' : 'subprocess')).toLowerCase();
    for (const view of views) {
      deletions.push({ entityId: entity.entityId, viewId: view.id, type });
    }
  }

  return mapWithConcurrency(deletions, ALM_CLEANUP_CONCURRENCY, async ({ entityId, viewId, type }) => {
    const deleteUrl = (ctx.targetBaseUrl ?? (getConfig().hosts.api as string)) +
      endpoint('DELETE_ENTITY_VIEW_PROCEDURE_MAP')
        .replace('{type}', type)
        .replace('{entity}', entityId)
        .replace('{viewId}', viewId);
    let response = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, targetHeaders, `Delete entity view procedure map ${entityId}/${viewId}`, 'full');
    // Only a 5xx is retried (bounded); 4xx answers are permanent, so they fail at once.
    for (let attempt = 1; attempt <= 2 && Number(response?.status) >= 500; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, TIMEOUTS.POLL_INTERVAL * 2 * attempt));
      response = await apiUtil.processAPIRequest('DELETE', deleteUrl, null, targetHeaders, `Delete entity view procedure map ${entityId}/${viewId} (retry ${attempt})`, 'full');
    }
    const deleted = isDeletedOrAbsent(commonFunctions, response?.status);
    return commonFunctions.compareTwoValues(deleted, true, `${prefix}Delete entity view procedure map '${entityId}/${viewId}' status assertion`);
  });
}

/**
 * Deletes the supply chain actions named in the po.json. The target realm
 * assigns new SCA IDs during import, so cleanup must fetch those IDs.
 * Deletions are independent, so they run with bounded concurrency.
 */
export async function cleanupSupplyChainActions(poJson: any, label: string, ctx: AlmCleanupContext): Promise<boolean[]> {
  const { apiUtil, commonFunctions, targetHeaders } = ctx;
  const prefix = labelPrefix(label);

  const scaNames = getSupplyChainActionNames(poJson);
  if (scaNames.length === 0) {
    return [];
  }

  const getSCAUrl = (ctx.targetBaseUrl ?? (getConfig().hosts.api as string)) + endpoint('GET_SUPPLY_CHAIN_ACTIONS');
  const getSCAResponse = await apiUtil.processAPIRequest('GET', getSCAUrl, null, targetHeaders, 'Get supply chain actions', 'full');
  // A failed lookup must not read as "nothing to delete".
  if (!commonFunctions.isStatus(getSCAResponse?.status, 200) || !Array.isArray(getSCAResponse?.data)) {
    return [await commonFunctions.compareTwoValues(false, true, `${prefix}Get supply chain actions for cleanup returned ${getSCAResponse?.status}`)];
  }
  const scasToDelete = getSCAResponse.data.filter((sca: any) => scaNames.includes(sca.name));

  return mapWithConcurrency(scasToDelete, ALM_CLEANUP_CONCURRENCY, async (sca: any) => {
    const deleteSCAUrl = (ctx.targetBaseUrl ?? (getConfig().hosts.api as string)) + endpoint('DELETE_SUPPLY_CHAIN_ACTION').replace('{id}', sca.id);
    const response = await apiUtil.processAPIRequest('DELETE', deleteSCAUrl, null, targetHeaders, `Delete supply chain action ${sca.name}`, 'full');
    return commonFunctions.compareTwoValues(isDeletedOrAbsent(commonFunctions, response?.status), true, `${prefix}Delete supply chain action '${sca.name}' status assertion`);
  });
}

/**
 * Known static/shared calendars across environments that pre-exist and are
 * referenced by other tenant processes. Attempting to delete them returns 409
 * and asserting their absence from the realm export is invalid.
 */
export const SHARED_CALENDARS = new Set(['Monthly Calendar', 'Default Calendar', 'Weekly Calendar', 'Monthly']);

/**
 * Deletes the calendars named in the po.json from the target realm.
 */
export async function cleanupCalendars(poJson: any, label: string, ctx: AlmCleanupContext): Promise<boolean[]> {
  const { apiUtil, commonFunctions, targetHeaders } = ctx;
  const prefix = labelPrefix(label);
  const cleanupValidations: boolean[] = [];

  const candidateCalendars = getCalendarNames(poJson).filter((name) => !SHARED_CALENDARS.has(name));
  if (candidateCalendars.length === 0) {
    await commonFunctions.logMessage('INFO', `${prefix}No non-shared calendars to delete in target realm`);
    return [true];
  }

  for (const calendarName of candidateCalendars) {
    const deleteCalendarUrl = (ctx.targetBaseUrl ?? (getConfig().hosts.api as string)) + endpoint('DELETE_CALENDAR').replace('{calendarName}', calendarName);
    const response = await apiUtil.processAPIRequest('DELETE', deleteCalendarUrl, null, targetHeaders, `Delete calendar ${calendarName}`, 'full');
    const deleted = isDeletedOrAbsent(commonFunctions, response?.status);
    cleanupValidations.push(await commonFunctions.compareTwoValues(deleted, true, `${prefix}Delete calendar '${calendarName}' status assertion`));
  }

  return cleanupValidations;
}

/**
 * Deletes the deployed assumption KPI configurations, action item KPI
 * configurations, processes, entity-view maps, entity-view procedure maps,
 * supply chain actions, and calendars from the target realm. Pass an empty
 * `label` to omit the `[label] ` prefix on assertion descriptions
 * (single-resource specs), or a group label to include it.
 */
export async function cleanupGroupContent(poJson: any, label: string, ctx: AlmCleanupContext): Promise<boolean[]> {
  const cleanupValidations: boolean[] = [];

  if (Array.isArray(poJson?.assumptions?.kpi_configs) && poJson.assumptions.kpi_configs.length > 0) {
    cleanupValidations.push(...await cleanupAssumptionKpis(label, ctx));
  }

  if (Array.isArray(poJson?.actionItems?.kpis) && poJson.actionItems.kpis.length > 0) {
    cleanupValidations.push(...await cleanupActionItemKpis(label, ctx));
  }

  cleanupValidations.push(...await cleanupProcessAttributes(poJson, label, ctx));
  cleanupValidations.push(...await cleanupProcesses(poJson, label, ctx));
  cleanupValidations.push(...await cleanupEntityViewMaps(poJson, label, ctx));
  cleanupValidations.push(...await cleanupEntityViewProcedureMaps(poJson, label, ctx));
  cleanupValidations.push(...await cleanupSupplyChainActions(poJson, label, ctx));
  // Calendars are deleted last because processes/SCAs reference them.
  cleanupValidations.push(...await cleanupCalendars(poJson, label, ctx));

  return cleanupValidations;
}

/**
 * Deletes a deployed ALM resource from the source realm. Accepts 200/202/204 as
 * a successful delete.
 */
export async function deleteAlmResource(resourceId: string, label: string, ctx: AlmCleanupContext): Promise<boolean> {
  const { apiUtil, commonFunctions, sourceHeaders } = ctx;
  const prefix = labelPrefix(label);
  const deleteResourceUrl = (ctx.sourceBaseUrl ?? (getConfig().hosts.api as string)) + endpoint('ALM_DELETE_RESOURCE').replace('{resourceId}', resourceId);
  const status = await apiUtil.processAPIRequest('DELETE', deleteResourceUrl, null, sourceHeaders, `Delete ALM resource ${resourceId}`, 'status');
  const resourceDeleted = commonFunctions.isStatus(status, 200) || commonFunctions.isStatus(status, 202) || commonFunctions.isStatus(status, 204);
  return commonFunctions.compareTwoValues(resourceDeleted, true, `${prefix}Delete ALM resource '${resourceId}' status assertion`);
}
