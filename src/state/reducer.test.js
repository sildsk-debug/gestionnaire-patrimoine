import { describe, it, expect } from "vitest";
import { reducer, emptyState } from "./reducer.js";

const baseState = {
  ...emptyState,
  accounts: [{ id: "a1", name: "A", category: "actif", currency: "CHF", openingBalance: 1000 }],
  transactions: [{ id: "t1", type: "depense", amount: 10, currency: "CHF", accountId: "a1", date: "2026-01-05" }],
};

describe("reducer", () => {
  it("ADD_TXN n'altère pas les soldes stockés", () => {
    const s = reducer(baseState, {
      type: "ADD_TXN",
      data: { type: "depense", amount: 50, currency: "CHF", accountId: "a1", date: "2026-01-10" },
    });
    expect(s.accounts[0].openingBalance).toBe(1000);
    expect(s.transactions).toHaveLength(2);
  });

  it("DELETE_ACCOUNT réaffecte les transactions en « Hors comptes »", () => {
    const s = reducer(baseState, { type: "DELETE_ACCOUNT", id: "a1" });
    expect(s.accounts).toHaveLength(0);
    expect(s.transactions).toHaveLength(1);
    expect(s.transactions[0].accountId).toBe("");
  });

  it("ADD_SNAPSHOT enregistre les valeurs par holding et dédoublonne par date", () => {
    const s1 = reducer({ ...emptyState, netWorthHistory: [] }, {
      type: "ADD_SNAPSHOT",
      date: "2026-01-01",
      value: 5000,
      holdings: { h1: 1200 },
    });
    expect(s1.netWorthHistory).toHaveLength(1);
    expect(s1.netWorthHistory[0].holdings).toEqual({ h1: 1200 });

    const s2 = reducer(s1, { type: "ADD_SNAPSHOT", date: "2026-01-01", value: 6000, holdings: { h1: 1300 } });
    expect(s2.netWorthHistory).toHaveLength(1);
    expect(s2.netWorthHistory[0].value).toBe(6000);
  });

  it("RESTORE_STATE restaure un état précédent", () => {
    const before = { ...baseState, transactions: [] };
    const s = reducer(baseState, { type: "RESTORE_STATE", state: before });
    expect(s).toEqual(before);
  });

  it("WIPE_ALL vide les données financières", () => {
    const s = reducer(baseState, { type: "WIPE_ALL" });
    expect(s.accounts).toHaveLength(0);
    expect(s.transactions).toHaveLength(0);
    expect(s.netWorthHistory).toHaveLength(0);
    expect(s.theme).toBe("light");
  });
});