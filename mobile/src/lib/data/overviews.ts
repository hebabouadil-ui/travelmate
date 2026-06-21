import type { Interest, TripRequest } from "../types";
import { findSeedCity } from "./seed";

/**
 * Curated "why you should go there" copy for headline destinations, plus a
 * grounded template generator for anywhere else. Used as the itinerary's intro
 * paragraph + highlight chips so every plan opens with an inviting hook (this
 * also runs offline; the AI provider can override it when a key is configured).
 */
interface Overview {
  overview: string;
  highlights: string[];
}

const CURATED: Record<string, Overview> = {
  barcelona: {
    overview:
      "Barcelona is a Mediterranean masterclass in living well — where Gaudí's dreamlike architecture meets golden beaches, late-night tapas crawls and a Gothic old town you can get lost in for hours. Few cities pack this much art, food and seaside energy into a single walkable map.",
    highlights: ["Gaudí's surreal architecture", "Beach + city in one day", "World-class tapas", "Buzzing Gothic Quarter"],
  },
  tokyo: {
    overview:
      "Tokyo is the future and the past stitched together — neon-soaked crossings and centuries-old shrines, Michelin ramen counters and serene gardens, all run with a precision that feels like magic. It rewards the curious like nowhere else on earth.",
    highlights: ["Best food city on the planet", "Ancient shrines + neon nights", "Effortless transit", "Endless micro-neighborhoods"],
  },
  marrakech: {
    overview:
      "Marrakech is a feast for the senses — a labyrinth of spice-scented souks, hidden riad courtyards, and palaces glowing in desert light. Step through any keyhole arch and the Red City reveals another layer of color, craft and ceremony.",
    highlights: ["Maze-like souks", "Hidden riad gardens", "Sunset on Jemaa el-Fnaa", "Rich Moroccan cuisine"],
  },
  paris: {
    overview:
      "Paris earns its legend with effortless beauty — boulevards made for wandering, the world's greatest museums, and a café culture that turns doing nothing into an art form. Every arrondissement feels like a different love letter to the good life.",
    highlights: ["Iconic monuments", "Louvre & d'Orsay", "Café & pastry culture", "Romantic riverside walks"],
  },
  rome: {
    overview:
      "Rome is an open-air museum where you eat the best carbonara of your life in the shadow of a 2,000-year-old amphitheatre. Ancient ruins, baroque fountains and buzzing piazzas collide on every corner of the Eternal City.",
    highlights: ["Colosseum & Forum", "Vatican masterpieces", "Legendary Roman food", "Fountains on every piazza"],
  },
  dubai: {
    overview:
      "Dubai turns the impossible into a skyline — the world's tallest tower, man-made islands, gold souks and desert dunes minutes from five-star beaches. It's a bold, polished playground built to dazzle.",
    highlights: ["Record-breaking skyline", "Luxury shopping", "Desert + beach combo", "Futuristic landmarks"],
  },
  london: {
    overview:
      "London is a world inside a city — free world-class museums, royal pageantry, leafy parks and a different culture (and cuisine) in every borough. History and reinvention share the same street.",
    highlights: ["Free iconic museums", "Royal landmarks", "Global food scene", "Markets & green parks"],
  },
  "new york": {
    overview:
      "New York runs at a current you can feel the moment you arrive — skyline views, Central Park escapes, Broadway lights and a slice of the world's best pizza at 2am. The city that never sleeps gives you a lifetime of trips in one.",
    highlights: ["Unforgettable skyline", "Central Park", "Museums & Broadway", "Iconic food, 24/7"],
  },
};

const INTEREST_PHRASE: Record<Interest, string> = {
  monuments: "landmark monuments",
  museums: "standout museums",
  beaches: "easygoing beach time",
  nature: "green escapes and views",
  food: "a memorable food scene",
  architecture: "striking architecture",
  shopping: "great shopping",
  photography: "photogenic corners",
  nightlife: "a lively night scene",
};

/** Build a grounded overview when there's no curated copy and no live AI. */
export function buildOverview(req: TripRequest): Overview {
  const seed = findSeedCity(req.destination);
  const key = seed?.name.toLowerCase();
  if (key && CURATED[key]) {
    // Return a copy — callers may enrich/replace these fields.
    return { overview: CURATED[key].overview, highlights: [...CURATED[key].highlights] };
  }

  const name = seed?.name ?? req.destination;
  const interests = (req.interests ?? []).slice(0, 3);
  const phrases = interests.map((i) => INTEREST_PHRASE[i]).filter(Boolean);
  const interestLine = phrases.length
    ? `It's a great match for ${joinNicely(phrases)}.`
    : "It blends iconic sights, local flavor and easy days of wandering.";

  return {
    overview:
      `${name} is well worth the trip. ${interestLine} This plan groups the highlights by neighborhood so each day stays close-knit — less time in transit, more time actually enjoying the place.`,
    highlights: phrases.length
      ? phrases.map(capitalize)
      : ["Iconic highlights", "Local food", "Walkable days", "Hidden gems"],
  };
}

function joinNicely(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
