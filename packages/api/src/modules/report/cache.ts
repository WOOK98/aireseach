export interface TtlMemoizeOptions<Args extends readonly unknown[]> {
  ttlMs: number;
  key?: (...args: Args) => string;
  now?: () => number;
}

interface CacheEntry<Result> {
  expiresAt: number;
  promise?: Promise<Result>;
  value?: Result;
}

export interface TtlMemoized<Args extends readonly unknown[], Result> {
  (...args: Args): Promise<Result>;
  clear: () => void;
  delete: (...args: Args) => void;
}

const defaultKey = (args: readonly unknown[]) => JSON.stringify(args);

export const ttlMemoize = <Args extends readonly unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  options: TtlMemoizeOptions<Args>,
): TtlMemoized<Args, Result> => {
  const cache = new Map<string, CacheEntry<Result>>();
  const getNow = options.now ?? Date.now;
  const getKey = options.key ?? ((...args: Args) => defaultKey(args));

  const memoized = (async (...args: Args) => {
    const key = getKey(...args);
    const now = getNow();
    const cached = cache.get(key);

    if (cached) {
      if (cached.promise) return cached.promise;
      if (cached.expiresAt > now && "value" in cached) {
        return cached.value as Result;
      }
    }

    const promise = fn(...args);
    cache.set(key, {
      expiresAt: now + options.ttlMs,
      promise,
    });

    try {
      const value = await promise;
      cache.set(key, {
        expiresAt: getNow() + options.ttlMs,
        value,
      });
      return value;
    } catch (error) {
      cache.delete(key);
      throw error;
    }
  }) as TtlMemoized<Args, Result>;

  memoized.clear = () => cache.clear();
  memoized.delete = (...args: Args) => cache.delete(getKey(...args));

  return memoized;
};
