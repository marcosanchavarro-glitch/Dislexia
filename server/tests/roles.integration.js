import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { tokenOptions } from '../src/auth.js';

export async function runRoles({ app, prisma, config, email, password }) {
  const agent = request(app);
  const owner = (await agent.post('/api/auth/login').send({ email, password })).body;
  assert.equal(owner.user.role, 'SUPER_ADMIN');
  const bearer = (u) => `Bearer ${u.token}`;
  const create = async (username, role) => {
    const u = await prisma.user.create({
      data: {
        username,
        email: `${username}@example.test`,
        role,
        passwordHash: await bcrypt.hash('roles-test-password', 4),
      },
    });
    return { user: u, token: jwt.sign({}, config.JWT_SECRET, { ...tokenOptions, subject: u.id }) };
  };
  const reader = await create('roles_reader', 'USER'),
    editor = await create('roles_editor', 'EDITOR');
  const admin = await create('roles_admin', 'ADMIN'),
    second = await create('roles_owner', 'SUPER_ADMIN');
  const call = (u, method, url, body) =>
    agent[method](url).set('Authorization', bearer(u)).send(body);
  const role = (actor, target, value) =>
    call(actor, 'patch', `/api/admin/users/${target.user.id}/role`, { role: value });
  const status = (actor, target, value) =>
    call(actor, 'patch', `/api/admin/users/${target.user.id}/status`, { status: value });
  // 1: USER refused, including claims supplied by the client.
  assert.equal((await call(reader, 'get', '/api/admin/content')).status, 403);
  const forged = {
    ...reader,
    token: jwt.sign({ role: 'SUPER_ADMIN' }, config.JWT_SECRET, {
      ...tokenOptions,
      subject: reader.user.id,
    }),
  };
  assert.equal((await call(forged, 'get', '/api/admin/users')).status, 403);
  assert.equal(
    (
      await agent.post('/api/auth/register').send({
        username: 'elevated',
        email: 'elevated@example.test',
        password: 'roles-test-password',
        confirmPassword: 'roles-test-password',
        role: 'SUPER_ADMIN',
      })
    ).status,
    400,
  );
  // 2: EDITOR can create, publish, edit and upload content with attribution.
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#35614b' } })
    .png()
    .toBuffer();
  const editorial = await agent
    .post('/api/admin/content')
    .set('Authorization', bearer(editor))
    .field(
      'data',
      JSON.stringify({
        title: 'Contenido del editor',
        type: 'BOOK',
        genre: 'Drama',
        year: 2026,
        synopsis: 'Prueba de permisos.',
        rating: 8,
        best: ['Claridad'],
        worst: ['Breve'],
        verdict: 'Recomendable.',
        author: 'Autor',
        pages: 100,
        status: 'PUBLISHED',
      }),
    )
    .attach('image', png, { filename: 'editor.png', contentType: 'image/png' });
  assert.equal(editorial.status, 201, JSON.stringify(editorial.body));
  assert.equal(editorial.body.createdByUserId, editor.user.id);
  // 3: No users, moderation or hard deletion for EDITOR.
  assert.equal((await call(editor, 'get', '/api/admin/users')).status, 403);
  assert.equal((await call(editor, 'get', '/api/admin/community/reports')).status, 403);
  assert.equal((await role(editor, reader, 'ADMIN')).status, 403);
  assert.equal(
    (await call(editor, 'delete', `/api/admin/content/${editorial.body.id}`, { version: 1 }))
      .status,
    403,
  );
  const content = (await agent.get('/api/content')).body.find((c) => c.id !== editorial.body.id);
  const review = await call(reader, 'post', `/api/content/${content.id}/reviews`, {
    rating: 4,
    body: 'Opinión del lector.',
    containsSpoilers: false,
  });
  assert.equal(review.status, 201);
  const reply = await call(reader, 'post', `/api/reviews/${review.body.id}/replies`, {
    body: 'Respuesta original.',
    containsSpoilers: false,
  });
  // 4: Moderation doesn't suspend/ban users; they can publish again.
  assert.equal(
    (
      await call(admin, 'patch', `/api/admin/community/replies/${reply.body.id}`, {
        status: 'HIDDEN',
      })
    ).status,
    200,
  );
  assert.equal((await prisma.user.findUnique({ where: { id: reader.user.id } })).status, 'ACTIVE');
  assert.equal(
    (
      await call(reader, 'post', `/api/reviews/${review.body.id}/replies`, {
        body: 'Nueva respuesta.',
        containsSpoilers: false,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await call(admin, 'patch', `/api/admin/community/reviews/${review.body.id}`, {
        status: 'HIDDEN',
      })
    ).status,
    200,
  );
  assert.equal((await prisma.user.findUnique({ where: { id: reader.user.id } })).status, 'ACTIVE');
  await call(admin, 'patch', `/api/admin/community/reviews/${review.body.id}`, {
    status: 'PUBLISHED',
  });
  const otherContent = (await agent.get('/api/content')).body.find(
    (c) => c.id !== content.id && c.id !== editorial.body.id,
  );
  assert.equal(
    (
      await call(reader, 'post', `/api/content/${otherContent.id}/reviews`, {
        rating: 4,
        body: 'Puedo publicar nuevamente.',
        containsSpoilers: false,
      })
    ).status,
    201,
  );
  // 5: Independent ban blocks existing tokens and new logins.
  assert.equal((await status(admin, reader, 'BANNED')).status, 200);
  assert.equal(
    (
      await call(reader, 'post', `/api/reviews/${review.body.id}/replies`, {
        body: 'Bloqueada.',
        containsSpoilers: false,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await agent
        .post('/api/auth/login')
        .send({ email: reader.user.email, password: 'roles-test-password' })
    ).status,
    403,
  );
  await status(admin, reader, 'ACTIVE');
  await status(admin, reader, 'SUSPENDED');
  assert.equal((await call(reader, 'post', `/api/reviews/${review.body.id}/helpful`)).status, 403);
  await status(admin, reader, 'ACTIVE');
  // 6: ADMIN cannot change any SUPER_ADMIN or grant that role.
  assert.equal((await role(admin, second, 'USER')).status, 403);
  assert.equal((await status(admin, second, 'BANNED')).status, 403);
  assert.equal((await role(admin, reader, 'SUPER_ADMIN')).status, 403);
  assert.equal((await role(admin, admin, 'SUPER_ADMIN')).status, 403);
  // 7,8: Owner promotes without reissuing reader's token. Permissions come from DB.
  assert.equal((await role(owner, reader, 'EDITOR')).status, 200);
  assert.equal((await call(reader, 'get', '/api/admin/content')).status, 200);
  assert.equal((await role(owner, reader, 'ADMIN')).status, 200);
  assert.equal((await call(reader, 'get', '/api/admin/users')).status, 200);
  await role(owner, reader, 'USER');
  assert.equal((await call(reader, 'get', '/api/admin/content')).status, 403);
  // 9: Owner can manage another owner; own role/status always protected.
  assert.equal((await status(owner, second, 'SUSPENDED')).status, 200);
  assert.equal((await status(owner, second, 'ACTIVE')).status, 200);
  assert.equal((await role(owner, second, 'ADMIN')).status, 200);
  assert.equal((await role(owner, second, 'SUPER_ADMIN')).status, 200);
  assert.equal((await role(owner, owner, 'USER')).status, 403);
  // 10: Last active owner cannot be removed. Parallel owners cannot remove each other.
  const ownerStatuses = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN', id: { not: owner.user.id } },
    select: { id: true, status: true },
  });
  await prisma.user.updateMany({
    where: { role: 'SUPER_ADMIN', id: { not: owner.user.id } },
    data: { status: 'SUSPENDED' },
  });
  assert.equal((await role(owner, owner, 'USER')).status, 403);
  assert.equal((await status(admin, owner, 'BANNED')).status, 403);
  for (const u of ownerStatuses)
    await prisma.user.update({ where: { id: u.id }, data: { status: u.status } });
  const raceA = await create('race_owner_a', 'SUPER_ADMIN'),
    raceB = await create('race_owner_b', 'SUPER_ADMIN');
  const race = await Promise.all([role(raceA, raceB, 'USER'), role(raceB, raceA, 'USER')]);
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 403]);
  // 11: One token, public profile/preferences/community plus administration.
  assert.equal((await call(owner, 'get', '/api/auth/me')).body.id, owner.user.id);
  assert.equal((await call(owner, 'get', '/api/users/me')).body.id, owner.user.id);
  assert.equal(
    (
      await call(owner, 'post', `/api/reviews/${review.body.id}/replies`, {
        body: 'El propietario participa.',
        containsSpoilers: false,
      })
    ).status,
    201,
  );
  const detail = await call(owner, 'get', `/api/admin/users/${reader.user.id}`);
  assert.equal(detail.status, 200);
  assert.ok(detail.body._count.replies >= 2);
  assert.ok(!('passwordHash' in detail.body));
  assert.ok(
    (
      await call(owner, 'get', '/api/admin/users?q=roles_reader&role=USER&status=ACTIVE')
    ).body.items.some((u) => u.id === reader.user.id),
  );
  const logs = await prisma.adminAuditLog.findMany({ where: { targetUserId: reader.user.id } });
  for (const action of [
    'ROLE_CHANGED',
    'USER_BANNED',
    'USER_SUSPENDED',
    'USER_REACTIVATED',
    'COMMUNITY_REVIEW_HIDDEN',
    'COMMUNITY_REPLY_HIDDEN',
  ])
    assert.ok(
      logs.some((l) => l.action === action),
      action,
    );
  assert.ok(
    logs
      .filter((l) => l.action === 'ROLE_CHANGED')
      .every((l) => l.metadata.previous && l.metadata.next),
  );
  // Old audiences rejected, no second administrative session can survive migration.
  for (const audience of ['entre-lineas-admin', 'entre-lineas-user']) {
    const old = jwt.sign({}, config.JWT_SECRET, {
      ...tokenOptions,
      audience,
      subject: owner.user.id,
    });
    assert.equal(
      (await agent.get('/api/admin/content').set('Authorization', `Bearer ${old}`)).status,
      401,
    );
  }
  await call(owner, 'delete', `/api/admin/content/${editorial.body.id}`, {
    version: editorial.body.version,
  });
  console.log(
    'Permisos: 12 casos (logout en navegador), escalamiento, sesión única, auditoría y concurrencia verificados.',
  );
}
