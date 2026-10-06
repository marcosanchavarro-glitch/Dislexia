import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { getConfig } from '../src/config.js';
getConfig();
if (process.env.RUN_MIGRATIONS !== 'false') {
  const require = createRequire(import.meta.url);
  const result = spawnSync(
    process.execPath,
    [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
    { stdio: 'inherit', env: process.env },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
await import('../src/index.js');
