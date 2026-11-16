import { test, expect } from '@playwright/test';
import { adminApi, createNotice, loginAdmin, loginStudent, seed } from './support';

// 사진 두 장(viewer-a, viewer-b)은 준비 단계에서 실제 BE에 업로드한 파일
const notice = (kind: keyof ReturnType<typeof seed>['notices']) => `/notices/manual/${seed().notices[kind]}`;

test('slideshow opens full screen, changes images, zooms, resets and closes with Escape', async ({ page }) => {
  await loginStudent(page);
  await page.goto(notice('carousel'));
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
  await loginStudent(page); await page.goto(notice('stack'));
  await page.getByRole('button', { name: '사진 2 크게 보기' }).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer.getByText('2 / 2', { exact: true })).toBeVisible();
  await expect(viewer.getByText('둘째 사진 설명', { exact: true })).toBeVisible();
  await viewer.getByRole('button', { name: '사진 뷰어 닫기' }).click();
  await expect(viewer).toHaveCount(0);
});

test('legacy notices without blocks or captions can still open the viewer', async ({ page }) => {
  await loginStudent(page); await page.goto(notice('legacy'));
  await page.getByRole('button', { name: '사진 1 크게 보기' }).click();
  await expect(page.getByRole('dialog').getByRole('img', { name: '사진 1', exact: true })).toBeVisible();
});

test('editing, reordering and removing photos keeps the matching caption in the saved request', async ({ page }) => {
  const admin = await adminApi();
  const draft = await createNotice(admin, { title: '사진 설명 편집', publishMode: 'DRAFT', blocks: [{ type: 'TEXT', text: '본문' }, { type: 'IMAGES', layout: 'CAROUSEL', images: seed().images, captions: ['첫 사진 설명', '둘째 사진 설명'] }] });
  await admin.dispose();
  await loginAdmin(page); await page.goto(`/admin/notices/${draft.id}/edit`);
  await expect(page.getByLabel('사진 1 설명 (선택)', { exact: true })).toHaveValue('첫 사진 설명');
  await page.getByRole('button', { name: '앞으로', exact: true }).nth(1).click();
  await expect(page.getByLabel('사진 1 설명 (선택)', { exact: true })).toHaveValue('둘째 사진 설명');
  await page.getByLabel('사진 2 설명 (선택)', { exact: true }).fill('수정한 첫 사진 설명');
  await page.getByRole('button', { name: '이미지 삭제', exact: true }).first().click();
  const request = page.waitForRequest(r => r.method() === 'PUT' && new URL(r.url()).pathname === `/api/admin/notices/${draft.id}`);
  await page.getByRole('button', { name: '임시저장', exact: true }).click();
  const saved = (await request).postDataJSON();
  expect(saved.blocks[1].images).toEqual([seed().images[0]]);
  expect(saved.blocks[1].captions).toEqual(['수정한 첫 사진 설명']);
});

test('mobile viewer supports swiping and pinching without moving the page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await loginStudent(page); await page.goto(`http://localhost:3100${notice('carousel')}`);
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
  await loginStudent(page);
  // 깨진 이미지는 실제 BE로 재현할 수 없어 첫 사진 요청만 404로 바꿈
  await page.route(`**${seed().images[0]}`, route => route.fulfill({ status: 404, body: '' }));
  await page.goto(notice('carousel'));
  await page.getByRole('button', { name: '사진 1 크게 보기' }).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer.getByText('이미지를 불러올 수 없습니다. 다른 사진을 선택해 주세요.')).toBeVisible();
  await viewer.getByRole('button', { name: '다음 사진', exact: true }).click();
  await expect(viewer.getByRole('img', { name: '둘째 사진 설명' })).toBeVisible();
});


test('a single photo expands without unnecessary navigation controls', async ({ page }) => {
  await loginStudent(page); await page.goto(notice('single'));
  await page.getByRole('button', { name: '사진 1 크게 보기' }).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer.getByText('1 / 1', { exact: true })).toBeVisible();
  await expect(viewer.getByRole('button', { name: '다음 사진', exact: true })).toHaveCount(0);
  await viewer.getByRole('button', { name: '확대', exact: true }).click();
  await page.keyboard.press('ArrowLeft');
  await expect(viewer.getByRole('button', { name: '확대 초기화' })).toHaveText('150%');
});


test('desktop school HTML photos open on click and keyboard, while attachment links keep their destination', async ({ page }) => {
  await loginStudent(page); await page.goto(`/notices/crawled/${seed().crawled}`);
  await page.getByRole('button', { name: '사진 1 크게 보기' }).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer.getByRole('img', { name: '학교 사진 하나' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`notices/crawled/${seed().crawled}`));
  await viewer.getByRole('button', { name: '확대', exact: true }).click();
  await expect(viewer.getByRole('button', { name: '확대 초기화' })).toHaveText('150%');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '사진 1 크게 보기' })).toBeFocused();
  await page.getByRole('button', { name: '사진 2 크게 보기' }).focus();
  await page.keyboard.press('Enter');
  await expect(viewer.getByRole('img', { name: '학교 사진 둘' })).toBeVisible();
  await viewer.getByRole('button', { name: '사진 뷰어 닫기' }).click();
  await expect(page.getByRole('link', { name: /첨부파일/ })).toHaveAttribute('href', 'https://school.example/file.pdf');
  // 파일 아이콘과 1px 이미지는 확대 대상이 아님
  await expect(page.getByRole('button', { name: /크게 보기$/ })).toHaveCount(2);
});
