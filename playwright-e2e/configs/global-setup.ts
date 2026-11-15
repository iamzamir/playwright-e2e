import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { performOidcLoginFlow } from '../util/oidc-login.helper';
import { getAuthStateRealmFolder } from '../util/gateway.util';

require('./setup.js');

type AuthUser = {
  alias: 'user1' | 'user2';
  username: string;
  password: string;
};

type AuthTarget = {
  realm: string;
  user: AuthUser;
  outputPath: string;
};

const AUTH_DIR = path.join(__dirname, '../testdata/.auth');

const DEFAULT_BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--ignore-certificate-errors',
  '--disable-gpu',
];

const slugifyRealm = (realm: string): string => {
  return realm
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getRealmList = (): string[] => {
  const raw = process.env.REALMS || process.env.REALM_NAME || '';
  const realms = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(realms));
};

const getUsers = (): AuthUser[] => {
  const user1 = process.env.FUNCTIONAL_TEST_USERNAME;
  const pass1 = process.env.FUNCTIONAL_TEST_PASSWORD;

  if (!user1 || !pass1) {
    throw new Error(
      '[global-setup] Missing required env vars for user1: FUNCTIONAL_TEST_USERNAME and FUNCTIONAL_TEST_PASSWORD.'
    );
  }

  const users: AuthUser[] = [
    {
      alias: 'user1',
      username: user1,
      password: pass1,
    },
  ];

  const user2 = process.env.FUNCTIONAL_TEST_USERNAME_2 || process.env.FUNCTIONAL_TEST_USERNAME2;
  const pass2 =
    process.env.FUNCTIONAL_TEST_PASSWORD_2
    || process.env.FUNCTIONAL_TEST_PASSWORD2
    || process.env.FUNCTIONAL_TEST_PASSWORD;

  if (user2 && pass2) {
    users.push({
      alias: 'user2',
      username: user2,
      password: pass2,
    });
  } else {
    console.warn(
      '[global-setup] user2 credentials not fully configured. ' +
      'Set FUNCTIONAL_TEST_USERNAME_2/FUNCTIONAL_TEST_PASSWORD_2 (or FUNCTIONAL_TEST_USERNAME2/FUNCTIONAL_TEST_PASSWORD2) to include user2 auth state.'
    );
  }

  const requestedAliases = (process.env.PW_AUTH_USERS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AuthUser['alias'] => item === 'user1' || item === 'user2');

  if (requestedAliases.length > 0) {
    return users.filter((user) => requestedAliases.includes(user.alias));
  }

  return users;
};

const ensureDirectory = (directoryPath: string): void => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const resolveTargets = (): AuthTarget[] => {
  const realms = getRealmList();
  const users = getUsers();

  if (realms.length === 0) {
    throw new Error('[global-setup] Missing realm configuration. Set REALMS or REALM_NAME.');
  }

  const targets: AuthTarget[] = [];

  for (const realm of realms) {
    const realmSlug = slugifyRealm(getAuthStateRealmFolder(realm));
    const realmDir = path.join(AUTH_DIR, realmSlug);

    for (const user of users) {
      targets.push({
        realm,
        user,
        outputPath: path.join(realmDir, `${user.alias}.json`),
      });
    }
  }

  return targets;
};

async function globalSetup(_config: FullConfig): Promise<void> {
  const portalUrl = process.env.LUMINATE_PORTAL_URL;

  if (!portalUrl) {
    throw new Error('[global-setup] Missing required env var: LUMINATE_PORTAL_URL');
  }

  ensureDirectory(AUTH_DIR);
  const targets = resolveTargets();

  console.log(`[global-setup] Preparing auth state for ${targets.length} realm/user combinations.`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: DEFAULT_BROWSER_ARGS,
  });

  const summary: string[] = [];

  try {
    for (const target of targets) {
      ensureDirectory(path.dirname(target.outputPath));

      console.log(
        `[global-setup] Login start: realm="${target.realm}" userAlias="${target.user.alias}" username="${target.user.username}"`
      );

      const context = await browser.newContext();

      try {
        const page = await context.newPage();
        await page.goto(portalUrl, { waitUntil: 'domcontentloaded' });

        await performOidcLoginFlow({
          portalPage: page,
          realmName: target.realm,
          username: target.user.username,
          password: target.user.password,
          isSecondUser: target.user.alias === 'user2',
          clickStaySignedIn: true,
          strictStaySignedIn: false,
        });

        await context.storageState({ path: target.outputPath });
        summary.push(`PASS ${target.realm} :: ${target.user.alias} -> ${target.outputPath}`);

        console.log(
          `[global-setup] Auth state saved: realm="${target.realm}" userAlias="${target.user.alias}" file="${target.outputPath}"`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        summary.push(`FAIL ${target.realm} :: ${target.user.alias} -> ${message}`);
        throw new Error(
          `[global-setup] Failed for realm="${target.realm}" userAlias="${target.user.alias}": ${message}`
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();

    console.log('[global-setup] Auth matrix summary:');
    for (const line of summary) {
      console.log(`[global-setup] ${line}`);
    }
  }
}

export default globalSetup;
