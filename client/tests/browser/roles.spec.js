import { test, expect } from '@playwright/test';
test('Roles: panel adaptado, Usuarios, modal de ban, una sesión y logout completo', async ({
  page,
}) => {
  test.skip(!process.env.STACK_TEST, 'Necesita API y PostgreSQL reales.');
  const login = async (email, password, next = '/') => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Mi perfil', exact: true })).toBeVisible();
    await page.goto(next);
  };
  await login('roles_reader@example.test', 'roles-test-password', '/admin');
  await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Administración', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await login('roles_editor@example.test', 'roles-test-password', '/admin');
  await expect(
    page.getByRole('link', { name: 'Panel editorial', exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nueva reseña', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Eliminar / })).toHaveCount(0);
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD, '/admin/users');
  await page.getByLabel('Buscar por usuario o email').fill('roles_reader');
  await page.getByLabel('Rol', { exact: true }).selectOption('USER');
  await page.getByRole('link', { name: 'roles_reader', exact: true }).click();
  await page.getByLabel('Rol del usuario').selectOption('EDITOR');
  await page.getByRole('button', { name: 'Cambiar rol', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cambio' }).click();
  await expect(page.getByRole('status')).toContainText('Cuenta actualizada');
  await expect(page.locator('.role-badge')).toHaveText('Editor');
  await page.getByRole('button', { name: 'Banear usuario', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'El usuario perderá la posibilidad de publicar contenido',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('.status-badge')).toHaveText('Activo');
  await page.getByRole('button', { name: 'Banear usuario', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cambio' }).click();
  await expect(page.locator('.status-badge')).toHaveText('Baneado');
  await page.getByRole('button', { name: 'Reactivar usuario', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cambio' }).click();
  await expect(page.locator('.status-badge')).toHaveText('Activo');
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: 'test-results/usuarios-ficha.png', fullPage: true });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Mi perfil', exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Administración', exact: true }).first(),
  ).toBeVisible();
  const keys = await page.evaluate(() =>
    Object.keys(sessionStorage).filter((k) => k.includes('session')),
  );
  expect(keys).toEqual(['entre-lineas-session']);
  await page.getByRole('link', { name: 'Mi perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar perfil' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  expect(
    await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.includes('session'))),
  ).toEqual([]);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});
