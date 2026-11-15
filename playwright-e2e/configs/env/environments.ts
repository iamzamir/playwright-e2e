/**
 * One row per test environment. Holds hosts, realms, UI links and non-secret IDs; secrets stay
 * in env vars and are referenced here by variable name only. Endpoints are in ./endpoints.ts.
 *
 * Adding an environment: add a row here (the Record type makes the compiler insist on it), add
 * any endpoint overrides it needs, and add testdata/<PSENV>/.
 */

export type EnvName = 'QA' | 'INTEROP' | 'PSR' | 'STAGE';
export type GatewayType = 'AZURE' | 'GRAVITEE';
export type LinkKey = 'POLINK' | 'PSLINK' | 'SNALINK';

export const ENV_NAMES: readonly EnvName[] = ['QA', 'INTEROP', 'PSR', 'STAGE'];

export interface GraviteeDef {
  /** REALM_KEY used on Gravitee. */
  realmKey: string;
  /** false: an incoming REALM_KEY wins (INTEROP); true: always `realmKey`. */
  realmKeyForced: boolean;
  domainSuffix: string;
  /** Prefix of the host/domain override variables: `GRAVITEE_` or `STAGE_GRAVITEE_`. */
  overridePrefix: string;
  /** Machine client variables. `perRealmClient` also tries GRAVITEE_CLIENT_ID_<REALM_KEY> first. */
  clientIdVar: string;
  clientSecretVar: string;
  perRealmClient: boolean;
  /**
   * Separate source/target realms for migration specs: REALM_KEY_SOURCE/TARGET pick the hosts, the
   * source uses this fixed client, and the target reuses the main client.
   */
  sourceTarget?: { sourceClientId: string; sourceClientSecretVar: string };
}

export interface EnvironmentDef {
  psenv: EnvName;
  /** `cbp/<gatewaySegment>/...` OLD-mode gateway prefix. */
  gatewaySegment: string;
  /** `alm/core|exchange/<almSegment>/...`. */
  almSegment: string;
  /**
   * Prefix for URL_MODE=NEW paths (`<prefix>po/api/v1`). Undefined: NEW is not served here and
   * the OLD paths are used. NEW mode is discontinued; it exists for QA and INTEROP only.
   */
  newUrlPrefix?: string;
  /** Suffix of SQL_SERVER_<x> / SQL_PASSWORD_<x>. */
  sqlSuffix: string;
  gateways: readonly GatewayType[];
  /** REALM_KEY when none is passed in (the Azure-mode value; Gravitee may replace it). */
  defaultRealmKey: string;
  /** STAGE: REALM_KEY, REALM_NAME and REALMS can't be overridden, so INTEROP values in .env/CI don't leak in. */
  realmForced: boolean;
  links: Record<LinkKey, string>;
  /** Links an incoming env var may override. */
  incomingLinks: readonly LinkKey[];
  /** Fixed, non-secret values written as-is (realm names, client and realm IDs, Azure hosts). */
  fixed: Readonly<Record<string, string>>;
  /** Values an incoming env var may override. */
  defaults: Readonly<Record<string, string>>;
  /** Target variable -> variable that holds the secret (copied, never stored here). */
  secrets: Readonly<Record<string, string>>;
  gravitee: GraviteeDef;
}

const AZURE_INTEROP_HOSTS = {
  LUMINATE_PORTAL_URL: 'https://bylumuiportalpltna.azureedge.net/',
  API_BASE_URL: 'https://api-tst.jdadelivers.com/',
  AUTH_URL: 'https://blueyonderinteroptestus.b2clogin.com/blueyonderinteroptestus.onmicrosoft.com/B2C_1A_ClientCredential/oauth2/v2.0/token',
  SCOPE: 'https://blueyonderinteroptestus.onmicrosoft.com/6ad21424-b4b2-462e-80df-252ec22dd6a9/.default',
};
const PORTAL_CLIENT_ID = '8c715d67-a278-48fb-8177-9afe1cc672b5';
const INTEROP_DOMAIN = 'interop.na.blueyonder.dev';

export const ENVIRONMENTS: Readonly<Record<EnvName, EnvironmentDef>> = {
  QA: {
    psenv: 'QA',
    gatewaySegment: 'qa',
    almSegment: 'staging',
    newUrlPrefix: 'qa/',
    sqlSuffix: 'QA',
    gateways: ['AZURE', 'GRAVITEE'],
    defaultRealmKey: 'cbpf-qa23',
    realmForced: false,
    links: { POLINK: 'pofeatureqa/', PSLINK: 'IBPPlanQA/', SNALINK: 'semantic-network-architect-qa/' },
    incomingLinks: [],
    fixed: {
      REALM_NAME: 'cbp-e2e-qa',
      REALM_NAME_SOURCE: 'cbp-qa-po-migration-1',
      REALM_NAME_TARGET: 'cbp-qa-po-migration-2',
      CLIENT_ID: 'bcaa9b9c-d391-4d24-9c37-e3822cd45d8a',
      REALM_CLIENT_ID_SOURCE: '99770f27-aa3f-421f-b453-6a03ae1e7da9',
      REALM_CLIENT_ID_TARGET: 'dea9530f-3bfa-4006-afbd-5dccd5707033',
      REALM_MACHINE_SUBJECT_ID_SOURCE: '86528d7a-029b-43e0-a65a-b413dcd3938b',
      REALM_MACHINE_SUBJECT_ID_TARGET: '718ce689-d2a1-4c45-8ba4-5d180f494b08',
      REALM_ID: 'ca7623d3-b234-431c-a445-4a1d5444668e',
      SUBJECT_ID: '1941bac5-7ea3-40af-af9d-4166fd2a3d05',
      REALM_ID_SOURCE: '6d54cd6d-2cab-4e4f-aa11-43050e29fbf7',
      REALM_ID_TARGET: '43eb63e3-6e79-4118-a9db-ec439dd008bd',
      ...AZURE_INTEROP_HOSTS,
    },
    defaults: {
      // User-token specs authenticate against the interop realm; machine-token specs keep using cbp-e2e-qa.
      USER_TOKEN_REALM: 'cbp-interop-ps-automation-2',
      PORTAL_CLIENT_ID,
    },
    secrets: {
      CLIENT_SECRET: 'CLIENT_SECRET_QA',
      REALM_CLIENT_SECRET_SOURCE: 'REALM_CLIENT_SECRET_PO_QA_MIG_1',
      REALM_CLIENT_SECRET_TARGET: 'REALM_CLIENT_SECRET_PO_QA_MIG_2',
    },
    gravitee: {
      realmKey: 'cbpf-test27',
      realmKeyForced: true,
      domainSuffix: INTEROP_DOMAIN,
      overridePrefix: 'GRAVITEE_',
      clientIdVar: 'QA_GRAVITEE_CLIENT_ID',
      clientSecretVar: 'QA_GRAVITEE_CLIENT_SECRET',
      perRealmClient: false,
    },
  },

  INTEROP: {
    psenv: 'INTEROP',
    gatewaySegment: 'interop',
    almSegment: 'staging',
    newUrlPrefix: '',
    sqlSuffix: 'IOP',
    gateways: ['AZURE', 'GRAVITEE'],
    defaultRealmKey: 'cbpf-test23',
    realmForced: false,
    links: { POLINK: 'pointegration/', PSLINK: 'ibppsintegration/', SNALINK: 'semantic-network-architect-interop/' },
    incomingLinks: ['PSLINK'],
    fixed: {
      REALM_NAME: 'cbp-interop-ps-automation-2',
      REALM_NAME_SOURCE: 'cbp-interop-po-migration-1',
      REALM_NAME_TARGET: 'cbp-interop-po-migration-2',
      CLIENT_ID: 'bcaa9b9c-d391-4d24-9c37-e3822cd45d8a',
      REALM_CLIENT_ID_SOURCE: '7b032f49-f528-43d1-a1d7-c5836e0d1853',
      REALM_CLIENT_ID_SOURCE_PO_PS_1: '06e8f2d0-b066-484e-be5a-16e770350d82',
      REALM_CLIENT_ID_TARGET: 'f7ce8fef-10c4-4fb1-a75e-c4b29ca5dd30',
      REALM_ID: 'b844f992-82f7-4f0e-8ba6-ca5ef1dc2edc',
      REALM_ID_PO_PS_1: 'ce567ee9-e1c1-4190-88a8-1d37a123f334',
      SUBJECT_ID: '31b95517-dd75-4734-b9a6-b3dc0be7ecd4',
      REALM_MACHINE_SUBJECT_ID_SOURCE_GVT: '3d407a6b-efdf-40f9-98b9-7a23db6c1787',
      REALM_MACHINE_SUBJECT_ID_TARGET_GVT: '1faf08d0-24b2-4b61-a06e-6aa941612866',
      REALM_MACHINE_SUBJECT_ID_SOURCE: '26cc10b4-225f-4e72-825a-4507783f3dff',
      REALM_MACHINE_SUBJECT_ID_TARGET: '1f7f2e2e-d4cb-4774-9595-f7054069c3ea',
      REALM_ID_SOURCE: '34f96ef6-1442-4c60-9a3d-baaaa514eece',
      REALM_ID_TARGET: 'dcd03d66-7c45-4269-b1a0-be3498e35156',
      ...AZURE_INTEROP_HOSTS,
    },
    defaults: { PORTAL_CLIENT_ID },
    secrets: {
      CLIENT_SECRET: 'CLIENT_SECRET_IOP',
      CLIENT_SECRET_PO_PS_1: 'REALM_CLIENT_SECRET_IOP_PO_PS_1',
      REALM_CLIENT_SECRET_SOURCE: 'REALM_CLIENT_SECRET_PO_IOP_MIG_1',
      REALM_CLIENT_SECRET_TARGET: 'REALM_CLIENT_SECRET_PO_IOP_MIG_2',
    },
    gravitee: {
      realmKey: 'cbpf-test23',
      realmKeyForced: false,
      domainSuffix: INTEROP_DOMAIN,
      overridePrefix: 'GRAVITEE_',
      clientIdVar: 'GRAVITEE_CLIENT_ID',
      clientSecretVar: 'GRAVITEE_CLIENT_SECRET',
      perRealmClient: true,
      sourceTarget: {
        sourceClientId: '06e8f2d0-b066-484e-be5a-16e770350d82',
        sourceClientSecretVar: 'REALM_CLIENT_SECRET_GVT_SOURCE_PO_PS_1',
      },
    },
  },

  PSR: {
    psenv: 'PSR',
    gatewaySegment: 'psr',
    almSegment: 'psr',
    sqlSuffix: 'PSR',
    gateways: ['AZURE', 'GRAVITEE'],
    // PSR has no Azure realm key of its own; this is the historical fallback.
    defaultRealmKey: 'cbpf-test23',
    realmForced: false,
    links: { POLINK: 'process-orchestration-psr/', PSLINK: 'planning-space-psr/', SNALINK: 'semantic-network-architect-psr/' },
    incomingLinks: [],
    fixed: {
      LUMINATE_PORTAL_URL: 'https://bylumuiportalpltpsr.azureedge.net/',
      REALM_NAME: 'cbp-psr-po-ps-01',
    },
    defaults: {},
    secrets: {},
    gravitee: {
      realmKey: 'popspsr-psr',
      realmKeyForced: true,
      domainSuffix: 'psr.na.blueyonder.dev',
      overridePrefix: 'GRAVITEE_',
      clientIdVar: 'PSR_GRAVITEE_CLIENT_ID',
      clientSecretVar: 'PSR_GRAVITEE_CLIENT_SECRET',
      perRealmClient: false,
    },
  },

  STAGE: {
    psenv: 'STAGE',
    gatewaySegment: 'demo',
    almSegment: 'demo',
    sqlSuffix: 'STAGE',
    // Only exposed through Gravitee; GATEWAY_TYPE is forced.
    gateways: ['GRAVITEE'],
    defaultRealmKey: 'cbprndsg-demo',
    realmForced: true,
    // Enabled for the PO backend smoke batch only; UI app paths stay opt-in via env.
    links: { POLINK: '', PSLINK: '', SNALINK: '' },
    incomingLinks: ['POLINK', 'PSLINK', 'SNALINK'],
    fixed: {
      // Forced like REALM_KEY: global-setup logs in with REALMS || REALM_NAME, which .env/CI may carry for INTEROP.
      REALM_NAME: 'cbprndsg-demo',
      REALMS: 'cbprndsg-demo',
    },
    defaults: {},
    secrets: {},
    gravitee: {
      realmKey: 'cbprndsg-demo',
      realmKeyForced: true,
      // Hosted on the interop Gravitee domain; only STAGE_* overrides apply, since the generic
      // GRAVITEE_* ones may point at an INTEROP tenant.
      domainSuffix: INTEROP_DOMAIN,
      overridePrefix: 'STAGE_GRAVITEE_',
      clientIdVar: 'STAGE_GRAVITEE_CLIENT_ID',
      clientSecretVar: 'STAGE_GRAVITEE_CLIENT_SECRET',
      perRealmClient: false,
    },
  },
};

export function isEnvName(value: string): value is EnvName {
  return (ENV_NAMES as readonly string[]).includes(value);
}
