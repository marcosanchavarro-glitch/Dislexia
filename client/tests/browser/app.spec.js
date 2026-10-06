import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const demo = JSON.parse(
  readFileSync(new URL('../../../server/prisma/demo.json', import.meta.url), 'utf8'),
);
test.beforeEach(async ({ page }) => {
  if (process.env.STACK_TEST) return;
  await page.route('**/api/content**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const slug = path.split('/')[3];
    const item = slug ? demo.find((c) => c.slug === slug) : demo;
    return route.fulfill({ status: item ? 200 : 404, json: item || { message: 'No existe' } });
  });
});
test('Búsqueda, lista persistente, deshacer, reseña y filtros', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Buscar título, género o creador' }).fill('señor anios');
  await expect(page.getByText('¿Quisiste decir')).toBeVisible();
  await page.getByRole('button', { name: '“El Señor de los Anillos”' }).click();
  await expect(page.locator('.card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Agregar a pendientes: El Señor de los Anillos' }).click();
  await page.getByRole('link', { name: /Mi lista/ }).click();
  await page.reload();
  await expect(page.locator('.card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Quitar de pendientes: El Señor de los Anillos' }).click();
  await expect(page.locator('.card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.locator('.card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Ver reseña' }).click();
  for (const label of ['Ficha técnica', 'Sinopsis', 'Lo mejor', 'Lo peor', 'Veredicto final'])
    await expect(page.getByRole('heading', { name: new RegExp(label) })).toBeVisible();
  await page.goto('/explorar');
  await page.getByRole('button', { name: 'Libros', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(4);
  await page.getByLabel('Género', { exact: true }).selectOption('Fantasía');
  await expect(page.locator('.card')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Buscar título, género o creador' }).fill('zzzzzzzzz');
  await expect(page.locator('.card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Limpiar búsqueda y filtros' }).click();
  await expect(page.locator('.card')).toHaveCount(16);
  expect(errors).toEqual([]);
});
test('Accesibilidad persistente, Escape y responsive', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Accesibilidad' }).click();
  await page.getByLabel('Tipografía', { exact: true }).selectOption('accessible');
  await page.getByLabel('Tamaño del texto').selectOption('larger');
  await page.getByLabel('Contraste', { exact: true }).selectOption('high');
  await page.getByLabel('Aumentar espaciado').check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  for (const [key, value] of [
    ['size', 'larger'],
    ['contrast', 'high'],
    ['font', 'accessible'],
    ['spacing', 'true'],
  ])
    await expect(page.locator('html')).toHaveAttribute(`data-${key}`, value);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Accesibilidad' }).click();
  await page.getByRole('button', { name: 'Restablecer configuración' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-size', 'normal');
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('img').evaluateAll(async (images) => {
    for (const img of images) {
      img.loading = 'eager';
      await img.decode();
    }
  });
  await page.screenshot({ path: 'test-results/inicio.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'test-results/movil.png', fullPage: true });
});
test('Deshacer expira a los cinco segundos', async ({ page }) => {
  await page.goto('/explorar');
  await page.getByRole('button', { name: 'Agregar a pendientes: Dune', exact: true }).click();
  await page.getByRole('button', { name: 'Quitar de pendientes: Dune', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deshacer' })).not.toBeVisible({ timeout: 7000 });
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Agregar a pendientes: Dune', exact: true }),
  ).toBeVisible();
});
test('Historias no disponibles conservan la lista y pueden quitarse y restaurarse', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('entre-lineas-list', JSON.stringify(['anillos', 'removed-topic'])),
  );
  await page.goto('/mi-lista');
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.getByText('Historia no disponible 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quitar historia no disponible 1', exact: true }).click();
  await expect(page.getByText('Historia no disponible 1', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.getByText('Historia no disponible 1', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('entre-lineas-list')))).toEqual([
    'anillos',
    'removed-topic',
  ]);
});
