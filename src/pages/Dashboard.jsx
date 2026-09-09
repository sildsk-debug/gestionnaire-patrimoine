import React, { useMemo, useState } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Wallet, Banknote, PiggyBank, TrendingUp, ArrowDownCircle, ArrowUpCircle, Target, Plus } from "lucide-react";
import { Card, KpiCard, ChartEmpty, RangeSelector, filterHistory } from "../components/ui.jsx";
import { EXPENSE_CATEGORIES, CATEGORY_PALETTE } from "../data/constants.js";
import { fmtMoney, fmtPct, fmtDate, catInfo } from "../utils/format.js";

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 };

export default function Dashboard({ state, computed, openQuick }) {
  const [range, setRange] = useState("6m");

  const chartData = useMemo(() => {
    const hist = filterHistory(state.netWorthHistory, range).map((h) => ({ date: h.date, label: fmtDate(h.date), value: Math.round(h.value) }));
    const todayLabel = "Aujourd'hui";
    if (!hist.length || hist[hist.length - 1].label !== todayLabel) {
      hist.push({ date: new Date().toISOString().slice(0, 10), label: todayLabel, value: Math.round(computed.netWorth) });
    }
    return hist;
  }, [state.netWorthHistory, range, computed.netWorth]);

  const allocationData = [
    { name: "Liquidités", value: Math.round(computed.liquidity) },
    { name: "Actions", value: Math.round(computed.stocksValue) },
    { name: "ETF", value: Math.round(computed.etfValue) },
  ].filter((d) => d.value > 0);

  const expenseCatData = Object.entries(computed.thisMonthExpensesByCat)
    .map(([cat, val]) => ({ name: catInfo(EXPENSE_CATEGORIES, cat).label, value: Math.round(val) }))
    .sort((a, b) => b.value - a.value);

  const savingsThisMonth = computed.thisMonthIncome - computed.thisMonthExpense;
  const incomeDelta = computed.prevMonthIncome ? ((computed.thisMonthIncome - computed.prevMonthIncome) / computed.prevMonthIncome) * 100 : 0;
  const expenseDelta = computed.prevMonthExpense ? ((computed.thisMonthExpense - computed.prevMonthExpense) / computed.prevMonthExpense) * 100 : 0;

  return (
    <div className="page">
      <div className="quick-actions">
        <button className="qa-btn" onClick={() => openQuick("transaction", { type: "depense" })}><Plus size={14} /> Dépense</button>
        <button className="qa-btn" onClick={() => openQuick("transaction", { type: "revenu" })}><Plus size={14} /> Revenu</button>
        <button className="qa-btn" onClick={() => openQuick("holding")}><Plus size={14} /> Investissement</button>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Patrimoine total" value={fmtMoney(computed.totalAssets)} icon={Wallet} />
        <KpiCard label="Valeur nette" value={fmtMoney(computed.netWorth)} icon={Banknote} />
        <KpiCard label="Liquidités" value={fmtMoney(computed.liquidity)} icon={PiggyBank} />
        <KpiCard label="Investissements" value={fmtMoney(computed.totalInvestedValue)} sub={fmtPct(computed.totalPerfPct)} trend={computed.totalPerfPct >= 0 ? "up" : "down"} icon={TrendingUp} />
        <KpiCard label="Revenus du mois" value={fmtMoney(computed.thisMonthIncome)} sub={fmtPct(incomeDelta) + " vs mois préc."} trend={incomeDelta >= 0 ? "up" : "down"} icon={ArrowDownCircle} />
        <KpiCard label="Dépenses du mois" value={fmtMoney(computed.thisMonthExpense)} sub={fmtPct(expenseDelta) + " vs mois préc."} trend={expenseDelta <= 0 ? "up" : "down"} icon={ArrowUpCircle} />
        <KpiCard label="Épargne du mois" value={fmtMoney(savingsThisMonth)} icon={Target} />
        <KpiCard label="Performance portefeuille" value={fmtPct(computed.totalPerfPct)} sub={fmtMoney(computed.totalGain)} trend={computed.totalGain >= 0 ? "up" : "down"} icon={TrendingUp} />
      </div>

      <Card>
        <div className="card-header">
          <h3>Évolution du patrimoine</h3>
          <RangeSelector range={range} setRange={setRange} />
        </div>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
              <Line type="monotone" dataKey="value" stroke="var(--pos)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <ChartEmpty text="Pas encore assez d'historique" />}
      </Card>

      <div className="chart-grid">
        <Card>
          <h3>Répartition du patrimoine</h3>
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
          ) : <ChartEmpty text="Ajoutez des comptes ou investissements" />}
        </Card>

        <Card>
          <h3>Dépenses par catégorie (mois en cours)</h3>
          {expenseCatData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={expenseCatData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                  {expenseCatData.map((d, i) => <Cell key={i} fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <ChartEmpty text="Aucune dépense ce mois-ci" />}
        </Card>
      </div>

      <Card>
        <h3>Revenus vs dépenses</h3>
        {computed.monthlySeries.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={computed.monthlySeries} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenus" fill="var(--pos)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="depenses" fill="var(--neg)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <ChartEmpty text="Ajoutez des transactions pour voir ce graphique" />}
      </Card>
    </div>
  );
}
