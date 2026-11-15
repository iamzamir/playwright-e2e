import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from '@playwright/test';
import { getTimeout, TIMEOUTS } from '../constants/timeouts';
import { CommonFunctions } from './common.util';
import { performOidcLoginFlow } from './oidc-login.helper';
import { getConfig } from '../configs/env';

const DEFAULT_USER_CLIENT_ID = '8c715d67-a278-48fb-8177-9afe1cc672b5';
// B2C returns an access_token only for the portal resource scope; '.default' yields an id_token alone.
const DEFAULT_USER_SCOPE = 'https://blueyonderinteroptestus.onmicrosoft.com/6ad21424-b4b2-462e-80df-252ec22dd6a9/access offline_access openid profile';
const USER_TOKEN_CACHE_FILE = path.join(__dirname, '../testdata/.auth/user-tokens.json');
const TOKEN_REFRESH_SKEW_MS = 60_000;

type UserTokenCacheEntry = {
  refreshToken?: string;
  accessToken?: string;
  accessExpiresAt?: number;
  clientId?: string;
  tokenUrl?: string;
};

type CapturedCredentials = {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
};

export type UserTokenAlias = 'user1' | 'user2';

// Coalesces concurrent callers in a worker so at most one browser login per user can run.
const inFlight = new Map<UserTokenAlias, Promise<string>>();

function usernameFor(alias: UserTokenAlias): string | undefined {
  return alias === 'user2' ? process.env.FUNCTIONAL_TEST_USERNAME2 : process.env.FUNCTIONAL_TEST_USERNAME;
}

// Lets an environment authenticate against a different realm than its service deployment uses.
function userTokenRealm(): string {
  // Gravitee identifies the realm by REALM_KEY, so it must not share a cache entry with the Azure realm.
  if (getConfig().gatewayType.toUpperCase() === 'GRAVITEE') {
    return getConfig().realmKey || getConfig().userTokenRealm || getConfig().realmName || '';
  }
  return getConfig().userTokenRealm || getConfig().realmName || '';
}

// A token depends only on realm + user, so environments sharing a realm share one cache entry.
function cacheKey(alias: UserTokenAlias): string {
  return `${userTokenRealm()}|${usernameFor(alias) || ''}`;
}

function loadCache(): Record<string, UserTokenCacheEntry> {
  try {
    if (fs.existsSync(USER_TOKEN_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(USER_TOKEN_CACHE_FILE, 'utf-8'));
    }
  } catch {
    // Treat an unreadable cache as empty.
  }
  return {};
}

function saveCache(entry: UserTokenCacheEntry, alias: UserTokenAlias): void {
  try {
    const dir = path.dirname(USER_TOKEN_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const store = loadCache();
    const key = cacheKey(alias);
    store[key] = { ...store[key], ...entry };
    const tmpFile = `${USER_TOKEN_CACHE_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tmpFile, USER_TOKEN_CACHE_FILE);
  } catch {
    // Cache persistence is best-effort; a failure just forces a re-login next run.
  }
}

export function clearUserTokenCache(): void {
  inFlight.clear();
  try {
    if (fs.existsSync(USER_TOKEN_CACHE_FILE)) {
      fs.unlinkSync(USER_TOKEN_CACHE_FILE);
    }
  } catch {
    // Ignore cache delete errors.
  }
}

function accessTokenExpiry(token: string): number | undefined {
  try {
    const payload = token.split('.')[1];
    const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return typeof claims.exp === 'number' ? claims.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

async function readCredentialsFromStorage(page: Page): Promise<CapturedCredentials> {
  return page.evaluate(() => {
    const result: { accessToken?: string; refreshToken?: string; clientId?: string } = {};
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (let index = 0; index < store.length; index++) {
        const key = store.key(index);
        if (!key) {
          continue;
        }
        let parsed: any;
        const rawValue = store.getItem(key) || '';
        try {
          parsed = JSON.parse(rawValue);
        } catch {
          parsed = rawValue;
        }
        if (!parsed) {
          continue;
        }

        const lowerKey = key.toLowerCase();
        const credType = typeof parsed === 'object' ? String(parsed.credentialType || '').toLowerCase() : '';
        const isAccessToken = credType === 'accesstoken' || lowerKey.includes('|accesstoken|') || lowerKey.includes('accesstoken');
        const isRefreshToken = credType === 'refreshtoken' || lowerKey.includes('|refreshtoken|') || lowerKey.includes('refreshtoken');

        // A raw (non-JSON) value is only taken as an access token when it is a plaintext JWT; MSAL can store encrypted
        // entries under the same keys, and those are left to the network capture.
        const secret = typeof parsed === 'object'
          ? (parsed.secret || parsed.access_token || parsed.accessToken || parsed.token || parsed.value)
          : (typeof parsed === 'string' && /^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(parsed) ? parsed : undefined);

        // Refresh tokens are opaque, so a raw value cannot be told apart from an MSAL-encrypted entry; only a parsed
        // credential's secret is used here, and the token-response capture supplies the plaintext token otherwise.
        const refreshSecret = typeof parsed === 'object'
          ? (parsed.secret || parsed.refresh_token || parsed.refreshToken || parsed.token || parsed.value)
          : undefined;

        const keyParts = key.split('|');
        const keyClientId = keyParts.length > 4 ? keyParts[4] : undefined;
        const keyTarget = keyParts.length > 6 ? keyParts[6] : undefined;
        const clientId = (typeof parsed === 'object' ? parsed.clientId : undefined) || keyClientId;
        const target = (typeof parsed === 'object' ? parsed.target : undefined) || keyTarget;

        if (isAccessToken && typeof secret === 'string' && secret.length > 0) {
          if (!result.accessToken || String(target || '').includes('access')) {
            result.accessToken = secret;
            if (clientId) {
              result.clientId = clientId;
            }
          }
        }

        if (isRefreshToken && typeof refreshSecret === 'string' && refreshSecret.length > 0) {
          result.refreshToken = refreshSecret;
          if (clientId) {
            result.clientId = result.clientId || clientId;
          }
        }
      }
    }
    return result;
  });
}

async function redeemRefreshToken(entry: UserTokenCacheEntry, commonFunctions: CommonFunctions, alias: UserTokenAlias): Promise<string | undefined> {
  if (!entry.refreshToken || !entry.tokenUrl) {
    return undefined;
  }
  const clientId = entry.clientId || getConfig().client.portalId || DEFAULT_USER_CLIENT_ID;
  const scope = process.env.USER_TOKEN_SCOPE || DEFAULT_USER_SCOPE;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: entry.refreshToken,
    scope
  });

  await commonFunctions.logMessage('INFO', `Redeeming cached user refresh token: ${entry.tokenUrl}`);
  const response = await axios.post(entry.tokenUrl, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    validateStatus: () => true
  });

  const accessToken = typeof response.data?.access_token === 'string' ? response.data.access_token : undefined;
  if (!accessToken) {
    const detail = typeof response.data === 'object' && response.data
      ? `${response.data.error || ''} ${response.data.error_description || ''}`.trim()
      : String(response.data || '').slice(0, 180);
    await commonFunctions.logMessage('WARN', `Refresh token grant failed. Status: ${response.status}. ${detail}`);
    return undefined;
  }

  // B2C rotates the refresh token on every redemption, so the new one must replace the stored value.
  saveCache({
    accessToken,
    accessExpiresAt: accessTokenExpiry(accessToken),
    refreshToken: typeof response.data.refresh_token === 'string' ? response.data.refresh_token : entry.refreshToken,
    clientId,
    tokenUrl: entry.tokenUrl
  }, alias);
  await commonFunctions.logMessage('INFO', 'User access token obtained via refresh_token grant (no browser)');
  return accessToken;
}

async function loginAndCaptureCredentials(commonFunctions: CommonFunctions, alias: UserTokenAlias): Promise<string> {
  const portalUrl = getConfig().hosts.portal;
  const realmName = userTokenRealm();
  const username = usernameFor(alias);
  const password = process.env.FUNCTIONAL_TEST_PASSWORD;

  if (!portalUrl || !realmName || !username || !password) {
    const usernameVar = alias === 'user2' ? 'FUNCTIONAL_TEST_USERNAME2' : 'FUNCTIONAL_TEST_USERNAME';
    throw new Error(`User token requires LUMINATE_PORTAL_URL, REALM_NAME, ${usernameVar}, and FUNCTIONAL_TEST_PASSWORD`);
  }

  let tokenUrl = process.env.USER_TOKEN_URL || '';
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', '--disable-gpu']
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    let captured: CapturedCredentials = {};

    // The B2C tenant GUID and policy live in the portal's token endpoint, so capture it rather than hardcode.
    // Also capture Gravitee/Keycloak token endpoints (oauth/token, oidc/token).
    // Additionally capture outgoing Bearer authorization headers and token endpoint JSON responses
    // so token capture succeeds even if MSAL encrypts tokens in browser storage.
    context.on('request', (request) => {
      const url = request.url();
      if (!tokenUrl) {
        if (/\/oauth2\/v2\.0\/token/i.test(url) || /\/oauth\/token/i.test(url) || /\/oidc\/token/i.test(url) || /\/protocol\/openid-connect\/token/i.test(url)) {
          tokenUrl = url.split('?')[0];
        }
      }
      const auth = request.headers()['authorization'];
      if (auth && auth.startsWith('Bearer ey') && !captured.accessToken) {
        captured.accessToken = auth.slice(7);
      }
    });

    // Token responses still being parsed; awaited before saving so a Bearer header seen first doesn't drop the refresh token.
    const pendingTokenReads = new Set<Promise<void>>();
    context.on('response', (response) => {
      const url = response.url();
      if (/\/token/i.test(url) || /oauth/i.test(url) || /oidc/i.test(url)) {
        const read = (async () => {
          const json = await response.json().catch(() => null);
          if (json && typeof json.access_token === 'string') {
            captured.accessToken = json.access_token;
            if (typeof json.refresh_token === 'string') {
              captured.refreshToken = json.refresh_token;
            }
          }
        })().catch(() => undefined);
        pendingTokenReads.add(read);
        void read.finally(() => pendingTokenReads.delete(read));
      }
    });

    await commonFunctions.logMessage('INFO', `No usable refresh token; performing one-time interactive OIDC login (realm: ${realmName})`);
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: getTimeout('EXTREME') });
    await performOidcLoginFlow({
      portalPage: page,
      realmName,
      username,
      password,
      isSecondUser: false,
      clickStaySignedIn: true,
      strictStaySignedIn: false
    });

    if (!tokenUrl) {
      tokenUrl = process.env.USER_TOKEN_URL || getConfig().hosts.auth || '';
    }

    // Poll storage and network across all active pages with a timeout to allow asynchronous
    // MSAL/OIDC silent token acquisition (acquireTokenSilent) to complete and persist.
    const pollTimeoutMs = getTimeout('LONG');
    const pollIntervalMs = TIMEOUTS.POLL_INTERVAL;
    const deadline = Date.now() + pollTimeoutMs;

    while (Date.now() < deadline) {
      if (captured.accessToken) {
        break;
      }
      for (const openPage of context.pages()) {
        if (openPage.isClosed()) {
          continue;
        }
        const fromStorage: CapturedCredentials = await readCredentialsFromStorage(openPage).catch(() => ({} as CapturedCredentials));
        if (fromStorage.accessToken) {
          captured.accessToken = fromStorage.accessToken;
        }
        if (fromStorage.refreshToken && !captured.refreshToken) {
          captured.refreshToken = fromStorage.refreshToken;
        }
        if (fromStorage.clientId && !captured.clientId) {
          captured.clientId = fromStorage.clientId;
        }
        if (captured.accessToken) {
          break;
        }
      }
      if (captured.accessToken) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    if (!captured.accessToken) {
      const storageDump = await page.evaluate(() => {
        const keys: string[] = [];
        for (const store of [window.localStorage, window.sessionStorage]) {
          for (let i = 0; i < store.length; i++) {
            const k = store.key(i);
            if (k) keys.push(k);
          }
        }
        return keys;
      }).catch(() => []);
      await commonFunctions.logMessage('ERROR', `User OIDC login: no access_token captured after ${pollTimeoutMs}ms. Storage keys present: ${storageDump.join(', ') || 'none'}`);
      throw new Error(`User OIDC login completed but no access_token was captured after ${pollTimeoutMs}ms`);
    }

    // Bounded: providers that issue no refresh token must not hold up the login.
    if (pendingTokenReads.size > 0) {
      await Promise.race([
        Promise.allSettled([...pendingTokenReads]),
        new Promise((resolve) => setTimeout(resolve, getTimeout('SHORT')))
      ]);
    }

    saveCache({
      accessToken: captured.accessToken,
      accessExpiresAt: accessTokenExpiry(captured.accessToken),
      refreshToken: captured.refreshToken,
      clientId: captured.clientId || getConfig().client.portalId || DEFAULT_USER_CLIENT_ID,
      tokenUrl
    }, alias);

    await commonFunctions.logMessage('INFO', `Captured user bearer token from OIDC login (refresh token stored: ${!!captured.refreshToken})`);
    return captured.accessToken;
  } finally {
    await browser.close();
  }
}

/** Bearer token for a functional test user (user1 by default), from the cache, a refresh grant, or a one-time login. */
export async function getUserBearerToken(alias: UserTokenAlias = 'user1'): Promise<string> {
  const pending = inFlight.get(alias);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    const commonFunctions = new CommonFunctions();
    let entry = loadCache()[cacheKey(alias)] || {};

    if (entry.accessToken && entry.accessExpiresAt && entry.accessExpiresAt - TOKEN_REFRESH_SKEW_MS > Date.now()) {
      await commonFunctions.logMessage('INFO', 'Reusing cached user access token');
      return entry.accessToken;
    }

    const refreshed = await redeemRefreshToken(entry, commonFunctions, alias);
    if (refreshed) {
      return refreshed;
    }

    // Re-check disk cache right before launching browser in case a concurrent worker just completed login
    entry = loadCache()[cacheKey(alias)] || {};
    if (entry.accessToken && entry.accessExpiresAt && entry.accessExpiresAt - TOKEN_REFRESH_SKEW_MS > Date.now()) {
      await commonFunctions.logMessage('INFO', 'Reusing user access token cached by parallel worker');
      return entry.accessToken;
    }

    return loginAndCaptureCredentials(commonFunctions, alias);
  })();
  inFlight.set(alias, request);

  try {
    return await request;
  } finally {
    inFlight.delete(alias);
  }
}

