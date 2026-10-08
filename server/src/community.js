import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { HttpError } from './errors.js';
import { authMiddleware, selfUser, tokenOptions, requireActive } from './auth.js';
import { profileUpload, enqueueDeletion, drainDeletions } from './images.js';
const publicUser = { id: true, username: true, avatarUrl: true, bio: true, createdAt: true };

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, 'Usá letras, números o guion bajo.');
const plain = (max) =>
  z
    .string()
    .trim()
    .min(1, 'Escribí un texto.')
    .max(max)
    .refine((v) => !/<[^>]*>/.test(v), 'No se admite HTML.');
const credentials = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(1)
      .max(72)
      .refine((v) => Buffer.byteLength(v) <= 72, 'Contraseña demasiado larga.'),
  })
  .strict();
const registration = credentials
  .extend({
    username,
    password: z
      .string()
      .min(12, 'Usá al menos 12 caracteres.')
      .max(72)
      .refine((v) => Buffer.byteLength(v) <= 72, 'Contraseña demasiado larga.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });
const reviewInput = z
  .object({
    rating: z.number().int().min(1).max(5),
    title: z
      .string()
      .trim()
      .max(120)
      .refine((v) => !/<[^>]*>/.test(v), 'No se admite HTML.')
      .optional(),
    body: plain(5000),
    containsSpoilers: z.boolean(),
  })
  .strict();
const replyInput = reviewInput.pick({ body: true, containsSpoilers: true });
const preferences = z
  .object({
    fontMode: z.enum(['default', 'accessible']),
    fontSize: z.enum(['normal', 'large', 'larger']),
    contrast: z.enum(['normal', 'soft', 'high']),
    spacing: z.boolean(),
  })
  .strict();
const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes. Esperá 15 minutos.' },
  });
const pageInput = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  order: z.enum(['recent', 'rating', 'helpful', 'oldest']).default('recent'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  q: z.string().max(100).optional(),
});
export function communityRouter({ prisma, config, images, requireAdmin }) {
  const router = Router();
  const dummy = bcrypt.hashSync(randomUUID(), 12);
  const auth = (optional = false) => authMiddleware(prisma, config.JWT_SECRET, optional);
  const active = requireActive;
  const content = async (id) => {
    const c = await prisma.content.findFirst({ where: { id, status: 'PUBLISHED' } });
    if (!c) throw new HttpError(404, 'Contenido no disponible.');
    return c;
  };
  const review = async (id) => {
    const r = await prisma.communityReview.findFirst({
      where: { id, status: 'PUBLISHED', content: { status: 'PUBLISHED' } },
    });
    if (!r) throw new HttpError(404, 'Reseña no disponible.');
    return r;
  };
  const own = async (model, id, userId) => {
    const r = await prisma[model].findUnique({ where: { id } });
    if (!r) throw new HttpError(404, 'No existe.');
    if (r.userId !== userId) throw new HttpError(403, 'Solo podés modificar tus publicaciones.');
    if (r.status !== 'PUBLISHED')
      throw new HttpError(403, 'Esta publicación está moderada o eliminada.');
    if (model === 'reviewReply') await review(r.reviewId);
    else await content(r.contentId);
    return r;
  };
  const session = (u) => ({
    token: jwt.sign({}, config.JWT_SECRET, { ...tokenOptions, subject: u.id }),
    user: u,
  });
  router.post(['/auth/register', '/users/register'], limiter(10), async (req, res) => {
    const data = registration.parse(req.body);
    const conflicts = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (conflicts)
      throw new HttpError(409, 'Revisá los datos de registro.', {
        ...(conflicts.email === data.email
          ? { email: ['Ese email ya está registrado.'] }
          : { username: ['Ese nombre ya está en uso.'] }),
      });
    const u = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 12),
      },
      select: selfUser,
    });
    res.status(201).set('Cache-Control', 'no-store').json(session(u));
  });
  router.post(['/auth/login', '/users/login'], limiter(10), async (req, res) => {
    const d = credentials.parse(req.body);
    const u = await prisma.user.findUnique({ where: { email: d.email } });
    const ok = await bcrypt.compare(d.password, u?.passwordHash || dummy);
    if (!u || !ok) throw new HttpError(401, 'Email o contraseña incorrectos.');
    if (u.status === 'BANNED') throw new HttpError(403, 'Esta cuenta está baneada.');
    res
      .set('Cache-Control', 'no-store')
      .json(session(await prisma.user.findUnique({ where: { id: u.id }, select: selfUser })));
  });
  router.get(['/auth/me', '/users/me'], auth(), (req, res) => res.json(req.user));
  router.get('/users/me/accessibility', auth(), (req, res) =>
    res.json(
      req.user.accessibility || {
        fontMode: 'default',
        fontSize: 'normal',
        contrast: 'normal',
        spacing: false,
      },
    ),
  );
  router.put('/users/me/accessibility', auth(), async (req, res) => {
    const d = preferences.parse(req.body);
    res.json(
      await prisma.accessibilitySettings.upsert({
        where: { userId: req.user.id },
        create: { ...d, userId: req.user.id },
        update: d,
      }),
    );
  });
  router.put('/users/me', auth(), active, profileUpload, async (req, res) => {
    const d = z
      .object({
        username,
        bio: z
          .string()
          .trim()
          .max(500)
          .refine((v) => !/<[^>]*>/.test(v), 'No se admite HTML.'),
      })
      .strict()
      .parse(req.body);
    const previous = await prisma.user.findUnique({ where: { id: req.user.id } });
    const image = req.file ? await images.upload(req.file) : null;
    try {
      const u = await prisma.$transaction(async (db) => {
        const updated = await db.user.update({
          where: { id: req.user.id },
          data: {
            ...d,
            ...(image ? { avatarUrl: image.imageUrl, avatarPublicId: image.imagePublicId } : {}),
          },
          select: selfUser,
        });
        if (image) await enqueueDeletion(db, previous.avatarPublicId);
        return updated;
      });
      if (image) void drainDeletions(prisma, images).catch(() => {});
      res.json(u);
    } catch (e) {
      if (image) {
        await enqueueDeletion(prisma, image.imagePublicId);
        void drainDeletions(prisma, images).catch(() => {});
      }
      throw e;
    }
  });
  const include = {
    user: { select: publicUser },
    _count: { select: { helpful: true, replies: { where: { status: 'PUBLISHED' } } } },
  };
  router.get('/users/:username', async (req, res) => {
    const u = await prisma.user.findUnique({
      where: { username: req.params.username.toLowerCase() },
      select: publicUser,
    });
    if (!u) throw new HttpError(404, 'Perfil no encontrado.');
    const where = { userId: u.id, status: 'PUBLISHED', content: { status: 'PUBLISHED' } };
    const [reviews, count, helpful] = await Promise.all([
      prisma.communityReview.findMany({
        where,
        include: { ...include, content: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.communityReview.count({ where }),
      prisma.reviewHelpful.count({ where: { review: where } }),
    ]);
    res.json({ ...u, reviews, reviewCount: count, helpfulCount: helpful });
  });
  router.get('/content/:contentId/reviews', auth(true), async (req, res) => {
    await content(req.params.contentId);
    const p = pageInput.parse(req.query);
    const all = { contentId: req.params.contentId, status: 'PUBLISHED' };
    const where = { ...all, ...(p.rating ? { rating: p.rating } : {}) };
    const ordering = {
      recent: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      rating: { rating: 'desc' },
      helpful: { helpful: { _count: 'desc' } },
    };
    const [items, total, stats, mine] = await Promise.all([
      prisma.communityReview.findMany({
        where,
        include: {
          ...include,
          ...(req.user
            ? { helpful: { where: { userId: req.user.id }, select: { userId: true } } }
            : {}),
        },
        orderBy: [ordering[p.order], { id: 'asc' }],
        skip: (p.page - 1) * 10,
        take: 10,
      }),
      prisma.communityReview.count({ where }),
      prisma.communityReview.aggregate({ where: all, _avg: { rating: true }, _count: true }),
      req.user
        ? prisma.communityReview.findUnique({
            where: { userId_contentId: { userId: req.user.id, contentId: req.params.contentId } },
          })
        : null,
    ]);
    res.json({
      items: items.map(({ helpful, ...r }) => ({ ...r, helpfulByMe: !!helpful?.length })),
      total,
      page: p.page,
      count: stats._count,
      average: stats._avg.rating,
      mine: mine ? { id: mine.id, status: mine.status } : null,
    });
  });
  router.post('/content/:contentId/reviews', auth(), active, limiter(30), async (req, res) => {
    await content(req.params.contentId);
    const d = reviewInput.parse(req.body);
    res.status(201).json(
      await prisma.communityReview.create({
        data: { ...d, userId: req.user.id, contentId: req.params.contentId },
      }),
    );
  });
  for (const [path, model, schema] of [
    ['reviews', 'communityReview', reviewInput],
    ['replies', 'reviewReply', replyInput],
  ]) {
    router.put(`/${path}/:id`, auth(), active, limiter(60), async (req, res) => {
      await own(model, req.params.id, req.user.id);
      res.json(
        await prisma[model].update({ where: { id: req.params.id }, data: schema.parse(req.body) }),
      );
    });
    router.delete(`/${path}/:id`, auth(), active, async (req, res) => {
      await own(model, req.params.id, req.user.id);
      await prisma[model].update({ where: { id: req.params.id }, data: { status: 'DELETED' } });
      res.status(204).end();
    });
  }
  router.get('/reviews/:id/replies', async (req, res) => {
    await review(req.params.id);
    const { page } = pageInput.parse(req.query);
    const where = { reviewId: req.params.id, status: 'PUBLISHED' };
    res.json({
      items: await prisma.reviewReply.findMany({
        where,
        include: { user: { select: publicUser } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * 20,
        take: 20,
      }),
      total: await prisma.reviewReply.count({ where }),
    });
  });
  router.post('/reviews/:id/replies', auth(), active, limiter(60), async (req, res) => {
    await review(req.params.id);
    res.status(201).json(
      await prisma.reviewReply.create({
        data: { ...replyInput.parse(req.body), reviewId: req.params.id, userId: req.user.id },
      }),
    );
  });
  for (const method of ['post', 'delete'])
    router[method]('/reviews/:id/helpful', auth(), active, async (req, res) => {
      await review(req.params.id);
      const key = { userId: req.user.id, reviewId: req.params.id };
      if (method === 'post')
        await prisma.reviewHelpful.upsert({
          where: { userId_reviewId: key },
          create: key,
          update: {},
        });
      else await prisma.reviewHelpful.deleteMany({ where: key });
      res.json({ count: await prisma.reviewHelpful.count({ where: { reviewId: req.params.id } }) });
    });
  router.post('/reports', auth(), active, limiter(20), async (req, res) => {
    const d = z
      .object({
        reviewId: z.string().min(1).max(100).optional(),
        replyId: z.string().min(1).max(100).optional(),
        reason: z.enum(['SPAM', 'OFFENSIVE', 'SPOILERS', 'OFF_TOPIC', 'OTHER']),
        description: z.string().trim().max(500).optional(),
      })
      .strict()
      .refine((v) => !!v.reviewId !== !!v.replyId, 'Seleccioná una publicación.')
      .refine((v) => v.reason !== 'OTHER' || !!v.description, 'Explicá el motivo.')
      .parse(req.body);
    if (d.reviewId) await review(d.reviewId);
    else {
      const r = await prisma.reviewReply.findFirst({
        where: { id: d.replyId, status: 'PUBLISHED' },
      });
      if (!r) throw new HttpError(404, 'Respuesta no disponible.');
      await review(r.reviewId);
    }
    res
      .status(201)
      .json(await prisma.report.create({ data: { ...d, reporterUserId: req.user.id } }));
  });
  router.use('/admin/community', requireAdmin, (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  for (const [path, model] of [
    ['reviews', 'communityReview'],
    ['replies', 'reviewReply'],
    ['reports', 'report'],
  ]) {
    router.get(`/admin/community/${path}`, async (req, res) => {
      const { page, q } = pageInput.parse(req.query);
      const where = q
        ? path === 'reports'
          ? { description: { contains: q, mode: 'insensitive' } }
          : { body: { contains: q, mode: 'insensitive' } }
        : {};
      const relations =
        path === 'reviews'
          ? { user: { select: publicUser }, content: { select: { title: true, slug: true } } }
          : path === 'replies'
            ? { user: { select: publicUser }, review: { select: { id: true, body: true } } }
            : path === 'reports'
              ? { reporter: { select: publicUser }, review: true, reply: true }
              : undefined;
      res.json({
        items: await prisma[model].findMany({
          where,
          include: relations,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * 20,
          take: 20,
        }),
        total: await prisma[model].count({ where }),
      });
    });
    router.patch(`/admin/community/${path}/:id`, async (req, res) => {
      const options =
        path === 'reports'
          ? ['PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN']
          : ['PUBLISHED', 'HIDDEN', 'DELETED'];
      const { status } = z
        .object({ status: z.enum(options) })
        .strict()
        .parse(req.body);
      const updated = await prisma.$transaction(async (db) => {
        const previous = await db[model].findUnique({ where: { id: req.params.id } });
        if (!previous) throw new HttpError(404, 'Publicación no encontrada.');
        const result = await db[model].update({
          where: { id: previous.id },
          data: {
            status,
            ...(path === 'reports' ? { resolvedAt: status === 'PENDING' ? null : new Date() } : {}),
          },
        });
        await db.adminAuditLog.create({
          data: {
            actorUserId: req.user.id,
            targetUserId: previous.userId || previous.reporterUserId,
            action:
              path === 'reports'
                ? 'REPORT_UPDATED'
                : 'COMMUNITY_' +
                  (path === 'reviews' ? 'REVIEW' : 'REPLY') +
                  '_' +
                  (status === 'HIDDEN'
                    ? 'HIDDEN'
                    : status === 'PUBLISHED'
                      ? 'RESTORED'
                      : 'DELETED'),
            metadata: {
              resourceId: previous.id,
              resourceType: path,
              contentId: previous.contentId || null,
              reviewId: previous.reviewId || null,
              previous: previous.status,
              next: status,
            },
          },
        });
        return result;
      });
      res.json(updated);
    });
  }
  return router;
}
