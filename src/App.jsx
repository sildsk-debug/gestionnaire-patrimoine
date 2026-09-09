import React, { useEffect, useReducer, useState } from "react";
import { Menu, X, Moon, Sun } from "lucide-react";
import { reducer, emptyState } from "./state/reducer.js";
import { useComputed } from "./state/useComputed.js";
import { buildDemoData } from "./data/demoData.js";
import { loadState, saveState } from "./utils/storage.js";
import { NAV } from "./data/constants.js";
import { Sheet } from "./components/ui.jsx";
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

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [navOpen, setNavOpen] = useState(false);
  const [quick, setQuick] = useState(null); // { kind, prefill }
  const [editing, setEditing] = useState(null); // { kind, data }

  // Sauvegarde automatique dans localStorage à chaque changement (léger debounce).
  useEffect(() => {
    const t = setTimeout(() => saveState(state), 300);
    return () => clearTimeout(t);
  }, [state]);

  const computed = useComputed(state);

  const openQuick = (kind, prefill) => { setQuick({ kind, prefill }); setNavOpen(false); };
  const openEdit = (kind, data) => { setEditing({ kind, data }); setNavOpen(false); };
  const closeSheets = () => { setQuick(null); setEditing(null); };

  const activeNav = NAV.find((n) => n.id === state.view) || NAV[0];

  return (
    <div className="app-root" data-theme={state.theme}>
      <header className="app-header">
        <button className="icon-btn" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
        <span className="app-title">{activeNav.label}</span>
        <button className="icon-btn" onClick={() => dispatch({ type: "TOGGLE_THEME" })}>
          {state.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <main className="app-main">
        {state.view === "dashboard" && <Dashboard state={state} computed={computed} openQuick={openQuick} />}
        {state.view === "patrimoine" && <Patrimoine state={state} computed={computed} openEdit={openEdit} dispatch={dispatch} />}
        {state.view === "investissements" && <Investissements computed={computed} openQuick={openQuick} openEdit={openEdit} />}
        {state.view === "transactions" && <Transactions state={state} kind="all" openQuick={openQuick} openEdit={openEdit} />}
        {state.view === "revenus" && <Transactions state={state} kind="revenu" openQuick={openQuick} openEdit={openEdit} />}
        {state.view === "depenses" && <Transactions state={state} kind="depense" openQuick={openQuick} openEdit={openEdit} />}
        {state.view === "budget" && <Budget state={state} computed={computed} dispatch={dispatch} />}
        {state.view === "objectifs" && <Objectifs state={state} computed={computed} openQuick={openQuick} openEdit={openEdit} />}
        {state.view === "comptes" && <Comptes state={state} openQuick={openQuick} openEdit={openEdit} />}
        {state.view === "parametres" && <Parametres state={state} dispatch={dispatch} />}
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
            accountId: state.accounts[0]?.id || "", recurring: false,
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
            onDelete={() => { dispatch({ type: "DELETE_ACCOUNT", id: editing.data.id }); closeSheets(); }}
          />
        )}
      </Sheet>
      <Sheet open={!!editing && editing.kind === "holding"} onClose={closeSheets} title="Modifier la position">
        {editing?.kind === "holding" && (
          <HoldingForm
            initial={editing.data}
            onSubmit={(data) => { dispatch({ type: "UPDATE_HOLDING", id: editing.data.id, data }); closeSheets(); }}
            onDelete={() => { dispatch({ type: "DELETE_HOLDING", id: editing.data.id }); closeSheets(); }}
          />
        )}
      </Sheet>
      <Sheet open={!!editing && editing.kind === "transaction"} onClose={closeSheets} title="Modifier la transaction">
        {editing?.kind === "transaction" && (
          <TransactionForm
            initial={editing.data}
            accounts={state.accounts}
            onSubmit={(data) => { dispatch({ type: "UPDATE_TXN", id: editing.data.id, data }); closeSheets(); }}
            onDelete={() => { dispatch({ type: "DELETE_TXN", id: editing.data.id }); closeSheets(); }}
          />
        )}
      </Sheet>
      <Sheet open={!!editing && editing.kind === "goal"} onClose={closeSheets} title="Modifier l'objectif">
        {editing?.kind === "goal" && (
          <GoalForm
            initial={editing.data}
            onSubmit={(data) => { dispatch({ type: "UPDATE_GOAL", id: editing.data.id, data }); closeSheets(); }}
            onDelete={() => { dispatch({ type: "DELETE_GOAL", id: editing.data.id }); closeSheets(); }}
          />
        )}
      </Sheet>
    </div>
  );
}
