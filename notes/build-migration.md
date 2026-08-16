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

## Known differences vs chomp (verified 2026-08-16, SJS-6/SJS-7)

- No incremental/cached builds — chomp skipped up-to-date targets; `rollup -c` always rebuilds everything (~5s total).
- `.min.js.map` now maps back to the TS sources through the whole rollup pipeline; chomp's maps only covered the minify step (unminified dist → min). Richer, but map files differ from committed ones.
- ~~Unverified API assumptions~~ both verified working: `exec({ cmd, env })` env vars reach the child (tsx/WATCH_MODE), and ncc programmatic `{ esm: false }` emits CJS (node suite passes against the output).

## Verification results (SJS-6, run on macOS / Node 26 / headless Chrome)

- `fyn install` → `xrun build` → `xrun typecheck` → `xrun test` all pass: browser suite (server + headless Chrome hit `/done`), internal 173 passing / 1 pending, node 7 passing.
- **All `.min.js` outputs are byte-identical to the committed dist** after two fixes (SJS-7):
  - newer terser 5.x flipped the `format.wrap_func_args` default to false — now pinned `true` in rollup.config.js;
  - the TS conversion had made a boolean-to-number coercion explicit (`? 1 : 0`) in common.ts `resolveIfNotPlainOrUrl` — reverted to the implicit coercion via an erased cast.
- Unminified dist bundles differ from committed only in comment text (TS source comments); `system-node.cjs` differs because committed one was built by ncc 0.34 from the old JS. Committed dist left untouched — refreshing it is a release-time decision.
- Gotcha: `rollup -c` does NOT fail on TS type errors (`onwarn(){}` swallows @rollup/plugin-typescript diagnostics) — but `xrun build:node` does (ncc aborts on them), and `xrun typecheck` is the real guard. Keep typecheck in CI if build ordering ever changes.
