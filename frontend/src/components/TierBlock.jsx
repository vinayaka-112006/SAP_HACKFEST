import React from 'react';

/**
 * TierBlock: Isometric 3D block rendered in SVG representing unit evidence tiers.
 * - Confirmed: crisp ruby glass with specular facets
 * - Probable: tinted translucent saffron
 * - Unknown: frosted fog + hatch pattern + question mark (never green)
 * - Ghost: flat faint outline
 */
export default function TierBlock({
  tier = 'confirmed',
  size = 36,
  label = '',
  lifted = false,
  showLabel = false,
  onClick,
  className = ''
}) {
  const normTier = (tier || '').toLowerCase();

  // Isometric SVG path coordinates (width: 40, height: 36)
  // Top face: (20, 4) -> (36, 12) -> (20, 20) -> (4, 12)
  // Left face: (4, 12) -> (20, 20) -> (20, 32) -> (4, 24)
  // Right face: (20, 20) -> (36, 12) -> (36, 24) -> (20, 32)

  let topColor = '#FF5C75';
  let leftColor = '#E0314B';
  let rightColor = '#B81932';
  let strokeColor = '#FFA1B0';
  let isHatched = false;
  let isGhost = false;
  let tierName = 'Confirmed';

  if (normTier === 'probable') {
    topColor = '#FFC555';
    leftColor = '#F2A100';
    rightColor = '#C68000';
    strokeColor = '#FFE099';
    tierName = 'Probable';
  } else if (normTier === 'unknown') {
    topColor = '#A3B4C8';
    leftColor = '#7F93AD';
    rightColor = '#5E728B';
    strokeColor = '#C1D0E0';
    isHatched = true;
    tierName = 'Unknown (Data Gap)';
  } else if (normTier === 'ghost') {
    topColor = 'rgba(215, 225, 235, 0.4)';
    leftColor = 'rgba(180, 195, 210, 0.3)';
    rightColor = 'rgba(160, 175, 190, 0.25)';
    strokeColor = '#94A3B8';
    isGhost = true;
    tierName = 'Outside Window';
  }

  const hatchId = `hatch-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <div
      className={`tier-block-container ${className}`}
      onClick={onClick}
      title={label || `${tierName} tier unit`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transform: lifted ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      <svg
        width={size}
        height={(size * 0.9).toFixed(0)}
        viewBox="0 0 40 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern
            id={hatchId}
            width="6"
            height="6"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#475569" strokeWidth="1.6" />
          </pattern>
        </defs>

        {/* Shadow */}
        <polygon
          points="20,24 38,31 20,38 2,31"
          fill="rgba(14,26,47,0.12)"
        />

        {/* Left Face */}
        <polygon
          points="4,12 20,20 20,32 4,24"
          fill={leftColor}
          stroke={strokeColor}
          strokeWidth="0.8"
        />
        {isHatched && (
          <polygon
            points="4,12 20,20 20,32 4,24"
            fill={`url(#${hatchId})`}
            opacity="0.45"
          />
        )}

        {/* Right Face */}
        <polygon
          points="20,20 36,12 36,24 20,32"
          fill={rightColor}
          stroke={strokeColor}
          strokeWidth="0.8"
        />
        {isHatched && (
          <polygon
            points="20,20 36,12 36,24 20,32"
            fill={`url(#${hatchId})`}
            opacity="0.45"
          />
        )}

        {/* Top Face */}
        <polygon
          points="20,4 36,12 20,20 4,12"
          fill={topColor}
          stroke={strokeColor}
          strokeWidth="1"
        />
        {isHatched && (
          <polygon
            points="20,4 36,12 20,20 4,12"
            fill={`url(#${hatchId})`}
            opacity="0.5"
          />
        )}

        {/* Specular highlight on top edge */}
        {!isGhost && !isHatched && (
          <line
            x1="20" y1="4" x2="4" y2="12"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        )}

        {/* Unknown Question Mark Symbol */}
        {isHatched && (
          <text
            x="20"
            y="14"
            fill="#0E1A2F"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
          >
            ?
          </text>
        )}
      </svg>

      {showLabel && (
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
          {label || tierName}
        </span>
      )}
    </div>
  );
}
