const QUOTES_KEY = "patrimoine:quotes:v1";
const CACHE_TTL = 24 * 60 * 60 * 1000;

export const MARKET_PROVIDERS = [
  {
    id: "alphavantage",
    label: "Alpha Vantage",
    keyUrl: "https://www.alphavantage.co/support/#api-key",
    note: "Gratuit ~25 requêtes/jour, 5 req/min. Suffisant pour un portefeuille personnel.",
  },
];

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

export function getCachedQuote(ticker) {
  if (!ticker) return null;
  const entry = loadQuoteCache()[ticker.toUpperCase()];
  if (entry && entry.price != null && Date.now() - entry.at < CACHE_TTL) return entry.price;
  return null;
}

export function cacheQuote(ticker, price) {
  const cache = loadQuoteCache();
  cache[ticker.toUpperCase()] = { price, at: Date.now() };
  saveQuoteCache(cache);
}

export async function fetchQuote(ticker, apiKey) {
  const symbol = (ticker || "").trim();
  if (!symbol) throw new Error("Ticker manquant.");
  if (!apiKey) throw new Error("Aucune clé API configurée.");

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
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

export async function refreshAllQuotes(holdings, apiKey) {
  const errors = [];
  let updated = 0;
  let skipped = 0;
  const pending = [...holdings];

  for (let i = 0; i < pending.length; i++) {
    const h = pending[i];
    const cached = getCachedQuote(h.ticker);
    if (cached != null) {
      skipped += 1;
      continue;
    }
    try {
      const price = await fetchQuote(h.ticker, apiKey);
      cacheQuote(h.ticker, price);
      h.appliedPrice = price;
      updated += 1;
    } catch (err) {
      errors.push({ ticker: h.ticker, message: err.message });
    }
    if (i < pending.length - 1) await sleep(holdings.length > 5 ? 12000 : 1500);
  }

  return { total: holdings.length, updated, skipped, errors };
}