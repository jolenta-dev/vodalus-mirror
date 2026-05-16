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

const browserOpts = {
  platform: 'browser',
  sourcemap: true,
  bundle: false,
};

const sharedEntries = walkTs('src/client/shared');
const pageEntries = walkTs('src/client/pages');
const indevEntries = walkTs('src/client/indev');

const contexts = [];

if (sharedEntries.length > 0) {
  contexts.push(
    await esbuild.context({
      entryPoints: sharedEntries,
      outdir: 'assets/javascript',
      outbase: 'src/client/shared',
      ...browserOpts,
    })
  );
}

if (pageEntries.length > 0) {
  contexts.push(
    await esbuild.context({
      entryPoints: pageEntries,
      outdir: 'pages',
      outbase: 'src/client/pages',
      ...browserOpts,
    })
  );
}

if (indevEntries.length > 0) {
  contexts.push(
    await esbuild.context({
      entryPoints: indevEntries,
      outdir: 'indev',
      outbase: 'src/client/indev',
      ...browserOpts,
    })
  );
}

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

contexts.push(serverCtx);

for (const ctx of contexts) await ctx.watch();
console.log('watching src/client → assets/javascript, pages, indev; src/server → dist');
