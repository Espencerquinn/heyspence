import { useEffect, useRef } from 'react';
import { useNotices } from '../state/useNotifications';

const FOCUSABLE = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function NotificationHost() {
  const { current, dismiss } = useNotices();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!current) return;

    // Move focus into the panel (mirrors the mockup's wrap.querySelector('.notif__x').focus()),
    // and remember what had focus so it can be restored once the queue drains.
    prevFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { dismiss(); return; }
      if (e.key !== 'Tab') return;

      // Trap Tab inside the panel — a keyboard user must not be able to tab
      // past the overlay into content the scrim only visually hides.
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeInPanel = panel.contains(document.activeElement);

      if (e.shiftKey) {
        if (!activeInPanel || document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (!activeInPanel || document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prevFocusRef.current?.focus();
    };
  }, [current, dismiss]);

  if (!current) return null;
  const tone = current.tone === 'penalty' ? 'var(--penalty)' : 'var(--system)';

  return (
    <div className="notif" role="dialog" aria-modal="true" aria-label={current.kind}
         style={{ ['--nc' as string]: tone }}>
      <div className="notif__scrim" onClick={dismiss} />
      <div className="notif__stage">
        <div className="notif__rail notif__rail--top" />
        <div className="notif__panel" ref={panelRef}>
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          <div className="notif__head">
            <span className="notif__bang" aria-hidden="true">!</span>
            <span className="notif__kind">{current.kind}</span>
            <button className="notif__x" ref={closeRef} onClick={dismiss} aria-label="Dismiss">✕</button>
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
