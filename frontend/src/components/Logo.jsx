import React from 'react';

/**
 * Logo — Unified ToolSathi AI logo component.
 *
 * Props:
 *   variant  – 'mark' (icon only) | 'lockup' (icon + live text wordmark)
 *   theme    – 'light' (colour mark, dark text) | 'dark' (white mark, white text)
 *   size     – pixel height of the mark icon (default 40)
 *   animate  – if true, plays a spin-in + glow pulse entrance animation
 *   className – extra CSS class
 */
export default function Logo({ variant = 'lockup', theme = 'dark', size = 40, animate = false, className = '' }) {
  const isDark = theme === 'dark';
  const markSrc = isDark ? '/assets/logo-mark-white.svg' : '/assets/logo-mark.svg';

  const animClass = animate ? 'logo-entrance' : '';

  return (
    <div
      className={`logo-root ${animClass} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.3,
        textDecoration: 'none',
      }}
    >
      {/* Mark */}
      <div
        className="logo-mark-container"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDark
            ? 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)'
            : 'transparent',
          boxShadow: isDark
            ? '0 0 20px rgba(0, 229, 255, 0.35)'
            : 'none',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          flexShrink: 0,
        }}
      >
        <img
          src={markSrc}
          alt="ToolSathi AI"
          style={{
            width: size * 0.85,
            height: size * 0.85,
            objectFit: 'contain',
            filter: isDark
              ? 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.6))'
              : 'drop-shadow(0 2px 4px rgba(0, 60, 115, 0.18))',
          }}
        />
      </div>

      {/* Wordmark (only in lockup variant) */}
      {variant === 'lockup' && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{
            fontSize: size * 0.48,
            fontWeight: 700,
            fontFamily: "'IBM Plex Sans', var(--font-sans), sans-serif",
            letterSpacing: '0.03em',
            color: isDark ? '#FFFFFF' : '#0A1628',
            textShadow: isDark
              ? '0 0 12px rgba(0, 229, 255, 0.5)'
              : 'none',
          }}>
            Tool<span style={{ color: '#00E5FF', fontWeight: 800 }}>Sathi</span> AI
          </span>
          <span style={{
            fontSize: size * 0.22,
            fontWeight: 500,
            fontFamily: "'IBM Plex Sans', var(--font-sans), sans-serif",
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isDark ? '#94A3B8' : '#64748B',
            marginTop: 2,
          }}>
            Manufacturing Intelligence
          </span>
        </div>
      )}

      {/* Entrance animation keyframes + hover */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@500;600;700;800&display=swap');

        .logo-mark-container:hover {
          transform: scale(1.08) !important;
          box-shadow: 0 0 28px rgba(0, 229, 255, 0.55) !important;
        }

        .logo-entrance .logo-mark-container {
          animation: logoSpinIn 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .logo-entrance span {
          animation: logoFadeSlide 0.8s ease 0.4s both;
        }

        @keyframes logoSpinIn {
          0% {
            opacity: 0;
            transform: rotate(-180deg) scale(0.3);
          }
          60% {
            opacity: 1;
            transform: rotate(15deg) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: rotate(0deg) scale(1);
          }
        }

        @keyframes logoFadeSlide {
          0% {
            opacity: 0;
            transform: translateX(-12px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes logoGlowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 229, 255, 0.35); }
          50% { box-shadow: 0 0 32px rgba(0, 229, 255, 0.6); }
        }
      `}</style>
    </div>
  );
}
