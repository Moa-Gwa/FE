import { test, expect, type Page } from '@playwright/test';
import { call, loginStudent } from './support';

const saveBody = (page: Page, method: string) =>
  page.waitForRequest(r => r.method() === method && new URL(r.url()).pathname.startsWith('/api/me/schedules')).then(r => r.postDataJSON());

for (const width of [390, 768, 1280]) {
  test(`${width}px periods span days, wrap weeks and allow editing both boundaries`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date('2026-11-15T03:00:00Z'));
    await loginStudent(page);
    await call(page.request, 'POST', '/me/schedules', { title: '프로젝트', at: '2026-11-13T00:00:00Z', endAt: '2026-11-18T09:00:00Z' });
    await page.goto('/schedule');
    const bars = page.locator('.calendar-event-bar');
    await expect(bars.filter({ hasText: '기말고사' })).toHaveCount(2);
    await expect(bars.filter({ hasText: '프로젝트' })).toHaveCount(2);
    const sameWeek = page.locator('.calendar-week').filter({ has: page.getByRole('button', { name: '11월 16일', exact: true }) });
    // 다른 테스트가 만든 단체 공지도 같은 BE에 있으므로 이 테스트의 두 일정만 비교
    const rects = await sameWeek.locator('.calendar-event-bar').filter({ hasText: /기말고사|프로젝트/ }).evaluateAll(elements => elements.map(el => ({ y: el.getBoundingClientRect().y, columns: (el as HTMLElement).style.gridColumn })));
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
    const edited = saveBody(page, 'PUT');
    await page.getByRole('button', { name: '수정하기', exact: true }).click();
    expect(await edited).toMatchObject({ at: '2026-11-13T00:00:00.000Z', endAt: '2026-11-20T09:00:00.000Z' });
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(bars.filter({ hasText: '프로젝트' })).toHaveCount(2);
    await page.getByRole('button', { name: '11월 22일', exact: true }).dblclick();
    await expect(page.locator('.personal-period-tabs').getByRole('button', { name: /^시작/ })).toContainText('2026-11-22 09:00');
    await page.locator('#personal-title').fill('새 기간 일정');
    await page.locator('.personal-period-tabs').getByRole('button', { name: /^종료/ }).click();
    await page.getByRole('listbox', { name: '일', exact: true }).getByRole('option', { name: '24', exact: true }).click();
    const created = saveBody(page, 'POST');
    await page.getByRole('button', { name: '추가하기', exact: true }).click();
    expect(await created).toMatchObject({ title: '새 기간 일정', at: '2026-11-22T00:00:00.000Z', endAt: '2026-11-24T01:00:00.000Z' });
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await bars.filter({ hasText: '새 기간 일정' }).first().click();
    await page.getByRole('button', { name: '일정 수정', exact: true }).click();
    await page.getByRole('button', { name: '삭제하기', exact: true }).click();
    await expect(bars.filter({ hasText: '새 기간 일정' })).toHaveCount(0);
  });
}
