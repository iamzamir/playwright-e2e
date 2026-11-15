// Unit tests for configs/env (T7.4). Run: npm run test:config
const test = require('node:test');
const assert = require('node:assert/strict');

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
const { buildConfig, getConfig, applyToProcessEnv, ENDPOINTS, ENVIRONMENTS } = require('../../configs/env');

const creds = {
  QA_GRAVITEE_CLIENT_ID: 'id', QA_GRAVITEE_CLIENT_SECRET: 'secret',
  PSR_GRAVITEE_CLIENT_ID: 'id', PSR_GRAVITEE_CLIENT_SECRET: 'secret',
  STAGE_GRAVITEE_CLIENT_ID: 'id', STAGE_GRAVITEE_CLIENT_SECRET: 'secret',
  GRAVITEE_CLIENT_ID: 'id', GRAVITEE_CLIENT_SECRET: 'secret',
};

test('every environment resolves every endpoint it declares', () => {
  for (const name of Object.keys(ENVIRONMENTS)) {
    for (const urlMode of ['OLD', 'NEW']) {
      const { config } = buildConfig({ ...creds, ENVIRONMENT: name, URL_MODE: urlMode });
      for (const [key, def] of Object.entries(ENDPOINTS)) {
        const expected = !def.envs || def.envs.includes(name);
        assert.equal(key in config.endpoints, expected, `${name} ${urlMode} ${key}`);
        if (expected) assert.doesNotMatch(config.endpoints[key], /\{(gw|alm|new)\}/, `${name} ${key} has an unfilled placeholder`);
      }
    }
  }
});

test('concrete endpoint paths per environment, including the overrides', () => {
  const expected = {
    QA: {
      CALENDAR: 'cbp/qa/ibp/process-orchestration/v1/calendar',
      SIMULATION: 'cbp/foundation-simulation/v1qa',
      DELETE_ACTOR: 'cbp/foundation-bff/v1qa/actorsConfig/{actorName}?offset=0&limit=10&hidden=false',
      ALM_DEPLOY_RESOURCE: 'alm/core/staging/deployments/resource/{resourceId}',
    },
    INTEROP: {
      ACTIONITEM2: 'cbp/interop/ibp/actionitems/v1/actionitems',
      PROCESS_MODELS: 'cbp/foundation-model/v1ioptst/processModels',
      GET_PROCESSMODEL_ENTITY: 'cbp/interop/foundation/model/v1/processModels/',
      UI_FIELDS_BASE: 'cbp/interop/ibp/ui-fields/v1',
    },
    PSR: {
      PLANNING_INSTANCE: 'cbp/cbp/psr/foundation/interactive-planning/planningInstance',
      GET_PROCEDURES: 'cbp/psr/foundation-bff/v1/proceduresConfig?offset=0&limit=10&hidden=false',
      GET_PROCESSMODEL_ENTITY: 'cbp/psr/foundation-model/v1/processModels/',
      ALM_DOWNLOAD_ZIP: 'alm/exchange/psr/resources/{resourceId}/downloadZip',
    },
    STAGE: {
      DELETE_ACTOR: 'cbp/demo/foundation/sna-bff/v1/actorsConfig/{actorName}?offset=0&limit=10&hidden=false',
      PROCESS_MODELS: 'cbp/demo/foundation/model/v1/processModels',
      VIEW_ENTITY_MAP: 'cbp/demo/ibp/links/v1/view-entity-map',
      GET_PROCESS_ROLES: 'iam/realm/v1/roles',
    },
  };
  for (const [name, paths] of Object.entries(expected)) {
    const { config } = buildConfig({ ...creds, ENVIRONMENT: name });
    for (const [key, path] of Object.entries(paths)) assert.equal(config.endpoints[key], path, `${name} ${key}`);
  }
  assert.equal(buildConfig({ ENVIRONMENT: 'QA' }).config.endpoints.GET_PROCESSMODEL_ENTITY, undefined);
  const qaNew = buildConfig({ ENVIRONMENT: 'QA', URL_MODE: 'NEW' }).config.endpoints;
  assert.equal(qaNew.ACTIONITEM2, 'qa/ai/api/v1/actionitems');
  assert.equal(qaNew.DELETE_VIEW_ENTITY_MAP, 'qa/lm/api/v1/view-entity-map/views/{viewId}/type/subprocess/entity/{entity}');
  assert.equal(qaNew.SIMULATION, 'cbp/foundation-simulation/v1qa', 'overrides ignore URL_MODE');
  assert.equal(qaNew.UI_FIELDS_BASE, 'cbp/qa/ibp/ui-fields/v1', 'UI Fields has no NEW path');
});

test('INTEROP Gravitee source/target realms and per-realm client selection', () => {
  const { vars } = buildConfig({
    ...creds, ENVIRONMENT: 'INTEROP', GATEWAY_TYPE: 'GRAVITEE', REALM_KEY_SOURCE: 'src-key', REALM_KEY_TARGET: 'tgt-key',
    REALM_CLIENT_SECRET_GVT_SOURCE_PO_PS_1: 'source-secret',
  });
  assert.equal(vars.AUTH_URL_SOURCE, 'https://src-key.auth.interop.na.blueyonder.dev/oauth/token');
  assert.equal(vars.API_BASE_URL_TARGET, 'https://tgt-key.api.interop.na.blueyonder.dev/');
  assert.equal(vars.REALM_CLIENT_ID_SOURCE, '06e8f2d0-b066-484e-be5a-16e770350d82');
  assert.equal(vars.REALM_CLIENT_SECRET_SOURCE, 'source-secret');
  assert.equal(vars.REALM_CLIENT_ID_TARGET, 'id', 'target reuses the main Gravitee client');

  const generic = buildConfig({ ...creds, ENVIRONMENT: 'INTEROP', GATEWAY_TYPE: 'GRAVITEE', REALM_KEY: 'pspoat-test1' });
  assert.equal(generic.vars.CLIENT_ID, 'id', 'falls back to GRAVITEE_CLIENT_ID');
  assert.equal(generic.vars.REALM_NAME, 'pspo-int-automation', 'realm identity from gravitee-realms.json');

  const own = buildConfig({
    ...creds, ENVIRONMENT: 'INTEROP', GATEWAY_TYPE: 'GRAVITEE', REALM_KEY: 'pspoat-test1',
    GRAVITEE_CLIENT_ID_PSPOAT_TEST1: 'realm-id', GRAVITEE_CLIENT_SECRET_PSPOAT_TEST1: 'realm-secret',
  });
  assert.equal(own.vars.CLIENT_ID, 'realm-id');
  assert.equal(own.vars.CLIENT_SECRET, 'realm-secret');
  assert.ok(own.logs.some(l => l.includes('client from GRAVITEE_CLIENT_ID_PSPOAT_TEST1/GRAVITEE_CLIENT_SECRET_PSPOAT_TEST1')));

  assert.throws(
    () => buildConfig({ ENVIRONMENT: 'INTEROP', GATEWAY_TYPE: 'GRAVITEE', REALM_KEY: 'pspoat-test1' }),
    /GRAVITEE_CLIENT_ID_PSPOAT_TEST1 or GRAVITEE_CLIENT_ID/,
  );
});

test('STAGE forces Gravitee and its realm, and ignores INTEROP-flavoured overrides', () => {
  const { vars, config } = buildConfig({
    ...creds, ENVIRONMENT: 'STAGE', GATEWAY_TYPE: 'AZURE', REALM_KEY: 'cbpf-test23', REALM_NAME: 'interop', REALMS: 'interop',
    GRAVITEE_API_BASE_URL: 'https://interop-api/', GRAVITEE_DOMAIN_SUFFIX: 'wrong.example',
  });
  assert.equal(config.gatewayType, 'GRAVITEE');
  assert.equal(config.realmKey, 'cbprndsg-demo');
  assert.equal(vars.REALM_NAME, 'cbprndsg-demo');
  assert.equal(vars.REALMS, 'cbprndsg-demo');
  assert.equal(config.hosts.api, 'https://cbprndsg-demo.api.interop.na.blueyonder.dev/');
  assert.equal(config.endpoints.CALENDAR, 'cbp/demo/ibp/process-orchestration/v1/calendar');
  assert.equal(config.endpoints.ALM_DEPLOY_RESOURCE, 'alm/core/demo/deployments/resource/{resourceId}');
});

test('URL_MODE=NEW applies to QA and INTEROP only', () => {
  assert.equal(buildConfig({ ENVIRONMENT: 'QA', URL_MODE: 'NEW' }).config.endpoints.CALENDAR, 'qa/po/api/v1/calendar');
  assert.equal(buildConfig({ ENVIRONMENT: 'INTEROP', URL_MODE: 'NEW' }).config.endpoints.CALENDAR, 'po/api/v1/calendar');
  for (const name of ['PSR', 'STAGE']) {
    const { config, logs } = buildConfig({ ...creds, ENVIRONMENT: name, URL_MODE: 'NEW' });
    assert.equal(config.urlMode, 'OLD');
    assert.match(config.endpoints.CALENDAR, /^cbp\/(psr|demo)\/ibp\/process-orchestration\/v1\/calendar$/);
    assert.ok(logs.some(l => l.includes(`using OLD for ${name}`)), `${name} logs the fallback`);
  }
});

test('an unknown ENVIRONMENT throws; unset defaults to INTEROP', () => {
  assert.throws(() => buildConfig({ ENVIRONMENT: 'STAGING' }), /Unknown ENVIRONMENT="STAGING"/);
  assert.equal(buildConfig({}).config.environment, 'INTEROP');
});

test('missing Gravitee credentials throw with the [setup] lines logged so far', () => {
  assert.throws(() => buildConfig({ ENVIRONMENT: 'PSR', GATEWAY_TYPE: 'GRAVITEE' }), err => {
    assert.match(err.message, /PSR_GRAVITEE_CLIENT_ID, PSR_GRAVITEE_CLIENT_SECRET/);
    assert.ok(err.setupLogs.some(l => l.startsWith('[setup] ENVIRONMENT=PSR')));
    return true;
  });
});

test('DEBUG, PERFORMANCE_RUN_ITERATIONS and NAVIGATE_TO_IDENTITI_AND_ACCESS', () => {
  const defaults = buildConfig({}).vars;
  assert.equal(defaults.DEBUG, 'true');
  assert.equal(defaults.PERFORMANCE_RUN_ITERATIONS, '3');
  assert.equal(defaults.NAVIGATE_TO_IDENTITI_AND_ACCESS, 'https://bylumuiportalpltna.azureedge.net/identityaccess/');
  const incoming = buildConfig({ DEBUG: 'false', PERFORMANCE_RUN_ITERATIONS: '5' }).vars;
  assert.equal(incoming.DEBUG, 'false');
  assert.equal(incoming.PERFORMANCE_RUN_ITERATIONS, '5');
});

test('getConfig follows a per-test REALM_KEY override and its restore', () => {
  const saved = { ...process.env };
  try {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, saved.PATH ? { PATH: saved.PATH } : {}, creds, { ENVIRONMENT: 'INTEROP', GATEWAY_TYPE: 'GRAVITEE' });
    applyToProcessEnv(buildConfig(process.env));
    const { applyRealmKeyOverride } = require('../../util/gateway.util');

    assert.equal(getConfig().hosts.portal, 'https://cbpf-test23.portal.interop.na.blueyonder.dev/');
    const restore = applyRealmKeyOverride('pspoat-test1');
    const switched = getConfig();
    assert.equal(switched.realmKey, 'pspoat-test1');
    assert.equal(switched.realmName, 'pspo-int-automation');
    assert.equal(switched.hosts.api, 'https://pspoat-test1.api.interop.na.blueyonder.dev/');
    assert.equal(switched.navigation.NAVIGATE_TO_PROCESS_ORCHESTRATION, 'https://pspoat-test1.portal.interop.na.blueyonder.dev/pointegration/');
    assert.equal(switched.navigation.NAVIGATE_TO_IDENTITI_AND_ACCESS, 'https://pspoat-test1.portal.interop.na.blueyonder.dev/identityaccess/');
    restore();
    assert.equal(getConfig().realmKey, 'cbpf-test23');
    assert.equal(getConfig().navigation.NAVIGATE_TO_PROCESS_ORCHESTRATION, 'https://cbpf-test23.portal.interop.na.blueyonder.dev/pointegration/');
  } finally {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
