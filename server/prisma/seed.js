import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { readFile } from 'node:fs/promises';
const prisma = new PrismaClient();
try {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (
    !name ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password) > 72
  )
    throw new Error(
      'Definí ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD (12 caracteres como mínimo; 72 bytes como máximo).',
    );
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing)
    await prisma.admin.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
    });
  const items = JSON.parse(await readFile(new URL('./demo.json', import.meta.url), 'utf8'));
  await prisma.$transaction(
    items.map((item) =>
      prisma.content.upsert({ where: { id: item.id }, create: item, update: {} }),
    ),
  );
  console.log(
    `Seed completado: ${items.length} reseñas iniciales; administrador ${existing ? 'existente conservado' : 'creado'}.`,
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
