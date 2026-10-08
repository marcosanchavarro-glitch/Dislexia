import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { readFile } from 'node:fs/promises';
const prisma = new PrismaClient();
try {
  const name = process.env.SUPER_ADMIN_NAME?.trim();
  const username = process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase();
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const configured = [name, username, email, password].some(Boolean);
  if (configured) {
    if (
      !name ||
      !username ||
      !/^[a-z0-9_]{3,30}$/.test(username) ||
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password ||
      password.length < 12 ||
      Buffer.byteLength(password) > 72
    )
      throw new Error(
        'Definí SUPER_ADMIN_NAME, SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL y SUPER_ADMIN_PASSWORD (12 caracteres; máximo 72 bytes).',
      );
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.role !== 'SUPER_ADMIN')
      throw new Error(
        'La cuenta ya existe: asigná su rol desde otro Super Admin. El seed no eleva cuentas existentes.',
      );
    if (!existing)
      await prisma.user.create({
        data: {
          name,
          username,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
      });
  } else if (!(await prisma.user.count({ where: { role: 'SUPER_ADMIN', status: 'ACTIVE' } }))) {
    throw new Error('Configurá las variables SUPER_ADMIN_* para crear el propietario inicial.');
  }
  const items = JSON.parse(await readFile(new URL('./demo.json', import.meta.url), 'utf8'));
  await prisma.$transaction(
    items.map((item) =>
      prisma.content.upsert({ where: { id: item.id }, create: item, update: {} }),
    ),
  );
  console.log(
    `Seed completado: ${items.length} reseñas iniciales; cuentas existentes conservadas.`,
  );
  if (process.env.NODE_ENV === 'development' && process.env.SEED_COMMUNITY === 'true') {
    const demoPassword = process.env.DEMO_USER_PASSWORD;
    if (!demoPassword || demoPassword.length < 12 || Buffer.byteLength(demoPassword) > 72)
      throw new Error('Definí DEMO_USER_PASSWORD de 12 a 72 bytes para los usuarios ficticios.');
    for (const [index, username] of ['lectora_demo', 'cinefilo_demo'].entries()) {
      const user = await prisma.user.upsert({
        where: { username },
        create: {
          username,
          email: `${username}@example.test`,
          passwordHash: await bcrypt.hash(demoPassword, 12),
          bio: 'Cuenta ficticia de desarrollo.',
        },
        update: {},
      });
      await prisma.communityReview.upsert({
        where: { userId_contentId: { userId: user.id, contentId: items[0].id } },
        create: {
          userId: user.id,
          contentId: items[0].id,
          rating: index ? 4 : 5,
          title: 'Una historia para conversar',
          body: 'Me gustó cómo construye sus personajes y nos invita a mirar desde otro lugar.',
          containsSpoilers: false,
        },
        update: {},
      });
    }
    console.log('Comunidad ficticia creada solo para desarrollo.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
