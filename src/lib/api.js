// Client wrapper around the Netlify Function API. Replaces the old
// localStorage db.js: accounts and data now live on the server. Only a signed,
// expiring session token is kept in the browser (never a password).

const ENDPOINT = '/.netlify/functions/api';
const TOKEN_KEY = 'pds.token.v1';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}
function setToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}
export function clearToken() { setToken(null); }

async function call(action, payload = {}) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(getToken() ? { authorization: 'Bearer ' + getToken() } : {}),
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    return { ok: false, error: 'Can’t reach the server. Check your connection.' };
  }
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || data.ok === false) {
    if (res.status === 401) clearToken();
    return { ok: false, status: res.status, error: data.error || 'Request failed.' };
  }
  return { ok: true, ...data };
}

// Auth ----------------------------------------------------------------------
export async function login(username, password) {
  const r = await call('login', { username, password });
  if (r.ok) setToken(r.token);
  return r;
}
export async function register(name, username, password) {
  const r = await call('register', { name, username, password });
  if (r.ok) setToken(r.token);
  return r;
}
export function logout() { clearToken(); }

// State + mutations (each returns the fresh { state } from the server) --------
export const fetchState   = () => call('state');
export const userCreate   = (fields) => call('user-create', fields);
export const userUpdate   = (id, fields) => call('user-update', { id, ...fields });
export const userDelete   = (id) => call('user-delete', { id });
export const contactCreate = (contact) => call('contact-create', { contact });
export const contactUpdate = (contact) => call('contact-update', { contact });
export const contactDelete = (id) => call('contact-delete', { id });
export const jobCreate    = (job) => call('job-create', { job });
export const jobUpdate    = (job) => call('job-update', { job });
export const jobDelete    = (id) => call('job-delete', { id });
export const requestCreate = (fields) => call('request-create', { fields });
export const requestMove  = (id, day, time, driver) => call('request-move', { id, day, time, driver });
export const requestComplete = (id) => call('request-complete', { id });
export const requestDelete = (id) => call('request-delete', { id });
export const alertAdd     = (a) => call('alert-add', a);
export const alertsMarkRead = () => call('alerts-mark-read');
