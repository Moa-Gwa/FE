import { test, expect, type Page } from '@playwright/test';

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

// 브라우저는 마지막 viewport 태그를 적용함
const lastViewport = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('meta[name="viewport"]')].at(-1)?.getAttribute('content'));

test.describe('iOS', () => {
  test.use({ userAgent: IPHONE_UA, isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });

  test('입력창 확대 방지 태그가 마지막 viewport 태그로 유지됨', async ({ page }) => {
    await page.goto('/login');
    await expect.poll(() => lastViewport(page)).toContain('maximum-scale=0.8');
    // 페이지 이동 시 Next가 viewport 태그를 다시 넣는 상황
    await page.evaluate(() => {
      const m = document.createElement('meta');
      m.name = 'viewport';
      m.content = 'width=device-width, initial-scale=0.8';
      document.head.appendChild(m);
    });
    await expect.poll(() => lastViewport(page)).toContain('maximum-scale=0.8');
  });
});

test.describe('Android', () => {
  test.use({ userAgent: ANDROID_UA, isMobile: true, hasTouch: true, viewport: { width: 412, height: 915 } });

  test('두 손가락 확대를 막지 않도록 maximum-scale을 걸지 않음', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('meta[data-ios-zoom-lock]')).toHaveCount(0);
    expect(await lastViewport(page)).not.toContain('maximum-scale');
  });
});
