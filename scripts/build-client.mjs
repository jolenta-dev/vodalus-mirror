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

const entryPoints = walkTs('src/client');
if (entryPoints.length === 0) {
  console.error('no client entry points under src/client');
  process.exit(1);
}

await esbuild.build({
  entryPoints,
  outdir: 'public/client',
  outbase: 'src/client',
  platform: 'browser',
  sourcemap: true,
  bundle: false,
});
