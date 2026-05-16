import * as esbuild from 'esbuild';

await esbuild.build({
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
