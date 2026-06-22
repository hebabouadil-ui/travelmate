import type { Daypart, GuideSlot, ItineraryStop } from "../types";
import { haversineKm } from "../utils";
import { DAYPART_RANK, SLOT_DAYPART, SLOT_DEFAULT_TIME, slotOrder } from "./slots";

// ── Time helpers ────────────────────────────────────────────────────────────

export function parseHM(t?: string): number | null {
  const m = (t ?? "").match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

export function fmtHM(min: number): string {
  const h = Math.floor((min % 1440) / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** First opening time (minutes) from an OSM opening_hours string, if parseable. */
export function firstOpenMinutes(oh?: string): number | null {
  if (!oh) return null;
  if (/24\/7/.test(oh)) return 0;
  const m = oh.match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

// ── Ordering / scheduling ───────────────────────────────────────────────────

function stopDaypart(s: ItineraryStop): Daypart {
  return s.slot ? SLOT_DAYPART[s.slot] : s.daypart;
}

export function stopRank(s: ItineraryStop): number {
  return DAYPART_RANK[stopDaypart(s)] ?? 2;
}

export function pathDistance(stops: ItineraryStop[]): number {
  let d = 0;
  for (let i = 1; i < stops.length; i++) d += haversineKm(stops[i - 1].place, stops[i].place);
  return d;
}

function isMonotonic(stops: ItineraryStop[]): boolean {
  for (let i = 1; i < stops.length; i++) if (stopRank(stops[i]) < stopRank(stops[i - 1])) return false;
  return true;
}

/**
 * Put the day's stops into canonical morning→night order (breakfast … night),
 * stable so same-slot stops keep their relative order. Guarantees the day always
 * reads top-to-bottom even if the AI returned stops slightly out of sequence.
 */
export function sortBySlot(stops: ItineraryStop[]): ItineraryStop[] {
  return stops
    .map((s, i) => ({ s, i }))
    .sort((a, b) => slotOrder(a.s.slot) - slotOrder(b.s.slot) || a.i - b.i)
    .map((x) => x.s);
}

/**
 * True day-flow optimization: 2-opt that minimises total travel while keeping
 * the day's temporal order intact (never reshuffles across dayparts). Removes
 * back-and-forth zig-zags within each part of the day.
 */
export function optimizeDayFlow(stops: ItineraryStop[]): ItineraryStop[] {
  if (stops.length <= 3) return stops;
  let best = [...stops];
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 40) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const cand = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        if (!isMonotonic(cand)) continue;
        if (pathDistance(cand) < pathDistance(best) - 1e-6) {
          best = cand;
          improved = true;
        }
      }
    }
  }
  return best;
}

/**
 * Assign each stop a realistic clock time: anchor to the guide's canonical slot
 * time, push later as real travel + dwell accumulate, and never schedule a stop
 * before it opens (when OSM hours are known). The sunset slot is anchored to the
 * real local astronomical sunset for that day/place, when known, overriding the
 * generic default — golden hour only means something if the time is real.
 * Mutates startTime in place.
 */
export function scheduleDay(stops: ItineraryStop[], sunsetTime?: string): void {
  let clock = 8 * 60; // 08:00 default start
  const realSunset = parseHM(sunsetTime);
  stops.forEach((st, i) => {
    const desired =
      st.slot === "sunset" && realSunset != null
        ? realSunset
        : parseHM(st.startTime) ?? (st.slot ? parseHM(SLOT_DEFAULT_TIME[st.slot]) : null);
    if (i === 0) {
      clock = desired ?? clock;
    } else {
      const earliest = clock + (st.travelFromPrevMin ?? 0);
      clock = desired != null ? Math.max(earliest, desired) : earliest;
    }
    const open = firstOpenMinutes(st.place.openingHours);
    if (open != null && clock < open) clock = open;
    st.startTime = fmtHM(clock);
    clock += st.durationMin ?? 60;
  });
}

export type { GuideSlot };
