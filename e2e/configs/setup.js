require('dotenv').config();
const setEnv = () => {
  process.env.BUILD_PREFIX = 'ABPIBP_CA_01'
  process.env.FUNCTIONAL_TEST_USERNAME = process.env.TEST_AUTOMATION_USER_1
  process.env.FUNCTIONAL_TEST_USERNAME2 = process.env.TEST_AUTOMATION_USER_2
  process.env.FUNCTIONAL_TEST_PASSWORD = process.env.TEST_AUTOMATION_PASSWORD
  process.env.SAUCE_USERNAME = process.env.SAUCE_PS_USERNAME
  process.env.SAUCE_ACCESS_KEY = process.env.SAUCE_PS_ACCESS_KEY
  process.env.DEBUG = true;

  const environment = process.env.ENVIRONMENT || 'INTEROP'
  const urlMode = (process.env.URL_MODE || 'OLD').toUpperCase()
  const useOldUrls = urlMode === 'OLD'
  console.log(`[setup] ENVIRONMENT=${environment} URL_MODE=${urlMode}`)
  process.env.SUITENAME = process.env.SUITENAME || (environment === 'QA' ? 'complete-qa-suite' : 'complete-iop-suite');

  if (environment === 'DEV') {
    process.env.PSENV = "DEV"
    process.env.POLINK = 'pofeatureqa/'
    process.env.PSLINK = 'IBPPlanQA/'
    process.env.SNALINK = 'semantic-network-architect-qa/'
    process.env.REALM_NAME = "cbp-e2e-qa"
    process.env.REALM_NAME_SOURCE = "cbp-qa-po-migration-1"
    process.env.REALM_NAME_TARGET = "cbp-qa-po-migration-2"
    process.env.CLIENT_ID = "4a063cd7-3032-4a3a-99f6-7d170ca32298"
    process.env.REALM_CLIENT_ID_SOURCE = "99770f27-aa3f-421f-b453-6a03ae1e7da9"
    process.env.REALM_CLIENT_ID_TARGET = "dea9530f-3bfa-4006-afbd-5dccd5707033"
    process.env.CLIENT_SECRET = process.env.CLIENT_SECRET_QA;
    process.env.REALM_CLIENT_SECRET_SOURCE = process.env.REALM_CLIENT_SECRET_PO_QA_MIG_1
    process.env.REALM_CLIENT_SECRET_TARGET = process.env.REALM_CLIENT_SECRET_PO_QA_MIG_2
    process.env.REALM_MACHINE_SUBJECT_ID_SOURCE = "86528d7a-029b-43e0-a65a-b413dcd3938b"
    process.env.REALM_MACHINE_SUBJECT_ID_TARGET = "718ce689-d2a1-4c45-8ba4-5d180f494b08"
    process.env.REALM_ID = "ca7623d3-b234-431c-a445-4a1d5444668e"
    process.env.SUBJECT_ID = "1941bac5-7ea3-40af-af9d-4166fd2a3d05"
    process.env.REALM_ID_SOURCE = "6d54cd6d-2cab-4e4f-aa11-43050e29fbf7"
    process.env.REALM_ID_TARGET = "43eb63e3-6e79-4118-a9db-ec439dd008bd"
    process.env.API_BASE_URL = "https://api-tst.jdadelivers.com/"
    process.env.AUTH_URL = "https://blueyonderinteroptestus.b2clogin.com/blueyonderinteroptestus.onmicrosoft.com/B2C_1A_ClientCredential/oauth2/v2.0/token"
    process.env.SCOPE = "https://blueyonderinteroptestus.onmicrosoft.com/6ad21424-b4b2-462e-80df-252ec22dd6a9/.default"
    process.env.CALENDAR = "dev/po/api/v1/calendar"
    process.env.DELETE_CALENDAR = "dev/po/api/v1/calendar/{calendarName}"
    process.env.ADD_CALENDAR_CYCLE = "dev/po/api/v1/calendar/{calendarName}/cycle"
    process.env.ACTIONITEM = "dev/po/api/v1/"
    process.env.ACTIONITEM2 = "dev/ai/api/v1/actionitems"
    process.env.DELETE_ACTIONITEM = "dev/ai/api/v1/actionitems/"
    process.env.SIMULATION = "cbp/foundation-simulation/v1dev"
    process.env.PLANNING_INSTANCE = "cbp/foundation-interactive-planning/v1dev/planningInstance"
    process.env.SEARCH_SIMULATION = "cbp/foundation-simulation/v1dev/simulations/search"
    process.env.RESOURCE_POOL_MANAGER = "cbp/dev/maas/resource-pool-manager/v1/clusters"
    process.env.MAAS_CONFIG = "cbp/dev/maas/config/v1/calcEngines"
    process.env.VIEW_ENTITY_MAP = "dev/lm/api/v1/view-entity-map"
    process.env.VIEW_ENTITY_PROCEDURE_MAP = "dev/lm/api/v1/entity-view-procedure-map"
    process.env.EXPORT_DATA = "dev/po/api/v1/exportData"
    process.env.IMPORT_DATA = "dev/po/api/v1/importData"
    process.env.CREATE_PROCESS_WITH_TEMPLATE = "dev/po/api/v1/process/template"
    process.env.GET_PROCESS_WITH_NAME = "dev/po/api/v1/process"
    process.env.DELETE_PROCESS = "dev/po/api/v1/process/{processName}"
    process.env.GET_PROCESS_ROLES = "iam/realm/v1/roles"
    process.env.ASSIGN_ROLE_TO_USER = "iam/realm/v1/roles/{roleId}/subjects"
    process.env.UNASSIGN_ROLE_TO_USER = "iam/realm/v1/roles/{roleId}/subjects/{subjectId}"
    process.env.DELETE_ROLE = "iam/realm/v1/roles/{roleId}"
    process.env.CREATE_SUBPROCESS = "dev/po/api/v1/process/{processName}/subprocess"
    process.env.DELETE_ACTOR = "cbp/foundation-bff/v1dev/actorsConfig/{actorName}?offset=0&limit=10&hidden=false"
    process.env.GET_PROCEDURES = "cbp/foundation-bff/v1dev/proceduresConfig?offset=0&limit=10&hidden=false"
    process.env.DELETE_PROCEDURE = "cbp/foundation-bff/v1dev/proceduresConfig/{procedureName}?offset=0&limit=10&hidden=false"
    process.env.GET_SUPPLY_CHAIN_ACTIONS = "dev/po/api/v1/supplyChainAction"
    process.env.DELETE_SUPPLY_CHAIN_ACTION = "dev/po/api/v1/supplyChainAction/{id}"
    process.env.CREATE_ASSUMPTION_KPI_CONFIG = "cbp/dev/ibp/assumptions/v1/kpi_config/"
    process.env.DELETE_ASSUMPTION_KPI_CONFIG = "cbp/dev/ibp/assumptions/v1/kpi_config/{id}?hard=false"
    process.env.DELETE_ACTIONITEM_KPI = "/dev/ai/api/v1/kpis/{id}"
    process.env.CREATE_ACTIONITEM_KPI_CONFIG = "/dev/ai/api/v1/kpis"
    process.env.UPDATE_FEATURE_TOGGLE = "cbp/dev/ibp/featuretoggle/v1/featuretoggle/{featureFlagName}"
  }
  if (environment === 'QA') {
    process.env.PSENV = "QA"
    process.env.POLINK = 'pofeatureqa/'
    process.env.PSLINK = 'IBPPlanQA/'
    process.env.SNALINK = 'semantic-network-architect-qa/'
    process.env.REALM_NAME = "cbp-e2e-qa"
    process.env.REALM_NAME_SOURCE = "cbp-qa-po-migration-1"
    process.env.REALM_NAME_TARGET = "cbp-qa-po-migration-2"
    process.env.CLIENT_ID = "4a063cd7-3032-4a3a-99f6-7d170ca32298"
    process.env.REALM_CLIENT_ID_SOURCE = "99770f27-aa3f-421f-b453-6a03ae1e7da9"
    process.env.REALM_CLIENT_ID_TARGET = "dea9530f-3bfa-4006-afbd-5dccd5707033"
    process.env.CLIENT_SECRET = process.env.CLIENT_SECRET_QA;
    process.env.REALM_CLIENT_SECRET_SOURCE = process.env.REALM_CLIENT_SECRET_PO_QA_MIG_1
    process.env.REALM_CLIENT_SECRET_TARGET = process.env.REALM_CLIENT_SECRET_PO_QA_MIG_2
    process.env.REALM_MACHINE_SUBJECT_ID_SOURCE = "86528d7a-029b-43e0-a65a-b413dcd3938b"
    process.env.REALM_MACHINE_SUBJECT_ID_TARGET = "718ce689-d2a1-4c45-8ba4-5d180f494b08"
    process.env.REALM_ID = "ca7623d3-b234-431c-a445-4a1d5444668e"
    process.env.SUBJECT_ID = "1941bac5-7ea3-40af-af9d-4166fd2a3d05"
    process.env.REALM_ID_SOURCE = "6d54cd6d-2cab-4e4f-aa11-43050e29fbf7"
    process.env.REALM_ID_TARGET = "43eb63e3-6e79-4118-a9db-ec439dd008bd"
    process.env.API_BASE_URL = "https://api-tst.jdadelivers.com/"
    process.env.AUTH_URL = "https://blueyonderinteroptestus.b2clogin.com/blueyonderinteroptestus.onmicrosoft.com/B2C_1A_ClientCredential/oauth2/v2.0/token"
    process.env.SCOPE = "https://blueyonderinteroptestus.onmicrosoft.com/6ad21424-b4b2-462e-80df-252ec22dd6a9/.default"
    process.env.CALENDAR = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/calendar" : "qa/po/api/v1/calendar"
    process.env.DELETE_CALENDAR = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/calendar/{calendarName}" : "qa/po/api/v1/calendar/{calendarName}"
    process.env.ADD_CALENDAR_CYCLE = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/calendar/{calendarName}/cycle" : "qa/po/api/v1/calendar/{calendarName}/cycle"
    process.env.ACTIONITEM = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/" : "qa/po/api/v1/"
    process.env.ACTIONITEM2 = useOldUrls ? "cbp/qa/ibp/actionitems/v1/actionitems" : "qa/ai/api/v1/actionitems"
    process.env.DELETE_ACTIONITEM = useOldUrls ? "cbp/qa/ibp/actionitems/v1/actionitems/" : "qa/ai/api/v1/actionitems/"
    process.env.SIMULATION = "cbp/foundation-simulation/v1qa"
    process.env.PLANNING_INSTANCE = "cbp/foundation-interactive-planning/v1qa/planningInstance"
    process.env.SEARCH_SIMULATION = "cbp/foundation-simulation/v1qa/simulations/search"
    process.env.RESOURCE_POOL_MANAGER = "cbp/qa/maas/resource-pool-manager/v1/clusters"
    process.env.MAAS_CONFIG = "cbp/qa/maas/config/v1/calcEngines"
    process.env.VIEW_ENTITY_MAP = useOldUrls ? "cbp/qa/ibp/links/v1/view-entity-map" : "qa/lm/api/v1/view-entity-map"
    process.env.VIEW_ENTITY_PROCEDURE_MAP = useOldUrls ? "cbp/qa/ibp/links/v1/entity-view-procedure-map" : "qa/lm/api/v1/entity-view-procedure-map"
    process.env.EXPORT_DATA = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/exportData" : "qa/po/api/v1/exportData"
    process.env.IMPORT_DATA = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/importData" : "qa/po/api/v1/importData"
    process.env.CREATE_PROCESS_WITH_TEMPLATE = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/process/template" : "qa/po/api/v1/process/template"
    process.env.GET_PROCESS_WITH_NAME = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/process" : "qa/po/api/v1/process"
    process.env.DELETE_PROCESS = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/process/{processName}" : "qa/po/api/v1/process/{processName}"
    process.env.GET_PROCESS_ROLES = "iam/realm/v1/roles"
    process.env.ASSIGN_ROLE_TO_USER = "iam/realm/v1/roles/{roleId}/subjects"
    process.env.UNASSIGN_ROLE_TO_USER = "iam/realm/v1/roles/{roleId}/subjects/{subjectId}"
    process.env.DELETE_ROLE = "iam/realm/v1/roles/{roleId}"
    process.env.CREATE_SUBPROCESS = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/process/{processName}/subprocess" : "qa/po/api/v1/process/{processName}/subprocess"
    process.env.DELETE_ACTOR = "cbp/foundation-bff/v1qa/actorsConfig/{actorName}?offset=0&limit=10&hidden=false"
    process.env.GET_PROCEDURES = "cbp/foundation-bff/v1qa/proceduresConfig?offset=0&limit=10&hidden=false"
    process.env.DELETE_PROCEDURE = "cbp/foundation-bff/v1qa/proceduresConfig/{procedureName}?offset=0&limit=10&hidden=false"
    process.env.GET_SUPPLY_CHAIN_ACTIONS = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/supplyChainAction" : "qa/po/api/v1/supplyChainAction"
    process.env.DELETE_SUPPLY_CHAIN_ACTION = useOldUrls ? "cbp/qa/ibp/process-orchestration/v1/supplyChainAction/{id}" : "qa/po/api/v1/supplyChainAction/{id}"
    process.env.CREATE_ASSUMPTION_KPI_CONFIG = "cbp/qa/ibp/assumptions/v1/kpi_config/"
    process.env.DELETE_ASSUMPTION_KPI_CONFIG = "cbp/qa/ibp/assumptions/v1/kpi_config/{id}?hard=false"
    process.env.DELETE_ACTIONITEM_KPI = useOldUrls ? "cbp/qa/ibp/actionitems/v1/kpis/{id}" : "qa/ai/api/v1/kpis/{id}"
    process.env.CREATE_ACTIONITEM_KPI_CONFIG = useOldUrls ? "cbp/qa/ibp/actionitems/v1/kpis" : "qa/ai/api/v1/kpis"
    process.env.UPDATE_FEATURE_TOGGLE = "cbp/qa/ibp/featuretoggle/v1/featuretoggle/{featureFlagName}"
  }
  else if (environment === 'INTEROP') {
    process.env.PSENV = "INTEROP"
    process.env.POLINK = 'pointegration/'
    // Only set PSLINK if it's not already defined (allows GitHub Actions override)
    process.env.PSLINK = process.env.PSLINK || 'ibppsintegration/'
    process.env.SNALINK = 'semantic-network-architect-interop/'
    process.env.REALM_NAME = "cbp-interop-ps-automation-2"
    process.env.REALM_NAME_SOURCE = "cbp-interop-po-migration-1"
    process.env.REALM_NAME_TARGET = "cbp-interop-po-migration-2"
    process.env.CLIENT_ID = "bcaa9b9c-d391-4d24-9c37-e3822cd45d8a"
    process.env.REALM_CLIENT_ID_SOURCE = "7b032f49-f528-43d1-a1d7-c5836e0d1853"
    process.env.REALM_CLIENT_ID_SOURCE_PO_PS_1 = "06e8f2d0-b066-484e-be5a-16e770350d82"
    process.env.REALM_CLIENT_ID_TARGET = "f7ce8fef-10c4-4fb1-a75e-c4b29ca5dd30"
    process.env.CLIENT_SECRET = process.env.CLIENT_SECRET_IOP;
    process.env.CLIENT_SECRET_PO_PS_1 = process.env.REALM_CLIENT_SECRET_IOP_PO_PS_1;
    process.env.REALM_ID = "b844f992-82f7-4f0e-8ba6-ca5ef1dc2edc"
    process.env.REALM_ID_PO_PS_1 = "ce567ee9-e1c1-4190-88a8-1d37a123f334"
    process.env.SUBJECT_ID = "31b95517-dd75-4734-b9a6-b3dc0be7ecd4"
    process.env.REALM_CLIENT_SECRET_SOURCE = process.env.REALM_CLIENT_SECRET_PO_IOP_MIG_1
    process.env.REALM_CLIENT_SECRET_TARGET = process.env.REALM_CLIENT_SECRET_PO_IOP_MIG_2
    process.env.REALM_MACHINE_SUBJECT_ID_SOURCE = "26cc10b4-225f-4e72-825a-4507783f3dff"
    process.env.REALM_MACHINE_SUBJECT_ID_TARGET = "1f7f2e2e-d4cb-4774-9595-f7054069c3ea"
    process.env.REALM_ID_SOURCE = "34f96ef6-1442-4c60-9a3d-baaaa514eece"
    process.env.REALM_ID_TARGET = "dcd03d66-7c45-4269-b1a0-be3498e35156"
    process.env.API_BASE_URL = "https://api-tst.jdadelivers.com/"
    process.env.AUTH_URL = "https://blueyonderinteroptestus.b2clogin.com/blueyonderinteroptestus.onmicrosoft.com/B2C_1A_ClientCredential/oauth2/v2.0/token"
    process.env.SCOPE = "https://blueyonderinteroptestus.onmicrosoft.com/6ad21424-b4b2-462e-80df-252ec22dd6a9/.default"
    process.env.CALENDAR = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/calendar" : "po/api/v1/calendar"
    process.env.DELETE_CALENDAR = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/calendar/{calendarName}" : "po/api/v1/calendar/{calendarName}"
    process.env.ADD_CALENDAR_CYCLE = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/calendar/{calendarName}/cycle" : "po/api/v1/calendar/{calendarName}/cycle"
    process.env.ACTIONITEM = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/" : "po/api/v1/"
    process.env.ACTIONITEM2 = useOldUrls ? "cbp/interop/ibp/actionitems/v1/actionitems" : "ai/api/v1/actionitems"
    process.env.DELETE_ACTIONITEM = useOldUrls ? "cbp/interop/ibp/actionitems/v1/actionitems/" : "ai/api/v1/actionitems/"
    process.env.SIMULATION = "cbp/foundation-simulation/v1ioptst"
    process.env.PLANNING_INSTANCE = "cbp/foundation-interactive-planning/v1ioptst/planningInstance"
    process.env.SEARCH_SIMULATION = "cbp/foundation-simulation/v1ioptst/simulations/search"
    process.env.RESOURCE_POOL_MANAGER = "cbp/interop/maas/resource-pool-manager/v1/clusters"
    process.env.MAAS_CONFIG = "cbp/interop/maas/config/v1/calcEngines"
    process.env.VIEW_ENTITY_MAP = useOldUrls ? "cbp/interop/ibp/links/v1/view-entity-map" : "lm/api/v1/view-entity-map"
    process.env.VIEW_ENTITY_PROCEDURE_MAP = useOldUrls ? "cbp/interop/ibp/links/v1/entity-view-procedure-map" : "lm/api/v1/entity-view-procedure-map"
    process.env.EXPORT_DATA = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/exportData" : "po/api/v1/exportData"
    process.env.IMPORT_DATA = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/importData" : "po/api/v1/importData"
    process.env.CREATE_PROCESS_WITH_TEMPLATE = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/process/template" : "po/api/v1/process/template"
    process.env.GET_PROCESS_WITH_NAME = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/process" : "po/api/v1/process"
    process.env.DELETE_PROCESS = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/process/{processName}" : "po/api/v1/process/{processName}"
    process.env.GET_PROCESS_ROLES = "iam/realm/v1/roles"
    process.env.ASSIGN_ROLE_TO_USER = "iam/realm/v1/roles/{roleId}/subjects"
    process.env.UNASSIGN_ROLE_TO_USER = "iam/realm/v1/roles/{roleId}/subjects/{subjectId}"
    process.env.DELETE_ROLE = "iam/realm/v1/roles/{roleId}"
    process.env.CREATE_SUBPROCESS = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/process/{processName}/subprocess" : "po/api/v1/process/{processName}/subprocess"
    process.env.DELETE_ACTOR = "cbp/foundation-bff/v1ioptst/actorsConfig/{actorName}?offset=0&limit=10&hidden=false"
    process.env.GET_PROCEDURES = "cbp/foundation-bff/v1ioptst/proceduresConfig?offset=0&limit=10&hidden=false"
    process.env.DELETE_PROCEDURE = "cbp/foundation-bff/v1ioptst/proceduresConfig/{procedureName}?offset=0&limit=10&hidden=false"
    process.env.GET_SUPPLY_CHAIN_ACTIONS = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/supplyChainAction" : "po/api/v1/supplyChainAction"
    process.env.DELETE_SUPPLY_CHAIN_ACTION = useOldUrls ? "cbp/interop/ibp/process-orchestration/v1/supplyChainAction/{id}" : "po/api/v1/supplyChainAction/{id}"
    process.env.CREATE_ASSUMPTION_KPI_CONFIG = "cbp/interop/ibp/assumptions/v1/kpi_config/"
    process.env.DELETE_ASSUMPTION_KPI_CONFIG = "cbp/interop/ibp/assumptions/v1/kpi_config/{id}?hard=false"
    process.env.DELETE_ACTIONITEM_KPI = useOldUrls ? "cbp/interop/ibp/actionitems/v1/kpis/{id}" : "ai/api/v1/kpis/{id}"
    process.env.CREATE_ACTIONITEM_KPI_CONFIG = useOldUrls ? "cbp/interop/ibp/actionitems/v1/kpis" : "ai/api/v1/kpis"
    process.env.UPDATE_FEATURE_TOGGLE = "cbp/interop/ibp/featuretoggle/v1/featuretoggle/{featureFlagName}"
    process.env.GET_PROCESSMODEL_ENTITY = "cbp/foundation-model/v1ioptst/processModels/"
  }
  process.env.LUMINATE_PORTAL_URL = 'https://bylumuiportalpltna.azureedge.net/';
  process.env.NAVIGATE_TO_PROCESS_ORCHESTRATION = process.env.LUMINATE_PORTAL_URL + process.env.POLINK + '';
  process.env.NAVIGATE_TO_PLANNING_SPACE = process.env.LUMINATE_PORTAL_URL + process.env.PSLINK + '';
  process.env.NAVIGATE_TO_SNA = process.env.LUMINATE_PORTAL_URL + process.env.SNALINK + '';
  process.env.NAVIGATE_TO_IDENTITI_AND_ACCESS = process.env.LUMINATE_PORTAL_URL + process.env.IDENTITY_AND_ACCESS + '';
  process.env.IDENTITY_AND_ACCESS = 'identityaccess/'
};

setEnv();