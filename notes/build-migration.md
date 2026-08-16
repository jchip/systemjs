# Build migration: chomp → npm scripts / xrun + Rollup

Follow-up to [ts-conversion.md](./ts-conversion.md), same branch. Replaces the chomp task runner with standard JS tooling (user-selected: xrun orchestration, Rollup output-level terser, full chomp removal).

## Mapping

| chomp task | replacement |
|---|---|
| `dist/system.js` / `dist/s.js` / `dist/extras/*.js` rollup templates | `rollup.config.js` — 10 configs (system, s, 8 extras), each with a plain + `.min.js` output |
| `dist/##.min.js` terser template (+ `terser.js` extension) | output-level `rollup-plugin-terser` (bumped `^5.3` → `^7.0.2` so it uses terser 5, matching what chomp ran); options ported verbatim; `.min.js` outputs get `sourcemap: true` |
| `#PJSON_VERSION` banner interpolation | banner built from `require('./package.json').version` in the rollup config |
| `dist/system-node.cjs` ncc template | `scripts/build-node.mjs` via `@vercel/ncc` programmatic API (bumped `^0.34` → `^0.38.1` for TS 5 support, needed for `moduleResolution: "Bundler"`) |
| `footprint` template | `scripts/footprint.mjs` (raw/gzip/brotli of system.min.js + s.min.js) |
| task graph / env (`test`, `test:*`, WATCH_MODE, NODE_OPTIONS) | `xrun-tasks.js` (`@xarc/run` devDep); package.json scripts delegate: `npm test` → `xrun test` |
| chomp-action steps in CI | removed; `.github/workflows/test.yml` runs `npm test`; size-impact's `reportFileSizeImpact` default build command (`npm run build`) still resolves |

`chompfile.toml` and `terser.js` deleted. README contributing section updated.

## Known differences vs chomp (acceptable, verify in SJS-6)

- No incremental/cached builds — chomp skipped up-to-date targets; `rollup -c` always rebuilds everything (~seconds at this size).
- `.min.js.map` now maps back to the TS sources through the whole rollup pipeline; chomp's maps only covered the minify step (unminified dist → min). Richer, but map files will differ.
- Min files: chomp wrote `code + "\n"`; rollup/terser handles final newline itself — possible 1-byte diff.
- Unverified API assumptions: `exec({ cmd, env })` form for @xarc/run env vars; ncc programmatic `{ esm: false }` option name.
