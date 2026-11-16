import { test, expect } from '@playwright/test';
import { call, loginStudent, seed } from './support';

test('saved notice offers independent event-start and deadline reminder switches', async ({ page }) => {
  await loginStudent(page);
  const id = seed().notices.wide;
  await call(page.request, 'PUT', `/me/bookmarks/MANUAL/${id}`);
  const changed: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PUT' && r.url().includes('/api/me/reminders/')) changed.push(new URL(r.url()).searchParams.get('kind') ?? 'DEADLINE');
  });
  await page.goto(`/notices/manual/${id}`);
  const event = page.getByRole('switch', { name: '1시간 전 리마인더', exact: true });
  const deadline = page.getByRole('switch', { name: '24시간 전 리마인더', exact: true });
  await expect(event).toBeEnabled();
  await event.click();
  await expect(event).toHaveAttribute('aria-checked', 'true');
  await expect(deadline).toHaveAttribute('aria-checked', 'false');
  await deadline.click();
  await expect(deadline).toHaveAttribute('aria-checked', 'true');
  await expect(event).toHaveAttribute('aria-checked', 'true');
  expect(changed).toEqual(['EVENT_START', 'DEADLINE']);
  // 새로고침해도 BE에 저장된 상태 유지
  await page.reload();
  await expect(event).toHaveAttribute('aria-checked', 'true');
  await expect(deadline).toHaveAttribute('aria-checked', 'true');
});
