import React, { useState } from 'react';
import GlassPanel from '../../components/GlassPanel';
import StatusBadge from '../../components/StatusBadge';

/**
 * DuplicatePrompt: "Possible duplicate of TS-0001: merge or keep separate?"
 * Shows both incident reports side-by-side in their original languages with translations.
 * Zero emojis - pure crisp SVG indicators.
 */
export default function DuplicatePrompt({ onDecision, isDecided = false }) {
  const [justification, setJustification] = useState('');
  const [decisionMade, setDecisionMade] = useState(isDecided);

  const handleAction = (decision) => {
    setDecisionMade(true);
    if (onDecision) {
      onDecision(decision, justification || `Operator chose to ${decision} based on tool telemetry comparison`);
    }
  };

  return (
    <GlassPanel
      variant="strong"
      style={{
        padding: '24px',
        border: '1px solid rgba(242, 161, 0, 0.4)',
        backgroundColor: 'rgba(255, 255, 255, 0.94)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: 'rgba(242, 161, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--saffron-ink)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                Duplicate Incident Correlation Gate
              </h3>
              <StatusBadge status="Built" size="small" />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              Correlation Score: <strong>94% Semantic Overlap</strong> • Tool B • Line 3
            </div>
          </div>
        </div>

        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'rgba(242, 161, 0, 0.15)',
          color: 'var(--saffron-ink)',
          border: '1px solid rgba(242, 161, 0, 0.3)'
        }}>
          DECISION REQUIRED
        </span>
      </div>

      <p style={{ fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '18px' }}>
        A secondary worker report was submitted 1 hour 48 minutes after TS-0001 on the same tool.
        Should this case be merged into TS-0001 or kept as an independent deviation?
      </p>

      {/* Side-by-Side Multilingual Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Incident 1: TS-0001 (Kannada) */}
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: '#F8FAFC',
          border: '1px solid rgba(14, 26, 47, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>TS-0001 (10:42 AM)</strong>
            <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Basavaraj K. (ಕನ್ನಡ)</span>
          </div>
          <div style={{ fontSize: '15px', color: 'var(--ink)', fontFamily: 'var(--font-kannada)', marginBottom: '6px' }}>
            "ಟೂಲ್ ಬಿ ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿ ಬಿಡುತ್ತಿದೆ, ಟಾರ್ಕ್ ಸರಿಯಾಗಿ ಹಿಡಿಯುತ್ತಿಲ್ಲ"
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
            Translated: "Tool B is leaving bolts loose; torque is not gripping properly"
          </div>
        </div>

        {/* Incident 2: TS-0002 (Hindi) */}
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: '#F8FAFC',
          border: '1px solid rgba(14, 26, 47, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>TS-0002 (12:30 PM)</strong>
            <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Ramesh N. (हिन्दी)</span>
          </div>
          <div style={{ fontSize: '15px', color: 'var(--ink)', fontFamily: 'var(--font-devanagari)', marginBottom: '6px' }}>
            "टूल बी नट कसने में झटके दे रहा है और स्लिप हो रहा है"
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
            Translated: "Tool B is jerking while tightening nuts and slipping"
          </div>
        </div>
      </div>

      {!decisionMade ? (
        <div>
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="Enter optional justification note for audit trail..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(14, 26, 47, 0.15)',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleAction('separate')}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid rgba(14, 26, 47, 0.2)',
                backgroundColor: '#FFFFFF',
                color: 'var(--ink)',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              Keep Separate (Independent Root Cause)
            </button>

            <button
              onClick={() => handleAction('merge')}
              style={{
                padding: '8px 22px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--cobalt)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(59, 91, 255, 0.35)'
              }}
            >
              Merge into TS-0001 Case
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(14, 163, 122, 0.1)',
          color: 'var(--jade-ink)',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Decision recorded in tamper-evident audit ledger. Case correlation preserved.</span>
        </div>
      )}
    </GlassPanel>
  );
}
