const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const ts = require('typescript');

// The interceptor is TypeScript that Node can't strip on its own (constructor parameter properties).
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true }
  });
  module._compile(outputText, filename);
};

const { NetworkInterceptor } = require('../../../network/network.interceptor.ts');
const { bodyText, redactApiText } = require('../../../util/api-calls.util.ts');
const { redact } = require('../lib/evidence');

// Fake token, joined here so the secrets scan doesn't flag it.
const JWT = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'abcdefghijklmnop'].join('.');
const EMAIL = 'jane.doe@example.com';

// Drives the real interceptor through one failed call and returns the entry it would write.
async function capture({ url, postData = null, status = 500, requestHeaders = {}, responseHeaders = {}, responseBody = '' }, { includeSummary = false } = {}) {
  const handlers = {};
  const context = { on: (name, fn) => { handlers[name] = fn; }, off: () => {} };
  const interceptor = new NetworkInterceptor(context, 'api-only');
  interceptor.start();
  const request = {
    url: () => url,
    method: () => 'POST',
    resourceType: () => 'fetch',
    isNavigationRequest: () => false,
    headers: () => requestHeaders,
    postData: () => postData
  };
  handlers.request(request);
  handlers.response({
    request: () => request,
    status: () => status,
    statusText: () => 'Error',
    ok: () => false,
    text: async () => responseBody,
    allHeaders: async () => responseHeaders
  });
  await interceptor.stop();
  const entries = interceptor.getEntries();
  assert.strictEqual(entries.length, 1, 'the failed call is kept');
  return includeSummary ? { entry: entries[0], summaries: interceptor.getErrorSummaries() } : entries[0];
}

test('network log masks credentials and personal data in body, query string and response', async () => {
  const entry = await capture({
    url: `https://app.test/api/items?access_token=abc123&api_key=key123&apikey=key456&subscription-key=key789&mail=jane.doe%40example.com&scenarioId=keep-me`,
    postData: JSON.stringify({ password: 'hunter2', clientSecret: 's3cret', owner: EMAIL, VITE_AG_GRID_LICENSE_KEY: 'license-value', SENTRY_DSN: 'dsn-value', scenarioId: 'keep-me' }),
    responseBody: `{"message":"denied for ${EMAIL}","token":"${JWT}","code":"E42"}`
  });
  const text = JSON.stringify(entry);
  for (const leaked of ['abc123', 'key123', 'key456', 'key789', 'hunter2', 's3cret', EMAIL, 'jane.doe%40', JWT, 'license-value', 'dsn-value']) {
    assert.ok(!text.includes(leaked), `${leaked} must not reach the log`);
  }
  assert.ok(entry.url.includes('scenarioId=keep-me'), 'ordinary query parameters stay');
  assert.strictEqual(JSON.parse(entry.postData).scenarioId, 'keep-me', 'ordinary body fields stay and the JSON still parses');
  assert.strictEqual(JSON.parse(entry.response.body).code, 'E42', 'ordinary response fields stay');
});

test('network log leaves a Sentry envelope body out but keeps the call', async () => {
  const envelope = `{"sent_at":"now"}\n{"type":"transaction"}\n{"user":{"id":"${EMAIL}"},"breadcrumbs":[{"data":{"arguments":[{"VITE_AG_GRID_LICENSE_KEY":"LICENCE-VALUE"}]}}]}`;
  const entry = await capture({ url: 'https://o1.ingest.sentry.io/api/42/envelope/?sentry_key=abc&sentry_version=7', postData: envelope, status: 429 });
  assert.strictEqual(entry.postData, `[Sentry envelope omitted, ${envelope.length} chars]`);
  assert.strictEqual(entry.response.status, 429);
});

test('only a Sentry envelope has its body left out', async () => {
  for (const url of ['https://app.test/api/mail/envelopes?x=1', 'https://app.test/api/42/envelope/', 'https://app.test/api/42/envelope/?key=1', 'https://app.test/redirect?next=/api/42/envelope/?sentry_key=abc']) {
    const entry = await capture({ url, postData: '{"subject":"ok"}' });
    assert.strictEqual(entry.postData, '{"subject":"ok"}', url);
  }
  const later = await capture({ url: 'https://sentry.test/api/42/envelope/?sentry_version=7&sentry_key=abc', postData: '{"subject":"ok"}' });
  assert.ok(later.postData.startsWith('[Sentry envelope omitted'), 'sentry_key need not be the first parameter');
});

test('a secret too long to survive the cap is still masked', async () => {
  for (const tail of ['x'.repeat(30_000), `${'x'.repeat(24_095 - '{"password":"'.length)}\\"more`]) {
    const entry = await capture({ url: 'https://app.test/api/items', postData: `{"password":"${tail}` });
    assert.strictEqual(entry.postData, '{"password":"[REDACTED]"');
  }
  const oversizedJson = await capture({
    url: 'https://app.test/api/items',
    postData: JSON.stringify({ password: 987654321, padding: 'x'.repeat(30_000) })
  });
  assert.ok(!oversizedJson.postData.includes('987654321'));
  assert.ok(oversizedJson.postData.startsWith('{"password":"[REDACTED]"'));
});

test('sensitive parameter matching preserves ordinary fields with secret-like suffixes', () => {
  const text = 'https://app.test/?processCode=PROC&pageToken=cursor&barcode=123&code=secret&token=secret';
  assert.strictEqual(
    redactApiText(text),
    'https://app.test/?processCode=PROC&pageToken=cursor&barcode=123&code=[REDACTED]&token=[REDACTED]'
  );
});

test('console and page-error text uses bounded shared redaction', () => {
  const text = bodyText(`runtime config ${EMAIL} {"VITE_AG_GRID_LICENSE_KEY":"license-value","SENTRY_DSN":"dsn-value"}`);
  assert.ok(!text.includes(EMAIL));
  assert.ok(!text.includes('license-value'));
  assert.ok(!text.includes('dsn-value'));
  assert.ok(text.includes('[REDACTED_EMAIL]'));
});

test('redacts numeric, object and escaped nested JSON secrets', async () => {
  const body = JSON.stringify({
    password: 12345,
    apiKey: { value: 'nested-secret' },
    details: JSON.stringify({ refresh_token: 'nested-token' }),
    name: 'keep-me'
  });
  const entry = await capture({ url: 'https://app.test/api/items', postData: body });
  const parsed = JSON.parse(entry.postData);
  assert.strictEqual(parsed.password, '[REDACTED]');
  assert.strictEqual(parsed.apiKey, '[REDACTED]');
  assert.strictEqual(JSON.parse(parsed.details).refresh_token, '[REDACTED]');
  assert.strictEqual(parsed.name, 'keep-me');
  assert.strictEqual(redactApiText(body), redact(body));
});

test('hyphenated API-key spellings are masked in JSON, broken JSON and URLs', async () => {
  const body = JSON.stringify({ 'api-key': 'key-a', 'x-api-key': 'key-b', 'X-Api-Key': 'key-c', name: 'keep-me' });
  const unparsable = `{"api-key":"key-d","x-api-key":"key-e","name":"keep-me"`;
  const url = 'https://app.test/api/items?api-key=key-f&x-api-key=key-g&monkey=keep-me';
  for (const fn of [redactApiText, redact]) {
    const out = [fn(body), fn(unparsable), fn(url)].join(' ');
    for (const leaked of ['key-a', 'key-b', 'key-c', 'key-d', 'key-e', 'key-f', 'key-g']) {
      assert.ok(!out.includes(leaked), `${leaked} must be masked by ${fn.name}`);
    }
    assert.ok(fn(url).includes('monkey=keep-me'), 'ordinary parameters stay');
    assert.strictEqual(JSON.parse(fn(body)).name, 'keep-me');
  }
});

test('JSON strings inside arrays are redacted, at any depth', () => {
  const body = JSON.stringify({ items: [JSON.stringify({ password: 'nested-secret', name: 'keep-me' }), 'plain text', [JSON.stringify([{ token: 'deep-secret' }])]] });
  for (const fn of [redactApiText, redact]) {
    const out = fn(body);
    assert.ok(!out.includes('nested-secret') && !out.includes('deep-secret'), fn.name);
    const { items } = JSON.parse(out);
    assert.strictEqual(JSON.parse(items[0]).name, 'keep-me');
    assert.strictEqual(items[1], 'plain text');
  }
  const topLevel = JSON.stringify([JSON.stringify({ password: 'top-secret' })]);
  assert.ok(!redactApiText(topLevel).includes('top-secret'));
  assert.ok(!redact(topLevel).includes('top-secret'));
});

test('email redaction completes promptly on long unbroken text', () => {
  const longText = 'x'.repeat(200_000);
  const startedAt = performance.now();
  redactApiText(longText);
  assert.ok(performance.now() - startedAt < 5000, 'redaction should not stall on long unbroken text');
});

test('network log uses the shared sensitive header list and cleans other header values', async () => {
  const entry = await capture({
    url: 'https://app.test/api/items',
    requestHeaders: { Authorization: 'Bearer abc', 'Ocp-Apim-Subscription-Key': 'sub-key', referer: 'https://app.test/?access_token=abc123', accept: 'application/json' },
    responseHeaders: { 'set-cookie': 'SESSION=abc', 'x-correlation-id': 'keep-me' }
  });
  assert.strictEqual(entry.headers.Authorization, '[REDACTED]');
  assert.strictEqual(entry.headers['Ocp-Apim-Subscription-Key'], '[REDACTED]');
  assert.strictEqual(entry.headers.referer, 'https://app.test/?access_token=[REDACTED]');
  assert.strictEqual(entry.headers.accept, 'application/json');
  assert.strictEqual(entry.response.headers['set-cookie'], '[REDACTED]');
  assert.strictEqual(entry.response.headers['x-correlation-id'], 'keep-me', 'request ids stay usable for triage');
});

test('network log caps long bodies and keeps absent bodies as they were', async () => {
  const long = await capture({ url: 'https://app.test/api/items', postData: 'some words '.repeat(5000) });
  assert.ok(long.postData.length <= 20_000 + '…[truncated]'.length);
  assert.ok(long.postData.endsWith('…[truncated]'));
  const none = await capture({ url: 'https://app.test/api/items' });
  assert.strictEqual(none.postData, null);
});

test('summary-only capture redacts paths without serializing request bodies', async () => {
  const result = await capture({
    url: `https://app.test/api/users/${EMAIL}?access_token=secret`,
    postData: '{"password":"body-secret"}'
  }, { includeSummary: true });
  const summaryText = JSON.stringify(result.summaries);
  assert.ok(!summaryText.includes(EMAIL));
  assert.ok(!summaryText.includes('secret'));
  assert.ok(summaryText.includes('[REDACTED_EMAIL]'));
});

test('the interceptor and the triage evidence redact alike', () => {
  const sample = `Bearer abc.def {"password":"p","api_key":"k","name":"ok"} ${EMAIL} ${JWT} ?code=1&token=2&x=3 jane%40example.com`;
  assert.strictEqual(redactApiText(sample), redact(sample));
});
