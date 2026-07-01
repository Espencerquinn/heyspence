import { useDraggable } from '@dnd-kit/core';
import { isQueuedForDrafting, type Application } from '../types';

export function ApplicationCard(
  { app, onOpen }: { app: Application; onOpen: (a: Application) => void },
) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: app.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  const queued = isQueuedForDrafting(app);

  return (
    <div ref={setNodeRef} style={style}
         className="lead-card"
         {...listeners} {...attributes} onClick={() => onOpen(app)}>
      <div className="lead-card__name">{app.role_title}</div>
      <div className="lead-card__meta">
        {app.location || '—'}{app.team ? ` · ${app.team}` : ''}
      </div>
      <div className="lead-card__tags">
        {typeof app.fit_score === 'number' && (
          <span className="fit-pill" data-tier={app.fit_score >= 75 ? 'high' : app.fit_score >= 60 ? 'mid' : 'low'}>
            Fit {app.fit_score}
          </span>
        )}
        {queued && <span className="queued-pill">Queued for drafting</span>}
        {app.source === 'manual' && <span className="src-pill">Added by you</span>}
      </div>
      <div className="lead-card__time">
        {new Date(app.updated_at).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
      </div>
    </div>
  );
}
