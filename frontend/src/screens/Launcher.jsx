import React from 'react';
import { Link } from 'react-router-dom';
import GlassPanel from '../components/GlassPanel';
import StatusBadge from '../components/StatusBadge';
import RoleSwitch from '../components/RoleSwitch';
import Logo from '../components/Logo';
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
      description: 'Rugged intake terminal built for shop-floor operators. Manual tool register and QR contents, browser-dependent Kannada, Hindi, and English speech input via acoustic Mic Orb, and operator-confirmed structured drafting.',
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
      description: 'Chronological asset registry tracking tool repairs, calibration drift, and recurring torque clutch slippage. Duplicate review awaits the workflow adapter.',
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
    <div className="launcher-container" style={{ maxWidth: '1360px', margin: '0 auto', padding: '40px 32px 140px 32px' }}>
      {/* Hero Welcome Showcase */}
      <div
        className="animate-fade-in-up"
        style={{
          textAlign: 'center',
          marginBottom: '48px',
          padding: '40px 24px',
          borderRadius: '28px',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(244, 249, 255, 0.88) 50%, rgba(235, 245, 255, 0.82) 100%)',
          border: '1px solid rgba(0, 184, 204, 0.35)',
          boxShadow: '0 24px 64px rgba(7, 17, 32, 0.10), 0 0 40px -6px rgba(0, 229, 255, 0.22), inset 0 1px 0 #FFFFFF'
        }}
      >
        {/* Emblem Showcase with Official Floating Logo */}
        <div
          className="animate-float"
          style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}
        >
          <Logo variant="mark" theme="light" size={88} animate={true} />
        </div>

        {/* Enterprise Eyebrow */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span
            className="animate-badge-ping"
            style={{
              display: 'inline-block',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-cyan)',
              boxShadow: '0 0 12px var(--brand-cyan)'
            }}
          />
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--brand-cyan-ink)',
            fontFamily: 'var(--font-mono)'
          }}>
            SYNTHETIC MANUFACTURING DEMONSTRATION
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
          lineHeight: 1.2,
          textShadow: '0 2px 14px rgba(0, 184, 204, 0.15)'
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
          Next-generation shop-floor incident intelligence. Transforming real-time operator voice reports into explainable supply chain exposure boundaries and human-reviewed simulated SAP containment.
        </p>

        {/* High-Impact Enterprise Metrics Pill Strip */}
        <div className="launcher-metrics" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '28px',
          padding: '12px 32px',
          borderRadius: 'var(--radius-pill)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 250, 255, 0.92) 100%)',
          border: '1px solid rgba(0, 184, 204, 0.25)',
          boxShadow: '0 8px 24px rgba(7, 17, 32, 0.06), 0 0 20px rgba(0, 229, 255, 0.16)',
          fontSize: '15px',
          color: 'var(--ink)'
        }}>
          <div>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--brand-cyan-ink)', textShadow: '0 0 10px rgba(0, 229, 255, 0.3)' }}>100%</strong> Deterministic Trace
          </div>
          <span style={{ opacity: 0.3 }}>|</span>
          <div>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--jade-ink)', textShadow: '0 0 10px rgba(5, 150, 105, 0.25)' }}>3 Languages</strong> Native Intake
          </div>
          <span style={{ opacity: 0.3 }}>|</span>
          <div>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--ruby-ink)', textShadow: '0 0 10px rgba(220, 38, 38, 0.25)' }}>Explicit</strong> Record Gaps
          </div>
          <span style={{ opacity: 0.3 }}>|</span>
          <div>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--cobalt-ink)', textShadow: '0 0 10px rgba(2, 132, 199, 0.25)' }}>Human</strong> Approval Required
          </div>
        </div>
      </div>

      {/* Role Switcher Toolbar */}
      <div
        className="animate-fade-in-up delay-1"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '44px'
        }}
      >
        <div style={{ fontSize: '14px', color: 'var(--ink-secondary)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Select Active Industrial Persona:
        </div>
        <RoleSwitch activeRole={currentRole} onRoleChange={setCurrentRole} />
      </div>

      {/* 4 Feature Portals Grid */}
      <div className="launcher-portals" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '28px' }}>
        {portals.map((portal, idx) => (
          <GlassPanel
            key={portal.to}
            variant="strong"
            interactive
            className={`animate-fade-in-up delay-${idx + 1}`}
            style={{
              padding: '36px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid rgba(0, 184, 204, 0.20)',
              borderRadius: '24px',
              boxShadow: '0 16px 40px rgba(7, 17, 32, 0.08), 0 0 24px -4px rgba(0, 229, 255, 0.14), inset 0 1px 0 #FFFFFF'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--brand-cyan-soft)',
                  color: 'var(--brand-cyan-ink)',
                  border: '1px solid rgba(0, 184, 204, 0.35)',
                  boxShadow: '0 4px 18px rgba(0, 184, 204, 0.25)',
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
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(0, 184, 204, 0.08)',
                  color: 'var(--brand-cyan-ink)',
                  border: '1px solid rgba(0, 184, 204, 0.2)'
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
                background: 'linear-gradient(135deg, #071120 0%, #172A45 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                boxShadow: '0 8px 24px rgba(7, 17, 32, 0.20), 0 0 16px rgba(0, 229, 255, 0.18)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
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
