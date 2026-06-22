/**
 * Destination Knowledge Packs — curated local-expert data.
 *
 * These are REAL, well-known place names (not invented) that encode destination
 * expertise: the must-see Tier-1 sights, strong Tier-2 sights, the best sunset
 * spots, signature food experiences, key neighborhoods and cultural experiences,
 * plus practical planning facts (best months, budget, weather, attraction count).
 *
 * The engine uses these FIRST — to guarantee famous sights always appear and to
 * tier/score places — and only uses AI to organise, explain and personalise.
 */

export interface KnowledgePack {
  city: string;
  country: string;
  aliases?: string[];
  /** Tier 1 — must-see, always included first. */
  mustSee: string[];
  /** Tier 2 — strong attractions. */
  strong: string[];
  /** Best places to catch sunset / golden hour. */
  sunsetSpots: string[];
  /** Signature food experiences (described, matched to real venues by the pool). */
  foodExperiences: string[];
  /** Key neighborhoods to base each day around. */
  neighborhoods: string[];
  /** Cultural / local experiences beyond monuments. */
  culturalExperiences: string[];
  /** Best months to visit (short names). */
  bestMonths: string[];
  /** Approx number of notable attractions (for the Discover page). */
  attractionCount: number;
  /** Rough per-person daily budget in USD by tier (excl. flights/hotel). */
  budgetPerDay: { economy: number; medium: number; luxury: number };
  /** One-line weather/seasonal guidance. */
  weatherNote: string;
  /** How confident we are in our coverage of this destination (0..100). */
  confidence: number;
}

const PACKS: KnowledgePack[] = [
  {
    city: "Marrakech",
    country: "Morocco",
    aliases: ["marrakesh"],
    mustSee: ["Jemaa el-Fnaa", "Koutoubia Mosque", "Bahia Palace", "Jardin Majorelle"],
    strong: ["Saadian Tombs", "Ben Youssef Madrasa", "El Badi Palace", "Menara Gardens", "Le Jardin Secret", "Maison de la Photographie"],
    sunsetSpots: ["Kabana Rooftop", "El Fenn Rooftop", "Nomad Rooftop", "Café des Épices Terrace"],
    foodExperiences: ["Traditional Moroccan breakfast", "Tagine lunch in the medina", "Jemaa el-Fnaa street food", "Mint tea on a rooftop"],
    neighborhoods: ["Medina", "Gueliz", "Kasbah", "Mellah"],
    culturalExperiences: ["Souk exploration", "Artisan workshops", "Traditional hammam", "Henna & spice markets"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 35,
    budgetPerDay: { economy: 35, medium: 75, luxury: 200 },
    weatherNote: "Spring and autumn are ideal; summers are very hot — keep midday indoors.",
    confidence: 95,
  },
  {
    city: "Madrid",
    country: "Spain",
    mustSee: ["Museo del Prado", "Royal Palace of Madrid", "Buen Retiro Park", "Plaza Mayor"],
    strong: ["Puerta del Sol", "Museo Reina Sofía", "Thyssen-Bornemisza Museum", "Gran Vía", "Almudena Cathedral", "Temple of Debod", "Mercado de San Miguel"],
    sunsetSpots: ["Temple of Debod", "Círculo de Bellas Artes Rooftop", "Parque de las Siete Tetas"],
    foodExperiences: ["Churros con chocolate breakfast", "Tapas crawl in La Latina", "Cocido madrileño lunch", "Mercado de San Miguel bites"],
    neighborhoods: ["Centro", "La Latina", "Malasaña", "Chueca", "Salamanca"],
    culturalExperiences: ["Flamenco show", "El Rastro flea market", "Retiro Park rowboats", "Golden Triangle of Art"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 50,
    budgetPerDay: { economy: 60, medium: 120, luxury: 300 },
    weatherNote: "Warm, dry summers and mild springs/autumns; July–August midday heat is intense.",
    confidence: 96,
  },
  {
    city: "Tangier",
    country: "Morocco",
    aliases: ["tanger", "tangiers"],
    mustSee: ["Caves of Hercules", "Cap Spartel", "Kasbah of Tangier", "Grand Socco"],
    strong: ["Medina of Tangier", "American Legation Museum", "Petit Socco", "Kasbah Museum", "St. Andrew's Church", "Mendoubia Gardens"],
    sunsetSpots: ["Café Hafa", "Cap Spartel Lighthouse", "Hotel Continental Terrace"],
    foodExperiences: ["Moroccan breakfast with msemen", "Fresh seafood at the port", "Mint tea at Café Hafa", "Tagine in the medina"],
    neighborhoods: ["Medina", "Kasbah", "Ville Nouvelle", "Marshan"],
    culturalExperiences: ["Medina & souk walk", "Literary Tangier (Bowles, Beat writers)", "Grand Socco market", "Atlantic corniche stroll"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 22,
    budgetPerDay: { economy: 30, medium: 65, luxury: 160 },
    weatherNote: "Mild Mediterranean climate; spring and early autumn are best, summers are breezy.",
    confidence: 88,
  },
  {
    city: "Tokyo",
    country: "Japan",
    mustSee: ["Senso-ji", "Meiji Shrine", "Shibuya Crossing", "Tokyo Skytree"],
    strong: ["Tokyo Tower", "Ueno Park", "Tsukiji Outer Market", "Shinjuku Gyoen", "teamLab Planets", "Imperial Palace", "Asakusa", "Akihabara"],
    sunsetSpots: ["Tokyo Metropolitan Government Building Observation Deck", "Shibuya Sky", "Roppongi Hills Mori Tower", "Odaiba Seaside Park"],
    foodExperiences: ["Tsukiji sushi breakfast", "Ramen lunch", "Izakaya hopping in Omoide Yokocho", "Conveyor-belt sushi"],
    neighborhoods: ["Shinjuku", "Shibuya", "Asakusa", "Ginza", "Akihabara", "Harajuku"],
    culturalExperiences: ["Tea ceremony", "Sumo (seasonal)", "Robot/anime culture in Akihabara", "Onsen / sento bathhouse"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 70,
    budgetPerDay: { economy: 70, medium: 150, luxury: 400 },
    weatherNote: "Cherry blossoms in late March–April, vivid foliage in November; June is rainy, August humid.",
    confidence: 93,
  },
  {
    city: "Paris",
    country: "France",
    mustSee: ["Eiffel Tower", "Louvre Museum", "Notre-Dame de Paris", "Arc de Triomphe"],
    strong: ["Musée d'Orsay", "Sacré-Cœur", "Sainte-Chapelle", "Champs-Élysées", "Luxembourg Gardens", "Centre Pompidou", "Montmartre", "Palais Garnier"],
    sunsetSpots: ["Trocadéro", "Sacré-Cœur steps", "Galeries Lafayette Rooftop", "Pont Alexandre III"],
    foodExperiences: ["Croissant & café breakfast", "Bistro lunch", "Cheese & wine tasting", "Patisserie tour"],
    neighborhoods: ["Le Marais", "Saint-Germain-des-Prés", "Montmartre", "Latin Quarter", "Champs-Élysées"],
    culturalExperiences: ["Seine river cruise", "Open-air markets", "Cabaret show", "Bouquinistes book stalls"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 80,
    budgetPerDay: { economy: 70, medium: 150, luxury: 400 },
    weatherNote: "Late spring and early autumn are loveliest; summers busy, winters grey but quiet.",
    confidence: 96,
  },
  {
    city: "Rome",
    country: "Italy",
    mustSee: ["Colosseum", "Vatican Museums", "Trevi Fountain", "Pantheon"],
    strong: ["Roman Forum", "St. Peter's Basilica", "Piazza Navona", "Spanish Steps", "Castel Sant'Angelo", "Borghese Gallery", "Palatine Hill", "Trastevere"],
    sunsetSpots: ["Giardino degli Aranci", "Pincio Terrace", "Castel Sant'Angelo Bridge", "Gianicolo Hill"],
    foodExperiences: ["Espresso & cornetto breakfast", "Cacio e pepe lunch", "Gelato walk", "Trastevere dinner"],
    neighborhoods: ["Centro Storico", "Trastevere", "Monti", "Vaticano", "Testaccio"],
    culturalExperiences: ["Catacombs visit", "Campo de' Fiori market", "Aperitivo hour", "Vatican at opening"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 75,
    budgetPerDay: { economy: 60, medium: 130, luxury: 350 },
    weatherNote: "Spring and autumn are perfect; July–August are hot and crowded.",
    confidence: 95,
  },
  {
    city: "Barcelona",
    country: "Spain",
    mustSee: ["Sagrada Família", "Park Güell", "La Rambla", "Casa Batlló"],
    strong: ["Casa Milà (La Pedrera)", "Gothic Quarter", "Picasso Museum", "Montjuïc", "Barceloneta Beach", "Camp Nou", "Mercat de la Boqueria", "Palau de la Música Catalana"],
    sunsetSpots: ["Bunkers del Carmel", "Montjuïc Castle", "W Hotel Eclipse Bar", "Barceloneta Beach"],
    foodExperiences: ["Catalan breakfast", "Tapas & vermouth", "Paella by the sea", "La Boqueria market bites"],
    neighborhoods: ["Gothic Quarter", "El Born", "Eixample", "Gràcia", "Barceloneta"],
    culturalExperiences: ["Gaudí architecture trail", "Flamenco & rumba", "Beach promenade", "Boqueria market"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 60,
    budgetPerDay: { economy: 60, medium: 125, luxury: 320 },
    weatherNote: "Mild most of the year; May–June and September are the sweet spot.",
    confidence: 95,
  },
  {
    city: "Istanbul",
    country: "Turkey",
    aliases: ["constantinople"],
    mustSee: ["Hagia Sophia", "Blue Mosque", "Topkapı Palace", "Grand Bazaar"],
    strong: ["Basilica Cistern", "Süleymaniye Mosque", "Galata Tower", "Spice Bazaar", "Dolmabahçe Palace", "Chora Church", "Bosphorus", "Istiklal Avenue"],
    sunsetSpots: ["Galata Tower", "Süleymaniye Mosque Terrace", "Pierre Loti Hill", "Bosphorus ferry"],
    foodExperiences: ["Turkish breakfast", "Balık ekmek by the Galata Bridge", "Kebab lunch", "Baklava & Turkish tea"],
    neighborhoods: ["Sultanahmet", "Beyoğlu", "Karaköy", "Kadıköy", "Balat"],
    culturalExperiences: ["Turkish hammam", "Bosphorus cruise", "Grand Bazaar haggling", "Whirling dervishes"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 65,
    budgetPerDay: { economy: 40, medium: 90, luxury: 240 },
    weatherNote: "Spring and autumn are ideal; summers hot, winters cool and damp.",
    confidence: 93,
  },
  {
    city: "Lisbon",
    country: "Portugal",
    aliases: ["lisboa"],
    mustSee: ["Belém Tower", "Jerónimos Monastery", "São Jorge Castle", "Alfama"],
    strong: ["Praça do Comércio", "LX Factory", "Time Out Market", "Tram 28 route", "Padrão dos Descobrimentos", "Bairro Alto", "Oceanário de Lisboa"],
    sunsetSpots: ["Miradouro da Senhora do Monte", "Miradouro de Santa Catarina", "Miradouro das Portas do Sol", "Park Rooftop Bar"],
    foodExperiences: ["Pastel de nata breakfast", "Bacalhau lunch", "Time Out Market tasting", "Ginjinha & seafood dinner"],
    neighborhoods: ["Alfama", "Baixa", "Bairro Alto", "Belém", "Chiado"],
    culturalExperiences: ["Fado night", "Tram 28 ride", "Miradouro hopping", "Azulejo tile trail"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 45,
    budgetPerDay: { economy: 50, medium: 100, luxury: 260 },
    weatherNote: "Sunny and mild most of the year; spring and early autumn are best.",
    confidence: 92,
  },
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const INDEX = new Map<string, KnowledgePack>();
for (const p of PACKS) {
  INDEX.set(norm(p.city), p);
  p.aliases?.forEach((a) => INDEX.set(norm(a), p));
}

/** Look up a destination's knowledge pack by city name (tolerant matching). */
export function getKnowledgePack(destination: string): KnowledgePack | undefined {
  if (!destination) return undefined;
  const first = destination.split(",")[0];
  const key = norm(first);
  if (INDEX.has(key)) return INDEX.get(key);
  // tolerate "City Name Region" by checking each known key as a substring
  for (const [k, pack] of INDEX) {
    if (key.includes(k) || k.includes(key)) return pack;
  }
  return undefined;
}

/** Normalised set of all Tier-1 + Tier-2 names for quick membership tests. */
export function packNameTier(pack: KnowledgePack, placeName: string): 1 | 2 | 0 {
  const n = norm(placeName);
  const hit = (list: string[]) => list.some((x) => {
    const nx = norm(x);
    return nx === n || (nx.length >= 5 && (n.includes(nx) || nx.includes(n)));
  });
  if (hit(pack.mustSee)) return 1;
  if (hit(pack.strong)) return 2;
  return 0;
}

export { norm as normName };
