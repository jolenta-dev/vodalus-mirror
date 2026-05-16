import * as esbuild from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function walkTs(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkTs(p, files);
    else if (name.endsWith('.ts')) files.push(p);
  }
  return files;
}

const clientEntries = walkTs('src/client');

const clientCtx = await esbuild.context({
  entryPoints: clientEntries,
  outdir: 'public/client',
  outbase: 'src/client',
  platform: 'browser',
  sourcemap: true,
  bundle: false,
});

const serverCtx = await esbuild.context({
  entryPoints: ['src/server/index.ts'],
  outfile: 'dist/server.js',
  platform: 'node',
  format: 'cjs',
  sourcemap: true,
  bundle: true,
  external: [
    'express',
    'better-sqlite3',
    'ws',
    'bcrypt',
    'cookie-parser',
    'cookie',
    'cookie-signature',
  ],
});

await clientCtx.watch();
await serverCtx.watch();
console.log('watching src/client and src/server');
