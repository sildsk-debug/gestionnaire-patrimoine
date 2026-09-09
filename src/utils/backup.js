// Export / import des données au format JSON.
// Le fichier exporté contient un peu de métadonnées (version, date) en plus
// des données elles-mêmes, pour faciliter la compatibilité future.

const EXPORT_VERSION = 1;

export function buildExportPayload(state) {
  return {
    app: "patrimoine",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      accounts: state.accounts,
      holdings: state.holdings,
      transactions: state.transactions,
      budgets: state.budgets,
      goals: state.goals,
      netWorthHistory: state.netWorthHistory,
    },
  };
}

export function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const isArray = (v) => Array.isArray(v);
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Valide et normalise un objet JSON importé. Accepte soit le format exporté
 * par cette app ({ app, version, data: {...} }), soit directement un objet
 * contenant les mêmes clés que "data" (pour rester tolérant).
 * Lève une erreur avec un message lisible si la structure est incorrecte.
 */
export function parseImportPayload(raw) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error("Ce fichier n'est pas un JSON valide.");
  }

  const data = json && isPlainObject(json.data) ? json.data : json;
  if (!isPlainObject(data)) {
    throw new Error("Structure de fichier inattendue : un objet JSON était attendu.");
  }

  const errors = [];
  const accounts = isArray(data.accounts) ? data.accounts : (errors.push("accounts"), []);
  const holdings = isArray(data.holdings) ? data.holdings : (errors.push("holdings"), []);
  const transactions = isArray(data.transactions) ? data.transactions : (errors.push("transactions"), []);
  const goals = isArray(data.goals) ? data.goals : (errors.push("goals"), []);
  const netWorthHistory = isArray(data.netWorthHistory) ? data.netWorthHistory : (errors.push("netWorthHistory"), []);
  const budgets = isPlainObject(data.budgets) ? data.budgets : (errors.push("budgets"), {});

  const allMissing = errors.length === 6;
  if (allMissing) {
    throw new Error("Aucune donnée reconnue dans ce fichier (accounts, holdings, transactions, budgets, goals, netWorthHistory).");
  }

  return {
    payload: { accounts, holdings, transactions, budgets, goals, netWorthHistory },
    warnings: errors.length ? `Champs manquants ou invalides, importés comme vides : ${errors.join(", ")}.` : null,
  };
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire ce fichier."));
    reader.readAsText(file);
  });
}
