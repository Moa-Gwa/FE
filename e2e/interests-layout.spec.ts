import { test, expect } from '@playwright/test';
import { loginStudent } from './support';

for (const width of [390, 768, 1280]) {
  test(`primary department field stays aligned when cleared at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // 실제 BE에서 주전공이 설정된 학생으로 로그인
    await loginStudent(page);
    await page.goto('/my/interests');
    const field = page.getByRole('button', { name: '주전공', exact: true });
    await expect(field).not.toHaveText('주전공을 선택해 주세요');
    const department = (await field.innerText()).trim();
    const selected = (await field.boundingBox())!;
    await field.click();
    await page.getByRole('option', { name: '선택 안 함' }).click();
    await expect(field).toHaveText('주전공을 선택해 주세요');
    const cleared = (await field.boundingBox())!;
    const nickname = (await page.getByLabel('닉네임', { exact: true }).boundingBox())!;
    expect(Math.abs(cleared.x - selected.x)).toBeLessThan(1);
    expect(Math.abs(cleared.width - selected.width)).toBeLessThan(1);
    expect(Math.abs(cleared.height - selected.height)).toBeLessThan(1);
    expect(Math.abs(cleared.x - nickname.x)).toBeLessThan(1);
    expect(Math.abs(cleared.width - nickname.width)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await field.click();
    await page.getByRole('dialog', { name: '주전공 선택' }).getByRole('option', { name: department, exact: true }).click();
    await expect(field).toHaveText(department);
    expect(Math.abs((await field.boundingBox())!.x - selected.x)).toBeLessThan(1);
  });
}
