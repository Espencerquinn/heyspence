import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [linkState, setLinkState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setAuthorized(null); return; }
    supabase.from('allowed_users').select('email').limit(1).then(({ data, error }) => {
      setAuthorized(!error && !!data && data.length > 0);
    });
  }, [session]);

  async function signInGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  async function sendMagicLink() {
    if (!email.trim()) return;
    setError(''); setLinkState('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLinkState('idle'); }
    else setLinkState('sent');
  }

  if (!session) {
    return (
      <div className="signin">
        <div className="signin__card">
          <img className="signin__logo" src="/timp-vista-circle-logo.png" alt="Timp Vista Circle" />
          <h1>Timp Vista Circle</h1>
          <p className="signin__sub">Lead management — team access only</p>

          <button className="btn btn--google" onClick={signInGoogle}>Sign in with Google</button>

          <div className="signin__divider">or</div>

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
  if (authorized === null) return <div className="signin"><div className="signin__card">Checking access…</div></div>;
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
