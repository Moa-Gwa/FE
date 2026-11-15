import { test, expect } from '@playwright/test';
import { responsiveFixtures } from './fixtures/responsive';

test.describe('touch calendar', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('a single tap selects; two taps on the same day open a period editor starting on the tapped date', async ({ page }) => {
    await responsiveFixtures(page, 'STUDENT');
    await page.goto('/schedule');
    // Some mobile browsers do not synthesize dblclick from taps.
    await page.evaluate(() => document.addEventListener('dblclick', event => event.stopImmediatePropagation(), true));
    const day = page.locator('.sched-cal .day[role=button]').nth(10);
    await day.tap();
    await expect(day).toHaveClass(/selected/);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    // Start a fresh double tap after the first single-tap check.
    await page.waitForTimeout(450);
    await day.tap();
    await day.tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('시작 날짜·시간 (한국 시간)', { exact: true })).toBeVisible();
    await expect(page.getByRole('listbox', { name: '년', exact: true })).toBeVisible();
    await expect(page.getByRole('listbox', { name: '시', exact: true })).toBeVisible();
  });
  test('taps on different days do not open the editor', async ({ page }) => {
    await responsiveFixtures(page, 'STUDENT');
    await page.goto('/schedule');
    const days = page.locator('.sched-cal .day[role=button]');
    await days.nth(10).tap();
    await days.nth(11).tap();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(days.nth(11)).toHaveClass(/selected/);
  });
});

test('desktop double click and Shift+Enter still open the editor', async ({ page }) => {
  await responsiveFixtures(page, 'STUDENT');
  await page.goto('/schedule');
  const day = page.locator('.sched-cal .day[role=button]').nth(10);
  await day.dblclick();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '일정 창 닫기' }).click();
  await day.focus();
  await day.press('Shift+Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});
