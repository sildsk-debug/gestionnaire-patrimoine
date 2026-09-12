const QUOTES_KEY = "patrimoine:quotes:v1";
const BUDGET_KEY = "patrimoine:quote-budget:v1";
const CACHE_TTL = 24 * 60 * 60 * 1000;
const AV_DAILY_LIMIT = 23;
const TD_DAILY_LIMIT = 780;
const TD_BATCH_SIZE = 8;
const TD_MINUTE_DELAY = 61000;

export const MARKET_PROVIDERS = [
  {
    id: "alphavantage",
    label: "Alpha Vantage",
    keyUrl: "https://www.alphavantage.co/support/#api-key",
    note: "Gratuit ~25 requêtes/jour (5 req/min), 1 requête = 1 symbole. Suffisant pour un petit portefeuille.",
    dailyLimit: AV_DAILY_LIMIT,
    bulk: false,
  },
  {
    id: "twelvedata",
    label: "Twelve Data",
    keyUrl: "https://twelvedata.com/register",
    note: "Gratuit 800 crédits/jour (8/min), jusqu'à 8 symboles par requête. Idéal pour actualiser tout le portefeuille d'un coup.",
    dailyLimit: TD_DAILY_LIMIT,
    bulk: true,
  },
];

export function getProviderDailyLimit(providerId) {
  return (MARKET_PROVIDERS.find((p) => p.id === providerId) || MARKET_PROVIDERS[0]).dailyLimit;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadQuoteCache() {
  try {
    const raw = window.localStorage.getItem(QUOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveQuoteCache(cache) {
  try {
    window.localStorage.setItem(QUOTES_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error("Impossible de mettre en cache les cours :", err);
  }
}

function quoteCacheDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getQuoteBudget() {
  try {
    const parsed = window.localStorage.getItem(BUDGET_KEY) ? JSON.parse(window.localStorage.getItem(BUDGET_KEY)) : null;
    if (parsed && parsed.date === quoteCacheDay()) return parsed;
  } catch {}
  return { date: quoteCacheDay(), used: 0 };
}

export function useQuoteBudget(amount = 1) {
  const budget = getQuoteBudget();
  const next = { date: budget.date, used: budget.used + amount };
  try {
    window.localStorage.setItem(BUDGET_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function getCachedQuote(ticker, maxAgeMs = CACHE_TTL) {
  if (!ticker) return null;
  const entry = loadQuoteCache()[ticker.toUpperCase()];
  if (entry && entry.price != null && Date.now() - entry.at < maxAgeMs) return entry.price;
  return null;
}

export function cacheQuote(ticker, price) {
  const cache = loadQuoteCache();
  cache[ticker.toUpperCase()] = { price, at: Date.now() };
  saveQuoteCache(cache);
}

export function parseTwelveDataPrices(json) {
  const prices = {};
  for (const [sym, val] of Object.entries(json || {})) {
    if (sym === "status") continue;
    const n = typeof val === "object" && val != null && "price" in val ? Number(val.price) : Number(val);
    if (Number.isFinite(n) && n > 0) prices[sym.toUpperCase()] = n;
  }
  return prices;
}

async function fetchQuoteAlphaVantage(ticker, apiKey) {
  const symbol = (ticker || "").trim();
  if (!symbol) throw new Error("Ticker manquant.");
  if (!apiKey) throw new Error("Aucune clé API configurée.");

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  useQuoteBudget();
  if (!res.ok) throw new Error(`Réponse du fournisseur invalide (${res.status}).`);

  const json = await res.json();
  const note = json["Note"];
  if (note) {
    if (typeof note === "string" && /rate.?limit/i.test(note)) {
      throw new Error("Limite de requêtes atteinte. Réessayez plus tard (cache quotidien actif).");
    }
    throw new Error(String(note));
  }
  const price = json["Global Quote"]?.["05. price"];
  if (price == null) throw new Error(`Cours introuvable pour "${symbol}".`);
  return Number(price);
}

async function fetchPricesTwelveData(tickers, apiKey) {
  const symbols = (tickers || []).map((t) => (t || "").trim()).filter(Boolean);
  if (!symbols.length) throw new Error("Aucun ticker à interroger.");
  if (!apiKey) throw new Error("Aucune clé API configurée.");

  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols.join(","))}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  useQuoteBudget(symbols.length);
  if (!res.ok) throw new Error(`Réponse du fournisseur invalide (${res.status}).`);

  const json = await res.json();
  if (json && typeof json === "object" && "code" in json) {
    const msg = String(json.message || "Réponse inattendue de Twelve Data.");
    const err = new Error(msg);
    err.invalidKey = json.code === 401;
    err.rateLimited = json.code === 429 || json.code === 403;
    throw err;
  }
  const prices = parseTwelveDataPrices(json);
  if (!Object.keys(prices).length) throw new Error("Réponse inattendue de Twelve Data.");
  return prices;
}

export async function validateMarketApiKey(apiKey, provider = "alphavantage") {
  const key = (apiKey || "").trim();
  if (!key) throw new Error("Aucune clé API à vérifier.");

  if (provider === "twelvedata") {
    const url = `https://api.twelvedata.com/price?symbol=IBM&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    useQuoteBudget();
    if (!res.ok) throw new Error(`Réponse du fournisseur invalide (${res.status}).`);
    const json = await res.json();
    const price = json && typeof json === "object" && "price" in json ? Number(json.price) : null;
    if (Number.isFinite(price) && price > 0) return { ok: true, price };
    if (json && json.code === 401) return { ok: false, message: String(json.message || "Clé Twelve Data invalide.") };
    if (json && json.code) return { ok: false, message: String(json.message || "Réponse inattendue du fournisseur.") };
    return { ok: false, message: "Réponse inattendue du fournisseur." };
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  useQuoteBudget();
  if (!res.ok) throw new Error(`Réponse du fournisseur invalide (${res.status}).`);

  const json = await res.json();
  const quote = json["Global Quote"];
  if (quote && quote["05. price"] != null) {
    return { ok: true, price: Number(quote["05. price"]) };
  }
  if (json["Error Message"]) {
    return { ok: false, message: String(json["Error Message"]).trim() };
  }
  const note = json["Note"] || json["Information"];
  if (note) {
    return { ok: false, message: String(note).trim(), rateLimited: true };
  }
  return { ok: false, message: "Réponse inattendue du fournisseur." };
}

async function refreshAlphaVantage(holdings, apiKey) {
  const errors = [];
  let updated = 0;
  let skipped = 0;
  let stoppedForBudget = 0;
  const pending = [...holdings];

  for (let i = 0; i < pending.length; i++) {
    const h = pending[i];
    const cached = getCachedQuote(h.ticker);
    if (cached != null) {
      skipped += 1;
      continue;
    }
    if (getQuoteBudget().used >= AV_DAILY_LIMIT) {
      stoppedForBudget = pending.length - i;
      break;
    }
    try {
      const price = await fetchQuoteAlphaVantage(h.ticker, apiKey);
      cacheQuote(h.ticker, price);
      h.appliedPrice = price;
      updated += 1;
    } catch (err) {
      errors.push({ ticker: h.ticker, message: err.message });
    }
    if (i < pending.length - 1) await sleep(holdings.length > 5 ? 12000 : 1500);
  }

  return { total: holdings.length, updated, skipped, errors, stoppedForBudget };
}

async function refreshTwelveData(holdings, apiKey) {
  const errors = [];
  let updated = 0;
  let skipped = 0;
  let stoppedForBudget = 0;
  const pending = holdings.filter((h) => getCachedQuote(h.ticker) == null);

  for (let start = 0; start < pending.length; start += TD_BATCH_SIZE) {
    if (getQuoteBudget().used >= TD_DAILY_LIMIT) {
      stoppedForBudget = pending.length - start;
      break;
    }
    const chunk = pending.slice(start, start + TD_BATCH_SIZE);
    try {
      const prices = await fetchPricesTwelveData(chunk.map((h) => h.ticker), apiKey);
      for (const h of chunk) {
        const p = prices[h.ticker.toUpperCase()];
        if (p != null) {
          cacheQuote(h.ticker, p);
          h.appliedPrice = p;
          updated += 1;
        } else {
          errors.push({ ticker: h.ticker, message: "Cours introuvable via Twelve Data" });
        }
      }
    } catch (err) {
      errors.push({ ticker: chunk.map((c) => c.ticker).join(","), message: err.message });
      break;
    }
    if (start + TD_BATCH_SIZE < pending.length) await sleep(TD_MINUTE_DELAY);
  }

  return { total: holdings.length, updated, skipped, errors, stoppedForBudget };
}

export async function refreshAllQuotes(holdings, provider = "alphavantage", apiKey) {
  if (provider === "twelvedata") return refreshTwelveData(holdings, apiKey);
  return refreshAlphaVantage(holdings, apiKey);
}