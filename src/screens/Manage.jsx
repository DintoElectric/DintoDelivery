import { useState } from 'react';
import { ChevronLeft, Trash2, Pencil } from 'lucide-react';
import { useApp } from '../state/store.jsx';
import { ROLES } from '../data/seed.js';

const SUBTABS = ['Jobs', 'Contacts', 'Team'];

export default function Manage() {
  const app = useApp();
  const [sub, setSub] = useState('Jobs');

  return (
    <div className="screen anim-push">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', borderBottom: '2px solid var(--rule-strong)' }}>
        <button type="button" onClick={app.back} style={backBtn}>
          <ChevronLeft size={14} strokeWidth={2.4} color="var(--color-accent)" />Me
        </button>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.01em' }}>Manage</div>
        <div style={{ width: 48 }} />
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--rule-strong)' }}>
        {SUBTABS.map((s, i) => {
          const on = sub === s;
          return (
            <button key={s} type="button" onClick={() => setSub(s)}
              style={{
                flex: 1, padding: '11px 8px', textAlign: 'center', cursor: 'pointer', border: 0,
                borderLeft: i === 0 ? 0 : '1px solid var(--border-input)',
                font: '800 11px/1 var(--font)', letterSpacing: '.06em', textTransform: 'uppercase',
                background: on ? 'var(--color-text)' : 'transparent',
                color: on ? 'var(--color-bg)' : 'rgba(32,30,29,.75)',
              }}>{s}</button>
          );
        })}
      </div>

      <div className="screen__scroll" style={{ paddingBottom: 40 }}>
        {sub === 'Jobs' && <Jobs app={app} />}
        {sub === 'Contacts' && <Contacts app={app} />}
        {sub === 'Team' && <Team app={app} />}
      </div>
    </div>
  );
}

/* ---- Jobs ---------------------------------------------------------------- */
function Jobs({ app }) {
  const { jobs, contacts, addJob, updateJob, deleteJob } = app;
  const blank = { number: '', name: '', contactId: '' };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const valid = form.number.trim() && form.name.trim();

  const save = () => {
    if (!valid) return;
    if (editId) updateJob({ id: editId, ...form });
    else addJob(form);
    setForm(blank); setEditId(null);
  };

  return (
    <>
      <Section label={editId ? 'Edit job' : 'Add a job'}>
        <Row>
          <Input placeholder="Job number (24-118)" value={form.number} onChange={(v) => setForm({ ...form, number: v })} />
          <Input placeholder="Name (Northgate Medical)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        </Row>
        <Select value={form.contactId} onChange={(v) => setForm({ ...form, contactId: v })}>
          <option value="">Primary contact (optional)</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <SaveRow valid={valid} editId={editId} onSave={save} onCancel={() => { setForm(blank); setEditId(null); }} />
      </Section>

      <ListHeader n={jobs.length} unit="job" />
      {jobs.map((j) => (
        <ListItem key={j.id}
          title={`${j.number} · ${j.name}`}
          sub={contacts.find((c) => c.id === j.contactId)?.name}
          onEdit={() => { setForm({ number: j.number, name: j.name, contactId: j.contactId || '' }); setEditId(j.id); }}
          onDelete={() => deleteJob(j.id)} />
      ))}
    </>
  );
}

/* ---- Contacts ------------------------------------------------------------ */
function Contacts({ app }) {
  const { contacts, addContact, updateContact, deleteContact } = app;
  const blank = { name: '', company: '', phone: '', email: '' };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const valid = form.name.trim();

  const save = () => {
    if (!valid) return;
    if (editId) updateContact({ id: editId, ...form });
    else addContact(form);
    setForm(blank); setEditId(null);
  };

  return (
    <>
      <Section label={editId ? 'Edit contact' : 'Add a contact'}>
        <Row>
          <Input placeholder="Name (R. Alvarez)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input placeholder="Company / role" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
        </Row>
        <Row>
          <Input placeholder="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input placeholder="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        </Row>
        <SaveRow valid={valid} editId={editId} onSave={save} onCancel={() => { setForm(blank); setEditId(null); }} />
      </Section>

      <ListHeader n={contacts.length} unit="contact" />
      {contacts.map((c) => (
        <ListItem key={c.id}
          title={c.name}
          sub={[c.company, c.phone, c.email].filter(Boolean).join(' · ')}
          onEdit={() => { setForm({ name: c.name, company: c.company || '', phone: c.phone || '', email: c.email || '' }); setEditId(c.id); }}
          onDelete={() => deleteContact(c.id)} />
      ))}
    </>
  );
}

/* ---- Team (users / credentials) ------------------------------------------ */
function Team({ app }) {
  const { users, currentUser, addUser, updateUser, deleteUser } = app;
  const blank = { name: '', username: '', password: '', role: 'Field foreman' };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = form.name.trim() && form.username.trim() && (editId ? true : form.password);

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true); setError('');
    const res = editId ? await updateUser(editId, form) : await addUser(form);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setForm(blank); setEditId(null);
  };

  return (
    <>
      <Section label={editId ? 'Edit team member' : 'Add a team member'}>
        <Row>
          <Input placeholder="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input placeholder="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
        </Row>
        <Row>
          <Input placeholder={editId ? 'New password (leave blank to keep)' : 'Password'} type="password"
            value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Row>
        {error && <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-accent-700)', marginTop: 4 }}>{error}</div>}
        <SaveRow valid={valid} editId={editId} busy={busy} onSave={save} onCancel={() => { setForm(blank); setEditId(null); setError(''); }} />
      </Section>

      <ListHeader n={users.length} unit="member" />
      {users.map((u) => {
        const isSelf = u.id === currentUser?.id;
        return (
          <ListItem key={u.id}
            title={`${u.name}${isSelf ? ' (you)' : ''}`}
            sub={`@${u.username} · ${u.role}`}
            onEdit={() => { setForm({ name: u.name, username: u.username, password: '', role: u.role }); setEditId(u.id); }}
            onDelete={isSelf ? null : () => deleteUser(u.id)} />
        );
      })}
    </>
  );
}

/* ---- Small shared building blocks ---------------------------------------- */
function Section({ label, children }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--rule-strong)', background: 'var(--color-surface)' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}
function Row({ children }) {
  return <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>{children}</div>;
}
function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      style={{ flex: 1, minWidth: 0, width: '100%', border: '1px solid var(--border-input)', background: 'var(--color-raised)',
        padding: '10px 12px', font: '600 14px/1.2 var(--font)', color: 'var(--color-text)', outline: 'none', marginBottom: 0 }} />
  );
}
function Select({ value, onChange, children }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ flex: 1, minWidth: 0, width: '100%', border: '1px solid var(--border-input)', background: 'var(--color-raised)',
        padding: '10px 12px', font: '600 14px/1.2 var(--font)', color: 'var(--color-text)', outline: 'none', marginBottom: 8, appearance: 'none', WebkitAppearance: 'none' }}>
      {children}
    </select>
  );
}
function SaveRow({ valid, editId, busy, onSave, onCancel }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
      <button type="button" className="btn-primary" onClick={onSave} disabled={!valid || busy} style={{ width: 'auto', flex: 1 }}>
        {busy ? 'Saving…' : (editId ? 'Save changes' : 'Add')}
      </button>
      {editId && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
    </div>
  );
}
function ListHeader({ n, unit }) {
  return <div className="group-header">{n} {unit}{n === 1 ? '' : 's'}</div>;
}
function ListItem({ title, sub, onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: '1px solid var(--rule-light)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      <button type="button" onClick={onEdit} aria-label="Edit" style={iconBtn}><Pencil size={15} strokeWidth={2} /></button>
      {onDelete && <button type="button" onClick={onDelete} aria-label="Delete" style={iconBtn}><Trash2 size={15} strokeWidth={2} color="var(--color-accent)" /></button>}
    </div>
  );
}

const backBtn = {
  display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: 0, cursor: 'pointer',
  font: '800 11px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-accent)', width: 48,
};
const iconBtn = {
  width: 34, height: 34, flex: 'none', border: '1px solid var(--border-input)', background: 'transparent',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};
