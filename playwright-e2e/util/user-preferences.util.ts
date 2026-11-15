import { ApiUtil } from './api.util';
import { getUserBearerToken, type UserTokenAlias } from './user-token.util';
import { endpoint, getConfig } from '../configs/env';

/**
 * LUI user preferences that planning-mfe persists per user. The Scenarios/Scope drawer pin is one value per user and
 * namespace for every process (`useUtil.saveScenarioScopePanelStateToPreferences`), so a pin left by one spec opens
 * the drawer in every lane signed in as that user.
 */
export type ScenarioScopePanelPin = '' | 'SCENARIO' | 'SCOPE';

function tokenSubject(token: string): string {
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
  if (typeof claims.sub !== 'string' || !claims.sub) {
    throw new Error('User token has no sub claim');
  }
  return claims.sub;
}

/** planning-mfe `planningSpaceNamespace`: the Planning Space portal link without its trailing slash. */
function planningSpaceNamespace(): string {
  const namespace = (getConfig().links.PSLINK || '').replace(/\/+$/, '');
  if (!namespace) {
    throw new Error('PSLINK is not set, so the Planning Space namespace is unknown');
  }
  return namespace;
}

function scenarioScopePanelPinId(userSub: string): string {
  return `plan.sop.lui.${planningSpaceNamespace()}.${userSub}.scenarioScopePanelPinStatus`;
}

async function userHeaders(alias: UserTokenAlias): Promise<{ headers: Record<string, string>; userSub: string }> {
  const token = await getUserBearerToken(alias);
  return {
    headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
    userSub: tokenSubject(token)
  };
}

/** Saves the drawer pin for a user, as the app does when the pin icon is toggled. Returns the HTTP status. */
export async function setScenarioScopePanelPin(alias: UserTokenAlias, isPinned: ScenarioScopePanelPin): Promise<number> {
  const apiUtil = new ApiUtil();
  const { headers, userSub } = await userHeaders(alias);
  const body = { applicationId: scenarioScopePanelPinId(userSub), preferences: { isPinned } };
  const url = `${getConfig().hosts.api}${endpoint('USER_PREFERENCES')}`;
  const status = await apiUtil.processAPIRequest('POST', url, body, headers, `Save Scenarios/Scope drawer pin "${isPinned}" for ${alias}`, 'status');
  return Number(status);
}

/** Reads the stored drawer pin for a user; undefined when the user has never saved one. */
export async function getScenarioScopePanelPin(alias: UserTokenAlias): Promise<string | undefined> {
  const apiUtil = new ApiUtil();
  const { headers, userSub } = await userHeaders(alias);
  const applicationId = scenarioScopePanelPinId(userSub);
  const url = `${getConfig().hosts.api}${endpoint('GET_USER_PREFERENCES').replace('{applicationId}', encodeURIComponent(applicationId))}`;
  // The response maps every stored applicationId of the user to its preferences: { user: { [applicationId]: {...} } }.
  const data = await apiUtil.processAPIRequest('GET', url, null, headers, `Read Scenarios/Scope drawer pin for ${alias}`, 'data');
  const isPinned = data?.user?.[applicationId]?.isPinned;
  return typeof isPinned === 'string' ? isPinned : undefined;
}
