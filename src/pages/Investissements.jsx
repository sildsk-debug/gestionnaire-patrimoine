import React, { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Card, KpiCard, EmptyState } from "../components/ui.jsx";
import { fmtMoney, fmtPct } from "../utils/format.js";

export default function Investissements({ computed, openQuick, openEdit }) {
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("value");

  let rows = computed.holdingsCalc;
  if (filterType !== "all") rows = rows.filter((h) => h.type === filterType);
  rows = [...rows].sort((a, b) => {
    if (sortBy === "value") return b.valueBase - a.valueBase;
    if (sortBy === "perf") return b.perfPct - a.perfPct;
    if (sortBy === "gain") return b.gainBase - a.gainBase;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="page">
      <div className="kpi-grid kpi-grid-3">
        <KpiCard label="Valeur investie" value={fmtMoney(computed.totalInvestedCost)} icon={Wallet} />
        <KpiCard label="Valeur actuelle" value={fmtMoney(computed.totalInvestedValue)} icon={TrendingUp} />
        <KpiCard label="Gain / perte" value={fmtMoney(computed.totalGain)} sub={fmtPct(computed.totalPerfPct)} trend={computed.totalGain >= 0 ? "up" : "down"} icon={computed.totalGain >= 0 ? TrendingUp : TrendingDown} />
      </div>

      <div className="toolbar">
        <div className="chip-row">
          {[{ id: "all", label: "Tous" }, { id: "stock", label: "Actions" }, { id: "etf", label: "ETF" }].map((o) => (
            <button key={o.id} className={"chip " + (filterType === o.id ? "active" : "")} onClick={() => setFilterType(o.id)}>{o.label}</button>
          ))}
        </div>
        <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="value">Trier : Valeur</option>
          <option value="perf">Trier : Performance</option>
          <option value="gain">Trier : Gain/Perte</option>
          <option value="name">Trier : Nom</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune position" sub="Ajoutez votre première action ou ETF pour suivre votre portefeuille." actionLabel="Ajouter un investissement" onAction={() => openQuick("holding")} />
      ) : (
        <div className="holdings-list">
          {rows.map((h) => (
            <button key={h.id} className="holding-row" onClick={() => openEdit("holding", h)}>
              <div className="holding-main">
                <span className={"badge-type " + h.type}>{h.type === "stock" ? "Action" : "ETF"}</span>
                <div>
                  <div className="holding-name">{h.name}</div>
                  <div className="holding-sub">{h.ticker} · {h.quantity} × {fmtMoney(h.currentPrice, h.currency, 2)}</div>
                </div>
              </div>
              <div className="holding-values">
                <div className="holding-value">{fmtMoney(h.valueBase)}</div>
                <div className={"holding-perf " + (h.perfPct >= 0 ? "pos" : "neg")}>{fmtPct(h.perfPct)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => openQuick("holding")}><Plus size={22} /></button>
    </div>
  );
}
