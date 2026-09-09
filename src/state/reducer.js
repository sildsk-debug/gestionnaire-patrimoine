import { uid } from "../utils/format.js";
import { buildDemoData } from "../data/demoData.js";

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

    case "ADD_HOLDING":
      return { ...state, holdings: [...state.holdings, { ...action.data, id: uid("hld") }] };
    case "UPDATE_HOLDING":
      return { ...state, holdings: state.holdings.map((h) => (h.id === action.id ? { ...h, ...action.data } : h)) };
    case "DELETE_HOLDING":
      return { ...state, holdings: state.holdings.filter((h) => h.id !== action.id) };

    case "ADD_TXN":
      return { ...state, transactions: [{ ...action.data, id: uid("txn") }, ...state.transactions] };
    case "UPDATE_TXN":
      return { ...state, transactions: state.transactions.map((t) => (t.id === action.id ? { ...t, ...action.data } : t)) };
    case "DELETE_TXN":
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };

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
