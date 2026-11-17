import { test, expect } from '@playwright/test';

const first = new Date().getFullYear() - 8;

for (const width of [390, 768, 1280]) {
  test(`admission year supports a year list and direct entry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('moagwa-session', JSON.stringify({
      role: 'STUDENT', name: '입학년도 검사', onboarded: true, verified: false, consented: true,
    })));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/me/profile') {
        await route.fulfill({ json: {
          id: 1, nickname: '입학년도 검사', primaryDepartmentId: null, admissionYear: null,
          departmentIds: [], organizationIds: [], categoryIds: [],
          ...(route.request().method() === 'PUT' ? route.request().postDataJSON() : {}),
        } });
      } else if (path === '/api/feed' || path === '/api/feed/for-me') {
        await route.fulfill({ json: { items: [], page: 0, hasNext: false } });
      } else if (path === '/api/stream') {
        await route.fulfill({ status: 204 });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.goto('/my/interests');
    const input = page.getByLabel('입학년도 (선택)', { exact: true });
    const years = page.getByRole('combobox', { name: '입학년도 목록에서 선택' });
    await expect(input).toHaveValue('');
    await expect(years.locator('option:not([disabled])')).toHaveText(
      Array.from({ length: 9 }, (_, i) => `${first + i}년`),
    );
    const box = (await years.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await years.selectOption(String(first));
    await expect(input).toHaveValue(String(first));
    await years.selectOption(String(first + 8));
    await expect(input).toHaveValue(String(first + 8));
    await input.fill(String(first - 1));
    await expect(years).toHaveValue('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const [saved] = await Promise.all([
      page.waitForRequest(req => new URL(req.url()).pathname === '/api/me/profile' && req.method() === 'PUT'),
      page.getByRole('button', { name: '저장', exact: true }).click(),
    ]);
    expect(saved.postDataJSON().admissionYear).toBe(first - 1);
  });
}
