import apiUtil from './api.util';
import { CommonFunctions } from './common.util';
import { getConfig } from '../configs/env';
import type { CreatedEntities } from './created-entities.util';

const log = new CommonFunctions();

/** Deletes a scenario by its simulation id; returns the full ApiUtil response (204 when deleted, 404 when already gone). */
export async function deleteScenarioById(simulationId: string, headers: Record<string, string>, label: string = `Delete scenario ${simulationId}`): Promise<any> {
  const { hosts, endpoints } = getConfig();
  return apiUtil.processAPIRequest('DELETE', `${hosts.api}${endpoints.SIMULATION}/simulations/${encodeURIComponent(simulationId)}`, null, headers, label, 'full');
}

/** Searches scenarios (`SEARCH_SIMULATION`, up to 1000) with `requestBody`, e.g. `{ sourceIds: [processName] }`; returns the full ApiUtil response. */
export async function searchScenarios(requestBody: unknown, headers: Record<string, string>, label: string = 'Search scenarios'): Promise<any> {
  const { hosts, endpoints } = getConfig();
  return apiUtil.processAPIRequest('POST', `${hosts.api}${endpoints.SEARCH_SIMULATION}?limit=1000`, requestBody, headers, label, 'full');
}

/** The first scenario whose `scenarioName` or `scenarioDisplayName` matches one of `names`. */
export function findScenarioEntity(entities: unknown, names: string[]): { simulationId: string; scenarioName?: string } | undefined {
  return Array.isArray(entities)
    ? entities.find((entity: { scenarioName?: string; scenarioDisplayName?: string }) => names.some((name) => entity.scenarioName === name || entity.scenarioDisplayName === name))
    : undefined;
}

/** URL part of the scenario list request; pass to `BasePage.trackApiRequests` before opening the scenario list. */
export const SCENARIO_SEARCH_URL_PART = 'simulations/search';

/**
 * Registers a UI-created scenario with `createdEntities`. `captured` is the latest scenario list request
 * (`trackApiRequests(SCENARIO_SEARCH_URL_PART)`): its Authorization is the user's token (the scenario is user-owned) and
 * its body (e.g. `{ sourceIds: [<assumption id>] }`) finds the scenario in the context it was created in. Without one,
 * the deleter searches `{ sourceIds: [processName] }` with the machine token.
 */
export function registerScenario(createdEntities: CreatedEntities, name: string, processName: string, captured?: { authorization: string; body: string }): void {
  let searchBody: string | undefined;
  try {
    const parsed = captured?.body ? JSON.parse(captured.body) : undefined;
    searchBody = Array.isArray(parsed?.sourceIds) && parsed.sourceIds.length > 0 ? JSON.stringify({ sourceIds: parsed.sourceIds }) : undefined;
  } catch {
    searchBody = undefined;
  }
  createdEntities.register('scenario', name, {
    context: { processName, ...(searchBody ? { searchBody } : {}) },
    ...(captured?.authorization ? { authorization: captured.authorization } : {})
  });
}

/** Deletes a scenario by name (`scenarioNames`) through the simulation API: searches `SEARCH_SIMULATION` with
 * `requestBody` (for example `{ sourceIds: [processName] }`) and deletes `SIMULATION/simulations/<simulationId>`.
 * `accessToken` is the bearer header captured from the UI (`scenarioPage.waitForAccessTokenFromRequestHeader`).
 * `scenarioNames` can list several names (for example before and after a rename); the first entity whose
 * `scenarioName` or `scenarioDisplayName` matches any of them is deleted.
 * Returns false when the search or the delete call fails; a missing env var, token or scenario is logged and returns true,
 * so a test that never created its scenario does not fail its cleanup.
 */
export async function deleteScenarioByName(scenarioNames: string | string[], accessToken: string, requestBody: unknown): Promise<boolean> {
  const names = Array.isArray(scenarioNames) ? scenarioNames : [scenarioNames];
  const scenarioName = names.join(' / ');
  const { hosts, endpoints } = getConfig();
  const apiBaseUrl = hosts.api;
  const searchSimulation = endpoints.SEARCH_SIMULATION;
  const simulation = endpoints.SIMULATION;
  if (!apiBaseUrl || !searchSimulation || !simulation) {
    await log.logMessage('WARNING', 'Skipping cleanup: API_BASE_URL, SEARCH_SIMULATION, or SIMULATION env vars are missing.');
    return true;
  }
  if (!accessToken) {
    await log.logMessage('WARNING', `Skipping cleanup: access token was not captured from network logs for ${scenarioName}.`);
    return true;
  }

  const headers = { accept: 'application/json', Authorization: accessToken };
  const searchResponse = await searchScenarios(requestBody, headers, `Fetch scenarios for cleanup: ${scenarioName}`);
  // A failed search must not read as "scenario not found".
  if (!log.isStatus(searchResponse?.status, 200) || !Array.isArray(searchResponse?.data?.entities)) {
    return log.compareTwoValues(false, true, `Search scenarios for cleanup of ${scenarioName} (status ${searchResponse?.status})`);
  }
  const scenario = findScenarioEntity(searchResponse.data.entities, names);
  if (!scenario) {
    await log.logMessage('WARNING', `Scenario not found for API cleanup: ${scenarioName}`);
    return true;
  }

  const deleteResponse = await deleteScenarioById(scenario.simulationId, headers, `Delete scenario ${scenario.scenarioName || scenarioName} via API`);
  return log.compareTwoValues(deleteResponse?.status, 204, `Delete scenario ${scenarioName}`);
}
