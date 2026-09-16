// Persistence layer. Today this is the browser's localStorage; it is isolated
// here so a real backend (Supabase, a Netlify Function + DB, etc.) can replace
// it without touching the screens or the store. See README → Security.

const DB_KEY = 'pds.db.v1';
const SESSION_KEY = 'pds.session.v1';

// The shape of everything the manager enters. Starts empty — no seed data.
export function emptyDB() {
  return { users: [], contacts: [], jobs: [], requests: [], alerts: [], nextId: 1001 };
}

export function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return emptyDB();
    return { ...emptyDB(), ...JSON.parse(raw) };
  } catch {
    return emptyDB();
  }
}

export function saveDB(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* storage full / blocked */ }
}

export function loadSession() {
  try { return localStorage.getItem(SESSION_KEY) || null; } catch { return null; }
}

export function saveSession(userId) {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

// SHA-256 of "salt:password". Keeps plaintext out of storage. This is NOT a
// substitute for server-side auth — the check still runs in the browser — but
// it avoids storing readable passwords. Requires a secure context (https or
// localhost), which Netlify and local dev both provide.
export async function hashPassword(password, salt = 'pds') {
  const data = new TextEncoder().encode(salt + ':' + password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Short unique-ish id for records the manager creates.
export function uid(prefix = 'x') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
