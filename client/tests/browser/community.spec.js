import { test, expect } from '@playwright/test';
test('Comunidad real: visitante, usuarios, perfil, conversación y moderación', async ({
  page,
  request,
}) => {
  test.skip(!process.env.STACK_TEST, 'Requiere PostgreSQL y API reales.');
  const catalog = await (await request.get('http://127.0.0.1:3001/api/content')).json();
  const content = catalog[1];
  const path = `/resena/${content.slug}`;
  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'La comunidad opina' })).toBeVisible();
  await page.locator('.community-section').getByRole('link', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/login/);
  const register = async (username) => {
    await page.goto('/register');
    await page.getByLabel('Nombre de usuario', { exact: true }).fill(username);
    await page.getByLabel('Email', { exact: true }).fill(`${username}@example.test`);
    await page.getByLabel('Contraseña', { exact: true }).fill('browser-community-pass');
    await page.getByLabel('Repetir contraseña').fill('browser-community-pass');
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Mi perfil' })).toBeVisible();
  };
  await register('browser_reader_a');
  await page.goto(path);
  const community = page.locator('.community-section');
  await community.getByLabel('Reseña', { exact: true }).fill('Una opinión desde el navegador.');
  await community.getByLabel('Título opcional').fill('Mi reseña del navegador');
  await community.getByRole('button', { name: 'Publicar reseña', exact: true }).click();
  const card = community.locator('.community-card').filter({ hasText: 'browser_reader_a' });
  await expect(card).toContainText('Mi reseña del navegador');
  await card.getByRole('button', { name: 'Editar', exact: true }).click();
  await card.getByLabel('Reseña', { exact: true }).fill('Final inesperado, contado con cuidado.');
  await card.getByLabel('Contiene spoilers').check();
  await card.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(card).toContainText('Esta reseña contiene spoilers.');
  await expect(card.getByText('Final inesperado, contado con cuidado.')).toBeHidden();
  await card.getByRole('button', { name: 'Mostrar reseña' }).click();
  await expect(card).toContainText('Final inesperado');
  await page.getByRole('link', { name: 'Mi perfil' }).click();
  await page.getByRole('button', { name: 'Editar perfil' }).click();
  await page.getByLabel('Bio', { exact: true }).fill('Historias y conversaciones.');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText('Perfil actualizado.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await register('browser_reader_b');
  await page.goto(path);
  const other = community.locator('.community-card').filter({ hasText: 'browser_reader_a' });
  await expect(other.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
  await other.getByRole('button', { name: /^Útil/ }).click();
  await expect(other.getByRole('button', { name: /^Útil/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await other.getByRole('button', { name: 'Responder', exact: true }).click();
  await other.getByLabel('Respuesta', { exact: true }).fill('Gracias por compartir tu mirada.');
  await other.getByRole('button', { name: 'Publicar respuesta' }).click();
  await expect(other).toContainText('Gracias por compartir');
  await other.getByRole('button', { name: 'Reportar', exact: true }).click();
  await page.getByLabel('Motivo', { exact: true }).selectOption('SPOILERS');
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Reporte enviado' })).toBeVisible();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await community.screenshot({ path: 'test-results/comunidad-movil.png' });
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('browser_reader_a@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('browser-community-pass');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Mi perfil' })).toBeVisible();
  await page.getByRole('button', { name: 'Accesibilidad', exact: true }).click();
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/api/users/me/accessibility') && r.request().method() === 'PUT',
  );
  await page.getByLabel('Tamaño del texto', { exact: true }).selectOption('large');
  await saved;
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await page.evaluate(() => localStorage.removeItem('entre-lineas-accessibility'));
  await page.reload();
  await expect(page.getByRole('link', { name: 'Mi perfil' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-size', 'large');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.TEST_ADMIN_EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await page.getByRole('link', { name: 'Comunidad', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cuidemos la conversación.' })).toBeVisible();
  await page
    .locator('.community-card')
    .filter({ hasText: 'browser_reader_b' })
    .getByRole('button', { name: 'Ocultar reseña reportada' })
    .click();
  await page.getByRole('button', { name: 'Usuarios', exact: true }).click();
  const reader = page.locator('.community-card').filter({ hasText: 'browser_reader_a' });
  await reader.getByRole('button', { name: 'Suspender', exact: true }).click();
  await expect(reader).toContainText('SUSPENDED');
  await reader.getByRole('button', { name: 'Restaurar usuario' }).click();
  await page.getByRole('button', { name: 'Reseñas', exact: true }).click();
  const review = page.locator('.community-card').filter({ hasText: 'browser_reader_a' });
  await review.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await page.goto(path);
  await expect(page.locator('.community-section')).toContainText('browser_reader_a');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .locator('.community-section')
    .screenshot({ path: 'test-results/comunidad-desktop.png' });
});
