import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

// SECURITY: HQ is private to one person. Authorize on the signed-in email.
// hq.is_owner() enforces this independently at the database; this gate is
// only the friendly front door.
const OWNER_EMAIL = 'espencer.quinn@gmail.com';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (error) setError(error.message);
  }

  if (!ready) return <div className="boot">ESTABLISHING CONNECTION…</div>;

  if (!session) {
    return (
      <div className="gate">
        <div className="gate__panel">
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          <p className="gate__eyebrow">[ SYSTEM ]</p>
          <h1 className="gate__title">HQ</h1>
          <p className="gate__lead">Access is restricted to the Player.</p>
          <button className="btn" onClick={signIn}>Sign in with Google</button>
          {error && <p className="gate__error">{error}</p>}
        </div>
      </div>
    );
  }

  if (session.user.email?.toLowerCase() !== OWNER_EMAIL) {
    return (
      <div className="gate">
        <div className="gate__panel">
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          <p className="gate__eyebrow">[ DENIED ]</p>
          <h1 className="gate__title">Not authorized</h1>
          <p className="gate__lead">{session.user.email} is not the Player.</p>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
