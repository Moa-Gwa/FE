import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachmentUrl, fileExtension } from '../src/lib/attachments.ts';

test('keeps the original download URL including its query parameters', () => {
  const url = 'https://school.example/download.do?file=123&name=notice.pdf';
  assert.equal(attachmentUrl(url), url);
  assert.equal(attachmentUrl('http://school.example/notice.hwp'), 'http://school.example/notice.hwp');
});

test('rejects executable, relative and credential-bearing download URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test', '/download/1', '//evil.example/file', 'https://user:secret@school.example/file']) {
    assert.equal(attachmentUrl(url), null);
  }
});

test('shows file extensions and safely falls back for files without an extension', () => {
  for (const [name, ext] of [['안내문.pdf', 'PDF'], ['신청서.hwpx', 'HWPX'], ['자료.HWP', 'HWP'], ['명단.xlsx', 'XLSX'], ['발표.pptx', 'PPTX'], ['첨부.zip', 'ZIP'], ['파일', 'FILE'], ['file.', 'FILE']]) {
    assert.equal(fileExtension(name), ext);
  }
});
