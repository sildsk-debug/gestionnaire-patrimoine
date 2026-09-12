import { describe, it, expect } from "vitest";
import { migrateState, SCHEMA_VERSION } from "./migrate.js";

describe("migrateState", () => {
  it("laisse intact un état déjà à la bonne version", () => {
    const state = { accounts: [{ id: "a1", openingBalance: 5 }], transactions: [] };
    expect(migrateState({ version: SCHEMA_VERSION, state })).toEqual(state);
  });

  it("migre un état brut : openingBalance recalculée pour préserver le solde affiché", () => {
    const legacy = {
      accounts: [{ id: "a1", name: "C", category: "actif", currency: "CHF", balance: 900 }],
      transactions: [
        { id: "t1", type: "depense", amount: 100, currency: "CHF", accountId: "a1", date: "2026-01-01" },
        { id: "t2", type: "revenu", amount: 50, currency: "CHF", accountId: "a1", date: "2026-01-02" },
      ],
    };
    const out = migrateState(legacy);
    expect(out.accounts[0].balance).toBeUndefined();
    // 900 = opening - 100 + 50 => opening = 950
    expect(out.accounts[0].openingBalance).toBe(950);
    expect(out.transactions[0].frequency).toBe("");
  });

  it("ajoute la fréquence mensuelle aux anciennes récurrentes", () => {
    const legacy = {
      accounts: [],
      transactions: [
        { id: "t1", type: "revenu", amount: 100, currency: "CHF", accountId: "", recurring: true, date: "2026-01-01" },
        { id: "t2", type: "depense", amount: 50, currency: "CHF", accountId: "", recurring: false, date: "2026-01-02" },
      ],
    };
    const out = migrateState(legacy);
    expect(out.transactions[0].frequency).toBe("monthly");
    expect(out.transactions[1].frequency).toBe("");
  });

  it("gère la conversion de devise pendant la migration", () => {
    const legacy = {
      accounts: [{ id: "a1", name: "EUR", category: "actif", currency: "EUR", balance: 1000 }],
      transactions: [
        { id: "t1", type: "depense", amount: 100, currency: "EUR", accountId: "a1", date: "2026-01-01" },
      ],
    };
    const out = migrateState(legacy);
    // Effet d'une dépense EUR sur un compte EUR => -100
    expect(out.accounts[0].openingBalance).toBe(1100);
  });
});