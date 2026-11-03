import React, { useState, useEffect } from 'react';

/**
 * IntroSequence — Clean, Enterprise Light-Theme Cinematic Intro for ToolSathi
 * Matches Landing Page aesthetic: crisp white glassmorphism, cyber-teal & sapphire accents,
 * deep navy typography, and seamless transition to the live system.
 */

const PHASES = [
  {
    id: 0,
    badge: 'PHASE 01 · SHOP-FLOOR TELEMETRY',
    title: 'Multilingual Incident Intelligence',
    sub: 'Kannada · Hindi · English — AI captures every voice on the shop floor in 240 ms.',
    accent: '#0284C7',
    badgeColor: '#0369A1',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    iconBg: '#E0F2FE',
    icon: (
      <svg width="36" height="36" viewBox="0 0 68 68" fill="none">
        <rect x="26" y="8" width="16" height="28" rx="8" fill="rgba(2,132,199,0.18)" stroke="#0284C7" strokeWidth="3"/>
        <path d="M18 36c0 8.8 7.2 16 16 16s16-7.2 16-16" stroke="#0284C7" strokeWidth="3" strokeLinecap="round"/>
        <line x1="34" y1="52" x2="34" y2="60" stroke="#0284C7" strokeWidth="3" strokeLinecap="round"/>
        <line x1="24" y1="60" x2="44" y2="60" stroke="#0284C7" strokeWidth="3" strokeLinecap="round"/>
        <path d="M12 30 Q8 34 12 38" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M56 30 Q60 34 56 38" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <circle cx="34" cy="22" r="4" fill="#0284C7"/>
      </svg>
    ),
  },
  {
    id: 1,
    badge: 'PHASE 02 · FORWARD TRACE ENGINE',
    title: null,
    sub: '35 units in 24h · 100 in 72h · 160 in 7 days — routed to Factory, Dealer X & Dealer Y.',
    accent: '#EA580C',
    badgeColor: '#C2410C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    iconBg: '#FFEDD5',
    icon: (
      <svg width="36" height="36" viewBox="0 0 68 68" fill="none">
        <rect x="8" y="28" width="52" height="7" rx="3.5" fill="rgba(234,88,12,0.18)" stroke="#EA580C" strokeWidth="2.5"/>
        <line x1="16" y1="14" x2="16" y2="56" stroke="#EA580C" strokeWidth="3.5" strokeLinecap="round"/>
        <line x1="52" y1="20" x2="52" y2="50" stroke="#EA580C" strokeWidth="3.5" strokeLinecap="round"/>
        <rect x="28" y="22" width="12" height="19" rx="2" fill="rgba(234,88,12,0.25)" stroke="#EA580C" strokeWidth="2"/>
        <line x1="31" y1="28" x2="37" y2="28" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="31" y1="33" x2="37" y2="33" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 2,
    badge: 'PHASE 03 · CLARITY GLASS OPTICS',
    title: 'The Factory is Behind Glass',
    sub: 'Ruby confirmed · Saffron suspected · Frosted fog for unknown — visual uncertainty, made tangible.',
    accent: '#D97706',
    badgeColor: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
    iconBg: '#FEF3C7',
    icon: (
      <svg width="36" height="36" viewBox="0 0 68 68" fill="none">
        <circle cx="34" cy="34" r="12" fill="rgba(217,119,6,0.18)" stroke="#D97706" strokeWidth="3"/>
        <circle cx="34" cy="34" r="5" fill="#D97706"/>
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          return <line key={i} x1={34 + Math.cos(rad) * 12} y1={34 + Math.sin(rad) * 12}
            x2={34 + Math.cos(rad) * 19} y2={34 + Math.sin(rad) * 19}
            stroke="#D97706" strokeWidth="5" strokeLinecap="round"/>;
        })}
      </svg>
    ),
  },
  {
    id: 3,
    badge: 'PHASE 04 · S/4HANA GOVERNANCE',
    title: 'AI Proposes · Humans Approve',
    sub: 'Every SAP action is scoped, approved, and blockchain-audited — zero silent mutations.',
    accent: '#059669',
    badgeColor: '#047857',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    iconBg: '#D1FAE5',
    icon: (
      <svg width="36" height="36" viewBox="0 0 68 68" fill="none">
        <rect x="10" y="28" width="38" height="10" rx="5" fill="rgba(5,150,105,0.2)" stroke="#059669" strokeWidth="2.5"/>
        <circle cx="52" cy="33" r="11" fill="rgba(5,150,105,0.2)" stroke="#059669" strokeWidth="2.5"/>
        <circle cx="52" cy="33" r="4.5" fill="#059669"/>
        <path d="M22 44 L28 52 L42 36" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function IntroSequence({ onComplete }) {
  const [phase, setPhase]         = useState(0);
  const [counter, setCounter]     = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setMounted(true), 40);
    const t1 = setTimeout(() => setPhase(1), 1600);
    const t2 = setTimeout(() => setPhase(2), 3200);
    const t3 = setTimeout(() => setPhase(3), 4700);
    const t4 = setTimeout(() => setFadingOut(true), 6200);
    const t5 = setTimeout(() => { if (onComplete) onComplete(); }, 7000);

    const ctr = setInterval(() => {
      setCounter(prev => (prev < 300 ? prev + 20 : 300));
    }, 40);

    return () => {
      clearTimeout(tm);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearInterval(ctr);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSkip = () => {
    setFadingOut(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 300);
  };

  const cur = PHASES[phase];

  return (
    <>
      <style>{`
        @keyframes is-fadeUp {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes is-pop {
          0%   { opacity: 0; transform: scale(0.82); }
          65%  { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes is-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.25); }
        }
        @keyframes is-shimmer {
          from { transform: translateX(-140%); }
          to   { transform: translateX(140%);  }
        }
        .is-fu  { animation: is-fadeUp 0.48s cubic-bezier(.16,1,.3,1) both; }
        .is-fu2 { animation: is-fadeUp 0.48s cubic-bezier(.16,1,.3,1) 0.1s both; }
        .is-fu3 { animation: is-fadeUp 0.48s cubic-bezier(.16,1,.3,1) 0.18s both; }
        .is-pop { animation: is-pop    0.55s cubic-bezier(.34,1.56,.64,1) both; }
      `}</style>

      {/* ROOT CONTAINER — Clean Light Theme Foundation */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'linear-gradient(175deg, #F0F6FF 0%, #E3EFFF 45%, #D6E8FA 100%)',
          color: '#0B1B33',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: mounted && !fadingOut ? 1 : 0,
          transform: fadingOut ? 'scale(1.03)' : 'scale(1)',
          transition: 'opacity 0.65s cubic-bezier(.16,1,.3,1), transform 0.65s cubic-bezier(.16,1,.3,1)',
          userSelect: 'none',
        }}
      >
        {/* Subtle Industrial Wallpaper Pattern (Matching Landing Page) */}
        <svg
          width="100%"
          height="100%"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.14,
            pointerEvents: 'none',
            zIndex: 0,
          }}
          aria-hidden
        >
          <defs>
            <pattern id="intro-light-pattern" width="180" height="180" patternUnits="userSpaceOnUse">
              <g transform="translate(20, 20) scale(0.7)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
                <rect x="0" y="8" width="14" height="10" rx="1.5" />
                <line x1="0" y1="13" x2="-6" y2="13" strokeWidth="2.5" />
                <rect x="14" y="6" width="22" height="14" rx="2" />
                <rect x="36" y="8" width="28" height="10" rx="1.5" />
                <path d="M 64 13 L 74 24 C 76 27, 74 30, 70 30" />
              </g>
              <g transform="translate(130, 25) scale(0.65)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
                <polygon points="15,0 30,8.6 30,26 15,34.6 0,26 0,8.6" />
                <circle cx="15" cy="17.3" r="7" />
              </g>
              <g transform="translate(25, 110) scale(0.65)" stroke="#2B5B8C" strokeWidth="1.8" fill="none">
                <rect x="0" y="0" width="60" height="8" rx="1" />
                <line x1="10" y1="8" x2="10" y2="18" strokeWidth="2" />
                <line x1="30" y1="8" x2="30" y2="18" strokeWidth="2" />
              </g>
              <circle cx="90" cy="90" r="1.5" fill="#2B5B8C" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#intro-light-pattern)" />
        </svg>

        {/* Soft Ambient Aurora Glows */}
        <div
          style={{
            position: 'absolute',
            top: '-8%',
            left: '15%',
            width: '50vw',
            height: '45vh',
            background: 'radial-gradient(circle, rgba(0, 229, 255, 0.25) 0%, transparent 70%)',
            filter: 'blur(75px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            right: '15%',
            width: '45vw',
            height: '45vh',
            background: 'radial-gradient(circle, rgba(0, 112, 243, 0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />

        {/* ══ TOP BAR ══ */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '24px 44px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 22px',
              borderRadius: '100px',
              background: '#FFFFFF',
              border: '2px solid rgba(0, 166, 184, 0.45)',
              color: '#007A8C',
              fontSize: '14px',
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: '0.08em',
              boxShadow: '0 4px 14px rgba(11, 27, 51, 0.08)',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#00C853',
                boxShadow: '0 0 12px #00C853',
                animation: 'is-pulse 1.2s infinite',
              }}
            />
            <span>AI SHOP-FLOOR ENGINE ACTIVE</span>
          </div>

          <div
            style={{
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '2px',
              color: '#334766',
              fontFamily: 'monospace',
            }}
          >
            SAP HACKFEST 2026 • AUTONOMOUS MANUFACTURING SCENARIO
          </div>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            style={{
              background: '#FFFFFF',
              border: '2.5px solid rgba(0, 229, 255, 0.65)',
              color: '#007A8C',
              padding: '12px 28px',
              borderRadius: '100px',
              fontSize: '16px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 18px rgba(0, 229, 255, 0.28)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = '#F0F9FF';
              e.currentTarget.style.borderColor = '#00E5FF';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.65)';
            }}
          >
            Skip Intro →
          </button>
        </div>

        {/* ══ CENTER STAGE: CLEAN LIGHT-THEME PRESENTATION CARD ══ */}
        <div
          style={{
            position: 'relative',
            zIndex: 20,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(28px)',
            borderRadius: '32px',
            border: '2.5px solid rgba(0, 229, 255, 0.5)',
            boxShadow: '0 24px 64px rgba(11, 27, 51, 0.12), 0 0 45px rgba(0, 229, 255, 0.2)',
            padding: '42px 54px',
            maxWidth: '920px',
            width: '92%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '18px',
            boxSizing: 'border-box',
          }}
        >
          {/* EXACT UNIFIED LOGO AS LANDING PAGE */}
          <div
            className="is-pop"
            style={{
              width: '82px',
              height: '82px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #00E5FF 0%, #0070F3 50%, #7C3AED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 32px rgba(0, 229, 255, 0.6), 0 0 45px rgba(0, 112, 243, 0.4)',
              border: '3px solid #FFFFFF',
              flexShrink: 0,
            }}
          >
            <svg
              width="46"
              height="46"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" />
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>

          {/* Presentation Eyebrow: PRESENTING */}
          <div
            className="is-fu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 26px',
              borderRadius: '100px',
              background: '#F0F9FF',
              border: '2px solid #38BDF8',
              boxShadow: '0 3px 12px rgba(2, 132, 199, 0.16)',
            }}
          >
            <span
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#0284C7',
                boxShadow: '0 0 10px #0284C7',
                animation: 'is-pulse 1.2s infinite',
              }}
            />
            <span
              style={{
                fontSize: '16px',
                fontWeight: 900,
                fontFamily: 'monospace',
                letterSpacing: '0.28em',
                color: '#0284C7',
              }}
            >
              PRESENTING
            </span>
            <span
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#0284C7',
                boxShadow: '0 0 10px #0284C7',
                animation: 'is-pulse 1.2s infinite',
              }}
            />
          </div>

          {/* BIG BOLD ToolSathi TITLE */}
          <h1
            className="is-fu2"
            style={{
              fontSize: 'clamp(62px, 8.5vw, 92px)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              margin: 0,
              color: '#0B1B33',
              background: 'linear-gradient(135deg, #0B1B33 15%, #0070F3 55%, #00A6B8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 22px rgba(0, 166, 184, 0.35))',
            }}
          >
            ToolSathi
          </h1>

          {/* Brand Tagline */}
          <div
            className="is-fu3"
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#007A8C',
              letterSpacing: '2px',
              fontFamily: 'monospace',
              marginTop: '-2px',
            }}
          >
            EVIDENCE LINE • INTELLIGENT MANUFACTURING CONTROL
          </div>

          {/* DYNAMIC INNOVATION PHASE CARD */}
          <div
            key={`phase-pill-${phase}`}
            className="is-fu"
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '20px 30px',
              borderRadius: '22px',
              background: '#FFFFFF',
              border: `2.5px solid ${cur.border}`,
              boxShadow: '0 10px 30px rgba(11, 27, 51, 0.08)',
              maxWidth: '780px',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'all 0.4s ease',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: cur.iconBg,
                border: `2px solid ${cur.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {cur.icon}
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div
                style={{
                  fontSize: '14.5px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: cur.badgeColor,
                  letterSpacing: '0.08em',
                }}
              >
                {cur.badge}
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: '#0B1B33',
                  marginTop: '4px',
                  letterSpacing: '-0.02em',
                }}
              >
                {phase === 1 ? `Forward Trace Boundary: ${counter} Assemblies Traced` : cur.title}
              </div>
              <div
                style={{
                  fontSize: '16.5px',
                  fontWeight: 700,
                  color: '#334766',
                  marginTop: '4px',
                  lineHeight: 1.5,
                }}
              >
                {cur.sub}
              </div>
            </div>
          </div>
        </div>

        {/* ══ BOTTOM TIMELINE (Light Theme) ══ */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 48px 30px',
            zIndex: 30,
            maxWidth: '1280px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Phase labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            {PHASES.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: i <= phase ? p.accent : 'rgba(11, 27, 51, 0.22)',
                    boxShadow: i === phase ? `0 0 14px ${p.accent}` : 'none',
                    transition: 'background 0.4s, box-shadow 0.4s',
                  }}
                />
                <span
                  style={{
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    color: i < phase ? '#059669' : i === phase ? p.badgeColor : '#64748B',
                    transition: 'color 0.4s',
                  }}
                >
                  {i < phase ? '✓ ' : i === phase ? '▶ ' : '○ '}
                  {['Telemetry Intake', 'Exposure Trace', 'Clarity Glass', 'S/4 Governance'][i]}
                </span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(11, 27, 51, 0.1)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${((phase + 1) / 4) * 100}%`,
                background: `linear-gradient(90deg, #00A6B8, ${cur.accent})`,
                boxShadow: `0 0 14px ${cur.accent}`,
                borderRadius: '3px',
                transition: 'width 0.85s cubic-bezier(.34,1.56,.64,1), background 0.5s',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
                animation: 'is-shimmer 1.8s ease-in-out infinite',
              }}
            />
          </div>

          {/* Indicator Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '16px' }}>
            {PHASES.map((p, i) => (
              <div
                key={i}
                style={{
                  height: '8px',
                  width: i === phase ? '34px' : '9px',
                  borderRadius: '4px',
                  background: i < phase ? '#10B981' : i === phase ? p.accent : 'rgba(11, 27, 51, 0.2)',
                  boxShadow: i === phase ? `0 0 12px ${p.accent}` : 'none',
                  transition: 'all 0.45s cubic-bezier(.34,1.56,.64,1)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
