/*
 * Prints raw/gzip/brotli sizes of the primary browser payloads
 * (replacement for the former chomp footprint template).
 */
import { readFileSync } from 'fs';
import { gzipSync, brotliCompressSync } from 'zlib';

for (const file of ['dist/system.min.js', 'dist/s.min.js']) {
  const buf = readFileSync(file);
  console.log(
    file + ': ' + buf.length + ' bytes raw, ' +
    gzipSync(buf).length + ' gzip, ' +
    brotliCompressSync(buf).length + ' brotli'
  );
}
