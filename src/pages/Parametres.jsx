import React, { useRef, useState } from "react";
import { Download, Upload, RotateCcw, Trash2, CheckCircle2, AlertTriangle, KeyRound, RefreshCw } from "lucide-react";
import { Card } from "../components/ui.jsx";
import { buildExportPayload, downloadJson, parseImportPayload, readFileAsText } from "../utils/backup.js";
import { MARKET_PROVIDERS } from "../utils/marketData.js";
import { loadSettings, saveSettings } from "../utils/settings.js";
import { refreshFx, getCachedFxDate } from "../utils/fx.js";

export default function Parametres({ state, dispatch }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null); // { type: "success" | "error", message }
  const [settings, setSettings] = useState(loadSettings());
  const [keyInput, setKeyInput] = useState(loadSettings().marketApiKey || "");
  const [fxDate, setFxDate] = useState(getCachedFxDate());
  const [fxBusy, setFxBusy] = useState(false);

  const provider = MARKET_PROVIDERS.find((p) => p.id === settings.marketProvider) || MARKET_PROVIDERS[0];

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

  const handleSaveKey = async (e) => {
    e.preventDefault();
    const key = keyInput.trim();
    setSettings(saveSettings({ marketApiKey: key }));
    setStatus(key ? "Clé API de cours enregistrée localement (jamais exportée)." : "Clé API de cours supprimée.");
  };

  const handleRefreshFx = async () => {
    if (fxBusy) return;
    setFxBusy(true);
    const res = await refreshFx();
    if (res) {
      setFxDate(res.date);
      setStatus(`Taux de change mis à jour (${res.date}).`);
    } else {
      setStatus({ type: "error", message: "Impossible de récupérer les taux. Les taux statiques restent utilisés." });
    }
    setFxBusy(false);
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
        <div className={"status-banner " + (status.type || "success")}>
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
          En définissant une clé API ({provider.label}), le bouton « Actualiser les cours » de la page
          Investissements met à jour les prix automatiquement. La clé reste sur cet appareil et{" "}
          <b>n'est jamais incluse</b> dans les exports.
        </p>
        <p className="muted-line">{provider.note}
          {provider.keyUrl && <> Clé gratuite :{" "}<a href={provider.keyUrl} target="_blank" rel="noreferrer">bien la récupérer ici</a>.</>}
        </p>
        <form onSubmit={handleSaveKey} className="form">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Clé API à coller ici"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-ghost">Enregistrer la clé</button>
        </form>
      </Card>

      <Card>
        <h3><RefreshCw size={15} /> Taux de change</h3>
        <p className="muted-line">
          Les taux CHF / EUR / USD / GBP sont récupérés automatiquement à l'ouverture (source : Banque centrale
          européenne) et mis en cache. Hors-ligne, les taux enregistrés (ou des valeurs statiques) sont utilisés.
        </p>
        <div className="toolbar">
          <span className="muted-line" style={{ padding: 0 }}>Dernière mise à jour : {fxDate || "aucune"}</span>
          <button className="btn btn-ghost" onClick={handleRefreshFx} disabled={fxBusy}>
            <RefreshCw size={15} /> Actualiser maintenant
          </button>
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