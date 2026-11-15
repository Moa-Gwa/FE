import { test, expect } from '@playwright/test';
import { responsiveFixtures } from './fixtures/responsive';

for (const width of [390, 768, 1280]) {
  test(`${width}px periods span days, wrap weeks and allow editing both boundaries`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date('2026-11-15T03:00:00Z'));
    await responsiveFixtures(page, 'STUDENT');
    let personal: Record<string, unknown> | null = { type: 'PERSONAL', source: 'PERSONAL', noticeId: 9, title: '프로젝트', at: '2026-11-13T00:00:00Z', endAt: '2026-11-18T09:00:00Z', organizationName: '내 일정', bookmarked: false };
    let saved: Record<string, unknown> | null = null;
    await page.route('**/api/schedule?**', route => route.fulfill({ json: [
      ...(personal ? [personal] : []),
      { type: 'ACADEMIC', source: 'ACADEMIC', noticeId: 1, title: '기말고사', at: '2026-11-15T15:00:00Z', endAt: '2026-11-24T15:00:00Z', organizationName: '성심교정 학사일정', bookmarked: false },
    ] }));
    await page.route('**/api/me/schedules**', async route => {
      if (route.request().method() === 'DELETE') personal = null;
      else {
        saved = route.request().postDataJSON();
        personal = { type: 'PERSONAL', source: 'PERSONAL', noticeId: 9, organizationName: '내 일정', bookmarked: false, ...saved };
      }
      return route.fulfill({ status: 204 });
    });
    await page.goto('/schedule');
    const bars = page.locator('.calendar-event-bar');
    await expect(bars.filter({ hasText: '기말고사' })).toHaveCount(2);
    await expect(bars.filter({ hasText: '프로젝트' })).toHaveCount(2);
    const sameWeek = page.locator('.calendar-week').filter({ has: page.getByRole('button', { name: '11월 16일', exact: true }) });
    const rects = await sameWeek.locator('.calendar-event-bar').evaluateAll(elements => elements.map(el => ({ y: el.getBoundingClientRect().y, columns: (el as HTMLElement).style.gridColumn })));
    expect(new Set(rects.map(r => r.y)).size).toBe(2);
    expect(rects.some(r => r.columns.includes('span 6'))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`calendar-periods-${width}.png`), fullPage: true });
    await bars.filter({ hasText: '프로젝트' }).first().click();
    await page.getByRole('button', { name: '일정 수정', exact: true }).click();
    await expect(page.getByText('시작 날짜·시간 (한국 시간)', { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`period-form-${width}.png`) });
    await page.locator('.personal-period-tabs').getByRole('button', { name: /^종료/ }).click();
    await expect(page.getByText('종료 날짜·시간 (한국 시간)', { exact: true })).toBeVisible();
    await page.getByRole('listbox', { name: '일', exact: true }).getByRole('option', { name: '20', exact: true }).click();
    await page.getByRole('button', { name: '수정하기', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(saved).toMatchObject({ at: '2026-11-13T00:00:00.000Z', endAt: '2026-11-20T09:00:00.000Z' });
    await page.getByRole('button', { name: '11월 22일', exact: true }).dblclick();
    await expect(page.locator('.personal-period-tabs').getByRole('button', { name: /^시작/ })).toContainText('2026-11-22 09:00');
    await page.locator('#personal-title').fill('새 기간 일정');
    await page.locator('.personal-period-tabs').getByRole('button', { name: /^종료/ }).click();
    await page.getByRole('listbox', { name: '일', exact: true }).getByRole('option', { name: '24', exact: true }).click();
    await page.getByRole('button', { name: '추가하기', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(saved).toMatchObject({ title: '새 기간 일정', at: '2026-11-22T00:00:00.000Z', endAt: '2026-11-24T01:00:00.000Z' });
    await bars.filter({ hasText: '새 기간 일정' }).first().click();
    await page.getByRole('button', { name: '일정 수정', exact: true }).click();
    await page.getByRole('button', { name: '삭제하기', exact: true }).click();
    await expect(bars.filter({ hasText: '새 기간 일정' })).toHaveCount(0);
  });
}
