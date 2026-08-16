/*
 * SystemJS named register extension
 * Supports System.register('name', [..deps..], function (_export, _context) { ... })
 *
 * Names are written to the registry as-is
 * System.register('x', ...) can be imported as System.import('x')
 */
import type { SystemJSLoader } from '../types';

(function (global: any) {
  var System = global.System;
  setRegisterRegistry(System);
  var systemJSPrototype: SystemJSLoader = System.constructor.prototype;
  var constructor = System.constructor;
  var SystemJS: any = function (this: any) {
    constructor.call(this);
    setRegisterRegistry(this);
  };
  SystemJS.prototype = systemJSPrototype;
  System.constructor = SystemJS;

  var firstNamedDefine: any, firstName: string | null | undefined;

  function setRegisterRegistry(systemInstance: any) {
    systemInstance.registerRegistry = Object.create(null);
    systemInstance.namedRegisterAliases = Object.create(null);
  }

  var register = systemJSPrototype.register;
  systemJSPrototype.register = function (this: any, name: any, deps: any, declare: any, metas: any) {
    if (typeof name !== 'string')
      return register.apply(this, arguments as any);
    var define = [deps, declare, metas];
    this.registerRegistry[name] = define;
    if (!firstNamedDefine) {
      firstNamedDefine = define;
      firstName = name;
    }
    Promise.resolve().then(function () {
      firstNamedDefine = null;
      firstName = null;
    });
    return register.apply(this, [deps, declare, metas]);
  } as any;

  var resolve = systemJSPrototype.resolve;
  systemJSPrototype.resolve = function (this: any, id, parentURL) {
    try {
      // Prefer import map (or other existing) resolution over the registerRegistry
      return resolve.call(this, id, parentURL);
    } catch (err) {
      if (id in this.registerRegistry) {
        return this.namedRegisterAliases[id] || id;
      }
      throw err;
    }
  };

  var instantiate = systemJSPrototype.instantiate;
  systemJSPrototype.instantiate = function (this: any, url, firstParentUrl, meta) {
    var result = this.registerRegistry[url];
    if (result) {
      this.registerRegistry[url] = null;
      return result;
    } else {
      return instantiate.call(this, url, firstParentUrl, meta);
    }
  };

  var getRegister = systemJSPrototype.getRegister;
  systemJSPrototype.getRegister = function (this: any, url) {
    // Calling getRegister() because other extras need to know it was called so they can perform side effects
    var register = getRegister.call(this, url);

    if (firstName && url) {
      this.namedRegisterAliases[firstName] = url;
    }
    var result = firstNamedDefine || register;
    firstNamedDefine = null;
    firstName = null;
    return result;
  }
})(typeof self !== 'undefined' ? self : global);
