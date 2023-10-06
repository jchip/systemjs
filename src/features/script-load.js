/*
 * Script instantiation loading
 */
import { hasDocument } from '../common.js';
import { systemJSPrototype } from '../system-core.js';
import { errMsg } from '../err-msg.js';
import { importMap } from './import-maps.js';

if (hasDocument) {
  window.addEventListener('error', function (evt) {
    lastWindowErrorUrl = evt.filename;
    lastWindowError = evt.error;
  });
  var baseOrigin = location.origin;
}

systemJSPrototype.createScript = function (url) {
  var script = document.createElement('script');
  script.async = true;
  // Only add cross origin for actual cross origin
  // this is because Safari triggers for all
  // - https://bugs.webkit.org/show_bug.cgi?id=171566
  if (url.indexOf(baseOrigin + '/')) script.crossOrigin = 'anonymous';
  var integrity = importMap.integrity[url];
  if (integrity) script.integrity = integrity;
  script.src = url;
  return script;
};

systemJSPrototype.getCurrentScript = function () {
  if (hasDocument) {
    var lastScript = document.currentScript;
    if (!lastScript) {
      var scripts = document.querySelectorAll('script[src]');
      lastScript = scripts[scripts.length - 1];
    }
    return lastScript;
  }

  return null;
};

// Auto imports -> script tags can be inlined directly for load phase
var autoImports = {};
function clearAutoImport(autoImport) {
  if (autoImport) {
    clearTimeout(autoImport.t);
    delete autoImports[autoImport.s];
  }
}

var systemRegister = systemJSPrototype.register;
systemJSPrototype.register = function (deps, declare) {
  if (
    hasDocument &&
    document.readyState === 'loading' &&
    typeof deps !== 'string'
  ) {
    var lastScript = this.getCurrentScript();
    var src = lastScript && lastScript.src;
    if (src && !autoImports[src]) {
      var loader = this;
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

var lastWindowErrorUrl, lastWindowError;
systemJSPrototype.instantiate = function (url, firstParentUrl) {
  var autoImport = autoImports[url];
  if (autoImport && autoImport.r) {
    clearAutoImport(autoImport);
    return autoImport.r;
  }
  var loader = this;
  return Promise.resolve(systemJSPrototype.createScript(url)).then(
    function (script) {
      return new Promise(function (resolve, reject) {
        script.addEventListener('error', function () {
          clearAutoImport(autoImports[url]);
          reject(
            Error(
              errMsg(
                3,
                process.env.SYSTEM_PRODUCTION
                  ? [url, firstParentUrl].join(', ')
                  : 'Error loading ' +
                      url +
                      (firstParentUrl ? ' from ' + firstParentUrl : ''),
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
    },
  );
};
