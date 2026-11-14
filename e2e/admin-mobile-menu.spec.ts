import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, role = 'ADMIN') {
  await page.addInitScript(role => localStorage.setItem('moagwa-session', JSON.stringify({
    role, name: '테스트 관리자', operator: false, onboarded: true,
    organization: { id: 1, name: '학생회', type: 'STUDENT_GOVERNMENT' },
  })), role);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/logout') return route.fulfill({ status: 204 });
    if (path === '/api/admin/notices') return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: { message: '테스트 응답' } });
  });
}

test('mobile admin menu opens, selects a page, closes with Escape and logs out', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto('/admin/notices');
  const open = page.getByRole('button', { name: '관리자 메뉴 열기' });
  const menu = page.getByRole('dialog', { name: '관리자 메뉴' });
  await expect(page.locator('.mobile-nav')).toHaveCount(0);
  await open.click();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: '로그아웃' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await menu.getByRole('link', { name: '일정', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/schedule/);
  await expect(menu).not.toBeVisible();
  await open.click();
  await menu.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('moagwa-session'))).toBeNull();
});

test('backdrop closes menu and desktop retains sidebar logout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto('/admin/notices');
  await page.getByRole('button', { name: '관리자 메뉴 열기' }).click();
  await page.mouse.click(370, 400);
  await expect(page.getByRole('dialog', { name: '관리자 메뉴' })).not.toBeVisible();
  await page.getByRole('button', { name: '관리자 메뉴 열기' }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('dialog', { name: '관리자 메뉴' })).not.toBeVisible();
  await expect(page.locator('.side').getByRole('button', { name: '로그아웃' })).toBeVisible();
  await expect(page.getByRole('button', { name: '관리자 메뉴 열기' })).not.toBeVisible();
});

test('student mobile bottom navigation stays available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, 'STUDENT');
  await page.goto('/home');
  await expect(page.getByRole('navigation', { name: '주 메뉴' })).toBeVisible();
  await expect(page.getByRole('button', { name: '관리자 메뉴 열기' })).toHaveCount(0);
});
