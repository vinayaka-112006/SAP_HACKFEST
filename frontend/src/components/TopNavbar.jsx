import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import RoleSwitch from './RoleSwitch';
import { useStore } from '../state/store';

/**
 * TopNavbar: Persistent enterprise navigation header rendered across every page.
 * Prominently features the official ToolSathi AI 3D logo, brand identity,
 * active module indicator, and live role switcher.
 */
export default function TopNavbar() {
  const { currentRole, setCurrentRole, demoUserId, setDemoUserId, apiConfig } = useStore();
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/console':
        return { title: 'Evidence Control Console', code: 'MOD-01', status: 'Backend Evidence Records' };
      case '/worker':
        return { title: 'Shop-Floor Intake Terminal', code: 'MOD-02', status: 'Typed & Manual Tool Intake' };
      case '/history':
        return { title: 'Asset Lifecycle & Telemetry', code: 'MOD-03', status: 'Stored Tool History' };
      case '/kitchen':
        return { title: 'Clarity Glass Design System', code: 'MOD-04', status: 'Design Token Audit' };
      default:
        return { title: 'Enterprise System Overview', code: 'PORTAL', status: 'Synthetic Manufacturing Demo' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="top-navbar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderBottom: '1px solid rgba(7, 17, 32, 0.1)',
        boxShadow: '0 4px 20px rgba(7, 17, 32, 0.05)',
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
          {/* Official ToolSathi AI Logo with subtle glow */}
          <div style={{
            position: 'relative',
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            padding: '2px',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.6) 0%, rgba(10, 182, 255, 0.4) 100%)',
            boxShadow: '0 4px 16px rgba(0, 194, 203, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden'
          }}>
            <img
              src="/assets/toolsathi_logo.png"
              alt="ToolSathi AI Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: 'var(--ink)'
              }}>
                ToolSathi <span style={{
                  background: 'var(--brand-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 900
                }}>AI</span>
              </span>
              <span style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--brand-cyan-ink)',
                backgroundColor: 'var(--brand-cyan-soft)',
                border: '1px solid rgba(0, 184, 204, 0.3)',
                padding: '2px 7px',
                borderRadius: '6px'
              }}>
                ENTERPRISE
              </span>
            </div>

            <div style={{
              fontSize: '12px',
              color: 'var(--ink-muted)',
              fontWeight: 500,
              letterSpacing: '-0.01em'
            }}>
              Human-reviewed incidents &amp; deterministic traceability
            </div>
          </div>
        </Link>

        {/* Current Active Page Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 16px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'rgba(7, 17, 32, 0.04)',
          border: '1px solid rgba(7, 17, 32, 0.08)'
        }}>
          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--ink-muted)',
            backgroundColor: 'rgba(7, 17, 32, 0.08)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {pageInfo.code}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
            {pageInfo.title}
          </span>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--jade)',
            boxShadow: '0 0 6px var(--jade)'
          }} />
        </div>

        {/* Persona Role Switcher */}
        <div className="persona-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RoleSwitch activeRole={currentRole} onRoleChange={setCurrentRole} />
          {apiConfig.demoMode&&<label className="demo-identity">Local demo user ID <input aria-label="Local demo user ID" value={demoUserId} onChange={event=>setDemoUserId(event.target.value)} maxLength={120} /></label>}
        </div>
      </div>
    </header>
  );
}
