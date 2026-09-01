import type { ReactNode } from 'react';
import { Rail } from './Rail';
import { formatShort, todayISO } from '../system/dates';
import { supabase } from '../supabaseClient';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="grille" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="app">
        <header className="topbar">
          <div className="brand">HQ <span>//</span> SYSTEM</div>
          <div className="clock">{formatShort(todayISO())}</div>
          <div className="topbar__spacer" />
          <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </header>
        <Rail />
        <main>{children}</main>
      </div>
    </>
  );
}
