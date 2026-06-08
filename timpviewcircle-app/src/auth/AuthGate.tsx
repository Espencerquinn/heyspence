import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setAuthorized(null); return; }
    // If RLS lets us read allowed_users, we're a team member.
    supabase.from('allowed_users').select('email').limit(1).then(({ data, error }) => {
      setAuthorized(!error && !!data && data.length > 0);
    });
  }, [session]);

  if (!session) {
    return (
      <div className="signin">
        <h1>Timpview Circle — Leads</h1>
        <button onClick={() => supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })}>Sign in with Google</button>
      </div>
    );
  }
  if (authorized === null) return <div className="signin">Checking access…</div>;
  if (!authorized) {
    return (
      <div className="signin">
        <h1>Not authorized</h1>
        <p>{session.user.email} doesn’t have access.</p>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }
  return <>{children}</>;
}
