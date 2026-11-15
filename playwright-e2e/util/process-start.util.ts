import { expect } from '@playwright/test';
import { getTimeout } from '../constants/timeouts';
import { ApiUtil } from './api.util';
import { CommonFunctions } from './common.util';
import { getConfig, endpoint } from '../configs/env';

const CYCLE_MOVE_ERROR_CODE = 'IBP_PO_50_2043';
const MAX_CYCLE_RECOVERY_ATTEMPTS = 2;

export function getJobIdFromUrl(statusUrl: string): string | null {
  const match = statusUrl.match(/\/transitionJob\/([^/]+)\//);
  return match ? match[1] : null;
}

function isCycleMoveError(response: any): boolean {
  const status = response?.status;
  const data = response?.data;
  const message = String(data?.message || '');
  const isServerError = status === 500 || status === '500';
  return isServerError && (data?.errorCode === CYCLE_MOVE_ERROR_CODE || message.includes('Error moving cycle'));
}

function extractCycles(response: any): any[] {
  const data = response?.data;
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  if (Array.isArray(data?.cycles)) {
    return data.cycles;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

function normalizeCycle(cycle: any): { cycleName: string; cycleId: any; cycleStartDate: string; cycleEndDate: string } {
  return {
    cycleName: cycle?.name || cycle?.cycleName,
    cycleId: cycle?.id ?? cycle?.cycleId,
    cycleStartDate: cycle?.startDate || cycle?.cycleStartDate,
    cycleEndDate: cycle?.endDate || cycle?.cycleEndDate
  };
}

function pickRecoveryCycle(cycles: any[]) {
  const normalized = cycles.map(normalizeCycle).filter((cycle) => !!cycle.cycleName);
  normalized.sort((a, b) => String(a.cycleStartDate || '').localeCompare(String(b.cycleStartDate || '')));
  return normalized[0];
}

export async function updateProcessCycle(apiUtil: ApiUtil, commonFunctions: CommonFunctions, url: string, headers: Record<string, string>, processName: string): Promise<boolean> {
  const processResponse = await apiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, "Get process for cycle update", "full");
  if (!commonFunctions.isStatus(processResponse?.status, 200) || !processResponse.data) {
    await commonFunctions.logMessage("FAIL", `Unable to fetch process '${processName}' for cycle update. Status: ${processResponse?.status}`);
    return false;
  }

  const processData = processResponse.data;
  const calendarName = processData.calendarName;
  if (!calendarName) {
    await commonFunctions.logMessage("FAIL", `Process '${processName}' has no calendarName for cycle update`);
    return false;
  }

  const calendarUrl = (getConfig().hosts.api as string) + endpoint('CALENDAR') + '/' + encodeURIComponent(calendarName);
  const calendarResponse = await apiUtil.processAPIRequest("GET", calendarUrl, "", headers, "Get calendar for cycle update", "full");
  let cycles = extractCycles(calendarResponse);

  if (cycles.length === 0) {
    const cycleListUrl = (getConfig().hosts.api as string) + endpoint('ADD_CALENDAR_CYCLE').replace('{calendarName}', calendarName) + '?pageNumber=0&pageSize=500';
    const cyclesResponse = await apiUtil.processAPIRequest("GET", cycleListUrl, "", headers, "Get calendar cycles for cycle update", "full");
    cycles = extractCycles(cyclesResponse);
  }

    const recoveryCycle = pickRecoveryCycle(cycles);
  if (!recoveryCycle) {
    await commonFunctions.logMessage("FAIL", `No recovery cycle found for process '${processName}' on calendar '${calendarName}'`);
    return false;
  }

  const updatePayload = {
    ...processData,
    attributes: processData.attributes || [],
    cycleName: recoveryCycle.cycleName,
    cycleId: recoveryCycle.cycleId,
    cycleStartDate: recoveryCycle.cycleStartDate,
    cycleEndDate: recoveryCycle.cycleEndDate,
    startDate: recoveryCycle.cycleStartDate,
    endDate: recoveryCycle.cycleEndDate,
    planStartDate: recoveryCycle.cycleStartDate
  };

  await commonFunctions.logMessage("INFO", `Updating cycle for process '${processName}' from '${processData.cycleName}' to '${recoveryCycle.cycleName}'`);
  const updateResponse = await apiUtil.processAPIRequest("PUT", url + "process/" + processName, updatePayload, headers, "Update process cycle after start cycle-move error", "full");
  const updated = commonFunctions.isStatus(updateResponse?.status, 200);
  if (!updated) {
    await commonFunctions.logMessage("FAIL", `Cycle update failed for process '${processName}'. Status: ${updateResponse?.status}`);
  }
  return updated;
}

export async function startProcess(apiUtil: ApiUtil, commonFunctions: CommonFunctions, url: string, headers: Record<string, string>, processName: string, logMessage = "Start Process"): Promise<any> {
  let response = await apiUtil.processAPIRequest("POST", url + 'process/' + processName + '/start', {}, headers, logMessage, "full");
  for (let attempt = 1; attempt <= MAX_CYCLE_RECOVERY_ATTEMPTS && isCycleMoveError(response); attempt++) {
    await commonFunctions.logMessage("INFO", `Start failed with cycle move error (${CYCLE_MOVE_ERROR_CODE}) for '${processName}'. Updating cycle and retrying (${attempt}/${MAX_CYCLE_RECOVERY_ATTEMPTS}).`);
    const updated = await updateProcessCycle(apiUtil, commonFunctions, url, headers, processName);
    if (!updated) {
      break;
    }
    response = await apiUtil.processAPIRequest("POST", url + 'process/' + processName + '/start', {}, headers, `${logMessage} retry after cycle update`, "full");
  }
  return response;
}

const COMPLETED_PROCESS_STATUSES = new Set(['completed', 'not started']);

export async function waitForJobCompleted(apiUtil: ApiUtil, commonFunctions: CommonFunctions, url: string, headers: Record<string, string>, jobId: string | null, logMessage = "Fetching job status"): Promise<any> {
  let response: any;
  await expect.poll(async () => {
    response = await apiUtil.processAPIRequest("GET", url + "transitionJob/" + jobId + "/status", "", headers, logMessage, "full");
    return response?.data?.status;
  }, { timeout: getTimeout('LONG'), intervals: [getTimeout('POLL_INTERVAL')] }).toBe('COMPLETED');
  await commonFunctions.compareTwoValues(response.status, 200, "Fetch Job status Success Assertion");
  await commonFunctions.compareTwoValues(response.data.status, 'COMPLETED', "verify the status completed");
  return response;
}

export async function ensureProcessStopped(apiUtil: ApiUtil, commonFunctions: CommonFunctions, url: string, headers: Record<string, string>, processName: string): Promise<void> {
  const processResponse = await apiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, `Get process '${processName}' before stop cleanup`, "full");
  if (!commonFunctions.isStatus(processResponse?.status, 200) || !processResponse.data) {
    await commonFunctions.logMessage("INFO", `Skipping stop cleanup for '${processName}'. Status: ${processResponse?.status}`);
    return;
  }

  const currentStatus = String(processResponse.data.status || '').trim();
  if (COMPLETED_PROCESS_STATUSES.has(currentStatus.toLowerCase())) {
    await commonFunctions.logMessage("INFO", `Process '${processName}' is already '${currentStatus}', no stop cleanup needed`);
    return;
  }

  await commonFunctions.logMessage("INFO", `Stopping process '${processName}' from status '${currentStatus}'`);
  await apiUtil.processAPIRequest("POST", url + 'process/' + processName + '/stop', {}, headers, `Stop process '${processName}' cleanup`, "full");

  try {
    await expect.poll(async () => {
      const statusResponse = await apiUtil.processAPIRequest("GET", url + "process/" + processName, "", headers, `Poll process '${processName}' after stop cleanup`, "full");
      return String(statusResponse?.data?.status || '').trim().toLowerCase();
    }, { timeout: getTimeout('LONG'), intervals: [getTimeout('POLL_INTERVAL')] }).toBe('completed');
    await commonFunctions.logMessage("INFO", `Process '${processName}' reached Completed after stop cleanup`);
  } catch {
    await commonFunctions.logMessage("INFO", `Process '${processName}' did not reach Completed after stop cleanup`);
  }
}

export async function ensureProcessesStopped(apiUtil: ApiUtil, commonFunctions: CommonFunctions, url: string, headers: Record<string, string>, processNames: string[]): Promise<void> {
  for (const processName of processNames || []) {
    await ensureProcessStopped(apiUtil, commonFunctions, url, headers, processName);
  }
}
