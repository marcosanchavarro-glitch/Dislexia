import { PrismaClient } from '@prisma/client';
import { getConfig } from '../src/config.js';
import { createImageService, drainDeletions } from '../src/images.js';
const prisma = new PrismaClient();
try {
  await drainDeletions(prisma, createImageService(getConfig()));
  console.log('Cola de imágenes procesada.');
} finally {
  await prisma.$disconnect();
}
