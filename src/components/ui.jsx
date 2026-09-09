import React from "react";
import { X } from "lucide-react";

export function Card({ children, className = "", onClick }) {
  return (
    <div className={"card " + className} onClick={onClick}>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, sub, trend, icon: Icon }) {
  return (
    <Card className="kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {Icon && <Icon size={16} strokeWidth={1.75} className="kpi-icon" />}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className={"kpi-sub " + (trend === "up" ? "pos" : trend === "down" ? "neg" : "")}>{sub}</div>}
    </Card>
  );
}

export function ProgressBar({ pct, tone = "normal" }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = tone === "danger" ? "var(--neg)" : tone === "warn" ? "var(--gold)" : "var(--pos)";
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: clamped + "%", background: color }} />
    </div>
  );
}

export function EmptyState({ title, sub, actionLabel, onAction }) {
  return (
    <Card className="empty-state">
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {actionLabel && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </Card>
  );
}

export function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function ChartEmpty({ text }) {
  return <div className="chart-empty">{text}</div>;
}

export function RangeSelector({ range, setRange }) {
  const options = [
    { id: "1m", label: "1M" },
    { id: "3m", label: "3M" },
    { id: "6m", label: "6M" },
    { id: "1a", label: "1A" },
    { id: "tout", label: "Tout" },
  ];
  return (
    <div className="range-selector">
      {options.map((o) => (
        <button key={o.id} className={"range-btn " + (range === o.id ? "active" : "")} onClick={() => setRange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function filterHistory(history, range) {
  if (!history.length) return [];
  if (range === "tout") return history;
  const months = { "1m": 1, "3m": 3, "6m": 6, "1a": 12 }[range] ?? 6;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return history.filter((h) => new Date(h.date) >= cutoff);
}
