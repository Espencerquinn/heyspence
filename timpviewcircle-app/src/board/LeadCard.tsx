import { useDraggable } from '@dnd-kit/core';
import type { Lead } from '../types';

export function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  const isOffer = lead.kind === 'offer';
  const od = lead.offer_details;

  return (
    <div ref={setNodeRef} style={style}
         className={`lead-card${isOffer ? ' lead-card--offer' : ''}`}
         {...listeners} {...attributes} onClick={() => onOpen(lead)}>
      {isOffer && (
        <div className="lead-card__offer-tag">🔴 OFFER · {lead.interest}</div>
      )}
      <div className="lead-card__name">{lead.name}</div>
      {isOffer ? (
        <div className="lead-card__meta">{od?.amount || '—'}{od?.financing ? ` · ${od.financing}` : ''}</div>
      ) : (
        <div className="lead-card__meta">{lead.interest}</div>
      )}
      <div className="lead-card__time">
        {new Date(lead.updated_at).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
      </div>
    </div>
  );
}
