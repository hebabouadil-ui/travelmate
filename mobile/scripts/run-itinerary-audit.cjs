/*
 * REAL generateItinerary() audit — calls the actual engine (compiled straight
 * from src/lib, see package.json's `audit:itinerary`) against the live
 * Overpass / Foursquare / Open-Meteo / OSRM / Wikipedia / Wikidata APIs and
 * prints the evidence required for V4 sign-off, per destination x interest x
 * budget case: every real candidate considered, its real FinalScore
 * (selectionValue from scoring.ts — Popularity+Tier+Interest+Budget+Distance,
 * the same function the engine itself ranks with), which candidates were
 * selected vs rejected, why each selected place won (recommendationReason,
 * already computed by the real engine), which API sourced it, and total
 * generation time.
 *
 * Run via:  npm run audit:itinerary
 * (that script does the tsc compile, then runs this with the AsyncStorage
 * shim preloaded — see scripts/audit-shims/.)
 */
const path = require("path");
const LIB = path.join(__dirname, "..", ".audit", "lib");

const { generateItinerary } = require(path.join(LIB, "itinerary", "engine.js"));
const { selectionValue } = require(path.join(LIB, "itinerary", "scoring.js"));
const { haversineKm } = require(path.join(LIB, "utils.js"));

// Same hardcoded centers scripts/live-audit.mjs uses — skips geocoding so the
// audit doesn't depend on Nominatim, just like the real app does when a city
// was picked from the destination search (req.center set).
const CENTERS = {
  Casablanca: { lat: 33.5731, lng: -7.5898 },
  Rome: { lat: 41.9028, lng: 12.4964 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  Marrakech: { lat: 31.6295, lng: -7.9811 },
};

const CASES = [
  { label: "Casablanca — Luxury + Nightlife", destination: "Casablanca", budget: "luxury", interests: ["nightlife"] },
  { label: "Casablanca — Budget + Nature", destination: "Casablanca", budget: "economy", interests: ["nature"] },
  { label: "Rome — Nature", destination: "Rome", budget: "medium", interests: ["nature"] },
  // The app's Interest taxonomy has no literal "history" — "monuments" is the
  // real category it maps to (historic sites/monuments/memorials).
  { label: "Rome — History", destination: "Rome", budget: "medium", interests: ["monuments"] },
  { label: "Rome — Luxury", destination: "Rome", budget: "luxury", interests: [] },
  { label: "Paris — Photography", destination: "Paris", budget: "medium", interests: ["photography"] },
  { label: "Marrakech — Food", destination: "Marrakech", budget: "medium", interests: ["food"] },
];

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function fmt(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function norm(s) {
  return s.trim().toLowerCase();
}

async function runCase(tc) {
  const bar = "=".repeat(78);
  console.log(`\n${bar}\n${tc.label}  (budget=${tc.budget}, interests=${JSON.stringify(tc.interests)})\n${bar}`);

  const center = CENTERS[tc.destination];
  const req = {
    destination: tc.destination,
    center,
    days: 3,
    budget: tc.budget,
    interests: tc.interests,
    startDate: tomorrowISO(),
    profile: { activityLevel: "moderate" },
    debug: true,
  };

  const t0 = Date.now();
  let itin;
  try {
    itin = await generateItinerary(req);
  } catch (e) {
    console.log(`  *** GENERATION FAILED: ${(e && e.stack) || e}`);
    return null;
  }
  const ms = Date.now() - t0;

  const pool = itin.debugPool || [];
  const selectedStops = [];
  itin.days.forEach((d) => d.stops.forEach((s) => selectedStops.push({ day: d.day, ...s })));
  const selectedNameSet = new Set(selectedStops.map((s) => norm(s.place.name)));

  const ranked = pool
    .map((p) => ({
      place: p,
      finalScore: selectionValue(p, haversineKm(center, p), tc.interests, tc.budget),
      selected: selectedNameSet.has(norm(p.name)),
    }))
    .sort((a, b) => b.finalScore - a.finalScore);

  const bySource = {};
  const byCategory = {};
  for (const p of pool) {
    bySource[p.source] = (bySource[p.source] || 0) + 1;
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }
  const rejectedCount = ranked.filter((r) => !r.selected).length;

  console.log(`\n  Generation time: ${ms}ms   |   Narration engine: ${itin.engine}`);
  console.log(`  Candidate pool: ${pool.length} total`);
  console.log(`    by API source: ${JSON.stringify(bySource)}`);
  console.log(`    by category:   ${JSON.stringify(byCategory)}`);
  console.log(`  Selected: ${selectedStops.length} stops across ${itin.days.length} days   |   Rejected: ${rejectedCount}`);

  console.log(`\n  -- ALL CANDIDATES, ranked by real FinalScore (selectionValue) --`);
  console.log(`     [SEL/rej] score  tier  category    source      name`);
  for (const r of ranked) {
    const tag = r.selected ? "SEL" : "rej";
    const tier = r.place.tier != null ? `T${r.place.tier}` : "T-";
    console.log(
      `     [${tag}] ${fmt(r.finalScore)}  ${tier.padEnd(4)} ${r.place.category.padEnd(11)} ${r.place.source.padEnd(11)} ${r.place.name}`
    );
  }

  console.log(`\n  -- WHY EACH SELECTED PLACE WON --`);
  for (const s of selectedStops) {
    const score = selectionValue(s.place, haversineKm(center, s.place), tc.interests, tc.budget);
    console.log(`    Day ${s.day} ${(s.slot || s.daypart || "").padEnd(16)} [${fmt(score)}] [${s.place.source}] ${s.place.name}`);
    console.log(`             -> ${s.place.recommendationReason || "(no reason recorded)"}`);
  }

  return { label: tc.label, selected: selectedStops.map((s) => s.place.name) };
}

async function main() {
  console.log(`\n#### REAL generateItinerary() AUDIT — Foursquare key present: ${process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY ? "YES" : "NO"} ####`);
  const summaries = [];
  for (const tc of CASES) {
    const summary = await runCase(tc);
    if (summary) summaries.push(summary);
  }

  const bar = "=".repeat(78);
  console.log(`\n${bar}\nCROSS-CASE COMPARISON — selected place names per case (are they actually different?)\n${bar}`);
  for (const s of summaries) {
    console.log(`\n${s.label}:`);
    console.log(`  ${s.selected.join(" | ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
