import { useMemo } from "react";
import { sumBy, toBase, txnEffect, monthKey, monthLabel, addMonths, getFxRates } from "../utils/format.js";

// Centralise tous les calculs financiers dérivés de l'état brut :
// patrimoine, valeur nette, performance du portefeuille, séries mensuelles, etc.
export function useComputed(state) {
  return useMemo(() => {
    const accountCurrency = Object.fromEntries(state.accounts.map((a) => [a.id, a.currency || "CHF"]));
    const pending = {};
    for (const t of state.transactions) {
      if (!t.accountId) continue;
      const cur = accountCurrency[t.accountId];
      if (cur === undefined) continue;
      pending[t.accountId] = (pending[t.accountId] || 0) + txnEffect(t, cur);
    }
    const accounts = state.accounts.map((a) => ({
      ...a,
      balance: Math.round(((a.openingBalance ?? 0) + (pending[a.id] || 0)) * 100) / 100,
    }));

    const assetAccounts = accounts.filter((a) => a.category === "actif");
    const liabilityAccounts = accounts.filter((a) => a.category === "passif");
    const liquidity = sumBy(assetAccounts, (a) => toBase(a.balance, a.currency));
    const totalLiabilities = sumBy(liabilityAccounts, (a) => toBase(a.balance, a.currency));

    const holdingsCalc = state.holdings.map((h) => {
      const costBase = toBase(h.quantity * h.avgPrice, h.currency);
      const valueBase = toBase(h.quantity * h.currentPrice, h.currency);
      const gainBase = valueBase - costBase;
      const perfPct = costBase > 0 ? (gainBase / costBase) * 100 : 0;
      return { ...h, costBase, valueBase, gainBase, perfPct };
    });
    const totalInvestedCost = sumBy(holdingsCalc, (h) => h.costBase);
    const totalInvestedValue = sumBy(holdingsCalc, (h) => h.valueBase);
    const totalGain = totalInvestedValue - totalInvestedCost;
    const totalPerfPct = totalInvestedCost > 0 ? (totalGain / totalInvestedCost) * 100 : 0;
    const stocksValue = sumBy(holdingsCalc.filter((h) => h.type === "stock"), (h) => h.valueBase);
    const etfValue = sumBy(holdingsCalc.filter((h) => h.type === "etf"), (h) => h.valueBase);

    const totalAssets = liquidity + totalInvestedValue;
    const netWorth = totalAssets - totalLiabilities;

    const byMonth = {};
    state.transactions.forEach((t) => {
      const k = monthKey(t.date);
      if (!byMonth[k]) byMonth[k] = { income: 0, expense: 0 };
      const v = toBase(t.amount, t.currency);
      if (t.type === "revenu") byMonth[k].income += v;
      else byMonth[k].expense += v;
    });
    const monthKeys = Object.keys(byMonth).sort();
    const last6 = monthKeys.slice(-6);
    const monthlySeries = last6.map((k) => ({
      key: k,
      label: monthLabel(k),
      revenus: Math.round(byMonth[k].income),
      depenses: Math.round(byMonth[k].expense),
      epargne: Math.round(byMonth[k].income - byMonth[k].expense),
    }));

    const currentKey = monthKey(new Date());
    const thisMonth = byMonth[currentKey] || { income: 0, expense: 0 };
    const prevKey = monthKey(addMonths(new Date(), -1));
    const prevMonth = byMonth[prevKey] || { income: 0, expense: 0 };

    const thisMonthExpensesByCat = {};
    state.transactions
      .filter((t) => t.type === "depense" && monthKey(t.date) === currentKey)
      .forEach((t) => {
        thisMonthExpensesByCat[t.category] = (thisMonthExpensesByCat[t.category] || 0) + toBase(t.amount, t.currency);
      });

    const last3 = monthKeys.slice(-3).map((k) => byMonth[k].income - byMonth[k].expense);
    const avgMonthlySavings = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : 0;

    return {
      accounts, assetAccounts, liabilityAccounts, liquidity, totalLiabilities,
      holdingsCalc, totalInvestedCost, totalInvestedValue, totalGain, totalPerfPct,
      stocksValue, etfValue, totalAssets, netWorth,
      monthlySeries, thisMonthIncome: thisMonth.income, thisMonthExpense: thisMonth.expense,
      prevMonthIncome: prevMonth.income, prevMonthExpense: prevMonth.expense,
      thisMonthExpensesByCat, avgMonthlySavings,
    };
  }, [state.accounts, state.holdings, state.transactions, getFxRates()]);
}
