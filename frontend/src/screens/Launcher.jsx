import React from 'react';
import { Link } from 'react-router-dom';
import GlassPanel from '../components/GlassPanel';
import StatusBadge from '../components/StatusBadge';
import RoleSwitch from '../components/RoleSwitch';
import { useStore } from '../state/store';

export default function Launcher() {
  const { currentRole, setCurrentRole } = useStore();

  const portals = [
    {
      to: '/console',
      title: 'Evidence Control Console',
      badge: 'Hero Supervision',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
      highlight: '3D Isometric Evidence Yard & Destination Vessels',
      description: 'Supervise 300 assemblies in true isometric 3D space. Dynamic 24h (35 units), 72h (100 units), and 7d (160 units) investigation window scrubbers with volumetric allocation across Plant Stock, Dealer X, and Dealer Y.',
      cta: 'Launch Evidence Console →'
    },
    {
      to: '/worker',
      title: 'Shop-Floor Intake Terminal',
      badge: 'Operator Mobile PWA',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
        </svg>
      ),
      highlight: 'Multilingual Voice & Optical Tool Identification',
      description: 'Rugged intake terminal built for shop-floor operators. Optical QR tool detection, high-accuracy Kannada, Hindi, and English voice intake via acoustic Mic Orb, and operator-confirmed structured drafting.',
      cta: 'Open Operator Terminal →'
    },
    {
      to: '/history',
      title: 'Asset Lifecycle & Telemetry Engine',
      badge: 'Predictive Health',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
      ),
      highlight: 'Repeat Failure Detection & Duplicate Case Correlation',
      description: 'Chronological asset registry tracking tool repairs, calibration drift, and recurring torque clutch slippage. Features multilingual case correlation and side-by-side duplicate resolution.',
      cta: 'Inspect Asset Lifecycle →'
    },
    {
      to: '/kitchen',
      title: 'Clarity Glass Design System',
      badge: 'Design Standards',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 19 8.5 12 15 5 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="15" />
        </svg>
      ),
      highlight: 'Optical Material Uncertainty Tokens',
      description: 'Explore the Clarity Glass standard: Confirmed ruby facets, translucent saffron tint, and frosted fog with cross-hatch for unknown records. High-contrast typography and projector-grade legibility.',
      cta: 'View Design Standards →'
    }
  ];

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '40px 32px 140px 32px' }}>
      {/* Hero Welcome Showcase */}
      <div style={{
        textAlign: 'center',
        marginBottom: '48px',
        padding: '36px 20px',
        borderRadius: '28px',
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(244, 247, 252, 0.85) 100%)',
        border: '1px solid rgba(0, 184, 204, 0.25)',
        boxShadow: '0 20px 60px rgba(7, 17, 32, 0.06)'
      }}>
        {/* Emblem Showcase with Official Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '96px',
            height: '96px',
            borderRadius: '24px',
            padding: '4px',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.85) 0%, rgba(10, 182, 255, 0.6) 100%)',
            boxShadow: '0 12px 32px rgba(0, 194, 203, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden'
          }}>
            <img
              src="/assets/toolsathi_logo.png"
              alt="ToolSathi AI Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Enterprise Eyebrow */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{
            display: 'inline-block',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-cyan)',
            boxShadow: '0 0 12px var(--brand-cyan)'
          }} />
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--brand-cyan-ink)',
            fontFamily: 'var(--font-mono)'
          }}>
            AUTONOMOUS MANUFACTURING CLOUD • BENGALURU INDUSTRIAL COMPLEX
          </span>
          <StatusBadge status="Verified" size="small" />
        </div>

        {/* Main Hero Headline - Bold & High Contrast */}
        <h1 style={{
          fontSize: '48px',
          fontWeight: 900,
          letterSpacing: '-0.035em',
          color: 'var(--ink)',
          marginBottom: '16px',
          lineHeight: 1.2
        }}>
          ToolSathi <span style={{
            background: 'var(--brand-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>AI Platform</span>
        </h1>

        <p style={{
          fontSize: '20px',
          color: 'var(--ink-secondary)',
          maxWidth: '840px',
          margin: '0 auto 28px auto',
          lineHeight: 1.6,
          fontWeight: 500
        }}>
          Next-generation shop-floor incident intelligence. Transforming real-time operator voice reports into explainable supply chain exposure boundaries and human-approved SAP S/4HANA recovery.
        </p>

        {/* High-Impact Enterprise Metrics Pill Strip */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '28px',
          padding: '12px 32px',
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(7, 17, 32, 0.12)',
          boxShadow: '0 8px 24px rgba(7, 17, 32, 0.05)',
          fontSize: '15px',
          color: 'var(--ink)'
        }}>
          <div>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--brand-cyan-ink)' }}>100%</strong> Deterministic Trace
          </div>
          <span style={{ opacity: 0.3 }}>|</span>
          <div>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--jade-ink)' }}>3 Languages</strong> Native Intake
          </div>
          <span style={{ opacity: 0.3 }}>|</span>
          <div>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--ruby-ink)' }}>Zero</strong> Silent Escapes
          </div>
          <span style={{ opacity: 0.3 }}>|</span>
          <div>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--cobalt-ink)' }}>4-Level</strong> Governance Ladder
          </div>
        </div>
      </div>

      {/* Role Switcher Toolbar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '44px'
      }}>
        <div style={{ fontSize: '14px', color: 'var(--ink-secondary)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Select Active Industrial Persona:
        </div>
        <RoleSwitch activeRole={currentRole} onRoleChange={setCurrentRole} />
      </div>

      {/* 4 Feature Portals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '28px' }}>
        {portals.map(portal => (
          <GlassPanel
            key={portal.to}
            variant="strong"
            interactive
            style={{
              padding: '36px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid rgba(7, 17, 32, 0.12)',
              borderRadius: '24px'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--brand-cyan-soft)',
                  color: 'var(--brand-cyan-ink)',
                  border: '1px solid rgba(0, 184, 204, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {portal.icon}
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(7, 17, 32, 0.06)',
                  color: 'var(--ink)'
                }}>
                  {portal.badge}
                </span>
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                {portal.title}
              </h2>

              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-cyan-ink)', marginBottom: '16px' }}>
                {portal.highlight}
              </div>

              <p style={{ fontSize: '16px', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: '32px' }}>
                {portal.description}
              </p>
            </div>

            <Link
              to={portal.to}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '14px 24px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--ink)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(7, 17, 32, 0.18)',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.01em'
              }}
            >
              {portal.cta}
            </Link>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
