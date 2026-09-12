const SETTINGS_KEY = "patrimoine:settings:v1";

const DEFAULTS = {
  marketProvider: "alphavantage",
  marketKeys: { alphavantage: "", twelvedata: "" },
  autoRefresh: false,
  autoRefreshHours: 6,
};

function defaultSettings() {
  return { ...DEFAULTS, marketKeys: { ...DEFAULTS.marketKeys } };
}

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    const keys = { ...DEFAULTS.marketKeys, ...(parsed.marketKeys || {}) };
    if (parsed.marketApiKey != null && !parsed.marketKeys) {
      keys[parsed.marketProvider || "alphavantage"] = parsed.marketApiKey || "";
    }
    return {
      marketProvider: parsed.marketProvider || DEFAULTS.marketProvider,
      marketKeys: keys,
      autoRefresh: parsed.autoRefresh ?? DEFAULTS.autoRefresh,
      autoRefreshHours: parsed.autoRefreshHours ?? DEFAULTS.autoRefreshHours,
    };
  } catch (err) {
    console.error("Impossible de lire les réglages locaux :", err);
    return defaultSettings();
  }
}

export function saveSettings(partial) {
  const next = { ...loadSettings(), ...partial };
  if (partial.marketKeys) next.marketKeys = { ...DEFAULTS.marketKeys, ...partial.marketKeys };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  } catch (err) {
    console.error("Impossible d'enregistrer les réglages localement :", err);
    return next;
  }
}

export function getMarketKey(settings, providerId) {
  return (settings.marketKeys || {})[providerId] || "";
}

export function setMarketKey(settings, providerId, key) {
  return { ...settings, marketKeys: { ...(settings.marketKeys || DEFAULTS.marketKeys), [providerId]: key } };
}