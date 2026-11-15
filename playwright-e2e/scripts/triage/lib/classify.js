/**
 * Rules v1 (plan §7.2–7.3): one category per failed test, with confidence and plain-language reasons.
 * Categories: KNOWN_ISSUE, FLAKY, ENVIRONMENT_ISSUE, TEST_DATA_ISSUE, AUTOMATION_ISSUE, PRODUCT_DEFECT, TO_INVESTIGATE.
 */

// UI waits time out after up to 60s, so an API error up to ~2 minutes before the failure can still be the cause.
const CAUSAL_WINDOW_MS = 120000;
const ENV_SEGMENT = /\/(dev|qa|interop|psr|stg|staging)\//i;
const ENV_ALIASES = { INTEROP: ['interop', 'ioptst', 'iop'], QA: ['qa'], PSR: ['psr'] };
const STATIC_ASSET = /\.(svg|png|jpe?g|gif|ico|webp|css|js|map|woff2?|ttf|eot)$/i;

const MESSAGE_RULES = [
  { pattern: /launchAppFromCatalog failed|Login failed|401 Unauthorized|status code 401|invalid_client|invalid_grant|AADB2C/i, category: 'ENVIRONMENT_ISSUE', confidence: 'high', reason: 'Login or token request failed' },
  { pattern: /Bad Gateway|Service Unavailable|Gateway Timeout|status code 50[234]|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|net::ERR_/i, category: 'ENVIRONMENT_ISSUE', confidence: 'medium', reason: 'Gateway or network error in the failure message', gateway: true },
  { pattern: /strict mode violation/i, category: 'AUTOMATION_ISSUE', confidence: 'high', reason: 'Locator matches more than one element (strict mode)' },
  { pattern: /\b(TypeError|ReferenceError|SyntaxError)\b|is not a function|Cannot read propert|with any selector/i, category: 'AUTOMATION_ISSUE', confidence: 'high', reason: 'Script error or no selector matched in test code' },
  { pattern: /Received:\s*"?5\d\d"?|status code 500|Internal Server Error/i, category: 'PRODUCT_DEFECT', confidence: 'high', reason: 'The service returned a 5xx error to the test' },
  { pattern: /Expected:\s*"COMPLETED"[\s\S]*?Received:\s*"(ERROR|FAILED)"/, category: 'PRODUCT_DEFECT', confidence: 'medium', reason: 'A backend job ended in ERROR/FAILED instead of COMPLETED' },
  { pattern: /No .*candidate|did not become visible in the .* list|No visible action menu found|already exists|status code 409|status code 404|not found in/i, category: 'TEST_DATA_ISSUE', confidence: 'medium', reason: 'Expected record missing or duplicated' }
];

// util/visual-helper.util.ts: "Visual validation failed for PS-AllViewsPanel.png." + "Baseline path: …/VisualBaseValidations/<Area>/…".
const VISUAL_DIFF = /Visual validation failed for [^\s]+\.png/;
// A screen that also differed on this many of the previous 7 nights has a stale baseline, not a new change.
const STALE_BASELINE_NIGHTS = 3;

function visualArea(test, message) {
  const fromBaseline = message.match(/VisualBaseValidations\/([^/\s]+)\//);
  if (fromBaseline) return fromBaseline[1];
  return String(test.spec || '').split('/')[0] || 'Visual';
}

// Visual smoke diffs: repeated diffs are baseline upkeep (plan §7.3); a first diff could be a product change, so it stays
// TO_INVESTIGATE, but all of a night's new diffs in one area form one group.
function visualRule(test, message) {
  if (!VISUAL_DIFF.test(message)) return null;
  const area = visualArea(test, message);
  const failedBefore = (String(test.last7 || '').match(/F/g) || []).length;
  if (failedBefore >= STALE_BASELINE_NIGHTS) {
    return {
      ...result('AUTOMATION_ISSUE', 'medium', [`Screen also differed from its baseline on ${failedBefore} of the previous ${String(test.last7).length} nights: review the diff, then re-approve the baseline or mask live data`]),
      group: { key: `visual:${area}:stale`, title: `Visual baseline out of date (${area} screens that keep failing)` }
    };
  }
  return {
    ...result('TO_INVESTIGATE', 'low', ['New visual diff: compare the expected and actual images to tell a product change from rendering or data drift']),
    group: { key: `visual:${area}:new`, title: `New visual diff vs baseline (${area} screens)` }
  };
}

function endpointKey(error) {
  return `${error.method} ${error.status || error.failure} ${error.endpoint}`;
}

function crossEnvironment(endpoint, environment) {
  const match = String(endpoint || '').match(ENV_SEGMENT);
  if (!match || !environment) return false;
  const aliases = ENV_ALIASES[String(environment).toUpperCase()] || [String(environment).toLowerCase()];
  return !aliases.includes(match[1].toLowerCase());
}

// Status code a check reported, e.g. "Expected Value:: 200 || Actual Value:: 404" or "Failed! Error: 500 Internal Server Error".
function checkedStatus(text) {
  const compared = String(text || '').match(/Expected Value::\s*([1-5]\d\d)\s*\|\|\s*Actual Value::\s*([1-5]\d\d)\b/);
  if (compared) return compared[1] === compared[2] ? null : Number(compared[2]);
  const thrown = String(text || '').match(/\bError:\s*([45]\d\d)\s+[A-Z]/);
  return thrown ? Number(thrown[1]) : null;
}

function statusRule(status) {
  if (status === 401) return { category: 'ENVIRONMENT_ISSUE', confidence: 'medium', reason: 'The service rejected the token (401)' };
  if ([502, 503, 504].includes(status)) return { category: 'ENVIRONMENT_ISSUE', confidence: 'medium', reason: `Gateway or availability error (${status}) returned to the test`, gateway: true };
  if (status >= 500) return { category: 'PRODUCT_DEFECT', confidence: 'high', reason: `The service returned ${status} to the test` };
  if (status === 429) return { category: 'ENVIRONMENT_ISSUE', confidence: 'medium', reason: 'The gateway rate-limited the test (429 Too Many Requests)' };
  if (status === 404 || status === 409) return { category: 'TEST_DATA_ISSUE', confidence: 'medium', reason: `${status === 404 ? 'Record not found' : 'Conflict / already exists'} (${status}) returned to the test` };
  if (status >= 400) return { category: 'TO_INVESTIGATE', confidence: 'low', reason: `The service rejected the request (${status}): check the request body and recent service changes` };
  return null;
}

// Missing icons/scripts and requests cancelled by navigation never break a test on their own.
function isNoise(error) {
  return STATIC_ASSET.test(error.endpoint || '') || /ERR_ABORTED/.test(error.failure || '');
}

// Errors inside the causal window that are not known background noise; closest to the failure first.
function causalErrors(test, ambient) {
  return (test.httpErrors || []).filter((error) => {
    if (ambient && ambient.has(endpointKey(error))) return false;
    if (isNoise(error)) return false;
    if (error.msBeforeFailure === null || error.msBeforeFailure === undefined) return true;
    return error.msBeforeFailure >= -5000 && error.msBeforeFailure <= CAUSAL_WINDOW_MS;
  });
}

// API tests: the newest recorded call explains the failure only when it got a 5xx or no response at all;
// 4xx are left to the check step, since negative tests expect them.
function apiCause(test, ambient) {
  const last = (test.apiCalls || [])[0];
  if (!last || !(last.status >= 500 || last.failure)) return null;
  return causalErrors({ httpErrors: [last] }, ambient)[0] || null;
}

// byCause: the category was decided by the HTTP error (so failures group by that endpoint).
// gateway: the category was decided by a 502/503/504 or a request with no response (cluster.js groups bursts of these).
function result(category, confidence, reasons, cause = null, byCause = false, gateway = false) {
  return { category, confidence, reasons, cause, byCause, gateway };
}

// A gateway flag from the failed step or message holds only when the failure isn't a navigation cancellation
// (ERR_ABORTED, see isNoise) and neither its causal error nor its text points at another environment's URL, so none
// of them joins an outage group.
function gatewayFlag(flag, text, cause, environment) {
  if (!flag || /ERR_ABORTED/.test(text)) return false;
  // The message or failed step may name the other environment's path even when no HTTP error was recorded.
  if (crossEnvironment(text, environment)) return false;
  return !(cause && crossEnvironment(cause.endpoint, environment));
}

/**
 * @param test     failed test record from build-run-data (error, httpErrors, knownIssue, quarantine, ...)
 * @param context  { environment }
 * @param ambient  Set of "METHOD STATUS /endpoint" keys treated as background noise
 */
function classify(test, context = {}, ambient = new Set()) {
  if (test.knownIssue) {
    return result('KNOWN_ISSUE', 'high', [`Matches known issue ${test.knownIssue.id}${test.knownIssue.jira ? ` (${test.knownIssue.jira})` : ''}: ${test.knownIssue.title}`]);
  }
  if (test.quarantine) {
    return result('FLAKY', 'high', [`Quarantined (${test.quarantine.id}${test.quarantine.owner ? `, owner ${test.quarantine.owner}` : ''})`]);
  }

  const message = (test.error && test.error.message) || '';
  // Bare assertions (expect(x).toBeTruthy()) carry the real check in the failed step.
  const text = test.failedStep ? `${message}\n${test.failedStep}` : message;
  const causes = causalErrors(test, ambient);
  const cause = causes[0] || apiCause(test, ambient);
  const when = cause && cause.msBeforeFailure !== null ? ` ${Math.round(cause.msBeforeFailure / 1000)}s before the failure` : '';

  const loginRule = MESSAGE_RULES[0];
  if (loginRule.pattern.test(text)) return result(loginRule.category, loginRule.confidence, [loginRule.reason]);

  const status = statusRule(checkedStatus(text));
  if (status) return result(status.category, status.confidence, [status.reason], cause, false, gatewayFlag(status.gateway, text, cause, context.environment));

  if (cause) {
    const label = `${endpointKey(cause)}${when}`;
    if (crossEnvironment(cause.endpoint, context.environment)) {
      return result('ENVIRONMENT_ISSUE', 'high', [`Call to another environment's URL during a ${context.environment} run: ${label}`], cause, true);
    }
    if ([502, 503, 504].includes(cause.status) || cause.failure) {
      return result('ENVIRONMENT_ISSUE', 'medium', [`Gateway or network error: ${label}`], cause, true, true);
    }
    if (cause.status >= 500) {
      return result('PRODUCT_DEFECT', 'high', [`Server error from the application: ${label}`], cause, true);
    }
    if (cause.status === 404 || cause.status === 409) {
      return result('TEST_DATA_ISSUE', 'medium', [`${cause.status === 404 ? 'Record not found' : 'Conflict / already exists'}: ${label}`], cause, true);
    }
  }

  const visual = visualRule(test, message);
  if (visual) return visual;

  for (const rule of MESSAGE_RULES.slice(1)) {
    if (rule.pattern.test(text)) return result(rule.category, rule.confidence, [rule.reason], cause, false, gatewayFlag(rule.gateway, text, cause, context.environment));
  }

  // Any Playwright API (locator.click, page.waitForSelector, ...), but not expect.poll's "- Timeout …ms exceeded" call log.
  const timedOut = /TimeoutError|\b\w+\.\w+: Timeout \d+ms exceeded/i.test(message);
  const reasons = timedOut
    ? [cause ? `UI wait timed out; nearest API error: ${endpointKey(cause)}${when}` : 'UI wait timed out with no API error nearby: check the screenshot for a changed locator or slow page']
    : ['No rule matched: check the error and the last steps'];
  return result('TO_INVESTIGATE', 'low', reasons, cause);
}

module.exports = { classify, causalErrors, checkedStatus, crossEnvironment, endpointKey, isNoise, CAUSAL_WINDOW_MS, STALE_BASELINE_NIGHTS };
