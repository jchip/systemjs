/*
 * Ambient declarations for the SystemJS build environment.
 *
 * process.env.SYSTEM_PRODUCTION / SYSTEM_BROWSER are compile-time flags
 * replaced by @rollup/plugin-replace — they never exist at runtime.
 */

declare var process: {
  env: {
    SYSTEM_PRODUCTION?: string;
    SYSTEM_BROWSER?: string;
  };
  cwd(): string;
};

declare var global: any;

/*
 * Type-only brands for the loader's private state keys. At runtime each key is
 * a fresh Symbol (or a one-character string when Symbol is unavailable), so it
 * cannot be a real `unique symbol` — these ambient consts exist purely so the
 * keys can be given distinct types and declared as slots on SystemJSLoader.
 * They have no runtime value and must never be referenced in emitted code.
 */
declare const REGISTRY_KEY: unique symbol;
declare const BASE_URL_KEY: unique symbol;
declare const IMPORT_MAP_KEY: unique symbol;
declare const IMPORT_MAP_PROMISE_KEY: unique symbol;

// The global System instance installed by system-core
declare var System: import('./types').SystemJSLoader;

// Worker global, without pulling in the full webworker lib (conflicts with DOM)
declare function importScripts(...urls: string[]): void;

interface HTMLScriptElement {
  // sp marker = systemjs processed
  sp?: boolean;
  fetchPriority?: string;
  // loosened from OnErrorEventHandler so the zero-arg invocation in
  // import-maps.ts needs no emit-visible cast
  onerror: any;
}

interface RequestInit {
  // Marks a fetch as not-a-SystemJS-module for the module-types extra
  passThrough?: boolean;
  meta?: any;
  priority?: string;
}

// Minimal module shapes for the Node build (no @types/node dependency)
declare module 'source-map-support' {
  const sourceMapSupport: { install(): void };
  export default sourceMapSupport;
}

declare module 'node-fetch' {
  const fetch: (url: any, init?: any) => Promise<any>;
  export default fetch;
}

declare module 'fs' {
  export const promises: {
    readFile(path: string): Promise<{ toString(): string }>;
  };
}

declare module 'url' {
  export function fileURLToPath(url: string): string;
}
