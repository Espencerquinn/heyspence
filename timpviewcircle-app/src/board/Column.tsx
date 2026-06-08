import { useDroppable } from '@dnd-kit/core';
import type { Lead, Status } from '../types';
import { LeadCard } from './LeadCard';

export function Column(
  { status, leads, onOpen }: { status: Status; leads: Lead[]; onOpen: (l: Lead) => void },
) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`column${isOver ? ' column--over' : ''}`}>
      <h2 className="column__title">{status} <span>{leads.length}</span></h2>
      <div className="column__cards">
        {leads.map((l) => <LeadCard key={l.id} lead={l} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
