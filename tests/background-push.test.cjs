/* eslint-disable @typescript-eslint/no-require-imports -- Execute the actual service worker in an isolated context. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
test('background handler keeps push event alive until notification display completes', async () => {
  let receive, finish, shown;
  const pending = new Promise(resolve => { finish = resolve; });
  runInNewContext(readFileSync('public/firebase-messaging-sw.js', 'utf8'), {
    importScripts: () => {},
    firebase: { initializeApp: () => {}, messaging: () => ({ onBackgroundMessage: fn => { receive = fn; } }) },
    self: { addEventListener: () => {}, registration: { showNotification: (title, options) => {
      shown = { title, options }; return pending;
    } } },
  });
  const result = receive({ data: { title: '리마인더', body: '24시간 전', url: '/schedule' } });
  assert.equal(result, pending);
  assert.equal(shown.title, '리마인더');
  assert.equal(shown.options.data.url, '/schedule');
  finish();
  await result;
  assert.equal(receive({ data: {} }), undefined);
});
