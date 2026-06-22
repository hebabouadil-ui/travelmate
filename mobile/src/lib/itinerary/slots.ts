import type { Daypart, GuideSlot } from "../types";

/** The fixed guided-day skeleton, in order (breakfast → night). */
export const SLOTS: GuideSlot[] = [
  "breakfast", "morning_activity", "main_attraction", "lunch",
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

export const SLOT_DEFAULT_TIME: Record<GuideSlot, string> = {
  breakfast: "08:00",
  morning_activity: "09:00",
  main_attraction: "10:30",
  lunch: "13:00",
  afternoon_activity: "15:00",
  coffee_break: "16:30",
  sunset: "18:00",
  dinner: "20:00",
  night: "22:00",
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
