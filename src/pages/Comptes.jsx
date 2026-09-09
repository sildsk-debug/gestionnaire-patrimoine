import React from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "../components/ui.jsx";
import { ASSET_TYPES, LIABILITY_TYPES } from "../data/constants.js";
import { fmtMoney, catInfo } from "../utils/format.js";

export default function Comptes({ state, openQuick, openEdit }) {
  return (
    <div className="page">
      {state.accounts.length === 0 ? (
        <EmptyState title="Aucun compte" sub="Ajoutez votre premier compte bancaire ou passif." actionLabel="Ajouter un compte" onAction={() => openQuick("account")} />
      ) : (
        <div className="accounts-list">
          {state.accounts.map((a) => (
            <button key={a.id} className="account-row" onClick={() => openEdit("account", a)}>
              <div>
                <div className="account-name">{a.name}</div>
                <div className="txn-sub">{catInfo([...ASSET_TYPES, ...LIABILITY_TYPES], a.type).label} · {a.currency}</div>
              </div>
              <span className={"row-value " + (a.category === "passif" ? "neg" : "")}>{fmtMoney(a.balance, a.currency)}</span>
            </button>
          ))}
        </div>
      )}
      <button className="fab" onClick={() => openQuick("account")}><Plus size={22} /></button>
    </div>
  );
}
