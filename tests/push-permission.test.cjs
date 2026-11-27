/* eslint-disable @typescript-eslint/no-require-imports -- Test actual TS modules with browser/Firebase mocks. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, mocks) {
  const source = ts.transpileModule(readFileSync(`${__dirname}/../src/${file}`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => mocks[name] ?? require(name), loaded, loaded.exports);
  return loaded.exports;
}

function hookHarness(supported) {
  const effects = [], values = [];
  const events = [];
  const hook = load('hooks/useFcmToken.ts', {
    react: {
      useState: value => { const index = values.push(value) - 1; return [value, next => { values[index] = next; }]; },
      useRef: value => ({ current: value }), useCallback: fn => fn, useEffect: fn => effects.push(fn),
    },
    '@/lib/firebase': { isFirebaseConfigured: true, getFirebaseApp: () => ({}), VAPID_KEY: 'key' },
    'firebase/messaging': {
      isSupported: async () => { events.push('support'); return supported; },
      getMessaging: () => ({}), getToken: async () => 'new-token',
    },
  }).useFcmToken();
  return { hook, effects, values, events };
}

test('support is checked before enabling, but permission is requested synchronously on click', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    userAgent: 'Chrome', serviceWorker: { register: async () => ({}) },
  } });
  let requested = 0;
  globalThis.Notification = { permission: 'default', requestPermission: () => { requested++; return Promise.resolve('granted'); } };
  for (const supported of [false, true]) {
    const h = hookHarness(supported);
    assert.equal(h.hook.status, 'checking');
    await h.hook.enable();
    assert.equal(requested, 0);
    h.effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.values[0], supported ? 'idle' : 'unsupported');
    const promise = h.hook.enable();
    assert.equal(requested, supported ? 1 : 0);
    await promise;
    assert.equal(h.events.length, 1);
  }
});

function row(status, pushOverrides = {}) {
  const effects = [];
  const component = load('components/PushToggleRow.tsx', {
    react: { ...React, useEffect: fn => effects.push(fn), useState: value => [value, () => {}], useSyncExternalStore: () => 'stored-token' },
    '@/components/InlineError': () => null,
    '@/components/Providers': { useToast: () => () => {} },
    '@/hooks/useFcmToken': { useFcmToken: () => ({ status, token: null, error: null }) },
    '@/lib/api': { ApiError },
    '@/lib/push': pushOverrides,
  }).default;
  return component();
}
class ApiError extends Error { constructor(status) { super('test failure'); this.status = status; } }

test('stored tokens do not turn on controls in unavailable or unchecked environments', () => {
  for (const status of ['checking', 'ios-install', 'unsupported', 'no-config']) {
    const html = renderToStaticMarkup(row(status));
    assert.match(html, /aria-checked="false"/);
    assert.match(html, /disabled=""/);
    assert.doesNotMatch(html, /테스트 알림<\/span>/);
  }
  const html = renderToStaticMarkup(row('ready'));
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /테스트 알림<\/span>/);
});

test('404 only forgets registration; 410 discards the expired SDK token', async () => {
  for (const status of [404, 410, 502]) {
    const calls = [];
    const tree = row('ready', {
      sendTestPush: async () => { throw new ApiError(status); },
      forgetPushToken: () => calls.push('forget'),
      discardExpiredPushToken: async () => calls.push('discard'),
    });
    await tree.props.children[3].props.children[1].props.onClick();
    assert.deepEqual(calls, status === 404 ? ['forget'] : status === 410 ? ['discard'] : []);
  }
});

test('expired-token cleanup deletes Firebase cache before clearing local registration', async () => {
  const calls = [];
  // 등록 토큰과 마지막 재등록 시각을 함께 지움
  globalThis.localStorage = { removeItem: key => { if (key === 'moagwa.fcmToken') calls.push('forget'); } };
  globalThis.window = { dispatchEvent: () => {} };
  let fail = false;
  const push = load('lib/push.ts', {
    'firebase/messaging': { getMessaging: () => ({}), deleteToken: async () => { calls.push('delete'); if (fail) throw new Error('offline'); } },
    '@/lib/api': {}, '@/lib/firebase': { getFirebaseApp: () => ({}) },
  });
  await push.discardExpiredPushToken();
  assert.deepEqual(calls, ['delete', 'forget']);
  calls.length = 0;
  fail = true;
  await assert.rejects(push.discardExpiredPushToken());
  assert.deepEqual(calls, ['delete']);
});

test('push token is re-registered at most once a day and only when push is on', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  globalThis.window = { dispatchEvent: () => {} };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: { register: async () => ({}) } } });
  const puts = [];
  const push = load('lib/push.ts', {
    'firebase/messaging': { getMessaging: () => ({}), getToken: async () => 'fresh-token' },
    '@/lib/api': { api: async (path, init) => { puts.push([path, init.body.token]); } },
    '@/lib/firebase': { getFirebaseApp: () => ({}), VAPID_KEY: 'key' },
  });

  await push.refreshPushToken();
  assert.deepEqual(puts, []); // 푸시를 켜지 않은 기기는 건너뜀

  store.set('moagwa.fcmToken', 'old-token');
  await push.refreshPushToken();
  await push.refreshPushToken();
  assert.deepEqual(puts, [['/me/push-tokens', 'fresh-token']]);
  assert.equal(store.get('moagwa.fcmToken'), 'fresh-token');

  store.set('moagwa.fcmTokenSyncedAt', String(Date.now() - 25 * 60 * 60 * 1000));
  await push.refreshPushToken();
  assert.equal(puts.length, 2);
});
