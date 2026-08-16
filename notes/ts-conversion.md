# TypeScript conversion exploration (SJS-1)

Branch: `explore/typescript-conversion`. Converts all of `src/` (22 files, ~1.5k LOC) to TypeScript with real types, under a **zero behavior / zero emit change** constraint: the browser payload is size-golfed ES5, so only *erasable* TS syntax was added (annotations, `as` casts, non-null `!`, `this:` params, `import type`, generic type args). Type-stripping the `.ts` files reproduces the original `.js` almost byte-for-byte.

## Commits

| Ticket | Commit | Scope |
|---|---|---|
| SJS-2 | 8c26d40 | tsconfig, `src/types.ts`, `src/globals.d.ts`, core (err-msg, common, system-core) |
| SJS-5 | b7a0f7d | entry points, chompfile TS wiring, devDeps, internal-test imports → `.ts` + tsx |
| SJS-3 | 5db9747 | 8 `src/features/*` files |
| SJS-4 | 21d4904 | 8 `src/extras/*` files + extras members on `SystemJSLoader` |
| SJS-1 | e02296b | remove the 22 converted `.js` sources |

## Key typing decisions

- **`src/types.ts`** is the hub: `LoadRecord` documents the size-golfed single-letter load-record fields (`i/n/m/I/L/h/d/e/er/E/C/p`); `SystemJSLoader` declares the full prototype surface including hooks installed by feature/extra files (required members for build-dependent hooks, optional members for extras-installed state like `registerRegistry`, `transform`, `wasmModules`).
- **Runtime-conditional keys** (`REGISTRY`, `BASE_URL`, `IMPORT_MAP` are `Symbol()` or a string depending on `hasSymbol`) cannot be typed statically → declared `any`, which lets `loader[REGISTRY]` index without casts. This is the biggest typing concession.
- **Prototype-mutation architecture** types cleanly: assigning function expressions to `systemJSPrototype.method` gets contextual param + `this` typing from the interface, so most implementations needed no annotations at all.
- The `SystemJS` constructor stays a plain function declaration; the single `new` site is `new (SystemJS as any)()`.
- `process.env.SYSTEM_PRODUCTION/SYSTEM_BROWSER` (rollup-replace compile-time flags), Node built-ins, and DOM augmentations (`script.sp`, `fetchPriority`, relaxed `onerror`, `RequestInit.passThrough/meta`) live in `src/globals.d.ts` — no `@types/node` dependency.
- Relative imports are extensionless (`'../common'`); internal tests import `../src/*.ts` and run through `tsx` (added to `NODE_OPTIONS` in the chompfile).

## Deliberate deviations from byte-parity (all flagged)

1. `common.ts` resolveIfNotPlainOrUrl: `parentUrl[parentProtocol.length] === '/'` used as a number → rewritten `(... ? 1 : 0)`. Same semantics; TS forbids boolean arithmetic. Unminified dist diff only; terser output essentially unchanged.
2. `node-fetch.ts`: `async url =>` became `async (url: any): Promise<FetchResult> =>` (needed for contextual typing). Node-only file, never in the minified browser payload.
3. `system-core.ts`: `function SystemJS ()` gained a `this:` param; `new SystemJS()` gained an erasable cast.

## Build integration (unverified — see risks)

- chompfile rollup tasks: deps switched to `.ts`, `@rollup/plugin-typescript` (with `noEmit = false` override) inserted before `@rollup/plugin-replace`.
- devDeps added: `@rollup/plugin-typescript@^8.5`, `typescript@^5.4`, `tslib`, `tsx`.
- `dist/system-node.cjs` (ncc task) now points at `src/system-node.ts` — ncc supports TS entries.

## Open risks / verification plan (SJS-6, blocked on tool approval)

SafeShell blocked `chomp`, `node`, and `deno` in the authoring session, so nothing has been type-checked or built yet. To verify:

1. `fyn install` (chomp itself is not installed globally; `fyn add --dev chomp` or install it separately)
2. `nvx tsc --noEmit` — expected friction points: the `onerror: any` augmentation vs lib.dom (TS2717), `(System.fetch || fetch)(...)` union call, `[].forEach.call` under strictBindCallApply, tuple casts, `var` definite-assignment for `baseUrl`/`baseOrigin`, `Response` satisfying the structural `FetchResult`.
3. `chomp build`, then diff `dist/` against the pre-conversion build (expect: identical minified output modulo deviation #1; unminified output differs only by stripped-type whitespace artifacts).
4. `chomp test` (browser suite needs the test server; internal + node suites are mocha).
5. ncc risk: if its bundled TypeScript predates 5.0 it will reject `"moduleResolution": "Bundler"` — fallback is a relaxed tsconfig override for the node build or upgrading `@vercel/ncc`.
