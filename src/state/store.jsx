import { createContext, useContext, useReducer, useMemo, useRef, useEffect } from 'react';
import { ROLE_ACTION } from '../data/seed.js';
import { loadDB, saveDB, loadSession, saveSession, hashPassword, uid } from '../lib/db.js';

const AppContext = createContext(null);

function initState() {
  return {
    db: loadDB(),                 // { users, contacts, jobs, requests, alerts, nextId }
    session: loadSession(),       // userId | null
    tab: 'schedule',              // schedule | requests | alerts | me
    stack: [],                    // overlays: {type:'detail'|'new'|'calendar'|'manage', id?}
  };
}

function withDB(state, db) { return { ...state, db }; }

function reducer(state, action) {
  const db = state.db;
  switch (action.type) {
    case 'LOGIN':
      return { ...state, session: action.userId, tab: 'schedule', stack: [] };
    case 'LOGOUT':
      return { ...state, session: null, tab: 'schedule', stack: [] };

    case 'SET_TAB': return { ...state, tab: action.tab, stack: [] };
    case 'PUSH':    return { ...state, stack: [...state.stack, action.overlay] };
    case 'POP':     return { ...state, stack: state.stack.slice(0, -1) };

    // --- Users ---
    case 'ADD_USER':
      return withDB(state, { ...db, users: [...db.users, action.user] });
    case 'UPDATE_USER':
      return withDB(state, { ...db, users: db.users.map((u) => u.id === action.user.id ? { ...u, ...action.user } : u) });
    case 'DELETE_USER':
      return withDB(state, { ...db, users: db.users.filter((u) => u.id !== action.id) });

    // --- Contacts ---
    case 'ADD_CONTACT':
      return withDB(state, { ...db, contacts: [...db.contacts, action.contact] });
    case 'UPDATE_CONTACT':
      return withDB(state, { ...db, contacts: db.contacts.map((c) => c.id === action.contact.id ? { ...c, ...action.contact } : c) });
    case 'DELETE_CONTACT':
      return withDB(state, { ...db, contacts: db.contacts.filter((c) => c.id !== action.id) });

    // --- Jobs ---
    case 'ADD_JOB':
      return withDB(state, { ...db, jobs: [...db.jobs, action.job] });
    case 'UPDATE_JOB':
      return withDB(state, { ...db, jobs: db.jobs.map((j) => j.id === action.job.id ? { ...j, ...action.job } : j) });
    case 'DELETE_JOB':
      return withDB(state, { ...db, jobs: db.jobs.filter((j) => j.id !== action.id) });

    // --- Requests / alerts ---
    case 'CREATE_REQUEST': {
      const id = String(db.nextId);
      const req = { id, status: 'Requested', day: null, time: null, ...action.fields };
      return withDB(state, { ...db, requests: [req, ...db.requests], nextId: db.nextId + 1 });
    }
    case 'MOVE_REQUEST':
      return withDB(state, {
        ...db,
        requests: db.requests.map((r) => {
          if (r.id !== action.id) return r;
          const day = action.day;
          const status = day == null ? 'Requested' : (r.status === 'Completed' ? 'Completed' : 'Scheduled');
          const driver = action.driver !== undefined ? action.driver : r.driver;
          return { ...r, day, time: day == null ? null : (action.time || '08:00'), status, driver };
        }),
      });
    case 'COMPLETE_REQUEST':
      return withDB(state, { ...db, requests: db.requests.map((r) => r.id === action.id ? { ...r, status: 'Completed' } : r) });
    case 'ADD_ALERT':
      return withDB(state, { ...db, alerts: [action.alert, ...db.alerts] });
    case 'MARK_ALL_READ':
      return withDB(state, { ...db, alerts: db.alerts.map((a) => ({ ...a, unread: false })) });

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  // Keep the latest db/session in a ref so async actions (login) don't close
  // over stale state.
  const ref = useRef(state);
  ref.current = state;

  // Persist on change.
  useEffect(() => { saveDB(state.db); }, [state.db]);
  useEffect(() => { saveSession(state.session); }, [state.session]);

  const actions = useMemo(() => ({
    // Auth ----------------------------------------------------------------
    async setupAdmin({ name, username, password }) {
      const passHash = await hashPassword(password);
      const user = { id: uid('u'), name, username: username.trim(), passHash, role: 'Shop manager' };
      dispatch({ type: 'ADD_USER', user });
      dispatch({ type: 'LOGIN', userId: user.id });
      return { ok: true };
    },
    async login({ username, password }) {
      const u = ref.current.db.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
      if (!u) return { ok: false, error: 'No account with that username.' };
      const passHash = await hashPassword(password);
      if (passHash !== u.passHash) return { ok: false, error: 'Wrong password.' };
      dispatch({ type: 'LOGIN', userId: u.id });
      return { ok: true };
    },
    logout: () => dispatch({ type: 'LOGOUT' }),

    // Users ---------------------------------------------------------------
    async addUser({ name, username, password, role }) {
      const exists = ref.current.db.users.some((x) => x.username.toLowerCase() === username.trim().toLowerCase());
      if (exists) return { ok: false, error: 'That username is taken.' };
      const passHash = await hashPassword(password);
      dispatch({ type: 'ADD_USER', user: { id: uid('u'), name, username: username.trim(), passHash, role } });
      return { ok: true };
    },
    async updateUser(id, { name, username, password, role }) {
      const patch = { id, name, username: username.trim(), role };
      if (password) patch.passHash = await hashPassword(password);
      dispatch({ type: 'UPDATE_USER', user: patch });
      return { ok: true };
    },
    deleteUser: (id) => dispatch({ type: 'DELETE_USER', id }),

    // Contacts ------------------------------------------------------------
    addContact: (c) => dispatch({ type: 'ADD_CONTACT', contact: { id: uid('c'), ...c } }),
    updateContact: (contact) => dispatch({ type: 'UPDATE_CONTACT', contact }),
    deleteContact: (id) => dispatch({ type: 'DELETE_CONTACT', id }),

    // Jobs ----------------------------------------------------------------
    addJob: (j) => dispatch({ type: 'ADD_JOB', job: { id: uid('j'), ...j } }),
    updateJob: (job) => dispatch({ type: 'UPDATE_JOB', job }),
    deleteJob: (id) => dispatch({ type: 'DELETE_JOB', id }),

    // Requests / alerts ---------------------------------------------------
    createRequest: (fields) => dispatch({ type: 'CREATE_REQUEST', fields }),
    moveRequest: (id, day, time, driver) => dispatch({ type: 'MOVE_REQUEST', id, day, time, driver }),
    completeRequest: (id) => dispatch({ type: 'COMPLETE_REQUEST', id }),
    addAlert: (alert) => dispatch({ type: 'ADD_ALERT', alert }),
    markAllRead: () => dispatch({ type: 'MARK_ALL_READ' }),

    // Navigation ----------------------------------------------------------
    setTab: (tab) => dispatch({ type: 'SET_TAB', tab }),
    openDetail: (id) => dispatch({ type: 'PUSH', overlay: { type: 'detail', id } }),
    openNew: () => dispatch({ type: 'PUSH', overlay: { type: 'new' } }),
    openCalendar: () => dispatch({ type: 'PUSH', overlay: { type: 'calendar' } }),
    openManage: () => dispatch({ type: 'PUSH', overlay: { type: 'manage' } }),
    back: () => dispatch({ type: 'POP' }),
  }), []);

  const currentUser = state.db.users.find((u) => u.id === state.session) || null;
  const role = currentUser?.role || null;

  const value = useMemo(
    () => ({ ...state, ...state.db, currentUser, role, ...actions }),
    [state, currentUser, role, actions],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export function primaryActionFor(role) {
  return ROLE_ACTION[role] || ROLE_ACTION['Shop manager'];
}
