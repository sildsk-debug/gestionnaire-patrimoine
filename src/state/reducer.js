import { uid, toBase } from "../utils/format.js";
import { buildDemoData } from "../data/demoData.js";

function txnEffect(txn) {
  const sign = txn.type === "depense" ? -1 : 1;
  return sign * toBase(txn.amount, txn.currency);
}

export const emptyState = {
  theme: "light",
  view: "dashboard",
  accounts: [],
  holdings: [],
  transactions: [],
  budgets: {},
  goals: [],
  netWorthHistory: [],
};

export function reducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "TOGGLE_THEME":
      return { ...state, theme: state.theme === "light" ? "dark" : "light" };

    case "ADD_ACCOUNT":
      return { ...state, accounts: [...state.accounts, { ...action.data, id: uid("acc") }] };
    case "UPDATE_ACCOUNT":
      return { ...state, accounts: state.accounts.map((a) => (a.id === action.id ? { ...a, ...action.data } : a)) };
    case "DELETE_ACCOUNT":
      return { ...state, accounts: state.accounts.filter((a) => a.id !== action.id) };
    case "REORDER_ACCOUNTS":
      return { ...state, accounts: action.accounts };

    case "ADD_HOLDING":
      return { ...state, holdings: [...state.holdings, { ...action.data, id: uid("hld") }] };
    case "UPDATE_HOLDING":
      return { ...state, holdings: state.holdings.map((h) => (h.id === action.id ? { ...h, ...action.data } : h)) };
    case "DELETE_HOLDING":
      return { ...state, holdings: state.holdings.filter((h) => h.id !== action.id) };

    case "ADD_TXN": {
      const txn = { ...action.data, id: uid("txn") };
      let accounts = state.accounts;
      if (txn.accountId) {
        accounts = accounts.map((a) => (a.id === txn.accountId ? { ...a, balance: a.balance + txnEffect(txn) } : a));
      }
      return { ...state, transactions: [txn, ...state.transactions], accounts };
    }
    case "UPDATE_TXN": {
      const oldTxn = state.transactions.find((t) => t.id === action.id);
      const newTxn = { ...oldTxn, ...action.data };
      let accounts = state.accounts;
      if (oldTxn) {
        const oldAccount = oldTxn.accountId;
        const newAccount = newTxn.accountId;
        accounts = accounts.map((a) => {
          let delta = 0;
          if (a.id === oldAccount) delta -= txnEffect(oldTxn);
          if (a.id === newAccount) delta += txnEffect(newTxn);
          return delta !== 0 ? { ...a, balance: a.balance + delta } : a;
        });
      }
      return { ...state, transactions: state.transactions.map((t) => (t.id === action.id ? newTxn : t)), accounts };
    }
    case "DELETE_TXN": {
      const txn = state.transactions.find((t) => t.id === action.id);
      let accounts = state.accounts;
      if (txn && txn.accountId) {
        accounts = accounts.map((a) => (a.id === txn.accountId ? { ...a, balance: a.balance - txnEffect(txn) } : a));
      }
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id), accounts };
    }

    case "SET_BUDGET":
      return { ...state, budgets: { ...state.budgets, [action.category]: action.amount } };

    case "ADD_GOAL":
      return { ...state, goals: [...state.goals, { ...action.data, id: uid("gol") }] };
    case "UPDATE_GOAL":
      return { ...state, goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.data } : g)) };
    case "DELETE_GOAL":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };

    case "ADD_SNAPSHOT": {
      const rest = state.netWorthHistory.filter((s) => s.date !== action.date);
      return { ...state, netWorthHistory: [...rest, { date: action.date, value: action.value }].sort((a, b) => a.date.localeCompare(b.date)) };
    }
    case "RESET_DEMO":
      return { ...state, ...buildDemoData() };

    case "IMPORT_DATA":
      // Remplace uniquement les données financières (pas le thème / la vue en cours).
      return {
        ...state,
        accounts: action.payload.accounts ?? [],
        holdings: action.payload.holdings ?? [],
        transactions: action.payload.transactions ?? [],
        budgets: action.payload.budgets ?? {},
        goals: action.payload.goals ?? [],
        netWorthHistory: action.payload.netWorthHistory ?? [],
      };
    case "WIPE_ALL":
      return { ...state, accounts: [], holdings: [], transactions: [], budgets: {}, goals: [], netWorthHistory: [] };

    default:
      return state;
  }
}
