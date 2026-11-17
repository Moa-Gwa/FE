import { test, expect } from '@playwright/test';
import { call, loginStudent } from './support';

for (const width of [390, 768, 1280]) {
  test(`${width}px planner appearance and saved colors survive reload and reset`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date('2026-11-15T03:00:00Z'));
    await loginStudent(page);
    // 기말고사(11/16~11/24)는 학사일정 고정 페이지에서 옴
    await call(page.request, 'POST', '/me/schedules', { title: '프로젝트 발표', at: '2026-11-18T00:00:00Z', endAt: '2026-11-18T01:00:00Z', color: '#7850A0' });
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
    await expect(bars.first().locator('.calendar-event-label')).toHaveCSS('background-color', 'rgb(245, 198, 218)');
    await expect(bars.last().locator('.calendar-event-label')).toHaveCSS('background-color', 'rgb(245, 198, 218)');
    await page.reload();
    await expect(bars.first().locator('.calendar-event-label')).toHaveCSS('background-color', 'rgb(245, 198, 218)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`planner-${width}.png`), fullPage: true });
    await bars.first().click();
    await page.getByRole('radio', { name: '기본 색상', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(bars.first().locator('.calendar-event-label')).toHaveCSS('background-color', 'rgb(191, 230, 211)');
    await page.getByRole('button', { name: '+ 일정 추가' }).click();
    // 새 일정 창도 기존 일정 색상 창과 같은 팔레트로 고름
    const form = page.getByRole('dialog', { name: '내 일정 추가' });
    await expect(form.getByRole('radio', { name: '기본 색상', exact: true })).toHaveAttribute('aria-checked', 'true');
    await form.getByRole('radio', { name: '보라', exact: true }).click();
    await expect(form.getByRole('radio', { name: '보라', exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(form).toBeVisible();
    // 창이 열려도 닫기 버튼에 포커스가 가지 않아 × 둘레에 포커스 테두리가 생기지 않음
    await expect(form.getByRole('button', { name: '일정 창 닫기' })).not.toBeFocused();
    await page.screenshot({ path: test.info().outputPath(`color-form-${width}.png`) });
  });
}

test('failed color saves keep the dialog open with the previous selection', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T03:00:00Z'));
  await loginStudent(page);
  await call(page.request, 'POST', '/me/schedules', { title: '내 일정', at: '2026-11-18T00:00:00Z' });
  // 저장 실패는 실제 BE로 재현할 수 없어 이 요청만 실패 응답으로 바꿈
  await page.route('**/api/me/schedule-colors/**', route => route.fulfill({ status: 500, json: { message: '저장 실패' } }));
  await page.goto('/schedule');
  await page.locator('.calendar-event-bar').filter({ hasText: '내 일정' }).first().click();
  await page.getByRole('radio', { name: '초록', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('저장 실패');
  await expect(page.getByRole('radio', { name: '기본 색상', exact: true })).toHaveAttribute('aria-checked', 'true');
});
