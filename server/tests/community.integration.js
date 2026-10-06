import assert from 'node:assert/strict';
import request from 'supertest';
import sharp from 'sharp';
export async function runCommunity({ app, prisma, email, password }) {
  const agent = request(app);
  const content = (await agent.get('/api/content')).body[0];
  const register = async (username) => {
    const result = await agent.post('/api/users/register').send({
      username,
      email: `${username}@example.test`,
      password: 'community-test-password',
      confirmPassword: 'community-test-password',
    });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    assert.ok(!result.body.user.passwordHash);
    return result.body;
  };
  const a = await register('reader_a'),
    b = await register('reader_b');
  const auth = (u) => `Bearer ${u.token}`;
  assert.equal((await agent.get('/api/admin/content').set('Authorization', auth(a))).status, 401);
  assert.equal(
    (
      await agent
        .post('/api/users/login')
        .send({ email: 'reader_a@example.test', password: 'community-test-password' })
    ).status,
    200,
  );
  assert.equal(
    (
      await agent.post('/api/users/register').send({
        username: 'reader_a',
        email: 'another@example.test',
        password: 'community-test-password',
        confirmPassword: 'community-test-password',
      })
    ).status,
    409,
  );
  const payload = {
    rating: 4,
    title: 'Una mirada propia',
    body: 'Me gustó la historia.',
    containsSpoilers: false,
  };
  const result = await agent
    .post(`/api/content/${content.id}/reviews`)
    .set('Authorization', auth(a))
    .send(payload);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  const id = result.body.id;
  assert.equal(
    (
      await agent
        .post(`/api/content/${content.id}/reviews`)
        .set('Authorization', auth(a))
        .send(payload)
    ).status,
    409,
  );
  assert.equal(
    (await agent.put(`/api/reviews/${id}`).set('Authorization', auth(b)).send(payload)).status,
    403,
  );
  assert.equal(
    (await agent.delete(`/api/reviews/${id}`).set('Authorization', auth(b))).status,
    403,
  );
  assert.equal(
    (
      await agent
        .put(`/api/reviews/${id}`)
        .set('Authorization', auth(a))
        .send({ ...payload, containsSpoilers: true })
    ).status,
    200,
  );
  assert.equal(
    (
      await agent
        .put(`/api/reviews/${id}`)
        .set('Authorization', auth(a))
        .send({ ...payload, body: '<script>bad()</script>' })
    ).status,
    400,
  );
  const reply = await agent
    .post(`/api/reviews/${id}/replies`)
    .set('Authorization', auth(b))
    .send({ body: 'Otra mirada.', containsSpoilers: true });
  assert.equal(reply.status, 201);
  assert.equal(
    (
      await agent
        .put(`/api/replies/${reply.body.id}`)
        .set('Authorization', auth(a))
        .send({ body: 'Ataque', containsSpoilers: false })
    ).status,
    403,
  );
  assert.equal(
    (await agent.delete(`/api/replies/${reply.body.id}`).set('Authorization', auth(a))).status,
    403,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await agent.post(`/api/reviews/${id}/helpful`).set('Authorization', auth(b))).body.count,
      1,
    );
  assert.equal(
    (await agent.delete(`/api/reviews/${id}/helpful`).set('Authorization', auth(b))).body.count,
    0,
  );
  const report = await agent
    .post('/api/reports')
    .set('Authorization', auth(b))
    .send({ reviewId: id, reason: 'SPOILERS' });
  assert.equal(report.status, 201);
  const admin = await agent.post('/api/auth/login').send({ email, password });
  const adminAuth = `Bearer ${admin.body.token}`;
  assert.equal((await agent.get('/api/users/me').set('Authorization', adminAuth)).status, 401);
  assert.equal(
    (
      await agent
        .patch(`/api/admin/community/users/${b.user.id}`)
        .set('Authorization', auth(a))
        .send({ status: 'BANNED' })
    ).status,
    401,
  );
  assert.equal(
    (
      await agent
        .patch(`/api/admin/community/reviews/${id}`)
        .set('Authorization', adminAuth)
        .send({ status: 'HIDDEN' })
    ).status,
    200,
  );
  assert.equal((await agent.get(`/api/content/${content.id}/reviews`)).body.count, 0);
  assert.equal((await agent.get(`/api/reviews/${id}/replies`)).status, 404);
  assert.equal(
    (await agent.put(`/api/reviews/${id}`).set('Authorization', auth(a)).send(payload)).status,
    403,
  );
  assert.equal(
    (
      await agent
        .patch(`/api/admin/community/reports/${report.body.id}`)
        .set('Authorization', adminAuth)
        .send({ status: 'ACTION_TAKEN' })
    ).status,
    200,
  );
  assert.equal(
    (
      await agent
        .patch(`/api/admin/community/reviews/${id}`)
        .set('Authorization', adminAuth)
        .send({ status: 'PUBLISHED' })
    ).status,
    200,
  );
  for (const status of ['SUSPENDED', 'BANNED']) {
    await agent
      .patch(`/api/admin/community/users/${b.user.id}`)
      .set('Authorization', adminAuth)
      .send({ status });
    assert.equal(
      (
        await agent
          .post(`/api/reviews/${id}/replies`)
          .set('Authorization', auth(b))
          .send({ body: 'No permitido', containsSpoilers: false })
      ).status,
      403,
    );
    assert.equal(
      (await agent.post(`/api/reviews/${id}/helpful`).set('Authorization', auth(b))).status,
      403,
    );
    assert.equal(
      (
        await agent
          .post('/api/reports')
          .set('Authorization', auth(b))
          .send({ reviewId: id, reason: 'SPAM' })
      ).status,
      403,
    );
  }
  await agent
    .patch(`/api/admin/community/users/${b.user.id}`)
    .set('Authorization', adminAuth)
    .send({ status: 'ACTIVE' });
  const prefs = { fontMode: 'accessible', fontSize: 'large', contrast: 'high', spacing: true };
  assert.equal(
    (await agent.put('/api/users/me/accessibility').set('Authorization', auth(a)).send(prefs))
      .status,
    200,
  );
  assert.equal(
    (await agent.get('/api/users/me/accessibility').set('Authorization', auth(a))).body.fontSize,
    'large',
  );
  assert.equal(
    (
      await agent
        .put('/api/users/me')
        .set('Authorization', auth(a))
        .send({ username: 'reader_a_updated', bio: 'Me gustan los libros.' })
    ).status,
    200,
  );
  assert.equal(
    (
      await agent
        .put('/api/users/me')
        .set('Authorization', auth(a))
        .send({ username: 'reader_b', bio: '' })
    ).status,
    409,
  );
  const profile = await agent.get('/api/users/reader_a_updated');
  const avatar = await sharp({
    create: { width: 20, height: 20, channels: 3, background: '#527d62' },
  })
    .png()
    .toBuffer();
  const avatarResult = await agent
    .put('/api/users/me')
    .set('Authorization', auth(a))
    .field('username', 'reader_a_updated')
    .field('bio', 'Avatar validado')
    .attach('image', avatar, 'avatar.png');
  assert.equal(avatarResult.status, 200, JSON.stringify(avatarResult.body));
  assert.ok(avatarResult.body.avatarUrl);
  assert.equal(profile.body.reviewCount, 1);
  assert.ok(!profile.body.email);
  assert.ok(!profile.body.passwordHash);
  assert.equal(
    (await agent.delete(`/api/replies/${reply.body.id}`).set('Authorization', auth(b))).status,
    204,
  );
  assert.equal(
    (await agent.delete(`/api/reviews/${id}`).set('Authorization', auth(a))).status,
    204,
  );
  assert.equal((await prisma.communityReview.findUnique({ where: { id } })).status, 'DELETED');
  console.log(
    'Comunidad: autorización, perfiles, moderación, spoilers, votos y preferencias verificados.',
  );
}
