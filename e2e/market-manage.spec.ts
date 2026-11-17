import { test, expect, type Page } from '@playwright/test';

const item = {
  id: 7, title: '전공 교재', price: 12000, category: 'BOOK', status: 'ON_SALE', tradePlace: '학생회관 앞', createdAt: '2026-11-17T00:00:00Z',
  likeCount: 0, liked: false, description: '깨끗해요', imageUrls: ['/uploads/a.png'], viewCount: 3, mine: true,
  seller: { nickname: '판매자', department: null },
};
const request = { id: 31, itemId: 7, itemTitle: '전공 교재', buyerId: 2, buyerNickname: '구매자', message: '살게요', createdAt: '2026-11-17T00:00:00Z' };

/** API를 가짜 응답으로 처리하고 보낸 변경 요청을 기록함 */
async function mockApi(page: Page, requestStatus: string) {
  const sent: { method: string; path: string; body: unknown }[] = [];
  await page.addInitScript(() => localStorage.setItem('moagwa-session', JSON.stringify({
    role: 'STUDENT', name: '판매자', onboarded: true, verified: true, consented: true,
  })));
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() !== 'GET') sent.push({ method: req.method(), path, body: req.postDataJSON() });
    if (path === '/api/market/items/7') await route.fulfill({ json: req.method() === 'PUT' ? { ...item, ...(req.postDataJSON() as object) } : item });
    else if (path === '/api/market/items/7/requests') await route.fulfill({ json: [{ ...request, status: requestStatus }] });
    else if (path === '/api/me/market/requests') await route.fulfill({ json: [{ ...request, status: requestStatus }] });
    else if (path === '/api/stream') await route.fulfill({ status: 204 });
    else if (req.method() !== 'GET') await route.fulfill({ status: 204 });
    else await route.fulfill({ json: [] });
  });
  page.on('dialog', (d) => d.accept());
  return sent;
}

test('seller rejects a pending request and edits the item', async ({ page }) => {
  const sent = await mockApi(page, 'PENDING');
  await page.goto('/life/items/7');
  await page.getByRole('button', { name: '거절', exact: true }).click();
  await expect.poll(() => sent.map((s) => `${s.method} ${s.path}`)).toContain('POST /api/market/requests/31/reject');

  await page.getByRole('link', { name: '물품 수정', exact: true }).click();
  const title = page.getByLabel('제목');
  await expect(title).toHaveValue('전공 교재');
  await expect(page.getByLabel('거래 희망 장소')).toHaveValue('학생회관 앞');
  await title.fill('전공 교재 (가격 내림)');
  await page.getByRole('button', { name: '수정하기', exact: true }).click();
  await expect(page).toHaveURL(/\/life\/items\/7$/);
  const put = sent.find((s) => s.method === 'PUT');
  expect(put?.path).toBe('/api/market/items/7');
  expect(put?.body).toMatchObject({ title: '전공 교재 (가격 내림)', price: 12000, category: 'BOOK', tradePlace: '학생회관 앞', imageUrls: ['/uploads/a.png'] });
});

test('buyer cancels an accepted request from my trades', async ({ page }) => {
  const sent = await mockApi(page, 'ACCEPTED');
  await page.goto('/life/my');
  await page.getByRole('button', { name: '내 요청', exact: true }).click();
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await expect.poll(() => sent.map((s) => `${s.method} ${s.path}`)).toContain('POST /api/market/requests/31/cancel');
});
