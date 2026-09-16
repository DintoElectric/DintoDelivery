import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useApp, primaryActionFor } from '../state/store.jsx';
import { SLOTS } from '../data/seed.js';
import { StatusChip, TypeChip } from '../components/Chip.jsx';
import { fmtTime, fmtDay } from '../lib/format.js';

const STEP_ORDER = ['Requested', 'Scheduled', 'Completed'];
const DATE_OPTIONS = [15, 16, 17, 18, 19]; // demo month day numbers

function windowLabel(startHH) {
  const endH = String((parseInt(startHH.slice(0, 2), 10) + 1)).padStart(2, '0');
  return fmtTime(startHH) + ' – ' + fmtTime(endH + ':00');
}

export default function RequestDetail({ id }) {
  const { requests, role, back, moveRequest, completeRequest, addAlert, users, contacts } = useApp();
  const req = requests.find((r) => r.id === id);
  const drivers = users.filter((u) => u.role === 'Driver');

  const [date, setDate] = useState(req?.day ?? 16);
  const [win, setWin] = useState(req?.time ?? '14:00');
  const [driver, setDriver] = useState(req?.driver ?? (drivers[0]?.name ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!req) return null;

  const contact = contacts.find((c) => c.id === req.contactId) || null;
  const contactName = req.contact || contact?.name || '';
  const contactPhone = req.contactPhone || contact?.phone || '';
  const contactEmail = req.contactEmail || contact?.email || '';
  const currentStep = STEP_ORDER.indexOf(req.status);

  const onPrimary = async () => {
    if (busy) return;
    setBusy(true); setError('');
    let res;
    if (role === 'Shop manager') {
      // The server creates the matching "Scheduled" alert as part of this
      // same call — no separate client-side alert write here (two racing
      // writes from one click is what let a submission silently vanish).
      res = await moveRequest(id, date, win, driver);
    } else if (role === 'Driver') {
      res = await completeRequest(id);
    } else {
      // No dedicated server action for a nudge/follow, so this is the only
      // write for this path — safe to fire on its own.
      res = await addAlert({
        kind: 'New request',
        headline: role === 'Field foreman' ? `Nudge sent on REQ-${id}` : `Following REQ-${id}`,
        meta: 'just now',
      });
    }
    setBusy(false);
    if (!res.ok) { setError(res.error || 'That didn’t go through. Please try again.'); return; }
    back();
  };

  return (
    <div className="screen anim-push">
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', borderBottom: '2px solid var(--rule-strong)' }}>
        <button type="button" onClick={back}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: 0, cursor: 'pointer', font: '800 11px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
          <ChevronLeft size={14} strokeWidth={2.4} color="var(--color-accent)" />Back
        </button>
        <div style={{ font: '600 11px/1 var(--font)', color: 'var(--text-label)' }}>REQ-{id}</div>
      </div>

      <div className="screen__scroll" style={{ paddingBottom: 120 }}>
        {/* Title block */}
        <div style={{ padding: '18px 20px 16px', borderBottom: '2px solid var(--rule-strong)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <StatusChip status={req.status} />
            <TypeChip type={req.type} />
          </div>
          <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.14 }}>{req.title}</div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)', marginTop: 8 }}>
            {req.raisedByName ? `Raised by ${req.raisedByName}${req.raisedByRole ? ', ' + req.raisedByRole.toLowerCase() : ''}` : 'Raised'}
          </div>
        </div>

        {/* Status timeline */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule-light)' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Status</div>
          {STEP_ORDER.map((step, i) => {
            const done = i <= currentStep;
            const isFuture = i > currentStep;
            const last = i === STEP_ORDER.length - 1;
            const marker = done
              ? { background: 'var(--color-accent)' }
              : (i === currentStep + 1 ? { border: '2px solid var(--color-text)' } : { border: '2px solid rgba(32,30,29,.3)' });
            const sub = {
              Requested: req.raisedByName || 'Raised',
              Scheduled: req.day != null ? `${fmtDay(req.day)}, ${fmtTime(req.time)}` : 'Awaiting a date from the shop',
              Completed: 'Driver confirms the drop',
            }[step];
            return (
              <div key={step} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                  <span style={{ width: 14, height: 14, flex: 'none', ...marker }} />
                  {!last && <span style={{ flex: 1, width: 2, background: done ? 'var(--color-text)' : 'rgba(32,30,29,.3)' }} />}
                </div>
                <div style={{ paddingBottom: last ? 0 : 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isFuture ? 'rgba(32,30,29,.4)' : 'inherit' }}>{step}</div>
                  <div style={{ fontSize: 12, color: isFuture ? 'rgba(32,30,29,.4)' : 'var(--text-muted)' }}>{sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Details grid */}
        <div style={{ borderBottom: '1px solid var(--rule-light)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--rule-light)' }}>
            <Cell label="Job" value={req.job} sub={req.jobName} border />
            <Cell label="Needed by" value={req.neededBy || '—'} />
          </div>
          <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--rule-light)' }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Route</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>Pick up — {req.pickup || req.route.split(' → ')[0]}</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Drop off — {req.dropoff || req.route.split(' → ')[1]}</div>
          </div>
          {(contactName || contactPhone || contactEmail) && (
            <div style={{ padding: '13px 20px' }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Site contact</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{contactName || '—'}</div>
                  {contactPhone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{contactPhone}</div>}
                  {contactEmail && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{contactEmail}</div>}
                </div>
                {contactPhone && (
                  <a className="btn-secondary" href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`} style={{ textDecoration: 'none' }}>Call</a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Shop assignment */}
        <div style={{ padding: '16px 20px', background: 'var(--color-surface)', borderBottom: '2px solid var(--rule-strong)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Shop assignment</div>
          {role === 'Shop manager' ? (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Field label="Date">
                  <select value={date} onChange={(e) => setDate(Number(e.target.value))} style={selectStyle}>
                    {DATE_OPTIONS.map((n) => <option key={n} value={n}>{fmtDay(n)}</option>)}
                  </select>
                </Field>
                <Field label="Window">
                  <select value={win} onChange={(e) => setWin(e.target.value)} style={selectStyle}>
                    {SLOTS.slice(0, -1).map((t) => <option key={t} value={t}>{windowLabel(t)}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Driver">
                <select value={driver} onChange={(e) => setDriver(e.target.value)} style={selectStyle}>
                  {drivers.length === 0 && <option value="">No drivers set up</option>}
                  {drivers.map((dr) => <option key={dr.id} value={dr.name}>{dr.name}</option>)}
                </select>
              </Field>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {req.day != null ? `${fmtDay(req.day)}, ${fmtTime(req.time)}${req.driver ? ' · ' + req.driver : ''}` : 'Not scheduled yet — the shop assigns date, window and driver.'}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bottombar" style={{ padding: '14px 20px 44px' }}>
        {error && (
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-accent-700)', marginBottom: 9 }}>{error}</div>
        )}
        <button type="button" className="btn-primary" onClick={onPrimary} disabled={busy}>
          {busy ? 'Please wait…' : primaryActionFor(role)}
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-label)', marginTop: 9 }}>
          Notifies the requester{req.driver ? ', ' + req.driver : ''} and the PM on job {req.job}.
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, sub, border }) {
  return (
    <div style={{ flex: 1, padding: '13px 20px', borderRight: border ? '1px solid var(--rule-light)' : 0 }}>
      <div className="eyebrow" style={{ marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ flex: 1, background: 'var(--color-raised)', border: '1px solid var(--border-input)', padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

const selectStyle = {
  width: '100%', border: 0, background: 'transparent', padding: 0,
  font: '800 15px/1.2 var(--font)', color: 'var(--color-text)', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
};
