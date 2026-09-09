// Petite couche d'abstraction autour de localStorage.
// Centraliser l'accès ici permet de changer facilement de backend plus tard
// (ex. IndexedDB, ou une synchronisation cloud) sans toucher au reste de l'app.

const STORAGE_KEY = "patrimoine:app-state:v1";

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Impossible de lire les données locales :", err);
    return null;
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    // Peut échouer si le stockage est plein ou désactivé (navigation privée stricte, etc.)
    console.error("Impossible d'enregistrer les données localement :", err);
    return false;
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Impossible de réinitialiser les données locales :", err);
  }
}
