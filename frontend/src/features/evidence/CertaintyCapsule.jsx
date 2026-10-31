import React from 'react';
import GlassPanel from '../../components/GlassPanel';
import StatusBadge from '../../components/StatusBadge';
import FreshnessStamp from '../../components/FreshnessStamp';

/**
 * CertaintyCapsule: signature transparency strip.
 * Large, high-visibility projector-grade scale.
 * Never shows a solitary terrifying number. Breaks down:
 * - "100 potentially exposed" (NEVER "defective")
 * - 90 record-linked (Ruby)
 * - 4 probable (Saffron)
 * - 6 cannot be determined (Frosted fog, never green)
 * - Window range: 35 to 160
 * - Data Quality Score: 91%
 */
export default function CertaintyCapsule({
  totalExposed = 100,
  confirmedCount = 90,
  probableCount = 4,
  unknownCount = 6,
  windowHours = 72,
  qualityScore = 91,
  onOpenGaps
}) {
  const confirmedPct = (confirmedCount / totalExposed) * 100;
  const probablePct = (probableCount / totalExposed) * 100;
  const unknownPct = (unknownCount / totalExposed) * 100;

  return (
    <GlassPanel variant="strong" style={{ padding: '24px 28px', width: '100%' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '18px',
        marginBottom: '18px'
      }}>
        {/* Main Headline */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: 'var(--ruby-soft)',
              color: 'var(--ruby-ink)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <h2 style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--ink)' }}>
              {totalExposed} Assemblies Potentially Exposed
            </h2>
            <StatusBadge status="Verified" size="medium" />
          </div>
          <div style={{ fontSize: '16px', color: 'var(--ink-secondary)', marginTop: '6px', fontWeight: 500 }}>
            Investigation Boundary: <strong style={{ color: 'var(--ink)', fontSize: '17px' }}>{windowHours} Hours</strong> • Exposure Range Across Horizons: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '17px' }}>35 to 160 units</strong>
          </div>
        </div>

        {/* Quality Score & Freshness */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <FreshnessStamp timestamp="10:42 AM" />
          
          <div
            style={{
              padding: '8px 18px',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(7, 17, 32, 0.12)',
              borderRadius: 'var(--radius-pill)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(7, 17, 32, 0.04)'
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-soft)' }}>
              Data Quality:
            </span>
            <span style={{
              fontSize: '18px',
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              color: qualityScore >= 90 ? 'var(--jade-ink)' : 'var(--saffron-ink)'
            }}>
              {qualityScore}%
            </span>
            <button
              onClick={onOpenGaps}
              style={{
                fontSize: '13px',
                color: 'var(--brand-cyan-ink)',
                textDecoration: 'underline',
                fontWeight: 700
              }}
            >
              Why?
            </button>
          </div>
        </div>
      </div>

      {/* The Multi-Segment Certainty Strip */}
      <div style={{
        height: '16px',
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        backgroundColor: '#CBD5E1',
        boxShadow: 'inset 0 1px 3px rgba(7, 17, 32, 0.18)',
        marginBottom: '16px'
      }}>
        {/* Confirmed Segment (Ruby) */}
        <div
          title={`${confirmedCount} Record-Linked (Confirmed)`}
          style={{
            width: `${confirmedPct}%`,
            backgroundColor: 'var(--ruby)',
            transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        />
        {/* Probable Segment (Saffron) */}
        <div
          title={`${probableCount} Probable`}
          style={{
            width: `${probablePct}%`,
            backgroundColor: 'var(--saffron)',
            transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        />
        {/* Unknown Segment (Frosted Fog with Hatch) */}
        <div
          title={`${unknownCount} Cannot be Determined (Missing Records)`}
          style={{
            width: `${unknownPct}%`,
            backgroundColor: 'var(--frost)',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(51, 65, 85, 0.4), rgba(51, 65, 85, 0.4) 4px, transparent 4px, transparent 8px)',
            transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        />
      </div>

      {/* Segment Legend with Count + Percentage */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '16px',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Confirmed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '14px',
              height: '14px',
              borderRadius: '4px',
              backgroundColor: 'var(--ruby)'
            }} />
            <span>
              <strong style={{ color: 'var(--ruby-ink)', fontSize: '18px' }}>{confirmedCount}</strong> Record-Linked (Confirmed)
            </span>
          </div>

          {/* Probable */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '14px',
              height: '14px',
              borderRadius: '4px',
              backgroundColor: 'var(--saffron)'
            }} />
            <span>
              <strong style={{ color: 'var(--saffron-ink)', fontSize: '18px' }}>{probableCount}</strong> Probable Association
            </span>
          </div>

          {/* Unknown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '14px',
              height: '14px',
              borderRadius: '4px',
              backgroundColor: 'var(--frost)',
              backgroundImage: 'repeating-linear-gradient(45deg, #334155, #334155 2px, transparent 2px, transparent 4px)'
            }} />
            <span>
              <strong style={{ color: 'var(--frost-ink)', fontSize: '18px' }}>{unknownCount}</strong> Cannot be Determined (Data Gap)
            </span>
          </div>
        </div>

        <div style={{ fontSize: '14px', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
          *Software identifies exposure paths; human inspector verifies defect.
        </div>
      </div>
    </GlassPanel>
  );
}
