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
const V = require(path.join(base, "itinerary", "validate.js"));
const O = require(path.join(base, "itinerary", "optimize.js"));

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

console.log("\n=== 13. Candidate Validation: rejects with the right reason, never silently ===");
const center0 = { lat: 0, lng: 0 };
ok(V.validateCandidate(place({ name: "" })) === "unknown_location", "no name -> unknown_location");
ok(V.validateCandidate(place({ lat: NaN })) === "missing_coordinates", "NaN coords -> missing_coordinates");
ok(V.validateCandidate(place({ category: undefined })) === "unknown_category", "no category -> unknown_category");
ok(V.validateCandidate(place({ openingHours: "closed" })) === "closed_permanently", `"closed" hours -> closed_permanently`);
ok(V.validateCandidate(place({ lat: 5, lng: 5 }), center0) === "outside_destination", "5deg away (>60km) -> outside_destination");
const seen = new Set([V.normName("Existing Place")]);
ok(V.validateCandidate(place({ name: "Existing Place" }), undefined, seen) === "duplicate", "already-seen name -> duplicate");
ok(V.validateCandidate(place({ name: "Real Spot", lat: 0.01, lng: 0.01 }), center0) === null, "a real, in-bounds candidate -> accepted (null)");

console.log("\n=== 14. Verified Badge: never depends on coordinates alone ===");
ok(V.isVerified(place({ source: "overpass", lat: 0.01, lng: 0.01 }), center0) === true, "real OSM object in destination -> Verified");
ok(V.isVerified(place({ source: "mock", lat: 0.01, lng: 0.01 }), center0) === false, "curated/seed (not an OSM object) -> not Verified");
ok(V.isVerified(place({ source: "overpass", lat: 5, lng: 5 }), center0) === false, "OSM object outside the destination -> not Verified");

console.log("\n=== 15. Confidence bands: 90/70/50/Reject (not a flat 70% cutoff) ===");
ok(V.confidenceBand(0.95) === "excellent", "95% -> excellent");
ok(V.confidenceBand(0.75) === "trusted", "75% -> trusted");
ok(V.confidenceBand(0.55) === "fallback", "55% -> fallback (kept, clearly labeled, not hidden)");
ok(V.confidenceBand(0.3) === "reject", "30% -> reject (never displayed)");

console.log("\n=== 16. Itinerary Quality Score: composite 7-factor, honest labeling ===");
const fullMarks = {
  interestCoverage: 1, landmarkCoverage: 1, routeEfficiency: 1, timeLogic: 1,
  photoQuality: 1, weatherAdaptation: 1, verificationQuality: 1,
};
ok(V.qualityScore(fullMarks) === 100, `all factors perfect -> ${V.qualityScore(fullMarks)} (want 100)`);
ok(V.qualityLabel(100) === "Premium Plan", "100 -> Premium Plan");
const weakMarks = { ...fullMarks, interestCoverage: 0, landmarkCoverage: 0, routeEfficiency: 0, timeLogic: 0 };
const weakScore = V.qualityScore(weakMarks); // 0.10+0.10+0.10 = 30
ok(weakScore === 30, `four zeroed factors -> ${weakScore} (want 30)`);
ok(V.qualityLabel(weakScore) === "Limited Verified Data", `a 30% plan is labeled "${V.qualityLabel(weakScore)}", never presented as high quality`);

console.log("\n=== 17. Quality sub-scores: real measurements, not guesses ===");
ok(V.landmarkCoverageScore(["Eiffel Tower"], ["Eiffel Tower", "Louvre"], (a, b) => a === b) === 0.5,
  "1 of 2 must-sees present -> 0.5");
ok(V.landmarkCoverageScore([], [], (a, b) => a === b) === 1, "no must-sees to grade against -> trivially 1");
const photoStops = [{ place: { photoResolved: true } }, { place: { photoResolved: false } }];
ok(V.photoQualityScore(photoStops) === 0.5, "1 of 2 stops has a real resolved photo -> 0.5");
const verifStops = [{ place: { verified: true } }, { place: { verified: true } }, { place: { verified: false } }];
ok(Math.abs(V.verificationQualityScore(verifStops) - 2 / 3) < 1e-9, "2 of 3 stops Verified -> 0.67");

console.log("\n=== 18. Photo Validator: rejects mismatched Wikipedia subjects ===");
ok(K.isMatchingArticle("Eiffel Tower", "Eiffel Tower") === true, `exact title -> accepted`);
ok(K.isMatchingArticle("Sensō-ji", "Sensoji Temple") === true, `spelling/translation variant -> accepted`);
ok(K.isMatchingArticle("Eiffel Tower", "Tower of London") === false, `unrelated topic the search merely ranked -> rejected`);
ok(K.isMatchingArticle("Park Güell", "Parc de la Ciutadella") === false, `different park, same city -> rejected (not a name match)`);
ok(K.isMatchingArticle("Colosseum", "Colosseum (disambiguation)", { disambiguation: "" }) === false, `disambiguation page -> rejected even if the title looks close`);
ok(K.isMatchingArticle("Some Place", undefined) === false, `no article found -> rejected`);

console.log("\n=== 19. Restaurant/Café Engine: real walking-distance constraint ===");
const anchor0 = { lat: 0, lng: 0 };
const nearUsed = place({ id: "near", lat: 0, lng: 0.005 }); // ~0.56km
const farNew = place({ id: "far", lat: 0, lng: 0.05 }); // ~5.6km
const pickReuseNear = O.nearestWithinRadius(anchor0, [nearUsed, farNew], () => true, new Set(["near"]), 1.5, true);
ok(pickReuseNear.id === "near", `reusing a walkable spot beats a brand-new one across town -> picked "${pickReuseNear.id}"`);
const pickOnlyFar = O.nearestWithinRadius(anchor0, [farNew], () => true, new Set(), 1.5, true);
ok(pickOnlyFar.id === "far", `nothing walkable exists -> widens rather than leaving the day without food, picked "${pickOnlyFar.id}"`);
const pickUnusedNear = O.nearestWithinRadius(anchor0, [nearUsed, farNew], () => true, new Set(), 1.5, true);
ok(pickUnusedNear.id === "near", `an unused walkable spot is simply the obvious best pick -> "${pickUnusedNear.id}"`);

console.log("\n=== 20. Nightlife Engine: a real district beats a closer isolated venue ===");
const isolatedBar = place({ id: "isolated", lat: 0, lng: 0.001 }); // ~0.11km from anchor, alone
const clusterA = place({ id: "clusterA", lat: 0, lng: 0.02 }); // ~2.2km from anchor
const clusterB = place({ id: "clusterB", lat: 0, lng: 0.0205 }); // ~0.06km from clusterA
const clusterC = place({ id: "clusterC", lat: 0, lng: 0.021 }); // ~0.06km from clusterB
const districtPick = O.bestNightlifeVenue(anchor0, [isolatedBar, clusterA, clusterB, clusterC], new Set());
ok(districtPick.id === "clusterA", `picks the nearest member of the real 3-bar district, not the closer lone bar -> "${districtPick.id}"`);

console.log("\n=== 21. Route/Transport Engine: budget-tiered mode + walking fatigue ===");
ok(O.decideTravelMode(2.0, "economy") === "walk", `economy walks a 2km leg (2.5km ceiling) -> "${O.decideTravelMode(2.0, "economy")}"`);
ok(O.decideTravelMode(2.0, "medium") === "transit", `medium switches to transit past its 1.8km ceiling -> "${O.decideTravelMode(2.0, "medium")}"`);
ok(O.decideTravelMode(1.2, "luxury") === "transit", `luxury's lower 1.0km walk ceiling pushes a 1.2km leg to transit -> "${O.decideTravelMode(1.2, "luxury")}"`);
ok(O.decideTravelMode(13, "economy") === "transit", `economy's wider 15km transit ceiling keeps a 13km leg off taxi -> "${O.decideTravelMode(13, "economy")}"`);
ok(O.decideTravelMode(13, "medium") === "taxi", `medium's 12km transit ceiling sends the same 13km leg to taxi -> "${O.decideTravelMode(13, "medium")}"`);
ok(O.decideTravelMode(0.5, "medium", 3.5) === "transit", `3.5km already walked today -> even a short 0.5km leg prefers transit (fatigue)`);
ok(O.decideTravelMode(0.5, "medium", 0) === "walk", `same 0.5km leg walks fine early in the day (no fatigue yet)`);

console.log("\n=== 22. Day Theme: closed taxonomy backed by real stop categories ===");
ok(I.dayTheme([{ category: "monument" }, { category: "monument" }, { category: "restaurant" }]) === "Historic & Monuments",
  `2 of 2 sightseeing stops are monuments -> "${I.dayTheme([{ category: "monument" }, { category: "monument" }, { category: "restaurant" }])}"`);
ok(I.dayTheme([{ category: "museum" }, { category: "monument" }, { category: "park" }]) === "Mixed Highlights",
  `no category reaches 40% dominance -> honest "Mixed Highlights"`);
ok(I.dayTheme([{ category: "restaurant" }, { category: "cafe" }, { category: "nightlife" }]) === "Mixed Highlights",
  `only food/nightlife stops (nothing to theme) -> "Mixed Highlights"`);
ok(I.dayTheme([{ category: "shopping" }, { category: "shopping" }, { category: "museum" }]) === "Markets & Shopping",
  `2 of 3 sightseeing stops are shopping (67%) -> "${I.dayTheme([{ category: "shopping" }, { category: "shopping" }, { category: "museum" }])}"`);

console.log("\n=== 23. Recommendation Reason: deterministic, never an unsupported claim ===");
const reasonCtx = { city: "Marrakech", interests: ["nightlife"], distanceKm: 5 };
ok(/must-see/i.test(S.recommendationReason(place({ tier: 1, category: "monument" }), reasonCtx)),
  `a Tier-1 sight -> must-see reason`);
ok(/interest in food/i.test(S.recommendationReason(place({ category: "restaurant" }), { city: "Madrid", interests: ["food"] })),
  `a restaurant on a food trip -> interest-in-food reason`);
ok(/walking distance/i.test(S.recommendationReason(place({ category: "cafe" }), { city: "Madrid", interests: [] })),
  `a café with no food interest -> walking-distance reason (no false interest claim)`);
ok(/nightlife district/i.test(S.recommendationReason(place({ category: "nightlife" }), { city: "Madrid", inNightlifeDistrict: true })),
  `a nightlife venue in a real district -> district reason`);
ok(/matches your interest in historical/i.test(S.recommendationReason(place({ category: "monument", tier: 2 }), { city: "Rome", interests: ["monuments"] })),
  `a monument matching a selected interest -> interest reason`);
ok(/most-visited/i.test(S.recommendationReason(place({ category: "attraction", popularity: 0.9 }), { city: "Paris", interests: [] })),
  `a famous attraction, no matching interest -> fame reason`);
ok(/worthwhile stop/i.test(S.recommendationReason(place({ category: "attraction", popularity: 0 }), { city: "Tangier", interests: [], distanceKm: 9 })),
  `an obscure, far, off-interest stop -> honest worthwhile-stop fallback (no invented reason)`);

console.log("\n=== 24. Food limits: meal allowance enforced, experiences dominate ===");
const wellBalanced = [
  stop({ slot: "breakfast", place: { category: "cafe" } }),
  stop({ slot: "main_attraction", place: { category: "monument" } }),
  stop({ slot: "morning_activity", place: { category: "landmark" } }),
  stop({ slot: "lunch", place: { category: "restaurant" } }),
  stop({ slot: "afternoon_activity", place: { category: "museum" } }),
  stop({ slot: "sunset", place: { category: "viewpoint" } }),
  stop({ slot: "dinner", place: { category: "restaurant" } }),
];
ok(Math.abs(V.experienceShare(wellBalanced) - 4 / 7) < 1e-9, `4 of 7 stops are experiences -> ${V.experienceShare(wellBalanced).toFixed(2)}`);
ok(V.withinFoodLimits(wellBalanced, false) === false, `a real day still under 70% experiences is flagged honestly`);
// A day that piles on extra drinks/snacks beyond the 1bf+1lunch+1dinner+1drink allowance.
const foodHeavy = [
  stop({ slot: "breakfast", place: { category: "cafe" } }),
  stop({ slot: "main_attraction", place: { category: "monument" } }),
  stop({ slot: "lunch", place: { category: "restaurant" } }),
  stop({ slot: "afternoon_activity", place: { category: "cafe", id: "snack" } }), // excess snack
  stop({ slot: "coffee_break", place: { category: "cafe" } }), // the 1 allowed drink
  stop({ slot: "dinner", place: { category: "restaurant" } }),
];
const capped = V.capFoodStops(foodHeavy, false);
ok(capped.filter((s) => V.isFoodDrink(s.place.category)).length === 4, `excess food/drink trimmed to the 4-stop allowance (kept ${capped.filter((s) => V.isFoodDrink(s.place.category)).length})`);
ok(capped.some((s) => s.slot === "lunch") && capped.some((s) => s.slot === "dinner"), `lunch and dinner anchors are never dropped`);
ok(!capped.some((s) => s.place.id === "snack"), `the excess afternoon snack café is the one dropped`);
ok(capped.some((s) => s.slot === "coffee_break") && capped.some((s) => s.slot === "breakfast"), `the allowed breakfast + 1 drink are kept`);
ok(capped.some((s) => s.place.category === "monument"), `the real experience (monument) is always kept`);
ok(V.capFoodStops(foodHeavy, true).length === foodHeavy.length, `a food-focused trip is exempt — nothing trimmed`);

console.log("\n=== 25. Category separation: browse groups partition every category ===");
const ALL_CATEGORIES = ["attraction","monument","museum","restaurant","cafe","beach","park","viewpoint","landmark","nightlife","shopping"];
const groupOf = ALL_CATEGORIES.map((c) => I.browseGroupFor(c));
ok(groupOf.every((g) => typeof g === "string"), `every real category maps to a browse group`);
// Disjoint + complete: each category appears in exactly one group's list.
let exactlyOnce = true;
for (const c of ALL_CATEGORIES) {
  const hits = Object.values(I.BROWSE_GROUPS).filter((list) => list.includes(c)).length;
  if (hits !== 1) exactlyOnce = false;
}
ok(exactlyOnce, `each category belongs to exactly one group (strict partition, no overlap)`);
ok(I.browseGroupFor("monument") === "history" && I.browseGroupFor("museum") === "museums", `history and museums are separated (not lumped as "sights")`);
ok(I.browseGroupFor("cafe") === "food" && I.browseGroupFor("restaurant") === "food", `cafés and restaurants both surface under Food (not hidden under All only)`);
ok(I.inBrowseGroup("viewpoint", "nature") && !I.inBrowseGroup("viewpoint", "history"), `a viewpoint is Nature, never History`);

console.log("\n=== 26. Duplication & diversity guards ===");
const noDupes = [stop({ place: { id: "a" } }), stop({ place: { id: "b" } }), stop({ place: { id: "c" } })];
ok(V.duplicatePlaceNames(noDupes).length === 0, `a clean plan has no repeated places`);
const withDupe = [stop({ place: { id: "a", name: "Prado" } }), stop({ place: { id: "a", name: "Prado" } })];
ok(V.duplicatePlaceNames(withDupe).length === 1, `the same place twice is caught -> ${JSON.stringify(V.duplicatePlaceNames(withDupe))}`);
const diverseDay = [stop({ place: { category: "monument" } }), stop({ place: { category: "museum" } }), stop({ place: { category: "park" } })];
ok(V.experienceDiversity(diverseDay) === 1, `three different kinds of experience -> full diversity`);
const monotonous = [stop({ place: { category: "museum" } }), stop({ place: { category: "museum" } }), stop({ place: { category: "museum" } })];
ok(Math.abs(V.experienceDiversity(monotonous) - 1 / 3) < 1e-9, `museum, museum, museum -> low diversity ${V.experienceDiversity(monotonous).toFixed(2)}`);

console.log("\n=== 27. Photo priority, placeholder honesty & place metadata ===");
ok(JSON.stringify(V.PHOTO_SOURCE_PRIORITY) === JSON.stringify(["wikimedia_commons","official_website","unsplash","pexels"]),
  `photo source priority is Commons -> official -> Unsplash -> Pexels`);
ok(V.bestPhotoSource({ unsplash: true, wikimedia_commons: true }) === "wikimedia_commons",
  `Commons wins over Unsplash when both exist`);
ok(V.bestPhotoSource({ pexels: true }) === "pexels", `falls through to Pexels when only it is available`);
ok(V.bestPhotoSource({}) === null, `no real source -> null (caller must show a placeholder, never a wrong image)`);
ok(V.hasExactPhoto(place({ photoResolved: true, imageUrl: "x" })) === true, `a resolved real photo -> exact`);
ok(V.hasExactPhoto(place({ photoResolved: false, imageUrl: "x" })) === false, `an unresolved category image -> NOT exact (badged "Representative")`);
ok(V.formatAddress({ housenumber: "10", street: "Rue de Rivoli", city: "Paris" }) === "10 Rue de Rivoli, Paris",
  `address parts assemble cleanly -> "${V.formatAddress({ housenumber: "10", street: "Rue de Rivoli", city: "Paris" })}"`);
ok(V.formatAddress({ city: "Paris" }) === "Paris", `partial address (city only) still formats`);
ok(V.formatAddress({}) === undefined, `no address parts -> undefined (UI shows nothing, no stray commas)`);

console.log(`\n========== ${pass} passed, ${fail} failed ==========`);
process.exit(fail ? 1 : 0);
