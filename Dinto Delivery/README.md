# Prefab Delivery Scheduler

An iPhone-sized web app for a prefabrication department to coordinate material
pickups and deliveries. Four roles share one request queue — foreman/PM raise
requests, the shop manager (prefab manager) schedules them, the driver runs
them — and every request moves **Requested → Scheduled → Completed**.

Multi-user, server-backed: accounts and data live on Netlify (Functions +
Blobs), so everyone signs in from their own phone against the same shared
data. Matches the stack used by the other Paul Dinto repos (Drawings Hub,
As-Built QR app) — GitHub → Netlify, no separate server to run.

## Stack

- **Client**: React 18 + Vite, lucide-react icons, Archivo (Google Fonts).
- **Backend**: one Netlify Function (`netlify/functions/api.js`) backed by
  **Netlify Blobs** for storage. No database to provision.
- **Auth**: custom username/password (not Netlify Identity/email-based).
  Passwords are scrypt-hashed server-side; sessions are signed, expiring
  tokens. Only two accounts can ever hold the **Shop manager** (prefab
  manager) role — see below.

## One-time setup (you do this once, in Netlify)

1. **Environment variables** — Site settings → Environment variables:
   - `ADMIN_USERNAMES` — comma-separated usernames allowed to become a prefab
     manager, e.g. `john,harry`. **The length of this list is the hard cap** on
     how many manager accounts can exist — for two managers (you and Harry),
     list exactly two usernames. The server rejects any attempt, by anyone, to
     create a third manager account or a manager account under a username not
     on this list.
   - `SESSION_SECRET` — a long random string used to sign session tokens.
     Generate one with `openssl rand -base64 48`.
2. **Blobs** — nothing to do; enabled automatically per-site.
3. Deploy (connect the GitHub repo; `netlify.toml` has the build settings).

For local development, copy `.env.example` to `.env` and fill in the same two
variables, then run `netlify link` once to connect the local project to your
Netlify site (needed for `netlify dev` to provide Blobs locally).

## Run locally

    npm install
    npm run dev        # netlify dev — runs Vite + the Function together (recommended)
    npm run build       # production build -> dist/
    npm run preview     # serve the built dist/

`npm run dev` requires the Netlify CLI to be linked to your site (`netlify
link`) so Blobs and the function work locally. If you just want to poke at the
UI without a backend, `npm run dev:vite` runs the client alone, but sign-in
will fail without the function.

## First accounts

1. Open the app → **Prefab manager? Set up your account** → enter your name,
   a username from `ADMIN_USERNAMES`, and a password. Do this once for you and
   once for Harry (each with your own approved username).
2. Signed in as a manager, go to **Me → Manage** to add everyone else:
   - **Jobs** — number + name, optional primary contact.
   - **Contacts** — name, company/role, phone, email.
   - **Team** — a login (name, username, password, role) for each foreman,
     driver and PM. Only "Shop manager" is capped; the other roles are
     unlimited.
3. Each teammate signs in with their own credentials, on their own device, and
   sees only their role's views — there is no "view as" switcher, and drivers
   don't get the Requests tab.

## Security model

- Passwords are hashed with scrypt server-side; the client never has them and
  they're never stored in plaintext anywhere.
- Sessions are signed HS256 tokens with a 30-day expiry, stored in the
  browser's localStorage (only the token — not credentials).
- Role is decided by the server on every request, from the account, not the
  client — a compromised or modified client can't grant itself manager access.
- The **two-manager cap is enforced server-side** via `ADMIN_USERNAMES`, on
  both self-service setup and manager-created accounts. Changing who can be a
  manager means editing that environment variable and redeploying/restarting
  the function — not a code change.
- Netlify Blobs is Netlify's own storage product (used the same way in the
  Drawings Hub); data isn't exposed publicly — only this function can read or
  write it, and only with a valid session for anything beyond login/register.

## Screens

| Screen | File | Notes |
|--------|------|-------|
| Login / manager setup | `src/screens/Login.jsx` | sign in, or self-provision if your username is pre-approved |
| Schedule (the queue) | `src/screens/Schedule.jsx` | status tabs; FAB opens New request; calendar button (shop manager) |
| Request detail | `src/screens/RequestDetail.jsx` | shop manager schedules here; action is role-dependent |
| New request | `src/screens/NewRequest.jsx` | job + contact come from the managed lists; validated |
| Alerts | `src/screens/Alerts.jsx` | notification feed |
| Find by job | `src/screens/FindByJob.jsx` | the "Requests" tab — search + filter history (hidden for drivers) |
| Calendar | `src/screens/Calendar.jsx` | tap a banner for its sheet; drag between days / hour slots / tray |
| Me | `src/screens/Me.jsx` | your account + sign out; Manage link for shop manager |
| Manage | `src/screens/Manage.jsx` | shop-manager admin: jobs, contacts, team credentials |

## How it maps to the handoff

- **Design tokens** in `src/styles/tokens.css`, ported from the Modernist
  `styles.css` (ground `#f3f2f2`, ink `#201e1d`, accent `#ec3013`, zero radius,
  2px section rules). Screen measurements are inline, mirroring the prototype.
- **Calendar logic** in `Calendar.jsx` reproduces the prototype's single
  pointer gesture: no movement before `pointerup` = a tap that opens the
  sheet; movement = a drag with a red ghost chip. Drop onto a day cell (time
  defaults 08:00), an hour slot (date + hour), or the tray (clears date →
  Requested). Dropping onto a date promotes Requested → Scheduled; Completed
  keeps its status.
- **Record shape** matches the handoff (`id, title, type, status, day, time,
  route, job, contact`) plus references to the managed job/contact and the
  requester.

## Open questions carried over from the handoff

1. Does the driver get a stripped-down run view instead of the shared list?
2. Is a photo at the drop required before a request can be marked Completed?
3. What does the PM see when a needed-by date slips?
4. Should the shop manager combine several requests into one truck run?
