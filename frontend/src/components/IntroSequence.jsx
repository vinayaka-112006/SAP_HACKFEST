import React, { useState, useEffect } from 'react';
import Logo from './Logo';

/**
 * IntroSequence: Ultra-cinematic 5.5 second animated onboarding experience
 * Guaranteed 100% luminous white typography for all 4 key phase headings.
 */
export default function IntroSequence({ onComplete }) {
  const [phase, setPhase] = useState(0); // 0: Sensing, 1: Trace, 2: Clarity Glass, 3: Governance Ready
  const [fadingOut, setFadingOut] = useState(false);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2000);
    const t2 = setTimeout(() => setPhase(2), 4000);
    const t3 = setTimeout(() => setPhase(3), 6000);
    const t4 = setTimeout(() => setFadingOut(true), 7500);
    const t5 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 8200);

    const interval = setInterval(() => {
      setCounter(prev => (prev < 300 ? prev + 8 : 300));
    }, 40);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearInterval(interval);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setFadingOut(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 300);
  };

  const bgImage = phase >= 1 ? '/assets/digital_torque_sensing.jpg' : '/assets/factory_glass_line.jpg';

  return (
    <div
      className="intro-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#040914',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '36px 48px',
        overflow: 'hidden',
        opacity: fadingOut ? 0 : 1,
        transform: fadingOut ? 'scale(1.03)' : 'scale(1)',
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Scoped CSS guaranteeing 100% luminous white typography over dark factory backdrop */}
      <style>{`
        .intro-container h1,
        .intro-container .intro-heading,
        .intro-container h1 span,
        .intro-heading {
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
          text-shadow: 0 0 28px rgba(0, 229, 255, 0.65), 0 4px 20px rgba(0, 0, 0, 0.95) !important;
          font-weight: 900 !important;
        }
        .intro-container p,
        .intro-container .intro-paragraph {
          color: #F8FAFC !important;
          -webkit-text-fill-color: #F8FAFC !important;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.95) !important;
        }
      `}</style>
      {/* Background Dim Factory Image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.28,
          filter: 'blur(2px) saturate(140%)',
          transform: `scale(${1.05 + phase * 0.02})`,
          transition: 'background-image 0.8s ease, transform 2s ease-out, opacity 0.8s ease',
          pointerEvents: 'none'
        }}
      />

      {/* Deep Obsidian Radial Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(4, 15, 30, 0.65) 0%, rgba(2, 6, 14, 0.96) 80%)',
          pointerEvents: 'none'
        }}
      />

      {/* Glowing Cyan Optical Telemetry Laser Line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, #00F2FE 50%, transparent 100%)',
          boxShadow: '0 0 24px 6px rgba(0, 242, 254, 0.7)',
          top: `${14 + (phase * 22)}%`,
          transition: 'top 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none'
        }}
      />

      {/* Top Header with ToolSathi AI Logo */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo variant="lockup" theme="dark" size={44} animate={true} />

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
          }}
        >
          Skip to Platform →
        </button>
      </div>

      {/* Central Sequence Stage with Logo Centerpiece */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '880px', margin: '0 auto', textAlign: 'center' }}>
        {/* Glowing Logo Icon */}
        <div style={{ margin: '0 auto 24px auto', display: 'flex', justifyContent: 'center' }}>
          <Logo variant="mark" theme="dark" size={100} animate={true} />
        </div>

        {/* Phase 0: Multilingual Incident Intelligence */}
        {phase === 0 && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 20px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(0, 229, 255, 0.25)',
              border: '1px solid #00E5FF',
              color: '#00E5FF',
              fontSize: '14px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              marginBottom: '20px',
              boxShadow: '0 0 16px rgba(0, 229, 255, 0.3)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00E5FF', boxShadow: '0 0 10px #00E5FF' }} />
              PHASE 1 • SHOP-FLOOR TELEMETRY INTAKE
            </div>

            <h1
              className="intro-heading"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                marginBottom: '18px',
                color: '#FFFFFF'
              }}
            >
              Multilingual Incident Intelligence
            </h1>

            <p
              className="intro-paragraph"
              style={{
                fontSize: '22px',
                color: '#F8FAFC',
                lineHeight: 1.6,
                maxWidth: '780px',
                margin: '0 auto'
              }}
            >
              Translating real-time spoken Kannada, Hindi, and English into structured SAP nonconformance drafts directly from plant assembly operators.
            </p>
          </div>
        )}

        {/* Phase 1: Exposure Boundary */}
        {phase === 1 && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 20px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(0, 229, 255, 0.25)',
              border: '1px solid #00E5FF',
              color: '#00E5FF',
              fontSize: '14px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              marginBottom: '20px',
              boxShadow: '0 0 16px rgba(0, 229, 255, 0.3)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00E5FF', boxShadow: '0 0 10px #00E5FF' }} />
              PHASE 2 • DETERMINISTIC FORWARD TRACE
            </div>

            <h1
              className="intro-heading"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                marginBottom: '18px',
                color: '#FFFFFF'
              }}
            >
              Exposure Boundary: <span style={{ fontFamily: 'var(--font-mono)', color: '#00E5FF', textShadow: '0 0 30px #00E5FF' }}>{counter}</span> Assemblies
            </h1>

            <p
              className="intro-paragraph"
              style={{
                fontSize: '22px',
                color: '#F8FAFC',
                lineHeight: 1.6,
                maxWidth: '780px',
                margin: '0 auto'
              }}
            >
              Evaluating nested time horizons: 35 in 24h • 100 in 72h benchmark • 160 in 7d. Routing downstream into Factory Stock, Dealer X, and Dealer Y.
            </p>
          </div>
        )}

        {/* Phase 2: The Factory is Behind Glass */}
        {phase === 2 && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 20px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(245, 158, 11, 0.3)',
              border: '1px solid #F59E0B',
              color: '#FCD34D',
              fontSize: '14px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              marginBottom: '20px',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.3)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B', boxShadow: '0 0 10px #F59E0B' }} />
              PHASE 3 • CLARITY GLASS OPTICAL UNCERTAINTY
            </div>

            <h1
              className="intro-heading"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                marginBottom: '18px',
                color: '#FFFFFF'
              }}
            >
              The Factory is Behind Glass
            </h1>

            <p
              className="intro-paragraph"
              style={{
                fontSize: '22px',
                color: '#F8FAFC',
                lineHeight: 1.6,
                maxWidth: '780px',
                margin: '0 auto'
              }}
            >
              The less we know, the foggier the glass. Confirmed ruby facets, translucent saffron, and frosted fog with cross-hatch for unknown records.
            </p>
          </div>
        )}

        {/* Phase 3: AI Proposes, Humans Approve */}
        {phase === 3 && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 20px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(16, 185, 129, 0.3)',
              border: '1px solid #10B981',
              color: '#6EE7B7',
              fontSize: '14px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              marginBottom: '20px',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 10px #10B981' }} />
              PHASE 4 • HUMAN-APPROVED SAP S/4HANA RECOVERY
            </div>

            <h1
              className="intro-heading"
              style={{
                fontSize: '48px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                marginBottom: '18px',
                color: '#FFFFFF'
              }}
            >
              AI Proposes, Humans Approve
            </h1>

            <p
              className="intro-paragraph"
              style={{
                fontSize: '22px',
                color: '#F8FAFC',
                lineHeight: 1.6,
                maxWidth: '780px',
                margin: '0 auto'
              }}
            >
              Physical interlock gates guard material actions. All containment orders dispatched with verifiable cryptographic audit stamps.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Timeline Progress Bar */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '14px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: '#CBD5E1',
          marginBottom: '10px'
        }}>
          <span style={{ color: phase >= 0 ? '#00E5FF' : '#64748B' }}>1. Telemetry Intake</span>
          <span style={{ color: phase >= 1 ? '#00E5FF' : '#64748B' }}>2. Forward Trace</span>
          <span style={{ color: phase >= 2 ? '#FCD34D' : '#64748B' }}>3. Clarity Glass</span>
          <span style={{ color: phase >= 3 ? '#6EE7B7' : '#64748B' }}>4. S/4 Governance</span>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          overflow: 'hidden'
        }}>
          <div
            style={{
              height: '100%',
              width: `${((phase + 1) / 4) * 100}%`,
              background: 'linear-gradient(90deg, #00E5FF 0%, #0AB6FF 50%, #10B981 100%)',
              transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 0 16px #00E5FF'
            }}
          />
        </div>
      </div>
    </div>
  );
}
