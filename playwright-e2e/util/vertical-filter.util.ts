import axios from 'axios';
import type { BrowserContext, Request } from '@playwright/test';
import apiUtil from './api.util';
import { CommonFunctions } from './common.util';
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
import { endpoint } from '../configs/env';

const log = new CommonFunctions();

/**
 * What the vertical-filter BFF (`lui/verticalFilterBff/v1`, called by `@by/lui-vertical-filter-component`) needs to manage
 * saved filters as the logged-in user. Saved filters are owned by a user, so the user's token comes from the app's own
 * requests; the machine client cannot see them.
 */
export interface IVerticalFilterAccess {
  /** e.g. `https://pspoat-test1.api.interop.na.blueyonder.dev/lui/verticalFilterBff/v1` */
  baseUrl: string;
  /** Filter instance the scope panel works on, e.g. `vf-cognitive-planning`. */
  instance: string;
  /** The `authorization` header value (`Bearer ...`); never log it. */
  authorization: string;
}

export interface ISavedFilter {
  id: string;
  label: string;
  isOwner?: boolean;
  isDraft?: boolean;
  isShared?: boolean;
}

const SAVED_FILTER_LIST = /^(.*\/verticalFilterBff\/v\d+)\/config\/([^/?]+)/i;

/** The filter instance the planning and PO scope panels save filters on. Planning Space also lists `page_wrapper_scope`. */
export const SCOPE_FILTER_INSTANCE = 'vf-cognitive-planning';

/**
 * Resolves with the BFF access of the first saved-filter list request (`GET .../config/{instance}`) any page of `context`
 * sends, so it also covers a window opened later (Process Settings). Start it before the step that opens the Scope panel.
 * Pass `instance` where a page lists more than one instance.
 */
export const waitForVerticalFilterAccess = async (context: BrowserContext, instance?: string, timeout: number = getTimeout('EXTREME')): Promise<IVerticalFilterAccess> => {
  const isListRequest = (request: Request) => {
    const match = request.method() === 'GET' ? request.url().match(SAVED_FILTER_LIST) : null;
    return !!match && !!request.headers()['authorization'] && (!instance || decodeURIComponent(match[2]) === instance);
  };
  const request = await context.waitForEvent('request', { predicate: isListRequest, timeout });
  const [, baseUrl, listedInstance] = request.url().match(SAVED_FILTER_LIST) as RegExpMatchArray;
  return { baseUrl, instance: decodeURIComponent(listedInstance), authorization: request.headers()['authorization'] };
};

const headersOf = (access: IVerticalFilterAccess) => ({ accept: 'application/json', Authorization: access.authorization });

/**
 * The user's saved filters on the access's instance. Called with axios directly: the list can hold 1000+ filters
 * (Azure INTEROP test user, 2026-10-16), which ApiUtil would log in full. A filter saved in the UI can take a moment
 * to show up here, so poll when asserting right after a UI action.
 */
export const listSavedFilters = async (access: IVerticalFilterAccess): Promise<ISavedFilter[]> => {
  const url = `${access.baseUrl}/config/${encodeURIComponent(access.instance)}`;
  const response = await axios.get(url, { headers: headersOf(access), timeout: getTimeout('XLARGE'), validateStatus: () => true });
  if (response.status !== 200) {
    throw new Error(`Listing saved vertical filters (${url}) returned ${response.status}`);
  }
  // A 200 without the list (e.g. a gateway error page) must not read as "no filters", or delete checks pass falsely.
  if (!Array.isArray(response.data?.entities)) {
    throw new Error(`Listing saved vertical filters (${url}) returned no entities array`);
  }
  const filters = response.data.entities as ISavedFilter[];
  await log.logMessage('INFO', `Listed ${filters.length} saved vertical filters on ${access.instance}`);
  return filters;
};

/**
 * Clears a process's scope restriction (Process Settings > Scope), keeping its horizon; returns whether one was set.
 * The restriction stores the member values themselves, so deleting the saved filter it was built from leaves it in place.
 * Uses the captured API host and user token (as the Reset button does), since `API_BASE_URL` can still name the startup
 * tenant in `afterAll`.
 */
export const clearProcessScopeRestriction = async (access: IVerticalFilterAccess, processName: string): Promise<boolean> => {
  const apiRoot = access.baseUrl.replace(/lui\/verticalFilterBff\/v\d+$/i, '');
  const url = `${apiRoot}${endpoint('ACTIONITEM')}process/${encodeURIComponent(processName)}/scope`;
  const current = await apiUtil.processAPIRequest('GET', url, null, headersOf(access), `Get scope of process ${processName}`, 'full');
  if (current?.status !== 200) {
    throw new Error(`Getting the scope of process ${processName} returned ${current?.status}`);
  }
  if (!(current.data?.dimensions?.length > 0)) {
    return false;
  }
  const body = { dimensions: [], horizon: current.data?.horizon ?? {} };
  const response = await apiUtil.processAPIRequest('PUT', url, body, headersOf(access), `Clear scope restriction of process ${processName}`, 'full');
  if (response?.status !== 200) {
    throw new Error(`Clearing the scope restriction of process ${processName} returned ${response?.status}`);
  }
  return true;
};

/**
 * Deletes one saved filter the user owns. For a draft, `DELETE ?isDraft=true` only discards the draft layer and leaves the
 * saved filter listed (verified on Azure INTEROP, 2026-10-16), so the saved filter is deleted next (404 = already gone).
 */
export const deleteSavedFilter = async (access: IVerticalFilterAccess, filter: ISavedFilter): Promise<void> => {
  const remove = async (isDraft: boolean, okStatuses: number[]) => {
    const url = `${access.baseUrl}/filters/${encodeURIComponent(access.instance)}/${filter.id}?isDraft=${isDraft}`;
    const response = await apiUtil.processAPIRequest('DELETE', url, null, headersOf(access), `Delete saved vertical filter ${filter.label}${isDraft ? ' (draft)' : ''}`, 'full');
    const status = Number(response?.status);
    if (!((status >= 200 && status < 300) || okStatuses.includes(status))) {
      throw new Error(`Deleting saved vertical filter ${filter.label}${isDraft ? ' (draft)' : ''} returned ${response?.status}`);
    }
  };
  if (filter.isDraft === true) {
    await remove(true, []);
    await remove(false, [404]);
  } else {
    // 404 = already gone (e.g. deleted between listing and this call).
    await remove(false, [404]);
  }
};

/** The ids of the user's saved filters now; take it before a spec creates one, and pass it to `deleteSavedFiltersByLabel`. */
export const listSavedFilterIds = async (access: IVerticalFilterAccess): Promise<Set<string>> => {
  return new Set((await listSavedFilters(access)).map(({ id }) => id));
};

/**
 * Deletes every saved filter labelled `label` that the user owns, except those in `preexistingIds` (filters that were there
 * before the spec ran, e.g. another run's filter with the same generated name); returns how many were deleted.
 */
export const deleteSavedFiltersByLabel = async (access: IVerticalFilterAccess, label: string, preexistingIds: ReadonlySet<string> = new Set()): Promise<number> => {
  const matches = (await listSavedFilters(access)).filter((filter) => filter.label === label && filter.isOwner !== false && !preexistingIds.has(filter.id));
  for (const filter of matches) {
    await deleteSavedFilter(access, filter);
  }
  return matches.length;
};

/** One level of a saved filter to seed: the dimension/hierarchy/level ids and labels of the realm's model, and its members. */
export interface ISeedFilterLevel {
  dimensionId: string;
  dimensionLabel: string;
  hierarchyId: string;
  hierarchyLabel: string;
  levelId: string;
  levelLabel: string;
  isTimeDimension?: boolean;
  /** Time members also need `startDate`/`endDate` (from the dimensions-cache values of the level). */
  members: { id: string; description?: string; startDate?: string; endDate?: string }[];
}

/** A saved filter a spec expects the user to own: its label and one level filter per dimension. */
export interface ISeedFilter {
  label: string;
  levels: ISeedFilterLevel[];
  /** Share it with every read role of the filter instance: "Set as default for all users" lists only shared filters. A filter
   * that keeps isShared: false in the list afterwards is logged as a WARN, not failed, so the other seeds still run. */
  shared?: boolean;
}

/** The stored `value` of a saved filter, in the shape `@by/lui-vertical-filter-component` (payloadV6) saves. */
export const buildSavedFilterValue = (seed: ISeedFilter): Record<string, unknown> => ({
  dimensions: seed.levels.map((level) => {
    const data = level.members.map(({ id, description, startDate, endDate }) => ({
      id,
      ...(description ? { description } : {}),
      ...(level.isTimeDimension ? { startDate, endDate } : {}),
    }));
    return {
      id: level.dimensionId,
      label: level.dimensionLabel,
      isCrossAttributeFilter: true,
      levelsFilter: [{ id: level.levelId, label: level.levelLabel, values: data.map(({ id }) => id), data }],
      propertiesFilter: [],
      selectedProperties: [{
        levelId: level.levelId,
        id: level.levelId,
        label: level.levelLabel,
        levelLabel: level.levelLabel,
        values: data.map((member) => ({ ...member, value: member.id, selected: true, disabled: false })),
      }],
      hierarchy: {
        id: level.hierarchyId,
        label: level.hierarchyLabel,
        levels: [{ id: level.levelId, label: level.levelLabel, selected: true, selectedProperties: [] }],
      },
      ...(level.isTimeDimension ? { isTimeDimension: true } : { isTimeDimension: false }),
    };
  }),
});

/**
 * A saved filter's stored definition (`POST /filters/{instance}/{id}` with `{}` reads it; GET is blocked on both gateways):
 * `value`, `roles` (`read` non-empty = shared) and `instanceRoles` (the roles it can be shared with).
 */
export const readSavedFilter = async (access: IVerticalFilterAccess, id: string): Promise<any> => {
  const url = `${access.baseUrl}/filters/${encodeURIComponent(access.instance)}/${id}`;
  const response = await axios.post(url, {}, { headers: headersOf(access), timeout: getTimeout('XLARGE'), validateStatus: () => true });
  if (response.status !== 200) {
    throw new Error(`Reading saved vertical filter ${id} returned ${response.status}`);
  }
  return response.data?.data;
};

export const readSavedFilterValue = async (access: IVerticalFilterAccess, id: string): Promise<any> => (await readSavedFilter(access, id))?.value;

/** Shares a saved filter with every read role of its instance (`PATCH /filters/{instance}/{id}`, as the filter's Share does). */
const shareSavedFilter = async (access: IVerticalFilterAccess, id: string): Promise<boolean> => {
  const filter = await readSavedFilter(access, id);
  // The BFF takes role ids (strings) here, while reads return { id, label } objects (or ids).
  const ids = (roles: any[] | undefined) => (roles ?? []).map((role) => (typeof role === 'string' ? role : String(role.id)));
  const current = new Set(ids(filter?.roles?.read));
  const wanted = ids(filter?.instanceRoles?.read);
  // Update unless every instance read role is already there, so a partial share is completed too.
  if (wanted.length > 0 && wanted.every((role) => current.has(role))) {
    return false;
  }
  const url = `${access.baseUrl}/filters/${encodeURIComponent(access.instance)}/${id}`;
  const body = { value: filter.value, label: filter.label, isDraft: false, roles: { admin: ids(filter.roles?.admin), read: [...new Set([...current, ...wanted])] } };
  const response = await apiUtil.processAPIRequest('PATCH', url, body, { ...headersOf(access), 'Content-Type': 'application/json' }, `Share saved vertical filter ${filter.label}`, 'full');
  if (!(Number(response?.status) >= 200 && Number(response?.status) < 300)) {
    throw new Error(`Sharing saved vertical filter ${filter.label} returned ${response?.status}`);
  }
  return true;
};

/** `dimension.level` -> sorted member ids of every level filter, so a stored filter can be compared with a seed. */
const levelMembers = (value: any): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  for (const dimension of value?.dimensions ?? []) {
    for (const levelFilter of dimension.levelsFilter ?? []) {
      result[`${dimension.id}.${levelFilter.id}`] = [...(levelFilter.values ?? [])].map(String).sort();
    }
  }
  return result;
};

/** Whether a stored filter value selects exactly the seed's members (same dimensions, levels and members). */
export const savedFilterMatchesSeed = (value: any, seed: ISeedFilter): boolean => {
  const expected = levelMembers(buildSavedFilterValue(seed));
  return JSON.stringify(Object.entries(levelMembers(value)).sort()) === JSON.stringify(Object.entries(expected).sort());
};

/**
 * Makes the user own a filter labelled `seed.label` with exactly the seed's members: keeps a matching one, otherwise deletes
 * every owned filter with that label and creates it through the BFF (`POST /filters/{instance}`); then shares it when
 * `seed.shared` and reports whether the list shows it as shared. Returns what it did.
 */
export const ensureSavedFilter = async (access: IVerticalFilterAccess, seed: ISeedFilter): Promise<string> => {
  const outcome = await ensureSavedFilterMembers(access, seed);
  if (!seed.shared) {
    return outcome;
  }
  // A just-created filter can be missing from the list for a moment (read-after-write lag), so poll for it.
  let filter: ISavedFilter | undefined;
  const deadline = Date.now() + getTimeout('XLARGE');
  while (!(filter = (await listSavedFilters(access)).find((entry) => isSeedLabel(entry, seed)))) {
    if (Date.now() > deadline) {
      throw new Error(`Saved vertical filter ${seed.label} is not listed after it was ensured`);
    }
    await new Promise((resolve) => setTimeout(resolve, TIMEOUTS.POLL_INTERVAL * 2));
  }
  const patched = await shareSavedFilter(access, filter.id);
  // Non-empty roles.read is not enough: on Gravitee pspoat-test1 (2026-11-05) the list kept isShared: false, and the filter was
  // not offered under "Set as default for all users". Report the effective state instead of claiming success.
  const listed = (await listSavedFilters(access)).find((entry) => entry.id === filter!.id);
  if (listed?.isShared !== true) {
    await log.logMessage('WARN', `Saved vertical filter ${seed.label} has read roles but the list reports isShared: ${listed?.isShared}; it is not usable as a default for all users (PS ScopeBatch Test_016) until it is shared with the process users.`);
    return `${outcome}, read roles set but not effectively shared`;
  }
  return patched ? `${outcome}, shared` : `${outcome}, already shared`;
};

/** An owned list entry for the seed's filter. The list names a draft by its plain label (`isDraft: true`); the power bar
 * adds the `*`, so a trailing `*` is ignored in case a list ever returns it. */
const isSeedLabel = (filter: ISavedFilter, seed: ISeedFilter): boolean =>
  filter.isOwner !== false && filter.label.replace(/\*+$/, '').trim() === seed.label;

const ensureSavedFilterMembers = async (access: IVerticalFilterAccess, seed: ISeedFilter): Promise<'kept' | 'created' | 'replaced'> => {
  let owned = (await listSavedFilters(access)).filter((filter) => isSeedLabel(filter, seed));
  // A draft layer (a spec edited the applied filter without saving; `isDraft: true`, "<label>*" in the power bar) is what
  // a read returns; drop it first so the saved members are compared, and the filter (and its id in view presets) is kept.
  for (const filter of owned.filter(({ isDraft }) => isDraft === true)) {
    const draftUrl = `${access.baseUrl}/filters/${encodeURIComponent(access.instance)}/${filter.id}?isDraft=true`;
    const response = await apiUtil.processAPIRequest('DELETE', draftUrl, null, headersOf(access), `Discard draft of saved vertical filter ${seed.label}`, 'full');
    const status = Number(response?.status);
    // 404 = the draft is already gone; anything else must stop here, before the saved filter is compared or replaced.
    if (!((status >= 200 && status < 300) || status === 404)) {
      throw new Error(`Discarding the draft of saved vertical filter ${seed.label} returned ${response?.status}`);
    }
  }
  // The draft layers are gone now, so a later delete must not try to discard them again (that DELETE would 404).
  owned = owned.map((filter) => ({ ...filter, isDraft: false }));
  if (owned.length === 1 && savedFilterMatchesSeed(await readSavedFilterValue(access, owned[0].id), seed)) {
    return 'kept';
  }
  for (const filter of owned) {
    await deleteSavedFilter(access, filter);
  }
  const url = `${access.baseUrl}/filters/${encodeURIComponent(access.instance)}`;
  const body = { label: seed.label, value: buildSavedFilterValue(seed), isDraft: false, roles: { admin: [], read: [] } };
  const response = await apiUtil.processAPIRequest('POST', url, body, { ...headersOf(access), 'Content-Type': 'application/json' }, `Create saved vertical filter ${seed.label}`, 'full');
  const status = Number(response?.status);
  if (!(status >= 200 && status < 300)) {
    throw new Error(`Creating saved vertical filter ${seed.label} returned ${response?.status}`);
  }
  return owned.length ? 'replaced' : 'created';
};
