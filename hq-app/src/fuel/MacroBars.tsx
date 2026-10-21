import { macroProgress, type MacroTotals } from '../system/training';
import type { MacroTargets } from '../types';

const ROWS: Array<{ key: keyof MacroTargets; label: string; unit: string; color: string }> = [
  { key: 'kcal', label: 'CALORIES', unit: '', color: 'var(--for)' },
  { key: 'protein_g', label: 'PROTEIN', unit: 'g', color: 'var(--cha)' },
  { key: 'carbs_g', label: 'CARBS', unit: 'g', color: 'var(--int)' },
  { key: 'fat_g', label: 'FAT', unit: 'g', color: 'var(--sense)' },
  { key: 'fiber_g', label: 'FIBER', unit: 'g', color: 'var(--wis)' },
];

export function MacroBars(props: { totals: MacroTotals; targets: MacroTargets; compact?: boolean }) {
  const { totals, targets, compact } = props;
  const pct = macroProgress(totals, targets);
  const rows = compact ? ROWS.slice(0, 2) : ROWS;
  return (
    <div className="macros">
      {rows.map((r) => {
        const over = pct[r.key] > 1;
        return (
          <div className="macro" key={r.key} style={{ ['--k' as string]: r.color }}>
            <div className="macro__head">
              <span>{r.label}</span>
              <b className={over ? 'macro__over' : ''}>
                [{Math.round(totals[r.key]).toLocaleString()}/{targets[r.key].toLocaleString()}{r.unit}]
              </b>
            </div>
            <div className="macro__bar"><i style={{ width: `${Math.min(100, pct[r.key] * 100)}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}
