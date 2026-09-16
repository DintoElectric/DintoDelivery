import { useApp } from '../state/store.jsx';
import { ROLES } from '../data/seed.js';
import TabBar from '../components/TabBar.jsx';

// The prototype switched "viewer role" via a design-doc control. In a shipped
// app the role comes from the signed-in user; this screen exposes a switcher
// so the four role views can be demoed. Only the shop manager can schedule.
export default function Me() {
  const { role, setRole } = useApp();

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 14px', borderBottom: '2px solid var(--rule-strong)' }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05 }}>Me</div>
      </div>

      <div className="screen__scroll" style={{ paddingBottom: 96 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--rule-light)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.01em' }}>J. Dinto</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Paul Dinto Electrical · Shop 1</div>
        </div>

        <div className="group-header">Viewing as</div>
        {ROLES.map((r) => {
          const on = role === r;
          return (
            <button key={r} type="button" onClick={() => setRole(r)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                padding: '14px 20px', borderBottom: '1px solid var(--rule-light)', cursor: 'pointer',
                background: on ? 'var(--color-raised)' : 'transparent', border: 'none',
                borderBottomStyle: 'solid', borderBottomWidth: 1, borderBottomColor: 'var(--rule-light)',
                textAlign: 'left',
              }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{r}</span>
              {on && <span style={{ font: '800 10px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>Current</span>}
            </button>
          );
        })}

        <div style={{ padding: '16px 20px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Only the shop manager can assign a date, window and driver. Foremen and PMs raise
          requests; the driver marks each run completed.
        </div>
      </div>

      <div className="bottombar" style={{ paddingBottom: 34 }}>
        <TabBar />
      </div>
    </div>
  );
}
