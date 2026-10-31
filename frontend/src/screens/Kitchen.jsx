import React, { useState } from 'react';
import GlassPanel from '../components/GlassPanel';
import TierBlock from '../components/TierBlock';
import StatusBadge from '../components/StatusBadge';
import AuthorChip from '../components/AuthorChip';
import FreshnessStamp from '../components/FreshnessStamp';
import RoleSwitch from '../components/RoleSwitch';
import Logo from '../components/Logo';

export default function Kitchen() {
  const [activeRole, setActiveRole] = useState('Quality');
  const [isStale, setIsStale] = useState(false);

  /* Color swatch helper */
  const Swatch = ({ color, name, children }) => (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '18px',
      padding: '22px', borderRadius: '16px',
      background: 'rgba(255,255,255,0.65)',
      border: `2px solid ${color}22`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px',
        background: color, flexShrink: 0,
        boxShadow: `0 4px 16px ${color}40`,
      }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>{name}</div>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '40px 32px 120px 32px', maxWidth: '1280px', margin: '0 auto' }}>
      <header style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <Logo variant="mark" theme="light" size={48} />
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              Clarity Glass Design System
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--ink-soft)', margin: '4px 0 0 0' }}>
              Interactive showcase of every visual component, material recipe, and trust badge in ToolSathi AI.
            </p>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

        {/* Section 1: Glass Materials */}
        <section>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '18px' }}>
            Glass Panel Materials
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--ink-soft)', marginBottom: '20px' }}>
            Every content container in ToolSathi uses one of three glass recipes. The frosted blur creates depth
            while keeping the manufacturing blueprint pattern visible behind.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <GlassPanel variant="clear" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '17px' }}>Light Glass</span>
                <span style={{
                  fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#FFFFFF',
                  background: 'var(--brand-cyan)', padding: '3px 10px', borderRadius: '20px'
                }}>42% fill</span>
              </div>
              <p style={{ fontSize: '15px', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                Lightest panel with gentle blur. Used for floating controls, tooltips, and ambient overlays that
                let the background show through clearly.
              </p>
            </GlassPanel>

            <GlassPanel variant="strong" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '17px' }}>Standard Glass</span>
                <span style={{
                  fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#FFFFFF',
                  background: 'var(--brand-cyan)', padding: '3px 10px', borderRadius: '20px'
                }}>85% fill</span>
              </div>
              <p style={{ fontSize: '15px', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                Default content panel with specular highlights and ambient shadow. The workhorse panel used for
                cards, data sections, and primary content areas.
              </p>
            </GlassPanel>

            <GlassPanel variant="solid" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '17px' }}>Solid Panel</span>
                <span style={{
                  fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#FFFFFF',
                  background: 'var(--ink-soft)', padding: '3px 10px', borderRadius: '20px'
                }}>94% solid</span>
              </div>
              <p style={{ fontSize: '15px', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                Opaque white panel for data-heavy sections. Removes blur for performance — used in audit ledgers,
                tables, and code inspections.
              </p>
            </GlassPanel>
          </div>
        </section>

        {/* Section 2: Tier Materials — Visual Color System */}
        <section>
          <GlassPanel variant="strong" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
              Certainty Tiers — What the Colors Mean
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--ink-soft)', marginBottom: '28px', lineHeight: 1.6 }}>
              In ToolSathi, color is never decorative — it communicates how much we know about a tool's
              involvement with an assembly. The less evidence we have, the foggier the visual treatment.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <Swatch color="#E0314B" name="Confirmed Exposure">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <TierBlock tier="confirmed" size={32} lifted />
                  <span style={{
                    fontSize: '12px', fontWeight: 700, color: '#E0314B',
                    background: '#E0314B15', padding: '3px 10px', borderRadius: '20px'
                  }}>Ruby</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--ink-soft)', margin: 0 }}>
                  Tool-use records, run data, and batch timestamps are all cryptographically verified.
                  Sharp-edged, crystal-clear glass — no ambiguity.
                </p>
              </Swatch>

              <Swatch color="#F2A100" name="Probable Exposure">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <TierBlock tier="probable" size={32} lifted />
                  <span style={{
                    fontSize: '12px', fontWeight: 700, color: '#F2A100',
                    background: '#F2A10015', padding: '3px 10px', borderRadius: '20px'
                  }}>Saffron</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--ink-soft)', margin: 0 }}>
                  Inferred from workcenter and timestamp overlap. Tool-use log may be missing,
                  but circumstantial evidence is strong. Translucent amber tint.
                </p>
              </Swatch>

              <Swatch color="#7F93AD" name="Unknown — Data Gap">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <TierBlock tier="unknown" size={32} lifted />
                  <span style={{
                    fontSize: '12px', fontWeight: 700, color: '#7F93AD',
                    background: '#7F93AD15', padding: '3px 10px', borderRadius: '20px'
                  }}>Frosted Fog</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--ink-soft)', margin: 0 }}>
                  <strong>Never green, never safe.</strong> Not enough data to determine exposure.
                  Impassable frosted glass with cross-hatch pattern and a question mark.
                </p>
              </Swatch>

              <Swatch color="#CBD5E1" name="Outside Investigation Window">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <TierBlock tier="ghost" size={32} />
                  <span style={{
                    fontSize: '12px', fontWeight: 700, color: '#94A3B8',
                    background: '#94A3B815', padding: '3px 10px', borderRadius: '20px'
                  }}>Ghost</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--ink-soft)', margin: 0 }}>
                  Manufactured outside the current time window being investigated.
                  Faint outline only — lies flat on the production line floor.
                </p>
              </Swatch>
            </div>
          </GlassPanel>
        </section>

        {/* Section 3: Trust Badges & Status */}
        <section>
          <GlassPanel variant="strong" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
              Trust Badges and Decision Provenance
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--ink-soft)', marginBottom: '24px', lineHeight: 1.6 }}>
              Every piece of data in ToolSathi carries a trust marker — is it live, simulated, or planned?
              Every action carries a provenance trail — who proposed it and who approved it?
            </p>

            {/* Status Badges */}
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '14px' }}>Data Status Indicators</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <StatusBadge status="Built" />
                <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Live data</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <StatusBadge status="Simulated" />
                <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Mock/demo data</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <StatusBadge status="Planned" />
                <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Upcoming feature</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <FreshnessStamp timestamp="10:42 AM" isStale={isStale} label={isStale ? "48h old" : "Live"} />
                <button
                  onClick={() => setIsStale(!isStale)}
                  style={{
                    fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '5px 12px',
                    background: 'var(--brand-cyan)', color: '#FFFFFF', borderRadius: '20px',
                    border: 'none', cursor: 'pointer', fontWeight: 600,
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Toggle Freshness
                </button>
              </div>
            </div>

            {/* Author Provenance */}
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '14px' }}>Decision Provenance Chain</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                borderRadius: '14px', background: 'rgba(0, 229, 255, 0.06)',
                border: '1px solid rgba(0, 229, 255, 0.15)'
              }}>
                <AuthorChip type="ai" />
                <span style={{ fontSize: '15px', color: 'var(--ink-soft)' }}>
                  AI proposes an action — strictly pending human review before execution
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                borderRadius: '14px', background: 'rgba(22, 163, 74, 0.06)',
                border: '1px solid rgba(22, 163, 74, 0.15)'
              }}>
                <AuthorChip type="approved" role="Quality Lead (Jamuna)" time="10:46 AM" reason="Lot boundary corroborated" />
                <span style={{ fontSize: '15px', color: 'var(--ink-soft)' }}>
                  Authorized engineer unlocks the material action
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                borderRadius: '14px', background: 'rgba(224, 49, 75, 0.06)',
                border: '1px solid rgba(224, 49, 75, 0.15)'
              }}>
                <AuthorChip type="rejected" reason="Calibration test discrepancy requires re-inspection" />
                <span style={{ fontSize: '15px', color: 'var(--ink-soft)' }}>
                  Proposal rejected — justification recorded to immutable audit trail
                </span>
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* Section 4: Role Switch */}
        <section>
          <GlassPanel variant="strong" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
              Role-Based Access Control
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--ink-soft)', marginBottom: '20px', lineHeight: 1.6 }}>
              Different roles unlock different capabilities. A shop-floor worker can report incidents but cannot
              approve containment. Only a Quality Lead or Plant Manager can authorize material actions.
            </p>
            <div style={{
              padding: '24px', borderRadius: '16px',
              background: 'rgba(0, 229, 255, 0.04)',
              border: '1px solid rgba(0, 229, 255, 0.12)',
              display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap'
            }}>
              <RoleSwitch activeRole={activeRole} onRoleChange={setActiveRole} />
              <div style={{
                padding: '12px 24px', borderRadius: '14px',
                background: 'var(--brand-cyan)', color: '#FFFFFF',
                fontWeight: 700, fontSize: '16px',
                boxShadow: '0 4px 16px rgba(0, 229, 255, 0.3)',
              }}>
                Active: {activeRole}
              </div>
            </div>
          </GlassPanel>
        </section>

      </div>
    </div>
  );
}
