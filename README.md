# Patrimoine — Gestion de finances personnelles

Application web (React + Vite) de suivi de patrimoine, investissements, revenus,
dépenses, budget et objectifs financiers. Installable comme PWA et **100 %
locale** : toutes les données restent dans le navigateur (`localStorage`),
rien n'est envoyé à un serveur.

## Fonctionnalités

- Tableau de bord avec 8 indicateurs clés et 4 graphiques (évolution du
  patrimoine, répartition, revenus vs dépenses, dépenses par catégorie)
- Patrimoine : actifs / passifs, valeur nette, historique avec instantanés
- Portefeuille actions / ETF avec filtres, tri, gain/perte et performance
- Transactions (revenus / dépenses) avec recherche, filtres, catégories
- Budget mensuel par catégorie avec barres de progression
- Objectifs financiers avec estimation du temps restant
- Comptes multi-devises (CHF / EUR / USD / GBP)
- Import / export des données au format JSON (page Paramètres)
- Mode clair / sombre
- Données de démonstration au premier lancement, réinitialisables
- **PWA installable** : fonctionne hors-ligne après une première visite

## Démarrer en local

Prérequis : [Node.js](https://nodejs.org) 18 ou plus récent.

```bash
npm install
npm run dev
```

Ouvrez l'URL affichée dans le terminal (par défaut `http://localhost:5173`).

## Build de production

```bash
npm run build
npm run preview   # pour tester le build localement
```

Le résultat est généré dans `dist/`, prêt à être hébergé sur n'importe quel
hébergeur statique (GitHub Pages, Netlify, Vercel, Cloudflare Pages...).

## Publier sur GitHub Pages

Un workflow GitHub Actions est déjà inclus (`.github/workflows/deploy.yml`) :

1. Créez un dépôt GitHub et poussez ce code dessus.
2. Dans le dépôt : **Settings → Pages → Source**, sélectionnez **GitHub
   Actions**.
3. À chaque `push` sur `main`, le site est automatiquement buildé et déployé.

Aucune variable d'environnement n'est nécessaire pour l'instant.

`vite.config.js` utilise une base relative (`base: "./"`), donc l'application
fonctionne aussi bien à la racine d'un domaine que dans un sous-dossier
(`https://votre-compte.github.io/votre-repo/`).

## Structure du projet

```
src/
  main.jsx              Point d'entrée React
  App.jsx                Composant racine : navigation, sheets, câblage
  index.css              Design tokens (couleurs, thème clair/sombre) + styles
  state/
    reducer.js            Toute la logique de mise à jour de l'état
    useComputed.js         Calculs dérivés (valeur nette, performance, etc.)
  data/
    constants.js           Catégories, devises, types de comptes
    demoData.js             Génération des données de démonstration
  utils/
    format.js               Formatage montants/dates, conversions de devise
    storage.js               Lecture/écriture localStorage
  components/
    ui.jsx                  Composants réutilisables (Card, Sheet, etc.)
    forms.jsx                Formulaires (compte, position, transaction, objectif)
  pages/
    Dashboard.jsx, Patrimoine.jsx, Investissements.jsx, Transactions.jsx,
    Budget.jsx, Objectifs.jsx, Comptes.jsx, Parametres.jsx
```

## Import / export JSON

La page **Paramètres** permet de :
- **Exporter** : télécharge un fichier `patrimoine-export-AAAA-MM-JJ.json`
  contenant toutes vos données (comptes, investissements, transactions,
  budget, objectifs, historique de patrimoine).
- **Importer** : sélectionne un fichier JSON exporté précédemment et
  **remplace entièrement** les données actuelles (une confirmation est
  demandée avant). Le fichier est validé avant import ; en cas de structure
  invalide, un message d'erreur explique le problème sans rien modifier.
- **Recharger les données de démo** ou **tout effacer**, également depuis
  cette page.

La logique correspondante est isolée dans `src/utils/backup.js`
(`buildExportPayload`, `parseImportPayload`, `downloadJson`).

## Stockage des données

Toutes les données sont sauvegardées automatiquement dans `localStorage` sous
la clé `patrimoine:app-state:v1` (voir `src/utils/storage.js`). Pour tout
réinitialiser, utilisez le bouton **« Réinitialiser les données de démo »**
dans le menu, ou videz le `localStorage` du site depuis les outils
développeur du navigateur.

Limites à connaître :
- Les données sont **locales à cet appareil et ce navigateur** — elles ne se
  synchronisent pas automatiquement entre appareils.
- En navigation privée stricte, certains navigateurs limitent ou vident
  `localStorage` à la fermeture de l'onglet.

## Brancher une vraie source de cours boursiers

Les prix des actions/ETF sont saisis manuellement (`currentPrice` dans
`src/data/constants.js` / formulaire `HoldingForm`). Pour brancher une API
réelle plus tard :

1. Créez `src/utils/marketData.js` avec une fonction `fetchQuote(ticker)` qui
   appelle l'API de votre choix (ex. Alpha Vantage, Finnhub, Twelve Data).
2. Dans `src/pages/Investissements.jsx`, ajoutez un bouton "Actualiser les
   cours" qui appelle `fetchQuote` pour chaque position et dispatch
   `UPDATE_HOLDING` avec le nouveau `currentPrice`.
3. Si l'API nécessite une clé, stockez-la dans un fichier `.env` local
   (`VITE_MARKET_API_KEY=...`, préfixe `VITE_` obligatoire pour Vite) et
   ajoutez `.env` à `.gitignore` — ne committez jamais de clé API.

## Simplifications assumées (par rapport à un outil bancaire complet)

- Les soldes de comptes sont saisis manuellement plutôt que recalculés
  automatiquement à partir des transactions.
- Chaque position (action/ETF) représente un lot unique agrégé (quantité +
  prix de revient moyen), pas un historique ligne par ligne.
- Les taux de change (`FX_TO_CHF` dans `src/utils/format.js`) sont fixes ;
  brancher une API de change est le même principe que pour les cours
  boursiers ci-dessus.
- Pas d'import/export CSV pour l'instant.

## Licence

Ce projet vous appartient : faites-en ce que vous voulez.
