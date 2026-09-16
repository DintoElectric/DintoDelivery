import { Calendar, FileText, Bell, User } from 'lucide-react';
import { useApp } from '../state/store.jsx';

const TABS = [
  { key: 'schedule', label: 'Schedule', Icon: Calendar },
  { key: 'requests', label: 'Requests', Icon: FileText },
  { key: 'alerts',   label: 'Alerts',   Icon: Bell },
  { key: 'me',       label: 'Me',       Icon: User },
];

export default function TabBar() {
  const { tab, setTab, alerts } = useApp();
  const unread = alerts.some((a) => a.unread);

  return (
    <div className="tabbar">
      {TABS.map(({ key, label, Icon }) => {
        const active = tab === key;
        const color = active ? 'var(--color-accent)' : 'var(--text-label)';
        return (
          <button
            key={key}
            type="button"
            className={'tabbar__cell' + (active ? ' tabbar__cell--active' : '')}
            onClick={() => setTab(key)}
            aria-current={active ? 'page' : undefined}
          >
            <span style={{ position: 'relative', display: 'block' }}>
              <Icon size={20} strokeWidth={2} color={color} />
              {key === 'alerts' && unread && (
                <span style={{
                  position: 'absolute', top: -1, right: -3, width: 8, height: 8,
                  background: 'var(--color-accent)',
                }} />
              )}
            </span>
            <span className="tabbar__label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
