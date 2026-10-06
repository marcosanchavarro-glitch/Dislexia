import { PrismaClient } from '@prisma/client';
import { getConfig } from './config.js';
import { createApp } from './app.js';
import { createImageService, drainDeletions } from './images.js';
const config = getConfig();
const prisma = new PrismaClient();
await prisma.$connect();
const images = createImageService(config);
const app = createApp({ prisma, images, config });
const server = app.listen(config.PORT, '0.0.0.0', () =>
  console.log(`API disponible en puerto ${config.PORT}`),
);
let cleaning = false;
const cleanup = async () => {
  if (cleaning) return;
  cleaning = true;
  try {
    await drainDeletions(prisma, images);
  } catch {
    console.error('Limpieza de imágenes pendiente.');
  } finally {
    cleaning = false;
  }
};
void cleanup();
const interval = setInterval(cleanup, 60000);
interval.unref();
const stop = () => {
  clearInterval(interval);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
