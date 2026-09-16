import { createContext, useContext, useReducer, useMemo, useEffect, useRef } from 'react';
import { ROLE_ACTION } from '../data/seed.js';
import * as api from '../lib/api.js';

const AppContext = createContext(null);

// How often a signed-in device quietly re-checks the server for changes made
// by other users. Netlify Functions are stateless (no open connection), so
// this polling — plus an immediate refetch on focus/visibility — is what
// keeps every screen "live" without adding a separate realtime service.
const POLL_MS = 5000;

const blank = { users: [], contacts: [], jobs: [], requests: [], alerts: [] };

function initState() {
  return {
    status: api.getToken() ? 'loading' : 'anon', // loading | anon | ready
    me: null,
    ...blank,
    tab: 'schedule',
    stack: [],
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING': return { ...state, status: 'loading' };
    case 'ANON':    return { ...initState(), status: 'anon' };
    case 'SET_STATE': {
      const s = action.state || {};
      return {
        ...state,
        status: 'ready',
        me: s.me || null,
        users: s.users || [], contacts: s.contacts || [], jobs: s.jobs || [],
        requests: s.requests || [], alerts: s.alerts || [],
        // reset navigation on a fresh sign-in
        tab: action.resetNav ? 'schedule' : state.tab,
        stack: action.resetNav ? [] : state.stack,
      };
    }
    case 'SET_TAB': return { ...state, tab: action.tab, stack: [] };
    case 'PUSH':    return { ...state, stack: [...state.stack, action.overlay] };
    case 'POP':     return { ...state, stack: state.stack.slice(0, -1) };
    default:        return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  // Restore a session on load.
  useEffect(() => {
    if (!api.getToken()) return;
    let cancelled = false;
    (async () => {
      const r = await api.fetchState();
      if (cancelled) return;
      if (r.ok) dispatch({ type: 'SET_STATE', state: r.state, resetNav: true });
      else dispatch({ type: 'ANON' });
    })();
    return () => { cancelled = true; };
  }, []);

  // Live updates: poll the server on an interval while signed in, and refetch
  // immediately whenever the tab regains focus or becomes visible (covers the
  // common case of switching back to the app after a moment away). Paused
  // during an in-progress drag on the calendar so a poll can't yank a banner
  // out from under someone's finger — see pausePolling/resumePolling below.
  const pausedRef = useRef(false);
  const fetchingRef = useRef(false);
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  useEffect(() => {
    if (state.status !== 'ready') return;

    const poll = async () => {
      if (pausedRef.current || fetchingRef.current) return;
      fetchingRef.current = true;
      const r = await api.fetchState();
      fetchingRef.current = false;
      if (statusRef.current !== 'ready') return; // signed out mid-request
      if (r.ok) dispatch({ type: 'SET_STATE', state: r.state });
      // A transient network hiccup just skips this cycle; the next poll or
      // focus event will retry. A 401 already logs the user out via api.js.
    };

    const interval = setInterval(poll, POLL_MS);
    const onFocus = () => poll();
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.status]);

  const actions = useMemo(() => {
    // Wrap a mutation: run it, fold the returned state in, surface {ok,error}.
    const run = async (fn) => {
      const r = await fn();
      if (r.ok && r.state) dispatch({ type: 'SET_STATE', state: r.state });
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    };
    return {
      // Auth
      async login(username, password) {
        const r = await api.login(username, password);
        if (r.ok) dispatch({ type: 'SET_STATE', state: r.state, resetNav: true });
        return r.ok ? { ok: true } : { ok: false, error: r.error };
      },
      async register(name, username, password) {
        const r = await api.register(name, username, password);
        if (r.ok) dispatch({ type: 'SET_STATE', state: r.state, resetNav: true });
        return r.ok ? { ok: true } : { ok: false, error: r.error };
      },
      logout() { api.logout(); dispatch({ type: 'ANON' }); },

      // Users / contacts / jobs (manager-gated on the server)
      addUser: (fields) => run(() => api.userCreate(fields)),
      updateUser: (id, fields) => run(() => api.userUpdate(id, fields)),
      deleteUser: (id) => run(() => api.userDelete(id)),
      addContact: (c) => run(() => api.contactCreate(c)),
      updateContact: (contact) => run(() => api.contactUpdate(contact)),
      deleteContact: (id) => run(() => api.contactDelete(id)),
      addJob: (j) => run(() => api.jobCreate(j)),
      updateJob: (job) => run(() => api.jobUpdate(job)),
      deleteJob: (id) => run(() => api.jobDelete(id)),

      // Requests / alerts
      createRequest: (fields) => run(() => api.requestCreate(fields)),
      moveRequest: (id, day, time, driver) => run(() => api.requestMove(id, day, time, driver)),
      completeRequest: (id) => run(() => api.requestComplete(id)),
      addAlert: (a) => run(() => api.alertAdd({ kind: a.kind, headline: a.headline, meta: a.meta })),
      markAllRead: () => run(() => api.alertsMarkRead()),

      // Navigation
      setTab: (tab) => dispatch({ type: 'SET_TAB', tab }),
      openDetail: (id) => dispatch({ type: 'PUSH', overlay: { type: 'detail', id } }),
      openNew: () => dispatch({ type: 'PUSH', overlay: { type: 'new' } }),
      openCalendar: () => dispatch({ type: 'PUSH', overlay: { type: 'calendar' } }),
      openManage: () => dispatch({ type: 'PUSH', overlay: { type: 'manage' } }),
      back: () => dispatch({ type: 'POP' }),

      // Live-update controls. A screen with its own drag/gesture state (the
      // calendar) calls pausePolling() while a gesture is in progress and
      // resumePolling() when it ends, so a background refresh can't disturb
      // an interaction mid-flight.
      pausePolling: () => { pausedRef.current = true; },
      resumePolling: () => { pausedRef.current = false; },
    };
  }, []);

  const currentUser = state.me;
  const role = state.me?.role || null;

  const value = useMemo(
    () => ({ ...state, currentUser, role, ...actions }),
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
