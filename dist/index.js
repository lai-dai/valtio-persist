"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  createProxyStoragePersister: () => createProxyStoragePersister,
  proxyPersist: () => proxyPersist
});
module.exports = __toCommonJS(src_exports);

// src/proxy-persist.ts
var import_valtio = require("valtio");
function createProxyStoragePersister({
  storage,
  key = "PROXY_OFFLINE_CACHE",
  throttleTime = 1e3,
  serialize = JSON.stringify,
  deserialize = JSON.parse
}) {
  if (storage) {
    const trySave = (persistedClient) => {
      try {
        storage.setItem(key, serialize(persistedClient));
        return;
      } catch (error) {
        return error;
      }
    };
    return {
      persistClient: throttle((persistedClient) => {
        const client = persistedClient;
        trySave(client);
      }, throttleTime),
      restoreClient: () => {
        const cacheString = storage.getItem(key);
        if (!cacheString) {
          return;
        }
        return deserialize(cacheString);
      },
      removeClient: () => {
        storage.removeItem(key);
      }
    };
  }
  return {
    persistClient: noop,
    restoreClient: () => void 0,
    removeClient: noop
  };
}
function proxyPersistClientRestore({
  maxAge = 1e3 * 60 * 60 * 24,
  version = 0,
  persister
}) {
  try {
    const persistedClient = persister?.restoreClient();
    if (persistedClient) {
      if (persistedClient.timestamp) {
        const expired = Date.now() - persistedClient.timestamp > maxAge;
        if (expired || persistedClient.version !== version) {
          persister?.removeClient();
        } else {
          return persistedClient.clientState;
        }
      } else {
        persister?.removeClient();
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
    persister?.removeClient();
  }
}
function proxyPersistClientSave({
  clientState,
  version = 0,
  persister
}) {
  const persistedClient = {
    timestamp: Date.now(),
    version,
    clientState
  };
  persister?.persistClient(persistedClient);
}
function proxyPersist(initialObject, {
  key,
  maxAge,
  version,
  throttleTime,
  deserialize,
  serialize,
  storage = typeof window !== "undefined" ? localStorage : void 0,
  persister = createProxyStoragePersister({
    key,
    throttleTime,
    deserialize,
    serialize,
    storage
  })
}) {
  const clientState = (0, import_valtio.proxy)(
    Object.assign(
      {},
      initialObject,
      proxyPersistClientRestore({ persister, version, maxAge }) || {}
    )
  );
  clientState.persister = persister;
  (0, import_valtio.subscribe)(clientState, () => {
    proxyPersistClientSave({ clientState, persister, version });
  });
  return clientState;
}
function noop() {
}
function throttle(func, wait = 100) {
  let timer = null;
  let params;
  return function(...args) {
    params = args;
    if (timer === null) {
      timer = setTimeout(() => {
        func(...params);
        timer = null;
      }, wait);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createProxyStoragePersister,
  proxyPersist
});
//# sourceMappingURL=index.js.map