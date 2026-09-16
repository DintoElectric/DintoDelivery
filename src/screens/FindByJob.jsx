import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../state/store.jsx';
import { StatusChip } from '../components/Chip.jsx';
import { fmtDayTime } from '../lib/format.js';
import TabBar from '../components/TabBar.jsx';

const STATUS_CYCLE = ['Any status', 'Requested', 'Scheduled', 'Completed'];

export default function FindByJob() {
  const { requests, jobs, openDetail } = useApp();
  const [query, setQuery] = useState('');
  const [statusIdx, setStatusIdx] = useState(0);
  const status = STATUS_CYCLE[statusIdx];

  const q = query.trim().toLowerCase();
  const results = requests.filter((r) => {
    const matchesQ = !q || (r.job || '').toLowerCase().includes(q)
      || r.title.toLowerCase().includes(q) || ('req-' + r.id).includes(q) || r.id.includes(q);
    const matchesStatus = status === 'Any status' || r.status === status;
    return matchesQ && matchesStatus;
  });

  const activeJob = jobs.find((j) => q && j.number.toLowerCase() === q);
  const countLabel = `${results.length} ${results.length === 1 ? 'request' : 'requests'}`
    + (activeJob ? ' · ' + activeJob.name : '');

  return (
    <div className="screen">
      {/* Search block */}
      <div style={{ padding: '10px 20px 14px', borderBottom: '2px solid var(--rule-strong)' }}>
        <div style={{ border: '1px solid var(--rule-strong)', background: 'var(--color-raised)', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Search size={15} strokeWidth={2.2} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Job number, keyword…"
            style={{ flex: 1, border: 0, background: 'transparent', font: '800 15px/1 var(--font)', color: 'var(--color-text)', outline: 'none', caretColor: 'var(--color-accent)' }} />
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 11, flexWrap: 'wrap' }}>
          {activeJob && (
            <span style={{ font: '800 10px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase', padding: '6px 8px', background: 'var(--color-text)', color: 'var(--color-bg)' }}>
              Job {activeJob.number}
            </span>
          )}
          <button type="button" onClick={() => setStatusIdx((i) => (i + 1) % STATUS_CYCLE.length)} style={filterChip(statusIdx !==
