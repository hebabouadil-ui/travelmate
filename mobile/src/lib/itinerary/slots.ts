import type { Daypart, GuideSlot } from "../types";

/** The fixed guided-day skeleton, in order (breakfast → night). The main
 *  landmark comes early (right after breakfast), then a cultural attraction,
 *  matching the V3 advanced day structure (08:00 breakfast → 21:30 night). */
export const SLOTS: GuideSlot[] = [
  "breakfast", "main_attraction", "morning_activity", "lunch",
  "afternoon_activity", "coffee_break", "sunset", "dinner", "night",
];

export const SLOT_DAYPART: Record<GuideSlot, Daypart> = {
  breakfast: "morning",
  morning_activity: "morning",
  main_attraction: "morning",
  lunch: "lunch",
  afternoon_activity: "afternoon",
  coffee_break: "afternoon",
  sunset: "evening",
  dinner: "dinner",
  night: "evening",
};

// V3 advanced day structure: an intentional, realistic clock from morning to
// night. scheduleDay() treats these as desired times and still enforces
// strictly-increasing order + real travel/opening-hours, so they're anchors,
// not rigid stamps.
export const SLOT_DEFAULT_TIME: Record<GuideSlot, string> = {
  breakfast: "08:00",
  main_attraction: "09:00",
  morning_activity: "11:00",
  lunch: "13:00",
  afternoon_activity: "14:30",
  coffee_break: "16:30",
  sunset: "18:30",
  dinner: "20:00",
  night: "21:30",
};

export const DAYPART_RANK: Record<Daypart, number> = {
  morning: 0, lunch: 1, afternoon: 2, dinner: 3, evening: 4,
};

/** Position of a slot in the canonical day order (for stable sorting). */
export function slotOrder(slot?: GuideSlot): number {
  if (!slot) return 99;
  const i = SLOTS.indexOf(slot);
  return i === -1 ? 99 : i;
}
