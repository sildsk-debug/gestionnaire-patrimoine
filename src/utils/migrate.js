import { txnEffect } from "./format.js";

export const SCHEMA_VERSION = 1;

function migrateV0toV1(state) {
  const transactions = (state.transactions || []).map((t) => ({
    ...t,
    frequency: t.frequency || (t.recurring ? "monthly" : ""),
    recurring: !!t.frequency || !!t.recurring,
  }));

  const txns = transactions;
  const accounts = (state.accounts || []).map((acc) => ({
    ...acc,
    openingBalance:
      typeof acc.openingBalance === "number"
        ? acc.openingBalance
        : (acc.balance ?? 0) -
          txns
            .filter((t) => t.accountId === acc.id)
            .reduce((sum, t) => sum + txnEffect(t, acc.currency || "CHF"), 0),
  }));
  for (const acc of accounts) delete acc.balance;

  return { ...state, accounts, transactions };
}

const MIGRATIONS = {
  0: migrateV0toV1,
};

export function migrateState(saved) {
  if (!saved || typeof saved !== "object") return saved;

  let version = 0;
  let state = saved;
  if (typeof saved.version === "number" && saved.state && typeof saved.state === "object") {
    version = saved.version;
    state = saved.state;
  }

  let next = state;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break;
    next = step(next);
    version += 1;
  }
  return next;
}