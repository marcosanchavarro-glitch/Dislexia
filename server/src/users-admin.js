import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from './errors.js';
import { roles, selfUser, canManageUser, requireMinimumRole } from './auth.js';

export async function changeUser(prisma, actorId, targetId, field, value) {
  return prisma.$transaction(async (db) => {
    // Serialize all role/status changes, including concurrent last-owner changes.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(8042026)`;
    const actor = await db.user.findUnique({ where: { id: actorId } });
    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target) throw new HttpError(404, 'Usuario no encontrado.');
    if (!actor || !canManageUser(actor, target))
      throw new HttpError(403, 'No podés administrar esta cuenta.');
    if (actorId === targetId) throw new HttpError(403, 'No podés cambiar tu propio rol o estado.');
    if (field === 'role' && value === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN')
      throw new HttpError(403, 'Solo un Super Admin puede asignar ese rol.');
    if (
      target.role === 'SUPER_ADMIN' &&
      target.status === 'ACTIVE' &&
      ((field === 'role' && value !== 'SUPER_ADMIN') ||
        (field === 'status' && value !== 'ACTIVE')) &&
      (await db.user.count({ where: { role: 'SUPER_ADMIN', status: 'ACTIVE' } })) <= 1
    )
      throw new HttpError(409, 'Debe permanecer al menos un Super Admin activo.');
    if (target[field] === value)
      return db.user.findUnique({ where: { id: targetId }, select: selfUser });
    const updated = await db.user.update({
      where: { id: targetId },
      data: { [field]: value },
      select: selfUser,
    });
    await db.adminAuditLog.create({
      data: {
        actorUserId: actorId,
        targetUserId: targetId,
        action:
          field === 'role'
            ? 'ROLE_CHANGED'
            : { ACTIVE: 'USER_REACTIVATED', SUSPENDED: 'USER_SUSPENDED', BANNED: 'USER_BANNED' }[
                value
              ],
        metadata: { field, previous: target[field], next: value },
      },
    });
    return updated;
  });
}

export function usersAdminRouter({ prisma, requireAuth }) {
  const router = Router();
  router.use('/admin/users', requireAuth, requireMinimumRole('ADMIN'));
  router.get('/admin/users', async (req, res) => {
    const { q, role, status, page } = z
      .object({
        q: z.string().trim().max(100).default(''),
        role: z.enum(roles).optional(),
        status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
        page: z.coerce.number().int().min(1).max(10000).default(1),
      })
      .parse(req.query);
    const where = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...selfUser,
          _count: {
            select: { reviews: true, replies: true, reports: true, editorialContent: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * 20,
        take: 20,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({
      items: items.map((u) => ({
        ...u,
        canManage: canManageUser(req.user, u) && u.id !== req.user.id,
      })),
      total,
      page,
    });
  });
  router.get('/admin/users/:id', async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...selfUser,
        _count: { select: { reviews: true, replies: true, reports: true, editorialContent: true } },
        reviews: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { content: { select: { title: true, slug: true } } },
        },
        replies: { take: 20, orderBy: { createdAt: 'desc' } },
        reports: { take: 20, orderBy: { createdAt: 'desc' } },
        editorialContent: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, status: true, slug: true },
        },
        auditTargets: {
          take: 30,
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { username: true } } },
        },
      },
    });
    if (!user) throw new HttpError(404, 'Usuario no encontrado.');
    res.json({ ...user, canManage: canManageUser(req.user, user) && user.id !== req.user.id });
  });
  for (const field of ['role', 'status'])
    router.patch(`/admin/users/:id/${field}`, async (req, res) => {
      const data = z
        .object({ [field]: z.enum(field === 'role' ? roles : ['ACTIVE', 'SUSPENDED', 'BANNED']) })
        .strict()
        .parse(req.body);
      res.json(await changeUser(prisma, req.user.id, req.params.id, field, data[field]));
    });
  return router;
}
