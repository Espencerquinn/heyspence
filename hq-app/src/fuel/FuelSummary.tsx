import { Frame } from '../ui/Frame';
import { MacroBars } from './MacroBars';
import { useFoodDay } from './useFoodDay';
import { navigate } from '../router';
import { macroTotals } from '../system/training';
import { useSystem } from '../state/SystemContext';

/** Today's calories and protein on STATUS; the full log lives on Fuel. */
export function FuelSummary() {
  const { today } = useSystem();
  const { entries, targets } = useFoodDay(today);
  return (
    <Frame title="Fuel" meta={<button type="button" className="linkish" onClick={() => navigate('fuel')}>
      LOG FOOD ›
    </button>}>
      {entries && targets
        ? <MacroBars totals={macroTotals(entries)} targets={targets} compact />
        : <p className="quest__empty">Loading…</p>}
    </Frame>
  );
}
