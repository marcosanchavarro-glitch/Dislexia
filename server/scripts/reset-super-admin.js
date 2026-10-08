import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

// Explicit operator command only: never invoked by normal application startup.
const prisma = new PrismaClient();
try {
  const email = process.env.RESET_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.RESET_SUPER_ADMIN_PASSWORD;
  const requestId = process.env.RESET_SUPER_ADMIN_REQUEST_ID?.trim();
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password) > 72 ||
    !requestId ||
    !/^[a-zA-Z0-9_-]{8,80}$/.test(requestId)
  ) {
    throw new Error(
      'Configurá RESET_SUPER_ADMIN_EMAIL, RESET_SUPER_ADMIN_PASSWORD (12 caracteres; máximo 72 bytes) y RESET_SUPER_ADMIN_REQUEST_ID (8–80 letras, números, guiones).',
    );
  }
  const hasSessionVersion = Prisma.dmmf.datamodel.models
    .find((m) => m.name === 'User')
    .fields.some((f) => f.name === 'sessionVersion');
  const hash = await bcrypt.hash(password, 12);
  const changed = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`;
    const user = await tx.user.findUnique({
      where: { email },
      select: { id: true, role: true, status: true },
    });
    if (!user || user.role !== 'SUPER_ADMIN' || user.status !== 'ACTIVE')
      throw new Error(
        'La cuenta debe existir y ser Super Admin activo. No se crean cuentas ni se modifican roles.',
      );
    const previous = await tx.adminAuditLog.findFirst({
      where: {
        targetUserId: user.id,
        action: 'OWNER_PASSWORD_RESET',
        metadata: { path: ['requestId'], equals: requestId },
      },
    });
    if (previous) return false;
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        ...(hasSessionVersion ? { sessionVersion: { increment: 1 } } : {}),
      },
      select: { id: true },
    });
    await tx.adminAuditLog.create({
      data: {
        actorUserId: user.id,
        targetUserId: user.id,
        action: 'OWNER_PASSWORD_RESET',
        metadata: { requestId, source: 'operator-console' },
      },
    });
    return true;
  });
  console.log(
    changed
      ? 'Contraseña del Super Admin actualizada; cuenta, rol y perfil conservados.'
      : 'Solicitud ya aplicada: contraseña conservada. Retirá el comando temporal de recuperación.',
  );
} catch (error) {
  // Never print Prisma diagnostics or environment values from this command.
  console.error(
    error.message.startsWith('Configurá') || error.message.startsWith('La cuenta debe')
      ? error.message
      : 'No se pudo restablecer la contraseña. No se muestran datos privados.',
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
