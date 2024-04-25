// src/proxy-storage.ts
import { proxy, subscribe } from "valtio";
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
function proxyWithStorage(initialObject, {
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
  const clientState = proxy(
    Object.assign(
      {},
      initialObject,
      proxyPersistClientRestore({ persister, version, maxAge }) || {}
    )
  );
  clientState.persister = persister;
  subscribe(clientState, () => {
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
export {
  createProxyStoragePersister,
  proxyWithStorage
};
//# sourceMappingURL=index.mjs.map