/*
 * In-memory stand-in for @react-native-async-storage/async-storage, used only
 * by scripts/run-itinerary-audit.cjs so the real src/lib/cache.ts (and every
 * real data-layer module that calls withCache()) can run unmodified under
 * plain Node. cache.ts only ever calls getItem/setItem — that's all this needs.
 */
const store = new Map();

module.exports = {
  async getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  async setItem(key, value) {
    store.set(key, String(value));
  },
  async removeItem(key) {
    store.delete(key);
  },
  async clear() {
    store.clear();
  },
};
