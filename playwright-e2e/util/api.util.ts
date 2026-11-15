import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { CommonFunctions } from "./common.util";
import { getConfig } from '../configs/env';

type CachedToken = { token: string; expiresAt: number };

// Shared across ApiUtil instances within a worker so per-test token retrieval is a cache hit.
const tokenCache = new Map<string, CachedToken>();
// Coalesces concurrent token fetches per cache key so callers share one in-flight IdP request.
const inFlightFetches = new Map<string, Promise<string>>();
const TOKEN_REFRESH_SKEW_MS = 60_000; // refresh 60s before the token actually expires
const TOKEN_FALLBACK_TTL_MS = 10 * 60_000; // used only when the token has no decodable exp claim
const TOKEN_CACHE_FILE = path.join(__dirname, '../testdata/.auth/api-tokens.json');

function loadDiskTokenCache(): Record<string, CachedToken> {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const content = fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      const validated: Record<string, CachedToken> = {};
      if (parsed && typeof parsed === 'object') {
        for (const [key, val] of Object.entries(parsed as Record<string, CachedToken>)) {
          if (
            val &&
            typeof val.token === 'string' &&
            /^[A-Za-z0-9._~+/=-]+$/.test(val.token) &&
            typeof val.expiresAt === 'number' &&
            Number.isFinite(val.expiresAt)
          ) {
            validated[key] = { token: val.token, expiresAt: val.expiresAt };
          }
        }
      }
      return validated;
    }
  } catch {
    // If file read/parse fails, return empty object
  }
  return {};
}

function saveDiskTokenCache(key: string, value: CachedToken): void {
  try {
    const dir = path.dirname(TOKEN_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const store = loadDiskTokenCache();
    store[key] = value;
    const tmpFile = `${TOKEN_CACHE_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tmpFile, TOKEN_CACHE_FILE);
  } catch {
    // Ignore cache persistence errors gracefully
  }
}

export function clearApiTokenCache(): void {
  tokenCache.clear();
  inFlightFetches.clear();
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      fs.unlinkSync(TOKEN_CACHE_FILE);
    }
  } catch {
    // Ignore cache delete errors
  }
}

export class ApiUtil {
  private objCommonFunctions: CommonFunctions;

  constructor() {
    this.objCommonFunctions = new CommonFunctions();
  }

  private isRedactionEnabled(): boolean {
    return getConfig().flags.redactBearerToken;
  }

  private isBearerTokenResponse(url: string, logMessage: string, payload: any): boolean {
    if (!this.isRedactionEnabled()) {
      return false;
    }
    const normalizedUrl = url.toLowerCase();
    const normalizedLogMessage = logMessage.toLowerCase();
    const isTokenEndpoint = normalizedUrl.includes('token') || normalizedUrl.includes('oauth') || normalizedLogMessage.includes('bearer token') || normalizedLogMessage.includes('access token');
    const hasAccessToken = typeof payload === 'object' && payload !== null && 'access_token' in payload;
    return isTokenEndpoint || hasAccessToken;
  }

  private async logResponsePayload(url: string, logMessage: string, payload: any, prettyPrint: boolean = false): Promise<void> {
    if (this.isBearerTokenResponse(url, logMessage, payload)) {
      await this.objCommonFunctions.logMessage('INFO', 'Response Payload: [REDACTED - bearer token response]');
      return;
    }

    const formattedPayload = prettyPrint ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
    await this.objCommonFunctions.logMessage('INFO', `Response Payload: ${formattedPayload}`);
  }

  public async processAPIRequest(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, data: any = null, headers: Record<string, string> = {}, logMessage: string, responseType: "data" | "status" | "headers" | "full" = "data"): Promise<any> {
    try {

      await this.objCommonFunctions.logMessage("INFO", `Sending ${method} request to ${url}`);
      await this.objCommonFunctions.logMessage("INFO", `Request Payload: ${JSON.stringify(data)}`);
      const config = {
        method,
        url,
        headers: { "Content-Type": "application/json", ...headers },
        ...(data && ["POST", "PUT", "PATCH"].includes(method) && { data }),
      };
      const response = await axios(config);
      await this.objCommonFunctions.logMessage("INFO", `${logMessage} Success! Status: ${response.status}`);
      await this.objCommonFunctions.logMessage("INFO", `Status Text: ${response.statusText}`);
      await this.objCommonFunctions.logMessage("INFO", "Trace Id: " + response.headers['trace-id']);
      await this.logResponsePayload(url, logMessage, response.data);
      return responseType === "full" ? response : response[responseType];
    } catch (error: any) {
      const errorDetails = error.response
        ? `Error: ${error.response.status} ${error.response.statusText} | Response: ${JSON.stringify(error.response.data, null, 2)}`
        : `Error: ${error.message}`;

      await this.objCommonFunctions.logMessage("FAIL", `${logMessage} Failed! ${errorDetails}`);
      if (error.response?.headers?.['trace-id']) {
        await this.objCommonFunctions.logMessage("INFO", "Trace Id: " + error.response.headers['trace-id']);
      }
      // Always return a response-like object for negative cases
      return {
        status: error.response?.status?.toString() || "ERROR",
        data: error.response?.data,
        headers: error.response?.headers,
      };
    }
  }

  // Sends the body string as-is; processAPIRequest lets axios JSON-encode strings, so malformed JSON never reaches the service.
  public async processRawRequest(method: "POST" | "PUT" | "PATCH", url: string, rawBody: string, headers: Record<string, string> = {}, logMessage: string): Promise<any> {
    try {
      await this.objCommonFunctions.logMessage("INFO", `Sending ${method} request to ${url}`);
      await this.objCommonFunctions.logMessage("INFO", `Raw Request Payload: ${rawBody}`);
      const response = await axios({ method, url, headers: { "Content-Type": "application/json", ...headers }, data: rawBody, transformRequest: [(data: string) => data] });
      await this.objCommonFunctions.logMessage("INFO", `${logMessage} Success! Status: ${response.status}`);
      await this.logResponsePayload(url, logMessage, response.data);
      return response;
    } catch (error: any) {
      const errorDetails = error.response
        ? `Error: ${error.response.status} ${error.response.statusText} | Response: ${JSON.stringify(error.response.data, null, 2)}`
        : `Error: ${error.message}`;
      await this.objCommonFunctions.logMessage("FAIL", `${logMessage} Failed! ${errorDetails}`);
      return {
        status: error.response?.status?.toString() || "ERROR",
        data: error.response?.data,
        headers: error.response?.headers,
      };
    }
  }

  public async fetchFreshBearerToken(authUrl: string = getConfig().hosts.auth as string, clientId: string = getConfig().client.id as string, clientSecret: string = getConfig().client.secret as string, scope: string = getConfig().client.scope as string, realmId: string = getConfig().realmId as string): Promise<string> {
    const isGravitee = getConfig().gatewayType.toUpperCase() === 'GRAVITEE';
    let url = authUrl;
    if (!isGravitee && realmId && !url.includes('realmId=')) {
      url = `${authUrl}${authUrl.includes('?') ? '&' : '?'}realmId=${realmId}`;
    }

    const payloadObj: Record<string, string> = {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    };

    if (!isGravitee && scope) {
      payloadObj.scope = scope;
    }

    const requestData = new URLSearchParams(payloadObj);
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    let response = await this.processAPIRequest('POST', url, requestData, headers, 'Fetching OAuth Token');
    if (!response?.access_token) {
      await this.objCommonFunctions.logMessage('WARN', 'Fetching OAuth Token failed on 1st attempt. Retrying once...');
      response = await this.processAPIRequest('POST', url, requestData, headers, 'Fetching OAuth Token (Retry 1)');
    }

    if (this.isRedactionEnabled()) {
      await this.objCommonFunctions.logMessage('INFO', 'OAuth Bearer Token: [REDACTED]');
    } else {
      await this.objCommonFunctions.logMessage('INFO', `OAuth Bearer Token: ${response?.access_token}`);
    }
    return response?.access_token;
  }

  private decodeTokenExpiryMs(token: string): number | null {
    const parts = token?.split('.');
    if (!parts || parts.length < 2) {
      return null;
    }
    try {
      const payloadJson = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private buildTokenCacheKey(authUrl: string, clientId: string, realmId?: string, scope?: string): string {
    const gatewayType = getConfig().gatewayType.toUpperCase();
    return `${gatewayType}|${authUrl}|${clientId}|${realmId ?? ''}|${scope ?? ''}`;
  }

  public async getValidToken(
    authUrl: string = getConfig().hosts.auth as string,
    clientId: string = getConfig().client.id as string,
    clientSecret: string = getConfig().client.secret as string,
    scope: string = getConfig().client.scope as string,
    realmId: string = getConfig().realmId as string,
    forceRefresh: boolean = false
  ): Promise<string> {
    const isCacheEnabled = getConfig().flags.tokenCache;
    if (!isCacheEnabled) {
      await this.objCommonFunctions.logMessage('INFO', 'Token caching is disabled via ENABLE_TOKEN_CACHE=false; fetching fresh token');
      return this.fetchFreshBearerToken(authUrl, clientId, clientSecret, scope, realmId);
    }

    const cacheKey = this.buildTokenCacheKey(authUrl, clientId, realmId, scope);

    if (!forceRefresh) {
      // 1. Check Level-1 memory cache
      const memoryCached = tokenCache.get(cacheKey);
      if (memoryCached && Date.now() < memoryCached.expiresAt - TOKEN_REFRESH_SKEW_MS) {
        await this.objCommonFunctions.logMessage('INFO', 'Reusing valid Bearer Token from in-memory cache');
        return memoryCached.token;
      }

      // 2. Check Level-2 disk cache
      const diskStore = loadDiskTokenCache();
      const diskCached = diskStore[cacheKey];
      if (diskCached && Date.now() < diskCached.expiresAt - TOKEN_REFRESH_SKEW_MS) {
        tokenCache.set(cacheKey, diskCached);
        await this.objCommonFunctions.logMessage('INFO', 'Reusing valid Bearer Token from disk cache');
        return diskCached.token;
      }
    }

    // 3. Cache miss or forced refresh: fetch a fresh token, coalescing concurrent
    // callers on the same key so we issue a single request to the IdP.
    let fetchPromise = inFlightFetches.get(cacheKey);
    if (!fetchPromise) {
      fetchPromise = this.fetchAndCacheToken(cacheKey, authUrl, clientId, clientSecret, scope, realmId)
        .finally(() => inFlightFetches.delete(cacheKey));
      inFlightFetches.set(cacheKey, fetchPromise);
    }
    return fetchPromise;
  }

  private async fetchAndCacheToken(cacheKey: string, authUrl: string, clientId: string, clientSecret: string, scope: string, realmId: string): Promise<string> {
    const token = await this.fetchFreshBearerToken(authUrl, clientId, clientSecret, scope, realmId);
    if (token) {
      const expiresAt = this.decodeTokenExpiryMs(token) ?? Date.now() + TOKEN_FALLBACK_TTL_MS;
      const cachedToken: CachedToken = { token, expiresAt };
      tokenCache.set(cacheKey, cachedToken);
      saveDiskTokenCache(cacheKey, cachedToken);
    }
    return token;
  }

  public async getBearerToken(
    authUrl: string = getConfig().hosts.auth as string,
    clientId: string = getConfig().client.id as string,
    clientSecret: string = getConfig().client.secret as string,
    scope: string = getConfig().client.scope as string,
    realmId: string = getConfig().realmId as string,
    forceRefresh: boolean = false
  ): Promise<string> {
    return this.getValidToken(authUrl, clientId, clientSecret, scope, realmId, forceRefresh);
  }

  public async buildAuthHeaders(clientId: string = getConfig().client.id as string, clientSecret: string = getConfig().client.secret as string, realmId: string = getConfig().realmId as string, authUrl: string = getConfig().hosts.auth as string): Promise<Record<string, string>> {
    const accessToken = await this.getValidToken(authUrl, clientId, clientSecret, undefined, realmId);
    return {
      accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
  }

  /**
   * Enhanced method to make HTTP requests with better error handling and logging
   * Combines functionality from processAPIRequest with full method support
   */
  public async makeRequest(options: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    data?: any;
    headers?: Record<string, string>;
    logMessage: string;
    responseType?: "data" | "status" | "headers" | "full";
    timeout?: number;
  }): Promise<any> {
    const { method, url, data, headers = {}, logMessage, responseType = "data", timeout = 30000 } = options;

    try {
      await this.objCommonFunctions.logMessage("INFO", `🚀 Making ${method} request to ${url}`);
      if (data) {
        await this.objCommonFunctions.logMessage("INFO", `📤 Request Payload: ${JSON.stringify(data, null, 2)}`);
      }

      const config: any = {
        method,
        url,
        headers: { "Content-Type": "application/json", ...headers },
        timeout,
        ...(data && ["POST", "PUT", "PATCH"].includes(method) && { data }),
      };

      const response = await axios(config);

      await this.objCommonFunctions.logMessage("PASS", `✅ ${logMessage} Success! Status: ${response.status} ${response.statusText}`);
      if (response.headers['trace-id']) {
        await this.objCommonFunctions.logMessage("INFO", `🔍 Trace ID: ${response.headers['trace-id']}`);
      }
      if (this.isBearerTokenResponse(url, logMessage, response.data)) {
        await this.objCommonFunctions.logMessage('INFO', '📥 Response Payload: [REDACTED - bearer token response]');
      } else {
        await this.objCommonFunctions.logMessage("INFO", `📥 Response Payload: ${JSON.stringify(response.data, null, 2)}`);
      }

      return responseType === "full" ? response : response[responseType];
    } catch (error: any) {
      const errorDetails = error.response
        ? `Status: ${error.response.status} ${error.response.statusText} | Response: ${JSON.stringify(error.response.data, null, 2)}`
        : `Message: ${error.message}`;

      await this.objCommonFunctions.logMessage("FAIL", `❌ ${logMessage} Failed! ${errorDetails}`);
      if (error.response?.headers?.['trace-id']) {
        await this.objCommonFunctions.logMessage("INFO", `🔍 Trace ID: ${error.response.headers['trace-id']}`);
      }

      // Return structured error response for better handling
      return {
        success: false,
        status: error.response?.status?.toString() || "ERROR",
        data: error.response?.data || null,
        headers: error.response?.headers || {},
        error: error.message
      };
    }
  }

}

export default new ApiUtil();