type ProxyValidKey = string;
interface PersistedClient<T extends object> {
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
interface CreateStoragePersisterOptions<T extends object> {
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
interface ProxyWithStorageOptions<T extends object> extends CreateStoragePersisterOptions<T>, ProxyPersistClientRestore<T>, Omit<ProxyPersistClientSave<T>, "clientState"> {
}
declare function createProxyStoragePersister<T extends object>({ storage, key, throttleTime, serialize, deserialize, }: CreateStoragePersisterOptions<T>): Persister<T>;
declare function proxyWithStorage<T extends object>(initialObject: T, { key, maxAge, version, throttleTime, deserialize, serialize, storage, persister, }: ProxyWithStorageOptions<T>): T & {
    persister?: Persister<T>;
};

export { CreateStoragePersisterOptions, PersistedClient, ProxyWithStorageOptions, createProxyStoragePersister, proxyWithStorage };
