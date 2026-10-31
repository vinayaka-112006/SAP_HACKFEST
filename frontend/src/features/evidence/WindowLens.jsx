import React from 'react';
import GlassPanel from '../../components/GlassPanel';

const WINDOW_PRESETS = [
  { hours: 24, label: '24 Hours', desc: 'Immediate Shift Horizon' },
  { hours: 72, label: '72 Hours', desc: 'Default Investigation Window (Ground Truth)' },
  { hours: 168, label: '7 Days', desc: 'Full Weekly Calibration Boundary' }
];

/**
 * WindowLens: Draggable glass pane spanning the timeline with snap points.
 * Always prints the active window as text.
 * Enhanced text size and contrast.
 */
export default function WindowLens({ activeWindow = 72, totalUnits, onWindowChange }) {
  return (
    <GlassPanel variant="clear" style={{ padding: '16px 24px', width: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'var(--brand-cyan-soft)',
            color: 'var(--brand-cyan-ink)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
            Investigation Window Lens:
          </span>
          <span style={{
            fontSize: '17px',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: 'var(--brand-cyan-ink)',
            background: 'var(--brand-cyan-soft)',
            padding: '3px 12px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(0, 184, 204, 0.3)'
          }}>
            {activeWindow === 168 ? '7 Days (168h)' : `${activeWindow} Hours`}
          </span>
        </div>

        {/* Snap Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.85)',
          padding: '5px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(7, 17, 32, 0.12)'
        }}>
          {WINDOW_PRESETS.map(preset => {
            const isActive = activeWindow === preset.hours;
            return (
              <button
                key={preset.hours}
                onClick={() => onWindowChange && onWindowChange(preset.hours)}
                title={preset.desc} aria-pressed={isActive} aria-label={`Trace ${preset.hours} hours`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '15px',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#FFFFFF' : 'var(--ink)',
                  backgroundColor: isActive ? 'var(--brand-cyan)' : 'transparent',
                  boxShadow: isActive ? '0 4px 14px rgba(0, 184, 204, 0.4)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <span>{preset.label}</span>
                <span style={{
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(7,17,32,0.08)',
                  color: isActive ? '#FFFFFF' : 'var(--ink-secondary)'
                }}>
                  {isActive && totalUnits != null ? `${totalUnits} units` : 'Load records'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </GlassPanel>
  );
}
