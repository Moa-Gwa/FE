import { test, expect } from '@playwright/test';
import { loginAdmin, loginStudent } from './support';

test('admin sees desktop recommendation only on narrow screens and can dismiss it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAdmin(page);
  await page.goto('/admin/dashboard');
  const notice = page.getByText('공지 작성·관리는 데스크톱(PC) 화면에서 더 편하게 할 수 있어요.');
  await expect(notice).toBeVisible();
  await page.getByRole('button', { name: '안내 닫기' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
  await expect(notice).toHaveCount(0);
});

test('desktop admin has no desktop recommendation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAdmin(page);
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
  await expect(page.getByText('데스크톱(PC) 화면에서')).toHaveCount(0);
});

test('offline notice and in-app back button on student sub pages', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginStudent(page);
  await page.goto('/home');
  await page.goto('/notifications');
  await context.setOffline(true);
  await expect(page.getByText('인터넷 연결이 끊겼어요.')).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('인터넷 연결이 끊겼어요.')).toHaveCount(0);
  await page.getByRole('button', { name: '뒤로' }).click();
  await expect(page).toHaveURL(/\/home/);
});
