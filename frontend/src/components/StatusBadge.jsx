import React from 'react';

/**
 * StatusBadge: Enterprise system provenance badge.
 * Provides transparent verification labels with crisp SVG icons.
 */
export default function StatusBadge({ status = 'Verified', size = 'medium', className = '' }) {
  const norm = (status || '').toLowerCase();

  let label = 'Backend Records';
  let bg = 'rgba(14, 163, 122, 0.12)';
  let border = 'rgba(14, 163, 122, 0.35)';
  let color = 'var(--jade-ink)';
  let icon = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  if (norm.includes('sim') || norm.includes('sap')) {
    label = 'SIMULATED';
    bg = 'rgba(59, 91, 255, 0.12)';
    border = 'rgba(59, 91, 255, 0.35)';
    color = 'var(--cobalt-ink)';
    icon = (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    );
  } else if (norm.includes('plan') || norm.includes('road')) {
    label = 'Roadmap Extension';
    bg = 'rgba(127, 147, 173, 0.16)';
    border = 'rgba(127, 147, 173, 0.4)';
    color = 'var(--frost-ink)';
    icon = (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }

  const isSmall = size === 'small';

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        borderRadius: 'var(--radius-pill)',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: color,
        whiteSpace: 'nowrap',
        userSelect: 'none'
      }}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
