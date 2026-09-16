// Seed content, lifted from the handoff (screen copy + the calendar's REQS).
// "Today" in the mockups is Tue 15 Sep 2026; the month shown is September 2026,
// which starts on a Tuesday (30 days). All day numbers are days-of-September.

export const TODAY = 15;
export const MONTH_LABEL = 'September';
export const YEAR = '2026';

// Hourly slots shown on the day strip, 06:00–16:00.
export const SLOTS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00',
];

export const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// The four viewer roles. Only the shop manager can schedule.
export const ROLES = ['Shop manager', 'Field foreman', 'Driver', 'Project manager'];

// Role-dependent primary action on the request-detail screen.
export const ROLE_ACTION = {
  'Shop manager': 'Schedule this run',
  'Field foreman': 'Nudge the shop',
  'Driver': 'Mark completed',
  'Project manager': 'Follow this request',
};

// Jobs for the picker.
export const JOBS = [
  { number: '24-118', name: 'Northgate Medical' },
  { number: '24-090', name: 'Riverside Tower' },
];

export const DRIVERS = ['M. Okafor'];

// The single request record shape (see handoff → State management):
//   id, title, type, status, day, time, route, job, contact
// day: number | null (null = unscheduled / tray). time: "HH:MM" | null.
// driver / neededBy are display extras used by the Schedule list.
export const SEED_REQUESTS = [
  { id: '1039', title: 'Empty spools returned to Shop 1', type: 'Pickup', status: 'Completed', route: 'Riverside Tower → Shop 1', job: '24-090', contact: 'D. Whitfield', driver: 'M. Okafor', day: 14, time: '06:00' },
  { id: '1042', title: '12 pre-bent conduit racks, levels 4–6', type: 'Delivery', status: 'Scheduled', route: 'Shop 1 → Northgate Medical, Gate 2', job: '24-118', contact: 'R. Alvarez', driver: 'M. Okafor', day: 15, time: '09:00' },
  { id: '1044', title: 'Panel boards, switchgear trim, two carts', type: 'Delivery', status: 'Scheduled', route: 'Mercer Warehouse → Riverside Tower', job: '24-090', contact: 'D. Whitfield', driver: 'M. Okafor', day: 15, time: '13:00' },
  { id: '1051', title: 'Feeder pull cans, roof level', type: 'Delivery', status: 'Scheduled', route: 'Shop 1 → Northgate Medical, Gate 2', job: '24-118', contact: 'R. Alvarez', driver: 'M. Okafor', day: 18, time: '10:00' },
  { id: '1048', title: '6 lighting whips, 3rd floor east — pre-cut and labeled', type: 'Delivery', status: 'Requested', route: 'Shop 1 · Bay C → Northgate Medical · Gate 2', job: '24-118', contact: 'R. Alvarez', neededBy: 'Thu 17 Sep, 7:00 AM', day: null, time: null },
  { id: '1047', title: 'Return 4 empty wire spools and unused strut', type: 'Pickup', status: 'Requested', route: 'Riverside Tower · Loading dock → Shop 1', job: '24-090', contact: 'D. Whitfield', neededBy: 'Fri 18 Sep, anytime', day: null, time: null },
];

// Per-request extra detail used by the detail screen (screen 02). Keyed by id.
export const REQUEST_DETAIL = {
  '1048': {
    raisedBy: 'R. Alvarez, foreman',
    raisedAt: 'Mon 14 Sep, 3:42 PM',
    neededBy: 'Thu 17 Sep',
    neededByNote: '7:00 AM, before crew start',
    pickup: 'Shop 1, Bay C',
    dropoff: '4100 Northgate Way, Gate 2',
    routeNote: 'Gate 2 is locked before 6:30 AM. Call ahead.',
    contactName: 'R. Alvarez',
    contactPhone: '(206) 555-0148',
    jobName: 'Northgate Medical',
  },
};

// Alerts feed (screen 04). unread + kind drive the styling.
export const SEED_ALERTS = [
  { id: 'a1', day: 'Today', kind: 'Scheduled', unread: true,
    headline: 'REQ-1042 set for today, 9:30 AM — 12 pre-bent conduit racks',
    meta: 'Shop 1 → Northgate Medical · Driver M. Okafor · 7:12 AM' },
  { id: 'a2', day: 'Today', kind: 'New request', unread: true,
    headline: 'R. Alvarez requested a delivery for Thu 17 Sep — REQ-1048',
    meta: 'Job 24-118 · needs a date · 6:48 AM' },
  { id: 'a3', day: 'Today', kind: 'Completed', unread: false,
    headline: 'REQ-1039 delivered and signed for at Riverside Tower',
    meta: 'M. Okafor · 6:05 AM' },
  { id: 'a4', day: 'Yesterday', kind: 'Scheduled', unread: false,
    headline: 'REQ-1044 moved to Tue 15 Sep, 1:15 PM',
    meta: 'Mercer Warehouse pickup added to the same run · 4:20 PM' },
  { id: 'a5', day: 'Yesterday', kind: 'Completed', unread: false,
    headline: 'REQ-1037 empty spools returned to Shop 1',
    meta: 'M. Okafor · 2:55 PM' },
];
