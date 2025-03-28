// @ts-nocheck

import { systemJSPrototype } from '../system-core';
import { REGISTRY } from '../common';
import { errMsg } from '../err-msg';

const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag;

systemJSPrototype.get = function (id) {
  const load = this[REGISTRY][id];
  if (load && load.e === null && !load.E) {
    if (load.er) return null;
    return load.n;
  }
};

systemJSPrototype.set = function (id, module) {
  if (!process.env.SYSTEM_PRODUCTION) {
    try {
      // No page-relative URLs allowed
      new URL(id);
    } catch (err) {
      console.warn(
        Error(errMsg('W3', '"' + id + '" is not a valid URL to set in the module registry')),
      );
    }
  }
  let ns;
  if (toStringTag && module[toStringTag] === 'Module') {
    ns = module;
  } else {
    ns = Object.assign(Object.create(null), module);
    if (toStringTag) Object.defineProperty(ns, toStringTag, { value: 'Module' });
  }

  const done = Promise.resolve(ns);

  const load =
    this[REGISTRY][id] ||
    (this[REGISTRY][id] = {
      id: id,
      i: [],
      h: false,
      d: [],
      e: null,
      er: undefined,
      E: undefined,
    });

  if (load.e || load.E) return false;

  Object.assign(load, {
    n: ns,
    I: undefined,
    L: undefined,
    C: done,
  });
  return ns;
};

systemJSPrototype.has = function (id) {
  const load = this[REGISTRY][id];
  return !!load;
};

// Delete function provided for hot-reloading use cases
systemJSPrototype.delete = function (id): any {
  const registry = this[REGISTRY];
  const load = registry[id];
  // in future we can support load.E case by failing load first
  // but that will require TLA callbacks to be implemented
  if (!load || (load.p && load.p.e !== null) || load.E) return false;

  let importerSetters = load.i;
  // remove from importerSetters
  // (release for gc)
  if (load.d) {
    load.d.forEach(function (depLoad) {
      const importerIndex = depLoad.i.indexOf(load);
      if (importerIndex !== -1) depLoad.i.splice(importerIndex, 1);
    });
  }
  delete registry[id];
  return function () {
    const load = registry[id];
    if (!load || !importerSetters || load.e !== null || load.E) return false;
    // add back the old setters
    importerSetters.forEach(function (setter) {
      load.i.push(setter);
      setter(load.n);
    });
    importerSetters = null;
    return true;
  };
};

const iterator = typeof Symbol !== 'undefined' && Symbol.iterator;

systemJSPrototype.entries = function () {
  const loader = this;
  const keys = Object.keys(loader[REGISTRY]);
  let index = 0;
  let ns;
  let key;

  const result = {
    next: function () {
      while ((key = keys[index++]) !== undefined && (ns = loader.get(key)) === undefined);
      return {
        done: key === undefined,
        value: key !== undefined && [key, ns],
      };
    },
  };

  result[iterator] = function () {
    return this;
  };

  return result;
};
