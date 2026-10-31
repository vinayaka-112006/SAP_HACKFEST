import React, { useState } from 'react';
import { useStore } from '../state/store';
import GlassPanel from '../components/GlassPanel';
import StatusBadge from '../components/StatusBadge';
import FreshnessStamp from '../components/FreshnessStamp';
import RoleSwitch from '../components/RoleSwitch';
import StateRail from '../features/governance/StateRail';
import LockoutTag from '../features/governance/LockoutTag';
import ProposalCard from '../features/governance/ProposalCard';
import AuditLedger from '../features/governance/AuditLedger';
import CertaintyCapsule from '../features/evidence/CertaintyCapsule';
import WindowLens from '../features/evidence/WindowLens';
import EvidenceYard from '../features/evidence/EvidenceYard';
import GlassTanks from '../features/evidence/GlassTanks';
import GapsPanel from '../features/evidence/GapsPanel';
import EvidenceDrawer from '../features/evidence/EvidenceDrawer';

export default function Console() {
  const {
    currentRole,
    setCurrentRole,
    selectedWindow,
    setSelectedWindow,
    incident,
    tools,
    proposals,
    auditLog,
    selectedUnit,
    setSelectedUnit,
    viewMode,
    setViewMode,
    allUnits,
    inWindowUnits,
    tankCounts,
    tierCounts,
    canRoleApprove,
    approveProposal,
    rejectProposal,
    verifyReturnToService
  } = useStore();

  const [showGaps, setShowGaps] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [repairNotes, setRepairNotes] = useState('Replaced torque transducer head and reset slip clutch mechanism.');
  const [testReading1, setTestReading1] = useState('84.8');
  const [testReading2, setTestReading2] = useState('85.1');
  const [testReading3, setTestReading3] = useState('85.0');

  const toolB = tools.find(t => t.toolId === 'TOOL-B') || tools[1];
  const isToolRestricted = toolB?.status === 'Restricted';

  const handleExecuteVerification = (e) => {
    e.preventDefault();
    verifyReturnToService('TOOL-B', {
      repairLog: repairNotes,
      testReadings: [testReading1, testReading2, testReading3],
      verifierName: `Arun V. (Senior Metrology Verifier • ${currentRole})`
    });
    setShowVerifyModal(false);
  };

  return (
    <div className="console-container" style={{ padding: '28px 32px 140px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. HERO INCIDENT CONTROL HEADER */}
      <header style={{ marginBottom: '28px' }}>
        <GlassPanel variant="strong" style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--brand-cyan-ink)',
                  background: 'var(--brand-cyan-soft)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid rgba(0, 184, 204, 0.3)'
                }}>
                  INCIDENT {incident.incidentId}
                </span>
                <span style={{ fontSize: '16px', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                  Line 3 • Brake Caliper Station 04
                </span>
                <StatusBadge status="Verified" size="medium" />
              </div>

              <h1 style={{ fontSize: '34px', fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--ink)', margin: '8px 0 6px 0' }}>
                {incident.category}
              </h1>

              <div style={{ fontSize: '17px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Reporter: <strong style={{ color: 'var(--ink)' }}>{incident.reporterName}</strong> (OP-104) • Spoken in Kannada • AI NC Suggestion: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-cyan-ink)' }}>{incident.suggestedNcCode}</span>
              </div>
            </div>

            {/* Target Asset Tile with 3D Lockout Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 20px',
                borderRadius: '18px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(7, 17, 32, 0.12)',
                boxShadow: '0 6px 18px rgba(7, 17, 32, 0.06)'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TARGET ASSET
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                    Tool B (Torque)
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: isToolRestricted ? 'var(--ruby-ink)' : 'var(--jade-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '2px'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isToolRestricted ? 'var(--ruby)' : 'var(--jade)'
                    }} />
                    <span>{isToolRestricted ? 'LOTO Restricted' : 'Verified In-Service'}</span>
                  </div>
                </div>

                {/* 3D Hanging Lockout Tag */}
                <LockoutTag
                  isRestricted={isToolRestricted}
                  tagId={toolB.lockoutDetails?.tagId || 'LOTO-B-09'}
                  onVerifyClick={() => setShowVerifyModal(true)}
                />
              </div>
            </div>
          </div>

          {/* Incident State Progression Rail */}
          <div style={{ borderTop: '1px solid rgba(7, 17, 32, 0.08)', paddingTop: '16px' }}>
            <StateRail currentState={incident.state} />
          </div>
        </GlassPanel>
      </header>

      {/* 2. CERTAINTY CAPSULE (SIGNATURE TRANSPARENCY STRIP) */}
      <section style={{ marginBottom: '28px' }}>
        <CertaintyCapsule
          totalExposed={inWindowUnits.length}
          confirmedCount={tierCounts.confirmed}
          probableCount={tierCounts.probable}
          unknownCount={tierCounts.unknown}
          windowHours={selectedWindow}
          qualityScore={Math.round(incident.dataQualityScore * 100)}
          onOpenGaps={() => setShowGaps(!showGaps)}
        />
      </section>

      {/* 3. WINDOW LENS TIMELINE SCRUBBER */}
      <section style={{ marginBottom: '28px' }}>
        <WindowLens
          activeWindow={selectedWindow}
          onWindowChange={setSelectedWindow}
        />
      </section>

      {/* DATA GAPS ACCORDION */}
      {showGaps && (
        <section style={{ marginBottom: '28px' }}>
          <GapsPanel
            onClose={() => setShowGaps(false)}
            onSelectUnit={(uid) => {
              const u = allUnits.find(item => item.unitId === uid);
              if (u) setSelectedUnit(u);
            }}
          />
        </section>
      )}

      {/* 4. THE EVIDENCE YARD (HERO VISUALIZATION) */}
      <section style={{ marginBottom: '32px' }}>
        <EvidenceYard
          allUnits={allUnits}
          inWindowUnits={inWindowUnits}
          selectedWindow={selectedWindow}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          onUnitClick={setSelectedUnit}
        />
      </section>

      {/* 5. GLASS TANKS (DOWNSTREAM INVENTORY VESSELS) */}
      <section style={{ marginBottom: '36px' }}>
        <GlassTanks
          counts={tankCounts}
          tiers={tierCounts}
          totalUnits={inWindowUnits.length}
          onTankClick={(tankId) => setViewMode('list')}
        />
      </section>

      {/* 6. GOVERNANCE INTERLOCK GATES & CONTAINMENT PROPOSALS */}
      <section style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)' }}>
              Governance Interlock Gates (Containment Proposals)
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
              "AI proposes, humans approve." Interlock doors swing open only with authorized certified credentials.
            </p>
          </div>
          <StatusBadge status="Simulated" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {proposals.map(proposal => (
            <ProposalCard
              key={proposal.proposalId}
              proposal={proposal}
              currentRole={currentRole}
              canApprove={canRoleApprove(proposal)}
              onApprove={approveProposal}
              onReject={rejectProposal}
            />
          ))}
        </div>
      </section>

      {/* 7. IMMUTABLE APPEND-ONLY AUDIT LEDGER */}
      <section style={{ marginBottom: '36px' }}>
        <AuditLedger auditLog={auditLog} />
      </section>

      {/* 8. UNIT EVIDENCE DOSSIER DRAWER */}
      {selectedUnit && (
        <EvidenceDrawer
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
        />
      )}

      {/* 9. RETURN-TO-SERVICE VERIFICATION MODAL */}
      {showVerifyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(7, 17, 32, 0.55)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
          padding: '24px'
        }}>
          <GlassPanel variant="strong" style={{ maxWidth: '580px', width: '100%', padding: '36px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: 'var(--jade-ink)',
                  background: 'var(--jade-soft)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)'
                }}>
                  METROLOGY GATEWAY M12
                </span>
                <h3 style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: 'var(--ink)' }}>
                  Verified Return to Service
                </h3>
              </div>
              <button onClick={() => setShowVerifyModal(false)} style={{ fontSize: '22px', fontWeight: 700 }}>✕</button>
            </div>

            <p style={{ fontSize: '16px', color: 'var(--ink-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              To release the LOTO Lockout Tag from Tool B, formal repair notes and three consecutive verified torque transducer readings (85±2 Nm) must be recorded.
            </p>

            <form onSubmit={handleExecuteVerification} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '15px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Technician Repair Log:
                </label>
                <textarea
                  rows="3"
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(7, 17, 32, 0.2)',
                    fontSize: '15px',
                    fontFamily: 'var(--font-sans)'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '15px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  3-Cycle Test Verification Readings (Spec: 85 ± 2.0 Nm):
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="number"
                    step="0.1"
                    value={testReading1}
                    onChange={(e) => setTestReading1(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(7,17,32,0.2)', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700 }}
                    required
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={testReading2}
                    onChange={(e) => setTestReading2(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(7,17,32,0.2)', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700 }}
                    required
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={testReading3}
                    onChange={(e) => setTestReading3(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(7,17,32,0.2)', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700 }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  style={{ padding: '10px 20px', fontSize: '15px', color: 'var(--ink-secondary)', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 28px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--jade)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '16px',
                    boxShadow: '0 6px 18px rgba(5, 150, 105, 0.4)'
                  }}
                >
                  Confirm &amp; Remove Lockout
                </button>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
