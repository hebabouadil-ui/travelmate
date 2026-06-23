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
    mustSee: ["Hassan II Mosque", "Old Medina of Casablanca", "Corniche Ain Diab", "Mohammed V Square"],
    strong: ["Quartier Habous", "Cathédrale du Sacré-Cœur", "Villa des Arts", "Morocco Mall"],
    sunsetSpots: ["Corniche Ain Diab", "Hassan II Mosque esplanade"],
    foodExperiences: ["Fresh seafood", "Moroccan breakfast", "Street food", "Café culture"],
    neighborhoods: ["Centre Ville", "Ain Diab", "Habous"],
    culturalExperiences: ["Art Deco architecture walk", "Mosque tour", "Corniche stroll"],
    bestMonths: ["Apr", "May", "Jun", "Sep", "Oct", "Nov"],
    attractionCount: 18, budgetPerDay: { economy: 40, medium: 85, luxury: 200 },
    weatherNote: "Mild Atlantic climate year-round; spring and autumn are best.", confidence: 85,
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
    sunsetSpots: ["Wat Arun riverside", "Rooftop sky bars"],
    foodExperiences: ["Street food crawl", "Pad thai", "Mango sticky rice", "Boat noodles"],
    neighborhoods: ["Rattanakosin (Old City)", "Sukhumvit", "Chinatown"],
    culturalExperiences: ["Temples", "Floating markets", "Thai massage", "Rooftop nightlife"],
    bestMonths: ["Nov", "Dec", "Jan", "Feb"],
    attractionCount: 50, budgetPerDay: { economy: 25, medium: 65, luxury: 220 },
    weatherNote: "Cool, dry season (Nov–Feb) is best; very hot Mar–May, monsoon Jun–Oct.", confidence: 93,
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
    sunsetSpots: ["Primrose Hill", "Sky Garden", "London Eye"],
    foodExperiences: ["Sunday roast", "Afternoon tea", "Borough Market", "Brick Lane curry"],
    neighborhoods: ["Westminster", "South Bank", "Shoreditch", "Camden", "Notting Hill"],
    culturalExperiences: ["West End theatre", "Free museums", "Markets", "Royal ceremony"],
    bestMonths: ["May", "Jun", "Jul", "Aug", "Sep"],
    attractionCount: 90, budgetPerDay: { economy: 80, medium: 170, luxury: 450 },
    weatherNote: "Mild but wet; May–September is the warmest, brightest window.", confidence: 96,
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
  bestMonths: string[];
  budgetPerDay: KnowledgePack["budgetPerDay"] | null;
  /** A few headline things to do (must-sees + a cultural experience). */
  topExperiences: string[];
  /** Plain-language weather suitability note, when curated. */
  weatherNote: string | null;
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
      bestMonths: [],
      budgetPerDay: null,
      topExperiences: [],
      weatherNote: null,
    };
  }
  return {
    hasPack: true,
    attractionCount: pack.attractionCount,
    confidence: pack.confidence,
    bestMonths: pack.bestMonths,
    budgetPerDay: pack.budgetPerDay,
    topExperiences: [...pack.mustSee.slice(0, 3), ...pack.culturalExperiences.slice(0, 2)],
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
