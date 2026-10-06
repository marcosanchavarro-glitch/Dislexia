import jwt from 'jsonwebtoken';
import { HttpError } from './errors.js';
export const tokenOptions = {
  algorithm: 'HS256',
  expiresIn: '2h',
  issuer: 'entre-lineas-api',
  audience: 'entre-lineas-admin',
};
export function authMiddleware(prisma, secret) {
  return async (req, res, next) => {
    try {
      const header = req.get('Authorization') || '';
      if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Iniciá sesión para continuar.');
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
      const admin = await prisma.admin.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true },
      });
      if (!admin) throw new HttpError(401, 'Esta cuenta ya no está disponible.');
      req.admin = admin;
      next();
    } catch (error) {
      next(error);
    }
  };
}
