/* eslint-disable @typescript-eslint/no-require-imports -- Compile the actual TypeScript helper for Node tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
const code = ts.transpileModule(readFileSync('src/lib/calendarEvents.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('exports', 'require', code)(mod.exports, require);
const { scheduleRange, occursOn, weekSegments } = mod.exports;
const event = (id, at, endAt, source = 'PERSONAL') => ({ type: source, source, noticeId: id, title: '같은 제목', at, endAt });
const days = Array.from({ length: 7 }, (_, i) => `2026-11-${15 + i}`);

test('midnight end is exclusive in Korea time and legacy point dates still work', () => {
  const e = event(1, '2026-11-15T01:00:00Z', '2026-11-17T15:00:00Z');
  assert.deepEqual(scheduleRange(e), { from: '2026-11-15', to: '2026-11-17' });
  assert.equal(occursOn(e, '2026-11-18'), false);
  assert.equal(occursOn(e, '2026-11-16'), true);
  assert.deepEqual(scheduleRange(event(2, '2026-11-14T15:00:00Z')), { from: '2026-11-15', to: '2026-11-15' });
});
test('one period spans consecutive columns and clips across week boundaries', () => {
  const [s] = weekSegments([event(1, '2026-11-14T00:00:00+09:00', '2026-11-24T00:00:00+09:00')], days);
  assert.deepEqual({ start: s.start, span: s.span, before: s.before, after: s.after }, { start: 0, span: 7, before: true, after: true });
});
test('overlapping identities use different rows, even with identical titles', () => {
  const e = event(1, '2026-11-15T09:00:00+09:00', '2026-11-18T10:00:00+09:00');
  const other = event(2, '2026-11-16T09:00:00+09:00', '2026-11-19T10:00:00+09:00');
  const s = weekSegments([e, other, e], days);
  assert.equal(s.length, 2);
  assert.notEqual(s[0].lane, s[1].lane);
});
test('non-overlapping bars share a row and a month edge clips empty cells', () => {
  const e = event(1, '2026-11-15T09:00:00+09:00');
  const other = event(2, '2026-11-16T09:00:00+09:00');
  assert.deepEqual(weekSegments([e, other], days).map(s => s.lane), [0, 0]);
  const [s] = weekSegments([event(3, '2026-10-29T00:00:00+09:00', '2026-11-03T00:00:00+09:00')], [null, null, '2026-11-01', '2026-11-02', null, null, null]);
  assert.equal(s.start, 2); assert.equal(s.span, 2); assert.equal(s.before, true);
});
