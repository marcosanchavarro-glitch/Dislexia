import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseContent, loginSchema, statusSchema } from '../src/validation.js';
import { getConfig } from '../src/config.js';
const demo = JSON.parse(readFileSync(new URL('../prisma/demo.json', import.meta.url), 'utf8'));
test('Las 16 fichas y sus campos específicos son válidos', () => {
  for (const item of demo) assert.equal(parseContent(item).type, item.type);
});
test('Rechaza puntuación, estado, listas vacías y campos específicos incompletos', () => {
  for (const changes of [
    { rating: 11 },
    { status: 'HIDDEN' },
    { best: [] },
    { pages: 0 },
    { author: '' },
  ])
    assert.throws(() => parseContent({ ...demo[0], ...changes }));
});
test('Limpia caracteres de control y elimina campos de otros tipos', () => {
  const item = parseContent({
    ...demo[0],
    title: '  Historia\u0000  ',
    director: 'Ajeno',
    duration: 120,
  });
  assert.equal(item.title, 'Historia');
  assert.equal(item.director, null);
  assert.equal(item.duration, null);
});
test('JWT requiere secreto fuerte y producción requiere HTTPS y Cloudinary', () => {
  assert.throws(() => getConfig({}));
  assert.throws(() =>
    getConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://example/db',
      CLIENT_URL: 'http://example.com',
      JWT_SECRET: 'a'.repeat(32),
    }),
  );
});
test('Credenciales normalizadas y publicación validada', () => {
  assert.equal(
    loginSchema.parse({ email: ' Admin@Example.com ', password: '123' }).email,
    'admin@example.com',
  );
  assert.throws(() => statusSchema.parse({ status: 'UNKNOWN', version: 1 }));
});
test('No convierte null, vacío o booleanos en puntuaciones válidas', () => {
  for (const rating of [null, '', true]) assert.throws(() => parseContent({ ...demo[0], rating }));
});
