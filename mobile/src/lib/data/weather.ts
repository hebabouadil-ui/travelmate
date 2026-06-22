import type { DayWeather, GeoPoint } from "../types";
import { fetchJson } from "./http";
import { withCache } from "../cache";

interface OpenMeteoResponse {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
    wind_speed_10m_max?: number[];
    sunset?: string[];
  };
}

/**
 * Free, key-less weather forecast via Open-Meteo. Returns up to `days` daily
 * forecasts starting at `startDate` (or today). Cached briefly for offline use.
 */
export async function getWeather(
  center: GeoPoint,
  startDate: string | undefined,
  days: number
): Promise<DayWeather[]> {
  const cacheKey = `weather:${center.lat.toFixed(2)},${center.lng.toFixed(2)}:${
    startDate ?? "today"
  }:${days}`;
  try {
    return await withCache<DayWeather[]>(
      cacheKey,
      1000 * 60 * 60 * 6, // 6 hours
      async () => {
        const params = new URLSearchParams({
          latitude: center.lat.toFixed(4),
          longitude: center.lng.toFixed(4),
          daily:
            "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max,sunset",
          timezone: "auto",
          forecast_days: String(Math.min(Math.max(days, 1), 16)),
        });
        if (startDate) {
          params.set("start_date", startDate);
          params.set("end_date", addDaysIso(startDate, days - 1));
          params.delete("forecast_days");
        }
        const data = await fetchJson<OpenMeteoResponse>(
          `https://api.open-meteo.com/v1/forecast?${params}`,
          { timeoutMs: 7000 }
        );
        const d = data.daily;
        if (!d) return [];
        return d.time.map((date, i) => {
          const code = d.weather_code[i];
          const precip = d.precipitation_sum[i];
          return {
            date,
            tempMaxC: Math.round(d.temperature_2m_max[i]),
            tempMinC: Math.round(d.temperature_2m_min[i]),
            precipitationMm: precip,
            weatherCode: code,
            summary: weatherSummary(code),
            rainRisk:
              precip >= 2 || [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code),
            windKmh: d.wind_speed_10m_max
              ? Math.round(d.wind_speed_10m_max[i])
              : undefined,
            sunsetTime: d.sunset?.[i] ? d.sunset[i].slice(-5) : undefined,
          };
        });
      },
      (v) => v.length === 0
    );
  } catch {
    return [];
  }
}

function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** WMO weather code → friendly summary. */
export function weatherSummary(code: number): string {
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Mostly sunny";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55].includes(code)) return "Light drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Mixed conditions";
}

/** WMO weather code → emoji, for the native UI. */
export function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌦️";
}

/** WMO weather code → Lucide icon name (premium, consistent with the rest). */
export function weatherIcon(code: number): string {
  if (code === 0) return "sun";
  if ([1, 2].includes(code)) return "cloud-sun";
  if (code === 3) return "cloud";
  if ([45, 48].includes(code)) return "cloud-fog";
  if ([51, 53, 55].includes(code)) return "cloud-drizzle";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "cloud-rain";
  if ([71, 73, 75, 77].includes(code)) return "snowflake";
  if ([95, 96, 99].includes(code)) return "cloud-lightning";
  return "cloud-rain";
}
