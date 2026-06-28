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
  /** Tier 3 — real, verifiable hidden gems (authentic, lower-traffic spots).
   *  A pool place matching one of these is treated as a confirmed gem even if
   *  the generic heuristic in `gemConfidence()` wouldn't have flagged it. */
  hiddenGems?: string[];
  /** Tier 4 — local-favorite venues (the kind a local would actually
   *  recommend), used to nudge restaurant/café/bar picks beyond whatever a
   *  generic API search happens to return first. */
  localRecommendations?: string[];
  /** Real, named nightlife venues (bars/clubs/rooftops/beach clubs) — used to
   *  prefer an actual known venue over a generic nearby bar when picking the
   *  evening stop. */
  nightlife?: string[];
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
  /** One-line getting-around guidance (real, stable transit facts). */
  transportTip?: string;
}

const PACKS: KnowledgePack[] = [
  {
    city: "Marrakech",
    country: "Morocco",
    aliases: ["marrakesh"],
    mustSee: ["Jemaa el-Fnaa", "Koutoubia Mosque", "Bahia Palace", "Jardin Majorelle"],
    strong: ["Saadian Tombs", "Ben Youssef Madrasa", "El Badi Palace", "Menara Gardens", "Le Jardin Secret", "Maison de la Photographie"],
    nightlife: ["Theatro Marrakech", "Pacha Marrakech", "Comptoir Darna", "Kabana Rooftop"],
    sunsetSpots: ["Kabana Rooftop", "El Fenn Rooftop", "Nomad Rooftop", "Café des Épices Terrace"],
    foodExperiences: ["Traditional Moroccan breakfast", "Tagine lunch in the medina", "Jemaa el-Fnaa street food", "Mint tea on a rooftop"],
    neighborhoods: ["Medina", "Gueliz", "Kasbah", "Mellah"],
    culturalExperiences: ["Souk exploration", "Artisan workshops", "Traditional hammam", "Henna & spice markets"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 35,
    budgetPerDay: { economy: 35, medium: 75, luxury: 200 },
    weatherNote: "Spring and autumn are ideal; summers are very hot — keep midday indoors.",
    confidence: 95,
    transportTip: "The medina is car-free and best on foot; use petit taxis (agree the fare first) for Gueliz and beyond.",
  },
  {
    city: "Madrid",
    country: "Spain",
    mustSee: ["Museo del Prado", "Royal Palace of Madrid", "Buen Retiro Park", "Plaza Mayor"],
    strong: ["Puerta del Sol", "Museo Reina Sofía", "Thyssen-Bornemisza Museum", "Gran Vía", "Almudena Cathedral", "Temple of Debod", "Mercado de San Miguel"],
    nightlife: ["Teatro Kapital", "Joy Eslava"],
    sunsetSpots: ["Temple of Debod", "Círculo de Bellas Artes Rooftop", "Parque de las Siete Tetas"],
    foodExperiences: ["Churros con chocolate breakfast", "Tapas crawl in La Latina", "Cocido madrileño lunch", "Mercado de San Miguel bites"],
    neighborhoods: ["Centro", "La Latina", "Malasaña", "Chueca", "Salamanca"],
    culturalExperiences: ["Flamenco show", "El Rastro flea market", "Retiro Park rowboats", "Golden Triangle of Art"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 50,
    budgetPerDay: { economy: 60, medium: 120, luxury: 300 },
    weatherNote: "Warm, dry summers and mild springs/autumns; July–August midday heat is intense.",
    confidence: 96,
    transportTip: "The metro is excellent and cheap; the center is compact enough to walk between most sights.",
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
    nightlife: ["Golden Gai", "New York Bar", "Womb Shibuya"],
    sunsetSpots: ["Tokyo Metropolitan Government Building Observation Deck", "Shibuya Sky", "Roppongi Hills Mori Tower", "Odaiba Seaside Park"],
    foodExperiences: ["Tsukiji sushi breakfast", "Ramen lunch", "Izakaya hopping in Omoide Yokocho", "Conveyor-belt sushi"],
    neighborhoods: ["Shinjuku", "Shibuya", "Asakusa", "Ginza", "Akihabara", "Harajuku"],
    culturalExperiences: ["Tea ceremony", "Sumo (seasonal)", "Robot/anime culture in Akihabara", "Onsen / sento bathhouse"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 70,
    budgetPerDay: { economy: 70, medium: 150, luxury: 400 },
    weatherNote: "Cherry blossoms in late March–April, vivid foliage in November; June is rainy, August humid.",
    confidence: 93,
    transportTip: "Trains and the metro reach everywhere — get a Suica/PASMO card; note they stop around midnight.",
  },
  {
    city: "Paris",
    country: "France",
    mustSee: ["Eiffel Tower", "Louvre Museum", "Notre-Dame de Paris", "Arc de Triomphe"],
    strong: ["Musée d'Orsay", "Sacré-Cœur", "Sainte-Chapelle", "Champs-Élysées", "Luxembourg Gardens", "Centre Pompidou", "Montmartre", "Palais Garnier"],
    nightlife: ["Moulin Rouge", "Le Baron", "Castel"],
    sunsetSpots: ["Trocadéro", "Sacré-Cœur steps", "Galeries Lafayette Rooftop", "Pont Alexandre III"],
    foodExperiences: ["Croissant & café breakfast", "Bistro lunch", "Cheese & wine tasting", "Patisserie tour"],
    neighborhoods: ["Le Marais", "Saint-Germain-des-Prés", "Montmartre", "Latin Quarter", "Champs-Élysées"],
    culturalExperiences: ["Seine river cruise", "Open-air markets", "Cabaret show", "Bouquinistes book stalls"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 80,
    budgetPerDay: { economy: 70, medium: 150, luxury: 400 },
    weatherNote: "Late spring and early autumn are loveliest; summers busy, winters grey but quiet.",
    confidence: 96,
    transportTip: "The Métro is dense, fast and cheap; central Paris is also very walkable along the river.",
  },
  {
    city: "Rome",
    country: "Italy",
    mustSee: ["Colosseum", "Vatican Museums", "Trevi Fountain", "Pantheon"],
    strong: ["Roman Forum", "St. Peter's Basilica", "Piazza Navona", "Spanish Steps", "Castel Sant'Angelo", "Borghese Gallery", "Palatine Hill", "Trastevere"],
    nightlife: ["Freni e Frizioni", "Jerry Thomas Project", "Goa Club"],
    sunsetSpots: ["Giardino degli Aranci", "Pincio Terrace", "Castel Sant'Angelo Bridge", "Gianicolo Hill"],
    foodExperiences: ["Espresso & cornetto breakfast", "Cacio e pepe lunch", "Gelato walk", "Trastevere dinner"],
    neighborhoods: ["Centro Storico", "Trastevere", "Monti", "Vaticano", "Testaccio"],
    culturalExperiences: ["Catacombs visit", "Campo de' Fiori market", "Aperitivo hour", "Vatican at opening"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 75,
    budgetPerDay: { economy: 60, medium: 130, luxury: 350 },
    weatherNote: "Spring and autumn are perfect; July–August are hot and crowded.",
    confidence: 95,
    transportTip: "The historic center is best on foot; the metro and buses help for the Vatican and the outskirts.",
  },
  {
    city: "Barcelona",
    country: "Spain",
    mustSee: ["Sagrada Família", "Park Güell", "La Rambla", "Casa Batlló"],
    strong: ["Casa Milà (La Pedrera)", "Gothic Quarter", "Picasso Museum", "Montjuïc", "Barceloneta Beach", "Camp Nou", "Mercat de la Boqueria", "Palau de la Música Catalana"],
    nightlife: ["Razzmatazz", "Pacha Barcelona"],
    sunsetSpots: ["Bunkers del Carmel", "Montjuïc Castle", "W Hotel Eclipse Bar", "Barceloneta Beach"],
    foodExperiences: ["Catalan breakfast", "Tapas & vermouth", "Paella by the sea", "La Boqueria market bites"],
    neighborhoods: ["Gothic Quarter", "El Born", "Eixample", "Gràcia", "Barceloneta"],
    culturalExperiences: ["Gaudí architecture trail", "Flamenco & rumba", "Beach promenade", "Boqueria market"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 60,
    budgetPerDay: { economy: 60, medium: 125, luxury: 320 },
    weatherNote: "Mild most of the year; May–June and September are the sweet spot.",
    confidence: 95,
    transportTip: "The metro is fast and cheap; buy a T-casual multi-ride and walk the compact center.",
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
    transportTip: "Trams, the metro and ferries connect the two sides; an Istanbulkart makes hopping between them easy.",
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
    transportTip: "Trams (the 28!), funiculars and the metro tackle the hills; expect a lot of walking on cobbles.",
  },

  // ── Morocco ──────────────────────────────────────────────────────────────
  {
    city: "Fes", country: "Morocco", aliases: ["fez"],
    mustSee: ["Al-Qarawiyyin", "Bou Inania Madrasa", "Chouara Tannery", "Bab Bou Jeloud"],
    strong: ["Fes el-Bali Medina", "Nejjarine Museum", "Marinid Tombs", "Jnan Sbil Gardens", "Dar Batha Museum", "Andalusian Mosque"],
    sunsetSpots: ["Marinid Tombs", "Borj Nord"],
    foodExperiences: ["Moroccan breakfast", "Pastilla", "Tagine in the medina", "Mint tea"],
    neighborhoods: ["Fes el-Bali", "Fes el-Jdid", "Ville Nouvelle"],
    culturalExperiences: ["Tanneries", "Artisan workshops", "Medina labyrinth walk", "Traditional hammam"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 30, budgetPerDay: { economy: 35, medium: 75, luxury: 180 },
    weatherNote: "Spring and autumn are ideal; summers are hot — keep midday indoors.", confidence: 90,
  },
  {
    city: "Chefchaouen", country: "Morocco", aliases: ["chaouen"],
    mustSee: ["Chefchaouen Medina", "Plaza Uta el-Hammam", "Kasbah Museum", "Spanish Mosque"],
    strong: ["Ras El Maa Waterfall", "Grand Mosque", "Akchour Waterfalls", "Place el-Haouta"],
    sunsetSpots: ["Spanish Mosque", "Ras El Maa"],
    foodExperiences: ["Moroccan breakfast", "Goat cheese", "Tagine", "Mint tea"],
    neighborhoods: ["Medina", "Andalusian Quarter"],
    culturalExperiences: ["Blue-street photography", "Weaving cooperatives", "Rif mountain hikes"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 12, budgetPerDay: { economy: 25, medium: 55, luxury: 130 },
    weatherNote: "Cool mountain air; spring and autumn are loveliest.", confidence: 86,
  },
  {
    city: "Casablanca", country: "Morocco", aliases: ["casa"],
    mustSee: [
      "Hassan II Mosque", "Corniche Ain Diab", "Casablanca Marina", "Morocco Mall",
      "Twin Center", "Habous Quarter", "Old Medina of Casablanca", "Arab League Park",
      "Mohammed V Square",
    ],
    strong: [
      "Sky 28", "Le Cabestan", "Rick's Café", "La Sqala", "Anfa Place",
      "Villa des Arts", "Cathédrale du Sacré-Cœur",
    ],
    hiddenGems: ["La Sqala", "Ancienne Médina ramparts", "Parc Murdoch"],
    localRecommendations: ["La Sqala", "Le Cabestan", "Rick's Café", "Bodega"],
    nightlife: ["Sky 28", "Le Cabestan", "Tahiti Beach Club", "Bodega"],
    sunsetSpots: ["Corniche Ain Diab", "Hassan II Mosque esplanade", "Sky 28"],
    foodExperiences: ["Fresh seafood at Le Cabestan", "Breakfast in La Sqala's garden", "Moroccan breakfast", "Street food", "Café culture in Maarif"],
    neighborhoods: ["Centre Ville", "Ain Diab", "Habous", "Maarif", "Gauthier"],
    culturalExperiences: ["Art Deco architecture walk", "Mosque tour", "Corniche stroll", "Twin Center & Maarif shopping"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct", "Nov"],
    attractionCount: 22, budgetPerDay: { economy: 40, medium: 85, luxury: 200 },
    weatherNote: "Mild Atlantic climate year-round; spring and autumn are best.", confidence: 88,
  },
  {
    city: "Rabat", country: "Morocco",
    mustSee: ["Hassan Tower", "Kasbah of the Udayas", "Chellah", "Mausoleum of Mohammed V"],
    strong: ["Royal Palace of Rabat", "Medina of Rabat", "Andalusian Gardens", "Mohammed VI Museum of Modern Art"],
    sunsetSpots: ["Kasbah of the Udayas", "Oudaias platform"],
    foodExperiences: ["Seafood", "Moroccan breakfast", "Tagine", "Mint tea"],
    neighborhoods: ["Medina", "Hassan", "Agdal"],
    culturalExperiences: ["Roman ruins of Chellah", "Kasbah walk", "Andalusian gardens"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct", "Nov"],
    attractionCount: 20, budgetPerDay: { economy: 35, medium: 80, luxury: 190 },
    weatherNote: "Mild coastal climate; spring and autumn are ideal.", confidence: 86,
  },
  {
    city: "Essaouira", country: "Morocco", aliases: ["mogador"],
    mustSee: ["Essaouira Medina", "Skala de la Ville", "Port of Essaouira", "Place Moulay Hassan"],
    strong: ["Skala du Port", "Essaouira Beach", "Galerie d'Art Damgaard", "Mellah"],
    sunsetSpots: ["Skala de la Ville ramparts", "Essaouira Beach"],
    foodExperiences: ["Grilled sardines", "Fresh seafood", "Moroccan breakfast", "Argan products"],
    neighborhoods: ["Medina", "Kasbah", "Beachfront"],
    culturalExperiences: ["Gnaoua music", "Ramparts walk", "Windsurfing", "Art galleries"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 12, budgetPerDay: { economy: 35, medium: 75, luxury: 180 },
    weatherNote: "Breezy and mild all year; the 'Windy City' — bring a layer.", confidence: 86,
  },
  {
    city: "Meknes", country: "Morocco",
    mustSee: ["Bab Mansour", "Mausoleum of Moulay Ismail", "Heri es-Souani", "Place el-Hedim"],
    strong: ["Medina of Meknes", "Volubilis", "Dar Jamai Museum", "Bou Inania Madrasa"],
    sunsetSpots: ["City ramparts", "Place el-Hedim"],
    foodExperiences: ["Moroccan breakfast", "Tagine", "Street food", "Mint tea"],
    neighborhoods: ["Medina", "Ville Impériale"],
    culturalExperiences: ["Imperial monuments", "Volubilis Roman ruins", "Souk walk"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 16, budgetPerDay: { economy: 30, medium: 70, luxury: 170 },
    weatherNote: "Spring and autumn are best; hot summers, cool winters.", confidence: 85,
  },
  {
    city: "Ouarzazate", country: "Morocco",
    mustSee: ["Aït Benhaddou", "Taourirt Kasbah", "Atlas Film Studios", "Fint Oasis"],
    strong: ["Tifoultoute Kasbah", "Draa Valley", "Skoura Palm Grove"],
    sunsetSpots: ["Aït Benhaddou", "Fint Oasis"],
    foodExperiences: ["Berber tagine", "Moroccan breakfast", "Mint tea"],
    neighborhoods: ["Centre", "Kasbah area"],
    culturalExperiences: ["Kasbahs", "Film studios", "Gateway to the desert"],
    bestMonths: ["Mar", "Apr", "May", "Sep", "Oct", "Nov"],
    attractionCount: 8, budgetPerDay: { economy: 30, medium: 70, luxury: 180 },
    weatherNote: "Desert climate; spring and autumn are comfortable, summers very hot.", confidence: 84,
  },

  // ── Spain ────────────────────────────────────────────────────────────────
  {
    city: "Seville", country: "Spain", aliases: ["sevilla"],
    mustSee: ["Seville Cathedral", "Real Alcázar of Seville", "Plaza de España", "Metropol Parasol"],
    strong: ["Barrio Santa Cruz", "Torre del Oro", "Triana", "Casa de Pilatos", "Maria Luisa Park"],
    sunsetSpots: ["Metropol Parasol", "Triana riverside", "Plaza de España"],
    foodExperiences: ["Tapas crawl", "Jamón ibérico", "Churros", "Orange wine"],
    neighborhoods: ["Santa Cruz", "Triana", "Alfalfa"],
    culturalExperiences: ["Flamenco", "Alcázar gardens", "Semana Santa", "Tapas culture"],
    bestMonths: ["Mar", "Apr", "May", "Sep", "Oct"],
    attractionCount: 40, budgetPerDay: { economy: 50, medium: 110, luxury: 290 },
    weatherNote: "Spring and autumn are perfect; summers are extremely hot.", confidence: 95,
  },
  {
    city: "Granada", country: "Spain",
    mustSee: ["Alhambra", "Generalife", "Albaicín", "Granada Cathedral"],
    strong: ["Royal Chapel of Granada", "Mirador de San Nicolás", "Sacromonte", "Alcaicería"],
    sunsetSpots: ["Mirador de San Nicolás", "Albaicín viewpoints"],
    foodExperiences: ["Free tapas", "Moorish tea", "Pomegranate dishes", "Tortilla del Sacromonte"],
    neighborhoods: ["Albaicín", "Sacromonte", "Realejo"],
    culturalExperiences: ["Flamenco in cave houses", "Moorish heritage", "Tea houses", "Alhambra at night"],
    bestMonths: ["Mar", "Apr", "May", "Sep", "Oct"],
    attractionCount: 25, budgetPerDay: { economy: 45, medium: 100, luxury: 270 },
    weatherNote: "Spring and autumn are ideal; hot summers, cool mountain winters.", confidence: 95,
  },
  {
    city: "Valencia", country: "Spain",
    mustSee: ["City of Arts and Sciences", "Valencia Cathedral", "Mercado Central", "La Lonja de la Seda"],
    strong: ["Turia Gardens", "Oceanogràfic", "Plaza de la Virgen", "Malvarrosa Beach"],
    sunsetSpots: ["Turia Gardens", "Malvarrosa Beach"],
    foodExperiences: ["Paella valenciana", "Horchata & fartons", "Tapas", "Agua de Valencia"],
    neighborhoods: ["Ciutat Vella", "El Carmen", "Ruzafa"],
    culturalExperiences: ["Paella origins", "Las Fallas", "Beach day", "Futuristic architecture"],
    bestMonths: ["Mar", "Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 30, budgetPerDay: { economy: 50, medium: 105, luxury: 270 },
    weatherNote: "Mild Mediterranean climate; spring and early autumn are best.", confidence: 92,
  },
  {
    city: "Córdoba", country: "Spain", aliases: ["cordoba"],
    mustSee: ["Mezquita-Catedral de Córdoba", "Alcázar de los Reyes Cristianos", "Roman Bridge of Córdoba", "Judería"],
    strong: ["Calleja de las Flores", "Palacio de Viana", "Medina Azahara", "Plaza de la Corredera"],
    sunsetSpots: ["Roman Bridge", "Calahorra Tower"],
    foodExperiences: ["Salmorejo", "Flamenquín", "Tapas", "Montilla-Moriles wine"],
    neighborhoods: ["Judería", "Centro"],
    culturalExperiences: ["Patios festival", "Moorish heritage", "Flamenco"],
    bestMonths: ["Mar", "Apr", "May", "Oct"],
    attractionCount: 20, budgetPerDay: { economy: 45, medium: 95, luxury: 250 },
    weatherNote: "Spring is glorious (patios in May); summers are scorching.", confidence: 92,
  },
  {
    city: "Bilbao", country: "Spain",
    mustSee: ["Guggenheim Museum Bilbao", "Casco Viejo", "Mercado de la Ribera", "Plaza Nueva"],
    strong: ["Funicular de Artxanda", "Museo de Bellas Artes", "Zubizuri Bridge", "San Mamés"],
    sunsetSpots: ["Artxanda viewpoint"],
    foodExperiences: ["Pintxos", "Txakoli wine", "Basque seafood", "Bacalao"],
    neighborhoods: ["Casco Viejo", "Abando", "Indautxu"],
    culturalExperiences: ["Pintxos culture", "Basque art", "Guggenheim architecture"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 18, budgetPerDay: { economy: 60, medium: 120, luxury: 300 },
    weatherNote: "Green and rainy; summer is the driest, mildest window.", confidence: 90,
  },
  {
    city: "San Sebastián", country: "Spain", aliases: ["donostia", "san sebastian"],
    mustSee: ["La Concha Beach", "Monte Igueldo", "Parte Vieja", "Monte Urgull"],
    strong: ["Peine del Viento", "Zurriola Beach", "San Telmo Museum", "Miramar Palace"],
    sunsetSpots: ["Monte Igueldo", "La Concha Bay"],
    foodExperiences: ["Pintxos (world-famous)", "Michelin dining", "Txakoli", "Cider houses"],
    neighborhoods: ["Parte Vieja", "Gros", "Centro"],
    culturalExperiences: ["Pintxos bars", "Beaches", "Gastronomy capital"],
    bestMonths: ["Jun", "Jul", "Aug", "Sep"],
    attractionCount: 15, budgetPerDay: { economy: 70, medium: 140, luxury: 360 },
    weatherNote: "Best in summer; mild but rainy the rest of the year.", confidence: 91,
  },
  {
    city: "Málaga", country: "Spain", aliases: ["malaga"],
    mustSee: ["Alcazaba of Málaga", "Picasso Museum", "Málaga Cathedral", "Gibralfaro Castle"],
    strong: ["Muelle Uno", "Roman Theatre", "Centre Pompidou Málaga", "La Malagueta Beach"],
    sunsetSpots: ["Gibralfaro", "Muelle Uno"],
    foodExperiences: ["Espetos (grilled sardines)", "Tapas", "Sweet Málaga wine", "Seafood"],
    neighborhoods: ["Centro Histórico", "Soho", "La Malagueta"],
    culturalExperiences: ["Picasso heritage", "Costa del Sol beaches", "Tapas"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 22, budgetPerDay: { economy: 50, medium: 105, luxury: 280 },
    weatherNote: "Sunny almost year-round; spring and autumn are ideal.", confidence: 90,
  },
  {
    city: "Toledo", country: "Spain",
    mustSee: ["Toledo Cathedral", "Alcázar of Toledo", "Monastery of San Juan de los Reyes", "Synagogue of Santa María la Blanca"],
    strong: ["Mirador del Valle", "El Greco Museum", "Puente de San Martín", "Plaza de Zocodover"],
    sunsetSpots: ["Mirador del Valle"],
    foodExperiences: ["Marzipan", "Partridge stew", "Manchego cheese", "Tapas"],
    neighborhoods: ["Casco Histórico", "Judería"],
    culturalExperiences: ["Three-cultures heritage", "El Greco trail", "Sword-making"],
    bestMonths: ["Mar", "Apr", "May", "Sep", "Oct"],
    attractionCount: 18, budgetPerDay: { economy: 45, medium: 95, luxury: 250 },
    weatherNote: "Spring and autumn are best; hot summers, cold winters.", confidence: 90,
  },

  // ── France ───────────────────────────────────────────────────────────────
  {
    city: "Nice", country: "France",
    mustSee: ["Promenade des Anglais", "Vieux Nice", "Castle Hill", "Cours Saleya Market"],
    strong: ["Place Masséna", "Russian Orthodox Cathedral", "Matisse Museum", "Marc Chagall Museum"],
    sunsetSpots: ["Castle Hill", "Promenade des Anglais"],
    foodExperiences: ["Socca", "Salade niçoise", "Provençal market", "Rosé wine"],
    neighborhoods: ["Vieux Nice", "Cimiez", "Port"],
    culturalExperiences: ["Riviera beaches", "Markets", "Art museums"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 20, budgetPerDay: { economy: 65, medium: 135, luxury: 360 },
    weatherNote: "Sunny Riviera; late spring through early autumn is ideal.", confidence: 92,
  },
  {
    city: "Lyon", country: "France",
    mustSee: ["Basilica of Notre-Dame de Fourvière", "Vieux Lyon", "Place Bellecour", "Parc de la Tête d'Or"],
    strong: ["Traboules", "Musée des Confluences", "Croix-Rousse", "Ancient Theatre of Fourvière"],
    sunsetSpots: ["Fourvière esplanade"],
    foodExperiences: ["Bouchon lyonnais", "Quenelle", "Praline tart", "Beaujolais wine"],
    neighborhoods: ["Vieux Lyon", "Presqu'île", "Croix-Rousse"],
    culturalExperiences: ["Gastronomy capital", "Silk-weaving history", "Traboules walk"],
    bestMonths: ["May", "Jun", "Jul", "Sep", "Oct"],
    attractionCount: 22, budgetPerDay: { economy: 60, medium: 125, luxury: 330 },
    weatherNote: "Pleasant late spring to early autumn; festive in December.", confidence: 90,
  },
  {
    city: "Bordeaux", country: "France",
    mustSee: ["Place de la Bourse", "La Cité du Vin", "Bordeaux Cathedral", "Pont de Pierre"],
    strong: ["Rue Sainte-Catherine", "Grand Théâtre de Bordeaux", "Darwin Ecosystème", "Basilica of Saint-Michel"],
    sunsetSpots: ["Miroir d'eau", "Garonne quays"],
    foodExperiences: ["Wine tasting", "Canelé", "Arcachon oysters", "Duck confit"],
    neighborhoods: ["Saint-Pierre", "Chartrons", "Saint-Michel"],
    culturalExperiences: ["Wine culture", "18th-century architecture", "Riverside life"],
    bestMonths: ["May", "Jun", "Sep", "Oct"],
    attractionCount: 18, budgetPerDay: { economy: 60, medium: 125, luxury: 330 },
    weatherNote: "Mild; late spring and early autumn (harvest) are best.", confidence: 90,
  },
  {
    city: "Marseille", country: "France",
    mustSee: ["Basilique Notre-Dame de la Garde", "Vieux-Port", "Le Panier", "Calanques National Park"],
    strong: ["MuCEM", "Château d'If", "Cours Julien", "Palais Longchamp"],
    sunsetSpots: ["Notre-Dame de la Garde", "Vallon des Auffes"],
    foodExperiences: ["Bouillabaisse", "Pastis", "Provençal seafood", "Navettes"],
    neighborhoods: ["Le Panier", "Vieux-Port", "Cours Julien"],
    culturalExperiences: ["Port culture", "Calanques boat trip", "Street art"],
    bestMonths: ["May", "Jun", "Sep", "Oct"],
    attractionCount: 20, budgetPerDay: { economy: 55, medium: 115, luxury: 300 },
    weatherNote: "Sunny and dry; spring and autumn avoid the summer crowds.", confidence: 88,
  },
  {
    city: "Strasbourg", country: "France",
    mustSee: ["Strasbourg Cathedral", "La Petite France", "Palais Rohan", "Ponts Couverts"],
    strong: ["European Parliament", "Barrage Vauban", "Place Kléber", "Alsatian Museum"],
    sunsetSpots: ["Barrage Vauban terrace"],
    foodExperiences: ["Tarte flambée", "Choucroute", "Alsace wine", "Pretzels"],
    neighborhoods: ["Grande Île", "Petite France", "Krutenau"],
    culturalExperiences: ["Franco-German heritage", "Canals", "Christmas market"],
    bestMonths: ["May", "Jun", "Sep", "Dec"],
    attractionCount: 15, budgetPerDay: { economy: 60, medium: 120, luxury: 320 },
    weatherNote: "Pleasant summers; magical (and cold) Christmas-market season.", confidence: 88,
  },
  {
    city: "Colmar", country: "France",
    mustSee: ["La Petite Venise", "Colmar Old Town", "Unterlinden Museum", "Maison Pfister"],
    strong: ["Quartier des Tanneurs", "Saint Martin's Church", "Koïfhus", "Bartholdi Museum"],
    sunsetSpots: ["La Petite Venise canals"],
    foodExperiences: ["Alsace wine", "Tarte flambée", "Kougelhopf", "Munster cheese"],
    neighborhoods: ["Old Town", "Petite Venise"],
    culturalExperiences: ["Half-timbered houses", "Alsace wine route", "Christmas market"],
    bestMonths: ["May", "Jun", "Sep", "Dec"],
    attractionCount: 10, budgetPerDay: { economy: 55, medium: 115, luxury: 300 },
    weatherNote: "Lovely in summer and at Christmas; one of France's driest towns.", confidence: 86,
  },
  {
    city: "Annecy", country: "France",
    mustSee: ["Lake Annecy", "Palais de l'Isle", "Annecy Old Town", "Château d'Annecy"],
    strong: ["Pont des Amours", "Jardins de l'Europe", "Basilica of the Visitation", "Lakeside cycle path"],
    sunsetSpots: ["Lake Annecy", "Pont des Amours"],
    foodExperiences: ["Tartiflette", "Fondue", "Savoyard cheese", "Lake fish"],
    neighborhoods: ["Vieille Ville", "Lakeside"],
    culturalExperiences: ["Alpine lake swimming", "Canals", "Cycling & paragliding"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 10, budgetPerDay: { economy: 60, medium: 125, luxury: 330 },
    weatherNote: "Best in summer for the lake; crisp, scenic shoulder seasons.", confidence: 86,
  },

  // ── Italy ────────────────────────────────────────────────────────────────
  {
    city: "Florence", country: "Italy", aliases: ["firenze"],
    mustSee: ["Florence Cathedral", "Uffizi Gallery", "Ponte Vecchio", "Galleria dell'Accademia"],
    strong: ["Piazzale Michelangelo", "Palazzo Vecchio", "Pitti Palace", "Boboli Gardens", "Basilica of Santa Croce"],
    sunsetSpots: ["Piazzale Michelangelo", "Bardini Gardens"],
    foodExperiences: ["Bistecca alla fiorentina", "Gelato", "Chianti wine", "Ribollita"],
    neighborhoods: ["Centro Storico", "Oltrarno", "Santa Croce"],
    culturalExperiences: ["Renaissance art", "Leather markets", "Tuscan wine"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 45, budgetPerDay: { economy: 65, medium: 135, luxury: 360 },
    weatherNote: "Spring and autumn are perfect; summers are hot and crowded.", confidence: 96,
    transportTip: "The historic center is small and entirely walkable — you won't need transit for the main sights.",
  },
  {
    city: "Venice", country: "Italy", aliases: ["venezia"],
    mustSee: ["St. Mark's Basilica", "Doge's Palace", "Rialto Bridge", "Grand Canal"],
    strong: ["Piazza San Marco", "Murano", "Burano", "Gallerie dell'Accademia", "Bridge of Sighs"],
    sunsetSpots: ["Punta della Dogana", "Accademia Bridge"],
    foodExperiences: ["Cicchetti", "Seafood risotto", "Aperol spritz", "Gelato"],
    neighborhoods: ["San Marco", "Dorsoduro", "Cannaregio"],
    culturalExperiences: ["Gondola ride", "Island hopping", "Glassmaking", "Carnival"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 35, budgetPerDay: { economy: 70, medium: 150, luxury: 400 },
    weatherNote: "Spring and autumn are best; summers crowded, winter brings acqua alta.", confidence: 96,
    transportTip: "There are no cars — you get around on foot or by vaporetto water buses along the canals.",
  },
  {
    city: "Milan", country: "Italy", aliases: ["milano"],
    mustSee: ["Milan Cathedral", "Galleria Vittorio Emanuele II", "Santa Maria delle Grazie", "Sforza Castle"],
    strong: ["Teatro alla Scala", "Navigli", "Brera District", "Pinacoteca di Brera", "San Siro"],
    sunsetSpots: ["Duomo rooftop", "Navigli canals"],
    foodExperiences: ["Risotto alla milanese", "Aperitivo", "Panettone", "Cotoletta"],
    neighborhoods: ["Centro", "Brera", "Navigli"],
    culturalExperiences: ["Fashion & design", "Aperitivo culture", "Opera at La Scala"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 30, budgetPerDay: { economy: 70, medium: 145, luxury: 400 },
    weatherNote: "Spring and autumn are best; hot, humid summers, foggy winters.", confidence: 93,
  },
  {
    city: "Naples", country: "Italy", aliases: ["napoli"],
    mustSee: ["Pompeii", "Naples Historic Centre", "Royal Palace of Naples", "Castel dell'Ovo"],
    strong: ["Naples National Archaeological Museum", "Spaccanapoli", "San Gregorio Armeno", "Mount Vesuvius"],
    sunsetSpots: ["Castel dell'Ovo", "Lungomare Caracciolo"],
    foodExperiences: ["Pizza napoletana (the original)", "Sfogliatella", "Espresso", "Seafood"],
    neighborhoods: ["Centro Storico", "Chiaia", "Spaccanapoli"],
    culturalExperiences: ["Pizza birthplace", "Pompeii & Vesuvius", "Nativity craft street"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 30, budgetPerDay: { economy: 50, medium: 110, luxury: 300 },
    weatherNote: "Spring and autumn are ideal; hot summers, mild winters.", confidence: 92,
  },
  {
    city: "Verona", country: "Italy",
    mustSee: ["Verona Arena", "Juliet's House", "Piazza delle Erbe", "Castelvecchio"],
    strong: ["Ponte Pietra", "Basilica di San Zeno", "Giardino Giusti", "Torre dei Lamberti"],
    sunsetSpots: ["Castel San Pietro viewpoint", "Ponte Pietra"],
    foodExperiences: ["Risotto all'Amarone", "Valpolicella wine", "Gnocchi", "Gelato"],
    neighborhoods: ["Città Antica"],
    culturalExperiences: ["Opera at the Arena", "Romeo & Juliet sites", "Wine country"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 15, budgetPerDay: { economy: 60, medium: 125, luxury: 330 },
    weatherNote: "Spring and autumn are best; summer opera season is special but hot.", confidence: 89,
  },
  {
    city: "Bologna", country: "Italy",
    mustSee: ["Piazza Maggiore", "Two Towers of Bologna", "Basilica di San Petronio", "Archiginnasio"],
    strong: ["Quadrilatero Market", "Santo Stefano", "Portici of Bologna", "Sanctuary of San Luca"],
    sunsetSpots: ["Sanctuary of San Luca", "Asinelli Tower"],
    foodExperiences: ["Tagliatelle al ragù", "Mortadella", "Tortellini", "Lambrusco"],
    neighborhoods: ["Centro Storico", "University Quarter"],
    culturalExperiences: ["Oldest university", "Food capital", "Porticoes walk"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 18, budgetPerDay: { economy: 55, medium: 120, luxury: 320 },
    weatherNote: "Spring and autumn are best; hot summers, foggy winters.", confidence: 90,
  },
  {
    city: "Siena", country: "Italy",
    mustSee: ["Piazza del Campo", "Siena Cathedral", "Torre del Mangia", "Palazzo Pubblico"],
    strong: ["Basilica di San Domenico", "Santa Maria della Scala", "Fonte Gaia", "City walls"],
    sunsetSpots: ["Fortezza Medicea", "City walls"],
    foodExperiences: ["Pici pasta", "Panforte", "Chianti & Brunello", "Wild boar"],
    neighborhoods: ["Centro Storico"],
    culturalExperiences: ["Palio horse race", "Medieval old town", "Tuscan wine"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 12, budgetPerDay: { economy: 55, medium: 115, luxury: 310 },
    weatherNote: "Spring and autumn are loveliest; the Palio (Jul/Aug) is iconic.", confidence: 89,
  },
  {
    city: "Positano", country: "Italy", aliases: ["amalfi", "amalfi coast"],
    mustSee: ["Spiaggia Grande", "Path of the Gods", "Amalfi Cathedral", "Ravello"],
    strong: ["Fornillo Beach", "Church of Santa Maria Assunta", "Furore Fjord", "Atrani"],
    sunsetSpots: ["Spiaggia Grande", "Franco's Bar"],
    foodExperiences: ["Limoncello", "Fresh seafood", "Caprese salad", "Sfusato lemons"],
    neighborhoods: ["Positano", "Amalfi", "Ravello"],
    culturalExperiences: ["Coastal hikes", "Cliffside villages", "Ceramics", "Boat trips"],
    bestMonths: ["May", "Jun", "Jul", "Sep"],
    attractionCount: 12, budgetPerDay: { economy: 80, medium: 170, luxury: 450 },
    weatherNote: "Best late spring and September; busy and hot in midsummer.", confidence: 88,
  },

  // ── Japan ────────────────────────────────────────────────────────────────
  {
    city: "Kyoto", country: "Japan",
    mustSee: ["Fushimi Inari Taisha", "Kinkaku-ji", "Kiyomizu-dera", "Arashiyama Bamboo Grove"],
    strong: ["Gion", "Nijo Castle", "Ginkaku-ji", "Philosopher's Path", "Sanjusangen-do"],
    sunsetSpots: ["Arashiyama", "Kiyomizu-dera terrace"],
    foodExperiences: ["Kaiseki", "Matcha sweets", "Yudofu", "Nishiki Market tasting"],
    neighborhoods: ["Gion", "Higashiyama", "Arashiyama"],
    culturalExperiences: ["Geisha district", "Tea ceremony", "Temple hopping", "Kimono rental"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 60, budgetPerDay: { economy: 70, medium: 150, luxury: 400 },
    weatherNote: "Cherry blossom (Apr) and autumn leaves (Nov) are magical; humid summers.", confidence: 95,
    transportTip: "Buses and two subway lines cover the temples; rent a bike or walk the atmospheric old districts.",
  },
  {
    city: "Osaka", country: "Japan",
    mustSee: ["Osaka Castle", "Dotonbori", "Shitenno-ji", "Umeda Sky Building"],
    strong: ["Universal Studios Japan", "Kuromon Ichiba Market", "Shinsekai", "Sumiyoshi Taisha"],
    sunsetSpots: ["Umeda Sky Building", "Tsutenkaku"],
    foodExperiences: ["Takoyaki", "Okonomiyaki", "Kushikatsu", "Street food crawl"],
    neighborhoods: ["Namba", "Umeda", "Shinsekai"],
    culturalExperiences: ["Street-food capital", "Nightlife", "Castle & gardens"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 35, budgetPerDay: { economy: 65, medium: 140, luxury: 380 },
    weatherNote: "Spring and autumn are best; hot, humid summers.", confidence: 93,
  },
  {
    city: "Nara", country: "Japan",
    mustSee: ["Todai-ji", "Nara Park", "Kasuga Taisha", "Kofuku-ji"],
    strong: ["Isuien Garden", "Naramachi", "Mount Wakakusa", "Yoshikien Garden"],
    sunsetSpots: ["Mount Wakakusa"],
    foodExperiences: ["Kakinoha-zushi", "Mochi pounding", "Green tea", "Somen"],
    neighborhoods: ["Nara Park", "Naramachi"],
    culturalExperiences: ["Free-roaming deer", "Great Buddha", "Ancient temples"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 15, budgetPerDay: { economy: 55, medium: 120, luxury: 320 },
    weatherNote: "Spring and autumn are ideal; an easy day-trip from Kyoto/Osaka.", confidence: 91,
  },
  {
    city: "Hiroshima", country: "Japan",
    mustSee: ["Atomic Bomb Dome", "Peace Memorial Park", "Itsukushima Shrine", "Hiroshima Castle"],
    strong: ["Peace Memorial Museum", "Shukkeien Garden", "Miyajima floating torii", "Mazda Museum"],
    sunsetSpots: ["Miyajima torii gate"],
    foodExperiences: ["Hiroshima-style okonomiyaki", "Oysters", "Momiji manju", "Tsukemen"],
    neighborhoods: ["Naka", "Miyajima"],
    culturalExperiences: ["Peace memorials", "Island shrine", "History & reflection"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 15, budgetPerDay: { economy: 60, medium: 130, luxury: 340 },
    weatherNote: "Spring and autumn are best; pair with Miyajima island.", confidence: 91,
  },
  {
    city: "Hakone", country: "Japan",
    mustSee: ["Hakone Open-Air Museum", "Lake Ashi", "Owakudani", "Hakone Shrine"],
    strong: ["Hakone Ropeway", "Mount Fuji viewpoints", "Pola Museum of Art", "Gora Park"],
    sunsetSpots: ["Lake Ashi"],
    foodExperiences: ["Black eggs of Owakudani", "Kaiseki ryokan dinner", "Soba"],
    neighborhoods: ["Gora", "Lake Ashi", "Hakone-Yumoto"],
    culturalExperiences: ["Onsen hot springs", "Mt Fuji views", "Art museums", "Ryokan stay"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 12, budgetPerDay: { economy: 80, medium: 170, luxury: 450 },
    weatherNote: "Clear autumn/spring days give the best Fuji views.", confidence: 88,
  },
  {
    city: "Kanazawa", country: "Japan",
    mustSee: ["Kenroku-en", "Kanazawa Castle", "Higashi Chaya District", "21st Century Museum of Contemporary Art"],
    strong: ["Omicho Market", "Nagamachi Samurai District", "Myoryu-ji (Ninja Temple)", "D.T. Suzuki Museum"],
    sunsetSpots: ["Kenroku-en", "Castle park"],
    foodExperiences: ["Fresh seafood", "Gold-leaf ice cream", "Kaga cuisine", "Sushi"],
    neighborhoods: ["Higashi Chaya", "Nagamachi", "Korinbo"],
    culturalExperiences: ["Geisha teahouses", "Samurai district", "Gardens", "Gold leaf craft"],
    bestMonths: ["Apr", "May", "Oct", "Nov"],
    attractionCount: 15, budgetPerDay: { economy: 65, medium: 140, luxury: 370 },
    weatherNote: "Spring and autumn shine; rainy and snowy in the off-season.", confidence: 89,
  },
  {
    city: "Sapporo", country: "Japan",
    mustSee: ["Odori Park", "Sapporo Clock Tower", "Mount Moiwa", "Susukino"],
    strong: ["Sapporo Beer Museum", "Hokkaido Shrine", "Shiroi Koibito Park", "Maruyama Park"],
    sunsetSpots: ["Mount Moiwa Ropeway"],
    foodExperiences: ["Miso ramen", "Fresh seafood", "Genghis Khan (lamb BBQ)", "Hokkaido dairy"],
    neighborhoods: ["Odori", "Susukino", "Maruyama"],
    culturalExperiences: ["Snow Festival", "Beer culture", "Ramen alley"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep", "Feb"],
    attractionCount: 15, budgetPerDay: { economy: 65, medium: 140, luxury: 370 },
    weatherNote: "Cool green summers; world-famous snow in February.", confidence: 87,
  },

  // ── Thailand ─────────────────────────────────────────────────────────────
  {
    city: "Bangkok", country: "Thailand", aliases: ["krung thep"],
    mustSee: ["Grand Palace", "Wat Pho", "Wat Arun", "Chatuchak Weekend Market"],
    strong: ["Wat Phra Kaew", "Khao San Road", "Jim Thompson House", "Yaowarat (Chinatown)", "Asiatique"],
    nightlife: ["Sky Bar (Lebua)", "Levels Club & Lounge"],
    sunsetSpots: ["Wat Arun riverside", "Rooftop sky bars"],
    foodExperiences: ["Street food crawl", "Pad thai", "Mango sticky rice", "Boat noodles"],
    neighborhoods: ["Rattanakosin (Old City)", "Sukhumvit", "Chinatown"],
    culturalExperiences: ["Temples", "Floating markets", "Thai massage", "Rooftop nightlife"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb"],
    attractionCount: 50, budgetPerDay: { economy: 25, medium: 65, luxury: 220 },
    weatherNote: "Cool, dry season (Nov–Feb) is best; very hot Mar–May, monsoon Jun–Oct.", confidence: 93,
    transportTip: "The BTS Skytrain and MRT beat the traffic; use river boats and Grab for door-to-door trips.",
  },
  {
    city: "Chiang Mai", country: "Thailand",
    mustSee: ["Wat Phra That Doi Suthep", "Wat Chedi Luang", "Old City Temples", "Sunday Walking Street"],
    strong: ["Elephant Nature Park", "Nimmanhaemin", "Bua Thong Sticky Waterfalls", "Wat Phra Singh"],
    sunsetSpots: ["Doi Suthep", "Doi Pui"],
    foodExperiences: ["Khao soi", "Northern Thai khantoke", "Night bazaar street food", "Coffee culture"],
    neighborhoods: ["Old City", "Nimman", "Riverside"],
    culturalExperiences: ["Temples", "Ethical elephant sanctuaries", "Hill-tribe culture", "Lanna heritage"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb"],
    attractionCount: 30, budgetPerDay: { economy: 20, medium: 55, luxury: 180 },
    weatherNote: "Cool, dry Nov–Feb is best; avoid the Mar–Apr burning season.", confidence: 91,
  },
  {
    city: "Phuket", country: "Thailand",
    mustSee: ["Patong Beach", "Big Buddha", "Phuket Old Town", "Phi Phi Islands"],
    strong: ["Promthep Cape", "Wat Chalong", "Kata Beach", "Bangla Road"],
    sunsetSpots: ["Promthep Cape", "Kata viewpoint"],
    foodExperiences: ["Fresh seafood", "Southern Thai curry", "Street food", "Beach dining"],
    neighborhoods: ["Old Town", "Patong", "Kata/Karon"],
    culturalExperiences: ["Island hopping", "Beaches", "Sino-Portuguese old town", "Nightlife"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
    attractionCount: 20, budgetPerDay: { economy: 30, medium: 80, luxury: 280 },
    weatherNote: "Dry season Nov–Apr is best; monsoon swells May–Oct.", confidence: 88,
  },
  {
    city: "Krabi", country: "Thailand",
    mustSee: ["Railay Beach", "Ao Nang", "Phra Nang Cave Beach", "Tiger Cave Temple"],
    strong: ["Four Islands Tour", "Emerald Pool", "Krabi Hot Springs", "Hong Islands"],
    sunsetSpots: ["Railay Beach", "Ao Nang Beach"],
    foodExperiences: ["Fresh seafood", "Southern Thai curry", "Street food"],
    neighborhoods: ["Ao Nang", "Railay", "Krabi Town"],
    culturalExperiences: ["Limestone cliffs", "Island hopping", "Rock climbing", "Kayaking"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb", "Mar"],
    attractionCount: 15, budgetPerDay: { economy: 30, medium: 75, luxury: 250 },
    weatherNote: "Dry season Nov–Mar is ideal for islands and beaches.", confidence: 86,
  },
  {
    city: "Ayutthaya", country: "Thailand",
    mustSee: ["Wat Mahathat", "Wat Phra Si Sanphet", "Ayutthaya Historical Park", "Wat Chaiwatthanaram"],
    strong: ["Wat Ratchaburana", "Bang Pa-In Royal Palace", "Wat Lokayasutharam", "Night Market"],
    sunsetSpots: ["Wat Chaiwatthanaram"],
    foodExperiences: ["Boat noodles", "River prawns", "Roti sai mai", "Night market eats"],
    neighborhoods: ["Historical Park"],
    culturalExperiences: ["Ancient Siamese capital ruins", "Temple cycling", "River cruise"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb"],
    attractionCount: 15, budgetPerDay: { economy: 20, medium: 55, luxury: 180 },
    weatherNote: "Cool, dry Nov–Feb is best; an easy day-trip from Bangkok.", confidence: 87,
  },
  {
    city: "Chiang Rai", country: "Thailand",
    mustSee: ["Wat Rong Khun (White Temple)", "Wat Rong Suea Ten (Blue Temple)", "Baan Dam Museum", "Golden Triangle"],
    strong: ["Singha Park", "Wat Phra Kaew", "Choui Fong Tea Plantation", "Hill-tribe villages"],
    sunsetSpots: ["Singha Park", "Mae Fah Luang"],
    foodExperiences: ["Northern Thai", "Khao soi", "Tea tasting", "Night bazaar"],
    neighborhoods: ["City Centre"],
    culturalExperiences: ["Contemporary art temples", "Tea plantations", "Hill-tribe culture"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb"],
    attractionCount: 12, budgetPerDay: { economy: 20, medium: 55, luxury: 180 },
    weatherNote: "Cool, dry Nov–Feb is best; hazy in the Mar–Apr burning season.", confidence: 86,
  },

  // ── United Kingdom ───────────────────────────────────────────────────────
  {
    city: "London", country: "United Kingdom", aliases: ["london uk", "greater london"],
    mustSee: ["British Museum", "Tower of London", "Buckingham Palace", "Westminster Abbey"],
    strong: ["London Eye", "Tate Modern", "St Paul's Cathedral", "Borough Market", "National Gallery", "Covent Garden", "Camden Market"],
    nightlife: ["Fabric", "Ministry of Sound", "Sky Garden"],
    sunsetSpots: ["Primrose Hill", "Sky Garden", "London Eye"],
    foodExperiences: ["Sunday roast", "Afternoon tea", "Borough Market", "Brick Lane curry"],
    neighborhoods: ["Westminster", "South Bank", "Shoreditch", "Camden", "Notting Hill"],
    culturalExperiences: ["West End theatre", "Free museums", "Markets", "Royal ceremony"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 90, budgetPerDay: { economy: 80, medium: 170, luxury: 450 },
    weatherNote: "Mild but wet; May–September is the warmest, brightest window.", confidence: 96,
    transportTip: "The Tube plus buses cover everything — tap a contactless card; walking links many central sights.",
  },
  {
    city: "Edinburgh", country: "United Kingdom",
    mustSee: ["Edinburgh Castle", "Royal Mile", "Arthur's Seat", "Palace of Holyroodhouse"],
    strong: ["Calton Hill", "National Museum of Scotland", "Dean Village", "Princes Street Gardens"],
    sunsetSpots: ["Calton Hill", "Arthur's Seat"],
    foodExperiences: ["Haggis", "Whisky tasting", "Shortbread", "Scottish seafood"],
    neighborhoods: ["Old Town", "New Town", "Stockbridge"],
    culturalExperiences: ["Fringe Festival", "Whisky", "Ghost tours", "Castle history"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 25, budgetPerDay: { economy: 70, medium: 150, luxury: 400 },
    weatherNote: "Best May–Sep; August Festival is electric but busy.", confidence: 93,
  },
  {
    city: "Bath", country: "United Kingdom",
    mustSee: ["Roman Baths", "Bath Abbey", "Royal Crescent", "Pulteney Bridge"],
    strong: ["The Circus", "Thermae Bath Spa", "Jane Austen Centre", "Prior Park"],
    sunsetSpots: ["Alexandra Park viewpoint"],
    foodExperiences: ["Sally Lunn buns", "Cream tea", "Gastropubs", "Bath buns"],
    neighborhoods: ["City Centre"],
    culturalExperiences: ["Georgian architecture", "Roman heritage", "Jane Austen", "Spa town"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 12, budgetPerDay: { economy: 70, medium: 145, luxury: 380 },
    weatherNote: "Pleasant in summer; a compact, walkable UNESCO city.", confidence: 89,
  },
  {
    city: "Oxford", country: "United Kingdom",
    mustSee: ["University of Oxford", "Bodleian Library", "Radcliffe Camera", "Christ Church College"],
    strong: ["Ashmolean Museum", "Carfax Tower", "Bridge of Sighs", "Covered Market"],
    sunsetSpots: ["South Park viewpoint"],
    foodExperiences: ["Gastropub fare", "Afternoon tea", "Covered Market food"],
    neighborhoods: ["City Centre", "Jericho"],
    culturalExperiences: ["University colleges", "Harry Potter film sites", "Punting"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 15, budgetPerDay: { economy: 65, medium: 140, luxury: 370 },
    weatherNote: "Lovely in late spring/summer; an easy day-trip from London.", confidence: 89,
  },
  {
    city: "Cambridge", country: "United Kingdom",
    mustSee: ["King's College Chapel", "The Backs", "Trinity College", "Fitzwilliam Museum"],
    strong: ["Mathematical Bridge", "Round Church", "University Botanic Garden", "Great St Mary's"],
    sunsetSpots: ["The Backs"],
    foodExperiences: ["Gastropub fare", "Afternoon tea", "Market Square food"],
    neighborhoods: ["City Centre"],
    culturalExperiences: ["University colleges", "Punting on the Cam", "Science heritage"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 12, budgetPerDay: { economy: 65, medium: 140, luxury: 370 },
    weatherNote: "Best in summer for punting; compact and walkable.", confidence: 88,
  },
  {
    city: "York", country: "United Kingdom",
    mustSee: ["York Minster", "The Shambles", "York City Walls", "Jorvik Viking Centre"],
    strong: ["National Railway Museum", "Clifford's Tower", "York Castle Museum", "Museum Gardens"],
    sunsetSpots: ["York City Walls"],
    foodExperiences: ["Yorkshire pudding", "Tea rooms", "Local ales", "Chocolate heritage"],
    neighborhoods: ["City Centre (within the walls)"],
    culturalExperiences: ["Viking & medieval history", "Walls walk", "Ghost tours"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 15, budgetPerDay: { economy: 60, medium: 130, luxury: 350 },
    weatherNote: "Pleasant in summer; atmospheric and historic year-round.", confidence: 89,
  },
  {
    city: "Manchester", country: "United Kingdom",
    mustSee: ["Science and Industry Museum", "Manchester Cathedral", "John Rylands Library", "Old Trafford"],
    strong: ["Northern Quarter", "Manchester Art Gallery", "National Football Museum", "HOME"],
    sunsetSpots: ["City-centre rooftops"],
    foodExperiences: ["Curry Mile", "Gastropubs", "Northern Quarter cafés"],
    neighborhoods: ["Northern Quarter", "Spinningfields", "Castlefield"],
    culturalExperiences: ["Music heritage", "Football", "Industrial history"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 18, budgetPerDay: { economy: 60, medium: 130, luxury: 350 },
    weatherNote: "Rainy reputation; summer is the driest, liveliest season.", confidence: 86,
  },
  {
    city: "Liverpool", country: "United Kingdom",
    mustSee: ["The Beatles Story", "Royal Albert Dock", "Liverpool Cathedral", "Royal Liver Building"],
    strong: ["Tate Liverpool", "The Cavern Club", "Walker Art Gallery", "Anfield"],
    sunsetSpots: ["Royal Albert Dock waterfront"],
    foodExperiences: ["Scouse stew", "Gastropubs", "Waterfront dining"],
    neighborhoods: ["Waterfront", "Ropewalks", "Baltic Triangle"],
    culturalExperiences: ["Beatles heritage", "Football", "Maritime history"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 15, budgetPerDay: { economy: 55, medium: 125, luxury: 340 },
    weatherNote: "Mild and breezy; summer is best for the waterfront.", confidence: 86,
  },
  {
    city: "Glasgow", country: "United Kingdom",
    mustSee: ["Kelvingrove Art Gallery and Museum", "Glasgow Cathedral", "George Square", "Riverside Museum"],
    strong: ["The Necropolis", "Glasgow Science Centre", "Buchanan Street", "Botanic Gardens"],
    sunsetSpots: ["The Necropolis"],
    foodExperiences: ["Gastropubs", "Curry", "Whisky bars", "Café culture"],
    neighborhoods: ["City Centre", "West End", "Merchant City"],
    culturalExperiences: ["Live-music scene", "Mackintosh architecture", "Museums (free)"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 18, budgetPerDay: { economy: 60, medium: 130, luxury: 350 },
    weatherNote: "Wet but characterful; May–September is the brightest window.", confidence: 86,
  },

  // ── North America ────────────────────────────────────────────────────────
  {
    city: "New York",
    country: "United States",
    aliases: ["new york city", "nyc"],
    mustSee: ["Statue of Liberty", "Times Square", "Central Park", "Empire State Building"],
    strong: ["The Metropolitan Museum of Art", "Brooklyn Bridge", "Top of the Rock", "9/11 Memorial & Museum", "MoMA", "Rockefeller Center", "High Line", "Grand Central Terminal"],
    hiddenGems: ["The Cloisters", "Green-Wood Cemetery", "City Island"],
    localRecommendations: ["Katz's Delicatessen", "Joe's Pizza", "Russ & Daughters"],
    nightlife: ["Please Don't Tell", "House of Yes", "230 Fifth Rooftop Bar", "Brooklyn Bowl"],
    sunsetSpots: ["Top of the Rock", "Brooklyn Bridge Park", "One World Observatory", "Domino Park"],
    foodExperiences: ["Bagel & coffee breakfast", "Pizza slice on the go", "Food truck lunch", "Tasting menu in the East Village"],
    neighborhoods: ["Midtown Manhattan", "Greenwich Village", "SoHo", "Williamsburg", "Brooklyn Heights"],
    culturalExperiences: ["Broadway show", "Met Museum galleries", "Brooklyn flea market", "Jazz club in the Village"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 90,
    budgetPerDay: { economy: 90, medium: 180, luxury: 450 },
    weatherNote: "Spring and fall are mild and ideal; summers are hot and humid, winters cold with occasional snow.",
    confidence: 96,
    transportTip: "The subway runs 24/7 and is the fastest way around; Manhattan is very walkable block to block.",
  },
  {
    city: "Mexico City",
    country: "Mexico",
    aliases: ["cdmx", "ciudad de mexico"],
    mustSee: ["Zócalo", "Catedral Metropolitana", "Teotihuacan Pyramids", "Museo Frida Kahlo", "Casa Azul"],
    strong: ["National Museum of Anthropology", "Coyoacán", "Palacio de Bellas Artes", "Xochimilco canals", "Chapultepec Castle", "Bosque de Chapultepec"],
    sunsetSpots: ["Torre Latinoamericana observation deck", "Chapultepec Castle terrace"],
    foodExperiences: ["Tacos al pastor lunch", "Street-side elote & churros", "Mezcal tasting", "Mole dinner in Coyoacán"],
    neighborhoods: ["Roma Norte", "Condesa", "Coyoacán", "Centro Histórico"],
    culturalExperiences: ["Teotihuacan pyramid climb", "Xochimilco trajinera boat ride", "Lucha libre wrestling match", "Frida Kahlo & Diego Rivera art trail"],
    bestMonths: ["Mar", "Apr", "Oct", "Nov"],
    attractionCount: 40,
    budgetPerDay: { economy: 35, medium: 75, luxury: 220 },
    weatherNote: "Mild, spring-like climate most of the year thanks to altitude; rainy season is Jun–Sep (afternoon showers).",
    confidence: 89,
  },

  // ── South America ────────────────────────────────────────────────────────
  {
    city: "Rio de Janeiro",
    country: "Brazil",
    aliases: ["rio"],
    mustSee: ["Christ the Redeemer", "Cristo Redentor", "Sugarloaf Mountain", "Pão de Açúcar", "Copacabana Beach", "Ipanema Beach"],
    strong: ["Selarón Steps", "Santa Teresa", "Tijuca National Forest", "Maracanã Stadium"],
    sunsetSpots: ["Sugarloaf Mountain", "Arpoador Rock (Ipanema)", "Mirante Dona Marta"],
    foodExperiences: ["Açaí bowl breakfast", "Feijoada lunch", "Churrascaria dinner", "Caipirinha on Copacabana Beach"],
    neighborhoods: ["Copacabana", "Ipanema", "Santa Teresa", "Leblon"],
    culturalExperiences: ["Christ the Redeemer at sunrise", "Samba show", "Tijuca rainforest hike", "Guided favela community tour"],
    bestMonths: ["Mar", "Apr", "May", "Sep", "Oct", "Nov"],
    attractionCount: 32,
    budgetPerDay: { economy: 40, medium: 90, luxury: 260 },
    weatherNote: "Warm year-round; Dec–Feb is hot and crowded with Carnival season — shoulder months are calmer.",
    confidence: 88,
    transportTip: "The metro links Copacabana, Ipanema and the center; use Uber for hillside and night trips.",
  },
  {
    city: "Buenos Aires",
    country: "Argentina",
    mustSee: ["La Boca", "Caminito", "Recoleta Cemetery", "Cementerio de la Recoleta", "Plaza de Mayo", "Teatro Colón"],
    strong: ["Puerto Madero", "San Telmo", "Palermo Soho", "Avenida 9 de Julio"],
    nightlife: ["Niceto Club", "La Bomba de Tiempo"],
    sunsetSpots: ["Puerto Madero waterfront", "Costanera Sur Ecological Reserve"],
    foodExperiences: ["Medialunas & coffee breakfast", "Asado lunch", "Empanadas on the go", "Tango dinner show in San Telmo"],
    neighborhoods: ["San Telmo", "Palermo", "Recoleta", "La Boca"],
    culturalExperiences: ["Tango show or lesson", "San Telmo Sunday market", "Recoleta Cemetery walk", "Football match at a local stadium"],
    bestMonths: ["Mar", "Apr", "May", "Sep", "Oct", "Nov"],
    attractionCount: 30,
    budgetPerDay: { economy: 35, medium: 75, luxury: 200 },
    weatherNote: "Mild autumn (Mar–May) and spring (Sep–Nov) are best; summer (Dec–Feb) is hot and humid.",
    confidence: 88,
  },

  // ── Middle East & North Africa ───────────────────────────────────────────
  {
    city: "Dubai",
    country: "UAE",
    mustSee: ["Burj Khalifa", "Dubai Mall & Dubai Fountain", "Palm Jumeirah", "Burj Al Arab"],
    strong: ["Dubai Marina", "Museum of the Future", "Al Fahidi Historical District", "Gold Souk", "Dubai Frame", "Jumeirah Beach", "Dubai Creek"],
    hiddenGems: ["Al Seef Heritage District", "Alserkal Avenue art district"],
    localRecommendations: ["Al Ustad Special Kebab", "Ravi Restaurant", "Arabian Tea House"],
    nightlife: ["White Dubai", "Soho Garden", "Cavalli Club", "Base Dubai"],
    sunsetSpots: ["Palm Jumeirah West Beach", "Dubai Marina Walk", "Burj Khalifa At The Top", "Jumeirah Beach Corniche"],
    foodExperiences: ["Arabic breakfast with karak tea", "Shawarma lunch in Deira", "Desert safari BBQ dinner", "Gold-leaf dessert at a luxury café"],
    neighborhoods: ["Downtown Dubai", "Dubai Marina", "Jumeirah", "Deira", "Al Fahidi"],
    culturalExperiences: ["Desert safari & dune bashing", "Dhow cruise on the Creek", "Souk haggling", "Burj Al Arab afternoon tea"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb", "Mar"],
    attractionCount: 55,
    budgetPerDay: { economy: 70, medium: 160, luxury: 450 },
    weatherNote: "Pleasantly warm November–March; summers (Jun–Sep) are extremely hot, best spent indoors.",
    confidence: 94,
    transportTip: "The driverless Metro links the main sights; taxis and Careem are cheap for everything off the line.",
  },
  {
    city: "Cairo",
    country: "Egypt",
    mustSee: ["Pyramids of Giza", "Great Sphinx of Giza", "Egyptian Museum", "Khan el-Khalili Bazaar", "Saqqara"],
    strong: ["Citadel of Saladin", "Coptic Cairo", "Al-Azhar Mosque", "Nile river corniche"],
    sunsetSpots: ["Pyramids of Giza viewpoint", "Nile river dinner cruise", "Cairo Tower"],
    foodExperiences: ["Koshari lunch", "Egyptian breakfast with ful medames", "Nile dinner cruise", "Khan el-Khalili street food & mint tea"],
    neighborhoods: ["Giza", "Downtown Cairo", "Zamalek", "Islamic Cairo"],
    culturalExperiences: ["Pyramids & Sphinx at sunrise", "Nile felucca sail", "Khan el-Khalili bazaar haggling", "Egyptian Museum mummies hall"],
    bestMonths: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
    attractionCount: 35,
    budgetPerDay: { economy: 30, medium: 70, luxury: 200 },
    weatherNote: "Cooler months (Oct–Mar) are far more comfortable; summer heat is intense and dusty.",
    confidence: 89,
    transportTip: "The metro is cheap and beats the traffic; agree taxi/Uber fares and allow extra time for gridlock.",
  },

  // ── Northern & Central Europe ────────────────────────────────────────────
  {
    city: "Amsterdam",
    country: "Netherlands",
    mustSee: ["Anne Frank House", "Rijksmuseum", "Van Gogh Museum", "Canal Ring"],
    strong: ["Vondelpark", "Jordaan", "Dam Square", "Rembrandt House Museum", "NEMO Science Museum", "Albert Cuyp Market"],
    sunsetSpots: ["A'DAM Lookout", "Skinny Bridge", "Vondelpark"],
    foodExperiences: ["Stroopwafel & coffee breakfast", "Herring at a fish stall", "Indonesian rijsttafel dinner", "Canal-side café bites"],
    neighborhoods: ["Jordaan", "De Pijp", "Canal Ring", "Oud-West"],
    culturalExperiences: ["Canal cruise", "Bike ride through the city", "Albert Cuyp Market", "Red Light District walk"],
    bestMonths: ["Apr", "May", "Jun", "Sep"],
    attractionCount: 40,
    budgetPerDay: { economy: 65, medium: 130, luxury: 320 },
    weatherNote: "Tulip season in April–May is magical; mild summers, cold and grey winters.",
    confidence: 93,
    transportTip: "Cycling is the local way to get around; trams and walking cover the canal-ring center easily.",
  },
  {
    city: "Berlin",
    country: "Germany",
    mustSee: ["Brandenburg Gate", "Brandenburger Tor", "East Side Gallery", "Museum Island", "Museumsinsel", "Reichstag Building"],
    strong: ["Checkpoint Charlie", "Berlin Cathedral", "Charlottenburg Palace", "Tiergarten", "Alexanderplatz", "Holocaust Memorial"],
    nightlife: ["Berghain", "Watergate", "Sisyphos"],
    sunsetSpots: ["Tiergarten", "Victory Column viewing platform", "Tempelhofer Feld"],
    foodExperiences: ["Currywurst lunch", "Döner kebab", "Berlin breakfast brunch", "Craft beer in Kreuzberg"],
    neighborhoods: ["Mitte", "Kreuzberg", "Prenzlauer Berg", "Friedrichshain"],
    culturalExperiences: ["Museum Island day pass", "Street art tour in Kreuzberg", "Berlin club culture night", "Cold War history walk"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 50,
    budgetPerDay: { economy: 55, medium: 110, luxury: 280 },
    weatherNote: "Warm, long days in summer; winters are cold and grey but Christmas markets compensate.",
    confidence: 92,
    transportTip: "The U-Bahn and S-Bahn are fast and far-reaching; one ticket covers all modes across the zones.",
  },
  {
    city: "Vienna",
    country: "Austria",
    mustSee: ["Schönbrunn Palace", "Schloss Schönbrunn", "St. Stephen's Cathedral", "Stephansdom", "Belvedere Palace", "Schloss Belvedere", "Hofburg Palace"],
    strong: ["Vienna State Opera", "Prater", "Wiener Riesenrad", "Naschmarkt", "Albertina Museum", "Kunsthistorisches Museum"],
    sunsetSpots: ["Kahlenberg Hill", "Donauturm", "Belvedere Gardens"],
    foodExperiences: ["Viennese coffeehouse breakfast", "Wiener Schnitzel lunch", "Sachertorte & coffee", "Heuriger wine tavern dinner"],
    neighborhoods: ["Innere Stadt", "Naschmarkt area", "Leopoldstadt", "Josefstadt"],
    culturalExperiences: ["Opera or classical concert", "Coffeehouse culture", "Naschmarkt food crawl", "Heuriger wine tasting"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 42,
    budgetPerDay: { economy: 60, medium: 120, luxury: 300 },
    weatherNote: "Pleasant spring and autumn; cold winters balanced by festive Christmas markets.",
    confidence: 92,
    transportTip: "The U-Bahn, trams and walking cover the compact center; a 24/48/72-hour pass is great value.",
  },
  {
    city: "Prague",
    country: "Czech Republic",
    mustSee: ["Prague Castle", "Pražský hrad", "Charles Bridge", "Karlův most", "Old Town Square", "Staroměstské náměstí", "Astronomical Clock"],
    strong: ["St. Vitus Cathedral", "Jewish Quarter (Josefov)", "Petřín Hill", "Wenceslas Square", "Lennon Wall"],
    nightlife: ["Karlovy Lázně", "Cross Club"],
    sunsetSpots: ["Petřín Hill Lookout Tower", "Charles Bridge", "Letná Park"],
    foodExperiences: ["Trdelník pastry", "Czech goulash & dumplings", "Historic beer hall dinner", "Vltava river cruise with local beer"],
    neighborhoods: ["Old Town", "Malá Strana", "Vinohrady", "Žižkov"],
    culturalExperiences: ["Czech beer culture tour", "Jewish Quarter history walk", "Astronomical Clock show", "Vltava river cruise"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 38,
    budgetPerDay: { economy: 45, medium: 90, luxury: 230 },
    weatherNote: "Mild spring and autumn are best; winters are cold but atmospheric with Christmas markets.",
    confidence: 91,
    transportTip: "The center is wonderfully walkable; trams and the metro handle the hills and longer hops.",
  },
  {
    city: "Budapest",
    country: "Hungary",
    mustSee: ["Buda Castle", "Budavári Palota", "Hungarian Parliament Building", "Országház", "Fisherman's Bastion", "Halászbástya", "Széchenyi Thermal Bath"],
    strong: ["Chain Bridge", "St. Stephen's Basilica", "Great Market Hall", "Gellért Hill", "Andrássy Avenue"],
    nightlife: ["Szimpla Kert", "Instant-Fogas Complex"],
    sunsetSpots: ["Gellért Hill Citadella", "Fisherman's Bastion", "Danube riverside promenade"],
    foodExperiences: ["Goulash lunch", "Chimney cake (kürtőskalács)", "Ruin bar crawl", "Thermal bath & paprika-spiced dinner"],
    neighborhoods: ["Buda Castle District", "Jewish Quarter", "Pest Downtown", "Andrássy Avenue"],
    culturalExperiences: ["Thermal bath soak", "Ruin bar nightlife", "Danube river cruise", "Great Market Hall food crawl"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 40,
    budgetPerDay: { economy: 40, medium: 85, luxury: 220 },
    weatherNote: "Mild spring and autumn are ideal; the thermal baths make winter visits worthwhile too.",
    confidence: 91,
  },
  {
    city: "Copenhagen",
    country: "Denmark",
    mustSee: ["Nyhavn", "Tivoli Gardens", "The Little Mermaid", "Den Lille Havfrue", "Rosenborg Castle", "Rosenborg Slot"],
    strong: ["Christiansborg Palace", "Amalienborg", "Christianshavn", "National Museum of Denmark"],
    sunsetSpots: ["Nyhavn harbor", "Amager Strandpark", "Christianshavn canals"],
    foodExperiences: ["Danish pastry breakfast", "Smørrebrød lunch", "New Nordic tasting menu", "Hot dog from a street cart"],
    neighborhoods: ["Indre By", "Nørrebro", "Christianshavn", "Vesterbro"],
    culturalExperiences: ["Canal tour", "Tivoli Gardens rides", "Design museum visit", "Freetown Christiania walk"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 32,
    budgetPerDay: { economy: 75, medium: 150, luxury: 350 },
    weatherNote: "Bright, mild summers are best; winters are short on daylight but cozy (hygge season).",
    confidence: 90,
  },
  {
    city: "Reykjavik",
    country: "Iceland",
    mustSee: ["Hallgrímskirkja", "Þingvellir National Park", "Blue Lagoon", "Harpa Concert Hall"],
    strong: ["Sun Voyager sculpture", "Perlan Museum", "Laugavegur shopping street", "Reykjavik Old Harbour"],
    sunsetSpots: ["Grótta Lighthouse", "Reykjavik Old Harbour", "Hallgrímskirkja tower view"],
    foodExperiences: ["Icelandic hot dog", "Fresh seafood lunch at the harbour", "Skyr for breakfast", "Lobster soup dinner"],
    neighborhoods: ["Downtown (101 Reykjavik)", "Old Harbour", "Laugavegur"],
    culturalExperiences: ["Northern Lights hunt (winter)", "Blue Lagoon soak", "Golden Circle tour (geysers & waterfalls)", "Whale watching"],
    bestMonths: ["Jun", "Jul", "Aug", "Sep"],
    attractionCount: 25,
    budgetPerDay: { economy: 90, medium: 170, luxury: 400 },
    weatherNote: "Midnight sun in summer; winter brings the Northern Lights but very short days.",
    confidence: 87,
  },

  // ── Greece ───────────────────────────────────────────────────────────────
  {
    city: "Athens",
    country: "Greece",
    mustSee: ["Acropolis of Athens", "Parthenon", "Acropolis Museum", "Ancient Agora", "Plaka district"],
    strong: ["Temple of Olympian Zeus", "Panathenaic Stadium", "Mount Lycabettus", "National Archaeological Museum", "Syntagma Square"],
    sunsetSpots: ["Mount Lycabettus", "Areopagus Hill", "Acropolis at golden hour"],
    foodExperiences: ["Greek breakfast with bougatsa", "Souvlaki lunch", "Taverna dinner in Plaka", "Greek coffee & baklava"],
    neighborhoods: ["Plaka", "Monastiraki", "Koukaki", "Psyrri"],
    culturalExperiences: ["Acropolis sunrise visit", "Monastiraki flea market", "Greek mythology walking tour", "Rooftop ouzo with Acropolis views"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 35,
    budgetPerDay: { economy: 45, medium: 95, luxury: 250 },
    weatherNote: "Hot, dry summers draw the biggest crowds; spring and autumn are mild and far less busy.",
    confidence: 92,
    transportTip: "The metro is clean and reaches the airport and Piraeus; the central sights are an easy walk apart.",
  },
  {
    city: "Santorini",
    country: "Greece",
    aliases: ["thira"],
    mustSee: ["Oia", "Fira", "Akrotiri", "Red Beach"],
    strong: ["Ancient Thira", "Imerovigli caldera walk", "Amoudi Bay", "Pyrgos village", "Santo Wines Winery"],
    sunsetSpots: ["Oia Castle ruins", "Amoudi Bay", "Imerovigli caldera path"],
    foodExperiences: ["Greek yogurt & honey breakfast", "Fresh seafood lunch by the caldera", "Santorini wine tasting", "Fava dip & tomato keftedes"],
    neighborhoods: ["Oia", "Fira", "Imerovigli", "Pyrgos"],
    culturalExperiences: ["Caldera sunset cruise", "Wine tasting tour", "Akrotiri ruins (the 'Greek Pompeii')", "Donkey-path village walk"],
    bestMonths: ["May", "Jun", "Sep", "Oct"],
    attractionCount: 20,
    budgetPerDay: { economy: 60, medium: 130, luxury: 380 },
    weatherNote: "Hot, dry, and crowded in July–August; late spring and September offer the same views with fewer crowds.",
    confidence: 88,
  },

  // ── Asia-Pacific ─────────────────────────────────────────────────────────
  {
    city: "Singapore",
    mustSee: ["Marina Bay Sands & SkyPark", "Gardens by the Bay", "Sentosa Island", "Merlion Park"],
    country: "Singapore",
    strong: ["Singapore Botanic Gardens", "Chinatown", "Little India", "Orchard Road", "National Gallery Singapore"],
    sunsetSpots: ["Marina Bay Sands SkyPark", "Gardens by the Bay Supertree Grove", "Henderson Waves Bridge"],
    foodExperiences: ["Hawker centre breakfast", "Chili crab dinner", "Laksa lunch", "Dessert at Lau Pa Sat"],
    neighborhoods: ["Marina Bay", "Chinatown", "Little India", "Kampong Glam"],
    culturalExperiences: ["Hawker centre food crawl", "Gardens by the Bay light show", "Sentosa beach day", "Peranakan heritage walk"],
    bestMonths: ["Feb", "Mar", "Jul", "Aug"],
    attractionCount: 45,
    budgetPerDay: { economy: 60, medium: 130, luxury: 350 },
    weatherNote: "Hot and humid year-round near the equator; Feb–Mar and Jul–Aug see slightly less rain.",
    confidence: 93,
    transportTip: "The MRT is clean, cheap and reaches almost everywhere; the center is walkable and well-shaded.",
  },
  {
    city: "Seoul",
    country: "South Korea",
    mustSee: ["Gyeongbokgung Palace", "Bukchon Hanok Village", "N Seoul Tower", "Myeongdong"],
    strong: ["Changdeokgung Palace", "Insadong", "Hongdae", "Han River Park", "Dongdaemun Design Plaza"],
    nightlife: ["Itaewon nightlife strip", "Hongdae club street"],
    sunsetSpots: ["N Seoul Tower", "Han River Park", "Banpo Bridge Rainbow Fountain"],
    foodExperiences: ["Korean BBQ dinner", "Street food in Myeongdong", "Bibimbap lunch", "Korean fried chicken & beer (chimaek)"],
    neighborhoods: ["Myeongdong", "Hongdae", "Itaewon", "Bukchon"],
    culturalExperiences: ["Hanbok rental at the palaces", "K-pop / Hallyu culture tour", "Korean spa (jjimjilbang)", "Han River night picnic"],
    bestMonths: ["Apr", "May", "Sep", "Oct"],
    attractionCount: 48,
    budgetPerDay: { economy: 55, medium: 115, luxury: 300 },
    weatherNote: "Spring cherry blossoms and autumn foliage are the best windows; summers are hot and humid with a rainy season.",
    confidence: 91,
    transportTip: "The metro is world-class — cheap, English-signed and vast; grab a T-money card and tap everywhere.",
  },
  {
    city: "Hong Kong",
    country: "China",
    mustSee: ["Victoria Peak", "Star Ferry", "Victoria Harbour", "Big Buddha (Ngong Ping)", "Tian Tan Buddha", "Temple Street Night Market"],
    strong: ["Hong Kong Disneyland", "Man Mo Temple", "Tsim Sha Tsui Promenade", "Hong Kong Museum of History"],
    sunsetSpots: ["Victoria Peak", "Tsim Sha Tsui Promenade", "Sky100 Observation Deck"],
    foodExperiences: ["Dim sum breakfast", "Cha chaan teng lunch", "Temple Street street food", "Symphony of Lights harbour dinner cruise"],
    neighborhoods: ["Central", "Tsim Sha Tsui", "Mong Kok", "Causeway Bay"],
    culturalExperiences: ["Star Ferry harbour crossing", "Big Buddha cable car", "Night market haggling", "Dim sum tea house etiquette"],
    bestMonths: ["Oct", "Nov", "Dec", "Mar"],
    attractionCount: 40,
    budgetPerDay: { economy: 60, medium: 130, luxury: 340 },
    weatherNote: "Cool, dry autumn (Oct–Dec) is best; summers are hot, humid and typhoon-prone.",
    confidence: 90,
    transportTip: "The MTR is fast and easy with an Octopus card; the Star Ferry and trams are sights in themselves.",
  },
  {
    city: "Bali",
    country: "Indonesia",
    aliases: ["denpasar", "ubud"],
    mustSee: ["Uluwatu Temple", "Pura Luhur Uluwatu", "Tegallalang Rice Terraces", "Tanah Lot Temple", "Ubud Monkey Forest"],
    strong: ["Sacred Monkey Forest Sanctuary", "Seminyak Beach", "Mount Batur sunrise trek", "Tirta Empul Water Temple", "Kuta Beach"],
    sunsetSpots: ["Uluwatu Temple cliffs", "Seminyak Beach", "Tanah Lot Temple"],
    foodExperiences: ["Balinese breakfast with fresh fruit", "Babi guling lunch", "Beachfront seafood dinner in Jimbaran", "Luwak coffee tasting"],
    neighborhoods: ["Ubud", "Seminyak", "Canggu", "Uluwatu"],
    culturalExperiences: ["Traditional Kecak fire dance", "Rice terrace trek", "Balinese temple ceremony", "Yoga retreat in Ubud"],
    bestMonths: ["Apr", "May", "Jun", "Sep"],
    attractionCount: 38,
    budgetPerDay: { economy: 35, medium: 80, luxury: 250 },
    weatherNote: "Dry season (Apr–Sep) is best for beaches and treks; wet season (Nov–Mar) brings short, heavy showers.",
    confidence: 88,
  },
  {
    city: "Sydney",
    country: "Australia",
    mustSee: ["Sydney Opera House", "Sydney Harbour Bridge", "Bondi Beach", "Royal Botanic Garden"],
    strong: ["Darling Harbour", "The Rocks", "Taronga Zoo", "Manly Beach", "Bondi to Coogee Coastal Walk"],
    sunsetSpots: ["Mrs Macquarie's Chair", "Milsons Point Harbour Bridge view", "Bondi Beach"],
    foodExperiences: ["Flat white & avocado toast breakfast", "Fish and chips at the harbour", "Modern Australian dinner in Surry Hills", "Rooftop bar drinks with skyline views"],
    neighborhoods: ["The Rocks", "Bondi", "Surry Hills", "Darling Harbour"],
    culturalExperiences: ["Opera House tour or show", "Bondi to Coogee coastal walk", "Sydney Harbour ferry ride", "Climb the Harbour Bridge"],
    bestMonths: ["Sep", "Oct", "Nov", "Mar", "Apr"],
    attractionCount: 42,
    budgetPerDay: { economy: 75, medium: 150, luxury: 380 },
    weatherNote: "Spring and autumn are mild and pleasant; summer (Dec–Feb) is hot and busy with beach crowds.",
    confidence: 91,
    transportTip: "Trains, ferries and buses all run on one Opal tap; the harbour ferries double as scenic rides.",
  },

  // ── Sub-Saharan Africa ───────────────────────────────────────────────────
  {
    city: "Cape Town",
    country: "South Africa",
    mustSee: ["Table Mountain", "Robben Island", "V&A Waterfront", "Cape of Good Hope"],
    strong: ["Bo-Kaap", "Kirstenbosch National Botanical Garden", "Boulders Beach", "Camps Bay"],
    sunsetSpots: ["Signal Hill", "Camps Bay Beach", "Table Mountain summit"],
    foodExperiences: ["Cape Malay curry lunch", "Winelands wine tasting", "Seafood dinner at the V&A Waterfront", "Biltong & local craft beer"],
    neighborhoods: ["City Bowl", "Bo-Kaap", "V&A Waterfront", "Camps Bay"],
    culturalExperiences: ["Table Mountain cable car", "Robben Island history tour", "Winelands day trip", "Penguin colony at Boulders Beach"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb", "Mar"],
    attractionCount: 36,
    budgetPerDay: { economy: 45, medium: 95, luxury: 260 },
    weatherNote: "Summer (Nov–Mar) is warm and dry — peak season; winter (Jun–Aug) is cooler and rainier.",
    confidence: 89,
  },

  // ── South Asia (India) ───────────────────────────────────────────────────
  {
    city: "Delhi",
    country: "India",
    aliases: ["new delhi"],
    mustSee: ["Red Fort", "Qutub Minar", "India Gate", "Humayun's Tomb", "Lotus Temple"],
    strong: ["Jama Masjid", "Akshardham Temple", "Chandni Chowk", "Rashtrapati Bhavan", "Lodhi Gardens", "Gurudwara Bangla Sahib"],
    hiddenGems: ["Agrasen ki Baoli", "Hauz Khas Village", "Mehrauli Archaeological Park"],
    localRecommendations: ["Karim's", "Paranthe Wali Gali", "Bukhara"],
    nightlife: ["Hauz Khas Social", "Kitty Su", "Summer House Cafe", "PCO"],
    sunsetSpots: ["India Gate", "Humayun's Tomb gardens", "Agrasen ki Baoli"],
    foodExperiences: ["Chole bhature breakfast", "Old Delhi street-food walk", "Butter chicken dinner", "Masala chai at a roadside stall"],
    neighborhoods: ["Old Delhi", "Connaught Place", "Hauz Khas", "Chanakyapuri"],
    culturalExperiences: ["Old Delhi rickshaw ride", "Jama Masjid visit", "Spice market at Khari Baoli", "Sound & light show at the Red Fort"],
    bestMonths: ["Oct", "Nov", "Feb", "Mar"],
    attractionCount: 50,
    budgetPerDay: { economy: 25, medium: 60, luxury: 200 },
    weatherNote: "October–March is cool and pleasant; April–June is extremely hot and July–September brings the monsoon.",
    confidence: 90,
    transportTip: "The Delhi Metro is clean, cheap and the fastest way around; pair it with autos or Uber for short hops.",
  },
  {
    city: "Agra",
    country: "India",
    mustSee: ["Taj Mahal", "Agra Fort", "Fatehpur Sikri", "Mehtab Bagh"],
    strong: ["Itimad-ud-Daulah", "Akbar's Tomb", "Jama Masjid Agra", "Moti Masjid"],
    hiddenGems: ["Chini Ka Rauza", "Mariam's Tomb", "Wildlife SOS bear rescue"],
    sunsetSpots: ["Mehtab Bagh", "Agra Fort ramparts", "Taj Mahal eastern view"],
    foodExperiences: ["Mughlai breakfast", "Petha sweet tasting", "Tandoori dinner", "Bedai & jalebi street breakfast"],
    neighborhoods: ["Taj Ganj", "Agra Cantt", "Sadar Bazaar", "Fatehabad Road"],
    culturalExperiences: ["Sunrise at the Taj Mahal", "Marble inlay workshop", "Fatehpur Sikri day trip", "Mughal heritage walk"],
    bestMonths: ["Oct", "Nov", "Dec", "Feb", "Mar"],
    attractionCount: 20,
    budgetPerDay: { economy: 25, medium: 55, luxury: 180 },
    weatherNote: "Cool, clear winters (Oct–Mar) are ideal; summers are searingly hot before the July–September monsoon.",
    confidence: 90,
    transportTip: "Compact and best by auto-rickshaw or hired car; the Taj area is walkable but pre-book a driver for Fatehpur Sikri.",
  },
  {
    city: "Jaipur",
    country: "India",
    aliases: ["pink city"],
    mustSee: ["Amber Fort", "Hawa Mahal", "City Palace", "Jantar Mantar", "Amer Fort"],
    strong: ["Nahargarh Fort", "Jal Mahal", "Jaigarh Fort", "Albert Hall Museum", "Birla Mandir", "Galtaji Temple"],
    hiddenGems: ["Panna Meena ka Kund", "Patrika Gate", "Anokhi Museum of Hand Printing"],
    localRecommendations: ["Laxmi Misthan Bhandar", "Rawat Kachori", "Spice Court"],
    sunsetSpots: ["Nahargarh Fort", "Jaigarh Fort", "Amber Fort ramparts"],
    foodExperiences: ["Pyaaz kachori breakfast", "Dal baati churma lunch", "Lassi at a heritage haveli", "Laal maas dinner"],
    neighborhoods: ["Pink City (Old Jaipur)", "Amber", "C-Scheme", "Bani Park"],
    culturalExperiences: ["Block-printing workshop", "Elephant village visit", "Bazaar shopping for textiles & gems", "Rajasthani folk dance dinner"],
    bestMonths: ["Oct", "Nov", "Dec", "Feb", "Mar"],
    attractionCount: 30,
    budgetPerDay: { economy: 25, medium: 60, luxury: 220 },
    weatherNote: "Winter (Oct–Mar) is the comfortable, festive season; April–June is desert-hot.",
    confidence: 89,
    transportTip: "Autos and Uber/Ola cover the Pink City cheaply; hire a car-with-driver for the hilltop forts.",
  },
  {
    city: "Mumbai",
    country: "India",
    aliases: ["bombay"],
    mustSee: ["Gateway of India", "Marine Drive", "Elephanta Caves", "Chhatrapati Shivaji Terminus"],
    strong: ["Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", "Haji Ali Dargah", "Dhobi Ghat", "Bandra-Worli Sea Link", "Juhu Beach", "Siddhivinayak Temple"],
    hiddenGems: ["Banganga Tank", "Sassoon Docks", "Khotachiwadi heritage village"],
    localRecommendations: ["Bademiya", "Britannia & Co.", "Leopold Cafe"],
    nightlife: ["Toto's Garage", "Bonobo", "AntiSocial", "Aer rooftop bar"],
    sunsetSpots: ["Marine Drive", "Bandstand Promenade", "Worli Sea Face"],
    foodExperiences: ["Vada pav street breakfast", "Bhel puri at Chowpatty", "Parsi dinner at an Irani café", "Seafood thali in Fort"],
    neighborhoods: ["Colaba", "Fort", "Bandra", "Marine Drive"],
    culturalExperiences: ["Dharavi community walk", "Bollywood studio tour", "Crawford Market visit", "Sunset along Marine Drive"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb"],
    attractionCount: 35,
    budgetPerDay: { economy: 30, medium: 70, luxury: 240 },
    weatherNote: "November–February is dry and pleasant; the June–September monsoon is intense, summers humid.",
    confidence: 88,
    transportTip: "Local trains and the metro are fastest in rush hour; black-and-yellow taxis and autos fill the gaps.",
  },

  // ── East Asia (China) ─────────────────────────────────────────────────────
  {
    city: "Beijing",
    country: "China",
    aliases: ["peking"],
    mustSee: ["Great Wall of China", "Forbidden City", "Temple of Heaven", "Tiananmen Square", "Summer Palace"],
    strong: ["Mutianyu Great Wall", "Palace Museum", "Beihai Park", "Lama Temple", "Jingshan Park", "798 Art District"],
    hiddenGems: ["Houhai Lake hutongs", "Prince Gong's Mansion", "Nanluoguxiang alley"],
    localRecommendations: ["Quanjude (Peking duck)", "Da Dong", "Mr Shi's Dumplings"],
    nightlife: ["Sanlitun bar street", "Migas Rooftop", "Janes & Hooch", "Dada Beijing"],
    sunsetSpots: ["Jingshan Park hilltop", "Mutianyu Great Wall", "Summer Palace lake"],
    foodExperiences: ["Jianbing street breakfast", "Peking duck dinner", "Hutong dumpling lunch", "Tea house tasting"],
    neighborhoods: ["Dongcheng", "Sanlitun", "Houhai", "Qianmen"],
    culturalExperiences: ["Great Wall hike at Mutianyu", "Hutong rickshaw tour", "Tea ceremony", "Peking opera performance"],
    bestMonths: ["Apr", "May", "Sep", "Oct"],
    attractionCount: 45,
    budgetPerDay: { economy: 40, medium: 90, luxury: 280 },
    weatherNote: "Spring and autumn are mild and clear; summers are hot and humid, winters cold and dry.",
    confidence: 88,
    transportTip: "The metro is vast, cheap and English-signed; get a transit QR or card and use DiDi for late nights.",
  },
  {
    city: "Shanghai",
    country: "China",
    mustSee: ["The Bund", "Yuyuan Garden", "Oriental Pearl Tower", "Shanghai Tower", "Nanjing Road"],
    strong: ["Shanghai Museum", "Tian Zi Fang", "Jade Buddha Temple", "Xintiandi", "People's Square", "Shanghai Disneyland"],
    hiddenGems: ["Tianzifang lanes", "1933 Old Millfun", "Zhujiajiao water town"],
    localRecommendations: ["Jia Jia Tang Bao", "Din Tai Fung", "Lost Heaven"],
    nightlife: ["Bar Rouge", "Speak Low", "Captain Bar rooftop", "Found 158"],
    sunsetSpots: ["The Bund waterfront", "Oriental Pearl Tower deck", "Shanghai Tower observation deck"],
    foodExperiences: ["Xiaolongbao soup dumplings", "Scallion pancake street snack", "French Concession café lunch", "Riverside fine-dining dinner"],
    neighborhoods: ["The Bund", "French Concession", "Xintiandi", "Pudong"],
    culturalExperiences: ["Bund architecture walk", "Yuyuan Garden tea house", "Acrobatics show", "Water town day trip"],
    bestMonths: ["Apr", "May", "Oct", "Nov"],
    attractionCount: 40,
    budgetPerDay: { economy: 40, medium: 95, luxury: 300 },
    weatherNote: "Spring and autumn are the most comfortable; summers are hot and humid, winters damp and chilly.",
    confidence: 88,
    transportTip: "The metro reaches almost everything and the Maglev links the airport; DiDi is easy door-to-door.",
  },

  // ── Southeast Asia ────────────────────────────────────────────────────────
  {
    city: "Hanoi",
    country: "Vietnam",
    mustSee: ["Hoan Kiem Lake", "Old Quarter", "Temple of Literature", "Ho Chi Minh Mausoleum", "Hoa Lo Prison"],
    strong: ["One Pillar Pagoda", "Tran Quoc Pagoda", "Thang Long Imperial Citadel", "Dong Xuan Market", "St. Joseph's Cathedral", "Ngoc Son Temple"],
    hiddenGems: ["Train Street", "Long Bien Bridge", "Bat Trang ceramic village"],
    localRecommendations: ["Pho Gia Truyen", "Bun Cha Huong Lien", "Banh Mi 25"],
    nightlife: ["Beer Corner (Ta Hien)", "Polite & Co", "Tadioto", "Nê Cocktail Bar"],
    sunsetSpots: ["Hoan Kiem Lake", "West Lake promenade", "Long Bien Bridge"],
    foodExperiences: ["Pho breakfast", "Bun cha lunch", "Egg coffee at a hidden café", "Street-food crawl in the Old Quarter"],
    neighborhoods: ["Old Quarter", "French Quarter", "West Lake (Tay Ho)", "Ba Dinh"],
    culturalExperiences: ["Water puppet show", "Old Quarter walking tour", "Train Street coffee", "Halong Bay day cruise"],
    bestMonths: ["Oct", "Nov", "Mar", "Apr"],
    attractionCount: 30,
    budgetPerDay: { economy: 20, medium: 50, luxury: 180 },
    weatherNote: "Autumn (Oct–Nov) and spring (Mar–Apr) are mild; summers are hot and wet, winters cool and grey.",
    confidence: 88,
    transportTip: "The Old Quarter is best on foot; use Grab (bike or car) for everything else and avoid rush-hour driving.",
  },
  {
    city: "Ho Chi Minh City",
    country: "Vietnam",
    aliases: ["saigon", "ho chi minh"],
    mustSee: ["War Remnants Museum", "Independence Palace", "Notre-Dame Cathedral Basilica of Saigon", "Ben Thanh Market", "Cu Chi Tunnels"],
    strong: ["Saigon Central Post Office", "Bitexco Financial Tower", "Jade Emperor Pagoda", "Bui Vien Walking Street", "Thien Hau Temple"],
    hiddenGems: ["Cafe Apartments on Nguyen Hue", "Tan Dinh Pink Church", "Binh Tay Market in Cholon"],
    localRecommendations: ["Pho Hoa Pasteur", "Banh Mi Huynh Hoa", "Secret Garden"],
    nightlife: ["Chill Skybar", "Bui Vien Street", "Layla Eatery & Bar", "Social Club Rooftop"],
    sunsetSpots: ["Bitexco Saigon Skydeck", "Chill Skybar", "Saigon River waterfront"],
    foodExperiences: ["Pho or banh mi breakfast", "Com tam (broken rice) lunch", "Vietnamese iced coffee", "Rooftop dinner over the skyline"],
    neighborhoods: ["District 1", "Cholon (District 5)", "Thao Dien", "Pham Ngu Lao"],
    culturalExperiences: ["Cu Chi Tunnels day trip", "Mekong Delta cruise", "Cyclo ride downtown", "Vietnamese coffee culture"],
    bestMonths: ["Dec", "Jan", "Feb", "Mar"],
    attractionCount: 28,
    budgetPerDay: { economy: 20, medium: 50, luxury: 180 },
    weatherNote: "Dry season (Dec–Apr) is best; the May–November wet season brings short, heavy afternoon downpours.",
    confidence: 87,
    transportTip: "Grab bikes and cars are the cheap, easy default; District 1 sights cluster within walking distance.",
  },
  {
    city: "Siem Reap",
    country: "Cambodia",
    aliases: ["angkor"],
    mustSee: ["Angkor Wat", "Bayon Temple", "Ta Prohm", "Angkor Thom", "Banteay Srei"],
    strong: ["Phnom Bakheng", "Preah Khan", "Srah Srang", "Angkor National Museum", "Pub Street", "Beng Mealea"],
    hiddenGems: ["Kbal Spean river carvings", "Tonle Sap floating villages", "Phnom Kulen waterfall"],
    localRecommendations: ["Marum", "Khmer Kitchen", "Pou Restaurant"],
    nightlife: ["Pub Street", "Miss Wong Cocktail Bar", "Angkor What? Bar", "Asana Wooden House"],
    sunsetSpots: ["Phnom Bakheng", "Angkor Wat reflecting pools", "Pre Rup temple"],
    foodExperiences: ["Khmer breakfast with kuy teav", "Fish amok lunch", "Street BBQ on Pub Street", "Cambodian cooking class"],
    neighborhoods: ["Old Market (Psar Chas)", "Wat Bo", "Sok San Road", "Charles de Gaulle (temple road)"],
    culturalExperiences: ["Sunrise at Angkor Wat", "Apsara dance dinner show", "Floating village boat trip", "Temple cycling tour"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb"],
    attractionCount: 25,
    budgetPerDay: { economy: 25, medium: 55, luxury: 200 },
    weatherNote: "Cool, dry season (Nov–Feb) is ideal for temples; March–May is very hot, summer brings rain.",
    confidence: 88,
    transportTip: "Hire a tuk-tuk driver for the day to tour the temples; the town itself is small and walkable.",
  },

  // ── Turkey & Middle East ──────────────────────────────────────────────────
  {
    city: "Cappadocia",
    country: "Turkey",
    aliases: ["goreme", "kapadokya", "nevsehir"],
    mustSee: ["Göreme Open Air Museum", "Uçhisar Castle", "Love Valley", "Derinkuyu Underground City", "Pasabag Valley"],
    strong: ["Devrent Valley", "Avanos pottery town", "Ortahisar Castle", "Rose Valley", "Kaymakli Underground City", "Zelve Open Air Museum"],
    hiddenGems: ["Pigeon Valley", "Soganli Valley", "Mustafapasa village"],
    localRecommendations: ["Topdeck Cave Restaurant", "Seten Restaurant", "Dibek"],
    nightlife: ["Fat Boys Bar", "Mojo Bar Goreme", "Angel Cave Bar"],
    sunsetSpots: ["Sunset Point (Red Valley)", "Uçhisar Castle", "Love Valley viewpoint"],
    foodExperiences: ["Turkish village breakfast", "Testi kebab (pottery kebab) dinner", "Gözleme lunch", "Local Cappadocia wine tasting"],
    neighborhoods: ["Göreme", "Uçhisar", "Ürgüp", "Avanos"],
    culturalExperiences: ["Hot-air balloon ride at sunrise", "Cave hotel stay", "Underground city exploration", "Valley hiking between fairy chimneys"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct"],
    attractionCount: 22,
    budgetPerDay: { economy: 35, medium: 80, luxury: 260 },
    weatherNote: "Spring and autumn are mild with the most reliable balloon flights; summers hot, winters snowy but scenic.",
    confidence: 88,
    transportTip: "Distances are large — rent a car or join valley tours; balloon flights and hotels arrange sunrise pickups.",
  },
  {
    city: "Abu Dhabi",
    country: "United Arab Emirates",
    mustSee: ["Sheikh Zayed Grand Mosque", "Louvre Abu Dhabi", "Qasr Al Watan", "Ferrari World"],
    strong: ["Emirates Palace", "Yas Island", "Corniche Beach", "Qasr Al Hosn", "Warner Bros World", "Saadiyat Beach", "Yas Marina Circuit"],
    hiddenGems: ["Mangrove National Park kayaking", "Qasr Al Sarab desert resort", "Al Ain Oasis day trip"],
    localRecommendations: ["Al Mrzab", "Mezlai", "Li Beirut"],
    nightlife: ["Ray's Bar", "Iris Yas Island", "MAD on Yas Island", "Stratos rotating lounge"],
    sunsetSpots: ["Corniche Beach", "Emirates Palace beach", "Observation Deck at 300"],
    foodExperiences: ["Emirati breakfast with balaleet", "Shawarma lunch", "Desert dinner under the stars", "Luxury hotel brunch"],
    neighborhoods: ["Corniche", "Yas Island", "Saadiyat Island", "Al Maryah Island"],
    culturalExperiences: ["Grand Mosque visit", "Desert safari with dune bashing", "Louvre Abu Dhabi galleries", "Falconry experience"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb", "Mar"],
    attractionCount: 30,
    budgetPerDay: { economy: 60, medium: 140, luxury: 420 },
    weatherNote: "November–March is warm and ideal; April–October is intensely hot and humid — plan indoor midday.",
    confidence: 90,
    transportTip: "Distances are big and walking is limited — use taxis, Careem/Uber, or the cheap, clean public buses.",
  },
  {
    city: "Petra",
    country: "Jordan",
    aliases: ["wadi musa"],
    mustSee: ["The Treasury", "Al-Khazneh", "The Monastery", "Ad Deir", "Petra Siq", "Royal Tombs"],
    strong: ["High Place of Sacrifice", "Street of Facades", "Great Temple", "Petra Theatre", "Little Petra", "Colonnaded Street"],
    hiddenGems: ["Al-Khubtha Trail to the Treasury viewpoint", "Wadi Muthlim canyon", "Umm al-Biyara"],
    localRecommendations: ["My Mom's Recipe", "The Basin Restaurant", "Three Steps Restaurant"],
    sunsetSpots: ["High Place of Sacrifice", "Al-Khubtha viewpoint", "Monastery plateau"],
    foodExperiences: ["Jordanian breakfast with hummus & falafel", "Mansaf lunch", "Bedouin tea in a cave", "Zarb (underground BBQ) dinner"],
    neighborhoods: ["Wadi Musa", "Petra Archaeological Park", "Little Petra (Siq al-Barid)"],
    culturalExperiences: ["Walk the Siq to the Treasury", "Petra by Night candlelight", "Hike to the Monastery", "Bedouin cultural encounter"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 18,
    budgetPerDay: { economy: 45, medium: 95, luxury: 280 },
    weatherNote: "Spring and autumn are ideal for the long walks; summer middays are very hot, winter nights cold.",
    confidence: 89,
    transportTip: "You explore the site itself on foot (long walks); Wadi Musa town is a short taxi ride from the gate.",
  },

  // ── United States ─────────────────────────────────────────────────────────
  {
    city: "Los Angeles",
    country: "United States",
    mustSee: ["Hollywood Sign", "Griffith Observatory", "Santa Monica Pier", "Getty Center", "Walt Disney Concert Hall"],
    strong: ["Universal Studios Hollywood", "TCL Chinese Theatre", "Venice Beach Boardwalk", "The Broad", "Hollywood Walk of Fame", "Rodeo Drive", "Los Angeles County Museum of Art"],
    hiddenGems: ["The Last Bookstore", "Watts Towers", "Bradbury Building", "Hollywood Forever Cemetery"],
    localRecommendations: ["Grand Central Market", "Guelaguetza", "In-N-Out Burger"],
    nightlife: ["The Roosevelt", "Skybar at Mondrian", "Perch rooftop", "The Abbey"],
    sunsetSpots: ["Griffith Observatory", "Santa Monica Pier", "Malibu beaches", "Mulholland Drive overlook"],
    foodExperiences: ["Breakfast burrito", "Korean BBQ in Koreatown", "Tacos from a street stand", "Farmers-market brunch"],
    neighborhoods: ["Hollywood", "Santa Monica", "Downtown LA", "Venice", "Beverly Hills"],
    culturalExperiences: ["Walk of Fame stroll", "Getty Center art & gardens", "Studio backlot tour", "Venice Beach people-watching"],
    bestMonths: ["Mar", "Apr", "May", "Sep", "Oct"],
    attractionCount: 45,
    budgetPerDay: { economy: 80, medium: 160, luxury: 420 },
    weatherNote: "Sunny and mild almost year-round; spring and fall are perfect, summers warm and dry.",
    confidence: 91,
    transportTip: "A car is by far the easiest way around LA's sprawl; budget for traffic and use the Metro for downtown.",
  },
  {
    city: "San Francisco",
    country: "United States",
    mustSee: ["Golden Gate Bridge", "Alcatraz Island", "Fisherman's Wharf", "Lombard Street", "Painted Ladies"],
    strong: ["Golden Gate Park", "Pier 39", "Cable Car", "Coit Tower", "Palace of Fine Arts", "Chinatown San Francisco", "Ferry Building"],
    hiddenGems: ["Sutro Baths ruins", "16th Avenue Tiled Steps", "Lands End Trail", "Wave Organ"],
    localRecommendations: ["Tartine Bakery", "Swan Oyster Depot", "La Taqueria"],
    nightlife: ["Trick Dog", "Top of the Mark", "El Techo rooftop", "The Saloon"],
    sunsetSpots: ["Twin Peaks", "Baker Beach", "Lands End", "Battery Spencer (bridge view)"],
    foodExperiences: ["Sourdough & coffee breakfast", "Mission burrito lunch", "Dungeness crab at the wharf", "Dim sum in Chinatown"],
    neighborhoods: ["Fisherman's Wharf", "Mission District", "North Beach", "Haight-Ashbury", "Marina"],
    culturalExperiences: ["Cable car ride", "Alcatraz audio tour", "Golden Gate Bridge walk", "Mission murals walk"],
    bestMonths: ["Sep", "Oct", "Apr", "May"],
    attractionCount: 40,
    budgetPerDay: { economy: 85, medium: 170, luxury: 440 },
    weatherNote: "Mild but famously foggy; September–October is warmest and clearest, summers can be cool and grey.",
    confidence: 91,
    transportTip: "Compact and walkable, with iconic cable cars, Muni and BART; rideshare handles the hills and gaps.",
  },
  {
    city: "Las Vegas",
    country: "United States",
    aliases: ["vegas"],
    mustSee: ["The Strip", "Bellagio Fountains", "Fremont Street Experience", "High Roller"],
    strong: ["The Venetian", "Caesars Palace", "Red Rock Canyon", "Stratosphere Tower", "Bellagio Conservatory", "Sphere", "Hoover Dam"],
    hiddenGems: ["Neon Museum", "Seven Magic Mountains", "Valley of Fire State Park"],
    localRecommendations: ["Lotus of Siam", "In-N-Out Burger", "Eggslut"],
    nightlife: ["Omnia Nightclub", "XS Nightclub", "Skyfall Lounge", "Hakkasan"],
    sunsetSpots: ["High Roller observation wheel", "Stratosphere Tower", "Red Rock Canyon scenic drive"],
    foodExperiences: ["Casino buffet brunch", "Celebrity-chef tasting menu", "Late-night diner on the Strip", "Cocktails with a fountain view"],
    neighborhoods: ["The Strip", "Downtown / Fremont", "Summerlin", "Chinatown"],
    culturalExperiences: ["Cirque du Soleil show", "Bellagio fountain show", "Neon Museum boneyard", "Grand Canyon day trip"],
    bestMonths: ["Mar", "Apr", "May", "Oct", "Nov"],
    attractionCount: 30,
    budgetPerDay: { economy: 70, medium: 160, luxury: 500 },
    weatherNote: "Spring and fall are ideal; summers are desert-hot (often 40°C+), winters mild and cool at night.",
    confidence: 90,
    transportTip: "The Strip is walkable but long — use the monorail, rideshare or hotel trams between casinos.",
  },
  {
    city: "Miami",
    country: "United States",
    mustSee: ["South Beach", "Art Deco Historic District", "Wynwood Walls", "Vizcaya Museum and Gardens"],
    strong: ["Ocean Drive", "Little Havana", "Bayside Marketplace", "Pérez Art Museum Miami", "Lincoln Road", "Bal Harbour", "Coral Gables"],
    hiddenGems: ["Ancient Spanish Monastery", "The Kampong garden", "Coral Castle"],
    localRecommendations: ["Versailles Restaurant", "Joe's Stone Crab", "La Sandwicherie"],
    nightlife: ["LIV", "E11EVEN", "Sugar rooftop", "Ball & Chain"],
    sunsetSpots: ["South Pointe Park", "Bayside Marketplace", "Brickell rooftop bars"],
    foodExperiences: ["Cuban coffee & pastelito breakfast", "Stone crab lunch", "Ceviche on Ocean Drive", "Late-night Cuban sandwich"],
    neighborhoods: ["South Beach", "Wynwood", "Little Havana", "Brickell", "Coconut Grove"],
    culturalExperiences: ["Art Deco walking tour", "Wynwood street-art murals", "Little Havana cigar & domino culture", "Everglades airboat day trip"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
    attractionCount: 32,
    budgetPerDay: { economy: 75, medium: 160, luxury: 440 },
    weatherNote: "Winter and spring (Nov–Apr) are warm, dry and ideal; summers are hot, humid and prone to afternoon storms.",
    confidence: 90,
    transportTip: "A car or rideshare is handy across neighborhoods; South Beach and Brickell are walkable, plus the free Metromover.",
  },

  // ── Canada ────────────────────────────────────────────────────────────────
  {
    city: "Toronto",
    country: "Canada",
    mustSee: ["CN Tower", "Royal Ontario Museum", "Casa Loma", "St. Lawrence Market", "Distillery District"],
    strong: ["Ripley's Aquarium of Canada", "Art Gallery of Ontario", "Toronto Islands", "Hockey Hall of Fame", "Nathan Phillips Square", "Kensington Market", "High Park"],
    hiddenGems: ["Graffiti Alley", "Evergreen Brick Works", "Scarborough Bluffs"],
    localRecommendations: ["Pai Northern Thai Kitchen", "Banh Mi Boys", "Seven Lives Tacos"],
    nightlife: ["The Drake Hotel", "Rooftop at the Broadview Hotel", "El Mocambo", "Lavelle Rooftop"],
    sunsetSpots: ["Toronto Islands", "Polson Pier", "Riverdale Park East"],
    foodExperiences: ["Peameal bacon sandwich at St. Lawrence Market", "Dim sum in Chinatown", "Tacos in Kensington Market", "Patio brunch on Ossington"],
    neighborhoods: ["Downtown", "Distillery District", "Kensington Market", "Queen West", "The Annex"],
    culturalExperiences: ["CN Tower EdgeWalk or view", "ROM galleries", "Toronto Islands ferry", "Multicultural food crawl"],
    bestMonths: ["May", "Jun", "Sep", "Oct"],
    attractionCount: 35,
    budgetPerDay: { economy: 70, medium: 150, luxury: 380 },
    weatherNote: "Late spring and early autumn are mild and pleasant; summers are warm, winters cold and snowy.",
    confidence: 90,
    transportTip: "The TTC subway and streetcars cover the core — tap a PRESTO card or contactless; downtown is walkable.",
  },
  {
    city: "Montreal",
    country: "Canada",
    aliases: ["montréal"],
    mustSee: ["Notre-Dame Basilica of Montreal", "Old Montreal", "Mount Royal", "Saint Joseph's Oratory"],
    strong: ["Jean-Talon Market", "Montreal Botanical Garden", "Old Port of Montreal", "Mile End", "Plateau Mont-Royal", "Montreal Museum of Fine Arts"],
    hiddenGems: ["Atwater Market", "Lachine Canal", "Parc Jean-Drapeau"],
    localRecommendations: ["Schwartz's Deli", "La Banquise", "Olive et Gourmando"],
    nightlife: ["Crescent Street bars", "Le Mal Nécessaire", "Terrasse Nelligan", "Stereo Nightclub"],
    sunsetSpots: ["Mount Royal Belvedere", "Old Port riverside", "Parc Jean-Drapeau"],
    foodExperiences: ["Montreal bagel & coffee", "Smoked meat sandwich", "Poutine late-night", "Sugar shack maple treats"],
    neighborhoods: ["Old Montreal", "Plateau Mont-Royal", "Mile End", "Downtown", "Le Village"],
    culturalExperiences: ["Old Montreal cobblestone walk", "Mount Royal hike", "Jean-Talon Market tasting", "Festival in summer"],
    bestMonths: ["May", "Jun", "Sep", "Oct"],
    attractionCount: 32,
    budgetPerDay: { economy: 65, medium: 135, luxury: 340 },
    weatherNote: "Spring and fall are lovely; summers warm and festival-packed, winters very cold and snowy.",
    confidence: 89,
    transportTip: "The Métro is fast, clean and cheap; Old Montreal and the Plateau are best explored on foot.",
  },
  {
    city: "Vancouver",
    country: "Canada",
    mustSee: ["Stanley Park", "Capilano Suspension Bridge", "Granville Island", "Grouse Mountain"],
    strong: ["Gastown", "Stanley Park Seawall", "VanDusen Botanical Garden", "Science World", "English Bay", "Museum of Anthropology"],
    hiddenGems: ["Lighthouse Park", "Lynn Canyon", "Dr. Sun Yat-Sen Classical Chinese Garden"],
    localRecommendations: ["Granville Island Public Market", "Japadog", "Miku (aburi sushi)"],
    nightlife: ["Gastown cocktail bars", "The Cambie", "Botanist Bar", "Celebrities Nightclub"],
    sunsetSpots: ["English Bay Beach", "Stanley Park Seawall", "Jericho Beach"],
    foodExperiences: ["Aburi sushi", "Granville Island market lunch", "West Coast seafood", "Craft beer in Mount Pleasant"],
    neighborhoods: ["Downtown", "Gastown", "Yaletown", "Kitsilano", "Mount Pleasant"],
    culturalExperiences: ["Stanley Park seawall cycle", "Granville Island artisans", "Capilano canyon walk", "Grouse Mountain views"],
    bestMonths: ["Jun", "Jul", "Aug", "Sep"],
    attractionCount: 30,
    budgetPerDay: { economy: 75, medium: 155, luxury: 390 },
    weatherNote: "Summers are mild, dry and stunning; autumn through spring is cool and rainy.",
    confidence: 89,
    transportTip: "SkyTrain, SeaBus and buses run on one Compass card; downtown, Gastown and the seawall are walkable.",
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

/** The V3 Discover-page facts for a destination (§17). Works with OR without a
 *  curated pack — a pack city gets rich, high-confidence facts; any other city
 *  worldwide still gets honest, non-null fields from the global engine. */
export interface DestinationSummary {
  hasPack: boolean;
  /** Curated attraction count, or null when unknown (no pack). */
  attractionCount: number | null;
  /** 0..100 destination confidence (pack confidence, else global baseline). */
  confidence: number;
  /** 0..100 composite trip-quality score (coverage + attraction richness).
   *  Deterministically derived from curated signals — not a review rating. */
  travelScore: number;
  bestMonths: string[];
  budgetPerDay: KnowledgePack["budgetPerDay"] | null;
  /** A few headline things to do (must-sees + a cultural experience). */
  topExperiences: string[];
  /** Key neighborhoods to base days around (curated); empty when no pack. */
  neighborhoods: string[];
  /** One-line transport guidance, when curated. */
  transportTip: string | null;
  /** Plain-language weather suitability note, when curated. */
  weatherNote: string | null;
}

/** Composite 0..100 trip-quality score: blends how well we cover the place
 *  with how much there is to do. Deterministic and explainable — derived from
 *  curated signals only (never an invented review rating). */
function computeTravelScore(pack: KnowledgePack): number {
  const richness = Math.min(100, pack.attractionCount * 1.4);
  return Math.round(0.6 * pack.confidence + 0.4 * richness);
}

/** Global-engine destination confidence when no curated pack exists (§16). */
export const GLOBAL_ENGINE_CONFIDENCE = 55;

export function destinationSummary(destination: string): DestinationSummary {
  const pack = getKnowledgePack(destination);
  if (!pack) {
    return {
      hasPack: false,
      attractionCount: null,
      confidence: GLOBAL_ENGINE_CONFIDENCE,
      travelScore: GLOBAL_ENGINE_CONFIDENCE,
      bestMonths: [],
      budgetPerDay: null,
      topExperiences: [],
      neighborhoods: [],
      transportTip: null,
      weatherNote: null,
    };
  }
  return {
    hasPack: true,
    attractionCount: pack.attractionCount,
    confidence: pack.confidence,
    travelScore: computeTravelScore(pack),
    bestMonths: pack.bestMonths,
    budgetPerDay: pack.budgetPerDay,
    topExperiences: [...pack.mustSee.slice(0, 3), ...pack.culturalExperiences.slice(0, 2)],
    neighborhoods: pack.neighborhoods.slice(0, 5),
    transportTip: pack.transportTip ?? null,
    weatherNote: pack.weatherNote,
  };
}

const MATCH_STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "de", "la", "le", "el", "du", "des", "da",
  "di", "do", "las", "los", "al", "place", "plaza", "parc", "park", "musee",
  "museo", "museum", "wat", "gardens", "garden",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !MATCH_STOPWORDS.has(t));
}

/** Two tokens "match" if equal or one is a ≥3-char prefix of the other
 *  (tolerates Fna/Fnaa, Senso/Sensoji-style spelling variants). */
function tokenMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const min = Math.min(a.length, b.length);
  return min >= 3 && (a.startsWith(b) || b.startsWith(a));
}

/**
 * Tolerant match of a candidate place name against a curated name: exact /
 * substring on the normalised form, OR ≥60% of the curated name's significant
 * tokens are covered by the candidate's tokens. Robust to prefixes ("Place …")
 * and minor spelling variants without matching unrelated places.
 */
export function looseMatch(curated: string, candidate: string): boolean {
  const a = norm(curated);
  const b = norm(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 6 && (a.includes(b) || b.includes(a))) return true;
  const ta = tokenize(curated);
  const tb = tokenize(candidate);
  if (ta.length === 0) return false;
  if (ta.length === 1) return tb.some((t) => tokenMatch(ta[0], t)) && ta[0].length >= 5;
  const covered = ta.filter((t) => tb.some((u) => tokenMatch(t, u))).length;
  return covered / ta.length >= 0.6;
}

/** Priority tier of a place against a pack: 1 = must-see, 2 = strong, 0 = none. */
export function packNameTier(pack: KnowledgePack, placeName: string): 1 | 2 | 0 {
  if (pack.mustSee.some((x) => looseMatch(x, placeName))) return 1;
  if (pack.strong.some((x) => looseMatch(x, placeName))) return 2;
  return 0;
}

/** True when a candidate matches one of the pack's curated Tier-3 hidden gems
 *  (real, verified, lower-traffic spots) — promoted to a confirmed gem even
 *  when the generic `gemConfidence()` heuristic wouldn't flag it on its own. */
export function packIsHiddenGem(pack: KnowledgePack, placeName: string): boolean {
  return (pack.hiddenGems ?? []).some((x) => looseMatch(x, placeName));
}

/** True when a candidate matches one of the pack's curated Tier-4 local-
 *  favorite venues — used to nudge meal/café picks beyond whatever a generic
 *  API search happens to return first. */
export function packIsLocalRecommendation(pack: KnowledgePack, placeName: string): boolean {
  return (pack.localRecommendations ?? []).some((x) => looseMatch(x, placeName));
}

/** True when a candidate matches one of the pack's curated real nightlife
 *  venues — used to prefer an actual known venue over a generic nearby bar. */
export function packIsNightlifeVenue(pack: KnowledgePack, placeName: string): boolean {
  return (pack.nightlife ?? []).some((x) => looseMatch(x, placeName));
}

/**
 * Photo Validator's subject-match gate: a text search for "name + city" can
 * return its single best guess even when that guess is a disambiguation page
 * (no single real place) or an article about something the query merely
 * ranked near — neither was checked before this existed, so an OSM place
 * could silently get a stranger's photo/description attached. Reuses the
 * same tolerant matcher already used to grade must-see candidates, so a
 * genuine spelling/translation variant (e.g. "Sensō-ji" vs "Sensoji Temple")
 * still passes, but an unrelated topic the search merely surfaced does not.
 */
export function isMatchingArticle(
  queriedName: string,
  articleTitle: string | undefined,
  pageprops?: { disambiguation?: string }
): boolean {
  if (pageprops?.disambiguation !== undefined) return false;
  if (!articleTitle) return false;
  return looseMatch(queriedName, articleTitle);
}

export { norm as normName };
