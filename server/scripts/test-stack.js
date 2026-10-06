import EmbeddedPostgres from 'embedded-postgres';
import { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { runIntegration } from '../tests/api.integration.js';
import { runCommunity } from '../tests/community.integration.js';
import { prepareImage } from '../src/images.js';
export async function runStack(browser = false) {
  const require = createRequire(import.meta.url);
  await mkdir('.test-db', { recursive: true });
  const databaseDir = await mkdtemp(resolve('.test-db', 'cluster-'));
  const password = randomBytes(24).toString('hex');
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password,
    port: 55432,
    persistent: true,
    onLog: () => {},
    onError: (msg) => console.error(String(msg)),
  });
  let prisma, server;
  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('entre_lineas_test');
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:55432/entre_lineas_test?schema=public`,
      JWT_SECRET: randomBytes(32).toString('hex'),
      CLIENT_URL: 'http://localhost:5173',
      ADMIN_NAME: 'Editor de pruebas',
      ADMIN_EMAIL: 'editor@example.test',
      ADMIN_PASSWORD: randomBytes(20).toString('hex'),
    };
    const run = (args) => {
      const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
      if (result.status !== 0) throw Error(`Falló ${args[0]}`);
    };
    run([require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
    run(['prisma/seed.js']);
    run(['prisma/seed.js']);
    prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
    const destroyed = [];
    const images = {
      async upload(file) {
        await prepareImage(file);
        return { imageUrl: '/covers/placeholder.svg', imagePublicId: `test/${randomUUID()}` };
      },
      async destroy(id) {
        destroyed.push(id);
      },
    };
    const config = { NODE_ENV: 'test', CLIENT_URL: env.CLIENT_URL, JWT_SECRET: env.JWT_SECRET };
    const app = createApp({ prisma, images, config });
    await runIntegration({
      app,
      prisma,
      images,
      destroyed,
      config,
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    });
    await runCommunity({ app, prisma, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
    if (browser) {
      server = app.listen(3001, '127.0.0.1');
      await once(server, 'listening');
      const clientRequire = createRequire(new URL('../../client/package.json', import.meta.url));
      const child = spawn(
        process.execPath,
        [clientRequire.resolve('@playwright/test/cli'), 'test'],
        {
          cwd: resolve('../client'),
          env: {
            ...env,
            STACK_TEST: 'true',
            TEST_ADMIN_EMAIL: env.ADMIN_EMAIL,
            TEST_ADMIN_PASSWORD: env.ADMIN_PASSWORD,
          },
          stdio: 'inherit',
        },
      );
      const [code] = await once(child, 'exit');
      if (code !== 0) throw Error('Fallaron pruebas del navegador.');
    }
    console.log('Integración PostgreSQL completada.');
  } finally {
    if (server) await new Promise((done) => server.close(done));
    if (prisma) await prisma.$disconnect();
    await pg.stop();
  }
}
