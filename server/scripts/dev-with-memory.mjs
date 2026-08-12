/**
 * Local development bootstrap that uses an in-memory MongoDB so you can run
 * the whole stack without installing MongoDB locally.
 *   - Starts MongoMemoryServer
 *   - Runs the seeder
 *   - Boots the real server (src/server.js)
 *
 * Usage: node scripts/dev-with-memory.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('jiva_dev');
console.log('[dev] In-memory MongoDB ready:', process.env.MONGO_URI);

// 1) Seed the database.
await new Promise((resolve, reject) => {
  const seed = spawn('node', ['src/seed/seed.js', '--reset'], {
    cwd: root,
    env: { ...process.env },
    stdio: 'inherit',
  });
  seed.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`seed failed ${code}`))));
});

// 2) Boot the real server (imports src/server.js which calls connectDB + listen).
const { default: _server } = await import(path.join(root, 'src/server.js'));

// Keep alive; forward shutdown.
process.on('SIGINT', async () => {
  await mongod.stop();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await mongod.stop();
  process.exit(0);
});
