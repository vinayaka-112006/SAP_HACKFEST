import React from 'react';
import GlassPanel from '../../components/GlassPanel';
import StatusBadge from '../../components/StatusBadge';
import FreshnessStamp from '../../components/FreshnessStamp';

/**
 * EvidenceDrawer: Slide-out glass drawer answering "Why is this included?"
 * Provides complete deterministic audit provenance for an individual unit.
 */
export default function EvidenceDrawer({ unit, onClose }) {
  if (!unit) return null;

  const isUnknown = unit.tier === 'Unknown';
  const isProbable = unit.tier === 'Probable';
  const isConfirmed = unit.tier === 'Confirmed';

  return (
    <div role="dialog" aria-label="Unit evidence"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(480px, 92vw)',
        zIndex: 200,
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(14, 26, 47, 0.25)',
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <GlassPanel
        variant="strong"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--cobalt-ink)',
                backgroundColor: 'var(--cobalt-soft)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--font-mono)'
              }}>
                Unit Evidence Dossier
              </span>
              <StatusBadge status="Built" size="small" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
              {unit.unitId}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              Serial: <strong style={{ fontFamily: 'var(--font-mono)' }}>{unit.serial}</strong>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(14, 26, 47, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: 'var(--ink)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tier Status Banner */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isConfirmed ? 'var(--ruby-soft)' : isProbable ? 'var(--saffron-soft)' : 'var(--frost-soft)',
          border: `1px solid ${isConfirmed ? 'var(--ruby)' : isProbable ? 'var(--saffron)' : 'var(--frost)'}`,
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{
              fontWeight: 700,
              fontSize: '14px',
              color: isConfirmed ? 'var(--ruby-ink)' : isProbable ? 'var(--saffron-ink)' : 'var(--frost-ink)'
            }}>
              Tier: {unit.tier} Association
            </span>
            <FreshnessStamp timestamp={unit.snapshotTime ? new Date(unit.snapshotTime).toLocaleString() : 'Not supplied'} isStale={unit.flags?.includes('STALE')} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
            {unit.tierLabel}: {unit.tierReason}

          </div>
        </div>

        {/* Warning Flags */}
        {unit.warnings && unit.warnings.length > 0 && (
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(242, 161, 0, 0.12)',
            border: '1px solid rgba(242, 161, 0, 0.4)',
            marginBottom: '20px'
          }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--saffron-ink)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span>Record warning (status may be uncertain)</span>
            </div>
            {unit.warnings.map((w, idx) => (
              <div key={idx} style={{ fontSize: '12px', color: 'var(--ink)', lineHeight: 1.4 }}>
                • {w}
              </div>
            ))}
          </div>
        )}

        {/* Provenance Metadata Table */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(14, 26, 47, 0.08)',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Investigated tool:</span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{unit.toolId}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Current Location:</span>
            <strong style={{ color: 'var(--ink)' }}>{unit.location}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Run ID:</span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{unit.runId}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Batch Genealogy:</span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{unit.batchId}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Tool Use Event ID:</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: unit.toolUseEventId ? 'var(--ink)' : 'var(--ruby-ink)'
            }}>
              {unit.toolUseEventId || 'NULL (Missing Record)'}
            </span>
          </div>


        </div>

        {/* Evidence Chain IDs */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
            Linked Trace Evidence Identifiers
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {unit.evidenceIds.map(evId => (
              <span
                key={evId}
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 8px',
                  backgroundColor: 'rgba(14, 26, 47, 0.06)',
                  borderRadius: '4px',
                  border: '1px solid rgba(14, 26, 47, 0.1)'
                }}
              >
                {evId}
              </span>
            ))}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
