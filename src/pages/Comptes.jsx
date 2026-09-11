import React from "react";
import { Plus, GripVertical } from "lucide-react";
import { DndContext, PointerSensor, TouchSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EmptyState } from "../components/ui.jsx";
import SwipeableRow from "../components/SwipeableRow.jsx";
import { ASSET_TYPES, LIABILITY_TYPES } from "../data/constants.js";
import { fmtMoney, catInfo } from "../utils/format.js";

function SortableAccountRow({ account, onEdit }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: account.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(account)}
      className={"account-row" + (isDragging ? " dragging" : "")}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="drag-handle"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
        aria-label={`Réordonner ${account.name}`}
      >
        <GripVertical size={16} />
      </button>
      <div>
        <div className="account-name">{account.name}</div>
        <div className="txn-sub">{catInfo([...ASSET_TYPES, ...LIABILITY_TYPES], account.type).label} · {account.currency}</div>
      </div>
      <span className={"row-value " + (account.category === "passif" ? "neg" : "")}>{fmtMoney(account.balance, account.currency)}</span>
    </div>
  );
}

export default function Comptes({ state, dispatch, openQuick, openEdit }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = state.accounts.findIndex((a) => a.id === active.id);
    const to = state.accounts.findIndex((a) => a.id === over.id);
    const next = [...state.accounts];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    dispatch({ type: "REORDER_ACCOUNTS", accounts: next });
  };

  return (
    <div className="page">
      {state.accounts.length === 0 ? (
        <EmptyState title="Aucun compte" sub="Ajoutez votre premier compte bancaire ou passif." actionLabel="Ajouter un compte" onAction={() => openQuick("account")} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={state.accounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="accounts-list">
              {state.accounts.map((a) => (
                <SwipeableRow key={a.id} id={a.id} onDelete={() => dispatch({ type: "DELETE_ACCOUNT", id: a.id })}>
                  <SortableAccountRow account={a} onEdit={() => openEdit("account", a)} />
                </SwipeableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <button className="fab" onClick={() => openQuick("account")}><Plus size={22} /></button>
    </div>
  );
}