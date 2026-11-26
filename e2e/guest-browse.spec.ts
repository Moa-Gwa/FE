import { test, expect } from '@playwright/test';
import { seed } from './support';

// 비로그인: 홈부터 둘러보고, 로그인이 필요한 화면과 기능에서만 /login으로 이동
test('guest starts at home and is sent to login only for login-only screens', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('link', { name: '로그인하러 가기 →' })).toBeVisible();
  await expect(page.getByRole('link', { name: '로그인하고 알림 받기 →' })).toBeVisible();

  await page.goto(`/notices/MANUAL/${seed().notices.single}`);
  await expect(page.getByRole('link', { name: /로그인하고 저장/ })).toHaveAttribute('href', '/login');

  await page.goto('/schedule');
  await expect(page).toHaveURL(/\/schedule/);

  for (const path of ['/life', '/my', '/notifications']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  await page.getByRole('link', { name: '로그인 없이 둘러보기 →' }).click();
  await expect(page).toHaveURL(/\/home$/);
});
