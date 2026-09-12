import { useRef, useState } from "react";
import { Download, Upload, RotateCcw, Trash2, CheckCircle2, AlertTriangle, KeyRound, RefreshCw } from "lucide-react";
import { Card } from "../components/ui.jsx";
import { buildExportPayload, downloadJson, parseImportPayload, readFileAsText } from "../utils/backup.js";
import { MARKET_PROVIDERS, validateMarketApiKey, getQuoteBudget, getProviderDailyLimit } from "../utils/marketData.js";
import { loadSettings, saveSettings, getMarketKey, setMarketKey } from "../utils/settings.js";
import { getCachedFxDate } from "../utils/fx.js";
import { fmtMoney } from "../utils/format.js";

export default function Parametres({ state, dispatch }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(loadSettings());
  const [provider, setProvider] = useState(loadSettings().marketProvider || "alphavantage");
  const [keyInput, setKeyInput] = useState(getMarketKey(loadSettings(), loadSettings().marketProvider || "alphavantage") || "");
  const [keyBusy, setKeyBusy] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(loadSettings().autoRefresh ?? false);
  const [autoRefreshHours, setAutoRefreshHours] = useState(loadSettings().autoRefreshHours ?? 6);
  const [fxDate, setFxDate] = useState(getCachedFxDate());

  const providerInfo = MARKET_PROVIDERS.find((p) => p.id === provider) || MARKET_PROVIDERS[0];
  const dailyLimit = getProviderDailyLimit(provider);
  const budgetUsed = getQuoteBudget().used;

  const stats = {
    accounts: state.accounts.length,
    holdings: state.holdings.length,
    transactions: state.transactions.length,
    goals: state.goals.length,
  };

  const handleExport = () => {
    const payload = buildExportPayload(state);
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(payload, `patrimoine-export-${date}.json`);
    setStatus({ type: "success", message: "Export téléchargé." });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const proceed = window.confirm(
      "Importer ce fichier va remplacer toutes vos données actuelles (comptes, investissements, transactions, budget, objectifs, historique). Continuer ?"
    );
    if (!proceed) return;

    try {
      const text = await readFileAsText(file);
      const { payload, warnings } = parseImportPayload(text);
      dispatch({ type: "IMPORT_DATA", payload });
      setStatus({
        type: "success",
        message: warnings ? `Import réussi. ${warnings}` : "Import réussi : vos données ont été remplacées.",
      });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Échec de l'import." });
    }
  };

  const handleChangeProvider = (e) => {
    const nextId = e.target.value;
    const current = loadSettings();
    const prevHours = current.autoRefreshHours ?? 6;
    const forceSix = nextId === "alphavantage" && prevHours === 1;
    setProvider(nextId);
    setAutoRefreshHours(forceSix ? 6 : prevHours);
    setSettings(saveSettings({ marketProvider: nextId, ...(forceSix ? { autoRefreshHours: 6 } : {}) }));
    setKeyInput(getMarketKey(current, nextId) || "");
    setStatus({
      type: "success",
      message: forceSix
        ? "Fournisseur sélectionné : Alpha Vantage. L'horaire n'est pas possible avec 25 req/jour, fréquence repassée à toutes les 6 h."
        : nextId === "twelvedata"
          ? "Fournisseur sélectionné : Twelve Data (cours temps réel US, 800 crédits/jour)."
          : "Fournisseur sélectionné : Alpha Vantage (25 requêtes/jour).",
    });
  };

  const handleChangeCadence = (e) => {
    const val = Number(e.target.value);
    setAutoRefreshHours(val);
    setSettings(saveSettings({ autoRefreshHours: val }));
    const label = val === 0 ? "à l'ouverture de l'app uniquement" : val === 1 ? "toutes les heures (Twelve Data)" : "toutes les 6 heures";
    setStatus({ type: "success", message: `Fréquence d'actualisation automatique : ${label}.` });
  };

  const handleSaveKey = async (e) => {
    e.preventDefault();
    const key = keyInput.trim();
    setKeyBusy(true);
    try {
      if (!key) {
        setSettings(saveSettings(setMarketKey(loadSettings(), provider, "")));
        setStatus({ type: "error", message: "Clé API supprimée de cet appareil." });
        return;
      }
      const res = await validateMarketApiKey(key, provider);
      if (res.ok) {
        setSettings(saveSettings(setMarketKey(loadSettings(), provider, key)));
        const hint = res.price != null ? ` (test réussi : IBM ~ ${fmtMoney(res.price, "USD")})` : "";
        setStatus({ type: "success", message: `Clé ${providerInfo.label} valide et enregistrée${hint}. Vous pouvez actualiser les cours.` });
      } else if (res.rateLimited) {
        setSettings(saveSettings(setMarketKey(loadSettings(), provider, key)));
        setStatus({
          type: "error",
          message: `Clé enregistrée, mais validation impossible (limite ${providerInfo.label} atteinte). Réessayez dans quelques heures.`,
        });
      } else {
        setStatus({ type: "error", message: `Clé refusée par ${providerInfo.label} : ` + (res.message || "clé invalide") });
      }
    } catch (err) {
      setSettings(saveSettings(setMarketKey(loadSettings(), provider, key)));
      setStatus({
        type: "error",
        message: `Clé enregistrée, mais ${providerInfo.label} est injoignable (réseau). Réessayez avec « Actualiser les cours ».`,
      });
    } finally {
      setKeyBusy(false);
    }
  };

  const handleToggleAutoRefresh = (e) => {
    const next = e.target.checked;
    setAutoRefresh(next);
    setSettings(saveSettings({ autoRefresh: next }));
    setStatus({
      type: "success",
      message: next ? "Actualisation automatique activée. Choisissez la fréquence ci-dessous." : "Actualisation automatique désactivée.",
    });
  };

  const handleResetDemo = () => {
    if (window.confirm("Remplacer toutes les données actuelles par le jeu de données de démonstration ?")) {
      dispatch({ type: "RESET_DEMO" });
      setStatus({ type: "success", message: "Données de démonstration rechargées." });
    }
  };

  const handleWipe = () => {
    if (window.confirm("Supprimer définitivement toutes vos données (comptes, investissements, transactions, budget, objectifs) ? Cette action est irréversible.")) {
      dispatch({ type: "WIPE_ALL" });
      setStatus({ type: "success", message: "Toutes les données ont été effacées." });
    }
  };

  return (
    <div className="page">
      {status && (
        <div className={"status-banner " + (status.type === "error" ? "status-error" : "status-success")} role="status" aria-live="polite">
          {status.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{typeof status === "string" ? status : status.message}</span>
        </div>
      )}

      <Card>
        <h3>Exporter mes données</h3>
        <p className="muted-line">
          Téléchargez un fichier JSON contenant l'ensemble de vos données ({stats.accounts} comptes,{" "}
          {stats.holdings} positions, {stats.transactions} transactions, {stats.goals} objectifs). Utile pour
          garder une sauvegarde ou transférer vos données vers un autre navigateur/appareil.
        </p>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={16} /> Exporter en JSON
        </button>
      </Card>

      <Card>
        <h3>Importer des données</h3>
        <p className="muted-line">
          Importez un fichier JSON précédemment exporté depuis cette application. L'import{" "}
          <b>remplace entièrement</b> les données actuelles — pensez à exporter une sauvegarde avant si besoin.
        </p>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChange} style={{ display: "none" }} />
        <button className="btn btn-ghost" onClick={handleImportClick}>
          <Upload size={16} /> Choisir un fichier JSON
        </button>
      </Card>

      <Card>
        <h3><KeyRound size={15} /> Cours boursiers (optionnel)</h3>
        <p className="muted-line">
          Choisissez le fournisseur de cours à utiliser. Le bouton « Actualiser les cours » et l'actualisation
          automatique utilisent le fournisseur sélectionné. Les clés restent sur cet appareil et{" "}
          <b>ne sont jamais incluses</b> dans les exports.
        </p>

        <label className="field-label" htmlFor="market-provider">Fournisseur privilégié</label>
        <select id="market-provider" className="sort-select full" value={provider} onChange={handleChangeProvider}>
          {MARKET_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        <p className="muted-line" style={{ marginTop: 8 }}>{providerInfo.note}
          {providerInfo.keyUrl && <> Clé gratuite :{" "}<a href={providerInfo.keyUrl} target="_blank" rel="noreferrer">bien la récupérer ici</a>.</>}
        </p>
        <p className="muted-line">
          Clé actuellement enregistrée pour {providerInfo.label} :{" "}
          <b>{getMarketKey(settings, provider) ? "oui (masquée, jamais exportée)" : "non"}</b>.
          Elle est vérifiée auprès du fournisseur lors de l'enregistrement.
        </p>
        <form onSubmit={handleSaveKey} className="form">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={`Clé API ${providerInfo.label} à coller ici`}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-ghost" disabled={keyBusy}>
            <RefreshCw size={15} className={keyBusy ? "spin" : ""} />
            {keyBusy ? "Vérification…" : keyInput.trim() ? "Vérifier et enregistrer" : "Supprimer la clé"}
          </button>
        </form>
        <p className="muted-line" style={{ marginTop: 12 }}>
          {providerInfo.label} — requêtes utilisées aujourd'hui : <b>{budgetUsed}</b> / {dailyLimit}
        </p>
        <label className="checkbox-row">
          <input type="checkbox" checked={autoRefresh} onChange={handleToggleAutoRefresh} />
          Actualisation automatique des cours
        </label>
        {autoRefresh && (
          <>
            <label className="field-label" htmlFor="auto-cadence">Fréquence</label>
            <select id="auto-cadence" className="sort-select full" value={`${autoRefreshHours}`} onChange={handleChangeCadence}>
              <option value="0">À l'ouverture de l'app uniquement</option>
              <option value="6">Toutes les 6 heures</option>
              {provider === "twelvedata" && <option value="1">Toutes les heures</option>}
            </select>
          </>
        )}
      </Card>

      <Card>
        <h3><RefreshCw size={15} /> Taux de change</h3>
        <p className="muted-line">
          Les taux CHF / EUR / USD / GBP sont rafraîchis automatiquement chaque jour (source : Banque centrale
          européenne) et dès que l'application redevient active. Hors-ligne, les taux
          enregistrés ou des valeurs statiques sont utilisés.
        </p>
        <div className="toolbar">
          <span className="muted-line" style={{ padding: 0 }}>Dernière mise à jour : {fxDate || "aucune"}</span>
        </div>
      </Card>

      <Card>
        <h3>Données de démonstration</h3>
        <p className="muted-line">Recharge un jeu de données fictif réaliste pour explorer l'application.</p>
        <button className="btn btn-ghost" onClick={handleResetDemo}>
          <RotateCcw size={16} /> Charger les données de démo
        </button>
      </Card>

      <Card>
        <h3>Zone dangereuse</h3>
        <p className="muted-line">Supprime définitivement toutes vos données de ce navigateur.</p>
        <button className="btn btn-ghost btn-danger" onClick={handleWipe}>
          <Trash2 size={16} /> Effacer toutes les données
        </button>
      </Card>
    </div>
  );
}