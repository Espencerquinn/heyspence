import { DOMAIN_COLOR, DOMAIN_OF, STAT_KEYS, type StatKey } from '../types';
import { statProgress } from '../system/stats';
import { useSystem } from '../state/SystemContext';
import { daysBetween } from '../system/dates';

const SEGMENTS = 20;

/** Days since the most recent EXP event in this stat's domain, or null. */
function idleDays(stat: StatKey, events: { domain: string | null; occurred_on: string }[], today: string) {
  const domain = DOMAIN_OF[stat];
  const dates = events.filter((e) => e.domain === domain).map((e) => e.occurred_on).sort();
  const last = dates.at(-1);
  return last ? daysBetween(last, today) : null;
}

export function StatBlock() {
  const { player, snapshot, today } = useSystem();

  return (
    <div className="stats">
      <div className="stats__label">[ STATS ]</div>
      {STAT_KEYS.map((key) => {
        const level = player.statLevels[key];
        const color = DOMAIN_COLOR[DOMAIN_OF[key]];
        const idle = idleDays(key, snapshot.events, today);
        const neglected = idle === null || idle >= 7;
        const { pct } = statProgress(player.domainXp[DOMAIN_OF[key]]);

        return (
          <div className="stat" key={key} style={{ ['--k' as string]: color }} data-stat={key}>
            <span className="stat__key">{key}</span>
            <span className="stat__val">{level}</span>
            <span className="segs" title={`${Math.round(pct)}% to ${level + 1}`}>
              {Array.from({ length: SEGMENTS }, (_, i) => (
                <i key={i} className={`seg ${i < Math.min(level, SEGMENTS) ? 'on' : ''}`} />
              ))}
            </span>
            {neglected && (
              <span className="stat__note">
                NEGLECTED{idle !== null ? ` · ${idle} DAYS` : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
