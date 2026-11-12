/* eslint-disable @typescript-eslint/no-require-imports -- The Node TSX test loader requires CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

// Render the actual TSX components with existing dependencies; no browser or API calls needed.
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => {
  const source = readFileSync(filename, 'utf8').replace(/(["'])@\//g, `$1${path.resolve(__dirname, '../src')}/`);
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  module._compile(output.outputText, filename);
};
const Attachments = require('../src/components/AttachmentList.tsx').default;
const NoticeCard = require('../src/components/NoticeCard.tsx').default;
const render = component => renderToStaticMarkup(React.createElement(QueryClientProvider, { client: new QueryClient() }, component));
const item = { id: 1, source: 'CRAWLED', title: '학교 공지', organization: { name: '가톨릭대학교', type: 'UNIVERSITY' }, publishedAt: '2026-11-01T00:00:00Z', category: null, status: null, deadlineAt: null };

test('school thumbnails are rendered in both regular and compact feed cards', () => {
  for (const compact of [false, true]) {
    const html = render(React.createElement(NoticeCard, { item: { ...item, thumbnail: 'https://school.example/poster.jpg' }, compact }));
    assert.match(html, /class="thumb"/);
    assert.match(html, /https:\/\/school.example\/poster.jpg/);
    assert.match(html, /href="\/notices\/crawled\/1"/);
  }
});
test('a school notice without an image has no thumbnail placeholder', () => {
  const html = render(React.createElement(NoticeCard, { item: { ...item, thumbnail: null } }));
  assert.doesNotMatch(html, /class="thumb"|nc-thumbnail/);
});
test('attachments show the original name, extension and a safe link opening in a new window', () => {
  const html = render(React.createElement(Attachments, { attachments: [{ fileName: '신청서.hwpx', url: 'https://school.example/download.do?file=1' }] }));
  assert.match(html, /신청서.hwpx/);
  assert.match(html, /HWPX/);
  assert.match(html, /href="https:\/\/school.example\/download.do\?file=1"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});
test('absent attachments and unsafe download URLs produce no attachment section', () => {
  for (const attachments of [undefined, null, [], [{ fileName: 'bad.html', url: 'javascript:alert(1)' }]]) {
    assert.equal(render(React.createElement(Attachments, { attachments })), '');
  }
});
