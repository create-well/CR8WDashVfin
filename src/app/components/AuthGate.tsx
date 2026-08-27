/**
 * CR8W Create Well — Auth Gate (real Supabase Auth)
 *
 * Replaces the shared-password gate. Each user registers their own
 * email + password and picks a profile. Sessions persist live via
 * Supabase (localStorage) and survive across devices.
 *
 * Flow
 *   Sign In   → email + password → supabase.auth.signInWithPassword
 *   Register  → email + password + display name + profile → signUp
 *               (profile + name stored in user_metadata)
 *
 * The chosen profile key is mirrored to localStorage.cr8w_user_profile
 * so the rest of the app (chat identity, dashboards) keeps working.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import cwLogoImg from 'figma:asset/26b5a4fd9027610adb3ddb9ed89749cb683707dd.png';

// ── Supabase browser client (inline config — publishable key is public-safe) ──
const SUPABASE_URL = 'https://axntibrdivccycxdwlzk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_KKMWtvpxkSGaq-xmie6viQ_pRzAb_4i';

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cr8w_supabase_auth' },
    });
  }
  return _client;
}

// ── Profiles ──────────────────────────────────────────────────────────────────
export const PROFILES = [
  { key: 'sunshine',      emoji: '☀️', display: 'Sunshine',       role: 'Remote',          color: '#C25B38', bg: '#FFF0EB', border: '#F2B49B' },
  { key: 'monny',         emoji: '🌊', display: 'Monica (Monny)', role: 'Open Invitation', color: '#2A6A9A', bg: '#EAF4FC', border: '#A9D6F8' },
  { key: 'bingle',        emoji: '✨', display: 'Bingle',          role: 'In-Person',       color: '#7A5010', bg: '#FFF8EC', border: '#D4A771' },
  { key: 'omar',          emoji: '🌟', display: 'Omar',            role: 'New Member',      color: '#5C4A9A', bg: '#F0ECFB', border: '#B8A9D4' },
  { key: 'event-support', emoji: '🎪', display: 'Event Support',   role: 'Day-Of',          color: '#7A4A20', bg: '#FFF5EE', border: '#E8AF93' },
];

// ── Sync helpers used by App.tsx (must be synchronous for initial render) ─────
export function isAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem('cr8w_supabase_auth');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const expiresAt = parsed?.expires_at ?? parsed?.currentSession?.expires_at ?? 0;
    return expiresAt * 1000 > Date.now();
  } catch { return false; }
}

export function getStoredProfile(): string | null {
  try { return localStorage.getItem('cr8w_user_profile'); } catch { return null; }
}

export async function signOut(): Promise<void> {
  try { await client().auth.signOut(); } catch {}
  try { localStorage.removeItem('cr8w_user_profile'); } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { onAuthenticated: (profileKey: string) => void; }
type Mode = 'signin' | 'register';

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#FAF6F2 0%,#F4EDE6 40%,#EDE4DA 100%)', padding: '24px 16px', fontFamily: 'var(--font-body,"Montserrat",sans-serif)' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(194,91,56,0.12) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(123,168,157,0.14) 0%,transparent 70%)' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
  border: '1.5px solid rgba(212,167,113,0.4)', background: 'rgba(255,255,255,0.92)',
  fontFamily: 'var(--font-body,"Montserrat",sans-serif)', fontSize: '0.95rem', color: '#2D2438', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-label,"Blinker",sans-serif)', fontSize: '0.72rem',
  fontWeight: 700, color: '#A07060', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7,
};

export function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [profile, setProfile] = useState('omar');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const triggerShake = useCallback(() => {
    setShake(true); setTimeout(() => setShake(false), 550);
  }, []);

  // On mount: if a valid session already exists, go straight in
  useEffect(() => {
    let active = true;
    client().auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      if (session) {
        const key = session.user?.user_metadata?.cr8w_profile ?? getStoredProfile() ?? 'omar';
        localStorage.setItem('cr8w_user_profile', key);
        onAuthenticated(key);
      } else {
        setCheckingSession(false);
      }
    }).catch(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, [onAuthenticated]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true); setError(''); setNotice('');
    const { data, error: err } = await client().auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    });
    setBusy(false);
    if (err || !data.session) {
      setError(err?.message || 'Sign in failed — check your email and password.');
      triggerShake();
      return;
    }
    const key = data.user?.user_metadata?.cr8w_profile ?? 'omar';
    localStorage.setItem('cr8w_user_profile', key);
    onAuthenticated(key);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || !displayName.trim()) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); triggerShake(); return; }
    setBusy(true); setError(''); setNotice('');
    const { data, error: err } = await client().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { cr8w_profile: profile, display_name: displayName.trim() } },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      triggerShake();
      return;
    }
    localStorage.setItem('cr8w_user_profile', profile);
    // If email confirmation is required, there's no session yet
    if (data.session) {
      onAuthenticated(profile);
    } else {
      setNotice('Account created! Check your email to confirm, then sign in.');
      setMode('signin');
    }
  }

  if (checkingSession) {
    return (
      <Screen>
        <div style={{ textAlign: 'center', color: '#A07060', fontFamily: 'var(--font-label,"Blinker",sans-serif)', fontSize: '0.85rem' }}>
          <img src={cwLogoImg} alt="Create Well" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginBottom: 14, opacity: 0.85 }} />
          <div>loading…</div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', borderRadius: 24, boxShadow: '0 8px 40px rgba(194,91,56,0.12),0 2px 8px rgba(0,0,0,0.06)', padding: '36px 32px 30px', border: '1px solid rgba(212,167,113,0.25)', animation: shake ? 'cr8w-shake 0.5s ease' : 'none' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={cwLogoImg} alt="Create Well" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', marginBottom: 10, boxShadow: '0 4px 16px rgba(194,91,56,0.2)' }} />
          <div style={{ fontFamily: 'var(--font-display,"Fredoka",sans-serif)', fontSize: '1.8rem', fontWeight: 700, color: '#C25B38', lineHeight: 1 }}>Create Well</div>
          <div style={{ fontFamily: 'var(--font-label,"Blinker",sans-serif)', fontSize: '0.7rem', color: '#A07060', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>CR8W Dashboard</div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(194,91,56,0.06)', borderRadius: 12, marginBottom: 22 }}>
          {(['signin', 'register'] as Mode[]).map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(''); setNotice(''); }}
              style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-label,"Blinker",sans-serif)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.03em', background: mode === m ? '#C25B38' : 'transparent', color: mode === m ? '#fff' : '#A07060', transition: 'all 0.15s' }}>
              {m === 'signin' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {notice && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(123,168,157,0.1)', border: '1px solid rgba(123,168,157,0.3)', fontFamily: 'var(--font-body,"Montserrat",sans-serif)', fontSize: '0.76rem', color: '#3A7A3A', lineHeight: 1.5 }}>
            ✓ {notice}
          </div>
        )}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleRegister} noValidate>
          {/* Register-only: display name */}
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Your Name</label>
              <input value={displayName} onChange={e => { setDisplayName(e.target.value); setError(''); }} placeholder="e.g. Omar" autoFocus style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = '#C25B38'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(212,167,113,0.4)'} />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" autoComplete="email" autoFocus={mode === 'signin'} style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#C25B38'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(212,167,113,0.4)'} />
          </div>

          {/* Password */}
          <div style={{ marginBottom: mode === 'register' ? 16 : 20 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder={mode === 'register' ? 'at least 6 characters' : '••••••••'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                style={{ ...inputStyle, paddingRight: 44, border: `1.5px solid ${error ? '#E05040' : 'rgba(212,167,113,0.4)'}` }}
                onFocus={e => e.currentTarget.style.borderColor = '#C25B38'} onBlur={e => e.currentTarget.style.borderColor = error ? '#E05040' : 'rgba(212,167,113,0.4)'} />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#A07060', padding: 4 }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Register-only: profile picker */}
          {mode === 'register' && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Choose your profile</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PROFILES.map(p => {
                  const active = profile === p.key;
                  return (
                    <button key={p.key} type="button" onClick={() => setProfile(p.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${active ? p.border : 'var(--border-soft,#D6D1CA)'}`, background: active ? `${p.border}25` : 'transparent', transition: 'all 0.15s' }}>
                      <span style={{ fontSize: '0.95rem' }}>{p.emoji}</span>
                      <span style={{ fontFamily: 'var(--font-label,"Blinker",sans-serif)', fontSize: '0.74rem', fontWeight: 700, color: active ? p.color : '#8A7060' }}>{p.display}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <div style={{ marginBottom: 16, fontFamily: 'var(--font-body,"Montserrat",sans-serif)', fontSize: '0.76rem', color: '#C03020', lineHeight: 1.4 }}>{error}</div>}

          <button type="submit" disabled={busy} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: busy ? 'rgba(194,91,56,0.4)' : '#C25B38', color: '#fff', fontFamily: 'var(--font-display,"Fredoka",sans-serif)', fontSize: '1rem', fontWeight: 600, cursor: busy ? 'default' : 'pointer', boxShadow: busy ? 'none' : '0 4px 16px rgba(194,91,56,0.3)', transition: 'background 0.15s' }}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontFamily: 'var(--font-body,"Montserrat",sans-serif)', fontSize: '0.72rem', color: '#B09080', lineHeight: 1.5 }}>
          {mode === 'signin'
            ? <>New to the Well? <button type="button" onClick={() => { setMode('register'); setError(''); }} style={{ background: 'none', border: 'none', color: '#C25B38', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline', padding: 0 }}>Create an account</button></>
            : <>Already have an account? <button type="button" onClick={() => { setMode('signin'); setError(''); }} style={{ background: 'none', border: 'none', color: '#C25B38', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline', padding: 0 }}>Sign in</button></>}
        </p>
      </div>

      <style>{`@keyframes cr8w-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(3px)} }`}</style>
    </Screen>
  );
}
