import { test, expect } from '@playwright/test';
import { responsiveFixtures } from './fixtures/responsive';

test('saved notice offers independent event-start and deadline reminder switches', async ({ page }) => {
  await responsiveFixtures(page, 'STUDENT');
  const changed: string[] = [];
  const enabled = new Set<string>();
  await page.route('**/api/me/reminders/**', async route => {
    const kind = new URL(route.request().url()).searchParams.get('kind') ?? 'DEADLINE';
    if (route.request().method() === 'PUT') {
      changed.push(kind);
      if (route.request().postDataJSON().enabled) enabled.add(kind); else enabled.delete(kind);
    }
    await route.fulfill({ json: { enabled: enabled.has(kind), at: '2030-06-15T09:00:00Z', remindAt: '2030-06-15T08:00:00Z', tooLate: false } });
  });
  await page.goto('/notices/manual/1');
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
});
