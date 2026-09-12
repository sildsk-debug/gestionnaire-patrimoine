const SETTINGS_KEY = "patrimoine:settings:v1";

const DEFAULTS = {
  marketProvider: "alphavantage",
  marketApiKey: "",
};

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...(parsed || {}) };
  } catch (err) {
    console.error("Impossible de lire les réglages locaux :", err);
    return { ...DEFAULTS };
  }
}

export function saveSettings(partial) {
  const next = { ...loadSettings(), ...partial };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  } catch (err) {
    console.error("Impossible d'enregistrer les réglages localement :", err);
    return next;
  }
}