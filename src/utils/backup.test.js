import { describe, it, expect } from "vitest";
import { buildExportPayload, parseImportPayload } from "./backup.js";

const state = {
  accounts: [{ id: "a1", name: "C", category: "actif", currency: "CHF", openingBalance: 100 }],
  holdings: [],
  transactions: [{ id: "t1", type: "depense", amount: 10, currency: "CHF", accountId: "a1", date: "2026-01-01", frequency: "" }],
  budgets: { logement: 1000 },
  goals: [],
  netWorthHistory: [],
};

describe("backup", () => {
  it("fait un aller-retour export -> import sans perte", () => {
    const payload = buildExportPayload(state);
    const { payload: data, warnings } = parseImportPayload(JSON.stringify(payload));
    expect(warnings).toBeNull();
    expect(data).toEqual(state);
  });

  it("rejette un contenu non JSON", () => {
    expect(() => parseImportPayload("pas du json")).toThrow(/JSON/);
  });

  it("signale les champs manquants en avertissement sans échouer", () => {
    const { payload, warnings } = parseImportPayload('{"accounts": []}');
    expect(payload.accounts).toEqual([]);
    expect(warnings).toContain("holdings");
  });

  it("accepte directement un objet data brut", () => {
    const { payload, warnings } = parseImportPayload(JSON.stringify({ accounts: [], transactions: [] }));
    expect(payload.accounts).toEqual([]);
    expect(warnings).toContain("goals");
  });

  it("rejette une structure sans aucune donnée reconnue", () => {
    expect(() => parseImportPayload('{"foo": 1}')).toThrow(/Aucune donnée reconnue/);
  });
});