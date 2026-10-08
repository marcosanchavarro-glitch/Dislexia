import { test, expect } from '@playwright/test';

const widths = [320, 360, 375, 390, 414, 430, 768, 1440];
const modes = [];
for (const font of ['default', 'accessible'])
  for (const size of ['normal', 'large', 'larger'])
    for (const spacing of [false, true])
      for (const contrast of ['normal', 'soft', 'high'])
        modes.push({ font, size, spacing, contrast });

test('Responsive: 36 modos, ocho anchos, vistas públicas y todos los roles', async ({
  page,
  request,
}) => {
  test.skip(!process.env.STACK_TEST, 'Requiere el stack aislado real.');
  test.setTimeout(300000);
  const api = 'http://127.0.0.1:3001/api';
  const catalog = await (await request.get(`${api}/content`)).json();
  const failures = [];
  let checks = 0;
  const inspect = async (name) => {
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const errors = await page.evaluate((modes) => {
        const errors = [];
        for (const mode of modes) {
          for (const [key, value] of Object.entries(mode))
            document.documentElement.dataset[key] = String(value);
          const root = document.documentElement;
          if (root.scrollWidth > root.clientWidth) {
            const nodes = [...document.querySelectorAll('body *')]
              .filter((el) => {
                const rect = el.getBoundingClientRect();
                return (
                  rect.width &&
                  rect.right > root.clientWidth + 1 &&
                  !el.closest('dialog:not([open])') &&
                  !el.matches('.sr-only, .skip-link')
                );
              })
              .slice(0, 8)
              .map(
                (el) =>
                  `${el.tagName}.${el.className}: ${el.getBoundingClientRect().right.toFixed(1)}`,
              );
            errors.push({ mode, width: root.clientWidth, scroll: root.scrollWidth, nodes });
          }
        }
        return errors;
      }, modes);
      failures.push(...errors.map((error) => ({ view: name, ...error })));
      checks += modes.length;
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.screenshot({ path: `test-results/responsive-${name}-320-F.png`, fullPage: true });
    await page.screenshot({ path: `test-results/responsive-${name}-viewport.png` });
  };
  for (const route of [
    '/',
    '/explorar',
    '/mi-lista',
    '/login',
    '/register',
    ...['BOOK', 'MOVIE', 'GAME', 'SERIES'].map(
      (type) => `/resena/${catalog.find((c) => c.type === type).slug}`,
    ),
  ]) {
    await page.goto(route);
    await expect(page.locator('.api-state')).toHaveCount(0);
    await inspect(`public-${route.replaceAll('/', '-').replace(/^-/, '') || 'home'}`);
    if (route === '/') {
      await page.evaluate(() =>
        Object.assign(document.documentElement.dataset, {
          font: 'default',
          size: 'normal',
          spacing: 'false',
          contrast: 'normal',
        }),
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({ path: 'test-results/responsive-home-desktop-default.png' });
      await page.setViewportSize({ width: 320, height: 900 });
      await page.screenshot({ path: 'test-results/responsive-home-mobile-default.png' });
      await page.locator('.save-button').first().click();
      await inspect('snackbar');
    }
  }
  for (const [role, email, password] of [
    ['USER', 'roles_reader@example.test', 'roles-test-password'],
    ['EDITOR', 'roles_editor@example.test', 'roles-test-password'],
    ['ADMIN', 'roles_admin@example.test', 'roles-test-password'],
    ['SUPER_ADMIN', process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD],
  ]) {
    const response = await request.post(`${api}/auth/login`, { data: { email, password } });
    expect(response.ok(), `${role} login`).toBeTruthy();
    const session = await response.json();
    await page.goto('/login');
    await page.evaluate(
      (token) => sessionStorage.setItem('entre-lineas-session', token),
      session.token,
    );
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Mi perfil', exact: true })).toBeVisible();
    await inspect(`${role}-header`);
    await page.goto(`/profile/${session.user.username}`);
    await expect(page.getByRole('button', { name: 'Editar perfil' })).toBeVisible();
    await page.getByRole('button', { name: 'Editar perfil' }).click();
    await inspect(`${role}-profile-form`);
    await page.goto(`/resena/${catalog[0].slug}`);
    await expect(page.getByLabel('Reseña', { exact: true }).first()).toBeVisible();
    await inspect(`${role}-community-form`);
    if (role === 'USER') {
      await page.goto(`/resena/${catalog[1].slug}`);
      await page.getByRole('button', { name: 'Reportar', exact: true }).first().click();
      await page.getByLabel('Motivo', { exact: true }).selectOption('OTHER');
      await page.getByLabel('Explicación breve', { exact: true }).fill('Texto largo '.repeat(30));
      await inspect('report-dialog');
      expect(
        await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBeTruthy();
      await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.getByRole('button', { name: 'Responder', exact: true }).first().click();
      await inspect('reply-form');
    }
    if (role !== 'USER') {
      for (const route of [
        '/admin',
        '/admin/nueva',
        `/admin/editar/${catalog[0].id}`,
        `/admin/ver/${catalog[0].id}`,
        ...(role !== 'EDITOR' ? ['/admin/users', '/admin/comunidad'] : []),
      ]) {
        await page.goto(route);
        await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toHaveCount(0);
        await expect(page.locator('.api-state')).toHaveCount(0);
        await inspect(`${role}-${route.replaceAll('/', '-')}`);
        if (route === '/admin/users') {
          await page.getByLabel('Buscar por usuario o email').fill('roles_reader');
          await page.getByRole('link', { name: 'roles_reader', exact: true }).click();
          await expect(
            page.getByRole('button', { name: 'Banear usuario', exact: true }),
          ).toBeVisible();
          await inspect(`${role}-user-detail-history`);
          await page.getByRole('button', { name: 'Banear usuario', exact: true }).click();
          await inspect(`${role}-ban-dialog`);
          expect(
            await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
          ).toBeTruthy();
          await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Cancelar', exact: true })
            .click();
        }
        if (route === '/admin/comunidad') {
          for (const name of ['Reseñas', 'Respuestas']) {
            await page.getByRole('button', { name, exact: true }).click();
            await inspect(`${role}-moderation-${name}`);
          }
        }
      }
    }
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/');
  }
  // Use the actual controls as well as the exhaustive CSS rendering matrix.
  await page.getByRole('button', { name: 'Accesibilidad', exact: true }).click();
  await page.getByLabel('Tipografía', { exact: true }).selectOption('accessible');
  await page.getByLabel('Tamaño del texto', { exact: true }).selectOption('larger');
  await page.getByLabel('Contraste', { exact: true }).selectOption('high');
  await page.getByLabel('Aumentar espaciado de líneas y letras').check();
  await inspect('accessibility-dialog');
  const dialog = page.getByRole('dialog');
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  await dialog.getByRole('button', { name: 'Listo', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-size', 'larger');
  await expect(page.locator('html')).toHaveAttribute('data-spacing', 'true');
  console.log(`Responsive: ${checks} combinaciones de vista/ancho/modo verificadas.`);
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
});
