/*
 * Builds dist/system-node.cjs with @vercel/ncc (programmatic API so the
 * output path/naming is identical on all platforms).
 */
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const ncc = createRequire(import.meta.url)('@vercel/ncc');

const entry = fileURLToPath(new URL('../src/system-node.ts', import.meta.url));

const { code } = await ncc(entry, { esm: false, minify: false, sourceMap: false, quiet: true });

mkdirSync(new URL('../dist', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/system-node.cjs', import.meta.url), code);
console.log('dist/system-node.cjs written');
