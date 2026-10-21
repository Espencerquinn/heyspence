// hq-food — nutrition lookups for the Fuel screen. Signed-in owner only.
//
//   GET  ?barcode=0123456789012   Open Food Facts product → one candidate
//   GET  ?q=greek+yogurt          USDA FoodData Central search → candidates
//   POST { describe: "2 eggs, toast with butter" }   Claude estimate → candidates
//
// Every candidate is macros PER SERVING plus a serving label, the same shape
// the client stores in hq.food_entries.
//
// Secrets: USDA_API_KEY (optional; DEMO_KEY otherwise — 30 req/hr),
//          ANTHROPIC_API_KEY (optional; estimate returns 501 without it).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod';
import { z } from 'npm:zod';

const OWNER = 'espencer.quinn@gmail.com';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

interface Candidate {
  name: string; serving_label: string;
  kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null;
  source: 'off' | 'usda' | 'ai'; source_ref: string | null;
}

const r1 = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
};

/* ---------- Open Food Facts (barcode) ---------- */

async function byBarcode(code: string): Promise<Candidate[]> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json` +
      '?fields=product_name,brands,serving_size,nutriments',
    { headers: { 'user-agent': 'HQ-heyspence/1.0 (espencer.quinn@gmail.com)' } },
  );
  if (!res.ok) return [];
  const body = await res.json();
  const p = body.product;
  if (!p) return [];
  const n = p.nutriments ?? {};
  const perServing = n['energy-kcal_serving'] !== undefined;
  const k = (base: string) => n[`${base}_${perServing ? 'serving' : '100g'}`];
  const name = [p.brands?.split(',')[0], p.product_name].filter(Boolean).join(' — ') || `Barcode ${code}`;
  return [{
    name,
    serving_label: perServing ? (p.serving_size ?? '1 serving') : '100 g',
    kcal: r1(k('energy-kcal')), protein_g: r1(k('proteins')),
    carbs_g: r1(k('carbohydrates')), fat_g: r1(k('fat')),
    fiber_g: k('fiber') === undefined ? null : r1(k('fiber')),
    source: 'off', source_ref: code,
  }];
}

/* ---------- USDA FoodData Central (text search) ---------- */

// Nutrient numbers: 208 energy kcal, 203 protein, 205 carbs, 204 fat, 291 fiber.
async function search(q: string): Promise<Candidate[]> {
  const key = Deno.env.get('USDA_API_KEY') || 'DEMO_KEY';
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: q, pageSize: 12,
      dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
    }),
  });
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const body = await res.json();
  return (body.foods ?? []).map((f: Record<string, unknown>) => {
    const nut = new Map<string, number>();
    for (const x of (f.foodNutrients as Array<Record<string, unknown>>) ?? []) {
      nut.set(String(x.nutrientNumber), Number(x.value));
    }
    // Branded foods carry label values per serving; everything else is per 100 g.
    const label = f.labelNutrients as Record<string, { value: number }> | undefined;
    const branded = f.dataType === 'Branded' && label && f.servingSize;
    const brand = (f.brandName ?? f.brandOwner) as string | undefined;
    const desc = String(f.description ?? '').toLowerCase().replace(/(^|[\s,(])\w/g, (c) => c.toUpperCase());
    return branded
      ? {
          name: brand ? `${brand} — ${desc}` : desc,
          serving_label: `${f.servingSize} ${String(f.servingSizeUnit ?? '').toLowerCase()}`.trim(),
          kcal: r1(label.calories?.value), protein_g: r1(label.protein?.value),
          carbs_g: r1(label.carbohydrates?.value), fat_g: r1(label.fat?.value),
          fiber_g: label.fiber ? r1(label.fiber.value) : null,
          source: 'usda' as const, source_ref: String(f.fdcId),
        }
      : {
          name: desc, serving_label: '100 g',
          kcal: r1(nut.get('208')), protein_g: r1(nut.get('203')),
          carbs_g: r1(nut.get('205')), fat_g: r1(nut.get('204')),
          fiber_g: nut.has('291') ? r1(nut.get('291')) : null,
          source: 'usda' as const, source_ref: String(f.fdcId),
        };
  });
}

/* ---------- Claude estimate (free-text meal) ---------- */

const Estimate = z.object({
  items: z.array(z.object({
    name: z.string(),
    serving_label: z.string(),
    kcal: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
    fiber_g: z.number(),
  })),
});

async function estimate(describe: string): Promise<Candidate[]> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY from the function's secrets
  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    output_config: { effort: 'low', format: zodOutputFormat(Estimate) },
    system:
      'You estimate nutrition for a food log. Split the description into separate foods. ' +
      'For each, give the portion as described (or a typical one if unstated) as serving_label, ' +
      'and macros for that whole portion, using USDA reference values where you know them. ' +
      'Round kcal to whole numbers and grams to one decimal.',
    messages: [{ role: 'user', content: describe }],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) return [];
  return response.parsed_output.items.map((i) => ({
    name: i.name, serving_label: i.serving_label,
    kcal: r1(i.kcal), protein_g: r1(i.protein_g), carbs_g: r1(i.carbs_g),
    fat_g: r1(i.fat_g), fiber_g: r1(i.fiber_g), source: 'ai' as const, source_ref: null,
  }));
}

/* ---------- handler ---------- */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // The platform has already verified the JWT; make sure it is the owner's.
  const auth = req.headers.get('authorization') ?? '';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { authorization: auth } }, auth: { persistSession: false },
  });
  const { data: { user } } = await db.auth.getUser();
  if (user?.email !== OWNER) return json({ error: 'not authorized' }, 403);

  try {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.searchParams.get('barcode')) {
      return json({ candidates: await byBarcode(url.searchParams.get('barcode')!.replace(/\D/g, '')) });
    }
    if (req.method === 'GET' && url.searchParams.get('q')) {
      return json({ candidates: await search(url.searchParams.get('q')!.slice(0, 120)) });
    }
    if (req.method === 'POST') {
      if (!Deno.env.get('ANTHROPIC_API_KEY')) {
        return json({ error: 'AI estimate is not enabled (ANTHROPIC_API_KEY not set).' }, 501);
      }
      const { describe } = await req.json();
      if (typeof describe !== 'string' || !describe.trim()) return json({ error: 'describe required' }, 400);
      return json({ candidates: await estimate(describe.slice(0, 1000)) });
    }
    return json({ error: 'pass ?barcode=, ?q=, or POST { describe }' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
