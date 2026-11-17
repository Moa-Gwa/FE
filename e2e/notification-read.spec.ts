import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { adminApi, call, createNotice, loginStudent, seed } from './support';

// 이 파일만 컴퓨터정보공학부 학생회 공지로 알림을 만들어 다른 테스트의 알림과 섞이지 않게 함
test.describe.configure({ mode: 'serial' });

/** 학생이 관심 단체로 등록한 단체에 공지를 게시해 실제 알림을 만듦 */
async function studentWithNotifications(page: Page, titles: string[]) {
  const admin = await adminApi('cs-council');
  const org = (await call<{ id: number }>(admin, 'GET', '/admin/organization')).id;
  const nickname = await loginStudent(page, { onboard: false });
  await call(page.request, 'PUT', '/me/profile', { nickname, primaryDepartmentId: seed().departmentId, admissionYear: 2026, departmentIds: [], organizationIds: [org], categoryIds: [] });
  const ids: Record<string, number> = {};
  for (const title of titles) ids[title] = (await createNotice(admin, { title })).id;
  await admin.dispose();
  return ids;
}

for (const width of [390, 1280]) {
  test(`${width}px single and all-read notifications become gray and stay read on return`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const tag = randomUUID().slice(0, 4);
    const [readTitle, singleTitle, allTitle] = [`이미 읽은 알림 ${tag}`, `개별 확인 알림 ${tag}`, `모두 확인 알림 ${tag}`];
    const ids = await studentWithNotifications(page, [readTitle, singleTitle, allTitle]);
    const list = await call<{ items: { id: number; title: string }[] }>(page.request, 'GET', '/me/notifications');
    await call(page.request, 'PUT', `/me/notifications/${list.items.find(n => n.title === readTitle)!.id}/read`);
    await page.goto('/notifications');
    const read = page.locator('article').filter({ hasText: readTitle });
    const single = page.locator('article').filter({ hasText: singleTitle });
    const all = page.locator('article').filter({ hasText: allTitle });
    await expect(read).toHaveClass(/notification-read/);
    await expect(single).toHaveClass(/unread/);
    const readColor = await read.locator('h3').evaluate(el => getComputedStyle(el).color);
    const readBackground = await read.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(await single.locator('h3').evaluate(el => getComputedStyle(el).color)).not.toBe(readColor);
    expect(await single.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(readBackground);
    await single.click();
    await expect(page).toHaveURL(new RegExp(`/notices/manual/${ids[singleTitle]}$`));
    await page.goto('/notifications');
    await expect(single).toHaveClass(/notification-read/);
    await expect(single.locator('h3')).toHaveCSS('color', readColor);
    await page.getByRole('button', { name: '모두 읽음', exact: true }).click();
    await expect(all).toHaveClass(/notification-read/);
    await expect(all).toHaveCSS('background-color', readBackground);
    await expect(page.getByRole('button', { name: '모두 읽음', exact: true })).toBeDisabled();
    await expect(page.getByText('읽은 알림은 읽은 날부터 14일 후 자동으로 삭제돼요.')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`notifications-read-${width}.png`), fullPage: true });
  });
}

test('failed mark-all preserves unread appearance and shows an error', async ({ page }) => {
  await studentWithNotifications(page, [`읽지 않은 알림 ${randomUUID().slice(0, 4)}`]);
  // 읽음 처리 실패는 실제 BE로 재현할 수 없어 이 요청만 실패 응답으로 바꿈
  await page.route('**/api/me/notifications/read-all', route => route.fulfill({ status: 500, json: { message: '읽음 처리 실패' } }));
  await page.goto('/notifications');
  await page.getByRole('button', { name: '모두 읽음', exact: true }).click();
  await expect(page.getByText('읽음 처리 실패')).toBeVisible();
  await expect(page.locator('article.unread')).toHaveCount(1);
  await expect(page.locator('article.notification-read')).toHaveCount(0);
});
