import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { tokenOptions } from '../src/auth.js';
import { drainDeletions } from '../src/images.js';
export async function runIntegration({ app, prisma, images, destroyed, config, email, password }) {
  const agent = request(app);
  let result = await agent.get('/api/health');
  assert.equal(result.status, 200);
  result = await agent.get('/api/content');
  assert.equal(result.body.length, 16);
  assert.ok(result.body.every((c) => c.status === 'PUBLISHED' && !('imagePublicId' in c)));
  assert.equal((await agent.get('/api/admin/content')).status, 401);
  assert.equal((await agent.get('/api/content').set('Origin', 'https://evil.example')).status, 403);
  result = await agent.get('/api/content').set('Origin', config.CLIENT_URL);
  assert.equal(result.headers['access-control-allow-origin'], config.CLIENT_URL);
  assert.equal((await agent.get('/api/content?type=MOVIE&genre=Drama')).body.length, 1);
  assert.equal((await agent.get('/api/content/type/BOOK')).body.length, 4);
  assert.equal((await agent.get('/api/content?type=BAD')).status, 400);
  assert.equal(
    (await agent.post('/api/auth/login').send({ email, password: 'incorrecta' })).status,
    401,
  );
  result = await agent.post('/api/auth/login').send({ email, password });
  assert.equal(result.status, 200);
  assert.ok(result.body.token);
  assert.ok(!result.body.admin.passwordHash);
  const token = result.body.token,
    auth = `Bearer ${token}`;
  const admin = await prisma.admin.findUnique({ where: { email } });
  assert.notEqual(admin.passwordHash, password);
  const expired = jwt.sign({}, config.JWT_SECRET, {
    ...tokenOptions,
    subject: admin.id,
    expiresIn: -1,
  });
  assert.equal(
    (await agent.get('/api/admin/content').set('Authorization', `Bearer ${expired}`)).status,
    401,
  );
  assert.equal((await agent.get('/api/admin/content').set('Authorization', auth)).body.length, 16);
  const payload = {
    title: 'Reseña de integración',
    type: 'BOOK',
    genre: 'Drama',
    year: 2025,
    synopsis: 'Una historia para probar.',
    rating: 8,
    best: ['Un punto'],
    worst: ['Otro punto'],
    verdict: 'Una conclusión.',
    author: 'Autora',
    pages: 180,
    status: 'DRAFT',
  };
  const png = await sharp({ create: { width: 12, height: 12, channels: 3, background: '#245648' } })
    .png()
    .toBuffer();
  assert.equal(
    (
      await agent
        .post('/api/admin/content')
        .set('Authorization', auth)
        .field('data', JSON.stringify(payload))
    ).status,
    400,
  );
  assert.equal(
    (
      await agent
        .post('/api/admin/content')
        .set('Authorization', auth)
        .field('data', JSON.stringify({ ...payload, rating: 12 }))
        .attach('image', png, { filename: 'a.png', contentType: 'image/png' })
    ).status,
    400,
  );
  assert.equal(
    (
      await agent
        .post('/api/admin/content')
        .set('Authorization', auth)
        .field('data', JSON.stringify(payload))
        .attach('image', Buffer.from('fake'), { filename: 'a.png', contentType: 'image/png' })
    ).status,
    400,
  );
  assert.equal(
    (
      await agent
        .post('/api/admin/content')
        .set('Authorization', auth)
        .field('data', JSON.stringify(payload))
        .attach('image', png, { filename: 'a.svg', contentType: 'image/svg+xml' })
    ).status,
    400,
  );
  assert.equal(
    (
      await agent
        .post('/api/admin/content')
        .set('Authorization', auth)
        .field('data', JSON.stringify(payload))
        .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), {
          filename: 'a.png',
          contentType: 'image/png',
        })
    ).status,
    413,
  );
  result = await agent
    .post('/api/admin/content')
    .set('Authorization', auth)
    .field('data', JSON.stringify(payload))
    .attach('image', png, { filename: 'a.png', contentType: 'image/png' });
  assert.equal(result.status, 201);
  let item = result.body;
  const firstImage = item.imagePublicId;
  assert.equal((await agent.get(`/api/content/${item.slug}`)).status, 404);
  result = await agent
    .patch(`/api/admin/content/${item.id}/status`)
    .set('Authorization', auth)
    .send({ status: 'PUBLISHED', version: item.version });
  assert.equal(result.status, 200);
  item = result.body;
  assert.equal((await agent.get(`/api/content/${item.slug}`)).status, 200);
  assert.equal(
    (
      await agent
        .patch(`/api/admin/content/${item.id}/status`)
        .set('Authorization', auth)
        .send({ status: 'DRAFT', version: 1 })
    ).status,
    409,
  );
  result = await agent
    .put(`/api/admin/content/${item.id}`)
    .set('Authorization', auth)
    .send({ ...item, title: 'Edición sin imagen' });
  assert.equal(result.status, 200);
  item = result.body;
  assert.equal(item.imagePublicId, firstImage);
  result = await agent
    .put(`/api/admin/content/${item.id}`)
    .set('Authorization', auth)
    .field('data', JSON.stringify(item))
    .attach('image', png, { filename: 'nuevo.png', contentType: 'image/png' });
  assert.equal(result.status, 200);
  item = result.body;
  assert.notEqual(item.imagePublicId, firstImage);
  await drainDeletions(prisma, images);
  assert.ok(destroyed.includes(firstImage));
  result = await agent
    .patch(`/api/admin/content/${item.id}/status`)
    .set('Authorization', auth)
    .send({ status: 'DRAFT', version: item.version });
  assert.equal(result.status, 200);
  item = result.body;
  assert.equal((await agent.get(`/api/content/${item.slug}`)).status, 404);
  assert.equal(
    (
      await agent
        .delete(`/api/admin/content/${item.id}`)
        .set('Authorization', auth)
        .send({ version: item.version })
    ).status,
    204,
  );
  await drainDeletions(prisma, images);
  assert.ok(destroyed.includes(item.imagePublicId));
  assert.equal(await prisma.content.count(), 16);
  await prisma.imageDeletion.create({ data: { publicId: 'test/retry' } });
  await drainDeletions(prisma, {
    destroy: async () => {
      throw Error('Cloudinary caído');
    },
  });
  assert.equal(
    (await prisma.imageDeletion.findUnique({ where: { publicId: 'test/retry' } })).attempts,
    1,
  );
  await drainDeletions(prisma, images);
  assert.equal(await prisma.imageDeletion.count(), 0);
  console.log(
    'API verificada: autenticación, CORS, filtros, borradores, CRUD, imágenes, versiones y limpieza persistente.',
  );
}
