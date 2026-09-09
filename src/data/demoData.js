import { uid, addMonths } from "../utils/format.js";

// Jeu de données de démonstration chargé au tout premier lancement,
// pour que l'application ne soit jamais vide. Entièrement supprimable
// depuis le menu (bouton "Réinitialiser les données de démo").
export function buildDemoData() {
  const today = new Date();

  const accounts = [
    { id: uid("acc"), name: "Compte courant", type: "courant", category: "actif", currency: "CHF", balance: 8200 },
    { id: uid("acc"), name: "Compte épargne", type: "epargne", category: "actif", currency: "CHF", balance: 15000 },
    { id: uid("acc"), name: "Compte-titres (liquidités)", type: "titres", category: "actif", currency: "CHF", balance: 1200 },
    { id: uid("acc"), name: "Leasing voiture", type: "credit", category: "passif", currency: "CHF", balance: 8000 },
  ];

  const holdings = [
    { id: uid("hld"), name: "Nestlé", ticker: "NESN", isin: "", type: "stock", quantity: 20, avgPrice: 98, currency: "CHF", currentPrice: 104 },
    { id: uid("hld"), name: "Apple Inc.", ticker: "AAPL", isin: "", type: "stock", quantity: 10, avgPrice: 150, currency: "USD", currentPrice: 210 },
    { id: uid("hld"), name: "Vanguard FTSE All-World", ticker: "VWRL", isin: "IE00B3RBWM25", type: "etf", quantity: 35, avgPrice: 105, currency: "USD", currentPrice: 118 },
    { id: uid("hld"), name: "iShares Core S&P 500", ticker: "CSPX", isin: "IE00B5BMR087", type: "etf", quantity: 12, avgPrice: 420, currency: "USD", currentPrice: 510 },
  ];

  const budgets = { logement: 1800, alimentation: 600, transport: 250, loisirs: 300, abonnements: 120, shopping: 300, sante: 150 };

  const goals = [
    { id: uid("gol"), name: "Fonds d'urgence", target: 15000, current: 12000, targetDate: addMonths(today, 4).toISOString().slice(0, 10) },
    { id: uid("gol"), name: "Apport achat appartement", target: 80000, current: 23000, targetDate: addMonths(today, 42).toISOString().slice(0, 10) },
    { id: uid("gol"), name: "Voyage au Japon", target: 6000, current: 2400, targetDate: addMonths(today, 10).toISOString().slice(0, 10) },
  ];

  const transactions = [];
  const baseExpenses = [
    { cat: "logement", desc: "Loyer", amt: 1750 },
    { cat: "alimentation", desc: "Courses", amt: 520 },
    { cat: "transport", desc: "Abonnement CFF + essence", amt: 180 },
    { cat: "loisirs", desc: "Sorties & restaurants", amt: 220 },
    { cat: "abonnements", desc: "Streaming & téléphonie", amt: 95 },
    { cat: "shopping", desc: "Achats divers", amt: 240 },
    { cat: "sante", desc: "Assurance maladie", amt: 340 },
  ];
  for (let i = 5; i >= 0; i--) {
    const d = addMonths(today, -i);
    transactions.push({ id: uid("txn"), type: "revenu", category: "salaire", amount: 7200, currency: "CHF", date: new Date(d.getFullYear(), d.getMonth(), 25).toISOString().slice(0, 10), description: "Salaire", accountId: accounts[0].id, recurring: true });
    if (i === 4 || i === 1) {
      transactions.push({ id: uid("txn"), type: "revenu", category: "freelance", amount: 600 + Math.round(Math.random() * 400), currency: "CHF", date: new Date(d.getFullYear(), d.getMonth(), 12).toISOString().slice(0, 10), description: "Mission freelance", accountId: accounts[0].id, recurring: false });
    }
    baseExpenses.forEach((be, idx) => {
      const variance = 0.85 + Math.random() * 0.3;
      transactions.push({
        id: uid("txn"), type: "depense", category: be.cat, amount: Math.round(be.amt * variance), currency: "CHF",
        date: new Date(d.getFullYear(), d.getMonth(), 3 + idx * 3).toISOString().slice(0, 10),
        description: be.desc, accountId: accounts[0].id, recurring: ["logement", "abonnements", "sante"].includes(be.cat),
      });
    });
  }

  const netWorthHistory = [];
  for (let i = 5; i >= 1; i--) {
    const d = addMonths(today, -i);
    netWorthHistory.push({ date: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10), value: 22000 + (5 - i) * 1500 + Math.round(Math.random() * 800) });
  }

  return { accounts, holdings, budgets, goals, transactions, netWorthHistory };
}
