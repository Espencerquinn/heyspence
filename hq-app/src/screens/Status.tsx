import { PlayerCard } from '../ui/PlayerCard';
import { DailyQuest } from '../ui/DailyQuest';
import { FocusTasks } from '../ui/FocusTasks';
import { JournalCapture } from '../ui/JournalCapture';

export function Status() {
  return (
    <>
      <PlayerCard />
      <div className="status__col">
        <DailyQuest />
        <FocusTasks />
        <JournalCapture />
      </div>
    </>
  );
}
