import { describe, it, expect, beforeEach } from "vitest";
import {
  getQuoteBudget,
  useQuoteBudget,
  getCachedQuote,
  getProviderDailyLimit,
  parseTwelveDataPrices,
} from "./marketData.js";

function createStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _store: store,
  };
}

let storage;

beforeEach(() => {
  storage = createStorage();
  globalThis.window = { localStorage: storage };
});

function localDayKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("quote budget", () => {
  it("débute à 0 requête utilisée", () => {
    expect(getQuoteBudget().used).toBe(0);
  });

  it("incrémente le compteur du jour", () => {
    useQuoteBudget();
    useQuoteBudget(2);
    expect(getQuoteBudget()).toEqual({ date: localDayKey(), used: 3 });
  });

  it("réinitialise le compteur le lendemain", () => {
    storage._store.set(
      "patrimoine:quote-budget:v1",
      JSON.stringify({ date: localDayKey(-1), used: getProviderDailyLimit("alphavantage") })
    );
    expect(getQuoteBudget().used).toBe(0);
  });

  it("détecte le plafond quotidien atteint", () => {
    const limit = getProviderDailyLimit("alphavantage");
    for (let i = 0; i < limit; i++) useQuoteBudget();
    expect(getQuoteBudget().used >= limit).toBe(true);
  });
});

describe("quote cache", () => {
  it("retourne le prix quand le cache est plus récent que la fenêtre", () => {
    storage._store.set(
      "patrimoine:quotes:v1",
      JSON.stringify({ AAPL: { price: 195.4, at: Date.now() - 5 * 3600 * 1000 } })
    );
    expect(getCachedQuote("AAPL", 6 * 3600 * 1000)).toBe(195.4);
  });

  it("retourne null quand le cache est plus ancien que la fenêtre", () => {
    storage._store.set(
      "patrimoine:quotes:v1",
      JSON.stringify({ AAPL: { price: 195.4, at: Date.now() - 7 * 3600 * 1000 } })
    );
    expect(getCachedQuote("AAPL", 6 * 3600 * 1000)).toBeNull();
    expect(getCachedQuote("AAPL")).toBe(195.4);
  });

  it("est insensible à la casse du ticker", () => {
    storage._store.set(
      "patrimoine:quotes:v1",
      JSON.stringify({ VOO: { price: 512.2, at: Date.now() } })
    );
    expect(getCachedQuote("voo")).toBe(512.2);
  });
});

describe("provider limits", () => {
  it("expose les limites quotidiennes par fournisseur", () => {
    expect(getProviderDailyLimit("alphavantage")).toBe(23);
    expect(getProviderDailyLimit("twelvedata")).toBe(780);
  });
});

describe("twelve data parsing", () => {
  it("extrait les prix d'une réponse groupée", () => {
    const prices = parseTwelveDataPrices({
      AAPL: { price: "195.42" },
      MSFT: { price: "415.88" },
      VOO: "512.20",
      status: "ok",
    });
    expect(prices).toEqual({ AAPL: 195.42, MSFT: 415.88, VOO: 512.2 });
  });

  it("ignore les symboles sans cours exploitable", () => {
    expect(parseTwelveDataPrices({ AAPL: { price: "abc" }, MSFT: { price: 0 }, status: "ok" })).toEqual({});
  });
});