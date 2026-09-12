import { addMonths, addYears } from "./format.js";

export const FREQUENCIES = [
  { id: "", label: "Non récurrente" },
  { id: "monthly", label: "Mensuelle" },
  { id: "quarterly", label: "Trimestrielle" },
  { id: "yearly", label: "Annuelle" },
];

const toIso = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const fromIso = (d) => new Date(d + "T00:00:00");

export function nextOccurrenceDate(lastDate, frequency) {
  const d = fromIso(lastDate);
  if (frequency === "quarterly") return toIso(addMonths(d, 3));
  if (frequency === "yearly") return toIso(addYears(d, 1));
  return toIso(addMonths(d, 1));
}

const identityKey = (t) =>
  [(t.accountId || ""), t.type, t.category, Number(t.amount), (t.description || "").trim().toLowerCase(), (t.frequency || "monthly")].join("|");

export function executeDueRecurring(transactions, today = new Date()) {
  const todayIso = toIso(today);

  const groups = {};
  for (const t of transactions) {
    if (!t.frequency) continue;
    const key = identityKey(t);
    (groups[key] = groups[key] || []).push(t);
  }

  const existing = new Set(transactions.map((t) => identityKey(t) + "|" + t.date));
  const created = [];

  for (const key of Object.keys(groups)) {
    const group = groups[key];
    let latest = null;
    for (const t of group) {
      const d = fromIso(t.date).getTime();
      if (latest === null || d > latest) latest = d;
    }
    if (latest === null) continue;

    const lastDate = toIso(new Date(latest));
    const base = group.find((t) => t.date === lastDate) || group[0];
    const next = nextOccurrenceDate(lastDate, base.frequency);

    if (next > todayIso) continue;
    if (existing.has(key + "|" + next)) continue;

    created.push({ ...base, date: next, recurring: true });
  }

  created.sort((a, b) => a.date.localeCompare(b.date));
  return created;
}