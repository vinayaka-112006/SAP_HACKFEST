import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import RoleSwitch from './RoleSwitch';
import Logo from './Logo';
import { useStore } from '../state/store';

/**
 * TopNavbar: Persistent enterprise navigation header rendered across every page.
 * Prominently features the official ToolSathi AI 3D logo, brand identity,
 * active module indicator, and live role switcher.
 */
export default function TopNavbar() {
  const { currentRole, setCurrentRole } = useStore();
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/console':
        return { title: 'Evidence Control Console', code: 'MOD-01', status: 'Live Line Supervised' };
      case '/worker':
        return { title: 'Shop-Floor Intake Terminal', code: 'MOD-02', status: 'Acoustic & QR Active' };
      case '/history':
        return { title: 'Asset Lifecycle & Telemetry', code: 'MOD-03', status: 'Repeat Pattern Monitor' };
      case '/kitchen':
        return { title: 'Clarity Glass Design System', code: 'MOD-04', status: 'Design Token Audit' };
      default:
        return { title: 'Enterprise System Overview', code: 'PORTAL', status: 'Plant 1010 Synchronized' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(246, 250, 255, 0.85) 100%)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderBottom: '1px solid rgba(0, 184, 204, 0.18)',
        boxShadow: '0 4px 24px rgba(7, 17, 32, 0.06), 0 1px 0 rgba(255, 255, 255, 0.95)',
        padding: '12px 32px'
      }}
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand & Logo Section */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            textDecoration: 'none'
          }}
        >
          <Logo variant="lockup" theme="light" size={40} />
        </Link>

        {/* Current Active Page Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 16px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(0, 184, 204, 0.22)',
          boxShadow: '0 2px 10px rgba(7, 17, 32, 0.04), 0 0 14px rgba(0, 229, 255, 0.12)'
        }}>
          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            color: 'var(--brand-cyan-ink)',
            backgroundColor: 'var(--brand-cyan-soft)',
            padding: '2px 7px',
            borderRadius: '4px',
            border: '1px solid rgba(0, 184, 204, 0.25)'
          }}>
            {pageInfo.code}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
            {pageInfo.title}
          </span>
          <span 
            className="animate-badge-ping"
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--jade)',
              boxShadow: '0 0 8px var(--jade)'
            }} 
          />
        </div>

        {/* Persona Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RoleSwitch activeRole={currentRole} onRoleChange={setCurrentRole} />
        </div>
      </div>
    </header>
  );
}
