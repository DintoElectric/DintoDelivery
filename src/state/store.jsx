import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { SEED_REQUESTS, SEED_ALERTS, ROLE_ACTION } from '../data/seed.js';

const AppContext = createContext(null);

const initialState = {
  reqs: SEED_REQUESTS,
  alerts: SEED_ALERTS,
  role: 'Shop manager',
  tab: 'schedule',            // schedule | requests | alerts | me
  stack: [],                  // overlays above the tab root: {type:'detail'|'new'|'calendar', id?}
  nextId: 1052,               // next REQ number for newly created requests
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.role };

    case 'SET_TAB':
      return { ...state, tab: action.tab, stack: [] };

    case 'PUSH':
      return { ...state, stack: [...state.stack, action.overlay] };

    case 'POP':
      return { ...state, stack: state.stack.slice(0, -1) };

    case 'ADD_ALERT':
      return { ...state, alerts: [action.alert, ...state.alerts] };

    case 'MARK_ALL_READ':
      return { ...state, alerts: state.alerts.map((a) => ({ ...a, unread: false })) };

    // Calendar drag / detail scheduling. Setting day=null reverts to the tray.
    case 'MOVE_REQUEST': {
      const { id, day, time } = action;
      return {
        ...state,
        reqs: state.reqs.map((r) => {
          if (r.id !== id) return r;
          const status = day == null
            ? 'Requested'
            : (r.status === 'Completed' ? 'Completed' : 'Scheduled');
          return { ...r, day, time: day == null ? null : (time || '08:00'), status };
        }),
      };
    }

    case 'COMPLETE_REQUEST':
      return {
        ...state,
        reqs: state.reqs.map((r) => (r.id === action.id ? { ...r, status: 'Completed' } : r)),
      };

    case 'CREATE_REQUEST': {
      const id = String(state.nextId);
      const req = { id, status: 'Requested', day: null, time: null, ...action.fields };
      return { ...state, reqs: [req, ...state.reqs], nextId: state.nextId + 1 };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(() => ({
    setRole: (role) => dispatch({ type: 'SET_ROLE', role }),
    setTab: (tab) => dispatch({ type: 'SET_TAB', tab }),
    openDetail: (id) => dispatch({ type: 'PUSH', overlay: { type: 'detail', id } }),
    openNew: () => dispatch({ type: 'PUSH', overlay: { type: 'new' } }),
    openCalendar: () => dispatch({ type: 'PUSH', overlay: { type: 'calendar' } }),
    back: () => dispatch({ type: 'POP' }),
    addAlert: (alert) => dispatch({ type: 'ADD_ALERT', alert }),
    markAllRead: () => dispatch({ type: 'MARK_ALL_READ' }),
    moveRequest: (id, day, time) => dispatch({ type: 'MOVE_REQUEST', id, day, time }),
    completeRequest: (id) => dispatch({ type: 'COMPLETE_REQUEST', id }),
    createRequest: (fields) => dispatch({ type: 'CREATE_REQUEST', fields }),
  }), []);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

// Convenience: the role-dependent primary action label for request detail.
export function primaryActionFor(role) {
  return ROLE_ACTION[role] || ROLE_ACTION['Shop manager'];
}
