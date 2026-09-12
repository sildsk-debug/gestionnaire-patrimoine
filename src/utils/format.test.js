import { describe, it, expect, beforeEach } from "vitest";
import { sumBy, toBase, txnEffect, setFxRates, resetFxRates, monthKey } from "./format.js";

describe("format", () => {
  beforeEach(() => resetFxRates());

  it("sumBy aggrège sans dérive d'arrondi", () => {
    expect(sumBy([{ v: 0.1 }, { v: 0.2 }], (x) => x.v)).toBeCloseTo(0.3);
    expect(sumBy([], (x) => x.v)).toBe(0);
  });

  it("toBase convertit vers la devise de référence", () => {
    expect(toBase(100, "CHF")).toBe(100);
    expect(toBase(100, "EUR")).toBeCloseTo(104);
    expect(toBase(100, "devise-inconnue")).toBe(100);
  });

  it("setFxRates remplace les taux à chaud", () => {
    setFxRates({ EUR: 1.5 });
    expect(toBase(10, "EUR")).toBe(15);
    resetFxRates();
    expect(toBase(10, "EUR")).toBeCloseTo(10.4);
  });

  it("txnEffect renvoie un effet signé dans la devise du compte", () => {
    const dep = { type: "depense", amount: 100, currency: "USD" };
    const revEuros = { type: "revenu", amount: 100, currency: "EUR" };
    expect(txnEffect(dep, "USD")).toBeCloseTo(-100);
    expect(txnEffect(revEuros, "CHF")).toBeCloseTo(104);
    expect(txnEffect(revEuros, "EUR")).toBeCloseTo(100);
  });

  it("monthKey formate en AAAA-MM", () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe("2026-01");
    expect(monthKey(new Date(2026, 11, 31))).toBe("2026-12");
  });
});