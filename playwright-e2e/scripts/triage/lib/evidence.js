const fs = require('fs');
const path = require('path');

const HOOK_STEPS = new Set(['Before Hooks', 'After Hooks', 'Worker Cleanup', 'screenshot', 'error-context', 'trace', 'video']);
const REQUEST_ID_HEADERS = ['x-correlation-id', 'request-id', 'x-request-id', 'by-apim-correlationid', 'x-gravitee-request-id', 'x-gravitee-transaction-id', 'x-ms-request-id'];
const MAX_STEPS = 20;
const MAX_HTTP_ERRORS = 15;
const MAX_API_CALLS = 5;
const OUR_CODE = /(pageobjects|tests|util|configs|network)\/[^\s:()]+\.ts:\d+/;
const SENSITIVE_JSON_KEY = /(?:password|secret|token|api[-_]?key|authorization|credential|licen[cs]e|dsn)/i;

function stripAnsi(text) {
  return String(text || '').replace(/\u001b\[[0-9;]*m/g, '');
}

// Evidence is published to the dashboard, so mask tokens, credentials and personal data
// (same idea as redact() in configs/failure-hook.ts, plus emails and secret-looking JSON fields).
function redactJsonSecretFields(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }

  let changed = false;
  const visit = (value) => {
    if (value === null || typeof value !== 'object') return;

    // Arrays too: their index keys are never sensitive, and string elements can hold nested JSON.
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_JSON_KEY.test(key)) {
        value[key] = '[REDACTED]';
        changed = true;
      } else if (typeof child === 'string' && /^[\s]*[\[{]/.test(child)) {
        const redacted = redactJsonSecretFields(child);
        if (redacted !== child) {
          value[key] = redacted;
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

function redact(text) {
  if (text === null || text === undefined) return text;
  return redactJsonSecretFields(String(text))
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\b/g, '[REDACTED_JWT]')
    .replace(/(bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]')
    .replace(/(^|[?&;\s])((?:access_token|refresh_token|id_token|client_secret|password|code|token|(?:x-)?api[-_]?key|subscription-key)=)[^&;\s"'#]+/gi, '$1$2[REDACTED]')
    .replace(/("(?:[\w-]*(?:password|secret|token|api[-_]?key|authorization|credential|licen[cs]e|dsn)[\w-]*)"\s*:\s*)"(?:[^"\\]|\\.)*(?:"|\\?$)/gi, '$1"[REDACTED]"')
    .replace(/(^|[^A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}(?:@|%40)(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}(?![A-Za-z0-9.-])/gi, '$1[REDACTED_EMAIL]');
}

// "✅ [2026-10-05 22:33:27] [INFO] Clicking on X" -> { level: 'INFO', text: 'Clicking on X' }
function cleanStepName(name) {
  const withoutIcon = String(name || '').replace(/^[^\w[]+/u, '').trim();
  const match = withoutIcon.match(/^\[\d{4}-\d{2}-\d{2} [\d:]+\]\s*\[(\w+)\]\s*(.*)$/s);
  if (match) return { level: match[1].toUpperCase(), text: redact(match[2].trim()).slice(0, 200) };
  return { level: 'STEP', text: redact(withoutIcon).slice(0, 200) };
}

// Depth-first list of the test's own steps (hooks and attachment pseudo-steps excluded).
function flattenSteps(steps, out = []) {
  for (const step of steps || []) {
    if (HOOK_STEPS.has(step.name)) continue;
    out.push(step);
    flattenSteps(step.steps, out);
  }
  return out;
}

function collectAttachments(node, out = []) {
  for (const attachment of node.attachments || []) out.push(attachment);
  for (const step of node.steps || []) collectAttachments(step, out);
  return out;
}

// First stack frame in our own code, e.g. "pageobjects/planning.page.ts:1802 PlanningPage.performRightClickOnCardCell".
function errorLocation(trace) {
  for (const line of stripAnsi(trace).split('\n')) {
    const file = line.match(OUR_CODE);
    if (!file) continue;
    const fn = line.match(/at\s+([\w$.<>]+)\s+\(/);
    return { file: file[0].replace(/:\d+$/, ''), line: Number(file[0].split(':').pop()), function: fn ? fn[1] : null };
  }
  return null;
}

function errorType(message) {
  const match = stripAnsi(message).match(/^\s*(\w*Error)\b/);
  return match ? match[1] : 'Error';
}

// URL path with ids masked so the same endpoint groups together: /calcEngines/{id}/scenarios
function templatePath(url) {
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = String(url || '').split('?')[0];
  }
  return pathname
    .split('/')
    .map((segment) => (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) || /^[0-9a-f]{20,}$/i.test(segment) || /^\d+$/.test(segment) ? '{id}' : segment))
    .join('/');
}

function requestIdOf(headers) {
  const lower = Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
  const key = REQUEST_ID_HEADERS.find((name) => lower[name]);
  return key ? `${key}=${lower[key]}` : null;
}

// HTTP errors from the network-log attachment, closest to the failure first.
function httpErrorsFrom(entries, failedAt) {
  const errors = [];
  for (const entry of entries || []) {
    const status = entry.response ? entry.response.status : null;
    const failure = entry.failure ? (entry.failure.errorText || String(entry.failure)) : null;
    if (!(status >= 400) && !failure) continue;
    const at = Date.parse(entry.endedAt || entry.startedAt || '') || null;
    const body = entry.response && typeof entry.response.body === 'string' && !entry.response.body.startsWith('[Response body') ? redact(entry.response.body).slice(0, 300) : null;
    errors.push({
      method: entry.method,
      status: status || 0,
      failure,
      endpoint: templatePath(entry.url),
      host: (() => { try { return new URL(entry.url).host; } catch { return null; } })(),
      msBeforeFailure: at && failedAt ? failedAt - at : null,
      requestId: requestIdOf(entry.response && entry.response.headers),
      body
    });
  }
  return errors
    .sort((a, b) => Math.abs(a.msBeforeFailure ?? 1e12) - Math.abs(b.msBeforeFailure ?? 1e12))
    .slice(0, MAX_HTTP_ERRORS);
}

function readNetworkLog(attachments, resultDir) {
  const log = attachments.find((attachment) => /network-log\.json$/.test(attachment.name || ''));
  if (!log || !resultDir) return [];
  try {
    return JSON.parse(fs.readFileSync(path.join(resultDir, log.source), 'utf-8'));
  } catch {
    return [];
  }
}

// "METHOD STATUS /templated/path" keys (same format as classify.endpointKey) from a passing test's network-errors.json,
// or from its full network-log.json when PW_NETWORK_ARTIFACT_MODE=always attached that instead.
function networkErrorKeys(result) {
  const attachments = collectAttachments(result);
  const summary = attachments.find((attachment) => /network-errors\.json$/.test(attachment.name || ''));
  const resultDir = result._file ? path.dirname(result._file) : null;
  if (!resultDir) return [];
  if (!summary) {
    const keys = readNetworkLog(attachments, resultDir)
      .filter((entry) => (entry.response && entry.response.status >= 400) || entry.failure)
      .map((entry) => `${entry.method} ${(entry.response && entry.response.status) || entry.failure.errorText || entry.failure} ${templatePath(entry.url)}`);
    return [...new Set(keys)];
  }
  try {
    const items = JSON.parse(fs.readFileSync(path.join(resultDir, summary.source), 'utf-8'));
    return [...new Set(items.map((item) => `${item.method} ${item.status || item.failure} ${templatePath(item.path)}`))];
  } catch {
    return [];
  }
}

/**
 * Evidence for one failed test result: error, where it happened, the failing step, the last steps,
 * the HTTP errors around the failure (network-log attachment of UI tests) and the last API calls
 * (api-calls.json from util/api-calls.util.ts).
 */
function extractEvidence(result) {
  const details = result.statusDetails || {};
  const message = stripAnsi(details.message);
  const steps = flattenSteps(result.steps);
  const failedStep = [...steps].reverse().find((step) => step.status === 'failed' || step.status === 'broken');
  const attachments = collectAttachments(result);
  const resultDir = result._file ? path.dirname(result._file) : null;

  return {
    error: {
      type: errorType(message),
      message: redact(message).slice(0, 2000),
      location: errorLocation(details.trace || message)
    },
    failedStep: failedStep ? cleanStepName(failedStep.name).text : null,
    stepTrail: steps.slice(-MAX_STEPS).map((step) => ({ ...cleanStepName(step.name), status: step.status })),
    httpErrors: httpErrorsFrom(readNetworkLog(attachments, resultDir), result.stop),
    apiCalls: apiCallsFrom(attachments, resultDir, result.stop),
    attachments: [...new Set(attachments.map((attachment) => String(attachment.name || '').replace(/^.*__/, '')))]
  };
}

// Last API calls of the test, newest first, in the same shape as httpErrors (status 0 + failure when there was no response).
function apiCallsFrom(attachments, resultDir, failedAt) {
  const file = attachments.find((attachment) => /api-calls\.json$/.test(attachment.name || ''));
  if (!file || !resultDir) return [];
  let calls;
  try {
    calls = JSON.parse(fs.readFileSync(path.join(resultDir, file.source), 'utf-8'));
  } catch {
    return [];
  }
  return (Array.isArray(calls) ? calls : []).slice(-MAX_API_CALLS).reverse().map((call) => {
    const at = Date.parse(call.at || '') || null;
    return {
      method: call.method,
      status: call.status || 0,
      failure: call.status ? null : redact(call.error || 'No response'),
      endpoint: templatePath(call.url),
      host: (() => { try { return new URL(call.url).host; } catch { return null; } })(),
      msBeforeFailure: at && failedAt ? failedAt - at : null,
      requestId: call.requestId || null,
      body: call.responseBody ? redact(call.responseBody).slice(0, 300) : null
    };
  });
}

module.exports = { extractEvidence, cleanStepName, errorLocation, errorType, templatePath, requestIdOf, httpErrorsFrom, apiCallsFrom, redact, networkErrorKeys };
