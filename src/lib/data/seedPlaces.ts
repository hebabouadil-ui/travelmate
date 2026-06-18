import type { Place, PlaceCategory } from "../types";

type Seed = [string, PlaceCategory, number, number, boolean?, string?];

// [name, category, lat, lng, hiddenGem?, cuisine?]
const DATA: Record<string, Seed[]> = {
  barcelona: [
    ["Sagrada Família", "monument", 41.4036, 2.1744],
    ["Park Güell", "park", 41.4145, 2.1527],
    ["Casa Batlló", "landmark", 41.3917, 2.1649],
    ["Gothic Quarter", "landmark", 41.3833, 2.1769],
    ["Picasso Museum", "museum", 41.3851, 2.1808],
    ["Barceloneta Beach", "beach", 41.3784, 2.1925],
    ["Bunkers del Carmel", "viewpoint", 41.4196, 2.162, true],
    ["El Xampanyet", "restaurant", 41.3845, 2.1815, false, "tapas"],
    ["Bar del Pla", "restaurant", 41.3856, 2.1818, false, "catalan"],
    ["Federal Café", "cafe", 41.3743, 2.1626, true, "coffee"],
  ],
  tokyo: [
    ["Sensō-ji", "monument", 35.7148, 139.7967],
    ["Tokyo Skytree", "attraction", 35.7101, 139.8107],
    ["Meiji Shrine", "monument", 35.6764, 139.6993],
    ["Shibuya Crossing", "landmark", 35.6595, 139.7005],
    ["teamLab Planets", "museum", 35.6499, 139.7906],
    ["Shinjuku Gyoen", "park", 35.6852, 139.71],
    ["Golden Gai", "nightlife", 35.6938, 139.7045, true],
    ["Fuglen Tokyo", "cafe", 35.6686, 139.6951, true, "coffee"],
    ["Ichiran Shibuya", "restaurant", 35.6595, 139.7005, false, "ramen"],
    ["Tsukiji Outer Market", "attraction", 35.6655, 139.7707],
  ],
  marrakech: [
    ["Jemaa el-Fnaa", "landmark", 31.6258, -7.9891],
    ["Koutoubia Mosque", "monument", 31.6238, -7.9933],
    ["Bahia Palace", "landmark", 31.6216, -7.9817],
    ["Majorelle Garden", "park", 31.6417, -8.0033],
    ["Saadian Tombs", "monument", 31.6177, -7.9893],
    ["The Souks", "shopping", 31.6295, -7.987],
    ["Le Jardin Secret", "park", 31.6305, -7.9889, true],
    ["Nomad", "restaurant", 31.63, -7.9876, false, "moroccan"],
    ["Café des Épices", "cafe", 31.6303, -7.9881, true, "moroccan"],
    ["Al Fassia", "restaurant", 31.6356, -8.0123, false, "moroccan"],
  ],
  paris: [
    ["Eiffel Tower", "monument", 48.8584, 2.2945],
    ["Louvre Museum", "museum", 48.8606, 2.3376],
    ["Notre-Dame", "monument", 48.853, 2.3499],
    ["Sacré-Cœur", "monument", 48.8867, 2.3431],
    ["Musée d'Orsay", "museum", 48.86, 2.3266],
    ["Luxembourg Gardens", "park", 48.8462, 2.3372],
    ["Le Marais", "landmark", 48.859, 2.362, true],
    ["Breizh Café", "restaurant", 48.8606, 2.3636, false, "crêperie"],
    ["Café de Flore", "cafe", 48.854, 2.3328, false, "coffee"],
    ["Le Comptoir", "restaurant", 48.8516, 2.3387, false, "french"],
  ],
  rome: [
    ["Colosseum", "monument", 41.8902, 12.4922],
    ["Roman Forum", "landmark", 41.8925, 12.4853],
    ["Pantheon", "monument", 41.8986, 12.4769],
    ["Trevi Fountain", "landmark", 41.9009, 12.4833],
    ["Vatican Museums", "museum", 41.9065, 12.4536],
    ["Trastevere", "landmark", 41.8896, 12.4695, true],
    ["Villa Borghese", "park", 41.9142, 12.4923],
    ["Da Enzo al 29", "restaurant", 41.8884, 12.4767, true, "roman"],
    ["Roscioli", "restaurant", 41.8945, 12.4724, false, "italian"],
    ["Sant'Eustachio Il Caffè", "cafe", 41.8987, 12.4753, false, "coffee"],
  ],
  dubai: [
    ["Burj Khalifa", "landmark", 25.1972, 55.2744],
    ["The Dubai Mall", "shopping", 25.1985, 55.2796],
    ["Palm Jumeirah", "landmark", 25.1124, 55.139],
    ["Dubai Marina", "landmark", 25.0805, 55.1403],
    ["Gold Souk", "shopping", 25.2697, 55.2978],
    ["Jumeirah Beach", "beach", 25.2048, 55.2417],
    ["Museum of the Future", "museum", 25.2197, 55.282],
    ["Ravi Restaurant", "restaurant", 25.235, 55.286, true, "pakistani"],
    ["Arabian Tea House", "cafe", 25.2637, 55.2978, true, "emirati"],
    ["Al Fanar", "restaurant", 25.2231, 55.2716, false, "emirati"],
  ],
  london: [
    ["Tower of London", "monument", 51.5081, -0.0759],
    ["British Museum", "museum", 51.5194, -0.127],
    ["Buckingham Palace", "landmark", 51.5014, -0.1419],
    ["London Eye", "attraction", 51.5033, -0.1196],
    ["Tower Bridge", "landmark", 51.5055, -0.0754],
    ["Hyde Park", "park", 51.5073, -0.1657],
    ["Camden Market", "shopping", 51.5417, -0.1463, true],
    ["Dishoom", "restaurant", 51.5126, -0.1281, false, "indian"],
    ["Monmouth Coffee", "cafe", 51.5151, -0.1255, true, "coffee"],
    ["Borough Market", "attraction", 51.5055, -0.0909],
  ],
  "new york": [
    ["Statue of Liberty", "monument", 40.6892, -74.0445],
    ["Central Park", "park", 40.7829, -73.9654],
    ["Times Square", "landmark", 40.758, -73.9855],
    ["Empire State Building", "landmark", 40.7484, -73.9857],
    ["MoMA", "museum", 40.7614, -73.9776],
    ["Brooklyn Bridge", "landmark", 40.7061, -73.9969],
    ["The High Line", "park", 40.748, -74.0048, true],
    ["Katz's Delicatessen", "restaurant", 40.7223, -73.9874, false, "deli"],
    ["Joe's Pizza", "restaurant", 40.7305, -74.0027, false, "pizza"],
    ["Stumptown Coffee", "cafe", 40.7456, -73.9882, true, "coffee"],
  ],
};

let counter = 0;

export function getSeedPlaces(cityKey: string): Place[] {
  const rows = DATA[cityKey.trim().toLowerCase()];
  if (!rows) return [];
  return rows.map(([name, category, lat, lng, hiddenGem, cuisine]) => ({
    id: `seed_${cityKey}_${counter++}`,
    name,
    category,
    lat,
    lng,
    hiddenGem: Boolean(hiddenGem),
    cuisine,
    tags: cuisine ? [cuisine] : [],
    score: category === "restaurant" || category === "cafe" ? 0.6 : 0.85,
    source: "mock" as const,
  }));
}
