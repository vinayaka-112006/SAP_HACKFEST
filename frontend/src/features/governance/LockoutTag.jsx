import React from 'react';

/**
 * LockoutTag: Physical 3D OSHA-style lockout/tagout tag.
 * Suspended from the Tool B tile on a pendulum swing animation.
 * Ruby while Restricted; Jade after verified return to service.
 */
export default function LockoutTag({
  isRestricted = true,
  tagId = 'Tool state',
  onVerifyClick
}) {
  const isLocked = isRestricted;
  const tagBg = isLocked ? 'var(--ruby)' : 'var(--jade)';
  const tagColor = '#FFFFFF';
  const tagBorder = isLocked ? '#9E1224' : '#08694F';

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}
    >
      {/* Hanging Brass Ring / Cable */}
      <div style={{
        width: '14px',
        height: '18px',
        border: '3px solid #94A3B8',
        borderRadius: '50%',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        marginBottom: '-6px',
        zIndex: 1
      }} />

      {/* 3D Swinging Tag Body */}
      <div
        className={isLocked ? 'animate-tag-swing' : ''}
        style={{
          width: '130px',
          background: tagBg,
          color: tagColor,
          border: `2px solid ${tagBorder}`,
          borderRadius: '8px',
          padding: '10px 8px',
          textAlign: 'center',
          boxShadow: '0 10px 24px rgba(14, 26, 47, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
          cursor: !isLocked ? 'default' : (onVerifyClick ? 'pointer' : 'default'),
          position: 'relative'
        }}
        onClick={isLocked ? onVerifyClick : undefined}
        title={isLocked ? 'Click to inspect return-to-service verification' : 'Tool recorded as active'}
      >
        {/* Grommet eyelet */}
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#CBD5E1',
          border: '2px solid #64748B',
          margin: '0 auto 6px auto'
        }} />

        <div style={{
          fontSize: '11px',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,0.4)',
          paddingBottom: '4px',
          marginBottom: '6px'
        }}>
          {isLocked ? 'DANGER' : 'ACTIVE'}
        </div>

        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.2 }}>
          {isLocked ? 'DO NOT OPERATE' : 'PER RECORDS'}
        </div>

        <div style={{
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          marginTop: '6px',
          opacity: 0.95
        }}>
          {tagId}
        </div>

        {isLocked && onVerifyClick && (
          <div style={{
            fontSize: '9px',
            textDecoration: 'underline',
            marginTop: '4px',
            opacity: 0.9
          }}>
            Verify Return →
          </div>
        )}
      </div>
    </div>
  );
}
