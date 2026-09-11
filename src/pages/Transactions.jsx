import React, { useState } from "react";
import { Search, ArrowUpDown, Plus } from "lucide-react";
import { Card, EmptyState } from "../components/ui.jsx";
import SwipeableRow from "../components/SwipeableRow.jsx";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../data/constants.js";
import { fmtMoney, fmtDate, toBase, sumBy, catInfo } from "../utils/format.js";

// Page réutilisée pour les 3 vues : Transactions (kind="all"), Revenus ("revenu"), Dépenses ("depense").
export default function Transactions({ state, dispatch, kind, openQuick, openEdit }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortDesc, setSortDesc] = useState(true);

  const cats = kind === "revenu" ? INCOME_CATEGORIES : kind === "depense" ? EXPENSE_CATEGORIES : [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
  let rows = state.transactions.filter((t) => (kind === "all" ? true : t.type === kind));
  if (catFilter !== "all") rows = rows.filter((t) => t.category === catFilter);
  if (search.trim()) rows = rows.filter((t) => t.description.toLowerCase().includes(search.toLowerCase()));
  rows = [...rows].sort((a, b) => (sortDesc ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)));

  const total = sumBy(rows, (t) => toBase(t.amount, t.currency));

  return (
    <div className="page">
      <div className="search-row">
        <div className="search-input">
          <Search size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une description..." />
        </div>
        <button className="icon-btn" onClick={() => setSortDesc((s) => !s)}><ArrowUpDown size={16} /></button>
      </div>
      <div className="chip-row scrollable">
        <button className={"chip " + (catFilter === "all" ? "active" : "")} onClick={() => setCatFilter("all")}>Toutes</button>
        {cats.map((c) => (
          <button key={c.id} className={"chip " + (catFilter === c.id ? "active" : "")} onClick={() => setCatFilter(c.id)}>{c.icon} {c.label}</button>
        ))}
      </div>

      <Card className="total-strip">
        <span>{rows.length} transaction{rows.length > 1 ? "s" : ""}</span>
        <span className="row-value">{fmtMoney(total)}</span>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="Aucune transaction" sub="Ajoutez-en une pour commencer à suivre vos finances." actionLabel="Ajouter" onAction={() => openQuick("transaction", kind !== "all" ? { type: kind } : undefined)} />
      ) : (
        <div className="txn-list">
          {rows.map((t) => {
            const info = catInfo(t.type === "revenu" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES, t.category);
            return (
              <SwipeableRow key={t.id} id={t.id} onDelete={() => dispatch({ type: "DELETE_TXN", id: t.id })}>
                <button className="txn-row" onClick={() => openEdit("transaction", t)}>
                  <span className="txn-icon">{info.icon}</span>
                  <div className="txn-mid">
                    <div className="txn-desc">{t.description || info.label}</div>
                    <div className="txn-sub">{info.label} · {fmtDate(t.date)}</div>
                  </div>
                  <span className={"txn-amount " + (t.type === "revenu" ? "pos" : "neg")}>{t.type === "revenu" ? "+" : "−"}{fmtMoney(t.amount, t.currency)}</span>
                </button>
              </SwipeableRow>
            );
          })}
        </div>
      )}
      <button className="fab" onClick={() => openQuick("transaction", kind !== "all" ? { type: kind } : undefined)}><Plus size={22} /></button>
    </div>
  );
}
