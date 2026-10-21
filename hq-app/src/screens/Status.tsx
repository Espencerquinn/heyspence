import { PlayerCard } from '../ui/PlayerCard';
import { DailyQuest } from '../ui/DailyQuest';
import { FocusTasks } from '../ui/FocusTasks';
import { JournalCapture } from '../ui/JournalCapture';
import { MorningProtocol } from '../ui/MorningProtocol';
import { TodayTraining } from '../ui/TodayTraining';
import { Vitals } from '../ui/Vitals';
import { FuelSummary } from '../fuel/FuelSummary';

export function Status() {
  return (
    <>
      <div className="status__side">
        <PlayerCard />
        <Vitals />
        <FuelSummary />
      </div>
      {/* On a phone this column comes first: the morning checklist before the stat sheet. */}
      <div className="status__col">
        <MorningProtocol />
        <TodayTraining />
        <DailyQuest />
        <FocusTasks />
        <JournalCapture />
      </div>
    </>
  );
}
