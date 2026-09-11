import React, { createContext, useContext, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

const DELETE_WIDTH = 92;
const SNAP = DELETE_WIDTH / 2;
const MAX_DRAG = DELETE_WIDTH + 18;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Contexte partagé : une seule ligne peut être ouverte à la fois dans l'application.
const SwipeContext = createContext({ openId: null, setOpenId: () => {} });

export function SwipeProvider({ children }) {
  const [openId, setOpenId] = useState(null);
  return <SwipeContext.Provider value={{ openId, setOpenId }}>{children}</SwipeContext.Provider>;
}

// Ligne supprimable au glissement (mobile) : un glissement vers la gauche
// révèle un bouton corbeille. Le glissement fonctionne avec la souris aussi,
// mais seul le toucher horizontal fait apparaître le bouton.
export default function SwipeableRow({ id, onDelete, children }) {
  const { openId, setOpenId } = useContext(SwipeContext);
  const open = openId === id;
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);

  const startRef = useRef(null);
  const trackingRef = useRef(false);
  const swipedRef = useRef(false);
  const clickGuardRef = useRef(false);
  const openRef = useRef(open);
  const wasOpenRef = useRef(false);
  const offsetRef = useRef(0);
  const lastSwipeRef = useRef(0);
  openRef.current = open;

  const resetTracking = () => {
    trackingRef.current = false;
    setDragging(false);
    setOffset(0);
    offsetRef.current = 0;
  };

  const onPointerDown = (e) => {
    clickGuardRef.current = false;
    swipedRef.current = false;
    if (e.target.closest && e.target.closest(".drag-handle")) return;
    wasOpenRef.current = openRef.current;
    setOpenId(null); // referme toute ligne déjà ouverte (y compris cette ligne)
    resetTracking();
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    trackingRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e) => {
    if (!trackingRef.current || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!swipedRef.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        resetTracking();
        return;
      }
      swipedRef.current = true;
      setDragging(true);
    }
    if (e.cancelable) e.preventDefault();
    offsetRef.current = clamp((openRef.current ? -DELETE_WIDTH : 0) + dx, -MAX_DRAG, 0);
    setOffset(offsetRef.current);
  };

  const onPointerUp = () => {
    if (!trackingRef.current) return;
    if (swipedRef.current) {
      clickGuardRef.current = true;
      lastSwipeRef.current = Date.now();
      const cur = offsetRef.current;
      if (!openRef.current && cur < -SNAP) setOpenId(id);
    } else if (wasOpenRef.current) {
      clickGuardRef.current = true;
    }
    resetTracking();
  };

  // Empêche le clic de s'échapper après un glissement (ou un tap pour refermer).
  const onClickCapture = (e) => {
    if (clickGuardRef.current) {
      clickGuardRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleDelete = (e) => {
    if (Date.now() - lastSwipeRef.current < 400) return; // clic synthétique suivant le glissement
    setOpenId(null);
    if (onDelete) onDelete();
  };

  return (
    <div className={"swipe-wrap" + (open ? " open" : "")}>
      <button type="button" className="swipe-delete" onClick={handleDelete} aria-label="Supprimer">
        <Trash2 size={17} />
      </button>
      <div
        className={"swipe-content" + (open ? " open" : "") + (dragging ? " dragging" : "")}
        style={dragging ? { transform: `translateX(${offset}px)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={resetTracking}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}