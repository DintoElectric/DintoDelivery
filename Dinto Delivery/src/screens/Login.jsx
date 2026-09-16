import { useState } from 'react';
import { useApp } from '../state/store.jsx';

// Sign-in for everyone. Prefab managers whose username is on the server's
// approved list (ADMIN_USERNAMES) can self-provision their own account via the
// "Set up a manager account" toggle; everyone else is created by a manager.
export default function Login() {
  const { login, register } = useApp();
  const [mode, setMode] = useState('signin'); // signin | setup

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setup = mode === 'setup';
  const canSubmit = setup
    ? name.trim() && username.trim() && password
    : username.trim() && password;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true); setError('');
    const res = setup ? await register(name.trim(), username, password) : await login(username, password);
    setBusy(false);
    if (!res.ok) setError(res.error || 'Something went wrong.');
  };
  const onKey = (e) => { if (e.key === 'Enter') submit(); };

  const swap = () => { setMode(setup ? 'signin' : 'setup'); setError(''); };

  return (
    <div className="screen" style={{ justifyContent: 'flex-start' }}>
      <div style={{ padding: '48px 24px 20px', borderBottom: '2px solid var(--rule-strong)' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Paul Dinto Electrical · Prefab</div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05 }}>
          Delivery Scheduler
        </div>
      </div>

      <div className="screen__scroll" style={{ padding: '24px' }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', marginBottom: 4 }}>
          {setup ? 'Set up a manager account' : 'Sign in'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
          {setup
            ? 'For approved prefab managers only. Use your assigned username to create your login. Then add the rest of the team from Manage.'
            : 'Use the username and password your prefab manager set up for you.'}
        </div>

        {setup && (
          <Labeled label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey}
              placeholder="Harry" style={input} />
          </Labeled>
        )}
        <Labeled label="Username">
          <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={onKey}
            autoCapitalize="none" autoCorrect="off" placeholder="username" style={input} />
        </Labeled>
        <Labeled label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onKey}
            placeholder="••••••••" style={input} />
        </Labeled>

        {error && (
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-accent-700)', margin: '4px 0 12px' }}>{error}</div>
        )}

        <button type="button" className="btn-primary" onClick={submit} disabled={!canSubmit || busy} style={{ marginTop: 8 }}>
          {busy ? 'Please wait…' : (setup ? 'Create account & sign in' : 'Sign in')}
        </button>

        <button type="button" onClick={swap}
          style={{ marginTop: 18, background: 'transparent', border: 0, cursor: 'pointer', font: '800 11px/1 var(--font)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
          {setup ? 'Have an account? Sign in' : 'Prefab manager? Set up your account'}
        </button>
      </div>
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const input = {
  width: '100%', border: '1px solid var(--rule-strong)', background: 'var(--color-raised)',
  padding: '12px 13px', font: '800 15px/1.2 var(--font)', color: 'var(--color-text)',
  caretColor: 'var(--color-accent)', outline: 'none',
};
