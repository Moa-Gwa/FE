import { test, expect } from '@playwright/test';

for (const width of [390, 768, 1280]) {
  test(`primary department field stays aligned when cleared at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('moagwa-session', JSON.stringify({
      role: 'STUDENT', name: '레이아웃 검사', onboarded: true, verified: false,
    })));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/me/profile') {
        await route.fulfill({ json: {
          id: 1, nickname: '레이아웃 검사', primaryDepartmentId: 1, admissionYear: null,
          departmentIds: [], organizationIds: [], categoryIds: [],
        } });
      } else if (url.pathname === '/api/organizations') {
        await route.fulfill({ json: url.searchParams.get('type') === 'DEPARTMENT'
          ? [{ id: 1, name: '컴퓨터정보공학부', type: 'DEPARTMENT' }] : [] });
      } else if (url.pathname === '/api/stream') {
        await route.fulfill({ status: 204 });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.goto('/my/interests');
    const field = page.getByRole('button', { name: '주전공', exact: true });
    await expect(field).toHaveText('컴퓨터정보공학부');
    const selected = (await field.boundingBox())!;
    await field.click();
    await page.getByRole('option', { name: '선택 안 함' }).click();
    const empty = field;
    await expect(empty).toHaveText('주전공을 선택해 주세요');
    const cleared = (await empty.boundingBox())!;
    const nickname = (await page.getByLabel('닉네임', { exact: true }).boundingBox())!;
    expect(Math.abs(cleared.x - selected.x)).toBeLessThan(1);
    expect(Math.abs(cleared.width - selected.width)).toBeLessThan(1);
    expect(Math.abs(cleared.height - selected.height)).toBeLessThan(1);
    expect(Math.abs(cleared.x - nickname.x)).toBeLessThan(1);
    expect(Math.abs(cleared.width - nickname.width)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await empty.click();
    await page.getByRole('dialog', { name: '주전공 선택' }).getByRole('option', { name: '컴퓨터정보공학부', exact: true }).click();
    await expect(field).toHaveText('컴퓨터정보공학부');
    expect(Math.abs((await field.boundingBox())!.x - selected.x)).toBeLessThan(1);
  });
}
