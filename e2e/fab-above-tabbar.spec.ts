import { test, expect, type Page } from '@playwright/test';

async function open(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('moagwa-session', JSON.stringify({
    role: 'STUDENT', name: '탭바 검사', onboarded: true, verified: true, consented: true,
  })));
  await page.route('**/api/**', async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === '/api/stream') await route.fulfill({ status: 204 });
    else if (p.startsWith('/api/feed') || p.startsWith('/api/market')) await route.fulfill({ json: { items: [], page: 0, hasNext: false } });
    else await route.fulfill({ json: [] });
  });
  await page.goto(path);
  // 홈 화면 웹앱의 아래쪽 안전 영역처럼 탭바를 높임
  await page.addStyleTag({ content: '.m-nav { padding-bottom: 40px !important; }' });
}

for (const [path, name] of [['/home', '학교 안내 챗봇'], ['/life', 'life-fab']] as const) {
  test(`floating button on ${path} stays above the taller tab bar`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, path);
    const nav = page.getByRole('navigation', { name: '주 메뉴' });
    const button = path === '/home' ? page.getByRole('button', { name }) : page.locator('.life-fab').first();
    await expect(button).toBeVisible();
    await expect.poll(async () => {
      const n = (await nav.boundingBox())!;
      const b = (await button.boundingBox())!;
      return b.y + b.height <= n.y;
    }).toBe(true);
  });
}
