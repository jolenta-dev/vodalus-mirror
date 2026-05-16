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

if (sharedEntries.length === 0 && pageEntries.length === 0 && indevEntries.length === 0) {
  console.error('no client entry points under src/client');
  process.exit(1);
}

if (sharedEntries.length > 0) {
  await esbuild.build({
    entryPoints: sharedEntries,
    outdir: 'assets/javascript',
    outbase: 'src/client/shared',
    ...browserOpts,
  });
}

if (pageEntries.length > 0) {
  await esbuild.build({
    entryPoints: pageEntries,
    outdir: 'pages',
    outbase: 'src/client/pages',
    ...browserOpts,
  });
}

if (indevEntries.length > 0) {
  await esbuild.build({
    entryPoints: indevEntries,
    outdir: 'indev',
    outbase: 'src/client/indev',
    ...browserOpts,
  });
}
