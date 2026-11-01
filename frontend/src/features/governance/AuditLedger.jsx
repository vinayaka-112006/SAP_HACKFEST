import React, { useState } from "react";
import GlassPanel from "../../components/GlassPanel";
import {
  auditActionLabel,
  auditEventDescription,
  auditSnapshotDiff,
  formatAuditTimestamp,
  parseAuditDetails,
} from "./audit-presentation.js";

const ACTION_COLORS = {
  INCIDENT_CREATED: { bg: "rgba(0,184,204,0.1)", border: "rgba(0,184,204,0.3)", dot: "#00b8cc", icon: "📝" },
  INCIDENT_CONFIRMED: { bg: "rgba(14,163,122,0.1)", border: "rgba(14,163,122,0.3)", dot: "#0ea37a", icon: "✅" },
  TRACE_GENERATED: { bg: "rgba(109,40,217,0.1)", border: "rgba(109,40,217,0.3)", dot: "#7c3aed", icon: "🔍" },
  CONTAINMENT_PROPOSAL_CREATED: { bg: "rgba(255,152,0,0.1)", border: "rgba(255,152,0,0.3)", dot: "#f59e0b", icon: "📋" },
  PROPOSAL_APPROVED: { bg: "rgba(14,163,122,0.1)", border: "rgba(14,163,122,0.3)", dot: "#0ea37a", icon: "✅" },
  PROPOSAL_REJECTED: { bg: "rgba(220,50,50,0.1)", border: "rgba(220,50,50,0.3)", dot: "#dc2626", icon: "❌" },
  TOOL_RETURN_TO_SERVICE_VERIFIED: { bg: "rgba(14,163,122,0.1)", border: "rgba(14,163,122,0.3)", dot: "#0ea37a", icon: "🔧" },
  TOOL_STATE_CHANGED: { bg: "rgba(109,40,217,0.1)", border: "rgba(109,40,217,0.3)", dot: "#7c3aed", icon: "⚙️" },
  REPAIR_STARTED: { bg: "rgba(255,152,0,0.1)", border: "rgba(255,152,0,0.3)", dot: "#f59e0b", icon: "🔨" },
  REPAIR_COMPLETED: { bg: "rgba(14,163,122,0.1)", border: "rgba(14,163,122,0.3)", dot: "#0ea37a", icon: "🔧" },
  INCIDENT_CLOSED: { bg: "rgba(14,26,47,0.06)", border: "rgba(14,26,47,0.18)", dot: "#6b7280", icon: "🏁" },
  DEFAULT: { bg: "rgba(14,26,47,0.06)", border: "rgba(14,26,47,0.15)", dot: "#6b7280", icon: "📌" },
};

function getActionStyle(action) {
  return ACTION_COLORS[action] || ACTION_COLORS.DEFAULT;
}

function ChangeTable({ diff }) {
  if (!diff.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-muted)" }}>Changed fields</p>
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(14,26,47,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(14,26,47,0.04)" }}>
              <th scope="col" style={{ padding: "6px 12px", textAlign: "left", fontWeight: 700, color: "var(--ink)", borderBottom: "1px solid rgba(14,26,47,0.08)", width: "30%" }}>Field</th>
              <th scope="col" style={{ padding: "6px 12px", textAlign: "left", fontWeight: 700, color: "var(--ink)", borderBottom: "1px solid rgba(14,26,47,0.08)", width: "35%" }}>Before</th>
              <th scope="col" style={{ padding: "6px 12px", textAlign: "left", fontWeight: 700, color: "var(--ink)", borderBottom: "1px solid rgba(14,26,47,0.08)", width: "35%" }}>After</th>
            </tr>
          </thead>
          <tbody>
            {diff.map((change, i) => (
              <tr key={change.field} style={{ background: i % 2 === 0 ? "#fff" : "rgba(14,26,47,0.02)" }}>
                <th scope="row" style={{ padding: "6px 12px", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{change.field}</th>
                <td style={{ padding: "6px 12px", color: "#c0392b", fontFamily: "var(--font-mono)", fontSize: 11 }}>{change.before}</td>
                <td style={{ padding: "6px 12px", color: "var(--jade-ink)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>{change.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditEntry({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const style = getActionStyle(entry.action);
  const diff = auditSnapshotDiff(entry);
  const details = parseAuditDetails(entry.details);

  return (
    <article
      aria-label={`Audit: ${auditActionLabel(entry.action)}`}
      style={{
        position: "relative",
        paddingLeft: 28,
        marginBottom: 0,
      }}
    >
      {/* Timeline dot */}
      <div style={{
        position: "absolute",
        left: 0,
        top: 14,
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: style.dot,
        border: "2px solid #fff",
        boxShadow: `0 0 0 2px ${style.dot}40`,
        zIndex: 1,
      }} />

      <div style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "#fff",
        border: `1px solid rgba(14,26,47,0.09)`,
        transition: "box-shadow 0.2s",
      }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
              padding: "3px 10px", borderRadius: 6,
              background: style.bg, border: `1px solid ${style.border}`,
              color: "var(--ink)",
            }}>
              <span>{style.icon}</span>
              {auditActionLabel(entry.action)}
            </span>
          </div>
          <time dateTime={entry.timestamp} title={`UTC: ${entry.timestamp}`}
            style={{ fontSize: 11, color: "var(--ink-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
            {formatAuditTimestamp(entry.timestamp)}
          </time>
        </div>

        {/* Description */}
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 650, color: "var(--ink)" }}>
          {auditEventDescription(entry)}
        </p>

        {/* Metadata grid */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: "4px 16px", fontSize: 12 }}>
          <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>Actor</span>
          <span style={{ color: "var(--ink)", fontWeight: 700 }}>{entry.actor || "—"}</span>
          <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>Role</span>
          <span style={{ color: "var(--ink)" }}>{entry.actorRole || "—"}</span>
          {entry.incidentId && <>
            <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>Incident</span>
            <span style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{entry.incidentId}</span>
          </>}
          {entry.toolId && <>
            <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>Tool</span>
            <span style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{entry.toolId}</span>
          </>}
          {entry.reason && <>
            <span style={{ color: "var(--ink-muted)", fontWeight: 600, gridColumn: "span 1" }}>Note</span>
            <span style={{ color: "var(--ink)", gridColumn: "span 3", overflowWrap: "anywhere" }}>{entry.reason}</span>
          </>}
        </div>

        {/* Audit ID */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(14,26,47,0.06)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Audit ID</span>
          <code style={{ fontSize: 10, color: "var(--ink-secondary)", fontFamily: "var(--font-mono)", overflowWrap: "anywhere", flex: 1 }}>{entry.auditId}</code>
          <button
            type="button"
            onClick={async () => {
              try { await navigator.clipboard.writeText(entry.auditId); setCopied(true); setTimeout(() => setCopied(false), 2000); }
              catch { setCopied(false); }
            }}
            style={{ padding: "2px 10px", borderRadius: 6, border: "1px solid rgba(14,26,47,0.18)", background: copied ? "rgba(14,163,122,0.08)" : "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", color: copied ? "var(--jade-ink)" : "var(--ink-secondary)", whiteSpace: "nowrap" }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>

        {/* Changed fields */}
        <ChangeTable diff={diff} />

        {/* Technical details accordion */}
        <details style={{ marginTop: 10 }} onToggle={(e) => setExpanded(e.target.open)}>
          <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em", userSelect: "none" }}>
            {expanded ? "▼" : "▶"} Technical details
          </summary>
          <pre style={{ marginTop: 8, maxWidth: "100%", overflowX: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 11, background: "rgba(14,26,47,0.03)", border: "1px solid rgba(14,26,47,0.08)", borderRadius: 8, padding: "10px 12px", color: "var(--ink-secondary)" }}>
            {JSON.stringify(details, null, 2)}
          </pre>
        </details>
      </div>
    </article>
  );
}

export default function AuditLedger({ auditLog = [] }) {
  return (
    <GlassPanel variant="solid" style={{ padding: "24px 28px", width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>Application Audit History</h3>
            <span style={{ fontSize: 11, fontWeight: 700, border: "1px solid rgba(14,26,47,0.18)", borderRadius: 999, padding: "2px 10px", color: "var(--ink-muted)" }}>
              {auditLog.length} {auditLog.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-secondary)", margin: 0 }}>
            Append-only audit trail. All entries are persisted in UTC and cannot be modified or deleted.
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: "rgba(14,163,122,0.1)", color: "var(--jade-ink)", border: "1px solid rgba(14,163,122,0.25)", whiteSpace: "nowrap" }}>
          🔒 APPEND-ONLY
        </span>
      </div>

      {/* Empty state */}
      {!auditLog.length ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-secondary)" }}>
          <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>📭</span>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No audit entries yet</p>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}>Actions will appear here as events are recorded.</p>
        </div>
      ) : (
        /* Timeline */
        <div style={{ position: "relative" }}>
          {/* Vertical timeline line */}
          <div style={{
            position: "absolute",
            left: 5,
            top: 0,
            bottom: 0,
            width: 2,
            background: "linear-gradient(to bottom, rgba(0,184,204,0.4), rgba(14,26,47,0.08))",
            borderRadius: 1,
          }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {auditLog.map((entry) => (
              <AuditEntry key={entry.auditId} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
