import React, { useMemo, useState } from "react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Camera } from "lucide-react";
import { Card, RangeSelector, filterHistory } from "../components/ui.jsx";
import { CATEGORY_PALETTE } from "../data/constants.js";
import { fmtMoney, fmtDate } from "../utils/format.js";

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 };

export default function Patrimoine({ state, computed, openEdit, dispatch }) {
  const [range, setRange] = useState("6m");

  const chartData = useMemo(() => {
    const hist = filterHistory(state.netWorthHistory, range).map((h) => ({ label: fmtDate(h.date), value: Math.round(h.value) }));
    hist.push({ label: "Aujourd'hui", value: Math.round(computed.netWorth) });
    return hist;
  }, [state.netWorthHistory, range, computed.netWorth]);

  const takeSnapshot = () => dispatch({ type: "ADD_SNAPSHOT", date: new Date().toISOString().slice(0, 10), value: Math.round(computed.netWorth) });

  const allocationData = [
    { name: "Liquidités", value: Math.round(computed.liquidity) },
    { name: "Actions", value: Math.round(computed.stocksValue) },
    { name: "ETF", value: Math.round(computed.etfValue) },
  ].filter((d) => d.value > 0);

  return (
    <div className="page">
      <Card className="hero-card">
        <span className="hero-label">Valeur nette</span>
        <div className="hero-value">{fmtMoney(computed.netWorth)}</div>
        <div className="hero-row">
          <span>Actifs : <b>{fmtMoney(computed.totalAssets)}</b></span>
          <span>Passifs : <b>{fmtMoney(computed.totalLiabilities)}</b></span>
        </div>
        <button className="btn btn-ghost" onClick={takeSnapshot}><Camera size={15} /> Enregistrer un instantané</button>
      </Card>

      <Card>
        <div className="card-header">
          <h3>Évolution</h3>
          <RangeSelector range={range} setRange={setRange} />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
            <Line type="monotone" dataKey="value" stroke="var(--pos)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3>Composition</h3>
        {allocationData.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                {allocationData.map((d, i) => <Cell key={i} fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">Ajoutez des comptes ou investissements</div>}
      </Card>

      <Card>
        <h3>Actifs</h3>
        {computed.assetAccounts.length === 0 && <div className="muted-line">Aucun compte actif</div>}
        {computed.assetAccounts.map((a) => (
          <button key={a.id} className="row-item" onClick={() => openEdit("account", a)}>
            <span>{a.name}</span>
            <span className="row-value">{fmtMoney(a.balance, a.currency)}</span>
          </button>
        ))}
        <div className="row-item row-item-strong">
          <span>Investissements (actions + ETF)</span>
          <span className="row-value">{fmtMoney(computed.totalInvestedValue)}</span>
        </div>
      </Card>

      <Card>
        <h3>Passifs</h3>
        {computed.liabilityAccounts.length === 0 && <div className="muted-line">Aucun passif enregistré</div>}
        {computed.liabilityAccounts.map((a) => (
          <button key={a.id} className="row-item" onClick={() => openEdit("account", a)}>
            <span>{a.name}</span>
            <span className="row-value neg">{fmtMoney(a.balance, a.currency)}</span>
          </button>
        ))}
      </Card>
    </div>
  );
}
