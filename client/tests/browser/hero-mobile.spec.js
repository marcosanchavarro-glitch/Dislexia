import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const cover = readFileSync(new URL('../../public/covers/placeholder.svg', import.meta.url));
const fixture = JSON.parse(
  readFileSync(new URL('../../../server/prisma/demo.json', import.meta.url)),
);
const books = fixture
  .filter((b) => b.type === 'BOOK')
  .slice(0, 3)
  .map((b, i) => ({
    ...b,
    status: 'PUBLISHED',
    recommended: i === 1,
    imageUrl: `https://covers.example.test/${i}.webp`,
  }));
test.beforeEach(async ({ page }) => {
  await page.route('https://covers.example.test/**', (r) =>
    r.fulfill({ contentType: 'image/svg+xml', body: cover }),
  );
});
test('Hero: cero a tres portadas, enlaces y recuperación de imagen rota', async ({ page }) => {
  let content = [];
  await page.route('**/api/content', (r) => r.fulfill({ json: content }));
  for (let n = 0; n <= 3; n++) {
    content = books.slice(0, n);
    await page.goto('/');
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('a.hero-cover')).toHaveCount(n);
    await expect(page.locator('img.hero-cover')).toHaveCount(3 - n);
    if (n === 3) {
      await expect(page.locator('.hero-cover-one')).toHaveAttribute(
        'href',
        `/resena/${books[1].slug}`,
      );
      await expect(page.locator('.hero-cover img')).toHaveCount(3);
    }
  }
  await page.route('https://covers.example.test/1.webp', (r) => r.abort());
  await page.reload();
  await expect(page.locator('a.hero-cover')).toHaveCount(2);
  await expect(page.locator('img.hero-cover')).toHaveCount(1);
});
test('Mobile: filas, gutters, loading compacto y capturas completas', async ({ page }) => {
  test.setTimeout(120000);
  await page.route('**/api/content', (r) =>
    r.fulfill({ json: [...books, ...fixture.filter((b) => b.type !== 'BOOK')] }),
  );
  await page.goto('/');
  await expect(page.locator('.hero')).toBeVisible();
  for (const width of [320, 360, 375, 390, 414, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width <= 430) {
      const rects = await page.evaluate(() => {
        const rect = (selector) => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { x: r.x, y: r.y, bottom: r.bottom, width: r.width, height: r.height };
        };
        return {
          brand: rect('.brand'),
          access: rect('.access-button'),
          account: rect('.user-nav'),
          nav: rect('header nav'),
          search: rect('header .search'),
          main: rect('main'),
        };
      });
      expect(
        Math.abs(rects.brand.y + rects.brand.height / 2 - rects.access.y - rects.access.height / 2),
      ).toBeLessThan(2);
      expect(rects.account.y).toBeGreaterThanOrEqual(rects.access.bottom);
      expect(rects.nav.y).toBeGreaterThanOrEqual(rects.account.bottom);
      expect(rects.search.y).toBeGreaterThanOrEqual(rects.nav.bottom);
      expect(rects.search.x).toBe(width >= 390 ? 20 : 16);
    }
    if ([320, 390, 430, 1440].includes(width)) {
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 800) {
          window.scrollTo(0, y);
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: `test-results/mobile-composition-${width}.png`,
        fullPage: true,
      });
      await page.screenshot({ path: `test-results/mobile-top-${width}.png` });
      await page.locator('footer').screenshot({ path: `test-results/mobile-footer-${width}.png` });
    }
  }
  const failures = await page.evaluate(() => {
    const failures = [];
    for (const font of ['default', 'accessible'])
      for (const size of ['normal', 'large', 'larger'])
        for (const spacing of ['false', 'true'])
          for (const contrast of ['normal', 'soft', 'high']) {
            Object.assign(document.documentElement.dataset, { font, size, spacing, contrast });
            if (document.documentElement.scrollWidth > innerWidth)
              failures.push({ font, size, spacing, contrast });
          }
    return failures;
  });
  expect(failures).toEqual([]);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({ path: 'test-results/mobile-composition-320-F.png', fullPage: true });
  await page.screenshot({ path: 'test-results/mobile-top-320-F.png' });
  await page.unroute('**/api/content');
  await page.route('**/api/content', () => {});
  await page.goto('/');
  await expect(page.locator('.api-state-loading')).toBeVisible();
  expect((await page.locator('.api-state-loading').boundingBox()).height).toBeLessThan(160);
  await page.screenshot({ path: 'test-results/mobile-loading-320.png', fullPage: true });
});
test('PostgreSQL real: publicar tres libros y reemplazar portada sin caché obsoleta', async ({
  page,
  request,
}) => {
  test.skip(!process.env.STACK_TEST, 'Requiere API y PostgreSQL aislados.');
  const api = 'http://127.0.0.1:3001/api';
  const login = await request.post(`${api}/auth/login`, {
    data: { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD },
  });
  expect(login.ok()).toBe(true);
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };
  await page.goto('/');
  await expect(page.locator('.hero')).toBeVisible();
  const png = await page.locator('.brand').screenshot();
  const created = [];
  try {
    for (let i = 0; i < 3; i++) {
      const data = {
        ...books[i],
        id: undefined,
        slug: undefined,
        title: `Libro real hero ${i}`,
        recommended: true,
        status: 'DRAFT',
      };
      const result = await request.post(`${api}/admin/content`, {
        headers,
        multipart: {
          data: JSON.stringify(data),
          image: { name: 'cover.png', mimeType: 'image/png', buffer: png },
        },
      });
      expect(result.status()).toBe(201);
      let book = await result.json();
      created.push(book);
      const published = await request.patch(`${api}/admin/content/${book.id}/status`, {
        headers,
        data: { version: book.version, status: 'PUBLISHED' },
      });
      expect(published.ok()).toBe(true);
      created[i] = await published.json();
    }
    const publicBooks = (await (await request.get(`${api}/content`)).json()).filter((b) =>
      created.some((c) => c.id === b.id),
    );
    expect(publicBooks).toHaveLength(3);
    await page.goto('/');
    for (const b of publicBooks)
      await expect(page.locator(`a.hero-cover[href="/resena/${b.slug}"] img`)).toHaveAttribute(
        'src',
        b.imageUrl,
      );
    const before = created[0];
    await page.locator(`a.hero-cover[href="/resena/${before.slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/resena/${before.slug}$`));
    const replacement = await request.put(`${api}/admin/content/${before.id}`, {
      headers,
      multipart: {
        data: JSON.stringify(before),
        image: { name: 'replacement.png', mimeType: 'image/png', buffer: png },
      },
    });
    expect(replacement.ok()).toBe(true);
    created[0] = await replacement.json();
    expect(created[0].imageUrl).not.toBe(before.imageUrl);
    await page.getByRole('link', { name: 'Entre líneas, inicio' }).click();
    await expect(page.locator(`a.hero-cover[href="/resena/${before.slug}"] img`)).toHaveAttribute(
      'src',
      created[0].imageUrl,
    );
    console.log('PostgreSQL: tres libros publicados, enlaces y portada reemplazada verificados.');
  } finally {
    for (const b of created)
      await request.delete(`${api}/admin/content/${b.id}`, {
        headers,
        data: { version: b.version },
      });
  }
});
