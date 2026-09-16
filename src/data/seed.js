// Constants only. All operational data (jobs, contacts, users, requests,
// alerts) is entered by the shop manager and persisted via src/lib/db.js —
// there is no preloaded content.

// The calendar renders a fixed demo month. Swap these for a real date library
// when the calendar needs to page across months.
export const TODAY = 15;
export const MONTH_LABEL = 'September';
export const YEAR = '2026';

// Hourly slots on the day strip, 06:00–16:00.
export const SLOTS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00',
];

export const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Roles. "Shop manager" is the prefab manager / administrator: the only role
// that can set up jobs, contacts and user accounts, and the only one that can
// schedule a run.
export const ROLES = ['Shop manager', 'Field foreman', 'Driver', 'Project manager'];

// Role-dependent primary action on the request-detail screen.
export const ROLE_ACTION = {
  'Shop manager': 'Schedule this run',
  'Field foreman': 'Nudge the shop',
  'Driver': 'Mark completed',
  'Project manager': 'Follow this request',
};
