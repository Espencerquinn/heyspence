/**
 * Repairs checklist — shared state store.
 *
 * Persists the home-sale repair checklist so it syncs across devices
 * (no login, per the owner's request). State is a single JSON blob:
 *
 *   { version, checked: { [itemId]: true }, custom: [{ id, label }], updatedAt }
 *
 *   GET  -> returns the current state (or an empty default)
 *   PUT  -> replaces the state with the posted body, returns what was stored
 *   POST -> alias for PUT
 *
 * Storage is Netlify Blobs (auto-provisioned per site) — completely
 * isolated from the heyspence Supabase project. Single writer in
 * practice (the owner), so last-write-wins is fine.
 *
 * Netlify Functions v2 (default export, standard Request/Response).
 */
import { getStore } from '@netlify/blobs'

const STORE = 'repairs'
const KEY = 'checklist-state'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const EMPTY = { version: 1, checked: {}, custom: [], updatedAt: null }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  })
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })

  const store = getStore(STORE)

  if (req.method === 'GET') {
    const data = await store.get(KEY, { type: 'json' })
    return json(data ?? EMPTY)
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let incoming: any
    try {
      incoming = await req.json()
    } catch {
      return json({ error: 'Body must be valid JSON.' }, 400)
    }

    // Sanitize into the known shape so a bad client can't store junk.
    const checked: Record<string, boolean> = {}
    if (incoming && typeof incoming.checked === 'object' && incoming.checked) {
      for (const [k, v] of Object.entries(incoming.checked)) {
        if (v === true) checked[String(k)] = true
      }
    }
    const custom: Array<{ id: string; label: string }> = []
    if (Array.isArray(incoming?.custom)) {
      for (const c of incoming.custom) {
        if (c && typeof c.id === 'string' && typeof c.label === 'string') {
          const label = c.label.trim().slice(0, 200)
          if (label) custom.push({ id: c.id, label })
        }
      }
    }

    const next = { version: 1, checked, custom, updatedAt: new Date().toISOString() }
    await store.setJSON(KEY, next)
    return json(next)
  }

  return json({ error: 'Method not allowed.' }, 405)
}
