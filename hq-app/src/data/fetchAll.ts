const PAGE = 1000;

/**
 * PostgREST caps a response at `max_rows` (1000 on this project) and gives no
 * signal that it truncated. Every derived number in HQ — level, stats, streaks,
 * penalties — is computed from these rows, so a silent truncation corrupts the
 * game's history. Always page.
 *
 * Every `page` callback passed here MUST supply a total order (a sort column
 * plus a unique tiebreak, e.g. `.order('col').order('id')`). Postgres makes
 * no ordering guarantee across separate `.range()` queries without one, so an
 * unordered or non-uniquely-ordered paginated select can duplicate or drop
 * rows across page boundaries — silently, and worse than not paginating at all.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}
