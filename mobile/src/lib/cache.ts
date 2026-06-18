import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Tiny TTL cache on top of AsyncStorage. This is the backbone of OFFLINE
 * CACHING: every network data source writes its successful responses here and
 * reads from here as a fallback when the device is offline or an API is slow /
 * rate-limited. Stale entries are still returned when nothing else is available.
 */

const PREFIX = "voyage:cache:";

interface Entry<T> {
  v: T;
  t: number; // stored-at epoch ms
  ttl: number; // ms
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.t > entry.ttl) return undefined; // expired (fresh read)
    return entry.v;
  } catch {
    return undefined;
  }
}

/** Read even if expired — used as an offline last resort. */
export async function cacheGetStale<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    return (JSON.parse(raw) as Entry<T>).v;
  } catch {
    return undefined;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlMs = 1000 * 60 * 60 * 24
): Promise<void> {
  try {
    const entry: Entry<T> = { v: value, t: Date.now(), ttl: ttlMs };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // best-effort; never throw from the cache layer
  }
}

/**
 * Fetch-through-cache helper: return fresh cache if present, else run the
 * loader, persist it, and return it. On loader failure, fall back to stale
 * cache so the app keeps working offline.
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  isEmpty?: (v: T) => boolean
): Promise<T> {
  const fresh = await cacheGet<T>(key);
  if (fresh !== undefined && !(isEmpty?.(fresh) ?? false)) return fresh;

  try {
    const value = await loader();
    if (!(isEmpty?.(value) ?? false)) await cacheSet(key, value, ttlMs);
    return value;
  } catch (err) {
    const stale = await cacheGetStale<T>(key);
    if (stale !== undefined) return stale;
    throw err;
  }
}
