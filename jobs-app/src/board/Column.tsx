import { useDroppable } from '@dnd-kit/core';
import type { Application } from '../types';
import { ApplicationCard } from './ApplicationCard';

export function Column(
  { id, title, apps, onOpen }:
  { id: string; title: string; apps: Application[]; onOpen: (a: Application) => void },
) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`column${isOver ? ' column--over' : ''}`}>
      <h2 className="column__title">{title} <span>{apps.length}</span></h2>
      <div className="column__cards">
        {apps.map((a) => <ApplicationCard key={a.id} app={a} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
