/* eslint-disable @typescript-eslint/no-require-imports -- Load the API module with a mocked session store. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { readFileSync } = require('node:fs');
function setup(fetcher) {
  let cleared = false;
  const source = ts.transpileModule(readFileSync('src/lib/api.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const result = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', 'navigator', source)(() => ({
    getSession: () => ({}), setSession: () => { cleared = true; },
  }), result, result.exports, fetcher, undefined);
  return { ...result.exports, cleared: () => cleared };
}
const response = status => ({ status, ok: status < 400, json: async () => ({ value: 'ok' }) });
test('concurrent expired requests share refresh and retry their original bodies', async () => {
  let refreshed = false, refreshes = 0;
  const bodies = [];
  const client = setup(async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise(resolve => setImmediate(resolve));
      refreshed = true;
      return response(204);
    }
    bodies.push(options.body);
    return response(refreshed ? 200 : 401);
  });
  const results = await Promise.all([1, 2].map(n => client.api('/me/profile', { method: 'PUT', body: { n } })));
  assert.equal(refreshes, 1);
  assert.equal(results.length, 2);
  assert.deepEqual(bodies.sort(), ['{"n":1}', '{"n":1}', '{"n":2}', '{"n":2}']);
  assert.equal(client.cleared(), false);
});
test('expired refresh clears the local session, transient errors preserve it', async () => {
  for (const status of [401, 503]) {
    const client = setup(async url => response(url.endsWith('/auth/refresh') ? status : 401));
    await assert.rejects(client.api('/me/profile'));
    assert.equal(client.cleared(), status === 401);
  }
});
test('login failures do not attempt refresh or clear an existing session', async () => {
  let calls = 0;
  const client = setup(async () => { calls++; return response(401); });
  await assert.rejects(client.api('/admin/auth/login', { method: 'POST' }));
  assert.equal(calls, 1);
  assert.equal(client.cleared(), false);
});
