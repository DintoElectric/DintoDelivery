import { ArrowRight } from 'lucide-react';
import { StatusChip, TypeChip } from './Chip.jsx';
import { fmtTime } from '../lib/format.js';

// A row in the Schedule queue (screen 01). Unscheduled rows show the route
// line and needed-by; scheduled rows show the time and the run detail line.
export default function RequestRow({ req, onOpen }) {
  const scheduled = req.status === 'Scheduled' || req.status === 'Completed';
  const [origin, dest] = req.route.split(' → ');

  return (
    <div
      className={'req-row' + (scheduled ? '' : ' req-row--raised')}
      onClick={() => onOpen(req.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(req.id); }}
    >
      <div className="req-row__meta">
        <StatusChip status={req.status} />
        {scheduled
          ? (req.time && <span style={{ font: '600 11px/1 var(--font)' }}>{fmtTime(req.time)}</span>)
          : <TypeChip type={req.type} />}
        <span className="req-row__id">REQ-{req.id}</span>
      </div>

      <div className="req-row__title">{req.title}</div>

      {!scheduled && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 12, fontWeight: 600, marginBottom: 5,
        }}>
          <span style={{ width: 7, height: 7, background: 'var(--color-text)', flex: 'none' }} />
          <span>{origin}</span>
          <ArrowRight size={14} strokeWidth={1.6} />
          <span>{dest}</span>
        </div>
      )}

      <div className="req-row__detail">
        {scheduled
          ? `${req.route} · Job ${req.job}${req.driver ? ' · Driver: ' + req.driver : ''}`
          : `Needed by ${req.neededBy || '—'} · Job ${req.job} · ${req.contact}`}
      </div>
    </div>
  );
}
