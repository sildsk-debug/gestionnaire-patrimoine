import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Field } from "./ui.jsx";
import { CURRENCIES, ASSET_TYPES, LIABILITY_TYPES, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../data/constants.js";

export function AccountForm({ initial, onSubmit, onDelete }) {
  const [f, setF] = useState(initial || { name: "", category: "actif", type: "courant", currency: "CHF", balance: "" });
  const types = f.category === "actif" ? ASSET_TYPES : LIABILITY_TYPES;

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    onSubmit({ ...f, balance: Number(f.balance) || 0 });
  };

  return (
    <form onSubmit={submit} className="form">
      <Field label="Nom du compte">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex. Compte courant UBS" required />
      </Field>
      <div className="field-row">
        <Field label="Catégorie">
          <select
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value, type: e.target.value === "actif" ? "courant" : "credit" })}
          >
            <option value="actif">Actif</option>
            <option value="passif">Passif</option>
          </select>
        </Field>
        <Field label="Type">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="field-row">
        <Field label="Devise">
          <select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={f.category === "passif" ? "Montant dû" : "Solde"}>
          <input type="number" step="0.01" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} placeholder="0" required />
        </Field>
      </div>
      <div className="form-actions">
        {onDelete && (
          <button type="button" className="btn btn-ghost btn-danger" onClick={onDelete}>
            <Trash2 size={15} /> Supprimer
          </button>
        )}
        <button type="submit" className="btn btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}

export function HoldingForm({ initial, onSubmit, onDelete }) {
  const [f, setF] = useState(initial || { name: "", ticker: "", isin: "", type: "stock", quantity: "", avgPrice: "", currency: "CHF", currentPrice: "" });

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.ticker.trim()) return;
    onSubmit({ ...f, quantity: Number(f.quantity) || 0, avgPrice: Number(f.avgPrice) || 0, currentPrice: Number(f.currentPrice) || 0 });
  };

  return (
    <form onSubmit={submit} className="form">
      <div className="field-row">
        <Field label="Type">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="stock">Action</option>
            <option value="etf">ETF</option>
          </select>
        </Field>
        <Field label="Ticker">
          <input value={f.ticker} onChange={(e) => setF({ ...f, ticker: e.target.value.toUpperCase() })} placeholder="AAPL" required />
        </Field>
      </div>
      <Field label="Nom">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Apple Inc." required />
      </Field>
      {f.type === "etf" && (
        <Field label="ISIN (optionnel)">
          <input value={f.isin} onChange={(e) => setF({ ...f, isin: e.target.value })} placeholder="IE00B3RBWM25" />
        </Field>
      )}
      <div className="field-row">
        <Field label="Quantité">
          <input type="number" step="0.0001" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} placeholder="0" required />
        </Field>
        <Field label="Devise">
          <select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="field-row">
        <Field label="Prix de revient moyen">
          <input type="number" step="0.01" value={f.avgPrice} onChange={(e) => setF({ ...f, avgPrice: e.target.value })} placeholder="0" required />
        </Field>
        <Field label="Prix actuel">
          <input type="number" step="0.01" value={f.currentPrice} onChange={(e) => setF({ ...f, currentPrice: e.target.value })} placeholder="0" required />
        </Field>
      </div>
      <div className="form-actions">
        {onDelete && (
          <button type="button" className="btn btn-ghost btn-danger" onClick={onDelete}>
            <Trash2 size={15} /> Supprimer
          </button>
        )}
        <button type="submit" className="btn btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}

export function TransactionForm({ initial, accounts, onSubmit, onDelete }) {
  const [f, setF] = useState(
    initial || {
      type: "depense", category: "alimentation", amount: "", currency: "CHF",
      date: new Date().toISOString().slice(0, 10), description: "", accountId: accounts[0]?.id || "", recurring: false,
    }
  );
  const cats = f.type === "revenu" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!cats.find((c) => c.id === f.category)) setF((s) => ({ ...s, category: cats[0].id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.type]);

  const submit = (e) => {
    e.preventDefault();
    if (!f.amount) return;
    onSubmit({ ...f, amount: Number(f.amount) || 0 });
  };

  return (
    <form onSubmit={submit} className="form">
      <div className="segmented">
        <button type="button" className={f.type === "depense" ? "seg active" : "seg"} onClick={() => setF({ ...f, type: "depense" })}>Dépense</button>
        <button type="button" className={f.type === "revenu" ? "seg active" : "seg"} onClick={() => setF({ ...f, type: "revenu" })}>Revenu</button>
      </div>
      <Field label="Catégorie">
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
          ))}
        </select>
      </Field>
      <div className="field-row">
        <Field label="Montant">
          <input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0" required autoFocus />
        </Field>
        <Field label="Devise">
          <select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="ex. Courses Migros" />
      </Field>
      <div className="field-row">
        <Field label="Date">
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
        </Field>
        <Field label="Compte">
          <select value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <label className="checkbox-row">
        <input type="checkbox" checked={f.recurring} onChange={(e) => setF({ ...f, recurring: e.target.checked })} />
        <span>Transaction récurrente</span>
      </label>
      <div className="form-actions">
        {onDelete && (
          <button type="button" className="btn btn-ghost btn-danger" onClick={onDelete}>
            <Trash2 size={15} /> Supprimer
          </button>
        )}
        <button type="submit" className="btn btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}

export function GoalForm({ initial, onSubmit, onDelete }) {
  const [f, setF] = useState(initial || { name: "", target: "", current: "", targetDate: "" });

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.target) return;
    onSubmit({ ...f, target: Number(f.target) || 0, current: Number(f.current) || 0 });
  };

  return (
    <form onSubmit={submit} className="form">
      <Field label="Nom de l'objectif">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex. Voyage au Japon" required />
      </Field>
      <div className="field-row">
        <Field label="Montant cible (CHF)">
          <input type="number" step="0.01" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} placeholder="0" required />
        </Field>
        <Field label="Montant actuel (CHF)">
          <input type="number" step="0.01" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} placeholder="0" />
        </Field>
      </div>
      <Field label="Date cible">
        <input type="date" value={f.targetDate} onChange={(e) => setF({ ...f, targetDate: e.target.value })} />
      </Field>
      <div className="form-actions">
        {onDelete && (
          <button type="button" className="btn btn-ghost btn-danger" onClick={onDelete}>
            <Trash2 size={15} /> Supprimer
          </button>
        )}
        <button type="submit" className="btn btn-primary">Enregistrer</button>
      </div>
    </form>
  );
}
