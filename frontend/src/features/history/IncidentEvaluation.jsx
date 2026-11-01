import React from "react";
import GlassPanel from "../../components/GlassPanel";

function localDate(value) {
  const d = new Date(value);
  return Number.isFinite(d.getTime())
    ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : String(value || "—");
}

function SectionTitle({ icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink)" }}>{label}</h4>
    </div>
  );
}

function StatusPill({ met, trueLabel, falseLabel }) {
  const positive = met;
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: positive ? "rgba(220,50,50,0.1)" : "rgba(14,163,122,0.1)",
      color: positive ? "#c0392b" : "var(--jade-ink)",
      border: `1px solid ${positive ? "rgba(220,50,50,0.25)" : "rgba(14,163,122,0.25)"}`,
    }}>
      {positive ? trueLabel : falseLabel}
    </span>
  );
}

function MetricRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(14,26,47,0.06)", padding: "6px 0", gap: 12 }}>
      <span style={{ fontSize: 13, color: "var(--ink-secondary)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</span>
    </div>
  );
}

function DuplicatesPanel({ data, loading }) {
  if (loading && !data) return (
    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-secondary)", fontSize: 13 }}>
      <span style={{ fontSize: 22, display: "block", marginBottom: 6 }}>🔍</span>
      Scanning for duplicates…
    </div>
  );
  if (data?.error) return (
    <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(220,50,50,0.06)", border: "1px solid rgba(220,50,50,0.15)", fontSize: 13, color: "#c0392b" }}>
      ⚠️ Evaluation failed: {data.error}
    </div>
  );
  if (!data) return null;
  if (data.evaluation?.valid === false) return (
    <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,152,0,0.07)", border: "1px solid rgba(255,152,0,0.2)", fontSize: 13, color: "#e67e22" }}>
      ℹ️ {data.evaluation.reason || "Required incident evidence is missing for duplicate evaluation."}
    </div>
  );
  const candidates = data.candidates || [];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <StatusPill met={candidates.length > 0} trueLabel={`${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} found`} falseLabel="No duplicates found" />
      </div>
      {candidates.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-secondary)", textAlign: "center", padding: "8px 0" }}>
          ✅ No potential duplicate records matched this incident.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {candidates.map((c) => (
            <div key={c.incidentId} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(220,50,50,0.2)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
              <div>
                <code style={{ fontSize: 13, fontWeight: 800, color: "var(--brand-cyan-ink)" }}>{c.incidentId}</code>
                <span style={{ marginLeft: 8, fontSize: 12, color: "var(--ink-secondary)" }}>{c.state || "Unknown state"}</span>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>{c.reason}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--ink-muted)" }}>Reported: {localDate(c.reportedAt)}</p>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "rgba(220,50,50,0.08)", color: "#c0392b", whiteSpace: "nowrap" }}>
                {Math.round((c.similarity || 0) * 100)}% similar
              </span>
            </div>
          ))}
          <p style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4 }}>
            Similarity is a candidate flag for human review. It does not prove these describe the same physical event.
          </p>
        </div>
      )}
    </div>
  );
}

function RepeatPanel({ data, loading }) {
  if (loading && !data) return (
    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-secondary)", fontSize: 13 }}>
      <span style={{ fontSize: 22, display: "block", marginBottom: 6 }}>📋</span>
      Analysing repeat failures…
    </div>
  );
  if (data?.error) return (
    <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(220,50,50,0.06)", border: "1px solid rgba(220,50,50,0.15)", fontSize: 13, color: "#c0392b" }}>
      ⚠️ Evaluation failed: {data.error}
    </div>
  );
  if (!data) return null;
  if (data.valid === false) return (
    <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,152,0,0.07)", border: "1px solid rgba(255,152,0,0.2)", fontSize: 13, color: "#e67e22" }}>
      ℹ️ {data.reason || "Required incident evidence is missing for repeat-failure evaluation."}
    </div>
  );
  const matches = data.matchingIncidentIds || [];
  const matchingIncidents = data.matchingIncidents || [];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <StatusPill met={data.thresholdMet} trueLabel="Threshold met — escalation may apply" falseLabel="Below threshold" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 12, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(14,26,47,0.09)" }}>
        <MetricRow label="Tool" value={data.toolId || "Unknown"} mono />
        <MetricRow label="Category" value={data.category || "Unknown"} />
        <MetricRow label="Lookback window" value={`${data.windowDays || "?"} days through ${localDate(data.referenceAt)}`} />
        <MetricRow label="Threshold" value={data.minimumReports ?? "?"} />
        <MetricRow label="Prior matching records" value={data.count ?? "?"} />
      </div>
      {matches.length > 0 ? (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Matching incident records:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {matches.map((mid) => {
              const inc = matchingIncidents.find((i) => i.incidentId === mid);
              return (
                <div key={mid} style={{ padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(0,184,204,0.3)", background: "rgba(0,184,204,0.07)", fontSize: 12 }}>
                  <code style={{ fontWeight: 800 }}>{mid}</code>
                  {inc ? <span style={{ color: "var(--ink-secondary)", marginLeft: 6 }}>{inc.state}</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--ink-secondary)", textAlign: "center", padding: "6px 0" }}>
          ✅ No prior matching records in the lookback window.
        </p>
      )}
      <p style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 10 }}>
        {data.countBasis || "Record counts do not establish independent physical failures."}
      </p>
    </div>
  );
}

export default function IncidentEvaluation({ duplicates, repeatFailures, loading = false, incidentId }) {
  return (
    <GlassPanel variant="strong" style={{ padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Incident Evaluation</h3>
          {incidentId && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>Evaluating <strong>{incidentId}</strong></p>}
        </div>
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "rgba(0,184,204,0.08)", color: "var(--brand-cyan-ink)", border: "1px solid rgba(0,184,204,0.2)", fontWeight: 700 }}>
          AI-ASSISTED REVIEW
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(14,26,47,0.1)" }}>
          <SectionTitle icon="🔍" label="Potential Duplicates" />
          <DuplicatesPanel data={duplicates} loading={loading} />
        </div>
        <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(14,26,47,0.1)" }}>
          <SectionTitle icon="🔁" label="Repeat Failure Analysis" />
          <RepeatPanel data={repeatFailures} loading={loading} />
        </div>
      </div>
    </GlassPanel>
  );
}
