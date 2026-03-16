import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '..');
const repoRoot = resolve(workspaceRoot, '../..');

config({ path: resolve(repoRoot, '.env') });

const prismaEntrypoint = resolve(repoRoot, 'node_modules/prisma/build/index.js');
const child = spawn(process.execPath, [prismaEntrypoint, ...process.argv.slice(2)], {
  cwd: workspaceRoot,
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
