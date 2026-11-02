import React from 'react';

/**
 * InterlockGate: Double glass doors with a physical padlock.
 * Visualizes the autonomy ladder and human-in-the-loop barrier.
 * Approving rotates doors open via 3D transform (rotateY).
 * Pure vector SVG padlocks, zero emojis.
 */
export default function InterlockGate({
  isOpen = false,
  status = 'Pending',
  requiredRole = 'Manager',
  onUnlockClick
}) {
  return (
    <div
      style={{
        position: 'relative',
        height: '48px',
        width: '100%',
        perspective: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '12px 0',
        overflow: 'hidden'
      }}
    >
      {/* Underlying Passageway Channel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isOpen ? 'rgba(14, 163, 122, 0.08)' : 'rgba(59, 91, 255, 0.05)',
          borderRadius: '10px',
          border: `1px dashed ${isOpen ? 'rgba(14, 163, 122, 0.35)' : 'rgba(59, 91, 255, 0.25)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isOpen && (
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--jade-ink)',
            letterSpacing: '0.04em'
          }}>
            HUMAN APPROVAL RECORDED | SIMULATED ACTION
          </span>
        )}
      </div>

      {/* Left Glass Door */}
      <div
        className={`interlock-door-left ${isOpen ? 'open' : ''}`}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '50%',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          borderRight: '1px solid rgba(14, 26, 47, 0.2)',
          borderRadius: '10px 0 0 10px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9), 2px 0 8px rgba(14, 26, 47, 0.06)',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '12px'
        }}
      >
        <span style={{
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: 'var(--ink-soft)',
          textTransform: 'uppercase'
        }}>
          Safety Gate L
        </span>
      </div>

      {/* Right Glass Door */}
      <div
        className={`interlock-door-right ${isOpen ? 'open' : ''}`}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '50%',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          borderLeft: '1px solid rgba(14, 26, 47, 0.2)',
          borderRadius: '0 10px 10px 0',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9), -2px 0 8px rgba(14, 26, 47, 0.06)',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: '12px'
        }}
      >
        <span style={{
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: 'var(--ink-soft)',
          textTransform: 'uppercase'
        }}>
          Safety Gate R
        </span>
      </div>

      {/* Central Padlock / Interlock Latch */}
      <div
        style={{
          position: 'absolute',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '5px 14px',
          borderRadius: 'var(--radius-pill)',
          background: isOpen ? 'var(--jade)' : '#0E1A2F',
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          boxShadow: '0 4px 14px rgba(14, 26, 47, 0.25)',
          transition: 'all 0.3s ease',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)'
        }}
      >
        {isOpen ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
        <span>{isOpen ? 'UNLOCKED' : `LOCKED (Requires ${requiredRole})`}</span>
      </div>
    </div>
  );
}
