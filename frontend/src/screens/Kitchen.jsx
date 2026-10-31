import React, { useState } from 'react';
import GlassPanel from '../components/GlassPanel';
import TierBlock from '../components/TierBlock';
import StatusBadge from '../components/StatusBadge';
import AuthorChip from '../components/AuthorChip';
import FreshnessStamp from '../components/FreshnessStamp';
import RoleSwitch from '../components/RoleSwitch';

export default function Kitchen() {
  const [activeRole, setActiveRole] = useState('Quality');
  const [isStale, setIsStale] = useState(false);

  return (
    <div style={{ padding: '40px 32px 120px 32px', maxWidth: '1280px', margin: '0 auto' }}>
      <header style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Design System Kitchen Sink
          </h1>
          <StatusBadge status="Built" />
        </div>
        <p style={{ fontSize: '16px', color: 'var(--ink-soft)' }}>
          Visual examples only; not incident records, approvals or real SAP execution.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Section 1: Glass Materials */}
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>1. Glass Panel Material Recipes</span>
            <span style={{ fontSize: '13px', color: 'var(--ink-soft)', fontWeight: 400 }}>(Max 6 backdrop filters per screen)</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <GlassPanel variant="clear" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>variant="clear"</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>42% Glass Fill</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                Lightest refractive pane with 16px blur. Used for ambient foreground overlays and floating controls.
              </p>
            </GlassPanel>

            <GlassPanel variant="strong" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>variant="strong" (Default)</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>85% Glass Fill</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                Standard content panel with specular highlight, 20px blur, and long ambient shadow.
              </p>
            </GlassPanel>

            <GlassPanel variant="solid" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>variant="solid"</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>94% Solid White</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
                Zero backdrop-filter overhead. Used for dense audit ledgers, code inspections, and high-volume data tables.
              </p>
            </GlassPanel>
          </div>
        </section>

        {/* Section 2: Tier Blocks & Optical Uncertainty */}
        <section>
          <GlassPanel variant="strong" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>
              2. Tier Materials: Optical Uncertainty
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ink-soft)', marginBottom: '24px' }}>
              "The less we know, the foggier the glass." Uncertainty is expressed by material physics, not color alone.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(224, 49, 75, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                  <TierBlock tier="confirmed" size={44} lifted />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--ruby-ink)' }}>Confirmed Association</div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>#E0314B (Ruby)</div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                  Crisp, sharp-edged facet glass. Used exclusively when tool-use, run, and batch records have a direct valid association.
                </p>
              </div>

              <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(242, 161, 0, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                  <TierBlock tier="probable" size={44} lifted />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--saffron-ink)' }}>Probable Association</div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>#F2A100 (Saffron)</div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                  Translucent tinted amber. An explicit tool-use link has a missing end or conflicting timestamps. Missing tool-use records remain Unknown.
                </p>
              </div>

              <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(127, 147, 173, 0.35)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                  <TierBlock tier="unknown" size={44} lifted />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--frost-ink)' }}>Unknown (Data Gap)</div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>#7F93AD (Frosted Fog)</div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                  <strong>Never green, never safe.</strong> Impassable frosted glass with diagonal cross-hatch and a question mark.
                </p>
              </div>

              <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.5)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed rgba(14, 26, 47, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                  <TierBlock tier="ghost" size={44} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Outside Window</div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>Faint Ghost Outline</div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                  Units manufactured outside current investigation lens; lies flat on the line floor.
                </p>
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* Section 3: Trust Badges & Honesty Rails */}
        <section>
          <GlassPanel variant="strong" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
              3. Trust Badges &amp; Status Stamps
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              <StatusBadge status="Built" />
              <StatusBadge status="Simulated" />
              <StatusBadge status="Planned" />
              <FreshnessStamp timestamp="10:42 AM" isStale={isStale} label={isStale ? "48h old" : "Live"} />
              <button
                onClick={() => setIsStale(!isStale)}
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 8px',
                  background: 'rgba(14,26,47,0.06)',
                  borderRadius: '6px'
                }}
              >
                Toggle Stale State
              </button>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              Author Provenance Chips (AI vs. Human Approval)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <AuthorChip type="ai" />
                <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--ink-soft)' }}>
                  System proposes action; strictly pending authorized review
                </span>
              </div>
              <div>
                <AuthorChip type="approved" role="Quality Lead (Jamuna)" time="10:46 AM" reason="Lot boundary corroborated" />
                <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--ink-soft)' }}>
                  Material action unlocked by a named certified engineer
                </span>
              </div>
              <div>
                <AuthorChip type="rejected" reason="Calibration test discrepancy requires re-inspection" />
                <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--ink-soft)' }}>
                  Proposal rejected with explicit justification recorded to audit trail
                </span>
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* Section 4: Interactive Role Switch */}
        <section>
          <GlassPanel variant="strong" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
              4. Role Switch Control
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ink-soft)', marginBottom: '16px' }}>
              Enforces the autonomy ladder. Different roles unlock distinct interlock gates.
            </p>
            <RoleSwitch activeRole={activeRole} onRoleChange={setActiveRole} />
            <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--ink)' }}>
              Current Active Persona: <strong>{activeRole}</strong>
            </div>
          </GlassPanel>
        </section>
      </div>
    </div>
  );
}
