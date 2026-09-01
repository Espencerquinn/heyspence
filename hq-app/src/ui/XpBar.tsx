export function XpBar({ into, need, pct }: { into: number; need: number; pct: number }) {
  return (
    <div className="xp">
      <div className="xp__row">
        <span>EXP</span>
        <span><b>{into}</b> / {need}</span>
      </div>
      <div className="xp__track">
        <div className="xp__fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
