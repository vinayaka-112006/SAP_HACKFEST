import React from 'react';
import GlassPanel from '../../components/GlassPanel';
import StatusBadge from '../../components/StatusBadge';

/**
 * AuditLedger: Immutable append-only audit trail.
 * Displays actor, action, timestamps, model versions, and justification reasons.
 * Professional industrial interface with zero emojis.
 */
export default function AuditLedger({ auditLog = [] }) {
  return (
    <GlassPanel variant="solid" style={{ padding: '24px', width: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(14, 26, 47, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                Application Audit History
              </h3>
              <StatusBadge status="Built" size="small" />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
              Read-only Application History • {auditLog.length} Stored Records
            </div>
          </div>
        </div>

        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          padding: '3px 10px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'rgba(14, 163, 122, 0.12)',
          color: 'var(--jade-ink)',
          border: '1px solid rgba(14, 163, 122, 0.3)'
        }}>
          APPEND-ONLY APPLICATION HISTORY
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!auditLog.length&&<p>No audit entries returned.</p>}
        {auditLog.map(entry => (
          <div
            key={entry.auditId}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(14, 26, 47, 0.09)',
              boxShadow: '0 2px 4px rgba(14, 26, 47, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--cobalt-ink)'
                }}>
                  {entry.auditId}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(14, 26, 47, 0.08)',
                  color: 'var(--ink)'
                }}>
                  {entry.action}
                </span>
              </div>

              <span style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.4, margin: 0 }}>
              {entry.reason}
            </p>
            <details><summary>Event details</summary><pre>{JSON.stringify(entry.details,null,2)}</pre></details>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
              <span>Operator / Authority: <strong style={{ color: 'var(--ink)' }}>{entry.actor}</strong> ({entry.actorRole})</span>
              <span>Subsystem: {entry.modelVersion || 'No model supplied'}</span>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
