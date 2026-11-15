import { test, expect } from '@playwright/test';
import { responsiveFixtures } from './fixtures/responsive';

for (const width of [390, 768, 1280]) {
  test(`${width}px planner appearance and saved colors survive reload and reset`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date('2026-11-15T03:00:00Z'));
    await responsiveFixtures(page, 'STUDENT');
    let color: string | null = null;
    const academic = { source: 'ACADEMIC', type: 'ACADEMIC', noticeId: 1, title: '기말고사', at: '2026-11-15T15:00:00Z', endAt: '2026-11-24T15:00:00Z', organizationName: '성심교정 학사일정', bookmarked: false };
    await page.route('**/api/schedule?**', route => route.fulfill({ json: [
      { ...academic, color },
      { type: 'PERSONAL', source: 'PERSONAL', noticeId: 2, title: '프로젝트 발표', at: '2026-11-18T09:00:00+09:00', endAt: '2026-11-18T10:00:00+09:00', organizationName: '내 일정', bookmarked: false, color: '#7850A0' },
    ] }));
    await page.route('**/api/me/schedule-colors/ACADEMIC/1', route => {
      color = route.request().postDataJSON().color;
      return route.fulfill({ status: 204 });
    });
    await page.goto('/schedule');
    const bars = page.locator('.calendar-event-bar').filter({ hasText: '기말고사' });
    await expect(bars).toHaveCount(2);
    await expect(page.getByRole('button', { name: '11월 15일', exact: true }).locator('.day-num')).toHaveCSS('background-color', 'rgb(237, 71, 71)');
    await expect(page.getByRole('button', { name: '11월 1일', exact: true })).toHaveCSS('color', 'rgb(237, 71, 71)');
    await expect(page.getByRole('button', { name: '11월 7일', exact: true })).toHaveCSS('color', 'rgb(70, 119, 230)');
    await bars.first().click();
    await expect(page.getByRole('dialog', { name: '기말고사' })).toBeVisible();
    await page.getByRole('radio', { name: '분홍', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(bars.first().locator('.calendar-event-label')).toHaveCSS('background-color', 'rgb(184, 59, 114)');
    await expect(bars.last().locator('.calendar-event-label')).toHaveCSS('background-color', 'rgb(184, 59, 114)');
    await page.reload();
    await expect(bars.first().locator('.calendar-event-label')).toHaveCSS('background-color', 'rgb(184, 59, 114)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`planner-${width}.png`), fullPage: true });
    await bars.first().click();
    await page.getByRole('radio', { name: '기본 색상', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(bars.first().locator('.calendar-event-label')).toHaveCSS('background-color', 'rgb(20, 125, 86)');
    await page.getByRole('button', { name: '+ 일정 추가' }).click();
    await page.getByLabel('일정 색상', { exact: true }).selectOption('#7850A0');
    await expect(page.getByLabel('일정 색상', { exact: true })).toHaveValue('#7850A0');
    await page.screenshot({ path: test.info().outputPath(`color-form-${width}.png`) });
  });
}

test('failed color saves keep the dialog open with the previous selection', async ({ page }) => {
  await responsiveFixtures(page, 'STUDENT');
  await page.route('**/api/schedule?**', route => {
    const from = new URL(route.request().url()).searchParams.get('from');
    return route.fulfill({ json: [{ source: 'PERSONAL', type: 'PERSONAL', noticeId: 2, title: '내 일정', at: `${from}T09:00:00+09:00`, bookmarked: false }] });
  });
  await page.route('**/api/me/schedule-colors/**', route => route.fulfill({ status: 500, json: { message: '저장 실패' } }));
  await page.goto('/schedule');
  await page.locator('.calendar-event-bar').first().click();
  await page.getByRole('radio', { name: '초록', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('저장 실패');
  await expect(page.getByRole('radio', { name: '기본 색상', exact: true })).toHaveAttribute('aria-checked', 'true');
});
