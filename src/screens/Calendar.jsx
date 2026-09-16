import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../state/store.jsx';
import { SLOTS, YEAR, MONTH_LABEL } from '../data/seed.js';
import { monthGrid, fmtTime, fmtDay } from '../lib/format.js';
import { StatusChip, TypeChip } from '../components/Chip.jsx';

// Banner (request chip) visual style, per handoff: no radius, flush left,
// single line with ellipsis. Fill depends on status.
function bannerStyle(status, big) {
  const base = {
    display: 'block', width: '100%', textAlign: 'left', border: 0,
    font: `800 ${big ? 12 : 11}px/1.15 var(--font)`, letterSpacing: '.02em',
    padding: big ? '7px 9px' : '7px 4px', minHeight: big ? 0 : 28,
    cursor: 'grab', touchAction: 'none', overflow: 'hidden',
    whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: 2,
  };
  if (status === 'Completed') return { ...base, background: '#d7d3d3', color: '#444141' };
  if (status === 'Requested') return { ...base, background: '#ffe0d9', color: '#7c1405', boxShadow: 'inset 0 0 0 1px #ec3013' };
  return { ...base, background: '#201e1d', color: '#f3f2f2' };
}

export default function Calendar() {
  const { requests, moveRequest, back, openDetail, pausePolling, resumePolling } = useApp();
  const [selectedDay, setSelectedDay] = useState(15);
  const [sheetId, setSheetId] = useState(null);
  const [drag, setDrag] = useState(null);   // { id, x, y, moved }
  const [hover, setHover] = useState(null);  // drop-target key

  // Mirror drag/hover in refs so the pointerup closure reads the latest values.
  const dragRef = useRef(null);
  const hoverRef = useRef(null);

  const startDrag = (id, e) => {
    e.preventDefault();
    // Hold off background refreshes for the duration of this gesture (tap or
    // drag) so a poll landing mid-interaction can't shift banners underfoot.
    pausePolling();
    const begin = { id, x: e.clientX, y: e.clientY, moved: false };
    dragRef.current = begin; hoverRef.current = null;
    setDrag(begin); setHover(null);

    const move = (ev) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const t = el && el.closest('[data-drop]');
      const key = t ? t.getAttribute('data-drop') : null;
      const next = { id, x: ev.clientX, y: ev.clientY, moved: true };
      dragRef.current = next; hoverRef.current = key;
      setDrag(next); setHover(key);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      resumePolling();
      const d = dragRef.current;
      const h = hoverRef.current;
      dragRef.current = null; hoverRef.current = null;
      if (!d || !d.moved) { setDrag(null); setHover(null); setSheetId(id); return; }
      if (h && h !== 'none') {
        const parts = h.split('|');
        const day = parts[0] === 'tray' ? null : parseInt(parts[0], 10);
        const time = parts[1] || (day === null ? null : '08:00');
        moveRequest(id, day, time);
        if (day !== null) setSelectedDay(day);
      }
      setDrag(null); setHover(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const Banner = ({ r, big }) => (
    <button type="button" style={bannerStyle(r.status, big)} onPointerDown={(e) => startDrag(r.id, e)}>
      {r.id + (big ? ' · ' + r.title : '')}
    </button>
  );

  const weeks = monthGrid();
  const tray = requests.filter((r) => r.day === null);
  const slots = SLOTS.map((t) => ({
    key: t, label: fmtTime(t), drop: selectedDay + '|' + t,
    banners: requests.filter((r) => r.day === selectedDay && r.time === t),
  }));
  const sheet = requests.find((r) => r.id === sheetId) || null;
  const dragReq = drag ? requests.find((r) => r.id === drag.id) : null;

  return (
    <div className="screen anim-push" style={{ position: 'absolute' }}>
      {/* Back nav (wiring: the calendar is pushed from Schedule) */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px 10px', borderBottom: '2px solid var(--rule-strong)' }}>
        <button type="button" onClick={back}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: 0, cursor: 'pointer', font: '800 11px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
          <ChevronLeft size={14} strokeWidth={2.4} color="var(--color-accent)" />Schedule
        </button>
      </div>

      {/* Month header */}
      <div style={{ padding: '10px 20px 12px', borderBottom: '2px solid var(--rule-strong)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 3 }}>{YEAR}</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05 }}>{MONTH_LABEL}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={monthNavBtn}><ChevronLeft size={14} strokeWidth={2.2} /></div>
          <div style={monthNavBtn}><ChevronRight size={14} strokeWidth={2.2} /></div>
        </div>
      </div>

      {/* Unscheduled tray (a drop target) */}
      <div data-drop="tray" style={{ padding: '10px 20px 12px', borderBottom: '2px solid var(--rule-strong)', background: hover === 'tray' ? '#ffe0d9' : 'var(--color-surface)' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          {tray.length} {tray.length === 1 ? 'request' : 'requests'} unscheduled — drag onto a day
        </div>
        {tray.map((r) => <Banner key={r.id} r={r} big />)}
      </div>

      <div className="screen__scroll">
        {/* Weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--rule-light)' }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
            <div key={d} style={{ padding: '6px 0', textAlign: 'center', font: '800 9px/1 var(--font)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>{d}</div>
          ))}
        </div>

        {/* Month grid */}
        {weeks.map((week) => (
          <div key={week.key} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--rule-light)' }}>
            {week.cells.map((cell) => {
              const sel = cell.inMonth && cell.day === selectedDay;
              const hot = cell.inMonth && hover === String(cell.day);
              const bg = !cell.inMonth ? 'var(--color-outofmonth)' : (hot ? '#ffe0d9' : (sel ? 'var(--color-surface)' : 'var(--color-bg)'));
              const numColor = !cell.inMonth ? 'transparent' : (sel ? 'var(--color-accent)' : 'rgba(32,30,29,.75)');
              return (
                <div key={cell.key}
                  data-drop={cell.inMonth ? String(cell.day) : 'none'}
                  onClick={() => cell.inMonth && setSelectedDay(cell.day)}
                  style={{ minHeight: 108, padding: 4, borderRight: '1px solid var(--rule-hairline)', background: bg }}>
                  <div style={{ font: '800 11px/1 var(--font)', marginBottom: 3, color: numColor }}>{cell.num}</div>
                  {cell.inMonth && requests.filter((r) => r.day === cell.day).map((r) => <Banner key={r.id} r={r} />)}
                </div>
              );
            })}
          </div>
        ))}

        {/* Day strip */}
        <div style={{ borderTop: '2px solid var(--rule-strong)', padding: '12px 20px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em' }}>{fmtDay(selectedDay)}</div>
          <div className="eyebrow">Drop into a slot</div>
        </div>
        {slots.map((slot) => (
          <div key={slot.key} data-drop={slot.drop}
            style={{ display: 'flex', gap: 12, padding: '0 20px', borderTop: '1px solid var(--rule-light)', background: hover === slot.drop ? '#ffe0d9' : 'transparent', minHeight: 46 }}>
            <div style={{ width: 56, flex: 'none', paddingTop: 8, font: '600 11px/1 var(--font)', color: 'var(--text-label)' }}>{slot.label}</div>
            <div style={{ flex: 1, minWidth: 0, padding: '6px 0' }}>
              {slot.banners.map((r) => <Banner key={r.id} r={r} big />)}
            </div>
          </div>
        ))}
        <div style={{ height: 60 }} />
      </div>

      {/* Detail sheet */}
      {sheet && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--color-raised)', borderTop: '2px solid var(--rule-strong)', boxShadow: 'var(--shadow-sheet)', padding: '16px 20px 44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 7 }}>
              <span style={{ font: '800 10px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase', padding: '4px 6px', background: 'var(--color-text)', color: 'var(--color-bg)' }}>REQ-{sheet.id}</span>
              <StatusChip status={sheet.status} />
              <TypeChip type={sheet.type} />
            </div>
            <button type="button" onClick={() => setSheetId(null)}
              style={{ border: 0, background: 'transparent', padding: 4, cursor: 'pointer', font: '800 10px/1 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Close</button>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.015em', lineHeight: 1.2, marginBottom: 10 }}>{sheet.title}</div>
          <div style={{ display: 'flex', borderTop: '1px solid var(--rule-light)', borderBottom: '1px solid var(--rule-light)', marginBottom: 12 }}>
            <div style={{ flex: 1, padding: '9px 0', borderRight: '1px solid var(--rule-light)' }}>
              <div style={{ font: '800 9px/1 var(--font)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 4 }}>When</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{sheet.day != null ? `${fmtDay(sheet.day)}, ${fmtTime(sheet.time)}` : 'Not scheduled yet'}</div>
            </div>
            <div style={{ flex: 1, padding: '9px 0 9px 12px' }}>
              <div style={{ font: '800 9px/1 var(--font)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: 4 }}>Job</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{sheet.job}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{sheet.route}{sheet.contact ? ' · ' + sheet.contact : ''}</div>
          <button type="button" className="btn-primary" onClick={() => { const id = sheet.id; setSheetId(null); openDetail(id); }}>Open full request</button>
        </div>
      )}

      {/* Drag ghost */}
      {drag && drag.moved && dragReq && createPortal(
        <div style={{
          position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%,-50%)',
          zIndex: 9999, pointerEvents: 'none', background: '#ec3013', color: '#f3f2f2',
          font: '800 12px/1.15 var(--font)', padding: '8px 10px', maxWidth: 260,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          boxShadow: 'var(--shadow-ghost)',
        }}>{dragReq.id + ' · ' + dragReq.title}</div>,
        document.body
      )}
    </div>
  );
}

const monthNavBtn = {
  width: 34, height: 34, border: '1px solid var(--border-input)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};
