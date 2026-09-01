import { Frame } from './Frame';
import { StatBlock } from './StatBlock';
import { XpBar } from './XpBar';
import { useSystem } from '../state/SystemContext';
import { nextRankAt } from '../system/levels';
import { TITLE_DEFS } from '../system/titles';

export function PlayerCard() {
  const { player, snapshot } = useSystem();
  const latest = [...snapshot.titles].sort((a, b) =>
    a.unlocked_at < b.unlocked_at ? 1 : -1)[0];
  const title = latest ? TITLE_DEFS.find((t) => t.code === latest.code) : undefined;
  const promo = nextRankAt(player.level);

  return (
    <Frame title="Status" meta={promo ? `RANK ${promo.rank} AT LV.${promo.level}` : 'MAX RANK'}>
      <div className="player__id">
        <h1 className="player__name">Spencer Quinn</h1>
        <p className="player__title">
          TITLE · <b>{title ? title.name.toUpperCase() : 'UNRANKED'}</b>
        </p>
        <div className="lv">
          <div className="lv__num"><small>LEVEL</small><span>{player.level}</span></div>
          <div className="rank"><small>RANK</small><span>{player.rank}</span></div>
        </div>
      </div>

      <XpBar into={player.into} need={player.need} pct={player.pct} />
      <StatBlock />

      <div className="streak">
        <span>CURRENT STREAK</span>
        <span><b>{player.questStreak}</b> DAYS</span>
      </div>
    </Frame>
  );
}
