import { test, expect } from '@playwright/test';
import { adminApi, call, createNotice, loginStudent } from './support';

test('Seongsim academic dates appear by default as all-day entries and open the official calendar', async ({ page }) => {
  // 학사일정 고정 페이지(e2e/static/academic-2026.html)의 기말고사 기간 안
  await page.clock.setFixedTime(new Date('2026-11-18T03:00:00Z'));
  await loginStudent(page);
  const admin = await adminApi();
  const saved = await createNotice(admin, { title: '저장한 행사', eventStartAt: '2026-11-18T01:00:00Z' });
  await admin.dispose();
  await call(page.request, 'PUT', `/me/bookmarks/MANUAL/${saved.id}`);
  await page.goto('/schedule');
  const academic = page.getByRole('link', { name: /기말고사/ });
  await expect(academic).toBeVisible();
  await expect(academic).toContainText('종일');
  await expect(academic).toContainText('학사');
  await expect(academic).toHaveAttribute('target', '_blank');
  await expect(academic).toHaveAttribute('href', /https:\/\/www.catholic.ac.kr\/ko\/support\/calendar2024_list.do/);
  await expect(page.locator('.sched-cal .day.event').first()).toBeVisible();
  await page.getByRole('button', { name: '저장한 공지만' }).click();
  await expect(academic).toHaveCount(0);
  await expect(page.getByRole('link', { name: /저장한 행사/ })).toBeVisible();
  await page.getByRole('button', { name: '저장한 공지만' }).click();
  await expect(academic).toBeVisible();
});
