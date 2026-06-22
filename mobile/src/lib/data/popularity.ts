import type { Place } from "../types";

/**
 * Real, source-backed popularity signal.
 *
 * OpenStreetMap and Wikipedia give us no review counts or star ratings — so
 * rather than invent them, we use a metric that genuinely reflects global fame:
 * the number of language editions of Wikipedia that have an article about a
 * place (its Wikidata "sitelink" count). The Eiffel Tower has ~200; a
 * neighbourhood café has none. This is a well-established notability proxy and
 * it's free + batchable (up to 50 entities per request).
 *
 * The result is written to `place.popularity` (0..1, log-scaled). Best-effort:
 * any network failure simply leaves popularity undefined and the scorer falls
 * back to its category/notability signals.
 */

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const cache = new Map<string, number>(); // Q-id -> sitelink count
// ~250 language editions is the practical ceiling for the most famous sites.
const MAX_SITELINKS = 250;

/** Log-scale a raw sitelink count into a 0..1 popularity score. */
function normalize(count: number): number {
  if (count <= 0) return 0;
  return Math.min(1, Math.log(1 + count) / Math.log(1 + MAX_SITELINKS));
}

async function fetchSitelinkCounts(ids: string[]): Promise<void> {
  // Wikidata allows up to 50 ids per call.
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url =
      `${WIKIDATA_API}?action=wbgetentities&props=sitelinks` +
      `&ids=${batch.join("|")}&format=json&origin=*`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        entities?: Record<string, { sitelinks?: Record<string, unknown> }>;
      };
      for (const id of batch) {
        const ent = data.entities?.[id];
        const count = ent?.sitelinks ? Object.keys(ent.sitelinks).length : 0;
        cache.set(id, count);
      }
    } catch {
      // leave these ids unresolved; popularity stays undefined for them
    }
  }
}

/**
 * Enrich a pool of places with a real popularity score from Wikidata. Mutates
 * `places` in place. Safe to call always — it only fetches ids it hasn't seen.
 */
export async function enrichPopularity(places: Place[]): Promise<void> {
  const ids = Array.from(
    new Set(
      places
        .map((p) => p.wikidataId)
        .filter((id): id is string => !!id && /^Q\d+$/.test(id) && !cache.has(id))
    )
  );
  if (ids.length) await fetchSitelinkCounts(ids);

  for (const p of places) {
    if (p.wikidataId && cache.has(p.wikidataId)) {
      p.popularity = normalize(cache.get(p.wikidataId)!);
    } else if (p.wikidataId || p.wikipediaTitle) {
      // Documented site but sitelink count unavailable — give a modest floor so
      // it still outranks an undocumented place.
      p.popularity = p.popularity ?? 0.4;
    }
  }
}
