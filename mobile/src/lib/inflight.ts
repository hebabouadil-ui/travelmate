/**
 * Request deduplication (V3 performance §18). When several parts of the app ask
 * for the SAME resource at the same moment — e.g. two screens both resolving the
 * photo for "Eiffel Tower", or a list rendering the same city's weather twice —
 * we must not fire the same network call N times. `createInflight` coalesces
 * concurrent calls for one key into a single in-flight promise; the entry clears
 * as soon as that promise settles, so later (non-concurrent) calls still run
 * fresh and pick up updated data. Pure and dependency-free, so it's covered by
 * the offline validation harness.
 */
export function createInflight<T>() {
  const inflight = new Map<string, Promise<T>>();
  return function dedupe(key: string, loader: () => Promise<T>): Promise<T> {
    const existing = inflight.get(key);
    if (existing) return existing;
    const p = loader().finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };
}
