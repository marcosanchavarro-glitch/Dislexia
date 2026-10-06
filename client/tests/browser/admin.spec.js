import { test, expect } from '@playwright/test';
test('Rutas protegidas y errores de red recuperables', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/admin\/login/);
  await expect(page.getByRole('heading', { name: 'Historias bien cuidadas.' })).toBeVisible();
});
test('API caída ofrece reintento', async ({ page }) => {
  await page.route('**/api/content', (route) => route.abort());
  await page.goto('/explorar');
  await expect(page.getByRole('button', { name: 'Intentar nuevamente' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('No pudimos conectar');
});
test('Sesión inválida vuelve al login', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('entre-lineas-admin-session', 'invalid'));
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, json: { message: 'Sesión vencida' } }),
  );
  await page.goto('/admin');
  await expect(page).toHaveURL(/admin\/login/);
});
test('Panel real: crear, previsualizar, publicar, editar, eliminar y responsive', async ({
  page,
}) => {
  test.skip(!process.env.STACK_TEST, 'Requiere el servidor y PostgreSQL del comando test:stack.');
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.TEST_ADMIN_EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await expect(page.getByRole('heading', { name: 'El próximo descubrimiento.' })).toBeVisible();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Nueva reseña', exact: true }).first().click();
  await page.getByLabel('Título', { exact: true }).fill('Historia del navegador');
  await page.getByLabel('Género', { exact: true }).fill('Drama');
  await page.getByLabel('Autor', { exact: true }).fill('Una autora');
  await page.getByLabel('Páginas', { exact: true }).fill('200');
  await page.getByLabel('Sinopsis', { exact: true }).fill('Una historia creada desde el panel.');
  await page.getByLabel('Veredicto final', { exact: true }).fill('Una lectura recomendable.');
  await page.getByLabel('Lo mejor, punto 1', { exact: true }).fill('Narración clara');
  await page.getByLabel('Lo peor, punto 1', { exact: true }).fill('Un inicio lento');
  await page.getByRole('button', { name: 'Agregar punto' }).first().click();
  await page.getByLabel('Lo mejor, punto 2', { exact: true }).fill('Personajes memorables');
  await page
    .getByLabel('Seleccionar imagen')
    .setInputFiles({
      name: 'portada.png',
      mimeType: 'image/png',
      buffer: await page.locator('.brand').screenshot(),
    });
  await expect(page.getByAltText('Vista previa de la portada')).toBeVisible();
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/editor-movil.png', fullPage: true });
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page).toHaveURL(/admin\/editar\//);
  await expect(page.getByRole('status')).toContainText('guardado');
  await page
    .getByRole('link', { name: /Volver al panel/ })
    .first()
    .click();
  await page
    .getByRole('textbox', { name: 'Buscar reseñas en el panel' })
    .fill('Historia del navegador');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'Ver Historia del navegador', exact: true }).click();
  await expect(page.getByText('VISTA PREVIA EDITORIAL · BORRADOR')).toBeVisible();
  await page.getByRole('link', { name: 'Editar reseña', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Historia editada del navegador');
  await page.getByRole('button', { name: 'Guardar y publicar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('publicada');
  await page
    .getByRole('link', { name: /Volver al panel/ })
    .first()
    .click();
  await page
    .getByRole('textbox', { name: 'Buscar reseñas en el panel' })
    .fill('Historia editada del navegador');
  await page.getByRole('link', { name: 'Ver Historia editada del navegador', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Historia editada del navegador',
  );
  await page.goto('/admin');
  await page
    .getByRole('textbox', { name: 'Buscar reseñas en el panel' })
    .fill('Historia editada del navegador');
  await page
    .getByRole('button', { name: 'Eliminar Historia editada del navegador', exact: true })
    .click();
  await page.getByRole('button', { name: 'Conservar reseña', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Eliminar Historia editada del navegador', exact: true })
    .click();
  await page.getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page).toHaveURL(/admin\/login/);
});
