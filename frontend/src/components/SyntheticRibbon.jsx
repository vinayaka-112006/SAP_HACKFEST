import React from 'react';

/**
 * Enterprise Production Status Ribbon
 * Professional industrial system header indicating plant connectivity and line telemetry.
 */
export default function SyntheticRibbon() {
  return (
    <aside
      aria-label="Enterprise system telemetry status"
      style={{
        width: '100%',
        background: '#0B132B',
        color: '#E2E8F0',
        padding: '6px 24px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-mono)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        position: 'relative',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          display: 'inline-block',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: 'var(--jade)',
          boxShadow: '0 0 8px var(--jade)'
        }} />
        <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
          TOOLSATHI ENTERPRISE MANUFACTURING CLOUD
        </span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span style={{ color: '#94A3B8' }}>
          SAP S/4HANA QM &amp; DIGITAL MANUFACTURING LINK ACTIVE
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#94A3B8' }}>
        <span>PLANT 1010 • LINE 03 (BRAKE SAFETY)</span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span style={{ color: '#38BDF8', fontWeight: 700 }}>300 ACTIVE ASY TRACE NODES</span>
      </div>
    </aside>
  );
}
