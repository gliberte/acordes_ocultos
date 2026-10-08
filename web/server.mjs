// Compatibility entry point: use the Astro server so middleware protects every route.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('.', import.meta.url));
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('./node_modules/astro/bin/astro.mjs', import.meta.url)),
  'dev', '--background', ...process.argv.slice(2),
], { cwd, stdio: 'inherit', env: process.env });
if (result.error) console.error('No se pudo iniciar Astro:', result.error.message);
process.exitCode = result.status ?? 1;
