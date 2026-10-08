import { test, expect } from '@playwright/test';
for (const role of ['USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN']) {
  test(`Un solo formulario reconoce ${role} y dirige a su destino`, async ({ page }) => {
    const user = {
      id: 'unified',
      username: 'cuenta',
      email: 'cuenta@example.test',
      role,
      status: 'ACTIVE',
    };
    let credentials;
    await page.route('**/api/content', (r) => r.fulfill({ json: [] }));
    await page.route('**/api/auth/me', (r) => r.fulfill({ json: user }));
    await page.route('**/api/admin/**', (r) => r.fulfill({ json: [] }));
    await page.route('**/api/auth/login', (r) => {
      credentials = r.request().postDataJSON();
      return r.fulfill({ json: { token: 'test-session', user } });
    });
    await page.goto('/');
    await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByText('Un mismo acceso para lectores, editores y administradores.', {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('cuenta-password-123');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(role === 'USER' ? /\/$/ : /\/admin$/);
    expect(credentials).toEqual({ email: user.email, password: 'cuenta-password-123' });
    expect(
      await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.includes('session'))),
    ).toEqual(['entre-lineas-session']);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.goto('/admin/login');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toHaveCount(1);
  });
}
