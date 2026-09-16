import { useApp } from '../state/store.jsx';
import TabBar from '../components/TabBar.jsx';

const KIND_COLOR = {
  'Scheduled': 'var(--color-accent-700)',
  'New request': 'var(--color-text)',
  'Completed': 'var(--text-label)',
};

export default function Alerts() {
  const { alerts, markAllRead, openDetail } = useApp();

  // Preserve first-seen order of day buckets (Today, Yesterday, …).
  const order = [];
  const byDay = {};
  for (const a of alerts) {
    if (!byDay[a.day]) { byDay[a.day] = []; order.push(a.day); }
    byDay[a.day].push(a);
  }

  // Pull a REQ id out of a headline so a tap can open the request.
  const idOf = (headline) => (headline.match(/REQ-(\d+)/) || [])[1] || null;

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 14px', borderBottom: '2px solid var(--rule-strong)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05 }}>Alerts</div>
        <button type="button" onClick={markAllRead}
          style={{ background: 'transparent', border: 0, cursor: 'pointer', font: '800 10px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
          Mark all read
        </button>
      </div>

      <div className="screen__scroll" style={{ paddingBottom: 96 }}>
        {alerts.length === 0 && (
          <div style={{ padding: '28px 20px', color: 'var(--text-muted)', fontSize: 13 }}>No alerts yet.</div>
        )}
        {order.map((day, di) => (
          <div key={day}>
            <div className={'group-header' + (di > 0 ? ' group-header--sep' : '')}>{day}</div>
            {byDay[day].map((a) => {
              const id = idOf(a.headline);
              return (
                <div key={a.id}
                  onClick={() => id && openDetail(id)}
                  role={id ? 'button' : undefined}
                  tabIndex={id ? 0 : undefined}
                  style={{
                    display: 'flex', gap: 12, padding: '14px 20px',
                    borderBottom: '1px solid var(--rule-light)',
                    background: a.unread ? 'var(--color-raised)' : 'transparent',
                    cursor: id ? 'pointer' : 'default',
                  }}>
                  <span style={{
                    width: 8, height: 8, flex: 'none', marginTop: 6,
                    background: a.unread ? 'var(--color-accent)' : 'transparent',
                    border: a.unread ? 0 : '1px solid rgba(32,30,29,.3)',
                  }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: KIND_COLOR[a.kind] || 'var(--color-text)', marginBottom: 4 }}>{a.kind}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.35 }}>{a.headline}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{a.meta}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="bottombar" style={{ paddingBottom: 34 }}>
        <TabBar />
      </div>
    </div>
  );
}
