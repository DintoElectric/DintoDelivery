import { DOW, SLOTS } from '../data/seed.js';

// "09:00" -> "9:00 AM". Empty/null -> "".
export function fmtTime(t) {
  if (!t) return '';
  const h = parseInt(t.slice(0, 2), 10);
  const m = t.slice(3);
  return ((h % 12) || 12) + ':' + m + (h < 12 ? ' AM' : ' PM');
}

// September 2026 begins on a Tuesday, so day N's weekday index is (N + 1) % 7.
export function dowIndex(day) {
  return (day + 1) % 7;
}

// "Wed 16 Sep" for a day number in September.
export function fmtDay(day) {
  if (day == null) return 'Not scheduled yet';
  return DOW[dowIndex(day)] + ' ' + day + ' Sep';
}

// "Wed 16 Sep, 9:00 AM"
export function fmtDayTime(day, time) {
  if (day == null) return 'Not scheduled yet';
  return fmtDay(day) + (time ? ', ' + fmtTime(time) : '');
}

// Build the 5x7 month grid for September 2026 (Sunday-first, 30 days).
// Returns weeks -> cells, each cell: { key, num, day|null, inMonth }.
export function monthGrid() {
  const weeks = [];
  for (let w = 0; w < 5; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const n = w * 7 + d - 1; // Sep 1 lands on column index 2 (Tue)
      const inMonth = n >= 1 && n <= 30;
      cells.push({ key: w + '-' + d, num: inMonth ? String(n) : '', day: inMonth ? n : null, inMonth });
    }
    weeks.push({ key: 'w' + w, cells });
  }
  return weeks;
}

export { SLOTS };

// Map a status to its chip modifier class.
export function statusChipClass(status) {
  if (status === 'Scheduled') return 'chip chip--scheduled';
  if (status === 'Completed') return 'chip chip--completed';
  return 'chip chip--requested';
}

// Map a type to its chip modifier class.
export function typeChipClass(type) {
  return type === 'Pickup' ? 'chip chip--pickup' : 'chip chip--delivery';
}
