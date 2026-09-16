import { useApp } from './state/store.jsx';
import PhoneFrame from './components/PhoneFrame.jsx';
import Schedule from './screens/Schedule.jsx';
import FindByJob from './screens/FindByJob.jsx';
import Alerts from './screens/Alerts.jsx';
import Me from './screens/Me.jsx';
import RequestDetail from './screens/RequestDetail.jsx';
import NewRequest from './screens/NewRequest.jsx';
import Calendar from './screens/Calendar.jsx';

const TAB_SCREENS = {
  schedule: Schedule,
  requests: FindByJob,
  alerts: Alerts,
  me: Me,
};

export default function App() {
  const { tab, stack } = useApp();
  const Base = TAB_SCREENS[tab] || Schedule;

  return (
    <PhoneFrame>
      <Base />
      {stack.map((ov, i) => {
        if (ov.type === 'detail') return <RequestDetail key={i} id={ov.id} />;
        if (ov.type === 'new') return <NewRequest key={i} />;
        if (ov.type === 'calendar') return <Calendar key={i} />;
        return null;
      })}
    </PhoneFrame>
  );
}
