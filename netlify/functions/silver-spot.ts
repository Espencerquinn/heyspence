/**
 * Silver spot price proxy.
 *
 * Yahoo Finance publishes silver futures (symbol `SI=F`) at
 *   https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=5d
 *
 * It's the standard public proxy for the silver spot price (the futures
 * and spot trade within fractions of a percent of each other for the
 * front-month contract). No API key required.
 *
 * Browsers can't fetch Yahoo directly because the response has no CORS
 * header. This function does it server-side and returns a CORS-friendly
 * JSON envelope. Cached for 10 minutes so we don't hammer Yahoo on every
 * page interaction.
 *
 * Uses Netlify Functions v2 (default-export, standard Request/Response).
 * No npm deps required.
 */

const YAHOO_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=5d'

interface CacheEntry {
  body: string
  fetchedAt: number
}
let cache: CacheEntry | null = null
const TEN_MINUTES_MS = 10 * 60 * 1000

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=600',
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (cache && Date.now() - cache.fetchedAt < TEN_MINUTES_MS) {
    return new Response(cache.body, {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    })
  }

  try {
    const res = await fetch(YAHOO_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
        Accept: 'application/json',
      },
    })
    if (!res.ok) return errorResponse(`yahoo_status_${res.status}`)
    const data = (await res.json()) as unknown
    const price = pickRegularMarketPrice(data)
    if (price == null) return errorResponse('no_price_in_payload')

    const payload = {
      pricePerOz: price,
      fetchedAt: new Date().toISOString(),
      source: 'Yahoo Finance · SI=F (silver futures)',
    }
    const body = JSON.stringify(payload)
    cache = { body, fetchedAt: Date.now() }
    return new Response(body, {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    })
  } catch (err) {
    return errorResponse(`fetch_failed: ${String(err).slice(0, 120)}`)
  }
}

function pickRegularMarketPrice(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const root = payload as Record<string, unknown>
  const chart = root.chart as Record<string, unknown> | undefined
  const result = chart?.result as unknown[] | undefined
  const first = result?.[0] as Record<string, unknown> | undefined
  const meta = first?.meta as Record<string, unknown> | undefined
  const v = meta?.regularMarketPrice
  return typeof v === 'number' && isFinite(v) ? v : null
}

function errorResponse(reason: string): Response {
  return new Response(JSON.stringify({ ok: false, reason }), {
    status: 502,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
