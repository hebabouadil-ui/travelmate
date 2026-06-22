/*
 * Offline validation of TravelMate's pure itinerary algorithms.
 *
 * Runs the REAL compiled engine modules (no network needed) against synthetic
 * data to stress-test tiering, must-see matching, confidence, route flow,
 * scheduling and opening-hours logic.
 *
 *   npm run validate
 *
 * (the `validate` script compiles the pure modules to ./.validate first.)
 */
const path = require("path");
const base = path.join(__dirname, "..", ".validate", "lib");
const K = require(path.join(base, "data", "knowledge.js"));
const S = require(path.join(base, "itinerary", "scoring.js"));
const F = require(path.join(base, "itinerary", "dayflow.js"));
const I = require(path.join(base, "itinerary", "interests.js"));

let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };
const place = (o) => Object.assign({ id: Math.random().toString(36).slice(2), name: "x", category: "attraction", lat: 0, lng: 0, source: "overpass" }, o);
const stop = (o) => Object.assign({ daypart: "morning", durationMin: 60 }, o, { place: place(o.place || {}) });

console.log("\n=== 1. Knowledge pack coverage (must-see foundation) ===");
for (const d of ["Marrakech","Tangier","Chefchaouen","Madrid","Paris","Rome","Tokyo","Kyoto","Bangkok"]) {
  const p = K.getKnowledgePack(d);
  ok(!!p && p.mustSee.length >= 3, `${d}: pack found, ${p ? p.mustSee.length : 0} must-sees, conf ${p ? p.confidence : "-"}%`);
}

console.log("\n=== 1b. Must-see matching against realistic OSM spellings ===");
for (const [city, osmName] of [
  ["Marrakech", "Koutoubia"], ["Marrakech", "Place Jemaa el-Fna"], ["Marrakech", "Jardin Majorelle"],
  ["Madrid", "Museo del Prado"], ["Paris", "Eiffel Tower"], ["Rome", "Colosseum"],
  ["Tokyo", "Sensō-ji"], ["Kyoto", "Fushimi Inari-taisha"], ["Bangkok", "Wat Pho"],
]) {
  const t = K.packNameTier(K.getKnowledgePack(city), osmName);
  ok(t === 1, `${city}: "${osmName}" -> tier ${t} (want 1)`);
}

console.log("\n=== 1c. Matching must NOT create false positives (precision) ===");
const mk = K.getKnowledgePack("Marrakech"), md = K.getKnowledgePack("Madrid");
ok(K.packNameTier(mk, "El Badi Palace") === 2, `"El Badi Palace" -> tier 2 (not confused with Bahia Palace)`);
ok(K.packNameTier(md, "Museo Reina Sofía") !== 1, `"Reina Sofía" not mistaken for Prado`);
ok(K.packNameTier(mk, "Some Random Café") === 0, `unrelated place -> tier 0`);

console.log("\n=== 2. Selection: fame must beat distance ===");
const vFar = S.selectionValue(place({ popularity: 0.95, tier: 1, verified: true, category: "monument" }), 3.0, ["monuments"]);
const vNear = S.selectionValue(place({ popularity: 0, tier: 3, verified: true, category: "park" }), 0.1, ["monuments"]);
ok(vFar > vNear, `famous@3km (${vFar.toFixed(2)}) beats minor@0.1km (${vNear.toFixed(2)})`);

console.log("\n=== 9. Confidence scores realistic ===");
ok(S.confidenceScore(place({ verified: true, tier: 1, popularity: 0.95, openingHours: "Mo-Su 09:00-18:00", wikidataId: "Q1" })) >= 0.9, "verified Tier-1 must-see >= 90%");
const cMeal = S.confidenceScore(place({ verified: true, tier: 3, category: "restaurant", openingHours: "12:00-23:00" }));
ok(cMeal >= 0.45 && cMeal < 0.7, `verified local restaurant ${(cMeal*100)|0}% (honest: no ratings)`);
ok(S.confidenceScore(place({ verified: false, tier: 3, source: "ai" })) < 0.7, "unverified AI approximation < 70% (gated out)");

console.log("\n=== 6. Day flow: temporal order guaranteed (sortBySlot) ===");
const sorted = F.sortBySlot([
  stop({ slot: "night", daypart: "evening" }), stop({ slot: "breakfast", daypart: "morning" }),
  stop({ slot: "lunch", daypart: "lunch" }), stop({ slot: "main_attraction", daypart: "morning" }),
  stop({ slot: "dinner", daypart: "dinner" }),
]).map((s) => s.slot);
ok(JSON.stringify(sorted) === JSON.stringify(["breakfast","main_attraction","lunch","dinner","night"]), `sorted -> ${sorted.join(" → ")}`);

console.log("\n=== 7. Route: 2-opt removes backtracking, keeps temporal order ===");
const zig = [
  stop({ slot: "breakfast", daypart: "morning", place: { lat: 0, lng: 0 } }),
  stop({ slot: "morning_activity", daypart: "morning", place: { lat: 0, lng: 0.02 } }),
  stop({ slot: "morning_activity", daypart: "morning", place: { lat: 0, lng: 0.005 } }),
  stop({ slot: "main_attraction", daypart: "morning", place: { lat: 0, lng: 0.01 } }),
  stop({ slot: "lunch", daypart: "lunch", place: { lat: 0, lng: 0.011 } }),
];
const before = F.pathDistance(zig), after = F.optimizeDayFlow(zig);
let mono = true; for (let i = 1; i < after.length; i++) if (F.stopRank(after[i]) < F.stopRank(after[i-1])) mono = false;
ok(F.pathDistance(after) <= before && mono, `distance ${before.toFixed(3)} -> ${F.pathDistance(after).toFixed(3)} km, temporal order preserved`);

console.log("\n=== 5/6. Scheduling: increasing times + opening-hours guard ===");
const day = [
  stop({ slot: "breakfast", startTime: "08:00", durationMin: 30, place: { lat: 0, lng: 0 } }),
  stop({ slot: "morning_activity", durationMin: 90, travelFromPrevMin: 10, place: { lat: 0, lng: 0.01, openingHours: "Tu-Su 10:00-18:00" } }),
  stop({ slot: "lunch", durationMin: 60, travelFromPrevMin: 10, place: { lat: 0, lng: 0.012 } }),
];
F.scheduleDay(day);
const times = day.map((s) => s.startTime);
let inc = true; for (let i = 1; i < day.length; i++) if (F.parseHM(times[i]) <= F.parseHM(times[i-1])) inc = false;
ok(inc, `times strictly increasing: ${times.join(" → ")}`);
ok(times[1] === "10:00", `place opening 10:00 (desired 09:00) bumped to ${times[1]}`);

console.log("\n=== 1d. Sunset slot anchors to the real local sunset time ===");
const sunsetDay = [
  stop({ slot: "breakfast", startTime: "08:00", durationMin: 30, place: { lat: 0, lng: 0 } }),
  stop({ slot: "sunset", startTime: "18:00", durationMin: 45, travelFromPrevMin: 5, place: { lat: 0, lng: 0.01 } }),
];
F.scheduleDay(sunsetDay, "21:34");
ok(sunsetDay[1].startTime === "21:34", `sunset slot uses real local sunset (21:34) over generic default, got ${sunsetDay[1].startTime}`);

console.log("\n=== 11. Multi-day balancing: must-see injection spreads across days ===");
const order1 = F.leastLoadedOrder([0, 0, 0]);
ok(JSON.stringify(order1) === JSON.stringify([0, 1, 2]), `even load -> stable original order [${order1.join(",")}]`);
const order2 = F.leastLoadedOrder([2, 0, 1]);
ok(JSON.stringify(order2) === JSON.stringify([1, 2, 0]), `uneven load -> ascending by load [${order2.join(",")}] (Day 1 never forced first)`);

console.log("\n=== 12. Interest Coverage Score: measures the actual result, not intent ===");
const tripStops = [{ category: "monument" }, { category: "restaurant" }, { category: "cafe" }];
const fullCov = I.interestCoverageScore(tripStops, ["monuments", "food"]);
ok(fullCov === 1, `monuments+food both represented -> ${fullCov} (want 1)`);
const partialCov = I.interestCoverageScore(tripStops, ["monuments", "food", "beaches"]);
ok(Math.abs(partialCov - 2 / 3) < 1e-9, `beaches missing from real data -> honest ${partialCov.toFixed(2)} (want 0.67)`);
const noInterests = I.interestCoverageScore(tripStops, []);
ok(noInterests === 1, `no interests selected -> trivially ${noInterests} (want 1)`);

console.log(`\n========== ${pass} passed, ${fail} failed ==========`);
process.exit(fail ? 1 : 0);
