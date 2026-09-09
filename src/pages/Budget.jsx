import React from "react";
import { Card, ProgressBar } from "../components/ui.jsx";
import { EXPENSE_CATEGORIES } from "../data/constants.js";
import { fmtMoney } from "../utils/format.js";

export default function Budget({ state, computed, dispatch }) {
  return (
    <div className="page">
      <Card>
        <h3>Budget mensuel par catégorie</h3>
        <p className="muted-line">Définissez une limite pour chaque catégorie de dépenses et suivez votre progression en temps réel.</p>
      </Card>
      <div className="budget-list">
        {EXPENSE_CATEGORIES.filter((c) => c.id !== "autres" && c.id !== "education").map((c) => {
          const budget = state.budgets[c.id] || 0;
          const spent = computed.thisMonthExpensesByCat[c.id] || 0;
          const pct = budget > 0 ? (spent / budget) * 100 : 0;
          const tone = pct >= 100 ? "danger" : pct >= 80 ? "warn" : "normal";
          return (
            <Card key={c.id} className="budget-row">
              <div className="budget-top">
                <span className="budget-cat">{c.icon} {c.label}</span>
                <input
                  type="number"
                  className="budget-input"
                  value={budget || ""}
                  placeholder="0"
                  onChange={(e) => dispatch({ type: "SET_BUDGET", category: c.id, amount: Number(e.target.value) || 0 })}
                />
              </div>
              <ProgressBar pct={pct} tone={tone} />
              <div className="budget-bottom">
                <span>{fmtMoney(spent)} / {fmtMoney(budget)}</span>
                <span className={tone === "danger" ? "neg" : tone === "warn" ? "warn" : "muted"}>{pct.toFixed(0)} %</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
