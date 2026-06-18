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
        "User-Agent": `VoyageAI/1.0 (${
          process.env.OSM_CONTACT_EMAIL || "contact@voyage.ai"
        })`,
        Accept: "application/json",
        ...(init.headers || {}),
      },
      // Cache responses on the edge for a day where possible.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
