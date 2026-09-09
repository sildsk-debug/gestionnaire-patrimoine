export const uid = (prefix = "id") => prefix + "_" + Math.random().toString(36).slice(2, 10);

// Les montants sont additionnés en centimes (entiers) pour éviter les erreurs
// d'arrondi liées aux flottants lors des agrégations financières.
const toCents = (n) => Math.round((Number(n) || 0) * 100);
const fromCents = (c) => c / 100;
export const sumBy = (arr, selector) => fromCents(arr.reduce((acc, item) => acc + toCents(selector(item)), 0));

export const FX_TO_CHF = { CHF: 1, EUR: 1.04, USD: 0.89, GBP: 1.21 };
export const toBase = (amount, currency) => amount * (FX_TO_CHF[currency] ?? 1);

export function fmtMoney(amount, currency = "CHF", decimals = 0) {
  try {
    return new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(amount);
  } catch (err) {
    return amount.toFixed(decimals) + " " + currency;
  }
}

export const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + " %";
export const fmtDate = (d) => new Date(d).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" });

export const addMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};
export const monthKey = (d) => {
  const dt = new Date(d);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
};
export const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-CH", { month: "short", year: "2-digit" });
};
export const catInfo = (list, id) => list.find((c) => c.id === id) || { label: id, icon: "📦" };
