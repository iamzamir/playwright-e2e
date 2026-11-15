import { getConfig, graviteeRealm, navigationUrls, realmKeyEnvSuffix } from '../configs/env';

const GRAVITEE_BLOCK_KEY = 'GRAVITEE';

const isPlainObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const deepMerge = (base: Record<string, any>, override: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value;
  }
  return result;
};

export const isGraviteeGateway = (): boolean => {
  return getConfig().gatewayType.trim().toUpperCase() === 'GRAVITEE';
};

/**
 * Strips the `GRAVITEE` block from test data and, when GATEWAY_TYPE=GRAVITEE, deep-merges it over the base values.
 * Arrays and scalars in the block replace the base value; nested objects are merged.
 */
export const applyGatewayOverrides = <T extends Record<string, any>>(data: T, source: string = 'test data'): T => {
  const { [GRAVITEE_BLOCK_KEY]: overrides, ...base } = data;
  if (!isGraviteeGateway()) {
    return base as T;
  }
  if (!isPlainObject(overrides)) {
    throw new Error(`[testdata] GATEWAY_TYPE=GRAVITEE but ${source} has no "${GRAVITEE_BLOCK_KEY}" block. Add one (use {} when nothing differs) or exclude the spec from Gravitee runs.`);
  }
  return deepMerge(base, overrides) as T;
};

// Env vars that hold the Gravitee tenant derived from REALM_KEY (see configs/env).
const REALM_KEY_ENV_VARS = [
  'REALM_KEY',
  'LUMINATE_PORTAL_URL',
  'API_BASE_URL',
  'AUTH_URL',
  'NAVIGATE_TO_PLANNING_SPACE',
  'NAVIGATE_TO_PROCESS_ORCHESTRATION',
  'NAVIGATE_TO_SNA',
  'NAVIGATE_TO_IDENTITI_AND_ACCESS',
  'CLIENT_ID',
  'CLIENT_SECRET',
  'REALM_NAME',
  'REALM_ID',
  'SUBJECT_ID',
] as const;

/**
 * Points the Gravitee tenant env vars at `realmKey` (portal, API and auth hosts, the realm identity from
 * configs/gravitee-realms.json, plus the realm's own machine client when GRAVITEE_CLIENT_ID_<REALM_KEY> is set)
 * and returns a function that restores them. No-op on Azure, or when `realmKey` is empty or already the active key.
 * Throws for a key that is not in the registry, so a spec never mixes one tenant's URLs with another's identity.
 */
export const applyRealmKeyOverride = (realmKey: string | undefined): (() => void) => {
  const targetKey = String(realmKey || '').trim();
  const config = getConfig();
  const currentKey = config.realmKey.trim();
  if (!isGraviteeGateway() || !targetKey || targetKey === currentKey) {
    return () => {};
  }

  const environment = config.environment;
  const realm = graviteeRealm(environment, targetKey);
  if (!realm) {
    throw new Error(`[gateway] REALM_KEY="${targetKey}" from test data is not registered for ${environment} in configs/gravitee-realms.json; add its realmName/realmId/subjectId there.`);
  }

  const swapHost = (name: string): string | undefined => {
    const value = process.env[name];
    if (!value) return value;
    const url = new URL(value);
    const [firstLabel, ...rest] = url.hostname.split('.');
    if (firstLabel !== currentKey) {
      throw new Error(`[gateway] Cannot apply REALM_KEY="${targetKey}": ${name} host "${url.hostname}" does not start with the active REALM_KEY "${currentKey}".`);
    }
    url.hostname = [targetKey, ...rest].join('.');
    return url.toString();
  };

  const snapshot = Object.fromEntries(REALM_KEY_ENV_VARS.map((name) => [name, process.env[name]]));
  const updates: Record<string, string | undefined> = {
    REALM_KEY: targetKey,
    LUMINATE_PORTAL_URL: swapHost('LUMINATE_PORTAL_URL'),
    API_BASE_URL: swapHost('API_BASE_URL'),
    AUTH_URL: swapHost('AUTH_URL'),
    REALM_NAME: realm.realmName,
    REALM_ID: realm.realmId,
    SUBJECT_ID: realm.subjectId,
  };
  // Same composition as configs/env, which built these from the startup REALM_KEY's portal.
  Object.assign(updates, navigationUrls(updates.LUMINATE_PORTAL_URL, process.env));

  const envSuffix = realmKeyEnvSuffix(targetKey);
  const realmClientId = process.env[`GRAVITEE_CLIENT_ID_${envSuffix}`];
  const realmClientSecret = process.env[`GRAVITEE_CLIENT_SECRET_${envSuffix}`];
  if (realmClientId && realmClientSecret) {
    updates.CLIENT_ID = realmClientId;
    updates.CLIENT_SECRET = realmClientSecret;
  }

  for (const [name, value] of Object.entries(updates)) {
    if (value !== undefined) process.env[name] = value;
  }
  console.log(`[gateway] REALM_KEY override from test data: ${currentKey} -> ${targetKey} (portal ${process.env.LUMINATE_PORTAL_URL})`);

  return () => {
    for (const [name, value] of Object.entries(snapshot)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
};

// Gravitee states live in their own folder, keyed by the active REALM_KEY (tenant) as well as the realm name,
// so they never collide with an Azure realm of the same name or with another Gravitee tenant's cookies.
export const getAuthStateRealmFolder = (realmName: string): string => {
  if (!isGraviteeGateway()) {
    return realmName;
  }
  const realmKey = getConfig().realmKey.trim();
  return realmKey ? `gravitee-${realmKey}-${realmName}` : `gravitee-${realmName}`;
};
