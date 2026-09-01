import { useEffect } from 'react';
import { useNotices } from '../state/useNotifications';

export function NotificationHost() {
  const { current, dismiss } = useNotices();

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, dismiss]);

  if (!current) return null;
  const tone = current.tone === 'penalty' ? 'var(--penalty)' : 'var(--system)';

  return (
    <div className="notif" role="dialog" aria-modal="true" aria-label={current.kind}
         style={{ ['--nc' as string]: tone }}>
      <div className="notif__scrim" onClick={dismiss} />
      <div className="notif__stage">
        <div className="notif__rail notif__rail--top" />
        <div className="notif__panel">
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          <div className="notif__head">
            <span className="notif__bang" aria-hidden="true">!</span>
            <span className="notif__kind">{current.kind}</span>
            <button className="notif__x" onClick={dismiss} aria-label="Dismiss">✕</button>
          </div>
          <div className="notif__body">
            {current.huge && <p className="notif__huge">{current.huge}</p>}
            {current.lead && <p className="notif__lead">{current.lead}</p>}
            {current.deltas && current.deltas.length > 0 && (
              <div className="notif__deltas">
                {current.deltas.map((d, i) => (
                  <span key={i} className="delta"
                        style={{ ['--k' as string]: d.color ?? tone }}>{d.text}</span>
                ))}
              </div>
            )}
            {current.fine && <p className="notif__fine">{current.fine}</p>}
          </div>
        </div>
        <div className="notif__rail notif__rail--bot" />
      </div>
    </div>
  );
}
