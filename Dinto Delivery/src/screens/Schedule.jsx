import { useState } from 'react';
import { Bell, CalendarDays, Plus } from 'lucide-react';
import { useApp } from '../state/store.jsx';
import { TODAY } from '../data/seed.js';
import RequestRow from '../components/RequestRow.jsx';
import TabBar from '../components/TabBar.jsx';

const STATUS_TABS = ['Requested', 'Scheduled', 'Completed'];

export default function Schedule() {
  const { requests, role, openDetail, openNew, openCalendar, setTab } = useApp();
  const [filter, setFilter] = useState('Requested');

  const counts = {
    Requested: requests.filter((r) => r.status === 'Requested').length,
    Scheduled: requests.filter((r) => r.status === 'Scheduled').length,
    Completed: requests.filter((r) => r.status === 'Completed').length,
  };

  const inFilter = requests.filter((r) => r.status === filter);

  // Group the filtered rows the way the mockup does.
  let groups = [];
  if (filter === 'Requested') {
    groups = [{ label: 'Needs a date', rows: inFilter }];
  } else if (filter === 'Scheduled') {
    const today = inFilter.filter((r) => r.day === TODAY);
    const upcoming = inFilter.filter((r) => r.day == null || r.day > TODAY);
    const earlier = inFilter.filter((r) => r.day != null && r.day < TODAY);
    groups = [
      { label: 'On the truck today', rows: today },
      { label: 'Upcoming', rows: upcoming },
      { label: 'Earlier', rows: earlier },
    ].filter((g) => g.rows.length);
  } else {
    groups = [{ label: 'Completed', rows: inFilter }];
  }

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding: '10px 20px 14px', borderBottom: '2px solid var(--rule-strong)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Tue 15 Sep · {role}</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05 }}>Schedule</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {role === 'Shop manager' && (
              <button type="button" onClick={openCalendar} aria-label="Open calendar"
                style={sqBtn}>
                <CalendarDays size={18} strokeWidth={2} />
              </button>
            )}
            <button type="button" onClick={() => setTab('alerts')} aria-label="Alerts"
              style={{ ...sqBtn, position: 'relative' }}>
              <Bell size={18} strokeWidth={2} />
              <span style={{ position: 'absolute', top: -1, right: -1, width: 9, height: 9, background: 'var(--color-accent)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--rule-strong)' }}>
        {STATUS_TABS.map((s, i) => {
          const active = filter === s;
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
              style={{
                flex: 1, padding: '11px 8px', textAlign: 'center', cursor: 'pointer',
                font: '800 11px/1 var(--font)', letterSpacing: '.06em', textTransform: 'uppercase',
                border: 0, borderLeft: i === 0 ? 0 : '1px solid var(--border-input)',
                background: active ? 'var(--color-text)' : 'transparent',
                color: active ? 'var(--color-bg)' : 'rgba(32,30,29,.75)',
              }}>
              {s}{counts[s] ? ' ' + counts[s] : ''}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="screen__scroll" style={{ paddingBottom: 108 }}>
        {groups.length === 0 || groups.every((g) => !g.rows.length) ? (
          <div style={{ padding: '28px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
            Nothing here right now.
          </div>
        ) : groups.map((g, gi) => (
          <div key={g.label}>
            <div className={'group-header' + (gi > 0 ? ' group-header--sep' : '')}>{g.label}</div>
            {g.rows.map((r) => <RequestRow key={r.id} req={r} onOpen={openDetail} />)}
          </div>
        ))}
      </div>

      {/* Fixed bottom bar */}
      <div className="bottombar" style={{ paddingBottom: 34 }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--rule-light)' }}>
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={15} strokeWidth={2.4} color="var(--color-bg)" />
            New request
          </button>
        </div>
        <TabBar />
      </div>
    </div>
  );
}

const sqBtn = {
  width: 40, height: 40, border: '1px solid var(--border-input)', background: 'transparent',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};
