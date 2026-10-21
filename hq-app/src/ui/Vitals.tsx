import { Frame } from './Frame';
import { useSystem } from '../state/SystemContext';
import { addDays } from '../system/dates';

const fmt = (v: number | undefined, digits = 0) =>
  v === undefined ? '—' : v.toLocaleString(undefined, { maximumFractionDigits: digits });

/** Latest synced value of a metric on or before `date`, looking back `days`. */
export function latest(health: { metric_date: string; metric: string; value: number }[],
                       metric: string, date: string, days = 14): number | undefined {
  const since = addDays(date, -days);
  const rows = health.filter((h) => h.metric === metric && h.metric_date <= date && h.metric_date >= since);
  rows.sort((a, b) => (a.metric_date < b.metric_date ? 1 : -1));
  return rows[0] ? Number(rows[0].value) : undefined;
}

/** Apple Watch numbers synced via Health Auto Export. */
export function Vitals() {
  const { snapshot, today } = useSystem();
  const h = snapshot.health;
  const on = (metric: string, d = today) => {
    const r = h.find((x) => x.metric === metric && x.metric_date === d);
    return r ? Number(r.value) : undefined;
  };
  const lastSync = h.reduce<string | null>((m, r) => (!m || r.updated_at > m ? r.updated_at : m), null);

  if (h.length === 0) {
    return (
      <Frame title="Vitals" meta="NOT CONNECTED">
        <p className="quest__empty">
          Apple Watch data has not synced yet. Set up Health Auto Export — see the Train page.
        </p>
      </Frame>
    );
  }

  const cells: Array<[string, string]> = [
    ['STEPS', fmt(on('steps'))],
    ['ACTIVE KCAL', fmt(on('active_kcal'))],
    ['SLEEP', on('sleep_hours') !== undefined ? `${fmt(on('sleep_hours'), 1)} h` : '—'],
    ['RESTING HR', fmt(latest(h, 'resting_hr', today, 3))],
    ['HRV', fmt(latest(h, 'hrv_ms', today, 3))],
    ['WEIGHT', latest(h, 'weight_lb', today) !== undefined ? `${fmt(latest(h, 'weight_lb', today), 1)} lb` : '—'],
  ];

  return (
    <Frame title="Vitals"
           meta={lastSync ? `SYNCED ${new Date(lastSync).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}>
      <div className="vitals">
        {cells.map(([k, v]) => (
          <div className="vital" key={k}><small>{k}</small><span>{v}</span></div>
        ))}
      </div>
    </Frame>
  );
}
