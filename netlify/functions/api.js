// Single serverless API for the Prefab Delivery Scheduler.
// Stack matches the other Paul Dinto repos: Netlify Functions + Netlify Blobs.
// Auth is custom (Option A): the prefab manager provisions username/password
// accounts and assigns roles. Passwords are scrypt-hashed; sessions are signed
// HS256 tokens. No plaintext or credentials ever leave the server.
//
// Concurrency: Netlify Blobs has no built-in locking — two overlapping writes
// to the same key are "last write wins" by default, which can silently drop
// one of them (see https://docs.netlify.com/build/data-and-storage/netlify-blobs/).
// Every write in this file goes through mutateDB() below, which uses
// conditional writes (onlyIfMatch/onlyIfNew, added in @netlify/blobs 10.0.0)
// and retries the whole read-mutate-write cycle against fresh data if another
// request wrote in between. This isn't a full transactional database — Netlify
// itself recommends a real DB (Netlify DB / Postgres) for relational data at
// serious scale — but for this app's size (a couple of managers, a handful of
// field accounts) it closes the gap that let one write silently overwrite
// another when two requests landed at nearly the same moment.
//
// Required environment variables (set in Netlify → Site settings → Environment,
// and in a local .env for `netlify dev`):
//   ADMIN_USERNAMES  comma-separated usernames allowed to hold the "Shop manager"
//                    role, e.g. "john,harry". Its length is the hard cap on how
//                    many prefab managers can exist (two, here).
//   SESSION_SECRET   long random string used to sign session tokens.

import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const DB_KEY = 'db';

function emptyDB() {
  return { users: [], contacts: [], jobs: [], requests: [], alerts: [], nextId: 1001 };
}

function adminUsernames() {
  return (process.env.ADMIN_USERNAMES || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}
function isAdminUsername(username) {
  return adminUsernames().includes(String(username).trim().toLowerCase());
}

// --- password hashing (scrypt) -------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return test.length === known.length && crypto.timingSafeEqual(test, known);
}

// --- minimal HS256 JWT ----------------------------------------------------
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function signToken(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }));
  const sig = b64url(crypto.createHmac('sha256', secret).update(header + '.' + body).digest());
  return header + '.' + body + '.' + sig;
}
function verifyToken(token) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const expected = b64url(crypto.createHmac('sha256', secret).update(h + '.' + b).digest());
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(b.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
}

const publicUser = (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role });
function publicState(db, me) {
  return {
    me: me ? publicUser(me) : null,
    users: db.users.map(publicUser),
    contacts: db.contacts, jobs: db.jobs, requests: db.requests, alerts: db.alerts,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
const err = (message, status = 400) => json({ ok: false, error: message }, status);

// Throw this from inside a mutateDB() callback for a validation/permission
// failure — it propagates straight out (no retry) and is turned into a JSON
// error response by the outer catch at the bottom of the handler.
function fail(status, message) { throw { status, message }; }

function alert({ kind, headline, meta }) {
  const now = new Date();
  return {
    id: uid('al'), day: 'Today', kind, headline, meta: meta || '',
    at: now.toISOString(), unread: true,
  };
}

async function readDB(store) {
  const existing = await store.getWithMetadata(DB_KEY, { type: 'json' });
  return { db: (existing && existing.data) || emptyDB(), etag: existing ? existing.etag : undefined };
}

// Safely read-modify-write the shared DB blob. `fn(db)` mutates `db` in place
// (and may return a value, e.g. a newly created record) or call fail(...) to
// abort with a specific error. On a write conflict (another request wrote in
// between our read and our write) the whole cycle — fresh read, fn again,
// write again — retries against the latest data, a few times with a short
// random backoff, before giving up.
async function mutateDB(store, fn) {
  const MAX_ATTEMPTS = 6;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { db, etag } = await readDB(store);
    const result = fn(db); // may throw via fail(); propagates immediately, no retry
    const writeOpts = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
    const { modified } = await store.setJSON(DB_KEY, db, writeOpts);
    if (modified) return { db, result };
    await new Promise((resolve) => setTimeout(resolve, 25 + Math.floor(Math.random() * 60)));
  }
  fail(503, 'The shop schedule is busy right now — please try again in a moment.');
}

export default async (req) => {
  // Everything below is wrapped in one outer try/catch so any unexpected
  // failure — a missing env var, a Blobs hiccup, anything — always comes back
  // as a readable JSON error the client can show, instead of an unhandled
  // crash that Netlify turns into a generic error page.
  try {
    if (req.method !== 'POST') return err('POST only', 405);

    // Fail fast, with a clear message, if the server isn't configured yet —
    // rather than throwing later inside signToken() with no useful context.
    if (!process.env.SESSION_SECRET) {
      return err('Server misconfigured: SESSION_SECRET is not set in the environment. Set it in Netlify → Site settings → Environment variables and redeploy.', 500);
    }

    let body;
    try { body = await req.json(); } catch { return err('Bad JSON'); }
    const action = body.action;
    const store = getStore('app');

    // ---- public actions ----------------------------------------------------
    if (action === 'register') {
      const { name, username, password } = body;
      if (!name || !username || !password) return err('Name, username and password are required.');
      if (adminUsernames().length === 0) return err('Server is missing ADMIN_USERNAMES — no manager accounts can be created yet.', 500);
      if (!isAdminUsername(username)) return err('Only pre-approved prefab-manager usernames can create an account here. Ask your admin to add you.');

      let user;
      const { db } = await mutateDB(store, (db) => {
        const uname = username.trim().toLowerCase();
        if (db.users.some((u) => u.username.toLowerCase() === uname)) fail(400, 'That account already exists — sign in instead.');
        const { salt, hash } = hashPassword(password);
        user = { id: uid('u'), name: name.trim(), username: username.trim(), role: 'Shop manager', salt, hash };
        db.users.push(user);
      });
      return json({ ok: true, token: signToken({ sub: user.id, role: user.role, name: user.name, username: user.username }), state: publicState(db, user) });
    }

    if (action === 'login') {
      const { db } = await readDB(store);
      const { username, password } = body;
      const u = db.users.find((x) => x.username.toLowerCase() === String(username || '').trim().toLowerCase());
      if (!u || !verifyPassword(password || '', u.salt, u.hash)) return err('Wrong username or password.', 401);
      return json({ ok: true, token: signToken({ sub: u.id, role: u.role, name: u.name, username: u.username }), state: publicState(db, u) });
    }

    // ---- everything else requires a valid session --------------------------
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const claims = verifyToken(token);
    if (!claims) return err('Not signed in.', 401);
    const { db: authDb } = await readDB(store);
    const me = authDb.users.find((u) => u.id === claims.sub);
    if (!me) return err('Account no longer exists.', 401);
    const isManager = me.role === 'Shop manager';
    const requireManager = () => { if (!isManager) fail(403, 'Only a prefab manager can do that.'); };

    switch (action) {
      case 'state':
        return json({ ok: true, state: publicState(authDb, me) });

      // --- Users (manager only) ------------------------------------------
      case 'user-create': {
        const { name, username, password, role } = body;
        if (!name || !username || !password || !role) return err('Name, username, password and role are required.');
        const { db } = await mutateDB(store, (db) => {
          requireManager();
          const uname = username.trim().toLowerCase();
          if (db.users.some((u) => u.username.toLowerCase() === uname)) fail(400, 'That username is taken.');
          if (role === 'Shop manager') {
            if (!isAdminUsername(username)) fail(400, 'Manager usernames are limited to the approved list (ADMIN_USERNAMES).');
            const managers = db.users.filter((u) => u.role === 'Shop manager').length;
            if (managers >= adminUsernames().length) fail(400, `Only ${adminUsernames().length} prefab-manager accounts are allowed.`);
          }
          const { salt, hash } = hashPassword(password);
          db.users.push({ id: uid('u'), name: name.trim(), username: username.trim(), role, salt, hash });
        });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'user-update': {
        const { id, name, username, password, role } = body;
        const { db } = await mutateDB(store, (db) => {
          requireManager();
          const u = db.users.find((x) => x.id === id);
          if (!u) fail(400, 'No such user.');
          if (role === 'Shop manager' && u.role !== 'Shop manager') {
            if (!isAdminUsername(username || u.username)) fail(400, 'Manager usernames are limited to the approved list (ADMIN_USERNAMES).');
            const managers = db.users.filter((x) => x.role === 'Shop manager').length;
            if (managers >= adminUsernames().length) fail(400, `Only ${adminUsernames().length} prefab-manager accounts are allowed.`);
          }
          if (name) u.name = name.trim();
          if (username) u.username = username.trim();
          if (role) u.role = role;
          if (password) { const { salt, hash } = hashPassword(password); u.salt = salt; u.hash = hash; }
        });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'user-delete': {
        if (body.id === me.id) return err('You can’t delete your own account.');
        const { db } = await mutateDB(store, (db) => {
          requireManager();
          db.users = db.users.filter((u) => u.id !== body.id);
        });
        return json({ ok: true, state: publicState(db, me) });
      }

      // --- Contacts (manager only) ---------------------------------------
      case 'contact-create': {
        const { db } = await mutateDB(store, (db) => { requireManager(); db.contacts.push({ id: uid('c'), ...body.contact }); });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'contact-update': {
        const { db } = await mutateDB(store, (db) => {
          requireManager();
          db.contacts = db.contacts.map((c) => c.id === body.contact.id ? { ...c, ...body.contact } : c);
        });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'contact-delete': {
        const { db } = await mutateDB(store, (db) => { requireManager(); db.contacts = db.contacts.filter((c) => c.id !== body.id); });
        return json({ ok: true, state: publicState(db, me) });
      }

      // --- Jobs (manager only) -------------------------------------------
      case 'job-create': {
        const { db } = await mutateDB(store, (db) => { requireManager(); db.jobs.push({ id: uid('j'), ...body.job }); });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'job-update': {
        const { db } = await mutateDB(store, (db) => {
          requireManager();
          db.jobs = db.jobs.map((j) => j.id === body.job.id ? { ...j, ...body.job } : j);
        });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'job-delete': {
        const { db } = await mutateDB(store, (db) => { requireManager(); db.jobs = db.jobs.filter((j) => j.id !== body.id); });
        return json({ ok: true, state: publicState(db, me) });
      }

      // --- Requests -------------------------------------------------------
      case 'request-create': {
        const { db } = await mutateDB(store, (db) => {
          const f = body.fields || {};
          const id = String(db.nextId++);
          const req2 = { id, status: 'Requested', day: null, time: null, ...f, raisedByName: me.name, raisedByRole: me.role };
          db.requests.unshift(req2);
          db.alerts.unshift(alert({
            kind: 'New request',
            headline: `${me.name} requested a ${(f.type || 'delivery').toLowerCase()} for ${f.neededBy || 'a date'} — ${f.jobName || 'a job'}`,
            meta: `Job ${f.job || ''} · needs a date · just now`,
          }));
        });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'request-move': {
        const { db } = await mutateDB(store, (db) => {
          requireManager();
          const r = db.requests.find((x) => x.id === body.id);
          if (!r) fail(400, 'No such request.');
          const day = body.day;
          r.day = day;
          r.time = day == null ? null : (body.time || '08:00');
          r.status = day == null ? 'Requested' : (r.status === 'Completed' ? 'Completed' : 'Scheduled');
          if (body.driver !== undefined) r.driver = body.driver;
          if (day != null) db.alerts.unshift(alert({
            kind: 'Scheduled',
            headline: `REQ-${r.id} set for day ${day}${r.time ? ', ' + r.time : ''} — ${r.title}`,
            meta: `${r.route || ''}${r.driver ? ' · Driver ' + r.driver : ''} · just now`,
          }));
        });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'request-complete': {
        if (!(me.role === 'Driver' || isManager)) return err('Only the driver or a manager can complete a run.', 403);
        const { db } = await mutateDB(store, (db) => {
          const r = db.requests.find((x) => x.id === body.id);
          if (!r) fail(400, 'No such request.');
          r.status = 'Completed';
          db.alerts.unshift(alert({ kind: 'Completed', headline: `REQ-${r.id} delivered and signed for`, meta: 'just now' }));
        });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'request-delete': {
        const { db } = await mutateDB(store, (db) => {
          requireManager();
          const before = db.requests.length;
          db.requests = db.requests.filter((r) => r.id !== body.id);
          if (db.requests.length === before) fail(400, 'No such request.');
        });
        return json({ ok: true, state: publicState(db, me) });
      }

      // --- Alerts ---------------------------------------------------------
      case 'alert-add': {
        const { db } = await mutateDB(store, (db) => {
          db.alerts.unshift(alert({ kind: body.kind || 'New request', headline: body.headline || '', meta: body.meta }));
        });
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'alerts-mark-read': {
        const { db } = await mutateDB(store, (db) => {
          db.alerts = db.alerts.map((a) => ({ ...a, unread: false }));
        });
        return json({ ok: true, state: publicState(db, me) });
      }

      default:
        return err('Unknown action: ' + action, 400);
    }
  } catch (e) {
    // Catches everything: fail()'s thrown {status,message}, Blobs failures,
    // unexpected exceptions — anything at all in the try above. The client
    // always gets back valid JSON with a readable message.
    if (e && e.status) return err(e.message, e.status);
    const msg = (e && e.message) ? e.message : 'Unexpected server error.';
    return err(msg, 500);
  }
};
