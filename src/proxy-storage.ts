import { proxy, subscribe } from "valtio";

type ProxyValidKey = string;

export interface PersistedClient<T extends object> {
  timestamp: number;
  version: number;
  clientState?: T;
}

interface Persister<T extends object> {
  persistClient: (persistClient: PersistedClient<T>) => void;
  restoreClient: () => PersistedClient<T> | undefined;
  removeClient: () => void;
}

interface ProxyPersistClientRestore<T extends object> {
  maxAge?: number;
  version?: number;
  persister?: Persister<T>;
}

interface ProxyPersistClientSave<T extends object> {
  version?: number;
  clientState?: T;
  persister?: Persister<T>;
}

interface Storage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface CreateStoragePersisterOptions<T extends object> {
  /** The storage client used for setting and retrieving items from cache.
   * For SSR pass in `undefined`. Note that window.localStorage can be
   * `null` in Android WebViews depending on how they are configured.
   * @default `localStorage`
   */
  storage?: Storage;
  /** The key to use when storing the cache */
  key: ProxyValidKey;
  /** To avoid spamming,
   * pass a time in ms to throttle saving the cache to disk */
  throttleTime?: number;
  /**
   * How to serialize the data to storage.
   * @default `JSON.stringify`
   */
  serialize?: (persistedQuery?: PersistedClient<T>) => string;
  /**
   * How to deserialize the data from storage.
   * @default `JSON.parse`
   */
  deserialize?: (cachedString: string) => PersistedClient<T>;
}

export interface ProxyWithStorageOptions<T extends object>
  extends CreateStoragePersisterOptions<T>,
    ProxyPersistClientRestore<T>,
    Omit<ProxyPersistClientSave<T>, "clientState"> {}

export function createProxyStoragePersister<T extends object>({
  storage,
  key = "PROXY_OFFLINE_CACHE",
  throttleTime = 1000,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
}: CreateStoragePersisterOptions<T>): Persister<T> {
  if (storage) {
    const trySave = (
      persistedClient: PersistedClient<T>
    ): Error | undefined => {
      try {
        storage.setItem(key, serialize(persistedClient));
        return;
      } catch (error) {
        return error as Error;
      }
    };
    return {
      persistClient: throttle((persistedClient) => {
        const client: PersistedClient<T> | undefined = persistedClient;
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
      },
    };
  }

  return {
    persistClient: noop,
    restoreClient: () => undefined,
    removeClient: noop,
  };
}

function proxyPersistClientRestore<T extends object>({
  maxAge = 1000 * 60 * 60 * 24,
  version = 0,
  persister,
}: ProxyPersistClientRestore<T>) {
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

function proxyPersistClientSave<T extends object>({
  clientState,
  version = 0,
  persister,
}: ProxyPersistClientSave<T>) {
  const persistedClient: PersistedClient<T> = {
    timestamp: Date.now(),
    version,
    clientState,
  };

  persister?.persistClient(persistedClient);
}

export function proxyWithStorage<T extends object>(
  initialObject: T,
  {
    key,
    maxAge,
    version,
    throttleTime,
    deserialize,
    serialize,
    storage = typeof window !== "undefined" ? localStorage : undefined,
    persister = createProxyStoragePersister<T>({
      key,
      throttleTime,
      deserialize,
      serialize,
      storage,
    }),
  }: ProxyWithStorageOptions<T>
): T & { persister?: Persister<T> } {
  const clientState = proxy<T & { persister?: Persister<T> }>(
    Object.assign(
      {},
      initialObject,
      proxyPersistClientRestore<T>({ persister, version, maxAge }) || {}
    )
  );

  clientState.persister = persister;

  subscribe(clientState, () => {
    proxyPersistClientSave<T>({ clientState, persister, version });
  });

  return clientState;
}

function noop() {}

function throttle<TArgs extends Array<any>>(
  func: (...args: TArgs) => any,
  wait = 100
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let params: TArgs;
  return function (...args: TArgs) {
    params = args;
    if (timer === null) {
      timer = setTimeout(() => {
        func(...params);
        timer = null;
      }, wait);
    }
  };
}
