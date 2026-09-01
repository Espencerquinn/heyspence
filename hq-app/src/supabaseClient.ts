import { createClient } from '@supabase/supabase-js';

// db.schema pins every query to `hq`, so data modules call .from('habits')
// rather than repeating the schema. Requires "hq" in config.toml api.schemas.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { db: { schema: 'hq' } },
);
