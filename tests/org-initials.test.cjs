/* eslint-disable @typescript-eslint/no-require-imports -- Compile the actual TypeScript helpers for Node tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

function load(file, imports = {}) {
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => imports[name] ?? require(name), loaded, loaded.exports);
  return loaded.exports;
}
const initials = load('src/lib/orgInitials.ts');
const { orgInitials } = load('src/lib/format.ts', { '@/lib/orgInitials': initials });

test('department councils use the same initials as their departments', () => {
  for (const [name, expected] of Object.entries(initials.ORG_INITIALS)) {
    if (name.includes('학생회') || name === '운영자' || name === '가톨릭대학교 공지사항') continue;
    assert.equal(orgInitials(`${name} 학생회`), expected, name);
  }
});

test('council names that differ from their departments still use department initials', () => {
  for (const [name, expected] of [
    ['영어영문학부 학생회', '영문'], ['일어일본문화학과 학생회', '일문'],
    ['중국언어문화학과 학생회', '중문'], ['프랑스어문화학과 학생회', '프문'],
    ['경영학과 학생회', '경영'],
  ]) assert.equal(orgInitials(name), expected);
});

test('requested initials are applied to departments, councils and the operator', () => {
  for (const [name, expected] of [
    ['에너지환경공학과', '에환공'], ['바이오로직스공학부', '바로공'], ['자유전공학부', '자전'],
  ]) {
    assert.equal(orgInitials(name), expected);
    assert.equal(orgInitials(`${name} 학생회`), expected);
  }
  assert.equal(orgInitials('운영자'), '운영자');
  assert.equal(orgInitials(' AI의공학과 학생회 '), '의공');
});

test('other organizations retain their explicit initials and fallback rules', () => {
  for (const [name, expected] of [
    ['가톨릭대학교 공지사항', '가대'], ['총학생회 라온', '총학'],
    ['공과대학 학생회', '공과'], ['미등록 단체', '미등'], ['ABC club', 'ABC'], ['', ''],
  ]) assert.equal(orgInitials(name), expected);
});
