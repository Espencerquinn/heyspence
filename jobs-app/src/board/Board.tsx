import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { STATUSES, type Application, type Status } from '../types';
import { fetchApplications, updateApplicationStatus, insertManualApplication } from '../data/applications';
import { Column } from './Column';
import { ApplicationDetail } from './ApplicationDetail';
import { supabase } from '../supabaseClient';
import { DEMO } from '../demo';

export function Board() {
  const [apps, setApps] = useState<Application[]>([]);
  const [open, setOpen] = useState<Application | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);

  // Require an 8px drag before dragging starts, so a plain click on a card
  // fires onClick (opens the drawer) instead of being captured as a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function load() {
    setRefreshing(true);
    try { setApps(await fetchApplications()); }
    finally { setRefreshing(false); }
  }
  useEffect(() => { load(); }, []);

  // Live updates: reload when applications or notes change anywhere (debounced).
  useEffect(() => {
    if (DEMO) return;  // no realtime backend in preview mode
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => { clearTimeout(timer); timer = setTimeout(load, 400); };
    const channel = supabase
      .channel('jobs-board-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'application_notes' }, bump)
      .subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, []);

  async function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : undefined;
    if (!target || !STATUSES.includes(target as Status)) return;
    const newStatus = target as Status;
    const app = apps.find((a) => a.id === id);
    if (!app || app.status === newStatus) return;
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a)); // optimistic
    try { await updateApplicationStatus(id, newStatus); }
    catch { load(); }
  }

  async function addJob() {
    const url = newUrl.trim();
    if (!url) return;
    setAdding(true);
    try { await insertManualApplication(url); setNewUrl(''); await load(); }
    catch (err) { alert(`Couldn't add job: ${(err as Error).message}`); }
    finally { setAdding(false); }
  }

  const inColumn = (s: Status) => apps.filter((a) => a.status === s);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span>Job Hunt</span>
        </div>
        <div className="topbar__actions">
          <input
            className="addjob__input"
            type="url"
            placeholder="Paste a job URL to track…"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addJob()}
          />
          <button className="btn btn--primary" disabled={adding || !newUrl.trim()} onClick={addJob}>
            {adding ? 'Adding…' : '+ Add job'}
          </button>
          <button className="topbar__signout" onClick={load} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button className="topbar__signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="board">
          {STATUSES.map((s) => (
            <Column key={s} id={s} title={s} apps={inColumn(s)} onOpen={setOpen} />
          ))}
        </div>
      </DndContext>
      {open && <ApplicationDetail app={open} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}
