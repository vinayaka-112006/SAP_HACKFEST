import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Dock: Sleek industrial control room floating navigation dock.
 * Crisp SVG vectors, zero emojis, pure Clarity Glass aesthetics.
 */
export default function Dock() {
  const navItems = [
    {
      to: '/',
      label: 'System Overview',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    },
    {
      to: '/console',
      label: 'Evidence Control Console',
      badge: 'Live Yard',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      )
    },
    {
      to: '/worker',
      label: 'Shop-Floor Terminal',
      badge: 'Mobile',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
        </svg>
      )
    },
    {
      to: '/history',
      label: 'Asset Lifecycle & Telemetry',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
      )
    },
    {
      to: '/kitchen',
      label: 'Design System & Tokens',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 19 8.5 12 15 5 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="15" />
        </svg>
      )
    }
  ];

  return (
    <nav
      aria-label="Enterprise system navigation dock"
      style={{
        position: 'fixed',
        bottom: '22px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(26px) saturate(170%)',
        WebkitBackdropFilter: 'blur(26px) saturate(170%)',
        border: '1px solid rgba(255, 255, 255, 0.95)',
        borderRadius: 'var(--radius-pill)',
        boxShadow: '0 20px 48px rgba(14, 26, 47, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.95)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 12px 0 6px',
        borderRight: '1px solid rgba(14, 26, 47, 0.12)'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, var(--cobalt) 0%, #1E38C4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: 900,
          fontFamily: 'var(--font-mono)'
        }}>
          TS
        </div>
        <span style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          ToolSathi
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 15px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#FFFFFF' : 'var(--ink)',
              backgroundColor: isActive ? 'var(--ink)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              whiteSpace: 'nowrap'
            })}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge && (
              <span style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '6px',
                background: 'rgba(59, 91, 255, 0.14)',
                color: 'var(--cobalt-ink)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
