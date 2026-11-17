import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSse } from '../src/lib/sse.ts';

test('splits complete events and keeps an unfinished chunk for the next read', () => {
  const first = parseSse('event: token\ndata: {"text":"휴학은 "}\n\nevent: token\ndata: {"te');
  assert.deepEqual(first.events, [{ event: 'token', data: { text: '휴학은 ' } }]);
  const second = parseSse(first.rest + 'xt":"Trinity에서"}\n\n');
  assert.deepEqual(second.events, [{ event: 'token', data: { text: 'Trinity에서' } }]);
  assert.equal(second.rest, '');
});

test('reads CRLF line endings and skips broken or empty events', () => {
  const { events } = parseSse('event: done\r\ndata: {"grounded":true}\r\n\r\nevent: token\ndata: {broken\n\n: ping\n\n');
  assert.deepEqual(events, [{ event: 'done', data: { grounded: true } }]);
});
