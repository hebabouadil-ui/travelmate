/**
 * Image Validator — the single gate every photo URL passes before it is allowed
 * onto a card. Broken images were a top complaint; the rules here are exactly
 * the spec's: HTTPS only, the resource must really exist (HTTP 2xx), and it must
 * be an actual image (a real `image/*` content-type — not an HTML error page or
 * a redirect to a login wall). A URL that fails is never stored; the resolver
 * moves to the next provider, and if none pass the UI shows a clean local
 * placeholder. Results are memoised so a given URL is probed at most once.
 */

/** Force HTTPS — Android blocks cleartext HTTP by default, which silently turns
 *  any `http://` photo into a broken image. Protocol-relative URLs are upgraded
 *  too. This is applied everywhere a URL enters the app, belt-and-suspenders
 *  with the render-time onError fallback in `SmartImage`. */
export function toHttps(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice("http://".length)}`;
  return trimmed;
}

const cache = new Map<string, boolean>();
const DEFAULT_TIMEOUT = 3500;

function looksLikeImage(contentType: string | null): boolean {
  if (!contentType) return false;
  return /^image\//i.test(contentType.trim());
}

async function probe(url: string, method: "HEAD" | "GET", timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      // Range keeps a GET cheap — we only need the headers / first bytes to
      // confirm it's a live image, not the whole file.
      headers: method === "GET" ? { Range: "bytes=0-1023" } : undefined,
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const ok = looksLikeImage(res.headers.get("content-type"));
    // Drain/cancel the body so a GET doesn't keep the socket open.
    try {
      await res.body?.cancel?.();
    } catch {
      /* ignore */
    }
    return ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * True when `url` is an HTTPS resource that exists and is really an image.
 * Tries HEAD first (cheapest); some image CDNs reject HEAD, so it falls back to
 * a tiny ranged GET before giving up. Memoised per URL.
 */
export async function isDisplayableImage(url?: string, timeoutMs = DEFAULT_TIMEOUT): Promise<boolean> {
  const https = toHttps(url);
  if (!https || !https.startsWith("https://")) return false;
  const cached = cache.get(https);
  if (cached !== undefined) return cached;

  let ok = await probe(https, "HEAD", timeoutMs);
  if (!ok) ok = await probe(https, "GET", timeoutMs);
  cache.set(https, ok);
  return ok;
}

/**
 * Return the first URL from `candidates` (in priority order) that is a real,
 * displayable HTTPS image, or `undefined` if none qualify (→ placeholder).
 * Falsy candidates are skipped, so callers can pass `[maybeA, maybeB]` freely.
 */
export async function firstDisplayableImage(
  candidates: (string | undefined)[],
  timeoutMs = DEFAULT_TIMEOUT
): Promise<string | undefined> {
  for (const c of candidates) {
    const https = toHttps(c);
    if (!https) continue;
    if (await isDisplayableImage(https, timeoutMs)) return https;
  }
  return undefined;
}
