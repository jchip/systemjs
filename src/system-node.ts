import './features/resolve';
import './features/registry';
import './features/fetch-load';
import './features/node-fetch';
import './extras/global';

import { REGISTRY, systemJSPrototype } from './system-core';
import { BASE_URL, baseUrl, resolveAndComposeImportMap, IMPORT_MAP } from './common';
import type { RawImportMap, SystemJSLoader } from './types';

export const System: SystemJSLoader = global.System;

// typed any: used as a computed loader property key (see BASE_URL / IMPORT_MAP)
const IMPORT_MAP_PROMISE: any = Symbol();

systemJSPrototype.prepareImport = function () {
  return this[IMPORT_MAP_PROMISE];
};

const originalResolve = systemJSPrototype.resolve;
systemJSPrototype.resolve = function () {
  if (!this[IMPORT_MAP]) {
    // Allow for basic URL resolution before applyImportMap is called
    this[IMPORT_MAP] = { imports: {}, scopes: {} };
  }
  return originalResolve.apply(this, arguments as any);
};
systemJSPrototype.addImportMap = function (newMap, mapBase){
  applyImportMap(this, newMap, mapBase)
}

export function applyImportMap(loader: SystemJSLoader, newMap: RawImportMap, mapBase?: string) {
  ensureValidSystemLoader(loader);
  loader[IMPORT_MAP] = loader[IMPORT_MAP] || { imports: {}, scopes: {} };
  resolveAndComposeImportMap(newMap, mapBase || baseUrl!, loader[IMPORT_MAP]);
  loader[IMPORT_MAP_PROMISE] = Promise.resolve();
}

export function setBaseUrl(loader: SystemJSLoader, url: string) {
  ensureValidSystemLoader(loader);
  loader[BASE_URL] = new URL(url).href;
}

function ensureValidSystemLoader (loader: SystemJSLoader) {
  if (!loader[REGISTRY])
    throw new Error('A valid SystemJS instance must be provided');
}
