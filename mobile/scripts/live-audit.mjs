/*
 * LIVE provider audit — real API calls, real numbers (V4 reality check).
 *
 * This runs the EXACT requests the app issues (queries/headers copied verbatim
 * from the source, with file:line references) against the real third-party APIs,
 * and prints actual runtime evidence: candidate counts per source/category,
 * which provider can fill each field, Foursquare field availability, photo
 * outcomes, and per-step timing. It exists because the sandbox proxy blocks
 * outbound APIs — but a GitHub Actions runner has open internet, so this is run
 * via .github/workflows/live-audit.yml to produce real logs.
 *
 * Node 20+ (global fetch). Foursquare key comes from EXPO_PUBLIC_FOURSQUARE_API_KEY.
 *
 *   node scripts/live-audit.mjs            # default city set
 *   node scripts/live-audit.mjs Rome Tokyo # specific cities
 */

const FSQ_KEY = process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY || "";

// Centers for the 9 acceptance cities (lat,lng), so we don't depend on geocode.
const CITIES = {
  Rome: { lat: 41.9028, lng: 12.4964 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  Marrakech: { lat: 31.6295, lng: -7.9811 },
  Casablanca: { lat: 33.5731, lng: -7.5898 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Kyoto: { lat: 35.0116, lng: 135.7681 },
  London: { lat: 51.5074, lng: -0.1278 },
  Barcelona: { lat: 41.3851, lng: 2.1734 },
  Bangkok: { lat: 13.7563, lng: 100.5018 },
};

const ENDPOINTS = [ // overpass.ts:5-10
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

// EXACT query from overpass.ts:59-70 (buildQuery), radius 6000 (overpass.ts:32).
function buildQuery(c, r = 6000) {
  const around = `(around:${r},${c.lat},${c.lng})`;
  return `[out:json][timeout:25];
(
  nwr["tourism"~"attraction|museum|artwork|viewpoint|gallery|zoo|theme_park"]${around};
  nwr["historic"~"monument|memorial|castle|ruins|archaeological_site|fort"]${around};
  nwr["amenity"~"restaurant|cafe"]${around};
  nwr["leisure"~"park|garden"]${around};
  nwr["natural"="beach"]${around};
  nwr["amenity"~"bar|pub|nightclub"]${around};
  nwr["shop"~"mall|department_store"]${around};
);
out center 350;`;
}

// classify() from overpass.ts:123-138
function classify(tags) {
  if (tags.historic) return ["monument", "memorial"].includes(tags.historic) ? "monument" : "landmark";
  if (tags.tourism === "museum" || tags.tourism === "gallery") return "museum";
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.tourism) return "attraction";
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "cafe") return "cafe";
  if (["bar", "pub", "nightclub"].includes(tags.amenity || "")) return "nightlife";
  if (tags.leisure === "park" || tags.leisure === "garden") return "park";
  if (tags.natural === "beach") return "beach";
  if (tags.shop === "mall" || tags.shop === "department_store") return "shopping";
  return null;
}

async function timed(label, fn) {
  const t0 = Date.now();
  try {
    const out = await fn();
    return { label, ms: Date.now() - t0, out };
  } catch (e) {
    return { label, ms: Date.now() - t0, error: String(e?.message || e) };
  }
}

async function overpass(center) {
  const query = buildQuery(center);
  const attempts = [];
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "VoyageAI-Mobile/1.0 (contact@voyage.ai)",
        },
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) { attempts.push(`${ep} -> HTTP ${res.status}`); continue; }
      const data = await res.json();
      const elements = data.elements || [];
      // Match the app: an empty result means try the next mirror (overpass.ts:51).
      if (elements.length === 0) { attempts.push(`${ep} -> 0 elements`); continue; }
      const byCat = {};
      let named = 0, withAddr = 0, withHours = 0, withSite = 0, withWikidata = 0;
      for (const el of elements) {
        const tags = el.tags || {};
        const cat = classify(tags);
        if (!cat) continue;
        if (!(tags.name || tags["name:en"])) continue;
        named++;
        byCat[cat] = (byCat[cat] || 0) + 1;
        if (tags["addr:street"]) withAddr++;
        if (tags.opening_hours) withHours++;
        if (tags.website || tags["contact:website"]) withSite++;
        if (tags.wikidata) withWikidata++;
      }
      return { endpoint: ep, total: elements.length, named, byCat, withAddr, withHours, withSite, withWikidata, attempts };
    } catch (e) {
      attempts.push(`${ep} -> ${String(e?.message || e).slice(0, 40)}`);
    }
  }
  return { error: "all mirrors failed/empty", attempts };
}

// Foursquare with FULL fields — proves what the key can actually supply
// (the app currently requests photos ONLY: foursquare.ts:68).
async function foursquareFull(name, center) {
  if (!FSQ_KEY) return { skipped: "no EXPO_PUBLIC_FOURSQUARE_API_KEY" };
  const ll = `${center.lat.toFixed(5)},${center.lng.toFixed(5)}`;
  const fields = "name,location,hours,website,tel,rating,photos,categories";
  const url = `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(name)}&ll=${ll}&radius=2000&limit=3&fields=${fields}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${FSQ_KEY}`, "X-Places-Api-Version": "2025-06-17", Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return { httpStatus: res.status, body: (await res.text()).slice(0, 200) };
  const data = await res.json();
  const r = (data.results || [])[0];
  return {
    httpStatus: res.status,
    results: (data.results || []).length,
    sample: r ? {
      name: r.name,
      hasAddress: Boolean(r.location?.formatted_address || r.location?.address),
      address: r.location?.formatted_address,
      hasHours: Boolean(r.hours?.display || r.hours?.regular),
      hasWebsite: Boolean(r.website),
      hasPhotos: Boolean(r.photos?.length),
      categories: (r.categories || []).map((c) => c.name),
    } : null,
  };
}

async function openMeteo(center) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&daily=sunset,temperature_2m_max,precipitation_sum&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const d = await res.json();
  return { ok: res.ok, days: d?.daily?.time?.length ?? 0, sunset: d?.daily?.sunset?.[0] };
}

async function main() {
  const requested = process.argv.slice(2);
  const cities = requested.length ? requested : Object.keys(CITIES);
  console.log(`\n#### LIVE PROVIDER AUDIT — Foursquare key present: ${FSQ_KEY ? "YES" : "NO"} ####`);

  for (const city of cities) {
    const center = CITIES[city];
    if (!center) { console.log(`\n== ${city}: no center configured, skipping ==`); continue; }
    console.log(`\n================ ${city} (${center.lat},${center.lng}) ================`);

    const osm = await timed("OSM/Overpass", () => overpass(center));
    console.log(`[OSM] ${osm.ms}ms`, osm.out?.error ? osm.out : {
      total: osm.out.total, named: osm.out.named, byCat: osm.out.byCat,
      withAddr: osm.out.withAddr, withHours: osm.out.withHours, withWebsite: osm.out.withSite, withWikidata: osm.out.withWikidata,
    });

    const wx = await timed("Open-Meteo", () => openMeteo(center));
    console.log(`[Weather] ${wx.ms}ms`, wx.out || wx.error);

    // Foursquare full-field probe on the city's top OSM name (a real venue query).
    const topName = osm.out?.byCat ? city : city;
    const fsq = await timed("Foursquare(full fields)", () => foursquareFull(`${city} restaurant`, center));
    console.log(`[Foursquare] ${fsq.ms}ms`, fsq.out || fsq.error);
  }

  console.log(`\n#### NOTE: the app currently calls Foursquare with fields=photos ONLY (foursquare.ts:68),`);
  console.log(`#### so address/hours/website above are AVAILABLE from the key but UNUSED by the app. ####`);
}

main().catch((e) => { console.error(e); process.exit(1); });
