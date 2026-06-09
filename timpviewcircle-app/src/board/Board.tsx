import { useEffect, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { STATUSES, isActiveOffer, type Lead, type Status } from '../types';
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
    const target = e.over?.id ? String(e.over.id) : undefined;
    // The Offers lane isn't a status — dropping there does nothing.
    if (!target || target === 'Offers' || !STATUSES.includes(target as Status)) return;
    const newStatus = target as Status;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l)); // optimistic
    try { await updateLeadStatus(leadId, newStatus); }
    catch { load(); }
  }

  // Active offers live in the Offers lane; everything else sits in its status column.
  const activeOffers = leads.filter(isActiveOffer);
  const inColumn = (s: Status) => leads.filter((l) => !isActiveOffer(l) && l.status === s);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Timp Vista Circle — Leads</h1>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <DndContext onDragEnd={onDragEnd}>
        <div className="board">
          <Column id="Offers" title="Offers" offers leads={activeOffers} onOpen={setOpen} />
          {STATUSES.map((s) => (
            <Column key={s} id={s} title={s} leads={inColumn(s)} onOpen={setOpen} />
          ))}
        </div>
      </DndContext>
      {open && <LeadDetail lead={open} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}
