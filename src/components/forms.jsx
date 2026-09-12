import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Field } from "./ui.jsx";
import { CURRENCIES, ASSET_TYPES, LIABILITY_TYPES, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../data/constants.js";
import { FREQUENCIES } from "../utils/recurring.js";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export function AccountForm({ initial, onSubmit, onDelete }) {
  const [f, setF] = useState(() =>
    initial
      ? {
          name: initial.name || "",
          category: initial.category || "actif",
          type: initial.type || "courant",
          currency: initial.currency || "CHF",
          balance: initial.openingBalance ?? initial.balance ?? "",
        }
      : { name: "", category: "actif", type: "courant", currency: "CHF", balance: "" }
  );
  const [errors, setErrors] = useState({});
  const types = f.category === "actif" ? ASSET_TYPES : LIABILITY_TYPES;

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = "Le nom est requis.";
    const bal = num(f.balance);
    if (f.balance === "" || f.balance === null) errs.balance = "Le montant est requis.";
    else if (Number.isNaN(bal)) errs.balance = "Montant invalide.";
    else if (bal < 0) errs.balance = "Le montant ne peut pas être négatif.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const { balance, ...rest } = f;
    onSubmit({ ...rest, openingBalance: bal });
  };

  return (
    <form onSubmit={submit} className="form" noValidate>
      <Field label="Nom du compte" error={errors.name}>
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
        <Field label={f.category === "passif" ? "Montant dû (initial)" : "Solde initial"} error={errors.balance}>
          <input type="number" min="0" step="0.01" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} placeholder="0" required />
        </Field>
      </div>
      <p className="muted-line">Le solde affiché est recalculé automatiquement : solde initial + transactions associées.</p>
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
  const [f, setF] = useState(
    initial || { name: "", ticker: "", isin: "", type: "stock", quantity: "", avgPrice: "", currency: "CHF", currentPrice: "" }
  );
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = "Le nom est requis.";
    if (!f.ticker.trim()) errs.ticker = "Le ticker est requis.";
    for (const k of ["quantity", "avgPrice", "currentPrice"]) {
      if (f[k] === "" || f[k] === null) errs[k] = "Champ requis.";
      else if (Number.isNaN(num(f[k]))) errs[k] = "Valeur invalide.";
      else if (num(f[k]) < 0) errs[k] = "Valeur négative interdite.";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSubmit({
      ...f,
      quantity: num(f.quantity) || 0,
      avgPrice: num(f.avgPrice) || 0,
      currentPrice: num(f.currentPrice) || 0,
    });
  };

  return (
    <form onSubmit={submit} className="form" noValidate>
      <div className="field-row">
        <Field label="Type">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="stock">Action</option>
            <option value="etf">ETF</option>
          </select>
        </Field>
        <Field label="Ticker" error={errors.ticker}>
          <input value={f.ticker} onChange={(e) => setF({ ...f, ticker: e.target.value.toUpperCase() })} placeholder="AAPL" required />
        </Field>
      </div>
      <Field label="Nom" error={errors.name}>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Apple Inc." required />
      </Field>
      {f.type === "etf" && (
        <Field label="ISIN (optionnel)">
          <input value={f.isin} onChange={(e) => setF({ ...f, isin: e.target.value })} placeholder="IE00B3RBWM25" />
        </Field>
      )}
      <div className="field-row">
        <Field label="Quantité" error={errors.quantity}>
          <input type="number" min="0" step="0.0001" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} placeholder="0" required />
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
        <Field label="Prix de revient moyen" error={errors.avgPrice}>
          <input type="number" min="0" step="0.01" value={f.avgPrice} onChange={(e) => setF({ ...f, avgPrice: e.target.value })} placeholder="0" required />
        </Field>
        <Field label="Prix actuel" error={errors.currentPrice}>
          <input type="number" min="0" step="0.01" value={f.currentPrice} onChange={(e) => setF({ ...f, currentPrice: e.target.value })} placeholder="0" required />
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
      date: new Date().toISOString().slice(0, 10), description: "", accountId: accounts[0]?.id || "", frequency: "",
    }
  );
  const [errors, setErrors] = useState({});
  const cats = f.type === "revenu" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const frequency = f.frequency ?? (f.recurring ? "monthly" : "");

  useEffect(() => {
    if (!cats.find((c) => c.id === f.category)) setF((s) => ({ ...s, category: cats[0].id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.type]);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    const amt = num(f.amount);
    if (f.amount === "" || f.amount === null) errs.amount = "Le montant est requis.";
    else if (Number.isNaN(amt)) errs.amount = "Montant invalide.";
    else if (amt <= 0) errs.amount = "Le montant doit être supérieur à 0.";
    if (!f.date) errs.date = "La date est requise.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSubmit({ ...f, amount: amt, recurring: !!frequency, frequency });
  };

  return (
    <form onSubmit={submit} className="form" noValidate>
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
        <Field label="Montant" error={errors.amount}>
          <input type="number" min="0.01" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0" required autoFocus />
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
        <Field label="Date" error={errors.date}>
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
        </Field>
        <Field label="Compte">
          <select value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}>
            <option value="">Hors comptes</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Récurrence">
        <select value={frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
          {FREQUENCIES.map((fr) => (
            <option key={fr.id} value={fr.id}>{fr.label}</option>
          ))}
        </select>
      </Field>
      {frequency && (
        <p className="muted-line">Les occurrences dues seront créées automatiquement à l'ouverture de l'application.</p>
      )}
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
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = "Le nom est requis.";
    const target = num(f.target);
    if (f.target === "" || f.target === null) errs.target = "Le montant cible est requis.";
    else if (Number.isNaN(target)) errs.target = "Montant invalide.";
    else if (target <= 0) errs.target = "La cible doit être supérieure à 0.";
    const current = num(f.current) || 0;
    if (f.current !== "" && f.current != null && Number.isNaN(num(f.current))) errs.current = "Montant invalide.";
    else if (current < 0) errs.current = "Montant négatif interdit.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSubmit({ ...f, target, current });
  };

  return (
    <form onSubmit={submit} className="form" noValidate>
      <Field label="Nom de l'objectif" error={errors.name}>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex. Voyage au Japon" required />
      </Field>
      <div className="field-row">
        <Field label="Montant cible (CHF)" error={errors.target}>
          <input type="number" min="0.01" step="0.01" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} placeholder="0" required />
        </Field>
        <Field label="Montant actuel (CHF)" error={errors.current}>
          <input type="number" min="0" step="0.01" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} placeholder="0" />
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