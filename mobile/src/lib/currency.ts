import type { GeoPoint } from "./types";

/**
 * Map a destination country to its local currency so prices aren't always shown
 * in euros. Falls back to EUR for unknown countries. Amounts are rough
 * estimates, so we only swap the display currency (symbol/code), not FX rates.
 */
const COUNTRY_CURRENCY: Record<string, string> = {
  canada: "CAD",
  "united states": "USD",
  usa: "USD",
  "united kingdom": "GBP",
  uk: "GBP",
  morocco: "MAD",
  japan: "JPY",
  "united arab emirates": "AED",
  uae: "AED",
  switzerland: "CHF",
  australia: "AUD",
  "new zealand": "NZD",
  china: "CNY",
  india: "INR",
  thailand: "THB",
  turkey: "TRY",
  egypt: "EGP",
  "south africa": "ZAR",
  brazil: "BRL",
  mexico: "MXN",
  russia: "RUB",
  "south korea": "KRW",
  korea: "KRW",
  singapore: "SGD",
  "hong kong": "HKD",
  norway: "NOK",
  sweden: "SEK",
  denmark: "DKK",
  poland: "PLN",
  "czech republic": "CZK",
  hungary: "HUF",
  tunisia: "TND",
  algeria: "DZD",
  "saudi arabia": "SAR",
  qatar: "QAR",
  indonesia: "IDR",
  vietnam: "VND",
  philippines: "PHP",
};

// Eurozone countries → EUR (explicit so they don't fall to the default oddly).
const EUR_COUNTRIES = [
  "france", "spain", "italy", "germany", "portugal", "netherlands", "belgium",
  "austria", "greece", "ireland", "finland", "croatia",
];

export function currencyForCountry(country?: string): string {
  if (!country) return "EUR";
  const key = country.trim().toLowerCase();
  if (EUR_COUNTRIES.includes(key)) return "EUR";
  return COUNTRY_CURRENCY[key] ?? "EUR";
}

/** Short symbol for compact labels (e.g. on stop cards). */
export function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    EUR: "€", USD: "$", CAD: "$", AUD: "$", NZD: "$", SGD: "$", HKD: "$",
    GBP: "£", JPY: "¥", CNY: "¥", MAD: "MAD ", AED: "AED ", CHF: "CHF ",
    INR: "₹", THB: "฿", TRY: "₺", EGP: "E£", ZAR: "R", BRL: "R$", MXN: "$",
    RUB: "₽", KRW: "₩", NOK: "kr ", SEK: "kr ", DKK: "kr ", PLN: "zł ",
    CZK: "Kč ", HUF: "Ft ", TND: "DT ", DZD: "DA ", SAR: "SAR ", QAR: "QAR ",
    IDR: "Rp ", VND: "₫", PHP: "₱",
  };
  return map[code] ?? code + " ";
}
