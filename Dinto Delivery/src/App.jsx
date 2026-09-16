import { useApp } from './state/store.jsx';
import PhoneFrame from './components/PhoneFrame.jsx';
import Login from './screens/Login.jsx';
import Schedule from './screens/Schedule.jsx';
import FindByJob from './screens/FindByJob.jsx';
import Alerts from './screens/Alerts.jsx';
import Me from './screens/Me.jsx';
import RequestDetail from './screens/RequestDetail.jsx';
import NewRequest from './screens/NewRequest.jsx';
import Calendar from './screens/Calendar.jsx';
import Manage from './screens/Manage.jsx';

const TAB_SCREENS = {
  schedule: Schedule,
  requests: FindByJob,
  alerts: Alerts,
  me: Me,
};

export default function App() {
  const { status, currentUser, role, tab, stack } = useApp();

  if (status === 'loading') {
    return (
      <PhoneFrame>
        <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>Loading…</div>
        </div>
      </PhoneFrame>
    );
  }

  if (!currentUser) {
    return <PhoneFrame><Login /></PhoneFrame>;
  }

  // Drivers have no Requests tab; never resolve to it.
  const effectiveTab = (role === 'Driver' && tab === 'requests') ? 'schedule' : tab;
  const Base = TAB_SCREENS[effectiveTab] || Schedule;

  return (
    <PhoneFrame>
      <Base />
      {stack.map((ov, i) => {
        if (ov.type === 'detail') return <RequestDetail key={i} id={ov.id} />;
        if (ov.type === 'new') return <NewRequest key={i} />;
        if (ov.type === 'calendar') return <Calendar key={i} />;
        if (ov.type === 'manage') return <Manage key={i} />;
        return null;
      })}
    </PhoneFrame>
  );
}
