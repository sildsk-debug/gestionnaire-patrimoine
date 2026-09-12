import React, { useEffect, useReducer, useRef, useState } from "react";
import { Menu, X, Moon, Sun } from "lucide-react";
import { reducer, emptyState } from "./state/reducer.js";
import { useComputed } from "./state/useComputed.js";
import { buildDemoData } from "./data/demoData.js";
import { loadState, saveState } from "./utils/storage.js";
import { loadCachedFx, refreshFx } from "./utils/fx.js";
import { executeDueRecurring } from "./utils/recurring.js";
import { getCachedQuote, refreshAllQuotes, getProviderDailyLimit } from "./utils/marketData.js";
import { loadSettings, getMarketKey } from "./utils/settings.js";
import { NAV } from "./data/constants.js";
import { Sheet, Toast } from "./components/ui.jsx";
import { SwipeProvider } from "./components/SwipeableRow.jsx";
import { AccountForm, HoldingForm, TransactionForm, GoalForm } from "./components/forms.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Patrimoine from "./pages/Patrimoine.jsx";
import Investissements from "./pages/Investissements.jsx";
import Transactions from "./pages/Transactions.jsx";
import Budget from "./pages/Budget.jsx";
import Objectifs from "./pages/Objectifs.jsx";
import Comptes from "./pages/Comptes.jsx";
import Parametres from "./pages/Parametres.jsx";

// Hydratation initiale : localStorage étant synchrone, on peut lire l'état
// directement dans l'initialiseur du reducer (pas d'écran de chargement nécessaire).
function init() {
  const saved = loadState();
  if (saved) return { ...emptyState, ...saved };
  return { ...emptyState, ...buildDemoData() };
}

const UNDO_LABELS = {
  DELETE_ACCOUNT: "Compte supprimé",
  DELETE_HOLDING: "Position supprimée",
  DELETE_TXN: "Transaction supprimée",
  DELETE_GOAL: "Objectif supprimé",
  WIPE_ALL: "Toutes les données ont été effacées",
  RESET_DEMO: "Données de démonstration chargées",
};

let recurringExecuted = false;

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [navOpen, setNavOpen] = useState(false);
  const [quick, setQuick] = useState(null); // { kind, prefill }
  const [editing, setEditing] = useState(null); // { kind, data }
  const [toast, setToast] = useState(null); // { message, canUndo }
  const [, setFxTick] = useState(0);
  const prevStateRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Sauvegarde automatique dans localStorage à chaque changement (léger debounce).
  useEffect(() => {
    const t = setTimeout(() => saveState(state), 300);
    return () => clearTimeout(t);
  }, [state]);

  const computed = useComputed(state);

  // Cycle de vie des données de marché. Actualisation UNIQUEMENT quand l'app est
  // à l'écran (onglet visible) : une passe au lancement, puis un balayage minute
  // qui applique la cadence configurée tant que l'app reste visible. Dès qu'on
  // quitte l'app (onglet en arrière-plan), plus aucune requête n'est émise,
  // ni pour les cours (TD/AV) ni pour les taux de change.
  useEffect(() => {
    loadCachedFx();
    let lastQuoteAt = 0;
    let lastFxAt = 0;
    let quoteBusy = false;
    const FX_REFRESH_MS = 24 * 3600 * 1000;
    const isVisible = () => typeof document === "undefined" || document.visibilityState === "visible";

    const refreshQuotes = async () => {
      if (!isVisible() || quoteBusy) return;
      const settings = loadSettings();
      if (!settings.autoRefresh) return;
      const provider = settings.marketProvider || "alphavantage";
      const hours = settings.autoRefreshHours ?? 6;
      if (provider === "alphavantage" && hours > 0 && hours < 6) return;
      const apiKey = getMarketKey(settings, provider);
      if (!apiKey) return;
      const holdings = stateRef.current.holdings || [];
      if (!holdings.length) return;
      const maxAge = (hours > 0 ? hours : 24) * 3600 * 1000;
      const stale = holdings.filter((h) => getCachedQuote(h.ticker, maxAge) == null);
      if (!stale.length) return;
      quoteBusy = true;
      try {
        const res = await refreshAllQuotes(stale, provider, apiKey);
        if (res) {
          for (const h of stale) {
            if (res.prices[h.id] != null) dispatch({ type: "UPDATE_HOLDING", id: h.id, data: { currentPrice: res.prices[h.id] } });
          }
          if (res.updated) showToast(`${res.updated} cours actualisés automatiquement.`, false);
          else if (res.stoppedForBudget > 0) showToast(`Budget de cours du jour atteint (${getProviderDailyLimit(provider)} requêtes). Réessai à la prochaine ouverture.`, false);
        }
      } finally {
        quoteBusy = false;
      }
    };

    const refreshFxNow = () => {
      if (!isVisible()) return;
      lastFxAt = Date.now();
      refreshFx().then(() => setFxTick((t) => t + 1));
    };
    const refreshFxIfDue = () => {
      if (!isVisible() || Date.now() - lastFxAt < FX_REFRESH_MS) return;
      refreshFxNow();
    };

    // Lancement : une actualisation immédiate des cours (si données périmées) + FX.
    refreshFxNow();
    refreshQuotes();
    lastQuoteAt = Date.now();

    const tick = setInterval(() => {
      const settings = loadSettings();
      if (!settings.autoRefresh) return;
      const hours = settings.autoRefreshHours ?? 6;
      if (hours === 0) return;
      if (Date.now() - lastQuoteAt < hours * 3600 * 1000) return;
      lastQuoteAt = Date.now();
      refreshQuotes();
      refreshFxIfDue();
    }, 60000);
    const onVisible = () => {
      if (!isVisible()) return;
      const settings = loadSettings();
      if (!settings.autoRefresh) return;
      const hours = settings.autoRefreshHours ?? 6;
      if (Date.now() - lastQuoteAt < hours * 3600 * 1000) return;
      lastQuoteAt = Date.now();
      refreshQuotes();
      refreshFxIfDue();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (recurringExecuted) return;
    recurringExecuted = true;
    const due = executeDueRecurring(stateRef.current.transactions || []);
    if (due.length) {
      due.forEach((t) => dispatch({ type: "ADD_TXN", data: t }));
      const msg =
        due.length === 1
          ? "1 récurrence créée automatiquement."
          : `${due.length} récurrences créées automatiquement.`;
      showToast(msg, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message, canUndo = false) => {
    setToast({ message, canUndo });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 10000);
  };

  const handleUndo = () => {
    if (prevStateRef.current) {
      dispatch({ type: "RESTORE_STATE", state: prevStateRef.current });
      prevStateRef.current = null;
    }
    setToast(null);
  };

  const wrappedDispatch = (action) => {
    if (UNDO_LABELS[action.type]) {
      prevStateRef.current = stateRef.current;
      showToast(UNDO_LABELS[action.type], true);
    }
    dispatch(action);
  };

  const openQuick = (kind, prefill) => { setQuick({ kind, prefill }); setNavOpen(false); };
  const openEdit = (kind, data) => { setEditing({ kind, data }); setNavOpen(false); };
  const closeSheets = () => { setQuick(null); setEditing(null); };
  const confirmThen = (message, fn) => () => {
    if (window.confirm(message)) fn();
  };

  const activeNav = NAV.find((n) => n.id === state.view) || NAV[0];

  return (
    <div className="app-root" data-theme={state.theme}>
      <header className="app-header">
        <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Ouvrir le menu"><Menu size={20} /></button>
        <span className="app-title">{activeNav.label}</span>
        <button className="icon-btn" onClick={() => dispatch({ type: "TOGGLE_THEME" })} aria-label={state.theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}>
          {state.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <main className="app-main">
        <SwipeProvider>
          {state.view === "dashboard" && <Dashboard state={state} computed={computed} openQuick={openQuick} />}
          {state.view === "patrimoine" && <Patrimoine state={state} computed={computed} openEdit={openEdit} dispatch={wrappedDispatch} />}
          {state.view === "investissements" && <Investissements state={state} dispatch={wrappedDispatch} computed={computed} openQuick={openQuick} openEdit={openEdit} />}
          {state.view === "transactions" && <Transactions state={state} dispatch={wrappedDispatch} kind="all" openQuick={openQuick} openEdit={openEdit} />}
          {state.view === "revenus" && <Transactions state={state} dispatch={wrappedDispatch} kind="revenu" openQuick={openQuick} openEdit={openEdit} />}
          {state.view === "depenses" && <Transactions state={state} dispatch={wrappedDispatch} kind="depense" openQuick={openQuick} openEdit={openEdit} />}
          {state.view === "budget" && <Budget state={state} computed={computed} dispatch={wrappedDispatch} />}
          {state.view === "objectifs" && <Objectifs state={state} computed={computed} openQuick={openQuick} openEdit={openEdit} />}
          {state.view === "comptes" && <Comptes state={state} computed={computed} dispatch={wrappedDispatch} openQuick={openQuick} openEdit={openEdit} />}
          {state.view === "parametres" && <Parametres state={state} dispatch={wrappedDispatch} />}
        </SwipeProvider>
      </main>

      {navOpen && (
        <div className="nav-overlay" onClick={() => setNavOpen(false)}>
          <nav className="nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="nav-drawer-header">
              <span className="app-title">Patrimoine</span>
              <button className="icon-btn" onClick={() => setNavOpen(false)}><X size={18} /></button>
            </div>
            <div className="nav-items">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  className={"nav-item " + (state.view === n.id ? "active" : "")}
                  onClick={() => { dispatch({ type: "SET_VIEW", view: n.id }); setNavOpen(false); }}
                >
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}

      <Sheet open={!!quick && quick.kind === "account"} onClose={closeSheets} title="Nouveau compte">
        <AccountForm onSubmit={(data) => { dispatch({ type: "ADD_ACCOUNT", data }); closeSheets(); }} />
      </Sheet>
      <Sheet open={!!quick && quick.kind === "holding"} onClose={closeSheets} title="Nouvel investissement">
        <HoldingForm onSubmit={(data) => { dispatch({ type: "ADD_HOLDING", data }); closeSheets(); }} />
      </Sheet>
      <Sheet open={!!quick && quick.kind === "transaction"} onClose={closeSheets} title="Nouvelle transaction">
        <TransactionForm
          initial={quick?.prefill ? {
            type: quick.prefill.type, category: quick.prefill.type === "revenu" ? "salaire" : "alimentation",
            amount: "", currency: "CHF", date: new Date().toISOString().slice(0, 10), description: "",
            accountId: state.accounts[0]?.id || "", frequency: "",
          } : undefined}
          accounts={state.accounts}
          onSubmit={(data) => { dispatch({ type: "ADD_TXN", data }); closeSheets(); }}
        />
      </Sheet>
      <Sheet open={!!quick && quick.kind === "goal"} onClose={closeSheets} title="Nouvel objectif">
        <GoalForm onSubmit={(data) => { dispatch({ type: "ADD_GOAL", data }); closeSheets(); }} />
      </Sheet>

      <Sheet open={!!editing && editing.kind === "account"} onClose={closeSheets} title="Modifier le compte">
        {editing?.kind === "account" && (
          <AccountForm
            initial={editing.data}
            onSubmit={(data) => { dispatch({ type: "UPDATE_ACCOUNT", id: editing.data.id, data }); closeSheets(); }}
            onDelete={confirmThen("Supprimer ce compte ? Ses transactions seront conservées en « Hors comptes ».", () => { dispatch({ type: "DELETE_ACCOUNT", id: editing.data.id }); closeSheets(); })}
          />
        )}
      </Sheet>
      <Sheet open={!!editing && editing.kind === "holding"} onClose={closeSheets} title="Modifier la position">
        {editing?.kind === "holding" && (
          <HoldingForm
            initial={editing.data}
            onSubmit={(data) => { dispatch({ type: "UPDATE_HOLDING", id: editing.data.id, data }); closeSheets(); }}
            onDelete={confirmThen("Supprimer cette position ?", () => { dispatch({ type: "DELETE_HOLDING", id: editing.data.id }); closeSheets(); })}
          />
        )}
      </Sheet>
      <Sheet open={!!editing && editing.kind === "transaction"} onClose={closeSheets} title="Modifier la transaction">
        {editing?.kind === "transaction" && (
          <TransactionForm
            initial={editing.data}
            accounts={state.accounts}
            onSubmit={(data) => { dispatch({ type: "UPDATE_TXN", id: editing.data.id, data }); closeSheets(); }}
            onDelete={confirmThen("Supprimer cette transaction ?", () => { dispatch({ type: "DELETE_TXN", id: editing.data.id }); closeSheets(); })}
          />
        )}
      </Sheet>
      <Sheet open={!!editing && editing.kind === "goal"} onClose={closeSheets} title="Modifier l'objectif">
        {editing?.kind === "goal" && (
          <GoalForm
            initial={editing.data}
            onSubmit={(data) => { dispatch({ type: "UPDATE_GOAL", id: editing.data.id, data }); closeSheets(); }}
            onDelete={confirmThen("Supprimer cet objectif ?", () => { dispatch({ type: "DELETE_GOAL", id: editing.data.id }); closeSheets(); })}
          />
        )}
      </Sheet>

      <Toast
        toast={toast}
        onUndo={handleUndo}
        onDismiss={() => { prevStateRef.current = null; setToast(null); }}
      />
    </div>
  );
}