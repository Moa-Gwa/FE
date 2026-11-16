import { test, expect, type Page } from '@playwright/test';
import { loginAs, seed } from './support';

// 준비 단계에서 만든 실제 데이터 id로 경로를 만듦
const studentPages = () => {
  const s = seed();
  return ['/home', '/explore', `/notices/manual/${s.notices.wide}`, `/notices/crawled/${s.crawled}`, '/schedule', '/life', `/life/items/${s.item}`, '/life/new', '/life/group/new',
    `/life/group/${s.group}`, `/life/group/${s.group}/pay`, `/life/group/${s.group}/pay/success`, `/life/group/${s.group}/pay/fail`, '/life/chats', `/life/chats/${s.chatRoom}`,
    '/life/my', '/life/verify', '/notifications', '/my', '/my/interests'];
};
const adminPages = () => ['/admin/dashboard', '/admin/notices', '/admin/notices/new', `/admin/notices/${seed().notices.wide}/edit`, '/admin/schedule', '/admin/organization', '/admin/corrections', '/admin/applications'];
const authPages = () => ['/login', '/admin-apply', '/admin-setup?token=test'];

async function inspect(page: Page, name: string) {
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect.soft(overflow.scroll, `${name}: page width`).toBeLessThanOrEqual(overflow.width + 1);
  // 가려진 폼도 검사하되 가로 스크롤을 의도한 갤러리는 별도 영역으로 취급한다.
  const clipped = await page.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]),textarea,select,.writer-foot button,.publish-actions button')].filter(el => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return false;
    return r.left < -1 || r.right > innerWidth + 1;
  }).map(el => ({ tag: el.tagName, name: el.getAttribute('name'), className: el.className })));
  expect.soft(clipped, `${name}: form controls`).toEqual([]);
  const smallTargets = await page.evaluate(() => [...document.querySelectorAll('button:not(:disabled)')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
      && !el.closest('[data-nextjs-dialog],nextjs-portal') && (r.width < 43.5 || r.height < 43.5);
  }).map(el => ({ text: el.textContent?.trim().slice(0,30), className: el.className })));
  expect.soft(smallTargets, `${name}: 44px touch controls`).toEqual([]);
  const file = name.replace(/[^a-zA-Z0-9-]/g, '_') + '.png';
  const path = test.info().outputPath(file);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await test.info().attach(file, { path, contentType: 'image/png' });
}

for (const width of [390,768,1280]) {
  for (const [role, pages] of [['STUDENT', studentPages], ['ADMIN', adminPages], [null, authPages]] as const) {
    test(`${width}px ${role ?? 'AUTH'} page screenshots and overflow`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      await loginAs(page, role);
      const paths = pages();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const path of paths) {
        await page.goto(path);
        await expect(page.locator('main').first()).toBeVisible();
        await inspect(page, `${width}-${path}`);
        if (path === '/login') {
          await page.getByRole('button', { name: /관리자로 시작/ }).click();
          await inspect(page, `${width}-admin-login-form`);
        }
        if (role === 'STUDENT') {
          if (width <= 600) await expect(page.locator('.m-nav')).toBeVisible();
          else await expect(page.locator('.m-nav')).not.toBeVisible();
          if (width > 600) {
            await expect(page.locator('.student-side')).toBeVisible();
            const main = (await page.locator('.main-m').boundingBox())!;
            const side = (await page.locator('.student-side').boundingBox())!;
            expect(main.width).toBeLessThanOrEqual(600);
            expect(main.width).toBeCloseTo(Math.min(600, width - side.width), 0);
            expect(main.x).toBeCloseTo(side.x + side.width, 0);
            expect(side.x).toBeCloseTo(width - main.x - main.width, 0);
            for (const selector of ['.notice-list', '.grid.two']) {
              for (const columns of await page.locator(`.main-m ${selector}`).evaluateAll(elements => elements.map(el => getComputedStyle(el).gridTemplateColumns))) {
                expect(columns.split(' ').length, `${path}: single-column list`).toBe(1);
              }
            }
            const bars = page.locator('.life-bar,.life-fab-wrap');
            const bar = await bars.count() ? await bars.first().boundingBox() : null;
            if (bar) {
              expect(bar.x).toBeCloseTo(main.x, 0);
              expect(bar.width).toBeCloseTo(main.width, 0);
            }
          }
        }
      }
      expect(errors).toEqual([]);
    });
  }
  test(`${width}px personal modal and editor publish settings`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, 'STUDENT');
    await page.goto('/schedule');
    await page.getByRole('button',{name:'+ 일정 추가'}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await inspect(page, `${width}-personal-modal`);
    const hour = page.getByRole('listbox', { name: '시', exact: true });
    await hour.press('Home');
    await hour.press('ArrowDown');
    await expect(hour).toHaveAttribute('aria-activedescendant', 'wheel-시-1');
    expect(await hour.locator('button').first().evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await page.getByRole('button',{name:'일정 창 닫기'}).click();
    await loginAs(page, 'ADMIN');
    await page.goto(`/admin/notices/${seed().notices.wide}/edit`);
    await page.locator('.writer-title').fill('반응형 공지 작성 테스트');
    await page.getByRole('button',{name:'저장하기',exact:true}).click({ timeout: 10_000 });
    await expect(page.getByRole('dialog',{name:'게시 설정'})).toBeVisible();
    await inspect(page,`${width}-publish-settings`);
    await page.getByRole('button', { name: '신청 마감', exact: true }).click();
    await expect(page.locator('.dt-pop')).toBeVisible();
    await inspect(page, `${width}-publish-date-picker`);
    const rect = await page.locator('.dt-pop').boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    expect(rect!.height).toBeLessThanOrEqual(900);
  });
}
