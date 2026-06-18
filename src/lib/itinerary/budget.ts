import type { Budget, PlaceCategory } from "../types";

/** Per-tier daily multipliers and base costs (EUR). */
const TIER: Record<Budget, { meal: number; attraction: number; transport: number }> = {
  economy: { meal: 12, attraction: 8, transport: 6 },
  medium: { meal: 28, attraction: 16, transport: 12 },
  luxury: { meal: 70, attraction: 30, transport: 35 },
};

/** Estimated cost for a single stop given its category and budget tier. */
export function stopCost(category: PlaceCategory, budget: Budget): number {
  const t = TIER[budget];
  switch (category) {
    case "restaurant":
      return t.meal;
    case "cafe":
      return Math.round(t.meal * 0.4);
    case "nightlife":
      return Math.round(t.meal * 0.8);
    case "museum":
    case "monument":
    case "attraction":
      return t.attraction;
    default:
      return 0; // parks, beaches, viewpoints, landmarks are typically free
  }
}

/** Daily transport allowance for the tier. */
export function dailyTransport(budget: Budget): number {
  return TIER[budget].transport;
}

export function budgetLabel(budget: Budget): string {
  return { economy: "Economy", medium: "Medium", luxury: "Luxury" }[budget];
}
