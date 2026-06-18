import { ENV } from "../env";

/** Small fetch helper with timeout + polite User-Agent for OSM services. */
export async function fetchJson<T>(
  url: string,
  opts: { timeoutMs?: number; init?: RequestInit } = {}
): Promise<T> {
  const { timeoutMs = 9000, init = {} } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": `VoyageAI-Mobile/1.0 (${ENV.osmContactEmail})`,
        Accept: "application/json",
        ...(init.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
