import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { loginAs, seed } from './support';

async function evidence(page: Page, name: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  await writeFile(test.info().outputPath(`${name}.json`), json);
  await test.info().attach(`${name}.json`, { body: json, contentType: 'application/json' });
  await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: true });
}

for (const width of [390, 768, 1280]) {
  test(`${width}px date popup stays anchored and within viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, 'ADMIN');
    await page.goto(`/admin/notices/${seed().notices.wide}/edit`);
    await page.locator('.writer-title').fill('날짜 팝업 위치 검사');
    await page.getByRole('button', { name: '저장하기', exact: true }).click();
    const trigger = page.getByRole('button', { name: '신청 마감', exact: true });
    await trigger.click();
    const popup = page.locator('.dt-pop');
    await expect(popup).toBeVisible();
    await expect(popup).toHaveCSS('position', width <= 600 ? 'fixed' : 'absolute');
    const checkBounds = async () => {
      const p = (await popup.boundingBox())!;
      const t = (await trigger.boundingBox())!;
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y + p.height).toBeLessThanOrEqual(900);
      return Math.min(Math.abs(p.y + p.height - t.y), Math.abs(p.y - t.y - t.height));
    };
    await checkBounds();
    await evidence(page, `date-popup-${width}`, { popup: await popup.boundingBox(), trigger: await trigger.boundingBox() });
    if (width > 600) {
      await expect.poll(checkBounds).toBeLessThanOrEqual(9);
      for (let month = 0; month < 3; month++) {
        await popup.getByRole('button', { name: '다음 달' }).click();
        await expect.poll(checkBounds).toBeLessThanOrEqual(9);
      }
      await page.locator('.publish').evaluate(el => { el.scrollTop += 60; });
      await expect.poll(checkBounds).toBeLessThanOrEqual(9);
    }
  });
}

for (const width of [1024, 1280]) {
  test(`${width}px phone schedule stays stacked inside an outer wrapper`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, 'STUDENT');
    await page.goto('/schedule');
    await expect(page.locator('.sched-cal')).toBeVisible();
    const bounds = () => page.evaluate(() => {
      const c = document.querySelector('.sched-cal')!.getBoundingClientRect();
      const l = document.querySelector('.sched-list')!.getBoundingClientRect();
      return { calendar: { x: c.x, y: c.y, width: c.width }, list: { x: l.x, y: l.y, width: l.width } };
    });
    const before = await bounds();
    expect(before.list.y).toBeGreaterThan(before.calendar.y);
    await page.evaluate(() => {
      const layout = document.querySelector('.schedule-layout')!;
      const wrapper = document.createElement('section');
      layout.parentElement!.insertBefore(wrapper, layout);
      wrapper.append(layout);
    });
    const after = await bounds();
    await evidence(page, `schedule-wrapper-${width}`, { before, after });
    expect(after.list.y).toBeGreaterThan(after.calendar.y);
    expect(Math.abs(after.list.x - after.calendar.x)).toBeLessThan(1);
  });
}

for (const width of [600, 601, 640, 768, 1023]) {
  test(`${width}px student navigation boundary and action rows`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, 'STUDENT');
    const results = [];
    for (const path of ['/home', '/explore', '/schedule', '/life', '/life/new', `/life/group/${seed().group}`, '/notifications', '/my', '/my/interests']) {
      await page.goto(path);
      await expect(page.locator('.main-m')).toBeVisible();
      const result = await page.evaluate(() => {
        const main = document.querySelector('.main-m')!;
        const s = getComputedStyle(main), r = main.getBoundingClientRect();
        const bar = document.querySelector('.life-bar')?.getBoundingClientRect();
        const rows = [...document.querySelectorAll('.quick,.segmented,.life-head-links,.btn-row')].map(el => {
          const children = [...el.children].map(c => c.getBoundingClientRect()).filter(r => r.width && r.height);
          return { className: el.className, lines: new Set(children.map(r => Math.round(r.top))).size };
        });
        return { contentWidth: r.width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight),
          pageWidth: document.documentElement.scrollWidth, rows, bar: bar ? { left: bar.left, right: bar.right } : null };
      });
      results.push({ path, ...result });
      expect(result.pageWidth, `${path} overflow`).toBeLessThanOrEqual(width + 1);
      expect(result.contentWidth, `${path} usable width`).toBeGreaterThanOrEqual(320);
      if (result.bar && width > 600) expect(result.bar.left).toBeGreaterThanOrEqual(176);
      if (width <= 600) await expect(page.locator('.m-nav')).toBeVisible();
      else {
        await expect(page.locator('.student-side')).toBeVisible();
        await expect(page.locator('.m-nav')).not.toBeVisible();
      }
    }
    await evidence(page, `boundary-${width}`, results);
  });
}

for (const width of [390, 1280]) {
  test(`${width}px compact reminder keeps a usable switch`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, 'STUDENT');
    await page.goto(`/notices/manual/${seed().notices.wide}`);
    const reminder = page.locator('.reminder-settings').filter({ hasText: '마감 24시간 전 리마인더' });
    await expect(reminder.getByRole('switch')).toBeEnabled();
    const rect = (await reminder.boundingBox())!;
    const switchRect = (await reminder.getByRole('switch').boundingBox())!;
    expect(rect.height).toBeLessThanOrEqual(140);
    expect(switchRect.height).toBeGreaterThanOrEqual(44);
    await evidence(page, `compact-reminder-${width}`, { rect, switchRect });
  });
}
