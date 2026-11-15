/**
 * Typed environment config. `buildConfig` turns an incoming env (process.env, .env, CI) into every
 * setting the suite needs; `applyToProcessEnv` writes them as the legacy process.env keys that
 * specs and page objects still read. configs/setup.js calls both at startup.
 *
 * Utils read settings through `getConfig()`, a typed view over the current process.env. It is not
 * frozen: applyRealmKeyOverride() (util/gateway.util.ts) swaps hosts per test, and the view follows.
 */

import { ENDPOINTS, ENDPOINT_KEYS, type EndpointDef, type EndpointKey } from './endpoints';
import { ENVIRONMENTS, ENV_NAMES, isEnvName, type EnvName, type EnvironmentDef, type GatewayType, type LinkKey } from './environments';

export { ENDPOINTS, ENVIRONMENTS, ENV_NAMES };
export type { EndpointKey, EnvName, EnvironmentDef, GatewayType, LinkKey };

export type UrlMode = 'OLD' | 'NEW';
type Env = Record<string, string | undefined>;

export interface Config {
  environment: EnvName;
  psenv: EnvName;
  urlMode: UrlMode;
  gatewayType: GatewayType;
  realmKey: string;
  realmName: string | undefined;
  realmId: string | undefined;
  subjectId: string | undefined;
  hosts: {
    portal: string | undefined;
    api: string | undefined;
    auth: string | undefined;
    apiSource: string | undefined;
    apiTarget: string | undefined;
    authSource: string | undefined;
    authTarget: string | undefined;
  };
  links: Record<LinkKey, string | undefined>;
  navigation: ReturnType<typeof navigationUrls>;
  /**
   * Gateway paths relative to hosts.api; `{name}` tokens are for the caller to fill. Partial because
   * not every environment defines every endpoint; use `endpoint(key)` when the path is required.
   */
  endpoints: Readonly<Partial<Record<EndpointKey, string>>>;
  client: { id: string | undefined; secret: string | undefined; scope: string | undefined; portalId: string | undefined };
  /** Realm user tokens are issued for (QA machine tokens use REALM_NAME, user tokens the interop realm). */
  userTokenRealm: string | undefined;
  sql: { server: string; password: string };
  flags: { redactBearerToken: boolean; tokenCache: boolean };
}

export interface BuildResult {
  /** Every key setup writes, in assignment order, with process.env string semantics. */
  vars: Readonly<Record<string, string>>;
  /** `[setup] ...` lines, printed by setup.js. */
  logs: readonly string[];
  config: Readonly<Config>;
}

export const IDENTITY_AND_ACCESS = 'identityaccess/';

/** Portal deep links; shared with applyRealmKeyOverride() so a realm switch rebuilds them the same way. */
export function navigationUrls(portal: string | undefined, links: Partial<Record<LinkKey | 'IDENTITY_AND_ACCESS', string | undefined>>) {
  const join = (path: string | undefined) => `${portal}${path ?? ''}`;
  return {
    NAVIGATE_TO_PROCESS_ORCHESTRATION: join(links.POLINK),
    NAVIGATE_TO_PLANNING_SPACE: join(links.PSLINK),
    NAVIGATE_TO_SNA: join(links.SNALINK),
    NAVIGATE_TO_IDENTITI_AND_ACCESS: join(links.IDENTITY_AND_ACCESS),
  };
}

/** Upper-snake suffix used for per-realm client variables, e.g. pspoat-test1 -> PSPOAT_TEST1. */
export function realmKeyEnvSuffix(realmKey: string): string {
  return realmKey.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

export function resolveEndpoint(def: EndpointDef, env: EnvironmentDef, urlMode: UrlMode): string | undefined {
  if (def.envs && !def.envs.includes(env.psenv)) return undefined;
  const override = def.overrides?.[env.psenv];
  const useNew = urlMode === 'NEW' && env.newUrlPrefix !== undefined && def.newPath !== undefined && !override;
  const template = override ?? (useNew ? def.newPath! : def.oldPath);
  return template
    .replace('{gw}', `cbp/${env.gatewaySegment}`)
    .replace('{alm}', env.almSegment)
    .replace('{new}', env.newUrlPrefix ?? '');
}

/**
 * Pure: reads `incoming`, never touches process.env. Throws on an unknown ENVIRONMENT or missing
 * Gravitee credentials; the error carries the `[setup]` lines logged so far as `setupLogs`.
 */
export function buildConfig(incoming: Env): BuildResult {
  const logs: string[] = [];
  try {
    return build(incoming, logs);
  } catch (err) {
    if (err instanceof Error) Object.assign(err, { setupLogs: [...logs] });
    throw err;
  }
}

function build(incoming: Env, logs: string[]): BuildResult {
  const e: Env = { ...incoming };
  const vars: Record<string, string> = {};
  // process.env stores String(value), so an unset source becomes "undefined"; keep that for parity.
  const set = (key: string, value: unknown) => {
    const v = String(value);
    e[key] = v;
    vars[key] = v;
  };
  const log = (line: string) => logs.push(line);

  set('FUNCTIONAL_TEST_USERNAME', e.TEST_AUTOMATION_USER_1);
  set('FUNCTIONAL_TEST_USERNAME2', e.TEST_AUTOMATION_USER_2);
  set('FUNCTIONAL_TEST_PASSWORD', e.TEST_AUTOMATION_PASSWORD);
  set('SAUCE_USERNAME', e.SAUCE_PS_USERNAME);
  set('SAUCE_ACCESS_KEY', e.SAUCE_PS_ACCESS_KEY);
  set('DEBUG', e.DEBUG || 'true');
  set('HEADLESS', e.HEADLESS || 'false');
  set('PERFORMANCE_RUN_ITERATIONS', e.PERFORMANCE_RUN_ITERATIONS || '3');
  set('PW_ENABLE_GLOBAL_SETUP', e.PW_ENABLE_GLOBAL_SETUP || 'true');
  // Fixture page reuse: 'worker' or 'file-worker' (default).
  set('PW_PAGE_CACHE_SCOPE', e.PW_PAGE_CACHE_SCOPE || 'file-worker');
  // Network-log persistence: 'always' | 'failure-only' (default) | 'never'.
  const networkMode = (e.PW_NETWORK_ARTIFACT_MODE || '').trim().toLowerCase();
  set('PW_NETWORK_ARTIFACT_MODE', ['always', 'failure-only', 'never'].includes(networkMode) ? networkMode : 'failure-only');
  // 'true' (default) redacts bearer tokens in logs.
  set('REDACT_BEARER_TOKEN', (e.REDACT_BEARER_TOKEN || 'true').trim().toLowerCase());
  // 'true' (default) caches bearer tokens in memory and on disk; 'false' fetches a fresh token every call.
  set('ENABLE_TOKEN_CACHE', (e.ENABLE_TOKEN_CACHE || 'true').trim().toLowerCase());

  const environmentName = e.ENVIRONMENT || 'INTEROP';
  if (!isEnvName(environmentName)) {
    throw new Error(`[setup] Unknown ENVIRONMENT="${environmentName}". Use one of: ${ENV_NAMES.join(', ')}.`);
  }
  const env = ENVIRONMENTS[environmentName];

  const requestedUrlMode = (e.URL_MODE || 'OLD').toUpperCase();
  const newSupported = env.newUrlPrefix !== undefined;
  // Any value other than OLD selects the NEW paths, where they exist.
  const urlMode: UrlMode = requestedUrlMode === 'OLD' || !newSupported ? 'OLD' : 'NEW';

  // A single-gateway environment (STAGE) forces it, because .env often pins GATEWAY_TYPE for INTEROP.
  const gatewayType = (env.gateways.length === 1 ? env.gateways[0] : (e.GATEWAY_TYPE || 'AZURE').toUpperCase()) as GatewayType;
  set('GATEWAY_TYPE', gatewayType);

  if (env.realmForced) set('REALM_KEY', env.defaultRealmKey);
  else if (!e.REALM_KEY) set('REALM_KEY', env.defaultRealmKey);

  log(`[setup] ENVIRONMENT=${environmentName} URL_MODE=${newSupported ? requestedUrlMode : 'OLD'} GATEWAY_TYPE=${gatewayType} REALM_KEY=${e.REALM_KEY}`);
  if (requestedUrlMode !== 'OLD' && !newSupported) {
    log(`[setup] URL_MODE=${requestedUrlMode} is only supported for ${ENV_NAMES.filter(n => ENVIRONMENTS[n].newUrlPrefix !== undefined).join(' and ')}; using OLD for ${environmentName}`);
  }
  log(`[setup] PW_PAGE_CACHE_SCOPE=${e.PW_PAGE_CACHE_SCOPE}`);
  log(`[setup] PW_NETWORK_ARTIFACT_MODE=${e.PW_NETWORK_ARTIFACT_MODE}`);
  log(`[setup] REDACT_BEARER_TOKEN=${e.REDACT_BEARER_TOKEN}`);
  log(`[setup] ENABLE_TOKEN_CACHE=${e.ENABLE_TOKEN_CACHE}`);
  set('USE_SPECIFIC_TESTS', (e.USE_SPECIFIC_TESTS || 'false').toLowerCase() === 'true' ? 'true' : 'false');

  set('PSENV', env.psenv);
  for (const key of Object.keys(env.links) as LinkKey[]) {
    set(key, env.incomingLinks.includes(key) ? (e[key] || env.links[key]) : env.links[key]);
  }
  for (const [key, value] of Object.entries(env.fixed)) set(key, value);
  for (const [key, value] of Object.entries(env.defaults)) set(key, e[key] || value);
  for (const [key, sourceVar] of Object.entries(env.secrets)) set(key, e[sourceVar]);

  const endpoints: Partial<Record<EndpointKey, string>> = {};
  for (const key of ENDPOINT_KEYS) {
    const path = resolveEndpoint(ENDPOINTS[key], env, urlMode);
    if (path === undefined) continue;
    endpoints[key] = path;
    set(key, path);
  }

  if (gatewayType === 'GRAVITEE') applyGravitee(env, e, set, log);

  // Non-Gravitee gateways use a single auth and API host, so source/target fall back to them.
  set('AUTH_URL_SOURCE', e.AUTH_URL_SOURCE || e.AUTH_URL);
  set('AUTH_URL_TARGET', e.AUTH_URL_TARGET || e.AUTH_URL);
  set('API_BASE_URL_SOURCE', e.API_BASE_URL_SOURCE || e.API_BASE_URL);
  set('API_BASE_URL_TARGET', e.API_BASE_URL_TARGET || e.API_BASE_URL);

  // Each environment has its own SQL host/password; database and user are shared across them.
  const sqlServerVar = `SQL_SERVER_${env.sqlSuffix}`;
  const sqlServerScoped = Boolean(e[sqlServerVar]);
  set('SQL_SERVER', e[sqlServerVar] || e.SQL_SERVER || '');
  set('SQL_PASSWORD', e[`SQL_PASSWORD_${env.sqlSuffix}`] || e.SQL_PASSWORD || '');
  log(`[setup] SQL_SERVER from ${sqlServerScoped ? sqlServerVar : `generic SQL_SERVER fallback (set ${sqlServerVar} to target the ${environmentName} database)`}`);

  set('IDENTITY_AND_ACCESS', IDENTITY_AND_ACCESS);
  for (const [key, value] of Object.entries(navigationUrls(e.LUMINATE_PORTAL_URL, e))) set(key, value);

  if (e.TEST_GREP_PATTERN) log(`🔍 TEST_GREP_PATTERN set to: ${e.TEST_GREP_PATTERN}`);

  return { vars, logs, config: Object.freeze(configFromEnv(e, environmentName, urlMode, endpoints)) };
}

function applyGravitee(env: EnvironmentDef, e: Env, set: (key: string, value: unknown) => void, log: (line: string) => void) {
  const g = env.gravitee;
  const realmKey = g.realmKeyForced ? g.realmKey : (e.REALM_KEY || g.realmKey);
  set('REALM_KEY', realmKey);
  const override = (name: string) => e[`${g.overridePrefix}${name}`];
  const domainSuffix = override('DOMAIN_SUFFIX') || g.domainSuffix;
  const realmHost = (key: string, kind: 'api' | 'auth' | 'portal') =>
    `https://${key}.${kind}.${domainSuffix}/${kind === 'auth' ? 'oauth/token' : ''}`;

  set('API_BASE_URL', override('API_BASE_URL') || realmHost(realmKey, 'api'));
  set('AUTH_URL', override('AUTH_URL') || realmHost(realmKey, 'auth'));
  set('LUMINATE_PORTAL_URL', override('PORTAL_URL') || realmHost(realmKey, 'portal'));

  if (g.sourceTarget) {
    // Gravitee scopes the realm and API by hostname, so source/target need their own realm keys.
    const sourceKey = e.REALM_KEY_SOURCE || realmKey;
    const targetKey = e.REALM_KEY_TARGET || realmKey;
    set('AUTH_URL_SOURCE', override('AUTH_URL_SOURCE') || realmHost(sourceKey, 'auth'));
    set('AUTH_URL_TARGET', override('AUTH_URL_TARGET') || realmHost(targetKey, 'auth'));
    set('API_BASE_URL_SOURCE', override('API_BASE_URL_SOURCE') || realmHost(sourceKey, 'api'));
    set('API_BASE_URL_TARGET', override('API_BASE_URL_TARGET') || realmHost(targetKey, 'api'));
  }

  // A realm with its own machine client exposes it as GRAVITEE_CLIENT_ID_<REALM_KEY> (e.g. GRAVITEE_CLIENT_ID_PSPOAT_TEST1).
  const realmClientIdVar = `GRAVITEE_CLIENT_ID_${realmKeyEnvSuffix(realmKey)}`;
  const realmClientSecretVar = `GRAVITEE_CLIENT_SECRET_${realmKeyEnvSuffix(realmKey)}`;
  const clientIdVar = g.perRealmClient && e[realmClientIdVar] ? realmClientIdVar : g.clientIdVar;
  const clientSecretVar = g.perRealmClient && e[realmClientSecretVar] ? realmClientSecretVar : g.clientSecretVar;
  if (e[clientIdVar]) set('CLIENT_ID', e[clientIdVar]);
  if (e[clientSecretVar]) set('CLIENT_SECRET', e[clientSecretVar]);

  if (g.perRealmClient) {
    // Non-secret identity of Gravitee-only realms, keyed by REALM_KEY (shared with util/gateway.util.ts).
    const realm = graviteeRealm(env.psenv, realmKey);
    if (realm) {
      set('REALM_NAME', realm.realmName);
      set('REALM_ID', realm.realmId);
      set('SUBJECT_ID', realm.subjectId);
    }
    log(`[setup] Gravitee realm: REALM_NAME=${e.REALM_NAME} client from ${clientIdVar}/${clientSecretVar}`);
  }

  if (g.sourceTarget) {
    set('REALM_CLIENT_ID_SOURCE', g.sourceTarget.sourceClientId);
    set('REALM_CLIENT_SECRET_SOURCE', e[g.sourceTarget.sourceClientSecretVar]);
    set('REALM_CLIENT_ID_TARGET', e.CLIENT_ID);
    set('REALM_CLIENT_SECRET_TARGET', e.CLIENT_SECRET);
  }

  if (!e[clientIdVar] || !e[clientSecretVar]) {
    const missing: string[] = [];
    if (g.perRealmClient) {
      if (!e[clientIdVar]) missing.push(`${realmClientIdVar} or ${g.clientIdVar}`);
      if (!e[clientSecretVar]) missing.push(`${realmClientSecretVar} or ${g.clientSecretVar}`);
      throw new Error(`[setup] GATEWAY_TYPE is set to GRAVITEE, but missing required credentials: ${missing.join(', ')}. Please configure them in your environment or .env file.`);
    }
    if (!e[clientIdVar]) missing.push(clientIdVar);
    if (!e[clientSecretVar]) missing.push(clientSecretVar);
    throw new Error(`[setup] GATEWAY_TYPE is set to GRAVITEE, but missing required credentials: ${missing.join(', ')}. Please configure ${clientIdVar} and ${clientSecretVar} in your environment or .env file.`);
  }

  log(`[setup] Gravitee Gateway Configured: REALM_KEY=${e.REALM_KEY} API_BASE_URL=${e.API_BASE_URL} AUTH_URL=${e.AUTH_URL}`);
}

interface GraviteeRealm { realmName: string; realmId: string; subjectId: string }

export function graviteeRealm(environment: EnvName, realmKey: string): GraviteeRealm | undefined {
  const realms = require('../gravitee-realms.json') as Record<string, Record<string, GraviteeRealm>>;
  return realms[environment]?.[realmKey];
}

function configFromEnv(e: Env, environment: EnvName, urlMode: UrlMode, endpoints?: Partial<Record<EndpointKey, string>>): Config {
  const endpointView = endpoints ?? (Object.fromEntries(
    ENDPOINT_KEYS.filter(k => e[k] !== undefined).map(k => [k, e[k] as string]),
  ) as Partial<Record<EndpointKey, string>>);
  return {
    environment,
    psenv: (e.PSENV as EnvName) || environment,
    urlMode,
    gatewayType: (e.GATEWAY_TYPE as GatewayType) || 'AZURE',
    realmKey: e.REALM_KEY || '',
    realmName: e.REALM_NAME,
    realmId: e.REALM_ID,
    subjectId: e.SUBJECT_ID,
    hosts: {
      portal: e.LUMINATE_PORTAL_URL,
      api: e.API_BASE_URL,
      auth: e.AUTH_URL,
      apiSource: e.API_BASE_URL_SOURCE,
      apiTarget: e.API_BASE_URL_TARGET,
      authSource: e.AUTH_URL_SOURCE,
      authTarget: e.AUTH_URL_TARGET,
    },
    links: { POLINK: e.POLINK, PSLINK: e.PSLINK, SNALINK: e.SNALINK },
    navigation: {
      NAVIGATE_TO_PROCESS_ORCHESTRATION: e.NAVIGATE_TO_PROCESS_ORCHESTRATION || '',
      NAVIGATE_TO_PLANNING_SPACE: e.NAVIGATE_TO_PLANNING_SPACE || '',
      NAVIGATE_TO_SNA: e.NAVIGATE_TO_SNA || '',
      NAVIGATE_TO_IDENTITI_AND_ACCESS: e.NAVIGATE_TO_IDENTITI_AND_ACCESS || '',
    },
    endpoints: Object.freeze(endpointView),
    client: { id: e.CLIENT_ID, secret: e.CLIENT_SECRET, scope: e.SCOPE, portalId: e.PORTAL_CLIENT_ID },
    userTokenRealm: e.USER_TOKEN_REALM,
    sql: { server: e.SQL_SERVER || '', password: e.SQL_PASSWORD || '' },
    flags: {
      redactBearerToken: (e.REDACT_BEARER_TOKEN || 'true').trim().toLowerCase() === 'true',
      tokenCache: (e.ENABLE_TOKEN_CACHE || 'true').trim().toLowerCase() === 'true',
    },
  };
}

/** Writes the legacy process.env keys setup.js has always provided. */
export function applyToProcessEnv(result: BuildResult, target: NodeJS.ProcessEnv = process.env): void {
  for (const [key, value] of Object.entries(result.vars)) target[key] = value;
}

/**
 * Typed view of the current settings. Reads process.env on every call, so per-test changes
 * (applyRealmKeyOverride, specs that point API_BASE_URL at a source/target realm) are visible.
 */
export function getConfig(source: Env = process.env): Readonly<Config> {
  const environment = source.ENVIRONMENT || 'INTEROP';
  if (!isEnvName(environment)) {
    throw new Error(`[config] Unknown ENVIRONMENT="${environment}". Use one of: ${ENV_NAMES.join(', ')}.`);
  }
  const requested = (source.URL_MODE || 'OLD').toUpperCase();
  const urlMode: UrlMode = requested !== 'OLD' && ENVIRONMENTS[environment].newUrlPrefix !== undefined ? 'NEW' : 'OLD';
  return configFromEnv(source, environment, urlMode);
}

/** Gateway path for `key`, failing loudly when the active environment doesn't define it. */
export function endpoint(key: EndpointKey, source: Env = process.env): string {
  const value = source[key];
  if (!value) throw new Error(`[config] ${key} is not defined for ENVIRONMENT=${source.ENVIRONMENT || 'INTEROP'}`);
  return value;
}
