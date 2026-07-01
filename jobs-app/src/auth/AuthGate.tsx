import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { DEMO } from '../demo';
import type { Session } from '@supabase/supabase-js';

// SECURITY: this board is private to one person. Authorize on the signed-in
// email directly — do NOT reuse the timpviewcircle allowlist-table check, which
// would let the real-estate co-users in. RLS (is_job_owner) enforces this
// independently at the database; the client check is just a friendly gate.
const OWNER_EMAIL = 'espencer.quinn@gmail.com';

// Google sign-in is only shown once the provider is configured on the project.
// Until then, use the email magic link. Set VITE_GOOGLE_AUTH=1 to enable.
const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_AUTH === '1';

export function AuthGate({ children }: { children: ReactNode }) {
  if (DEMO) return <>{children}</>;  // preview mode: skip auth, serve sample data
  return <AuthGated>{children}</AuthGated>;
}

function AuthGated({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [linkState, setLinkState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const authorized = !!session && session.user.email?.toLowerCase() === OWNER_EMAIL;

  // App is served under /jobs/ — send OAuth/magic-link back to that path, not the site root.
  const redirectTo = window.location.origin + import.meta.env.BASE_URL;

  async function signInGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  async function sendMagicLink() {
    if (!email.trim()) return;
    setError(''); setLinkState('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    });
    if (error) { setError(error.message); setLinkState('idle'); }
    else setLinkState('sent');
  }

  if (!session) {
    return (
      <div className="signin">
        <div className="signin__card">
          <h1>Job Hunt</h1>
          <p className="signin__sub">Application tracker — private access</p>

          {GOOGLE_ENABLED && (
            <>
              <button className="btn btn--google" onClick={signInGoogle}>Sign in with Google</button>
              <div className="signin__divider">or</div>
            </>
          )}

          {linkState === 'sent' ? (
            <p className="signin__note">Check your inbox for a one-tap sign-in link.</p>
          ) : (
            <>
              <input type="email" placeholder="you@email.com" value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && sendMagicLink()} />
              <button className="btn btn--primary" disabled={linkState === 'sending'} onClick={sendMagicLink}>
                {linkState === 'sending' ? 'Sending…' : 'Email me a login link'}
              </button>
            </>
          )}
          {error && <p className="signin__error">{error}</p>}
        </div>
      </div>
    );
  }
  if (!authorized) {
    return (
      <div className="signin">
        <div className="signin__card">
          <h1>Not authorized</h1>
          <p className="signin__sub">{session.user.email} doesn’t have access.</p>
          <button className="btn btn--primary" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
