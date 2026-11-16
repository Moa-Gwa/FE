import { test, expect } from '@playwright/test';
import { responsiveFixtures } from './fixtures/responsive';

for (const width of [390, 1280]) {
  test(`${width}px single and all-read notifications become gray and stay read on return`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await responsiveFixtures(page, 'STUDENT');
    const items = [
      { id: 1, type: 'URGENT', source: 'PERSONAL', noticeId: 1, title: '이미 읽은 알림', body: '내용', read: true, createdAt: '2026-11-15T09:00:00Z' },
      { id: 2, type: 'REMINDER', source: 'PERSONAL', noticeId: 2, title: '개별 확인 알림', body: '내용', read: false, createdAt: '2026-11-15T10:00:00Z' },
      { id: 3, type: 'NEW_NOTICE', source: 'PERSONAL', noticeId: 3, title: '모두 확인 알림', body: '내용', read: false, createdAt: '2026-11-15T11:00:00Z' },
    ];
    await page.route('**/api/me/notifications**', route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === 'PUT') {
        for (const n of items) if (path.endsWith('read-all') || path.endsWith(`/${n.id}/read`)) n.read = true;
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ json: { unreadCount: items.filter(n => !n.read).length, items } });
    });
    await page.goto('/notifications');
    const read = page.locator('article').filter({ hasText: '이미 읽은 알림' });
    const single = page.locator('article').filter({ hasText: '개별 확인 알림' });
    const all = page.locator('article').filter({ hasText: '모두 확인 알림' });
    await expect(read).toHaveClass(/notification-read/);
    await expect(single).toHaveClass(/unread/);
    const readColor = await read.locator('h3').evaluate(el => getComputedStyle(el).color);
    const readBackground = await read.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(await single.locator('h3').evaluate(el => getComputedStyle(el).color)).not.toBe(readColor);
    expect(await single.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(readBackground);
    await single.click();
    await expect(page).toHaveURL(/\/schedule$/);
    await page.goto('/notifications');
    await expect(single).toHaveClass(/notification-read/);
    await expect(single.locator('h3')).toHaveCSS('color', readColor);
    await page.getByRole('button', { name: '모두 읽음', exact: true }).click();
    await expect(all).toHaveClass(/notification-read/);
    await expect(all).toHaveCSS('background-color', readBackground);
    await expect(page.getByRole('button', { name: '모두 읽음', exact: true })).toBeDisabled();
    await expect(page.getByText('읽은 알림은 읽은 날부터 14일 후 자동으로 삭제돼요.')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`notifications-read-${width}.png`), fullPage: true });
  });
}

test('failed mark-all preserves unread appearance and shows an error', async ({ page }) => {
  await responsiveFixtures(page, 'STUDENT');
  await page.route('**/api/me/notifications/read-all', route => route.fulfill({ status: 500, json: { message: '읽음 처리 실패' } }));
  await page.goto('/notifications');
  await page.getByRole('button', { name: '모두 읽음', exact: true }).click();
  await expect(page.getByText('읽음 처리 실패')).toBeVisible();
  await expect(page.locator('article.unread')).toHaveCount(1);
  await expect(page.locator('article.notification-read')).toHaveCount(0);
});
