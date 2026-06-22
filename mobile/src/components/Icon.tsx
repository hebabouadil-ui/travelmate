import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  RefreshCw,
  Navigation,
  Compass,
  Sparkles,
  Share2,
  Wallet,
  Umbrella,
  Trash2,
  Pencil,
  CloudOff,
  Search,
  Briefcase,
  MapPin,
  AlertCircle,
  Gem,
  Clock,
  Info,
  Bell,
  User,
  Star,
  Map as MapIcon,
  Image as ImageIcon,
  Footprints,
  Bus,
  Car,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  Snowflake,
  Sunrise,
  Sunset,
  Moon,
  AlarmClock,
  Utensils,
  Calendar,
  Heart,
  Camera,
  Ticket,
  Coffee,
  Bed,
  Landmark,
  Palette,
  Waves,
  Trees,
  Mountain,
  Flag,
  Wine,
  ShoppingBag,
  Target,
  Circle,
  Rocket,
  ArrowRight,
  type LucideIcon,
} from "lucide-react-native";

/**
 * Premium, font-independent iconography. We render Lucide SVG paths via
 * react-native-svg — NOT a glyph font — so icons are crisp, share a single
 * consistent stroke weight, and (critically) always render in release APKs,
 * unlike the Ionicons TTF which left blank squares. API-compatible with the
 * old <Icon name size color /> call sites.
 */
export type IconName = string;

const MAP: Record<string, LucideIcon> = {
  // Controls
  close: X,
  "close-circle": X,
  "chevron-back": ChevronLeft,
  "chevron-forward": ChevronRight,
  "arrow-back": ArrowLeft,
  "arrow-forward": ArrowRight,
  add: Plus,
  rocket: Rocket,
  "ellipse-outline": Circle,
  ellipse: Circle,
  remove: Minus,
  minus: Minus,
  checkmark: Check,
  "checkmark-circle": CheckCircle2,
  refresh: RefreshCw,
  navigate: Navigation,
  "navigate-circle": Navigation,
  "navigate-outline": Navigation,

  // General
  compass: Compass,
  "compass-outline": Compass,
  sparkles: Sparkles,
  share: Share2,
  "share-outline": Share2,
  wallet: Wallet,
  umbrella: Umbrella,
  trash: Trash2,
  "trash-outline": Trash2,
  create: Pencil,
  "create-outline": Pencil,
  "cloud-offline": CloudOff,
  "cloud-offline-outline": CloudOff,
  search: Search,
  "search-outline": Search,
  briefcase: Briefcase,
  "briefcase-outline": Briefcase,
  location: MapPin,
  "location-outline": MapPin,
  pin: MapPin,
  "alert-circle": AlertCircle,
  "alert-circle-outline": AlertCircle,
  diamond: Gem,
  gem: Gem,
  time: Clock,
  "time-outline": Clock,
  "information-circle": Info,
  "information-circle-outline": Info,
  info: Info,
  notifications: Bell,
  "notifications-outline": Bell,
  bell: Bell,
  person: User,
  "person-outline": User,
  user: User,
  star: Star,
  "star-outline": Star,
  map: MapIcon,
  "map-outline": MapIcon,
  image: ImageIcon,
  "image-outline": ImageIcon,
  walk: Footprints,
  bus: Bus,
  car: Car,
  "car-sport": Car,
  sunny: Sun,
  "sunny-outline": Sun,
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  "cloud-drizzle": CloudDrizzle,
  "cloud-fog": CloudFog,
  "cloud-lightning": CloudLightning,
  snowflake: Snowflake,
  sunrise: Sunrise,
  sunset: Sunset,
  "partly-sunny": Sunrise,
  moon: Moon,
  alarm: AlarmClock,
  "alarm-outline": AlarmClock,
  restaurant: Utensils,
  "restaurant-outline": Utensils,
  utensils: Utensils,
  calendar: Calendar,
  "calendar-outline": Calendar,
  heart: Heart,
  "heart-outline": Heart,
  camera: Camera,
  ticket: Ticket,
  cafe: Coffee,
  coffee: Coffee,
  bed: Bed,
  landmark: Landmark,
  palette: Palette,
  waves: Waves,
  trees: Trees,
  mountain: Mountain,
  flag: Flag,
  wine: Wine,
  "shopping-bag": ShoppingBag,
  target: Target,
};

/** Names that should render filled (their non-outline variant). */
const FILLED = new Set(["heart", "star"]);

export function Icon({
  name,
  size = 20,
  color = "#1A1A1E",
  strokeWidth = 2,
  fill,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Force a filled glyph (otherwise inferred for heart/star). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const Comp = MAP[name] ?? Circle;
  const filled = fill ?? FILLED.has(name);
  return (
    <Comp
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={filled ? color : "none"}
      style={style as any}
    />
  );
}

export type GlyphName = keyof typeof MAP;
