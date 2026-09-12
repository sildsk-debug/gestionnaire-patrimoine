import { describe, it, expect } from "vitest";
import { executeDueRecurring, nextOccurrenceDate } from "./recurring.js";

const txn = (overrides) => ({
  id: "t1",
  type: "revenu",
  category: "salaire",
  amount: 1000,
  currency: "CHF",
  accountId: "a1",
  date: "2025-12-25",
  description: "Salaire",
  frequency: "monthly",
  ...overrides,
});

describe("recurring", () => {
  it("calcule la prochaine occurrence selon la fréquence", () => {
    expect(nextOccurrenceDate("2026-01-10", "monthly")).toBe("2026-02-10");
    expect(nextOccurrenceDate("2026-01-10", "quarterly")).toBe("2026-04-10");
    expect(nextOccurrenceDate("2026-01-10", "yearly")).toBe("2027-01-10");
  });

  it("crée l'occurrence due quand la date est atteinte", () => {
    const created = executeDueRecurring([txn({ date: "2025-11-25" })], new Date(2026, 0, 15));
    expect(created).toHaveLength(1);
    expect(created[0].date).toBe("2025-12-25");
    expect(created[0].recurring).toBe(true);
  });

  it("ne crée rien si la prochaine occurrence est dans le futur", () => {
    const created = executeDueRecurring([txn({ date: "2026-01-10" })], new Date(2026, 0, 15));
    expect(created).toHaveLength(0);
  });

  it("dédoublonne une occurrence déjà existante (une seule par ouverture)", () => {
    const existing = [txn({ id: "t0", date: "2025-12-25" }), txn({ id: "t1", date: "2026-01-25" })];
    const created = executeDueRecurring(existing, new Date(2026, 0, 15));
    expect(created).toHaveLength(0);
  });

  it("ignore les transactions non récurrentes", () => {
    const created = executeDueRecurring([txn({ frequency: "" })], new Date(2026, 0, 15));
    expect(created).toHaveLength(0);
  });
});