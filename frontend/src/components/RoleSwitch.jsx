import React from 'react';
import { apiConfig } from '../api/api';

const ROLES = [
  {
    id: 'Worker',
    label: 'Assembly Worker',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  },
  {
    id: 'Manager',
    label: 'Plant Manager',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  },
  {
    id: 'Quality',
    label: 'Quality Lead',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    )
  },
  {
    id: 'Technician',
    label: 'Metrology Specialist',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  },
  { id: 'Verifier', label: 'Verifier', icon: null }
];

/**
 * RoleSwitch: Professional industrial authority role selector.
 * Zero emojis - pure crisp SVG vector glyphs.
 */
export default function RoleSwitch({ activeRole = 'Manager', onRoleChange }) {
  return (
    <div role="group" aria-label="Local demo roles"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(14, 26, 47, 0.12)',
        borderRadius: 'var(--radius-pill)',
        boxShadow: '0 4px 14px rgba(14, 26, 47, 0.05)'
      }}
    >
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--ink-soft)',
        padding: '0 10px',
        fontFamily: 'var(--font-mono)'
      }}>
        LOCAL DEMO:
      </span>

      {ROLES.map(role => {
        const isActive = activeRole.toLowerCase() === role.id.toLowerCase();
        return (
          <button
            key={role.id} disabled={!apiConfig.demoMode} aria-pressed={isActive} aria-label={`${role.id} local demo role`}
            onClick={() => onRoleChange && onRoleChange(role.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#FFFFFF' : 'var(--ink)',
              backgroundColor: isActive ? 'var(--cobalt)' : 'transparent',
              boxShadow: isActive ? '0 2px 8px rgba(59, 91, 255, 0.35)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>{role.icon}</span>
            <span>{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}
