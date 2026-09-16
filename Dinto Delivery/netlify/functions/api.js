// Single serverless API for the Prefab Delivery Scheduler.
// Stack matches the other Paul Dinto repos: Netlify Functions + Netlify Blobs.
// Auth is custom (Option A): the prefab manager provisions username/password
// accounts and assigns roles. Passwords are scrypt-hashed; sessions are signed
// HS256 tokens. No plaintext or credentials ever leave the server.
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

function alert({ kind, headline, meta }) {
  const now = new Date();
  return {
    id: uid('al'), day: 'Today', kind, headline, meta: meta || '',
    at: now.toISOString(), unread: true,
  };
}

export default async (req) => {
  if (req.method !== 'POST') return err('POST only', 405);

  let body;
  try { body = await req.json(); } catch { return err('Bad JSON'); }
  const action = body.action;
  const store = getStore('app');
  const db = (await store.get('db', { type: 'json' })) || emptyDB();
  const save = () => store.setJSON('db', db);

  // ---- public actions ----------------------------------------------------
  if (action === 'register') {
    const { name, username, password } = body;
    if (!name || !username || !password) return err('Name, username and password are required.');
    if (adminUsernames().length === 0) return err('Server is missing ADMIN_USERNAMES — no manager accounts can be created yet.', 500);
    if (!isAdminUsername(username)) return err('Only pre-approved prefab-manager usernames can create an account here. Ask your admin to add you.');
    const uname = username.trim().toLowerCase();
    if (db.users.some((u) => u.username.toLowerCase() === uname)) return err('That account already exists — sign in instead.');
    const { salt, hash } = hashPassword(password);
    const user = { id: uid('u'), name: name.trim(), username: username.trim(), role: 'Shop manager', salt, hash };
    db.users.push(user);
    await save();
    return json({ ok: true, token: signToken({ sub: user.id, role: user.role, name: user.name, username: user.username }), state: publicState(db, user) });
  }

  if (action === 'login') {
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
  const me = db.users.find((u) => u.id === claims.sub);
  if (!me) return err('Account no longer exists.', 401);
  const isManager = me.role === 'Shop manager';
  const requireManager = () => { if (!isManager) throw { status: 403, message: 'Only a prefab manager can do that.' }; };

  try {
    switch (action) {
      case 'state':
        return json({ ok: true, state: publicState(db, me) });

      // --- Users (manager only) ------------------------------------------
      case 'user-create': {
        requireManager();
        const { name, username, password, role } = body;
        if (!name || !username || !password || !role) return err('Name, username, password and role are required.');
        const uname = username.trim().toLowerCase();
        if (db.users.some((u) => u.username.toLowerCase() === uname)) return err('That username is taken.');
        if (role === 'Shop manager') {
          if (!isAdminUsername(username)) return err('Manager usernames are limited to the approved list (ADMIN_USERNAMES).');
          const managers = db.users.filter((u) => u.role === 'Shop manager').length;
          if (managers >= adminUsernames().length) return err(`Only ${adminUsernames().length} prefab-manager accounts are allowed.`);
        }
        const { salt, hash } = hashPassword(password);
        db.users.push({ id: uid('u'), name: name.trim(), username: username.trim(), role, salt, hash });
        await save();
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'user-update': {
        requireManager();
        const { id, name, username, password, role } = body;
        const u = db.users.find((x) => x.id === id);
        if (!u) return err('No such user.');
        if (role === 'Shop manager' && u.role !== 'Shop manager') {
          if (!isAdminUsername(username || u.username)) return err('Manager usernames are limited to the approved list (ADMIN_USERNAMES).');
          const managers = db.users.filter((x) => x.role === 'Shop manager').length;
          if (managers >= adminUsernames().length) return err(`Only ${adminUsernames().length} prefab-manager accounts are allowed.`);
        }
        if (name) u.name = name.trim();
        if (username) u.username = username.trim();
        if (role) u.role = role;
        if (password) { const { salt, hash } = hashPassword(password); u.salt = salt; u.hash = hash; }
        await save();
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'user-delete': {
        requireManager();
        if (body.id === me.id) return err('You can’t delete your own account.');
        db.users = db.users.filter((u) => u.id !== body.id);
        await save();
        return json({ ok: true, state: publicState(db, me) });
      }

      // --- Contacts (manager only) ---------------------------------------
      case 'contact-create': requireManager(); db.contacts.push({ id: uid('c'), ...body.contact }); await save(); return json({ ok: true, state: publicState(db, me) });
      case 'contact-update': requireManager(); db.contacts = db.contacts.map((c) => c.id === body.contact.id ? { ...c, ...body.contact } : c); await save(); return json({ ok: true, state: publicState(db, me) });
      case 'contact-delete': requireManager(); db.contacts = db.contacts.filter((c) => c.id !== body.id); await save(); return json({ ok: true, state: publicState(db, me) });

      // --- Jobs (manager only) -------------------------------------------
      case 'job-create': requireManager(); db.jobs.push({ id: uid('j'), ...body.job }); await save(); return json({ ok: true, state: publicState(db, me) });
      case 'job-update': requireManager(); db.jobs = db.jobs.map((j) => j.id === body.job.id ? { ...j, ...body.job } : j); await save(); return json({ ok: true, state: publicState(db, me) });
      case 'job-delete': requireManager(); db.jobs = db.jobs.filter((j) => j.id !== body.id); await save(); return json({ ok: true, state: publicState(db, me) });

      // --- Requests -------------------------------------------------------
      case 'request-create': {
        const f = body.fields || {};
        const id = String(db.nextId++);
        const req2 = { id, status: 'Requested', day: null, time: null, ...f, raisedByName: me.name, raisedByRole: me.role };
        db.requests.unshift(req2);
        db.alerts.unshift(alert({
          kind: 'New request',
          headline: `${me.name} requested a ${(f.type || 'delivery').toLowerCase()} for ${f.neededBy || 'a date'} — ${f.jobName || 'a job'}`,
          meta: `Job ${f.job || ''} · needs a date · just now`,
        }));
        await save();
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'request-move': {
        requireManager();
        const r = db.requests.find((x) => x.id === body.id);
        if (!r) return err('No such request.');
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
        await save();
        return json({ ok: true, state: publicState(db, me) });
      }
      case 'request-complete': {
        if (!(me.role === 'Driver' || isManager)) return err('Only the driver or a manager can complete a run.', 403);
        const r = db.requests.find((x) => x.id === body.id);
        if (!r) return err('No such request.');
        r.status = 'Completed';
        db.alerts.unshift(alert({ kind: 'Completed', headline: `REQ-${r.id} delivered and signed for`, meta: 'just now' }));
        await save();
        return json({ ok: true, state: publicState(db, me) });
      }

      // --- Alerts ---------------------------------------------------------
      case 'alert-add':
        db.alerts.unshift(alert({ kind: body.kind || 'New request', headline: body.headline || '', meta: body.meta }));
        await save();
        return json({ ok: true, state: publicState(db, me) });
      case 'alerts-mark-read':
        db.alerts = db.alerts.map((a) => ({ ...a, unread: false }));
        await save();
        return json({ ok: true, state: publicState(db, me) });

      default:
        return err('Unknown action: ' + action, 400);
    }
  } catch (e) {
    if (e && e.status) return err(e.message, e.status);
    return err('Server error.', 500);
  }
};
