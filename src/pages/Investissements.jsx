import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Wallet, TrendingUp, TrendingDown, Plus, RefreshCw } from "lucide-react";
import { Card, KpiCard, EmptyState } from "../components/ui.jsx";
import SwipeableRow from "../components/SwipeableRow.jsx";
import { fmtMoney, fmtPct, fmtDate } from "../utils/format.js";
import { refreshAllQuotes, getCachedQuote } from "../utils/marketData.js";
import { loadSettings } from "../utils/settings.js";

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 };

export default function Investissements({ state, dispatch, computed, openQuick, openEdit }) {
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("value");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState(null); // { type, text }
  const [historyId, setHistoryId] = useState("");

  let rows = computed.holdingsCalc;
  if (filterType !== "all") rows = rows.filter((h) => h.type === filterType);
  rows = [...rows].sort((a, b) => {
    if (sortBy === "value") return b.valueBase - a.valueBase;
    if (sortBy === "perf") return b.perfPct - a.perfPct;
    if (sortBy === "gain") return b.gainBase - a.gainBase;
    return a.name.localeCompare(b.name);
  });

  const historyData = useMemo(() => {
    if (!historyId) return [];
    const points = [];
    for (const snap of state.netWorthHistory) {
      if (snap.holdings && snap.holdings[historyId] != null) {
        points.push({ key: snap.date, label: fmtDate(snap.date), value: snap.holdings[historyId] });
      }
    }
    const h = computed.holdingsCalc.find((x) => x.id === historyId);
    if (h) points.push({ key: "today", label: "Aujourd'hui", value: Math.round(h.valueBase) });
    return points.sort((a, b) => a.key.localeCompare(b.key));
  }, [historyId, state.netWorthHistory, computed.holdingsCalc]);

  const historyHolding = computed.holdingsCalc.find((h) => h.id === historyId);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMsg(null);
    const settings = loadSettings();
    if (!settings.marketApiKey) {
      setRefreshMsg({ type: "error", text: "Ajoutez une clé API dans les Paramètres pour actualiser les cours (ou saisissez les prix manuellement)." });
      setRefreshing(false);
      return;
    }
    const toRefresh = computed.holdingsCalc.filter((h) => getCachedQuote(h.ticker) == null);
    if (toRefresh.length === 0) {
      setRefreshMsg({ type: "info", text: "Tous les cours sont déjà à jour (cache quotidien)." });
      setRefreshing(false);
      return;
    }
    const res = await refreshAllQuotes(toRefresh, settings.marketApiKey);
    for (const h of toRefresh) {
      if (h.appliedPrice != null) dispatch({ type: "UPDATE_HOLDING", id: h.id, data: { currentPrice: h.appliedPrice } });
    }
    const parts = [];
    if (res.updated) parts.push(`${res.updated} cours mis à jour`);
    if (res.skipped) parts.push(`${res.skipped} déjà à jour`);
    const text = parts.join(", ") + (res.errors.length ? `. Erreurs : ${res.errors.map((e) => e.ticker + " (" + e.message + ")").join(", ")}` : ".");
    setRefreshMsg({ type: res.errors.length ? "warn" : "success", text });
    setRefreshing(false);
  };

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

      <button className="btn btn-ghost" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw size={15} className={refreshing ? "spin" : ""} />
        {refreshing ? "Actualisation..." : "Actualiser les cours"}
      </button>
      {refreshMsg && <p className={"muted-line status-" + refreshMsg.type}>{refreshMsg.text}</p>}

      {rows.length === 0 ? (
        <EmptyState title="Aucune position" sub="Ajoutez votre première action ou ETF pour suivre votre portefeuille." actionLabel="Ajouter un investissement" onAction={() => openQuick("holding")} />
      ) : (
        <div className="holdings-list">
          {rows.map((h) => (
            <SwipeableRow key={h.id} id={h.id} onDelete={() => dispatch({ type: "DELETE_HOLDING", id: h.id })}>
              <button className="holding-row" onClick={() => openEdit("holding", h)}>
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
            </SwipeableRow>
          ))}
        </div>
      )}

      {computed.holdingsCalc.length > 0 && (
        <Card>
          <h3>Évolution d'une position</h3>
          <select className="sort-select full" value={historyId} onChange={(e) => setHistoryId(e.target.value)}>
            <option value="">Choisir une position...</option>
            {computed.holdingsCalc.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          {historyData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historyData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                <Line type="monotone" dataKey="value" stroke="var(--pos)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted-line" style={{ paddingTop: 8 }}>
              {historyData.length === 0
                ? "Les courbes se construisent à partir des instantanés enregistrés depuis la page Patrimoine."
                : "Enregistrez un nouvel instantané depuis la page Patrimoine pour faire apparaître la courbe."}
            </p>
          )}
          {historyHolding && historyData.length >= 1 && (
            <div className="budget-bottom" style={{ marginTop: 8 }}>
              <span>Dernier point : {historyData[historyData.length - 1].label}</span>
              <span className="row-value">{fmtMoney(historyData[historyData.length - 1].value)}</span>
            </div>
          )}
        </Card>
      )}

      <button className="fab" onClick={() => openQuick("holding")}><Plus size={22} /></button>
    </div>
  );
}