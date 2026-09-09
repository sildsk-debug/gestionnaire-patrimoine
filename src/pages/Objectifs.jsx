import React from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Card, ProgressBar, EmptyState } from "../components/ui.jsx";
import { fmtMoney, fmtDate } from "../utils/format.js";

export default function Objectifs({ state, computed, openQuick, openEdit }) {
  return (
    <div className="page">
      {state.goals.length === 0 ? (
        <EmptyState title="Aucun objectif" sub="Créez un objectif financier pour suivre votre progression." actionLabel="Créer un objectif" onAction={() => openQuick("goal")} />
      ) : (
        <div className="goals-list">
          {state.goals.map((g) => {
            const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
            const remaining = g.target - g.current;
            const monthsLeft = computed.avgMonthlySavings > 0 ? Math.max(0, Math.ceil(remaining / computed.avgMonthlySavings)) : null;
            return (
              <Card key={g.id} className="goal-card" onClick={() => openEdit("goal", g)}>
                <div className="goal-top">
                  <span className="goal-name">{g.name}</span>
                  <ChevronRight size={16} className="muted" />
                </div>
                <ProgressBar pct={pct} />
                <div className="budget-bottom">
                  <span>{fmtMoney(g.current)} / {fmtMoney(g.target)}</span>
                  <span className="muted">{pct.toFixed(0)} %</span>
                </div>
                <div className="goal-footer">
                  {g.targetDate && <span>Échéance : {fmtDate(g.targetDate)}</span>}
                  {monthsLeft !== null && <span>≈ {monthsLeft} mois au rythme actuel</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <button className="fab" onClick={() => openQuick("goal")}><Plus size={22} /></button>
    </div>
  );
}
