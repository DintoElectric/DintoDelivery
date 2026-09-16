import { useState } from 'react';
import { useApp } from '../state/store.jsx';

// Shown whenever no one is signed in. If there are no users yet (first run),
// it becomes a one-time setup for the shop-manager (admin) account.
export default function Login() {
  const { users, login, setupAdmin } = useApp();
  const firstRun = users.length === 0;

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = firstRun
    ? name.trim() && username.trim() && password
    : username.trim() && password;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true); setError('');
    const res = firstRun
      ? await setupAdmin({ name: name.trim(), username, password })
      : await login({ username, password });
    setBusy(false);
    if (!res.ok) setError(res.error || 'Something went wrong.');
  };

  const onKey = (e) => { if (e.key === 'Enter') submit(); };

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
          {firstRun ? 'Set up the shop manager' : 'Sign in'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
          {firstRun
            ? 'Create the manager account. You can add foremen, drivers and PMs afterward from the Manage screen.'
            : 'Use the username and password your shop manager set up for you.'}
        </div>

        {firstRun && (
          <Labeled label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey}
              placeholder="J. Dinto" style={input} />
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

        <button type="button" className="btn-primary" onClick={submit} disabled={!canSubmit || busy}
          style={{ marginTop: 8 }}>
          {busy ? 'Please wait…' : (firstRun ? 'Create account & sign in' : 'Sign in')}
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
