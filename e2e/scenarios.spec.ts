import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { adminApi, call, createNotice, loginAdmin, loginStudent } from './support';

const unique = (label: string) => `${label} ${randomUUID().slice(0, 6)}`;

test('new student onboards, finds a notice, saves it and sees it on the schedule', async ({ page }) => {
  const title = unique('온보딩 행사');
  const admin = await adminApi();
  // 오늘 일정 목록에 보이도록 곧 시작하는 행사
  await createNotice(admin, { title, eventStartAt: new Date(Date.now() + 60_000).toISOString() });
  await admin.dispose();

  await loginStudent(page, { onboard: false });
  await page.goto('/my/interests');
  await page.locator('#primary').click();
  const sheet = page.getByRole('dialog', { name: '주전공 선택' });
  await sheet.getByRole('option').nth(1).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('moagwa-session')!).onboarded)).toBe(true);

  await page.goto('/explore');
  await page.getByRole('textbox', { name: '공지 검색' }).fill(title);
  // 검색어가 주소에 반영된 뒤 눌러야 늦게 온 주소 갱신이 상세 화면 이동을 덮지 않음
  await expect(page).toHaveURL(/[?&]q=/);
  await page.locator('.notice-card').filter({ hasText: title }).getByRole('link').first().click();
  await expect(page).toHaveURL(/\/notices\/manual\/\d+$/);
  const save = page.getByRole('button', { name: /내 공지에 저장/ });
  await save.click();
  await expect(page.getByRole('button', { name: /저장됨/ })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/schedule');
  await page.getByRole('button', { name: '저장한 공지만' }).click();
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
});

test('a notice published by an admin appears on an open student page without reloading', async ({ page }) => {
  await loginStudent(page);
  // 학생 화면은 연결 표시가 없어 SSE 응답이 열린 뒤에 공지를 게시함
  const stream = page.waitForResponse(r => new URL(r.url()).pathname === '/api/stream');
  await page.goto('/explore');
  await stream;
  await expect(page.locator('.notice-card').first()).toBeVisible();
  const title = unique('실시간 공지');
  const admin = await adminApi();
  await createNotice(admin, { title });
  await admin.dispose();
  // SSE(/api/stream) 알림을 받아 목록만 다시 불러옴
  await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
});

test.describe('regressions', () => {
  test('the notification bell stays visible on small student screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginStudent(page);
    for (const path of ['/home', '/explore', '/schedule']) {
      await page.goto(path);
      const bell = page.getByRole('link', { name: /^알림/ }).first();
      await expect(bell).toBeVisible();
      const box = (await bell.boundingBox())!;
      expect(box.x + box.width, `${path} bell inside viewport`).toBeLessThanOrEqual(390);
    }
  });

  test('radio buttons do not inherit full-width text input styling', async ({ page }) => {
    await loginStudent(page);
    await page.goto('/explore');
    await page.getByRole('button', { name: /필터|정렬/ }).first().click();
    const sort = page.getByRole('dialog', { name: '필터' }).getByRole('radio').first();
    expect((await sort.boundingBox())!.width).toBeLessThanOrEqual(30);

    await loginAdmin(page);
    await page.goto('/admin/notices/new');
    await page.getByRole('button', { name: /이미지/ }).first().click();
    const layout = page.locator('.radio-row input[type=radio]').first();
    await expect(layout).toBeVisible();
    expect((await layout.boundingBox())!.width).toBeLessThanOrEqual(30);
  });

  test('the admin dashboard loads real counts without a server error', async ({ page }) => {
    await loginAdmin(page);
    const dashboard = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin/dashboard');
    await page.goto('/admin/dashboard');
    expect((await dashboard).status()).toBe(200);
    await expect(page.locator('.kpi-link strong').first()).not.toHaveText('–');
    await expect(page.locator('.inline-error')).toHaveCount(0);
    expect((await call<{ kpi: { active: number } }>(page.request, 'GET', '/admin/dashboard')).kpi.active).toBeGreaterThan(0);
  });
});
