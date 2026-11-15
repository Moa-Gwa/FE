/* eslint-disable @typescript-eslint/no-require-imports -- Render the actual TSX with API state mocks. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
function render(state, source = 'PERSONAL', kind = 'DEADLINE') {
  let changed;
  const mocks = {
    '@tanstack/react-query': { useQuery: () => ({ data: state }), useQueryClient: () => ({}),
      useMutation: () => ({ isPending: false, mutate: value => { changed = value; } }) },
    '@/components/InlineError': () => null, '@/lib/api': {},
  };
  const output = ts.transpileModule(readFileSync('src/components/ReminderToggle.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => mocks[name] ?? require(name), loaded, loaded.exports);
  const tree = loaded.exports.default({ source, id: 1, kind });
  return { html: renderToStaticMarkup(tree), toggle: () => tree.props.children[0].props.children[1].props.onClick(), changed: () => changed };
}
test('reminder switch reflects saved state and toggles it', () => {
  for (const enabled of [true, false]) {
    const view = render({ enabled, tooLate: false });
    assert.match(view.html, new RegExp(`aria-checked="${enabled}"`));
    view.toggle();
    assert.equal(view.changed(), !enabled);
  }
});
test('late reminder and crawled-date verification guidance are shown', () => {
  const view = render({ enabled: true, tooLate: true }, 'CRAWLED');
  assert.match(view.html, /24시간 전 알림 시점이 지났어요/);
  assert.match(view.html, /자동 추출된 마감일/);
  assert.match(view.html, /마감/);
});
test('reminder controls are disabled until settings load', () => {
  assert.match(render(undefined).html, /disabled=""/);
});

test('event start uses a separate one-hour label and late guidance', () => {
  const view = render({ enabled: true, tooLate: true }, 'CRAWLED', 'EVENT_START');
  assert.match(view.html, /행사 시작.*1시간 전 리마인더/);
  assert.match(view.html, /1시간 전 알림 시점이 지났어요/);
  assert.match(view.html, /자동 추출된 행사 시작일/);
  assert.doesNotMatch(view.html, /24시간 전/);
});
