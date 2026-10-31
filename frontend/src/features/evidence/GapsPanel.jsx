import React from 'react';
import GlassPanel from '../../components/GlassPanel';

/**
 * GapsPanel: Lists evidence gaps and integrity anomalies weakening the trace.
 * Clean enterprise engineering interface with zero emojis.
 */
export default function GapsPanel({ onSelectUnit, onClose }) {
  const gaps = [
    {
      id: 'gap-1',
      title: 'Missing Tool-Use Telemetry (6 Units)',
      severity: 'high',
      badge: 'Unknown Tier • 6 Units',
      description: 'Run #402 produced 6 units without automated torque-logger handshake. Classified as Unknown (cannot be determined). Never styled as safe.',
      unitIds: ['TS-BRK-0095', 'TS-BRK-0096', 'TS-BRK-0097', 'TS-BRK-0098', 'TS-BRK-0099', 'TS-BRK-0100']
    },
    {
      id: 'gap-2',
      title: 'Stale Shipment Snapshot (Dealer Y Consignment)',
      severity: 'medium',
      badge: 'Stale Snapshot • 1 Unit',
      description: 'Shipment dispatched to Dealer Y (Hubballi) lacks automated GPS/dock receipt for 48 hours. Inventory snapshot timestamp is stale.',
      unitIds: ['TS-BRK-0085']
    },
    {
      id: 'gap-3',
      title: 'Conflicting Run Timestamps (Run #398)',
      severity: 'medium',
      badge: 'Data Integrity Flag',
      description: 'Recorded run end time (08:30) precedes start time (09:00). Flagged for MES system clock drift investigation.',
      unitIds: ['TS-BRK-0023']
    }
  ];

  return (
    <GlassPanel variant="strong" style={{ padding: '24px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: 'rgba(59, 91, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cobalt-ink)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
            Data Integrity Gaps &amp; Quality Explanations
          </h3>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'rgba(242, 161, 0, 0.15)',
            color: 'var(--saffron-ink)',
            fontWeight: 700
          }}>
            3 Findings
          </span>
        </div>

        {onClose && (
          <button onClick={onClose} style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>
            Close ✕
          </button>
        )}
      </div>

      <p style={{ fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '18px' }}>
        ToolSathi flags missing records and telemetry gaps explicitly to prevent silent algorithmic false-negatives.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {gaps.map(gap => (
          <div
            key={gap.id}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(14, 26, 47, 0.1)',
              boxShadow: '0 2px 6px rgba(14, 26, 47, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>
                {gap.title}
              </div>
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: gap.severity === 'high' ? 'var(--frost-soft)' : 'var(--saffron-soft)',
                color: gap.severity === 'high' ? 'var(--frost-ink)' : 'var(--saffron-ink)'
              }}>
                {gap.badge}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '10px', lineHeight: 1.4 }}>
              {gap.description}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                Exposed Unit IDs:
              </span>
              {gap.unitIds.map(uid => (
                <button
                  key={uid}
                  onClick={() => onSelectUnit && onSelectUnit(uid)}
                  title="Click to view evidence drawer"
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(59, 91, 255, 0.1)',
                    color: 'var(--cobalt-ink)',
                    border: '1px solid rgba(59, 91, 255, 0.25)',
                    fontWeight: 600
                  }}
                >
                  {uid}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
