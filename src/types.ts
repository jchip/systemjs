/*
 * Shared type definitions for the SystemJS source.
 *
 * Note the loader keeps per-module state in "load records" whose properties
 * are single letters to minimize the built payload — LoadRecord documents
 * their meaning. Capital letters are promise-valued.
 */

export type ModuleNamespace = { [exportName: string]: any };

export type ImporterSetter = (ns: ModuleNamespace) => void;

// The _export function passed to a System.register declaration
export type ExportFn = (nameOrBindings: string | ModuleNamespace, value?: any) => any;

// import.meta shape created by createContext
export interface SystemContext {
  url: string;
  resolve(id: string, parentUrl?: string): Promise<string>;
}

// Second argument to a System.register declare function
export interface DeclareContext {
  import(id: string, meta?: any): Promise<ModuleNamespace>;
  meta: SystemContext;
}

export interface Declaration {
  setters?: Array<ImporterSetter | undefined>;
  execute?: () => any;
}

export type DeclareFn = (_export: ExportFn, context?: DeclareContext) => Declaration;

// A System.register registration: [deps, declare, metas?]
export type Registration = [string[], DeclareFn, any[]?];

export interface LoadRecord {
  id: string;
  /** importerSetters — setter functions registered to this dependency, retained to add more later */
  i: Array<ImporterSetter | undefined>;
  /** module namespace object */
  n: ModuleNamespace;
  /** extra module information for import assertions, shape like { assert: { type: 'xyz' } } */
  m: any;
  /** instantiate promise */
  I: Promise<any> | undefined;
  /** link promise */
  L: Promise<any> | undefined;
  /** whether the module has hoisted exports */
  h: boolean;
  /** dependency load records, populated on instantiate completion */
  d: LoadRecord[] | undefined;
  /** execution function; null means executed or executing */
  e: (() => any) | null | undefined;
  /** the execution error, if any */
  er: any;
  /** in the case of top-level await, the execution promise; null indicates completion */
  E: Promise<any> | null | undefined;
  /** promise for top-level completion (set to the namespace itself once executed) */
  C: Promise<ModuleNamespace> | ModuleNamespace | undefined;
  /** parent instantiator / executor */
  p: LoadRecord | undefined;
}

export interface Registry {
  [id: string]: LoadRecord;
}

export interface PackageMap {
  [specifier: string]: string | null;
}

export interface ScopeMap {
  [scopeUrl: string]: PackageMap;
}

// Fully-resolved internal import map — all sections present
export interface ImportMap {
  imports: PackageMap;
  scopes: ScopeMap;
  depcache: { [url: string]: string[] };
  integrity: { [url: string]: string };
}

// Raw (user-provided JSON) import map
export interface RawImportMap {
  imports?: PackageMap;
  scopes?: ScopeMap;
  depcache?: { [url: string]: string[] };
  integrity?: { [url: string]: string };
}

/*
 * Minimal structural fetch response — covers both a real fetch Response and
 * the partial emulation returned by the Node fetch hook.
 */
export interface FetchResult {
  ok?: boolean;
  status: number;
  statusText?: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  json?(): Promise<any>;
}

/*
 * The SystemJS loader. Built by prototype extension: system-core defines the
 * base, and each feature/extra module patches or wraps methods on
 * systemJSPrototype. Hooks installed by optional feature files are still
 * declared required here — which of them exist at runtime depends on the
 * build (system.js vs s.js vs system-node.cjs).
 */
export interface SystemJSLoader {
  /* core */
  import(id: string, parentUrl?: string | object, meta?: object): Promise<ModuleNamespace>;
  createContext(parentId: string): SystemContext;
  /** onload(err, id, deps, isErrSource) handler for tracing / hot-reloading (dev builds only) */
  onload(err: any, id: string, deps: string[] | undefined, isErrSource: boolean): void;
  register(deps: string[] | string, declare?: DeclareFn | string[], metas?: any[] | DeclareFn): void;
  getRegister(url?: string): Registration | undefined;

  /* resolution / instantiation hooks */
  prepareImport(doProcessScripts?: boolean): Promise<unknown> | void;
  resolve(id: string, parentUrl?: string, meta?: object): string;
  instantiate(url: string, firstParentUrl?: string, meta?: object): Registration | Promise<Registration | undefined> | undefined;
  shouldFetch(url?: string, parent?: string, meta?: object): boolean;
  fetch(url: any, init?: any): Promise<FetchResult>;
  createScript(url: string): HTMLScriptElement;

  /* import maps */
  addImportMap(newMap: RawImportMap, mapBase?: string): void;
  getImportMap(): ImportMap;

  /* registry API (features/registry) */
  get(id: string): ModuleNamespace | null | undefined;
  set(id: string, module: ModuleNamespace): ModuleNamespace | false;
  has(id: string): boolean;
  delete(id: string): false | (() => false | void);
  entries(): IterableIterator<[string, ModuleNamespace]>;
}
