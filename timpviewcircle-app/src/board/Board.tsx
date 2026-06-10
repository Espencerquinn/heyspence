import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { STATUSES, isActiveOffer, type Lead, type Status } from '../types';
import { fetchLeads, updateLeadStatus } from '../data/leads';
import { Column } from './Column';
import { LeadDetail } from './LeadDetail';
import { supabase } from '../supabaseClient';

export function Board() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState<Lead | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Require an 8px drag before dragging starts, so a plain click on a card
  // fires onClick (opens the drawer) instead of being captured as a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function load() {
    setRefreshing(true);
    try { setLeads(await fetchLeads()); }
    finally { setRefreshing(false); }
  }
  useEffect(() => { load(); }, []);

  // Live updates: reload when leads or notes change anywhere (debounced).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => { clearTimeout(timer); timer = setTimeout(load, 400); };
    const channel = supabase
      .channel('board-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, bump)
      .subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, []);

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

  // Interest filter (matches combos via substring, e.g. "lot1,lot3").
  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'whole_subdivision', label: 'Whole subdivision' },
    { key: 'lot3', label: 'Lot 3' },
    { key: 'lot2', label: 'Lot 2' },
    { key: 'lot1', label: 'Lot 1' },
    { key: 'general', label: 'General' },
  ];
  const matchesFilter = (l: Lead) => filter === 'all' || (l.interest || '').includes(filter);
  const visible = leads.filter(matchesFilter);

  // Active offers live in the Offers lane; everything else sits in its status column.
  const activeOffers = visible.filter(isActiveOffer);
  const inColumn = (s: Status) => visible.filter((l) => !isActiveOffer(l) && l.status === s);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <img src="/timp-vista-circle-logo.png" alt="" />
          <span>Timp Vista Circle — Leads</span>
        </div>
        <div className="topbar__actions">
          <button className="topbar__signout" onClick={load} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button className="topbar__signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>
      <div className="filterbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-pill${filter === f.key ? ' filter-pill--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="filter-pill__count">
                {leads.filter((l) => (l.interest || '').includes(f.key)).length}
              </span>
            )}
          </button>
        ))}
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
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
