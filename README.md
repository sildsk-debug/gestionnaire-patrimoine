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
- Transactions récurrentes : les occurrences dues sont créées automatiquement
  à l'ouverture (mensuel / trimestriel / annuel)
- Comptes multi-devises (CHF / EUR / USD / GBP) avec **taux de change
  automatiques** (source : Banque centrale européenne) et repli hors-ligne
- **Cours boursiers optionnels** (Alpha Vantage ou Twelve Data au choix) : clé API stockée localement
  et jamais exportée, bouton « Actualiser les cours »
- Annuler une action (suppression, effacement) via un toast
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

## Tests

```bash
npm test
```

Tests unitaires (Vitest) couvrant le reducer, les calculs dérivés, les
conversions de devises, les migrations d'état, les récurrentes et l'échange
JSON.

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
    storage.js              Lecture/écriture localStorage
    migrate.js              Migration de l'état entre versions du schéma
    settings.js             Réglages locaux (clé API, jamais exportée)
    fx.js                   Taux de change automatiques (frankfurter.app)
    marketData.js           Cours boursiers (Alpha Vantage / Twelve Data)
    recurring.js            Exécution des transactions récurrentes
    backup.js               Export/import JSON
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

## Cours boursiers

Les prix des actions/ETF sont saisis manuellement (`currentPrice`), mais il est
possible de les **actualiser automatiquement** via deux fournisseurs au choix :

| Fournisseur | Limite | Batch | Idéal pour |
|---|---|---|---|
| **Alpha Vantage** | ~25 req/jour, 5 req/min | non | petit portefeuille |
| **Twelve Data** | 800 crédits/jour, 8/min | jusqu'à 8 symboles/requête | portefeuille modéré |

1. Choisissez le fournisseur dans **Paramètres → Cours boursiers**.
2. Créez une clé API gratuite chez le fournisseur choisi.
3. Collez-la dans **Paramètres** : elle est stockée uniquement sur votre
   appareil (clé localStorage séparée) et **jamais incluse** dans les exports JSON.
4. Sur la page **Investissements**, cliquez « Actualiser les cours ». Les prix
   sont mis en cache 24 h pour ne pas dépasser le quota.

Une **actualisation automatique** optionnelle (page Paramètres) rafraîchit les
cours **à l'ouverture de l'app uniquement**, **toutes les 6 heures** ou
**toutes les heures** (hourly réservé à Twelve Data, inutile avec les 25
requêtes/jour d'Alpha Vantage), dans la limite du quota du fournisseur
sélectionné (compteur affiché). Fonctionne uniquement quand l'app est ouverte.

Les courbes d'évolution par position se construisent à partir des
**instantanés** enregistrés dans la page Patrimoine (fonctionne sans clé API).

## Simplifications assumées (par rapport à un outil bancaire complet)

- **Les soldes de comptes sont recalculés** à partir d'un solde initial
  (`openingBalance`) et de l'ensemble des transactions rattachées au compte
  (conversion de devise supportée). Un compte supprimé conserve ses
  transactions, réaffectées au pseudo-compte « Hors comptes ».
- Chaque position (action/ETF) représente un lot unique agrégé (quantité +
  prix de revient moyen), pas un historique ligne par ligne.
- Les taux de change sont récupérés à l'ouverture (frankfurter.app, taux ECB)
  et mis en cache ; hors-ligne, les taux enregistrés ou statiques sont utilisés.
- Pas d'import/export CSV pour l'instant.

## Licence

Ce projet vous appartient : faites-en ce que vous voulez.
