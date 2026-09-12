import { setFxRates } from "./format.js";

const FX_KEY = "patrimoine:fx:v1";

export function loadCachedFx() {
  try {
    const raw = window.localStorage.getItem(FX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.rates) {
      setFxRates(parsed.rates);
      return parsed;
    }
    return null;
  } catch (err) {
    console.error("Impossible de lire les taux en cache :", err);
    return null;
  }
}

function storeFx(rates, date) {
  try {
    window.localStorage.setItem(FX_KEY, JSON.stringify({ rates, date }));
  } catch (err) {
    console.error("Impossible de mettre en cache les taux :", err);
  }
}

export function getCachedFxDate() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FX_KEY) || "null");
    return parsed && parsed.date ? parsed.date : null;
  } catch {
    return null;
  }
}

export async function refreshFx() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?base=CHF&symbols=EUR,USD,GBP", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("Réponse API FX invalide");
    const json = await res.json();
    if (!json.rates) throw new Error("Format API FX inattendu");

    const rates = {};
    for (const [cur, perChf] of Object.entries(json.rates)) {
      if (perChf > 0) rates[cur] = 1 / perChf;
    }
    const date = json.date || new Date().toISOString().slice(0, 10);
    setFxRates(rates);
    storeFx(rates, date);
    return { rates, date };
  } catch (err) {
    console.warn("Taux de change indisponibles, taux statiques utilisés :", err.message);
    return null;
  }
}