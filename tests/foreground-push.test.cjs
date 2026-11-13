/* eslint-disable @typescript-eslint/no-require-imports -- Run the real hook with browser and Firebase mocks. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { readFileSync } = require('node:fs');
function setup(enabled, token = 'registered') {
  let effect, receiver, removed = false;
  const shown = [];
  const mocks = {
    react: { useEffect: fn => { effect = fn; }, useSyncExternalStore: () => token },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    '@/lib/firebase': { isFirebaseConfigured: true, getFirebaseApp: () => ({}) },
    '@/lib/push': {},
    'firebase/messaging': { isSupported: async () => true, getMessaging: () => ({}),
      onMessage: (_messaging, fn) => { receiver = fn; return () => { removed = true; }; } },
  };
  const output = ts.transpileModule(readFileSync('src/hooks/useForegroundPush.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'Notification', 'navigator', output)(
    name => mocks[name] ?? require(name), loaded, loaded.exports,
    { permission: 'granted' }, { serviceWorker: { getRegistration: async () => ({ showNotification: async (...args) => shown.push(args) }) } });
  loaded.exports.useForegroundPush(enabled);
  const cleanup = effect();
  return { receiver: () => receiver, shown, cleanup, removed: () => removed };
}
test('foreground message is displayed with its destination and listener cleans up', async () => {
  const h = setup(true);
  await new Promise(resolve => setImmediate(resolve));
  await h.receiver()({ data: { title: '일정 리마인더', body: '24시간 전', url: '/schedule' } });
  assert.equal(h.shown[0][0], '일정 리마인더');
  assert.equal(h.shown[0][1].data.url, '/schedule');
  h.cleanup();
  assert.equal(h.removed(), true);
});
test('signed-out users and devices without push registration do not subscribe', async () => {
  for (const h of [setup(false), setup(true, null)]) {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.receiver(), undefined);
  }
});
