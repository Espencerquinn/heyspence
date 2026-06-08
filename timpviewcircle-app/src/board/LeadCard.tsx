import { useDraggable } from '@dnd-kit/core';
import type { Lead } from '../types';

export function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} className="lead-card" {...listeners} {...attributes}
         onClick={() => onOpen(lead)}>
      <div className="lead-card__name">{lead.name}</div>
      <div className="lead-card__meta">{lead.interest}</div>
      <div className="lead-card__time">
        {new Date(lead.updated_at).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
      </div>
    </div>
  );
}
