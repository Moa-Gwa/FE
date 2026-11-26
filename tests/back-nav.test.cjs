/* eslint-disable @typescript-eslint/no-require-imports -- Test the actual TS module with a fake history. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

function load() {
  const source = ts.transpileModule(readFileSync(`${__dirname}/../src/lib/backNav.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)(require, loaded, loaded.exports);
  return loaded.exports;
}

// 브라우저 history 흉내. entries[i] = { href, state }
function browser(href) {
  const entries = [{ href, state: { __NA: true } }];
  let i = 0;
  globalThis.location = { get href() { return entries[i].href; } };
  globalThis.history = {
    get state() { return entries[i].state; },
    replaceState(state) { entries[i].state = state; },
  };
  return {
    push(next) { entries.splice(i + 1); entries.push({ href: next, state: { __NA: true } }); i++; },
    pop() { i--; },
  };
}

function router() {
  const calls = [];
  return { calls, back: () => calls.push('back'), replace: href => calls.push(href) };
}

test('entry page falls back, in-app page goes back, returning to entry falls back again', () => {
  const { trackHistory, goBack } = load();
  const nav = browser('/notices/crawled/1');
  trackHistory();
  let r = router();
  goBack(r, '/home');
  assert.deepEqual(r.calls, ['/home']);

  nav.push('/explore');
  trackHistory();
  r = router();
  goBack(r);
  assert.deepEqual(r.calls, ['back']);

  nav.pop(); // 브라우저 뒤로로 처음 화면에 돌아옴
  trackHistory();
  r = router();
  goBack(r, '/home');
  assert.deepEqual(r.calls, ['/home']);
});
