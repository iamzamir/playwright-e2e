import type { BrowserContext, Request, Response } from '@playwright/test';
import { bodyText, redactApiText, SENSITIVE_HEADERS } from '../util/api-calls.util';

export type NetworkCaptureMode = 'all' | 'api-only';

/**
 * Controls which captured entries are retained in the emitted network log.
 * - 'full'   : keep every captured entry (large artifacts).
 * - 'capped' : keep only HTTP errors (status >= 400) and genuine network
 *              failures (a requestfailed whose errorText is not in the ignore
 *              list). Successful (2xx/3xx) calls and aborted teardown beacons
 *              are dropped.
 * Either way, what getEntries() returns is redacted and bodies are capped (see redactEntry).
 */
export type NetworkBodyFidelity = 'full' | 'capped';

export interface NetworkInterceptorOptions {
  bodyFidelity?: NetworkBodyFidelity;
  /**
   * Failure `errorText` values treated as noise and dropped in 'capped' mode
   * (e.g. `net::ERR_ABORTED` from beacons cancelled at test teardown).
   * Compared case-insensitively. Ignored in 'full' mode.
   */
  ignoredFailureErrors?: string[];
}

export interface NetworkEntry {
  id: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  url: string;
  method: string;
  resourceType: string;
  navigationRequest: boolean;
  headers: Record<string, string>;
  postData?: string | null;
  response?: {
    status: number;
    statusText: string;
    ok: boolean;
    headers: Record<string, string>;
    body?: string | null;
  };
  failure?: {
    errorText: string;
  };
}

export interface NetworkErrorSummary {
  method: string;
  status: number;
  failure: string | null;
  path: string;
  count: number;
}

export class NetworkInterceptor {
  private static readonly RESPONSE_BODY_TIMEOUT_MS = 2000;
  private static readonly STOP_TIMEOUT_MS = 5000;
  private static readonly API_RESOURCE_TYPES = new Set(['xhr', 'fetch']);
  // Sentry ingest: POST /api/<project>/envelope/?sentry_key=... (the key tells it from any other /envelope API)
  private static readonly SENTRY_ENVELOPE = /^[^?#]*\/api\/[^/?]+\/envelope\/?\?(?:[^#]*&)?sentry_key=/;

  private static readonly DEFAULT_IGNORED_FAILURE_ERRORS = ['net::err_aborted'];

  private readonly entries: NetworkEntry[] = [];
  private readonly requestMap = new WeakMap<Request, NetworkEntry>();
  private readonly pendingTasks = new Set<Promise<void>>();
  private readonly bodyFidelity: NetworkBodyFidelity;
  private readonly ignoredFailureErrors: Set<string>;

  constructor(
    private readonly context: BrowserContext,
    private readonly captureMode: NetworkCaptureMode = 'all',
    options: NetworkInterceptorOptions = {}
  ) {
    this.bodyFidelity = options.bodyFidelity ?? 'capped';
    const ignored = options.ignoredFailureErrors && options.ignoredFailureErrors.length > 0
      ? options.ignoredFailureErrors
      : NetworkInterceptor.DEFAULT_IGNORED_FAILURE_ERRORS;
    this.ignoredFailureErrors = new Set(ignored.map((e) => e.trim().toLowerCase()));
  }

  start(): void {
    this.context.on('request', this.onRequest);
    this.context.on('response', this.onResponse);
    this.context.on('requestfailed', this.onRequestFailed);
  }

  async stop(): Promise<void> {
    this.context.off('request', this.onRequest);
    this.context.off('response', this.onResponse);
    this.context.off('requestfailed', this.onRequestFailed);

    await Promise.race([
      Promise.allSettled([...this.pendingTasks]),
      this.delay(NetworkInterceptor.STOP_TIMEOUT_MS)
    ]);
  }

  getEntries(): NetworkEntry[] {
    return this.entries.filter((entry) => this.isRetained(entry)).map((entry) => this.redactEntry(entry));
  }

  getErrorSummaries(): NetworkErrorSummary[] {
    const summaries = new Map<string, NetworkErrorSummary>();
    for (const entry of this.entries) {
      if (!this.isRetained(entry)) continue;
      const status = entry.response?.status ?? 0;
      const failure = entry.failure?.errorText ? redactApiText(entry.failure.errorText) : null;
      if (status < 400 && !failure) continue;

      let pathname: string;
      try {
        pathname = new URL(entry.url).pathname;
      } catch {
        pathname = entry.url.split('?')[0];
      }
      const path = redactApiText(pathname);
      const key = `${entry.method} ${status || failure} ${path}`;
      const summary = summaries.get(key) ?? { method: entry.method, status, failure, path, count: 0 };
      summary.count++;
      summaries.set(key, summary);
    }
    return [...summaries.values()].slice(0, 50);
  }

  getRetainedEntryCount(): number {
    return this.entries.filter((entry) => this.isRetained(entry)).length;
  }

  /**
   * The log is published with the reports, so mask it with the same rules as api-calls.json.
   * Done here rather than at capture so successful calls dropped in 'capped' mode cost nothing.
   * Sentry envelopes are left out altogether: they replay the app's console (including its
   * runtime config and the signed-in user), which key-name rules can't reliably clean, and
   * nothing reads them when triaging.
   */
  private redactEntry(entry: NetworkEntry): NetworkEntry {
    const redacted: NetworkEntry = { ...entry, url: redactApiText(entry.url) };
    if (entry.postData) {
      redacted.postData = NetworkInterceptor.SENTRY_ENVELOPE.test(entry.url)
        ? `[Sentry envelope omitted, ${entry.postData.length} chars]`
        : bodyText(entry.postData);
    }
    if (entry.response) {
      redacted.response = { ...entry.response, body: bodyText(entry.response.body) };
    }
    return redacted;
  }

  /**
   * In 'capped' mode keep only HTTP errors (status >= 400) and genuine network
   * failures (errorText not in the ignore list). 'full' mode keeps everything.
   */
  private isRetained(entry: NetworkEntry): boolean {
    if (this.bodyFidelity === 'full') {
      return true;
    }

    if (entry.response !== undefined && entry.response.status >= 400) {
      return true;
    }

    if (entry.failure !== undefined) {
      return !this.ignoredFailureErrors.has(entry.failure.errorText.trim().toLowerCase());
    }

    return false;
  }

  private readonly onRequest = (request: Request): void => {
    if (!this.shouldCapture(request)) {
      return;
    }

    const entry: NetworkEntry = {
      id: `${Date.now()}-${this.entries.length + 1}`,
      startedAt: new Date().toISOString(),
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      navigationRequest: request.isNavigationRequest(),
      headers: this.sanitizeHeaders(request.headers()),
      postData: request.postData()
    };

    this.entries.push(entry);
    this.requestMap.set(request, entry);
  };

  private readonly onResponse = (response: Response): void => {
    const task = this.captureResponse(response)
      .catch(() => {
        // Best-effort logging: response capture issues should not fail test execution.
      })
      .finally(() => {
        this.pendingTasks.delete(task);
      });

    this.pendingTasks.add(task);
  };

  private readonly onRequestFailed = (request: Request): void => {
    const entry = this.requestMap.get(request);
    if (!entry) {
      return;
    }

    entry.endedAt = new Date().toISOString();
    entry.durationMs = this.getDuration(entry.startedAt, entry.endedAt);
    entry.failure = {
      errorText: request.failure()?.errorText || 'Unknown network failure'
    };
  };

  private async captureResponse(response: Response): Promise<void> {
    const request = response.request();
    const entry = this.requestMap.get(request);
    if (!entry) {
      return;
    }

    const status = response.status();

    // In 'capped' mode successful responses (status < 400) are dropped by
    // getEntries(), so skip the expensive body (response.text()) and header
    // reads for them — only record timing.
    if (this.bodyFidelity === 'capped' && status < 400) {
      entry.endedAt = new Date().toISOString();
      entry.durationMs = this.getDuration(entry.startedAt, entry.endedAt);
      return;
    }

    let responseBody: string | null = null;

    try {
      if (entry.resourceType === 'xhr' || entry.resourceType === 'fetch') {
        responseBody = await this.withTimeout(
          response.text(),
          NetworkInterceptor.RESPONSE_BODY_TIMEOUT_MS
        );
      }
    } catch {
      responseBody = '[Response body capture unavailable or timed out]';
    }

    entry.endedAt = new Date().toISOString();
    entry.durationMs = this.getDuration(entry.startedAt, entry.endedAt);
    entry.response = {
      status,
      statusText: response.statusText(),
      ok: response.ok(),
      headers: this.sanitizeHeaders(await response.allHeaders()),
      body: responseBody
    };
  }

  private getDuration(startedAt: string, endedAt: string): number {
    return new Date(endedAt).getTime() - new Date(startedAt).getTime();
  }

  private shouldCapture(request: Request): boolean {
    if (this.captureMode === 'all') {
      return true;
    }

    return NetworkInterceptor.API_RESOURCE_TYPES.has(request.resourceType());
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      sanitized[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? '[REDACTED]' : redactApiText(value);
    }

    return sanitized;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      this.delay(timeoutMs).then(() => {
        throw new Error('Timed out');
      })
    ]);
  }

  private delay(timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  }
}
