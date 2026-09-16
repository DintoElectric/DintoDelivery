import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp } from '../state/store.jsx';

export default function NewRequest() {
  const { back, createRequest, addAlert, setTab, jobs, contacts, currentUser } = useApp();

  const [type, setType] = useState('Delivery');
  const [jobId, setJobId] = useState(jobs[0]?.id || '');
  const [desc, setDesc] = useState('');
  const [neededDate, setNeededDate] = useState('');
  const [neededTime, setNeededTime] = useState('');
  const [address, setAddress] = useState('');
  const [gate, setGate] = useState('');
  const [contactId, setContactId] = useState('');

  const job = jobs.find((j) => j.id === jobId) || null;
  const contact = contacts.find((c) => c.id === contactId) || null;

  // Required: type, job, description, needed-by date, address.
  const valid = type && job && desc.trim() && neededDate.trim() && address.trim();

  const submit = () => {
    if (!valid) return;
    const route = type === 'Delivery'
      ? `Shop 1 → ${address}${gate ? ', ' + gate : ''}`
      : `${address}${gate ? ', ' + gate : ''} → Shop 1`;
    const neededBy = neededDate + (neededTime ? ', ' + neededTime : '');
    createRequest({
      title: desc.trim(), type, route,
      job: job.number, jobId: job.id, jobName: job.name,
      contact: contact?.name || '', contactId: contact?.id || '',
      contactPhone: contact?.phone || '', contactEmail: contact?.email || '',
      neededBy, pickup: type === 'Pickup' ? address : 'Shop 1',
      dropoff: type === 'Delivery' ? `${address}${gate ? ', ' + gate : ''}` : 'Shop 1',
      gate, raisedByName: currentUser?.name || '', raisedByRole: currentUser?.role || '',
    });
    addAlert({
      id: 'al' + Date.now(), day: 'Today', kind: 'New request', unread: true,
      headline: `${currentUser?.name || 'Someone'} requested a ${type.toLowerCase()} for ${neededDate || 'a date'} — ${job.name}`,
      meta: `Job ${job.number} · needs a date · just now`,
    });
    setTab('schedule');
  };

  const addrLabel = type === 'Delivery' ? 'Deliver to — address & gate' : 'Pick up from — address & gate';
  const noJobs = jobs.length === 0;

  return (
    <div className="screen anim-modal">
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', borderBottom: '2px solid var(--rule-strong)' }}>
        <button type="button" onClick={back} style={navBtn}>Cancel</button>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.01em' }}>New request</div>
        <button type="button" onClick={submit} disabled={!valid}
          style={{ ...navBtn, color: valid ? 'var(--color-accent)' : 'var(--text-disabled)', cursor: valid ? 'pointer' : 'not-allowed' }}>
          Send
        </button>
      </div>

      <div className="screen__scroll" style={{ paddingBottom: 116 }}>
        {noJobs && (
          <div style={{ padding: '16px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--rule-light)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            No jobs have been set up yet. Ask your shop manager to add a job before raising a request.
          </div>
        )}

        {/* What kind */}
        <Group label="What kind">
          <div style={{ display: 'flex', border: '1px solid var(--rule-strong)' }}>
            {['Delivery', 'Pickup'].map((opt, i) => {
              const on = type === opt;
              return (
                <button key={opt} type="button" onClick={() => setType(opt)}
                  style={{
                    flex: 1, padding: 12, textAlign: 'center', cursor: 'pointer', border: 0,
                    borderLeft: i === 0 ? 0 : '1px solid var(--rule-strong)',
                    font: '800 12px/1 var(--font)', letterSpacing: '.06em', textTransform: 'uppercase',
                    background: on ? 'var(--color-accent)' : 'transparent',
                    color: on ? 'var(--color-bg)' : 'var(--color-text)',
                  }}>{opt}</button>
              );
            })}
          </div>
        </Group>

        {/* Job */}
        <Group label="Job / project number">
          <div style={{ ...boxInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 13px' }}>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={{ ...bareSelect, flex: 1 }} disabled={noJobs}>
              {noJobs && <option value="">No jobs available</option>}
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.number} · {j.name}</option>)}
            </select>
            <ChevronDown size={14} strokeWidth={2.2} />
          </div>
        </Group>

        {/* Description */}
        <Group label="What do you need moved">
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Describe it in your own words…"
            style={{ ...boxInput, border: '1px solid var(--rule-strong)', minHeight: 104, padding: '12px 13px', fontSize: 15, lineHeight: 1.5, fontWeight: 400, resize: 'vertical', width: '100%' }} />
          <div style={{ fontSize: 11, color: 'var(--text-label)', marginTop: 6 }}>
            Describe it in your own words — the shop sizes the load.
          </div>
        </Group>

        {/* Needed by / Time */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--rule-light)' }}>
          <div style={{ flex: 1, padding: '16px 20px', borderRight: '1px solid var(--rule-light)' }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Needed by</div>
            <input value={neededDate} onChange={(e) => setNeededDate(e.target.value)} placeholder="Thu 17 Sep"
              style={{ ...boxInput, padding: '11px 12px', fontSize: 15, fontWeight: 800, width: '100%' }} />
          </div>
          <div style={{ flex: 1, padding: '16px 20px' }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Time</div>
            <input value={neededTime} onChange={(e) => setNeededTime(e.target.value)} placeholder="7:00 AM"
              style={{ ...boxInput, padding: '11px 12px', fontSize: 15, fontWeight: 800, width: '100%' }} />
          </div>
        </div>

        {/* Address & gate */}
        <Group label={addrLabel}>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="4100 Northgate Way"
            style={{ ...boxInput, padding: '12px 13px', fontSize: 15, fontWeight: 800, width: '100%', marginBottom: 6 }} />
          <input value={gate} onChange={(e) => setGate(e.target.value)} placeholder="Gate 2 — locked before 6:30 AM"
            style={{ ...boxInput, padding: '12px 13px', fontSize: 15, fontWeight: 800, width: '100%' }} />
        </Group>

        {/* Contact */}
        <Group label="Contact on site" last>
          <div style={{ ...boxInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 13px' }}>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} style={{ ...bareSelect, flex: 1 }}>
              <option value="">Select a contact</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ' · ' + c.phone : ''}</option>)}
            </select>
            <ChevronDown size={14} strokeWidth={2.2} />
          </div>
        </Group>
      </div>

      {/* Bottom bar */}
      <div className="bottombar" style={{ padding: '14px 20px 44px' }}>
        <button type="button" className="btn-primary" onClick={submit} disabled={!valid}>Submit request</button>
        <div style={{ fontSize: 11, color: 'var(--text-label)', marginTop: 9 }}>
          Goes to the shop manager. You get a notice when it is scheduled.
        </div>
      </div>
    </div>
  );
}

function Group({ label, children, last }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: last ? 0 : '1px solid var(--rule-light)' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

const navBtn = {
  background: 'transparent', border: 0, cursor: 'pointer',
  font: '800 11px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase',
  color: 'var(--text-label)',
};
const boxInput = {
  border: '1px solid var(--border-input)', background: 'var(--color-raised)',
  color: 'var(--color-text)', font: 'inherit',
};
const bareSelect = {
  border: 0, background: 'transparent', font: '800 15px/1.2 var(--font)',
  color: 'var(--color-text)', appearance: 'none', WebkitAppearance: 'none', outline: 'none',
};
