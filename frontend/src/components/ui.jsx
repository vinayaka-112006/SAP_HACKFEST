import React from "react";
import { Link } from "react-router-dom";

const paths = {
  dashboard: "M3 3h7v7H3zM14 3h7v5h-7zM14 11h7v10h-7zM3 13h7v8H3z",
  issues: "M12 3l9 16H3zM12 9v5M12 17h.01",
  equipment: "M4 7h16v10H4zM8 3v4M16 3v4M7 21h10",
  workforce: "M16 19v-2a4 4 0 0 0-8 0v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-2a3 3 0 0 0-2-2.8M4 19v-2a3 3 0 0 1 2-2.8",
  exposure: "M12 3l8 4v6c0 4.5-3.2 7.4-8 8-4.8-.6-8-3.5-8-8V7zM9 12l2 2 4-4",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10 21h4",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
  refresh: "M21 12a9 9 0 1 1-3-6.7M21 3v6h-6",
  plus: "M12 5v14M5 12h14",
  chevron: "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  menu: "M4 6h16M4 12h16M4 18h16",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3M5 11a7 7 0 0 0 14 0M12 18v3",
  camera: "M4 8h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z",
  shield: "M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6z",
  wrench: "M14.7 6.3a4 4 0 1 0 5 5L21 10l-7 7-3-3 7-7zM7 14l-4 4 3 3 4-4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  check: "M4 12l5 5L20 6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  logout: "M15 4h4v16h-4M10 17l-5-5 5-5M5 12h11",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  file: "M6 3h8l4 4v14H6zM14 3v5h5",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14",
  spark: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  verify: "M12 3l8 4v6c0 4.5-3.2 7.4-8 8-4.8-.6-8-3.5-8-8V7zM8.5 12l2.5 2.5L16 9.5",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  factory: "M3 21V9l6 4V9l6 4V5h6v16zM7 17h.01M12 17h.01M17 17h.01",
  robot: "M7 8h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3M12 3v5M9 14h.01M15 14h.01M9 18h6",
  download: "M12 4v12M7 11l5 5 5-5M4 20h16",
  filter: "M4 5h16l-6 7v6l-4 2v-8z",
  play: "M7 4l12 8-12 8z",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
};

export function Icon({ name, size = 18, strokeWidth = 1.8, ...rest }) {
  const d = paths[name] || paths.spark;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={d} />
    </svg>
  );
}

const tones = {
  Closed: "good", "Awaiting verification": "warn", "Awaiting manager completion review": "warn",
  "Repair in progress": "info", "Awaiting manager review": "violet", "Awaiting authorized assigner": "violet",
  "Awaiting technician assignment": "neutral", "Awaiting technician acceptance": "info",
  "Blocked by spare parts": "danger", "Awaiting information": "warn", "Awaiting additional repair evidence": "warn",
  "Awaiting worker confirmation": "neutral", "Awaiting closure": "warn", "Linked report": "neutral",
  Critical: "danger", High: "warn", Medium: "info", Low: "neutral", Unassessed: "neutral",
  Urgent: "warn", Immediate: "danger", Normal: "neutral",
  Active: "good", Restricted: "danger", Maintenance: "warn",
  Approved: "good", Rejected: "danger", Submitted: "info", "Under review": "warn", Draft: "neutral",
  Worker: "info", Manager: "violet", Technician: "good", Verifier: "warn", Quality: "neutral", Administrator: "danger",
};
export function tone(value) { return tones[value] || "neutral"; }
export function Chip({ children, variant }) {
  return <span className={"v23-chip " + (variant || tone(children))}>{children}</span>;
}
export function Card({ children, light, className = "", ...rest }) {
  return <section className={"v23-card " + (light ? "light " : "") + className} {...rest}>{children}</section>;
}
export function CardHead({ title, subtitle, actions }) {
  return (
    <div className="v23-card-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="v23-faint" style={{ margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {actions && <div className="v23-actions">{actions}</div>}
    </div>
  );
}
export function Stat({ label, value, hint, to, tone: t, onClick }) {
  const content = (<><span>{label}</span><strong>{value ?? 0}</strong>{hint && <small>{hint}</small>}</>);
  const props = { className: "v23-kpi", "data-tone": t };
  if (to) return <Link to={to} {...props}>{content}</Link>;
  return <button type="button" {...props} onClick={onClick}>{content}</button>;
}
export function Empty({ title = "Nothing here yet", children }) {
  return <div className="v23-empty"><strong>{title}</strong>{children}</div>;
}
export function Loading({ rows = 3 }) {
  return (
    <div className="v23-grid" style={{ gap: 10 }} role="status" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="v23-skeleton block" />)}
    </div>
  );
}
export function ErrorNote({ message, retry }) {
  return (
    <div className="v23-error" role="alert">
      <strong style={{ display: "block", marginBottom: 4 }}>Something went wrong</strong>
      {message}
      {retry && <div style={{ marginTop: 10 }}><button type="button" className="v23-btn sm" onClick={retry}>Try again</button></div>}
    </div>
  );
}
export function Avatar({ name = "?", size = 36 }) {
  const initials = String(name).replace(/[^A-Za-z\u0C80-\u0CFF\u0900-\u097F ]/g, " ").trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase() || "TS";
  return <span className="v23-avatar" style={{ width: size, height: size, fontSize: size / 2.8 }} aria-hidden="true">{initials}</span>;
}
export function Field({ label, hint, children, ...rest }) {
  return <label className="v23-field" {...rest}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function Progress({ value, max = 100 }) {
  const pct = Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100 / (Number(max) || 1))));
  return <div className="v23-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div style={{ width: pct + "%" }} /></div>;
}
export function Bars({ data = [], height = 120 }) {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, paddingTop: 8 }} role="img" aria-label="Bar chart">
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
          <span className="v23-mono" style={{ fontSize: 12, color: "#cfe6f3" }}>{d.value}</span>
          <div title={`${d.label}: ${d.value}`} style={{ width: "100%", borderRadius: "6px 6px 2px 2px", height: `${Math.max(4, (Number(d.value) || 0) / max * 74)}%`, background: d.tone || "linear-gradient(180deg,#67e8f9,#0891b2)" }} />
          <small style={{ fontSize: 11, color: "var(--v23-faint)", textAlign: "center" }}>{d.label}</small>
        </div>
      ))}
    </div>
  );
}
export function shortId(id) {
  const value = String(id || "");
  const match = /(?:Incident-|TS-)(\w+)$/.exec(value);
  return match ? match[1] : value.length > 18 ? value.slice(0, 16) + "…" : value;
}
export function when(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
