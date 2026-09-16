import { LogOut, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { useApp } from '../state/store.jsx';
import TabBar from '../components/TabBar.jsx';

// The logged-in user's own screen. No role switching — you see only your role.
export default function Me() {
  const { currentUser, role, logout, openManage } = useApp();

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 14px', borderBottom: '2px solid var(--rule-strong)' }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05 }}>Me</div>
      </div>

      <div className="screen__scroll" style={{ paddingBottom: 96 }}>
        <div style={{ padding: '18px 20px', borderBottom: '2px solid var(--rule-strong)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.01em' }}>{currentUser?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>@{currentUser?.username} · {role}</div>
        </div>

        {role === 'Shop manager' && (
          <>
            <div className="group-header">Administration</div>
            <button type="button" onClick={openManage}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '16px 20px', background: 'transparent', border: 0, borderBottom: '1px solid var(--rule-light)', cursor: 'pointer', textAlign: 'left' }}>
              <SlidersHorizontal size={18} strokeWidth={2} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Manage jobs, contacts & team</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add jobs, site contacts and login accounts</div>
              </div>
              <ChevronRight size={18} strokeWidth={2} color="var(--text-label)" />
            </button>
          </>
        )}

        <div className="group-header group-header--sep">Session</div>
        <button type="button" onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '16px 20px', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left' }}>
          <LogOut size={18} strokeWidth={2} color="var(--color-accent)" />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-accent)' }}>Sign out</span>
        </button>
      </div>

      <div className="bottombar" style={{ paddingBottom: 34 }}>
        <TabBar />
      </div>
    </div>
  );
}
