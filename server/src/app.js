import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { authMiddleware, tokenOptions } from './auth.js';
import { HttpError, errorHandler } from './errors.js';
import { typeValues, parseContent, parseVersion, loginSchema, statusSchema } from './validation.js';
import { upload, enqueueDeletion, drainDeletions } from './images.js';
const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'resena';
export function createApp({ prisma, images, config }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        cb(
          origin && origin !== new URL(config.CLIENT_URL).origin
            ? new HttpError(403, 'Origen no permitido.')
            : null,
          true,
        );
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 600,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Demasiadas solicitudes. Esperá unos minutos.' },
    }),
  );
  const requireAdmin = authMiddleware(prisma, config.JWT_SECRET);
  const cleanup = () =>
    drainDeletions(prisma, images).catch(() => console.error('Limpieza de imágenes pendiente.'));
  const compensateUpload = async (publicId) => {
    try {
      await images.destroy(publicId);
    } catch {
      await enqueueDeletion(prisma, publicId);
      void cleanup();
    }
  };
  const dummyHash = bcrypt.hashSync(randomUUID(), 12);
  app.get('/api/health', async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });
  const listPublic = async (req, res) => {
    const type = req.params.type || req.query.type;
    if (type && !typeValues.includes(type)) throw new HttpError(400, 'Categoría inválida.');
    const genre = req.query.genre;
    if (genre && (typeof genre !== 'string' || genre.length > 80))
      throw new HttpError(400, 'Género inválido.');
    const data = await prisma.content.findMany({
      where: { status: 'PUBLISHED', ...(type ? { type } : {}), ...(genre ? { genre } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(data.map(publicContent));
  };
  app.get('/api/content', listPublic);
  app.get('/api/content/type/:type', listPublic);
  app.get('/api/content/:slug', async (req, res) => {
    const item = await prisma.content.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
    });
    if (!item) throw new HttpError(404, 'Esta reseña ya no está publicada.');
    res.json(publicContent(item));
  });
  app.post(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Demasiados intentos. Esperá 15 minutos.' },
    }),
    async (req, res) => {
      const { email, password } = loginSchema.parse(req.body);
      const admin = await prisma.admin.findUnique({ where: { email } });
      const matches = await bcrypt.compare(password, admin?.passwordHash || dummyHash);
      if (!admin || !matches) throw new HttpError(401, 'Email o contraseña incorrectos.');
      res
        .set('Cache-Control', 'no-store')
        .json({
          token: jwt.sign({}, config.JWT_SECRET, { ...tokenOptions, subject: admin.id }),
          admin: { id: admin.id, name: admin.name, email: admin.email },
        });
    },
  );
  app.get('/api/auth/me', requireAdmin, (req, res) =>
    res.set('Cache-Control', 'no-store').json(req.admin),
  );
  app.use('/api/admin', requireAdmin, (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/admin/content', async (req, res) =>
    res.json(await prisma.content.findMany({ orderBy: { updatedAt: 'desc' } })),
  );
  app.get('/api/admin/content/:id', async (req, res) => {
    const item = await prisma.content.findUnique({ where: { id: req.params.id } });
    if (!item) throw new HttpError(404, 'La reseña no existe.');
    res.json(item);
  });
  app.post('/api/admin/content', upload, async (req, res) => {
    const data = parseContent(req.body);
    if (!req.file)
      throw new HttpError(400, 'Seleccioná una imagen para la nueva reseña.', {
        image: ['La imagen es obligatoria.'],
      });
    const image = await images.upload(req.file);
    let item;
    try {
      item = await prisma.content.create({
        data: { ...data, ...image, slug: `${slugify(data.title)}-${randomUUID().slice(0, 8)}` },
      });
    } catch (error) {
      await compensateUpload(image.imagePublicId);
      throw error;
    }
    res.status(201).json(item);
  });
  app.put('/api/admin/content/:id', upload, async (req, res) => {
    const data = parseContent(req.body);
    const version = parseVersion(req.body);
    const previous = await prisma.content.findUnique({ where: { id: req.params.id } });
    if (!previous) throw new HttpError(404, 'La reseña ya no existe.');
    if (previous.version !== version)
      throw new HttpError(409, 'La reseña cambió en otra sesión. Recargá antes de editar.');
    const image = req.file ? await images.upload(req.file) : null;
    let item;
    try {
      item = await prisma.$transaction(async (db) => {
        const changed = await db.content.updateMany({
          where: { id: previous.id, version },
          data: { ...data, ...(image || {}), version: { increment: 1 } },
        });
        if (!changed.count)
          throw new HttpError(409, 'La reseña cambió en otra sesión. Recargá antes de editar.');
        if (image) await enqueueDeletion(db, previous.imagePublicId);
        return db.content.findUnique({ where: { id: previous.id } });
      });
    } catch (error) {
      if (image) await compensateUpload(image.imagePublicId);
      throw error;
    }
    void cleanup();
    res.json(item);
  });
  app.patch('/api/admin/content/:id/status', async (req, res) => {
    const { status, version } = statusSchema.parse(req.body);
    const changed = await prisma.content.updateMany({
      where: { id: req.params.id, version },
      data: { status, version: { increment: 1 } },
    });
    if (!changed.count)
      throw new HttpError(409, 'La reseña cambió o ya no existe. Recargá el listado.');
    res.json(await prisma.content.findUnique({ where: { id: req.params.id } }));
  });
  app.delete('/api/admin/content/:id', async (req, res) => {
    const version = parseVersion(req.body);
    await prisma.$transaction(async (db) => {
      const previous = await db.content.findUnique({ where: { id: req.params.id } });
      if (!previous) throw new HttpError(404, 'La reseña ya no existe.');
      const deleted = await db.content.deleteMany({ where: { id: previous.id, version } });
      if (!deleted.count)
        throw new HttpError(409, 'La reseña cambió en otra sesión. Recargá el listado.');
      await enqueueDeletion(db, previous.imagePublicId);
    });
    void cleanup();
    res.status(204).end();
  });
  app.use((req, res, next) => next(new HttpError(404, 'La ruta solicitada no existe.')));
  app.use(errorHandler);
  return app;
}
function publicContent(item) {
  const { imagePublicId, version, ...publicItem } = item;
  return publicItem;
}
