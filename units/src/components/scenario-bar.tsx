import { useEffect, useRef, useState } from 'react'
import type { Scenario, ScenarioPreset } from '../lib/scenarios'

interface Props {
  scenarios: Scenario[]
  activeId: string
  visibleIds: string[]
  presets: ScenarioPreset[]
  onSelectActive: (id: string) => void
  onToggleVisible: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
  onAddFromPreset: (preset: ScenarioPreset) => void
}

export function ScenarioBar({
  scenarios,
  activeId,
  visibleIds,
  presets,
  onSelectActive,
  onToggleVisible,
  onRename,
  onDuplicate,
  onDelete,
  onAdd,
  onAddFromPreset,
}: Props) {
  return (
    <section className="rounded-md border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Scenarios
        </p>
        <p className="text-[11px] text-zinc-500">
          Click a chip to edit it. Toggle the eye to show it on the chart.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <ScenarioChip
            key={s.id}
            scenario={s}
            isActive={s.id === activeId}
            isVisible={visibleIds.includes(s.id)}
            canDelete={scenarios.length > 1}
            onSelectActive={() => onSelectActive(s.id)}
            onToggleVisible={() => onToggleVisible(s.id)}
            onRename={(name) => onRename(s.id, name)}
            onDuplicate={() => onDuplicate(s.id)}
            onDelete={() => onDelete(s.id)}
          />
        ))}
        <button
          onClick={onAdd}
          className="rounded-md border border-dashed border-white/15 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          title="Add a new scenario (copies the active one)"
        >
          + Add scenario
        </button>
        <PresetMenu presets={presets} onPick={onAddFromPreset} />
      </div>
    </section>
  )
}

function PresetMenu({
  presets,
  onPick,
}: {
  presets: ScenarioPreset[]
  onPick: (p: ScenarioPreset) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-dashed border-white/15 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        title="Add a known strategy as a scenario"
      >
        + From strategy library {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-80 rounded-md border border-white/15 bg-zinc-950 p-1 shadow-xl">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onPick(p)
                setOpen(false)
              }}
              className="block w-full rounded-sm px-2 py-1.5 text-left hover:bg-white/10"
            >
              <p className="text-sm font-medium text-zinc-100">{p.name}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">{p.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface ChipProps {
  scenario: Scenario
  isActive: boolean
  isVisible: boolean
  canDelete: boolean
  onSelectActive: () => void
  onToggleVisible: () => void
  onRename: (name: string) => void
  onDuplicate: () => void
  onDelete: () => void
}

function ScenarioChip({
  scenario,
  isActive,
  isVisible,
  canDelete,
  onSelectActive,
  onToggleVisible,
  onRename,
  onDuplicate,
  onDelete,
}: ChipProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(scenario.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== scenario.name) onRename(trimmed)
    else setDraft(scenario.name)
    setEditing(false)
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2 py-1 transition ${
        isActive
          ? 'border-white/30 bg-white/[0.06]'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
      } ${isVisible ? '' : 'opacity-60'}`}
    >
      <button
        type="button"
        onClick={onToggleVisible}
        className="text-zinc-400 hover:text-zinc-100"
        title={isVisible ? 'Hide from chart' : 'Show on chart'}
        aria-label={isVisible ? 'Hide from chart' : 'Show on chart'}
      >
        {isVisible ? <EyeIcon /> : <EyeOffIcon />}
      </button>

      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: scenario.color }}
        aria-hidden
      />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') {
              setDraft(scenario.name)
              setEditing(false)
            }
          }}
          className="w-32 rounded-sm border border-white/15 bg-black/30 px-1.5 py-0.5 text-sm text-zinc-100 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onSelectActive}
          onDoubleClick={() => {
            setDraft(scenario.name)
            setEditing(true)
          }}
          className={`text-sm ${isActive ? 'font-semibold text-zinc-100' : 'text-zinc-300'}`}
          title={isActive ? 'Editing this scenario · double-click to rename' : 'Click to edit · double-click to rename'}
        >
          {scenario.name}
        </button>
      )}

      <div className="ml-1 flex items-center gap-0.5">
        <IconButton onClick={onDuplicate} title="Duplicate">
          <CopyIcon />
        </IconButton>
        {canDelete && (
          <IconButton
            onClick={() => {
              if (confirmDelete) onDelete()
              else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000) }
            }}
            title={confirmDelete ? `Click again to delete "${scenario.name}"` : 'Delete'}
            danger={confirmDelete}
          >
            <XIcon />
          </IconButton>
        )}
      </div>
    </div>
  )
}

function IconButton({
  onClick,
  title,
  children,
  danger = false,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-sm p-0.5 hover:bg-white/10 ${
        danger ? 'text-red-400 hover:text-red-300' : 'text-zinc-500 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.6 19.6 0 0 1 4.22-5.11M9.9 4.24A10.95 10.95 0 0 1 12 4c7 0 11 8 11 8a19.7 19.7 0 0 1-3.17 4.19M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
