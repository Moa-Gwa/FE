import { test, expect } from '@playwright/test';
import { responsiveFixtures } from './fixtures/responsive';

test('Seongsim academic dates appear by default as all-day entries and open the official calendar', async ({ page }) => {
  await responsiveFixtures(page, 'STUDENT');
  await page.route('**/api/schedule?**', route => {
    const day = new URL(route.request().url()).searchParams.get('from')!;
    return route.fulfill({ json: [
      { type: 'ACADEMIC', source: 'ACADEMIC', noticeId: 1, title: '성심교정 기말고사', at: `${day}T00:00:00+09:00`, organizationName: '성심교정 학사일정', bookmarked: false, sourceUrl: 'https://www.catholic.ac.kr/ko/support/calendar2024_list.do?selectedYear=2026' },
      { type: 'EVENT', source: 'MANUAL', noticeId: 2, title: '저장한 행사', at: `${day}T10:00:00+09:00`, organizationName: '학생회', bookmarked: true },
    ] });
  });
  await page.goto('/schedule');
  const academic = page.getByRole('link', { name: /성심교정 기말고사/ });
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
