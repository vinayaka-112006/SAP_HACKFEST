import React from 'react';

/**
 * AuthorChip: Transparent provenance stamp for actions and proposals.
 * - 'ai': Cobalt "AI proposed"
 * - 'approved': Jade "Approved by <role>, <time>, <reason>"
 * - 'rejected': Ruby "Rejected: <reason>"
 */
export default function AuthorChip({
  type = 'ai',
  role = 'Quality Manager',
  time = '10:48 AM',
  reason = 'Trace boundary verified',
  className = ''
}) {
  const norm = (type || '').toLowerCase();

  let bg = 'rgba(59, 91, 255, 0.1)';
  let border = 'rgba(59, 91, 255, 0.35)';
  let color = 'var(--cobalt-ink)';
  let icon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
  let text = 'AI proposed';

  if (norm === 'approved') {
    bg = 'rgba(14, 163, 122, 0.12)';
    border = 'rgba(14, 163, 122, 0.4)';
    color = 'var(--jade-ink)';
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
      </svg>
    );
    text = `Approved by ${role} • ${time}${reason ? ` (${reason})` : ''}`;
  } else if (norm === 'rejected') {
    bg = 'rgba(224, 49, 75, 0.1)';
    border = 'rgba(224, 49, 75, 0.35)';
    color = 'var(--ruby-ink)';
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
    text = `Rejected: ${reason || 'Denied by policy'}`;
  }

  return (
    <span
      className={`author-chip ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        borderRadius: 'var(--radius-pill)',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: color,
        whiteSpace: 'normal',
        wordBreak: 'break-word'
      }}
    >
      {icon}
      <span>{text}</span>
    </span>
  );
}
