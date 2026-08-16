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

// The global System instance installed by system-core
declare var System: import('./types').SystemJSLoader;

// Worker global, without pulling in the full webworker lib (conflicts with DOM)
declare function importScripts(...urls: string[]): void;

interface HTMLScriptElement {
  // sp marker = systemjs processed
  sp?: boolean;
  fetchPriority?: string;
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
