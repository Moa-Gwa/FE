import { test, expect, type Page } from '@playwright/test';

const notice = {
  source: 'CRAWLED', id: 5, organization: { id: 1, name: '컴퓨터정보공학부', type: 'DEPARTMENT' }, title: '학술제 참가 신청 안내',
  description: null, contentHtml: '<p>본문</p>', categories: [], images: [], blocks: null, urgent: false,
  publishedAt: '2026-11-10T00:00:00Z', updatedAt: '2026-11-10T00:00:00Z', eventStartAt: '2030-06-15T09:00:00Z', eventEndAt: '2030-06-15T11:00:00Z',
  deadlineAt: '2030-06-10T09:00:00Z', location: '대강당', externalLink: null, status: 'UPCOMING', viewCount: 3, bookmarkCount: 0, bookmarked: false,
  dateEvidence: '6월 10일까지 신청', keywords: [],
};

async function open(page: Page, body: object) {
  await page.addInitScript(() => localStorage.setItem('moagwa-session', JSON.stringify({
    role: 'STUDENT', name: '날짜 검사', onboarded: true, verified: true, consented: true,
  })));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/crawled-notices/5') await route.fulfill({ json: body });
    else if (path === '/api/stream') await route.fulfill({ status: 204 });
    else if (route.request().method() !== 'GET') await route.fulfill({ status: 204 });
    else await route.fulfill({ json: [] });
  });
  await page.goto('/notices/crawled/5');
}

for (const width of [390, 768, 1280]) {
  test(`correction link sits at the right end of the info line at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, notice);
    const info = page.locator('.detail-info');
    const button = info.getByRole('button', { name: '날짜 오류' });
    await expect(button).toBeVisible();
    const box = (await info.boundingBox())!;
    const b = (await button.boundingBox())!;
    expect(box.x + box.width - (b.x + b.width)).toBeLessThan(2);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await button.click();
    await expect(page.getByRole('radio', { name: '신청 마감' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: '취소', exact: true }).click();
    await expect(page.getByRole('radio', { name: '신청 마감' })).toHaveCount(0);
  });
}

test('notice without dates still opens the correction form from the info line', async ({ page }) => {
  await open(page, { ...notice, eventStartAt: null, eventEndAt: null, deadlineAt: null, location: null });
  await expect(page.locator('.info-callout')).toHaveCount(0);
  await page.locator('.detail-info').getByRole('button', { name: '날짜 오류' }).click();
  await expect(page.getByRole('radio', { name: '행사 일시' })).toHaveAttribute('aria-checked', 'true');
});
