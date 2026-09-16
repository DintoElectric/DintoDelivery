# Prefab Delivery Scheduler

An iPhone-sized web app for a prefabrication department to coordinate material
pickups and deliveries. Built from the `design_handoff_delivery_scheduler`
package (Modernist design system). Four roles share one request queue —
foreman/PM raise requests, the shop manager schedules them, the driver runs them
— and every request moves **Requested → Scheduled → Completed**.

## Stack

- **React 18 + Vite** — matches the interactivity the handoff calls for (the
  drag-and-drop calendar, role switching, form validation).
- **lucide-react** for icons (the handoff's recommended replacement for the
  inline SVG placeholders).
- **Archivo** from Google Fonts. No other runtime dependencies.

## Run locally

    npm install
    npm run dev      # http://localhost:5173
    npm run build    # production build -> dist/
    npm run preview  # serve the built dist/

## Deploy to Netlify

`netlify.toml` is included and needs no changes:

- build command `npm run build`, publish directory `dist`
- an SPA redirect (`/* -> /index.html`) so client navigation survives reloads

Either connect the GitHub repo in the Netlify UI (New site from Git → pick repo →
defaults are read from `netlify.toml`), or drag the built `dist/` folder onto
Netlify. No environment variables are required.

## Screens

| # | Screen | File | Notes |
|---|--------|------|-------|
| 01 | Schedule (the queue) | `src/screens/Schedule.jsx` | status tabs filter; FAB opens New request |
| 02 | Request detail | `src/screens/RequestDetail.jsx` | shop manager schedules here; action is role-dependent |
| 03 | New request | `src/screens/NewRequest.jsx` | validated form; Submit disabled until required fields set |
| 04 | Alerts | `src/screens/Alerts.jsx` | notification feed; Mark all read |
| 05 | Find by job | `src/screens/FindByJob.jsx` | the "Requests" tab — search + filter history |
| 06 | Calendar | `src/screens/Calendar.jsx` | tap a banner for its sheet; drag between days / hour slots / tray |

## How it maps to the handoff

- **Design tokens** live in `src/styles/tokens.css`, ported from the Modernist
  `styles.css` (ground `#f3f2f2`, ink `#201e1d`, accent `#ec3013`, zero radius,
  2px section rules, 1px row rules). Screen-specific measurements are inline in
  each screen, mirroring the prototype's markup.
- **Calendar logic** in `Calendar.jsx` reproduces the prototype's single
  pointer gesture: no movement before `pointerup` = a **tap** that opens the
  detail sheet; movement = a **drag** with a red ghost chip. Drop targets:
  a month day cell (sets the date, time defaults to 08:00), a day-strip hour
  slot (sets date + hour), or the unscheduled tray (clears the date, reverts to
  Requested). Dropping onto a date promotes Requested → Scheduled; Completed
  keeps its status.
- **September 2026** is derived, not hard-coded: the month starts on a Tuesday,
  30 days, Sunday-first (`src/lib/format.js` → `monthGrid`).
- **State** matches the handoff's record shape (`id, title, type, status, day,
  time, route, job, contact`) plus display extras, in `src/state/store.jsx`.

## Wiring decisions (not specified by the handoff)

The handoff left navigation between some screens open ("No page transitions were
specified"). Choices made here, easy to change:

- The four named tabs (Schedule, Requests, Alerts, Me) map to screens 01, 05,
  04, and a small **Me** screen that also hosts the role switcher (the
  prototype's "viewer role" control needs a home in a shipped app).
- The **Calendar** (06) is reached from a calendar button in the Schedule header,
  shown only for the shop manager (the only role that schedules).
- Data is in-memory (seeded from the handoff). No backend yet — see the handoff's
  "State management" and "Open questions" for the real data/notification needs.

## Open questions carried over from the handoff

1. Does the driver get a stripped-down run view instead of the shared list?
2. Is a photo at the drop required before a request can be marked Completed?
3. What does the PM see when a needed-by date slips?
4. Should the shop manager combine several requests into one truck run?
