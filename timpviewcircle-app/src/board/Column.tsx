import { useDroppable } from '@dnd-kit/core';
import type { Lead } from '../types';
import { LeadCard } from './LeadCard';

export function Column(
  { id, title, leads, onOpen, offers = false }:
  { id: string; title: string; leads: Lead[]; onOpen: (l: Lead) => void; offers?: boolean },
) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef}
         className={`column${offers ? ' column--offers' : ''}${isOver ? ' column--over' : ''}`}>
      <h2 className="column__title">{offers ? '💰 Offers' : title} <span>{leads.length}</span></h2>
      <div className="column__cards">
        {leads.map((l) => <LeadCard key={l.id} lead={l} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
