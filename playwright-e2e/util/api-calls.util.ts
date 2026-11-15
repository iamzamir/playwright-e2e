import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { TestInfo } from '@playwright/test';

/**
 * Plan E4: records the last API calls made through axios in this worker so a failing test carries
 * `api-calls.json` (request, response, status, request id) and `api-repro.sh` (curl) as evidence.
 * Everything attached is redacted: tokens, secrets, cookies and email addresses never leave the runner.
 */
export interface ApiCallRecord {
  at: string;
  method: string;
  url: string;
  status: number | null;
  error: string | null;
  durationMs: number | null;
  requestId: string | null;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseBody: string | null;
}

const MAX_CALLS = 10;
const MAX_BODY_CHARS = 20_000;
const SENSITIVE_JSON_KEY = /(?:password|secret|token|api[-_]?key|authorization|credential|licen[cs]e|dsn)/i;
export const SENSITIVE_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key', 'api-key', 'ocp-apim-subscription-key']);
const REQUEST_ID_HEADERS = ['x-correlation-id', 'request-id', 'x-request-id', 'trace-id', 'by-apim-correlationid', 'x-gravitee-request-id', 'x-gravitee-transaction-id', 'x-ms-request-id'];
const STARTED_AT = Symbol('apiCallStartedAt');

// Bodies are kept raw and only serialized when a failing test attaches them.
type RawCall = Omit<ApiCallRecord, 'requestBody' | 'responseBody'> & { requestData: unknown; responseData: unknown };

const calls: RawCall[] = [];
let installed = false;
let lastTestEndedAt = 0;

function redactJsonSecretFields(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }

  let changed = false;
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return;

    // Arrays too: their index keys are never sensitive, and string elements can hold nested JSON.
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_JSON_KEY.test(key)) {
        (value as Record<string, unknown>)[key] = '[REDACTED]';
        changed = true;
      } else if (typeof child === 'string' && /^[\s]*[\[{]/.test(child)) {
        const redacted = redactJsonSecretFields(child);
        if (redacted !== child) {
          (value as Record<string, unknown>)[key] = redacted;
          changed = true;
        }
      } else {
        visit(child);
      }
    }
  };

  visit(parsed);
  return changed ? JSON.stringify(parsed) : text;
}

function redactApiTextPatterns(text: string): string {
  return text
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\b/g, '[REDACTED_JWT]')
    .replace(/(bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]')
    .replace(/(^|[?&;\s])((?:access_token|refresh_token|id_token|client_secret|password|code|token|(?:x-)?api[-_]?key|subscription-key)=)[^&;\s"'#]+/gi, '$1$2[REDACTED]')
    .replace(/("(?:[\w-]*(?:password|secret|token|api[-_]?key|authorization|credential|licen[cs]e|dsn)[\w-]*)"\s*:\s*)"(?:[^"\\]|\\.)*(?:"|\\?$)/gi, '$1"[REDACTED]"')
    .replace(/(^|[^A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}(?:@|%40)(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}(?![A-Za-z0-9.-])/gi, '$1[REDACTED_EMAIL]');
}

export function redactApiText(text: string): string {
  return redactApiTextPatterns(redactJsonSecretFields(text));
}

function isBinary(body: unknown): body is { byteLength?: number; length?: number } {
  return Buffer.isBuffer(body) || body instanceof ArrayBuffer || ArrayBuffer.isView(body)
    || (typeof body === 'object' && body !== null && typeof (body as { pipe?: unknown }).pipe === 'function');
}

export function bodyText(body: unknown): string | null {
  if (body === undefined || body === null || body === '') return null;
  if (isBinary(body)) {
    const size = body.byteLength ?? body.length;
    return size === undefined ? '[binary body]' : `[binary body, ${size} bytes]`;
  }
  let text: string;
  try {
    text = typeof body === 'string' ? body : body instanceof URLSearchParams ? body.toString() : JSON.stringify(body);
  } catch {
    return '[body could not be serialized]';
  }
  const structurallyRedacted = redactJsonSecretFields(text);
  // Margin so a token crossing the cut is still matched before the final cut.
  const bounded = structurallyRedacted.length > MAX_BODY_CHARS + 4096
    ? structurallyRedacted.slice(0, MAX_BODY_CHARS + 4096)
    : structurallyRedacted;
  const redacted = redactApiTextPatterns(bounded);
  return redacted.length > MAX_BODY_CHARS ? `${redacted.slice(0, MAX_BODY_CHARS)}…[truncated]` : redacted;
}

function plainHeaders(headers: unknown): Record<string, string> {
  const source = headers && typeof (headers as { toJSON?: () => unknown }).toJSON === 'function'
    ? (headers as { toJSON: () => Record<string, unknown> }).toJSON()
    : (headers as Record<string, unknown>) || {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || typeof value === 'object') continue;
    out[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? '[REDACTED]' : redactApiText(String(value));
  }
  return out;
}

function requestIdOf(headers: unknown): string | null {
  const lower = Object.fromEntries(Object.entries(plainHeaders(headers)).map(([key, value]) => [key.toLowerCase(), value]));
  const key = REQUEST_ID_HEADERS.find((name) => lower[name]);
  return key ? `${key}=${lower[key]}` : null;
}

function record(config: InternalAxiosRequestConfig | undefined, response: AxiosResponse | undefined, error?: AxiosError): void {
  if (!config) return;
  const startedAt = (config as unknown as Record<symbol, number>)[STARTED_AT];
  let url = config.url || '';
  try {
    url = axios.getUri(config);
  } catch {
    // Keep the raw url when axios cannot build the full one.
  }
  calls.push({
    at: new Date().toISOString(),
    method: String(config.method || 'GET').toUpperCase(),
    url: redactApiText(url),
    status: response ? response.status : null,
    error: response ? null : redactApiText(error ? error.message : 'No response'),
    durationMs: startedAt ? Date.now() - startedAt : null,
    requestId: response ? requestIdOf(response.headers) : null,
    requestHeaders: plainHeaders(config.headers),
    requestData: config.data,
    responseData: response ? response.data : undefined
  });
  if (calls.length > MAX_CALLS) calls.splice(0, calls.length - MAX_CALLS);
}

export function installApiCallRecorder(): void {
  if (installed) return;
  installed = true;
  axios.interceptors.request.use((config) => {
    (config as unknown as Record<symbol, number>)[STARTED_AT] = Date.now();
    return config;
  });
  axios.interceptors.response.use(
    (response) => {
      record(response.config, response);
      return response;
    },
    (error: AxiosError) => {
      record(error.config, error.response, error);
      return Promise.reject(error);
    }
  );
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

// Ready-to-run repro of one call; the token is a placeholder to fill in with a fresh one.
export function toCurl(call: ApiCallRecord): string {
  const parts = [`curl -i -X ${call.method} ${shellQuote(call.url)}`];
  for (const [key, value] of Object.entries(call.requestHeaders)) {
    if (key.toLowerCase() === 'authorization') parts.push(`-H ${shellQuote(`${key}: Bearer `)}"$TOKEN"`);
    else if (value !== '[REDACTED]') parts.push(`-H ${shellQuote(`${key}: ${value}`)}`);
  }
  if (call.requestBody) parts.push(`--data-raw ${shellQuote(call.requestBody)}`);
  return parts.join(' \\\n  ');
}

/** Calls since the previous test in this worker finished (so beforeAll calls of this file are included). */
export function callsForCurrentTest(): ApiCallRecord[] {
  return calls
    .filter((call) => Date.parse(call.at) >= lastTestEndedAt)
    .map(({ requestData, responseData, ...call }) => ({ ...call, requestBody: bodyText(requestData), responseBody: bodyText(responseData) }));
}

export async function apiCallsFixture({}: object, use: () => Promise<void>, testInfo: TestInfo): Promise<void> {
  installApiCallRecorder();
  await use();
  try {
    const recent = callsForCurrentTest();
    if (testInfo.status !== testInfo.expectedStatus && recent.length) {
      const focus = [...recent].reverse().find((call) => call.status === null || call.status >= 400) || recent[recent.length - 1];
      await testInfo.attach('api-calls.json', { body: Buffer.from(JSON.stringify(recent, null, 2), 'utf-8'), contentType: 'application/json' });
      await testInfo.attach('api-repro.sh', {
        body: Buffer.from(`# ${focus.method} ${focus.url} -> ${focus.status ?? focus.error}\n# Set TOKEN to a fresh bearer token for the same realm first.\n${toCurl(focus)}\n`, 'utf-8'),
        contentType: 'text/plain'
      });
    }
  } finally {
    lastTestEndedAt = Date.now();
  }
}

// Installed on import, so calls made in beforeAll hooks (before any test fixture runs) are recorded too.
installApiCallRecorder();
