import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { BrowserContext, TestInfo } from '@playwright/test';
import { redactApiText, SENSITIVE_HEADERS } from './api-calls.util';

/**
 * Plan T9.1: record and replay data API responses for mocked UI-contract specs (tests/PlanningSpace/Mocked).
 * Login, portal and MFE stay live; only requests matching `url` are answered from the HAR. The MFE relays its
 * API calls to the portal (`apim:relay:request`), so the route goes on the browser context, which sees every frame.
 * PW_HAR_MODE=record re-records from the environment; anything else replays and aborts unrecorded requests.
 */
export type HarMode = 'replay' | 'record';

export interface ApiHarOptions {
  /** Folder under `testdata/<ENV>/har/`, usually the spec's batch (for example `ScenarioBatch`). */
  area: string;
  /** HAR file name without extension. */
  name: string;
  /** Requests to record or replay. Keep it to the data API the spec needs; never IAM or CDN traffic. */
  url: string | RegExp;
  /**
   * Wider pattern around `url` (for example the whole API resource). In replay, a request that matches `guard` but
   * not `url` is aborted and reported by `finishApiHar`, so a renamed or new endpoint can't quietly reach live data.
   * Not installed in record mode: there `routeFromHAR` passes recorded requests on to the next route as well.
   */
  guard?: string | RegExp;
}

export interface ApiHarHandle {
  mode: HarMode;
  harPath: string;
  /** Record mode: where Playwright writes the new recording; it replaces `harPath` only after a clean run. */
  recordPath: string;
  /** `METHOD path` of requests the replay guard blocked. */
  unexpected: string[];
  /** Test results seen by `trackApiHarResult`; record mode keeps the old HAR unless some passed and none failed. */
  passed: number;
  failed: number;
}

interface HarHeader { name: string; value: string }
interface HarContent { text?: string; encoding?: string; mimeType?: string }
interface HarEntry {
  request: { method?: string; url: string; headers?: HarHeader[]; cookies?: unknown[]; postData?: { text?: string; params?: { name: string; value?: string; fileName?: string }[] } };
  response: { headers?: HarHeader[]; cookies?: unknown[]; content?: HarContent };
}
interface HarFile { log: { entries: HarEntry[] } }

const SECRET_PATTERN = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}|\bbearer\s+(?!\[REDACTED\])[A-Za-z0-9._~+/=-]{8,}/i;

export const getHarMode = (): HarMode => ((process.env.PW_HAR_MODE || '').trim().toLowerCase() === 'record' ? 'record' : 'replay');

export const resolveHarPath = (area: string, name: string, environment = (process.env.ENVIRONMENT || process.env.PSENV || 'INTEROP').trim() || 'INTEROP'): string =>
  path.join(__dirname, '..', 'testdata', environment, 'har', area, `${name}.har`);

/**
 * HAR routes stay on the browser context for its whole life (unrouting them hung `afterAll` on the MFE page in
 * Chromium, 2026-10-27). The default `file-worker` page cache gives each spec file its own context and closes it when
 * the worker moves to another file, so the routes end with the file. `PW_PAGE_CACHE_SCOPE=worker` would carry them into
 * later files, and `PW_DISABLE_PAGE_CACHE=true` gives each test a fresh context without them, so both are refused.
 */
const assertFileScopedContext = (): void => {
  const scope = (process.env.PW_PAGE_CACHE_SCOPE || '').trim().toLowerCase();
  const cacheDisabled = (process.env.PW_DISABLE_PAGE_CACHE || '').trim().toLowerCase() === 'true';
  if (scope === 'worker' || cacheDisabled) {
    throw new Error('[HAR] Mocked specs need the default file-worker page cache (one context per spec file). Unset PW_PAGE_CACHE_SCOPE=worker / PW_DISABLE_PAGE_CACHE=true for this run.');
  }
};

/** Installs the HAR route on the context. Call it before the navigation that makes the first matching request. */
export async function useApiHar(context: BrowserContext, options: ApiHarOptions): Promise<ApiHarHandle> {
  assertFileScopedContext();
  const mode = getHarMode();
  const harPath = resolveHarPath(options.area, options.name);
  // Outside testdata, so a crashed recording run never leaves a partial HAR where it could be committed.
  const recordPath = path.join(os.tmpdir(), `har-recording-${options.name}-${process.pid}-${Date.now()}.har`);
  const handle: ApiHarHandle = { mode, harPath, recordPath, unexpected: [], passed: 0, failed: 0 };
  if (options.guard && mode === 'replay') {
    // Registered first: Playwright tries the newest route first, so requests matching `url` reach the HAR route.
    await context.route(options.guard, async (route) => {
      handle.unexpected.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      await route.abort('blockedbyclient');
    });
  }
  if (mode === 'record') {
    await fs.promises.mkdir(path.dirname(harPath), { recursive: true });
    await context.routeFromHAR(recordPath, { url: options.url, update: true, updateContent: 'embed', updateMode: 'minimal' });
  } else {
    if (!fs.existsSync(harPath)) {
      throw new Error(`HAR not found at ${harPath}. Record it on the environment with: npm run har:record:interop -- <spec path>`);
    }
    await context.routeFromHAR(harPath, { url: options.url, notFound: 'abort' });
  }
  console.log(`[HAR] ${mode} ${options.url}${options.guard && mode === 'replay' ? ` (guard ${options.guard})` : ''} using ${harPath}`);
  return handle;
}

/** Call from the spec's `afterEach`, so record mode only promotes a recording whose tests all passed. */
export function trackApiHarResult(handle: ApiHarHandle | undefined, testInfo: TestInfo): void {
  if (!handle) {
    return;
  }
  if (testInfo.status === testInfo.expectedStatus) {
    handle.passed += 1;
  } else {
    handle.failed += 1;
  }
}

/**
 * Replay: fails if the guard blocked any request (the routes end with the file's context; see `assertFileScopedContext`).
 * Record: closes the context (Playwright writes the HAR on close; the fixture's cached context is never closed at worker
 * teardown). The new recording replaces the committed HAR only if `trackApiHarResult` saw passes and no failures (a
 * failed `beforeAll` runs no tests), and only once redacted, refusing it if a token is left, a body is binary, or a
 * request URL or body holds data that can't be redacted without breaking replay matching. The fixture recreates a
 * closed page for the next file.
 */
export async function finishApiHar(context: BrowserContext, handle: ApiHarHandle): Promise<void> {
  if (handle.mode !== 'record') {
    if (handle.unexpected.length > 0) {
      throw new Error(`[HAR] Requests outside the recording were blocked (re-record, or widen \`url\` if the MFE now needs them): ${[...new Set(handle.unexpected)].join(', ')}`);
    }
    return;
  }
  await context.close();
  try {
    if (handle.failed > 0 || handle.passed === 0) {
      throw new Error(`[HAR] Recording run did not pass (${handle.passed} passed, ${handle.failed} failed); ${handle.harPath} was left unchanged.`);
    }
    await promoteRecording(handle);
  } finally {
    await fs.promises.rm(handle.recordPath, { force: true });
  }
}

async function promoteRecording(handle: ApiHarHandle): Promise<void> {
  const har = JSON.parse(await fs.promises.readFile(handle.recordPath, 'utf-8')) as HarFile;
  const sensitiveRequests = findSensitiveRequestData(har);
  const redactedHar = redactHar(har);
  const redacted = JSON.stringify(redactedHar, null, 2);
  const opaqueBodies = findOpaqueResponseBodies(redactedHar);
  if (SECRET_PATTERN.test(redacted) || opaqueBodies.length > 0 || sensitiveRequests.length > 0) {
    const reasons = [
      sensitiveRequests.length > 0 ? `Request URL or body with sensitive data: ${sensitiveRequests.join(', ')}.` : '',
      opaqueBodies.length > 0 ? `Binary response bodies that can't be checked (narrow \`url\` to JSON data APIs): ${opaqueBodies.join(', ')}.` : '',
      SECRET_PATTERN.test(redacted) ? 'A token was still present after redaction.' : '',
    ].filter(Boolean).join(' ');
    throw new Error(`[HAR] ${reasons} The new recording was discarded; ${handle.harPath} was left unchanged.`);
  }
  await fs.promises.writeFile(handle.harPath, redacted, 'utf-8');
  console.log(`[HAR] Recorded and redacted ${har.log.entries.length} entries into ${handle.harPath}`);
}

/**
 * Request URLs and POST bodies are kept as recorded because replay matches on them, so they can't be redacted.
 * Returns `METHOD path` of every entry whose URL or body the api-calls redaction rules would change (tokens,
 * `access_token=`/`code=` style params, secret-named JSON keys, emails); recording fails if there is any.
 */
export function findSensitiveRequestData(har: HarFile): string[] {
  return har.log.entries
    .filter((entry) => {
      // Form and multipart bodies are recorded as `params`, not `text`, so both are checked.
      const params = (entry.request.postData?.params ?? []).map((param) => `${param.name}=${param.value ?? ''}${param.fileName ? ` fileName=${param.fileName}` : ''}`);
      const text = [entry.request.url, entry.request.postData?.text ?? '', ...params].join('\n');
      return redactApiText(text) !== text || redactApiText(decodeURIComponentSafe(text)) !== decodeURIComponentSafe(text);
    })
    .map((entry) => `${entry.request.method ?? 'GET'} ${new URL(entry.request.url).pathname}`);
}

const decodeURIComponentSafe = (text: string): string => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

/** True when a decoded body is valid UTF-8 text (no replacement characters or control bytes other than whitespace). */
const looksLikeText = (text: string): boolean => !text.includes(String.fromCharCode(0xfffd)) && !/[\x00-\x08\x0E-\x1F]/.test(text);

/**
 * `METHOD path` of entries whose response body is still base64 after `redactHar`, meaning it isn't text. Mocked specs
 * replay data APIs (JSON), and an opaque body can't be checked for tokens or emails, so recording fails closed on it.
 */
export function findOpaqueResponseBodies(har: HarFile): string[] {
  return har.log.entries
    .filter((entry) => entry.response.content?.encoding === 'base64' && Boolean(entry.response.content.text))
    .map((entry) => `${entry.request.method ?? 'GET'} ${new URL(entry.request.url).pathname}`);
}

/**
 * Drops sensitive headers and cookies and redacts response bodies with the api-calls rules. Request URLs and
 * POST bodies stay as recorded, because replay matches on them.
 */
export function redactHar(har: HarFile): HarFile {
  const keepHeaders = (headers: HarHeader[] = []): HarHeader[] =>
    headers.filter((header) => !SENSITIVE_HEADERS.has(header.name.toLowerCase())).map((header) => ({ ...header, value: redactApiText(header.value) }));

  for (const entry of har.log.entries) {
    entry.request.headers = keepHeaders(entry.request.headers);
    entry.request.cookies = [];
    entry.response.headers = keepHeaders(entry.response.headers);
    entry.response.cookies = [];
    const content = entry.response.content;
    if (content?.text === undefined) {
      continue;
    }
    // Decide by content, not the MIME hint: a JSON body served with a wrong or missing type is still redacted.
    if (content.encoding === 'base64') {
      const decoded = Buffer.from(content.text, 'base64').toString('utf-8');
      if (looksLikeText(decoded)) {
        content.text = decoded;
        delete content.encoding;
      }
    }
    if (content.encoding !== 'base64') {
      content.text = redactApiText(content.text);
    }
  }
  return har;
}
