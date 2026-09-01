import { describe, expect, it } from 'vitest';
import { fetchAllPages } from './fetchAll';

describe('fetchAllPages', () => {
  it('follows a full page with a short page and stops', async () => {
    const calls: Array<[number, number]> = [];
    const full = Array.from({ length: 1000 }, (_, i) => i);
    const short = [1000, 1001, 1002];

    const rows = await fetchAllPages<number>((from, to) => {
      calls.push([from, to]);
      const page = from === 0 ? full : short;
      return Promise.resolve({ data: page, error: null });
    });

    expect(rows).toEqual([...full, ...short]);
    expect(calls).toEqual([[0, 999], [1000, 1999]]);
  });

  it('returns an empty array and makes one call when the first page is empty', async () => {
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllPages<number>((from, to) => {
      calls.push([from, to]);
      return Promise.resolve({ data: [], error: null });
    });
    expect(rows).toEqual([]);
    expect(calls).toEqual([[0, 999]]);
  });

  it('throws on error and stops paging', async () => {
    let calls = 0;
    await expect(
      fetchAllPages<number>(() => {
        calls += 1;
        return Promise.resolve({ data: null, error: { message: 'boom' } });
      }),
    ).rejects.toEqual({ message: 'boom' });
    expect(calls).toBe(1);
  });

  it('treats a null data page as empty rows, not an error', async () => {
    const rows = await fetchAllPages<number>(() => Promise.resolve({ data: null, error: null }));
    expect(rows).toEqual([]);
  });
});
