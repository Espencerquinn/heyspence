import { useState } from 'react'

// Stored as a constant in the build. Anyone with the bundle can read it.
// That's fine for this tool — the goal is "keep casual visitors out,"
// not "withstand a determined attacker." Rotate by editing the value
// and redeploying.
const PASSWORD = 'paperisnotwealth'

const STORAGE_KEY = 'heyspence.units.unlocked'

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw.trim() === PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        // ignore (private mode)
      }
      setUnlocked(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  if (unlocked) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md border border-white/15 bg-white/5">
            <span className="font-mono text-xl font-bold">Ag</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Units</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Sale planner · private
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value)
              setError(false)
            }}
            placeholder="Password"
            autoFocus
            autoComplete="off"
            className="w-full rounded-md border border-white/15 bg-white/5 px-4 py-2.5 text-sm outline-none placeholder:text-zinc-500 focus:border-white/40"
          />
          <button
            type="submit"
            disabled={!pw.trim()}
            className="flex w-full items-center justify-center rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-zinc-200 disabled:opacity-60"
          >
            Enter
          </button>
          {error && (
            <p className="text-center text-xs text-red-400">Wrong password.</p>
          )}
        </form>
      </div>
    </div>
  )
}
