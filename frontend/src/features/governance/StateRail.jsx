import React from 'react';

const STATES = [
  'Reported',
  'Confirmed',
  'Under review',
  'Containment proposed',
  'Approved',
  'Repairing',
  'Awaiting verification',
  'Closed'
];

/**
 * StateRail: Industrial state machine progression.
 * Visualizes the incident lifecycle from intake to verified closure.
 */
export default function StateRail({ currentState = 'Under review' }) {
  const currentIndex = STATES.findIndex(s => s.toLowerCase() === (currentState || '').toLowerCase());
  const activeIdx = currentIndex >= 0 ? currentIndex : 2;

  return (
    <nav
      aria-label="Incident progression status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        padding: '6px 4px',
        maxWidth: '100%',
        scrollbarWidth: 'none'
      }}
    >
      {STATES.map((state, idx) => {
        const isPast = idx < activeIdx;
        const isCurrent = idx === activeIdx;

        return (
          <React.Fragment key={state}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: isCurrent ? 700 : 500,
                color: isCurrent ? '#FFFFFF' : isPast ? 'var(--jade-ink)' : 'var(--ink-soft)',
                backgroundColor: isCurrent
                  ? 'var(--cobalt)'
                  : isPast
                    ? 'rgba(14, 163, 122, 0.12)'
                    : 'rgba(14, 26, 47, 0.05)',
                border: isCurrent
                  ? '1px solid var(--cobalt)'
                  : isPast
                    ? '1px solid rgba(14, 163, 122, 0.3)'
                    : '1px solid rgba(14, 26, 47, 0.1)',
                whiteSpace: 'nowrap'
              }}
            >
              {isPast && <span>✓</span>}
              {isCurrent && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: '0 0 6px #FFFFFF'
                }} />
              )}
              <span>{state}</span>
            </div>

            {idx < STATES.length - 1 && (
              <span style={{ color: 'rgba(14, 26, 47, 0.25)', fontSize: '11px' }}>
                →
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
