import { test, expect, type Page } from '@playwright/test';

const urls = ['/uploads/viewer-a.png', '/uploads/viewer-b.png'];
async function setup(page: Page, layout = 'CAROUSEL', legacy = false, admin = false, single = false) {
  await page.addInitScript((admin) => localStorage.setItem('moagwa-session', JSON.stringify(admin
    ? { role: 'ADMIN', name: '관리자', operator: false, organization: { id: 1, name: '학생회', type: 'STUDENT_GOVERNMENT' } }
    : { role: 'STUDENT', name: '학생', onboarded: true })), admin);
  const selectedUrls = single ? urls.slice(0, 1) : urls;
  const blocks = [{ type: 'TEXT', text: '본문' }, { type: 'IMAGES', layout, images: selectedUrls, captions: single ? ['첫 사진 설명'] : ['첫 사진 설명', '둘째 사진 설명'] }];
  const notice = { id: 1, source: 'MANUAL', organization: { id: 1, name: '학생회', type: 'STUDENT_GOVERNMENT' },
    title: '사진 확대 공지', description: '본문', contentHtml: layout === 'HTML' ? '<p>학교 공지 본문</p><a href="https://school.example/original"><img src="/uploads/viewer-a.png" alt="학교 사진 하나"></a><img src="/uploads/viewer-b.png" alt="학교 사진 둘"><a href="https://school.example/file.pdf">첨부파일</a>' : null, blocks: legacy || layout === 'HTML' ? null : blocks,
    categories: [], categoryIds: [1], categoryCodes: ['EVENT'], imageUrls: selectedUrls, images: layout === 'HTML' ? [] : selectedUrls, status: 'DRAFT', urgent: false,
    publishedAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', createdAt: '2026-11-01T00:00:00Z',
    eventStartAt: null, eventEndAt: null, deadlineAt: null, publishAt: null, location: null, externalLink: null, bookmarked: false, viewCount: 1, bookmarkCount: 0 };
  await page.route('**/uploads/viewer-*.png', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="#f4c7b9"/><text x="120" y="200" font-size="64">Notice photo</text></svg>' }));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/categories') return route.fulfill({ json: [{ id: 1, code: 'EVENT', name: '행사' }] });
    if (path === '/api/me/notifications') return route.fulfill({ json: { unreadCount: 0, items: [] } });
    if (path === '/api/admin/notices/1' || path === '/api/notices/1' || path === '/api/crawled-notices/1') return route.fulfill({ json: notice });
    if (path.endsWith('/view')) return route.fulfill({ status: 204 });
    if (path === '/api/admin/notices') return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: {} });
  });
}

test('slideshow opens full screen, changes images, zooms, resets and closes with Escape', async ({ page }) => {
  await setup(page);
  await page.goto('/notices/manual/1');
  const opener = page.getByRole('button', { name: '사진 1 크게 보기', exact: true });
  await opener.click();
  const viewer = page.getByRole('dialog', { name: '사진 전체 화면' });
  await expect(viewer).toBeVisible();
  const rect = await viewer.boundingBox();
  expect(rect?.width).toBe(1280); expect(rect?.height).toBe(900);
  await viewer.getByRole('button', { name: '다음 사진', exact: true }).click();
  await expect(viewer.getByText('둘째 사진 설명', { exact: true })).toBeVisible();
  await viewer.getByRole('button', { name: '확대', exact: true }).click();
  await expect(viewer.getByRole('button', { name: '확대 초기화' })).toHaveText('150%');
  const stage = viewer.locator('.image-lightbox-stage');
  const before = await stage.evaluate(el => el.scrollLeft);
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40); await page.mouse.up();
  await expect.poll(() => stage.evaluate(el => el.scrollLeft)).toBeLessThan(before);
  await page.keyboard.press('ArrowLeft');
  await expect(viewer.getByRole('button', { name: '확대 초기화' })).toHaveText('100%');
  await expect(viewer.getByText('첫 사진 설명', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('stack opens the tapped image, displays its caption and closes by button', async ({ page }) => {
  await setup(page, 'STACK'); await page.goto('/notices/manual/1');
  await page.getByRole('button', { name: '사진 2 크게 보기' }).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer.getByText('2 / 2', { exact: true })).toBeVisible();
  await expect(viewer.getByText('둘째 사진 설명', { exact: true })).toBeVisible();
  await viewer.getByRole('button', { name: '사진 뷰어 닫기' }).click();
  await expect(viewer).toHaveCount(0);
});

test('legacy notices without blocks or captions can still open the viewer', async ({ page }) => {
  await setup(page, 'CAROUSEL', true); await page.goto('/notices/manual/1');
  await page.getByRole('button', { name: '사진 1 크게 보기' }).click();
  await expect(page.getByRole('dialog').getByRole('img', { name: '사진 1', exact: true })).toBeVisible();
});

test('editing, reordering and removing photos keeps the matching caption in the saved request', async ({ page }) => {
  await setup(page, 'CAROUSEL', false, true); await page.goto('/admin/notices/1/edit');
  await expect(page.getByLabel('사진 1 설명 (선택)', { exact: true })).toHaveValue('첫 사진 설명');
  await page.getByRole('button', { name: '앞으로', exact: true }).nth(1).click();
  await expect(page.getByLabel('사진 1 설명 (선택)', { exact: true })).toHaveValue('둘째 사진 설명');
  await page.getByLabel('사진 2 설명 (선택)', { exact: true }).fill('수정한 첫 사진 설명');
  await page.getByRole('button', { name: '이미지 삭제', exact: true }).first().click();
  const request = page.waitForRequest(r => r.method() === 'PUT' && new URL(r.url()).pathname === '/api/admin/notices/1');
  await page.getByRole('button', { name: '임시저장', exact: true }).click();
  const saved = (await request).postDataJSON();
  expect(saved.blocks[1].images).toEqual([urls[0]]);
  expect(saved.blocks[1].captions).toEqual(['수정한 첫 사진 설명']);
});

test('mobile viewer supports swiping and pinching without moving the page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await setup(page); await page.goto('http://localhost:3100/notices/manual/1');
  await page.getByRole('button', { name: '사진 1 크게 보기' }).tap();
  const viewer = page.getByRole('dialog'); const stage = viewer.locator('.image-lightbox-stage');
  const rect = (await stage.boundingBox())!; const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + 80, y, id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 80, y, id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(viewer.getByText('2 / 2', { exact: true })).toBeVisible();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 30, y, id: 0 }, { x: x + 30, y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 90, y, id: 0 }, { x: x + 90, y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(viewer.getByRole('button', { name: '확대 초기화' })).toHaveText('300%');
  await page.screenshot({ path: 'test-results/mobile-image-viewer.png' });
  await context.close();
});


test('a failed image shows a recoverable message and the next image still opens', async ({ page }) => {
  await setup(page);
  await page.route('**/uploads/viewer-a.png', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/notices/manual/1');
  await page.getByRole('button', { name: '사진 1 크게 보기' }).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer.getByText('이미지를 불러올 수 없습니다. 다른 사진을 선택해 주세요.')).toBeVisible();
  await viewer.getByRole('button', { name: '다음 사진', exact: true }).click();
  await expect(viewer.getByRole('img', { name: '둘째 사진 설명' })).toBeVisible();
});


test('a single photo expands without unnecessary navigation controls', async ({ page }) => {
  await setup(page, 'STACK', false, false, true); await page.goto('/notices/manual/1');
  await page.getByRole('button', { name: '사진 1 크게 보기' }).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer.getByText('1 / 1', { exact: true })).toBeVisible();
  await expect(viewer.getByRole('button', { name: '다음 사진', exact: true })).toHaveCount(0);
  await viewer.getByRole('button', { name: '확대', exact: true }).click();
  await page.keyboard.press('ArrowLeft');
  await expect(viewer.getByRole('button', { name: '확대 초기화' })).toHaveText('150%');
});


test('desktop school HTML photos open on click and keyboard, while attachment links keep their destination', async ({ page }) => {
  await setup(page, 'HTML'); await page.goto('/notices/crawled/1');
  await page.getByRole('button', { name: '사진 1 크게 보기' }).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer.getByRole('img', { name: '학교 사진 하나' })).toBeVisible();
  await expect(page).toHaveURL(/notices\/crawled\/1/);
  await viewer.getByRole('button', { name: '확대', exact: true }).click();
  await expect(viewer.getByRole('button', { name: '확대 초기화' })).toHaveText('150%');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '사진 1 크게 보기' })).toBeFocused();
  await page.getByRole('button', { name: '사진 2 크게 보기' }).focus();
  await page.keyboard.press('Enter');
  await expect(viewer.getByRole('img', { name: '학교 사진 둘' })).toBeVisible();
  await viewer.getByRole('button', { name: '사진 뷰어 닫기' }).click();
  await expect(page.getByRole('link', { name: '첨부파일', exact: true })).toHaveAttribute('href', 'https://school.example/file.pdf');
});
