/**
 * Live silver spot price via the Netlify function. The function proxies
 * Yahoo Finance's SI=F (silver futures) — the standard public proxy for
 * the silver spot price.
 *
 * On failure (function 500, network error, etc.) we return null and
 * the UI falls back to the user's manually-entered spot.
 */
export interface SilverSpot {
  pricePerOz: number     // USD per troy ounce
  fetchedAt: string      // ISO timestamp the function returned
  source: string         // human-readable source
}

const FUNCTION_URL = '/.netlify/functions/silver-spot'

export async function fetchSilverSpot(signal?: AbortSignal): Promise<SilverSpot | null> {
  try {
    const res = await fetch(FUNCTION_URL, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<SilverSpot>
    if (typeof data.pricePerOz !== 'number' || !isFinite(data.pricePerOz)) return null
    return {
      pricePerOz: data.pricePerOz,
      fetchedAt: data.fetchedAt ?? new Date().toISOString(),
      source: data.source ?? 'Yahoo Finance (SI=F)',
    }
  } catch {
    return null
  }
}
