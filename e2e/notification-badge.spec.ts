import { test, expect } from '@playwright/test';

for (const width of [390, 768, 1280]) {
  test(`home unread badge stays attached to the bell at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('moagwa-session', JSON.stringify({
      role: 'STUDENT', name: '알림 검사', onboarded: true, verified: false,
    })));
    let unreadCount = 2;
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/me/notifications') {
        await route.fulfill({ json: { unreadCount, items: [] } });
      } else if (path === '/api/feed' || path === '/api/feed/for-me') {
        await route.fulfill({ json: { items: [], page: 0, hasNext: false } });
      } else if (path === '/api/stream') {
        await route.fulfill({ status: 204 });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.goto('/home');
    const bell = page.getByRole('link', { name: '알림, 읽지 않은 알림 2개', exact: true });
    const dot = bell.locator('.notification-dot');
    await expect(dot).toBeVisible();
    const iconBox = (await bell.boundingBox())!;
    const dotBox = (await dot.boundingBox())!;
    expect(Math.abs(dotBox.y - iconBox.y - 8)).toBeLessThan(1);
    expect(Math.abs(iconBox.x + iconBox.width - dotBox.x - dotBox.width - 9)).toBeLessThan(1);
    expect(iconBox.width).toBeGreaterThanOrEqual(44);
    expect(iconBox.height).toBeGreaterThanOrEqual(44);
    unreadCount = 0;
    await page.reload();
    const readBell = page.getByRole('link', { name: '알림', exact: true });
    await expect(readBell).toBeVisible();
    await expect(readBell.locator('.notification-dot')).toHaveCount(0);
    await readBell.click();
    await expect(page).toHaveURL(/\/notifications$/);
  });
}
