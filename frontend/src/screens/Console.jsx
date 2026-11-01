import React, { useState } from "react";
import ResourceState from "../components/ResourceState";
import InterlockGate from "../features/governance/InterlockGate";
import { useStore } from "../state/store";
import GlassPanel from "../components/GlassPanel";
import StatusBadge from "../components/StatusBadge";
import StateRail from "../features/governance/StateRail";
import LockoutTag from "../features/governance/LockoutTag";
import AuditLedger from "../features/governance/AuditLedger";
import CertaintyCapsule from "../features/evidence/CertaintyCapsule";
import WindowLens from "../features/evidence/WindowLens";
import EvidenceYard from "../features/evidence/EvidenceYard";
import GlassTanks from "../features/evidence/GlassTanks";
import GapsPanel from "../features/evidence/GapsPanel";
import EvidenceDrawer from "../features/evidence/EvidenceDrawer";
import SimilarEvidence from "../features/memory/SimilarEvidence";
import Communication from "../features/worker/Communication";

export default function Console() {
  const {
    selectedWindow,
    setSelectedWindow,
    incident,
    incidentId,
    openIncident,
    incidentState,
    tools,
    toolsState,
    auditLog,
    auditState,
    documents,
    documentsState,
    trace,
    traceState,
    canReview,
    currentRole,
    selectedUnit,
    setSelectedUnit,
    viewMode,
    setViewMode,
    allUnits,
    inWindowUnits,
    tankCounts,
    tierCounts,
    refresh,
  } = useStore();
  const [lookup, setLookup] = useState(incidentId);
  const [showGaps, setShowGaps] = useState(false);
  const toolB = tools.find((tool) => tool.toolId === incident?.toolId);
  const isToolRestricted = toolB?.state === "Restricted";
  const picker = (
    <GlassPanel
      variant="clear"
      style={{ padding: "20px", marginBottom: "20px" }}
    >
      <form
        className="incident-picker"
        onSubmit={(event) => {
          event.preventDefault();
          openIncident(lookup);
        }}
      >
        <label htmlFor="incident-lookup">Open incident ID</label>
        <input
          id="incident-lookup"
          value={lookup}
          onChange={(event) => setLookup(event.target.value)}
          placeholder="TS-0002"
          required
        />
        <button className="primary-action" type="submit">
          Open Incident
        </button>
        <button className="secondary-action" type="button" onClick={refresh}>
          Refresh Records
        </button>
      </form>
    </GlassPanel>
  );
  if (!incident)
    return (
      <div
        className="console-container"
        style={{ maxWidth: "1440px", margin: "0 auto", padding: "24px" }}
      >
        {picker}
        <ResourceState
          state={incidentState}
          empty="Report an incident from the Worker Terminal, or open an existing incident ID."
        />
      </div>
    );
  return (
    <div
      className="console-container"
      style={{
        padding: "28px 32px 140px 32px",
        maxWidth: "1440px",
        margin: "0 auto",
      }}
    >
      {picker}
      <ResourceState state={toolsState} />
      {/* 1. HERO INCIDENT CONTROL HEADER */}
      <header style={{ marginBottom: "28px" }}>
        <GlassPanel variant="strong" style={{ padding: "28px 32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: "var(--brand-cyan-ink)",
                    background: "var(--brand-cyan-soft)",
                    padding: "4px 12px",
                    borderRadius: "var(--radius-pill)",
                    border: "1px solid rgba(0, 184, 204, 0.3)",
                  }}
                >
                  INCIDENT {incident.incidentId}
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    color: "var(--ink-secondary)",
                    fontWeight: 600,
                  }}
                >
                  {toolB?.line || incident.toolId} |{" "}
                  {toolB?.workCenter || "Tool register loading"}
                </span>
                <StatusBadge status="Verified" size="medium" />
              </div>

              <h1
                style={{
                  fontSize: "34px",
                  fontWeight: 900,
                  letterSpacing: "-0.025em",
                  color: "var(--ink)",
                  margin: "8px 0 6px 0",
                }}
              >
                {incident.category || "Tool incident"}
              </h1>

              <div
                style={{
                  fontSize: "17px",
                  color: "var(--ink-secondary)",
                  marginTop: "4px",
                }}
              >
                Reporter: <strong>{incident.reporterId}</strong> | Language:{" "}
                {incident.language} | Suggested NC:{" "}
                {incident.suggestedNcCode || "Not supplied"}
              </div>
            </div>

            {/* Target Asset Tile with 3D Lockout Tag */}
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "12px 20px",
                  borderRadius: "18px",
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid rgba(7, 17, 32, 0.12)",
                  boxShadow: "0 6px 18px rgba(7, 17, 32, 0.06)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "var(--ink-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    TARGET ASSET
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "var(--ink)",
                    }}
                  >
                    {incident.toolId} ({toolB?.type || "Tool"})
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                      color: isToolRestricted
                        ? "var(--ruby-ink)"
                        : "var(--jade-ink)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "2px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: isToolRestricted
                          ? "var(--ruby)"
                          : "var(--jade)",
                      }}
                    />
                    <span>
                      {isToolRestricted
                        ? "LOTO Restricted"
                        : "Active per records"}
                    </span>
                  </div>
                </div>

                {/* 3D Hanging Lockout Tag */}
                <LockoutTag
                  isRestricted={isToolRestricted}
                  tagId={incident.toolId}
                />
              </div>
            </div>
          </div>

          {/* Incident State Progression Rail */}
          <div
            style={{
              borderTop: "1px solid rgba(7, 17, 32, 0.08)",
              paddingTop: "16px",
            }}
          >
            <StateRail currentState={incident.state} />
          </div>
        </GlassPanel>
      </header>

      <GlassPanel
        variant="solid"
        style={{ padding: "24px", marginBottom: "20px" }}
      >
        <h2>Incident Details</h2>
        <p className="original-report">{incident.rawText}</p>
        {incident.translatedText && <p>{incident.translatedText}</p>}
        <p className="muted">
          Reported: {incident.reportedAt} ({incident.reportedAtSource}) | State:{" "}
          {incident.state}
        </p>
        <p className="muted">
          {incident.confidence == null
            ? "No AI confidence supplied"
            : `AI confidence: ${incident.confidence}`}{" "}
          | Model: {incident.modelVersion || "Not supplied"}
        </p>
        {!!incident.missingFields?.length && (
          <p>Missing fields: {incident.missingFields.join(", ")}</p>
        )}
        <h3>Incident evidence</h3>
        {incidentState.data?.evidence.length ? (
          incidentState.data.evidence.map((item) => (
            <p key={item.evidenceId}>
              {item.type}: {item.reference}
            </p>
          ))
        ) : (
          <p>No attached evidence.</p>
        )}
      </GlassPanel>
      <SimilarEvidence incidentId={incident.incidentId} />
      <Communication incidentId={incident.incidentId} language={incident.language || 'en'} traceWindow={trace?.windowHours} traceVersion={trace?.version} />
      {!canReview && (
        <div className="resource-message">
          Trace and audit require Manager, Quality or Verifier. Current local
          demo role: {currentRole}.
        </div>
      )}
      {canReview && (
        <>
          <section style={{ marginBottom: "20px" }}>
            <WindowLens
              activeWindow={selectedWindow}
              totalUnits={trace?.summary.totalUnits}
              onWindowChange={setSelectedWindow}
            />
          </section>
          <ResourceState state={traceState} />
          {trace && (
            <div data-testid="trace-result" data-window={trace.windowHours}>
              <section style={{ marginBottom: "20px" }}>
                <CertaintyCapsule
                  totalExposed={trace.summary.totalUnits}
                  confirmedCount={trace.summary.byTier.CONFIRMED}
                  probableCount={trace.summary.byTier.PROBABLE}
                  unknownCount={trace.summary.byTier.UNKNOWN}
                  windowHours={trace.windowHours}
                  qualityScore={trace.dataQuality.score}
                  exposureRange={trace.exposureRange}
                  snapshotTime={trace.snapshotTime}
                  onOpenGaps={() => setShowGaps(!showGaps)}
                />
              </section>
              <div className="resource-message">
                <p>{trace.disclaimer}</p>
                <p>
                  Shipped units: {trace.summary.byLocation.SHIPPED} | Unknown
                  location: {trace.summary.byLocation.UNKNOWN_LOCATION} | Stale
                  location: {trace.summary.staleLocationUnits}
                </p>
                <p>
                  Scope value: INR{" "}
                  {trace.valueAtRisk.amountINR.toLocaleString()} (
                  {trace.valueAtRisk.label})
                </p>
              </div>
              {showGaps && (
                <section style={{ marginBottom: "20px" }}>
                  <GapsPanel
                    gaps={trace.gaps}
                    deductions={trace.dataQuality.deductions}
                    units={allUnits}
                    onClose={() => setShowGaps(false)}
                    onSelectUnit={(serial) =>
                      setSelectedUnit(
                        allUnits.find((unit) => unit.serial === serial),
                      )
                    }
                  />
                </section>
              )}
              <section style={{ marginBottom: "20px" }}>
                <EvidenceYard
                  allUnits={allUnits}
                  inWindowUnits={inWindowUnits}
                  selectedWindow={trace.windowHours}
                  viewMode={viewMode}
                  onToggleViewMode={setViewMode}
                  onUnitClick={setSelectedUnit}
                />
              </section>
              <section style={{ marginBottom: "20px" }}>
                <GlassTanks
                  counts={tankCounts}
                  tiers={tierCounts}
                  totalUnits={trace.summary.totalUnits}
                  staleLocationUnits={trace.summary.staleLocationUnits}
                  onTankClick={() => setViewMode("list")}
                />
              </section>
            </div>
          )}
        </>
      )}
      <section style={{ marginBottom: "24px" }}>
        <h2>Governance Interlock Gates (Containment Proposals)</h2>
        <div className="integration-grid">
          <GlassPanel variant="strong" style={{ padding: "24px" }}>
            <InterlockGate requiredRole="Manager / Quality" />
            <h3>Human-approved containment</h3>
            <p>
              Workflow unavailable: proposal and approval endpoints are still
              stubs. No containment has been proposed or executed here.
            </p>
            <button className="secondary-action" disabled>
              Propose Containment
            </button>
            <button className="secondary-action" disabled>
              Approve and Dispatch
            </button>
          </GlassPanel>
          <GlassPanel variant="strong" style={{ padding: "24px" }}>
            <h3>Verified Return to Service</h3>
            <p>
              Awaiting Jamuna's repair and verification workflow. The displayed
              tool state is read from the database.
            </p>
            <button className="secondary-action" disabled>
              Verify Return to Service
            </button>
          </GlassPanel>
        </div>
      </section>
      <section style={{ marginBottom: "24px" }}>
        <h2>SIMULATED SAP Documents</h2>
        <ResourceState state={documentsState} />
        {!documentsState.loading &&
          !documentsState.error &&
          (documents.length ? (
            documents.map((doc) => (
              <GlassPanel
                key={doc.docId}
                variant="solid"
                style={{ padding: "20px" }}
              >
                <StatusBadge status="Simulated" />
                <h3>{doc.type}</h3>
                <p>
                  {doc.docId} | {doc.system} | {doc.createdAt}
                </p>
                <details>
                  <summary>Document fields</summary>
                  <pre>{JSON.stringify(doc.payload, null, 2)}</pre>
                </details>
              </GlassPanel>
            ))
          ) : (
            <p>No simulated documents exist for this incident.</p>
          ))}
      </section>
      {canReview && (
        <section style={{ marginBottom: "24px" }}>
          <ResourceState state={auditState} />
          {auditState.data && <AuditLedger auditLog={auditLog} />}
        </section>
      )}
      {/* 8. UNIT EVIDENCE DOSSIER DRAWER */}
      {selectedUnit && (
        <EvidenceDrawer
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
        />
      )}
    </div>
  );
}
