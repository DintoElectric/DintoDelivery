import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../state/store.jsx';
import { JOBS } from '../data/seed.js';
import { StatusChip } from '../components/Chip.jsx';
import { fmtDayTime } from '../lib/format.js';
import TabBar from '../components/TabBar.jsx';

const STATUS_CYCLE = ['Any status', 'Requested', 'Scheduled', 'Completed'];

export default function FindByJob() {
  const { reqs, openDetail } = useApp();
  const [query, setQuery] = useState('24-118');
  const [statusIdx, setStatusIdx] = useState(0);
  const status = STATUS_CYCLE[statusIdx];

  const q = query.trim().toLowerCase();
  const results = reqs.filter((r) => {
    const matchesQ = !q || r.job.toLowerCase().includes(q)
      || r.title.toLowerCase().includes(q) || ('req-' + r.id).includes(q) || r.id.includes(q);
    const matchesStatus = status === 'Any status' || r.status === status;
    return matchesQ && matchesStatus;
  });

  const activeJob = JOBS.find((j) => q && j.number.toLowerCase() === q);
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
          <button type="button" onClick={() => setStatusIdx((i) => (i + 1) % STATUS_CYCLE.length)} style={filterChip(statusIdx !== 0)}>
            {status}
          </button>
          <button type="button" style={filterChip(false)}>This week</button>
        </div>
      </div>

      {/* Results */}
      <div className="screen__scroll" style={{ paddingBottom: 96 }}>
        <div className="group-header">{countLabel}</div>
        {results.length === 0 ? (
          <div style={{ padding: '28px 20px', color: 'var(--text-muted)', fontSize: 13 }}>No matching requests.</div>
        ) : results.map((r) => (
          <div key={r.id} onClick={() => openDetail(r.id)} role="button" tabIndex={0}
            style={{ padding: '13px 20px', borderBottom: '1px solid var(--rule-light)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <StatusChip status={r.status} />
              <span style={{ marginLeft: 'auto', font: '600 11px/1 var(--font)', color: 'var(--text-label)' }}>REQ-{r.id}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{r.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {r.day != null ? fmtDayTime(r.day, r.time) + (r.driver ? ' · ' + r.driver : '') : 'Needed ' + (r.neededBy || '—')}
            </div>
          </div>
        ))}
      </div>

      <div className="bottombar" style={{ paddingBottom: 34 }}>
        <TabBar />
      </div>
    </div>
  );
}

function filterChip(active) {
  return {
    font: '800 10px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase',
    padding: '6px 8px', cursor: 'pointer',
    background: active ? 'var(--color-text)' : 'transparent',
    color: active ? 'var(--color-bg)' : 'var(--color-text)',
    border: active ? 0 : '1px solid var(--border-input)',
  };
}
