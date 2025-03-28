// @ts-nocheck

/*
 * Script instantiation loading
 */
import { hasDocument } from '../common';
import { systemJSPrototype } from '../system-core';
import { errMsg } from '../err-msg';
import { importMap } from './import-maps';

let baseOrigin: string = '';
let lastWindowErrorUrl: string;
let lastWindowError;

if (hasDocument) {
  window.addEventListener('error', function (evt) {
    lastWindowErrorUrl = evt.filename;
    lastWindowError = evt.error;
  });
  baseOrigin = location.origin;
}

systemJSPrototype.createScript = function (url) {
  const script = document.createElement('script');
  script.async = true;
  // Only add cross origin for actual cross origin
  // this is because Safari triggers for all
  // - https://bugs.webkit.org/show_bug.cgi?id=171566
  if (url.indexOf(baseOrigin + '/')) script.crossOrigin = 'anonymous';
  const integrity = importMap.integrity[url];
  if (integrity) script.integrity = integrity;
  script.src = url;
  return script;
};

systemJSPrototype.getCurrentScript = function () {
  if (hasDocument) {
    let lastScript: any = document.currentScript;
    if (!lastScript) {
      const scripts = document.querySelectorAll('script[src]');
      lastScript = scripts[scripts.length - 1];
    }
    return lastScript;
  }

  return null;
};

// Auto imports -> script tags can be inlined directly for load phase
const autoImports = {};
function clearAutoImport(autoImport) {
  if (autoImport) {
    clearTimeout(autoImport.t);
    delete autoImports[autoImport.s];
  }
}

const systemRegister = systemJSPrototype.register;
systemJSPrototype.register = function (deps, declare) {
  if (hasDocument && document.readyState === 'loading' && typeof deps !== 'string') {
    const lastScript = this.getCurrentScript();
    const src = lastScript && lastScript.src;
    if (src && !autoImports[src]) {
      const loader = this;
      autoImports[src] = {
        s: src,
        // if this is already a System load, then the instantiate has already begun
        // so this re-import has no consequence
        t: setTimeout(function () {
          autoImports[src].r = [deps, declare];
          loader.import(src);
        }),
      };
    }
  }
  return systemRegister.call(this, deps, declare);
};

systemJSPrototype.instantiate = function (url, firstParentUrl) {
  const autoImport = autoImports[url];
  if (autoImport && autoImport.r) {
    clearAutoImport(autoImport);
    return autoImport.r;
  }
  const loader = this;
  return Promise.resolve(systemJSPrototype.createScript(url)).then(function (script) {
    return new Promise(function (resolve, reject) {
      script.addEventListener('error', function () {
        clearAutoImport(autoImports[url]);
        reject(
          Error(
            errMsg(
              3,
              process.env.SYSTEM_PRODUCTION
                ? [url, firstParentUrl].join(', ')
                : 'Error loading ' + url + (firstParentUrl ? ' from ' + firstParentUrl : ''),
            ),
          ),
        );
      });
      script.addEventListener('load', function () {
        clearAutoImport(autoImports[url]);
        document.head.removeChild(script);
        // Note that if an error occurs that isn't caught by this if statement,
        // that getRegister will return null and a "did not instantiate" error will be thrown.
        if (lastWindowErrorUrl === url) {
          reject(lastWindowError);
        } else {
          resolve(loader.getRegister(url));
        }
      });
      document.head.appendChild(script);
    });
  });
};
