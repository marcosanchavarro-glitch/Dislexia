import jwt from 'jsonwebtoken';
import { HttpError } from './errors.js';
export const roles = ['USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];
export const selfUser = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatarUrl: true,
  bio: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  accessibility: true,
};
export const tokenOptions = {
  algorithm: 'HS256',
  expiresIn: '2h',
  issuer: 'entre-lineas-api',
  audience: 'entre-lineas-session',
};
export function authMiddleware(prisma, secret, optional = false) {
  return async (req, res, next) => {
    try {
      const header = req.get('Authorization');
      if (!header && optional) return next();
      if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Iniciá sesión para continuar.');
      let payload;
      try {
        payload = jwt.verify(header.slice(7), secret, {
          algorithms: ['HS256'],
          issuer: tokenOptions.issuer,
          audience: tokenOptions.audience,
        });
      } catch {
        throw new HttpError(401, 'Tu sesión venció. Iniciá sesión nuevamente.');
      }
      if (typeof payload.sub !== 'string') throw new HttpError(401, 'Sesión inválida.');
      req.user = await prisma.user.findUnique({ where: { id: payload.sub }, select: selfUser });
      if (!req.user) throw new HttpError(401, 'Esta cuenta ya no está disponible.');
      res.set('Cache-Control', 'no-store');
      next();
    } catch (error) {
      next(error);
    }
  };
}
export const requireActive = (req, res, next) =>
  req.user?.status === 'ACTIVE'
    ? next()
    : next(
        new HttpError(
          403,
          'Tu cuenta no puede realizar esta acción mientras esté suspendida o baneada.',
        ),
      );
export function requireRole(...allowed) {
  return (req, res, next) =>
    req.user?.status === 'ACTIVE' && allowed.includes(req.user.role)
      ? next()
      : next(new HttpError(403, 'No tenés permisos para realizar esta acción.'));
}
export const requireMinimumRole = (minimum) => requireRole(...roles.slice(roles.indexOf(minimum)));
export function canManageUser(actor, target) {
  return (
    actor.status === 'ACTIVE' &&
    ['ADMIN', 'SUPER_ADMIN'].includes(actor.role) &&
    (actor.role === 'SUPER_ADMIN' || target.role !== 'SUPER_ADMIN')
  );
}
