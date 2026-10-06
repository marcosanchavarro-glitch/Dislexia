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
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
