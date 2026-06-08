import { useEffect, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { STATUSES, type Lead, type Status } from '../types';
import { fetchLeads, updateLeadStatus } from '../data/leads';
import { Column } from './Column';
import { LeadDetail } from './LeadDetail';
import { supabase } from '../supabaseClient';

export function Board() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState<Lead | null>(null);

  async function load() { setLeads(await fetchLeads()); }
  useEffect(() => { load(); }, []);

  async function onDragEnd(e: DragEndEvent) {
    const leadId = String(e.active.id);
    const newStatus = e.over?.id as Status | undefined;
    if (!newStatus) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    // optimistic update
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
    try { await updateLeadStatus(leadId, newStatus); }
    catch { load(); } // revert from source of truth on failure
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Timpview Circle — Leads</h1>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <DndContext onDragEnd={onDragEnd}>
        <div className="board">
          {STATUSES.map((s) => (
            <Column key={s} status={s} leads={leads.filter((l) => l.status === s)} onOpen={setOpen} />
          ))}
        </div>
      </DndContext>
      {open && <LeadDetail lead={open} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}
