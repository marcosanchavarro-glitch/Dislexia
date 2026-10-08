import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const apiContent = JSON.parse(
  readFileSync(new URL('../../server/prisma/demo.json', import.meta.url), 'utf8'),
);
const mapping = { BOOK: 'libro', MOVIE: 'pelicula', GAME: 'juego', SERIES: 'serie' };
const content = apiContent.map((item) => ({ ...item, type: mapping[item.type] }));
import { searchContent as search } from '../src/lib/search.js';
const searchContent = (query) => search(query, content);
import { readStorage, writeStorage } from '../src/lib/storage.js';
import { selectHeroBooks } from '../src/lib/heroBooks.js';
test('Hero: tres libros publicados, recomendados primero y solo portadas válidas', () => {
  const book = (id, changes = {}) => ({
    id,
    slug: id,
    type: 'libro',
    status: 'PUBLISHED',
    imageUrl: `https://images.example/${id}.webp`,
    ...changes,
  });
  const items = [
    book('a'),
    book('draft', { status: 'DRAFT' }),
    book('movie', { type: 'pelicula' }),
    book('local', { imageUrl: '/covers/demo.svg' }),
    book('invalid', { imageUrl: 'invalid' }),
    book('b', { recommended: true }),
    book('c'),
    book('d'),
  ];
  assert.deepEqual(
    selectHeroBooks(items).map((b) => b.id),
    ['b', 'a', 'c'],
  );
  assert.deepEqual(
    selectHeroBooks(items, new Set(['b:https://images.example/b.webp'])).map((b) => b.id),
    ['a', 'c', 'd'],
  );
  for (let n = 0; n < 3; n++)
    assert.equal(selectHeroBooks([book('a'), book('b')].slice(0, n)).length, n);
});
test('Catálogo con cuatro obras por tipo y fichas completas', () => {
  assert.equal(content.length, 16);
  for (const type of ['libro', 'pelicula', 'juego', 'serie'])
    assert.equal(content.filter((c) => c.type === type).length, 4);
  for (const item of content) {
    assert.ok(item.best.length && item.worst.length && item.synopsis && item.verdict);
    assert.ok(item.rating <= 10);
  }
});
test('Búsqueda tolera errores, tildes, espacios y metadatos', () => {
  assert.equal(searchContent('señor anios')[0].id, 'anillos');
  assert.equal(searchContent('  SENOR   ANILLOS ')[0].id, 'anillos');
  assert.equal(searchContent('tolkien')[0].id, 'anillos');
  assert.ok(searchContent('nolan').some((c) => c.id === 'interestelar'));
  assert.ok(searchContent('fantasia').some((c) => c.id === 'principito'));
  assert.ok(searchContent('peliculas').some((c) => c.type === 'pelicula'));
  assert.equal(searchContent('zzzzzzzzzzzzzz').length, 0);
});
test('Persistencia y recuperación ante JSON corrupto o almacenamiento bloqueado', () => {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
  assert.equal(writeStorage('lista', ['dune']), true);
  assert.deepEqual(readStorage('lista', [], Array.isArray), ['dune']);
  map.set('lista', '{bad');
  assert.deepEqual(readStorage('lista', [], Array.isArray), []);
  globalThis.localStorage = {
    getItem: () => {
      throw Error();
    },
    setItem: () => {
      throw Error();
    },
  };
  assert.equal(writeStorage('lista', []), false);
  assert.deepEqual(readStorage('lista', [], Array.isArray), []);
});
