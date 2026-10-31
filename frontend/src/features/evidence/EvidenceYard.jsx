import React, { useState, useRef, useMemo } from 'react';
import GlassPanel from '../../components/GlassPanel';
import StatusBadge from '../../components/StatusBadge';
import { gridToScreen, getIsometricCubePaths } from './iso';

/**
 * EvidenceYard: The Hero Visualization.
 * Draws all 300 assemblies as true isometric 3D blocks in SVG.
 * - In-window units lift up with spring animation and render their optical material:
 *   - Confirmed: Crisp Ruby Block (#E0314B)
 *   - Probable: Translucent Saffron Block (#F2A100)
 *   - Unknown: Frosted Fog + Diagonal Hatch + '?' (Never green, never safe!)
 *   - Outside Window: Faint ghost outline resting flat on floor.
 * - Dynamic pointer tilt up to 6 degrees.
 * - Yard / List toggle for high-accessibility tabular audit view.
 * Zero emojis - pure crisp SVG vector glyphs.
 */
export default function EvidenceYard({
  allUnits = [],
  inWindowUnits = [],
  selectedWindow = 72,
  onUnitClick,
  viewMode = 'yard',
  onToggleViewMode
}) {
  const [hoveredUnit, setHoveredUnit] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // In-window unit ID lookup set for O(1) membership checks
  const inWindowIds = useMemo(() => {
    return new Set(inWindowUnits.map(u => u.unitId));
  }, [inWindowUnits]);

  // Handle subtle 3D tilt on pointer move (max 6 deg)
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const yRatio = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: -yRatio * 5, // Rotate X
      y: xRatio * 6   // Rotate Y
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHoveredUnit(null);
  };

  // 300 units arranged in a 25 cols x 12 rows grid
  const COLS = 25;
  const ROWS = 12;

  // Filtered units for list view
  const filteredListUnits = useMemo(() => {
    return allUnits.filter(u => {
      const matchesSearch = !searchFilter ||
        u.unitId.toLowerCase().includes(searchFilter.toLowerCase()) ||
        u.serial.toLowerCase().includes(searchFilter.toLowerCase()) ||
        u.runId.toLowerCase().includes(searchFilter.toLowerCase()) ||
        u.location.toLowerCase().includes(searchFilter.toLowerCase());

      const inWin = inWindowIds.has(u.unitId);
      if (tierFilter === 'IN_WINDOW') return matchesSearch && inWin;
      if (tierFilter === 'CONFIRMED') return matchesSearch && u.tier === 'Confirmed' && inWin;
      if (tierFilter === 'PROBABLE') return matchesSearch && u.tier === 'Probable' && inWin;
      if (tierFilter === 'UNKNOWN') return matchesSearch && u.tier === 'Unknown' && inWin;
      if (tierFilter === 'OUTSIDE') return matchesSearch && !inWin;
      return matchesSearch;
    });
  }, [allUnits, inWindowIds, searchFilter, tierFilter]);

  return (
    <GlassPanel variant="strong" style={{ padding: '24px', width: '100%', overflow: 'hidden' }}>
      {/* Top Controls Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: 'var(--cobalt-soft)',
            color: 'var(--cobalt-ink)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                Evidence Yard ({allUnits.length} Returned Records)
              </h3>
              <StatusBadge status="Built" size="small" />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              Optical Clarity Materialization • Active Horizon: <strong style={{ color: 'var(--ink)' }}>{selectedWindow}h</strong> ({inWindowUnits.length} in-window)
            </div>
          </div>
        </div>

        {/* View Mode Switcher (Yard vs Accessible List) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(255, 255, 255, 0.85)',
          padding: '4px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(14, 26, 47, 0.1)'
        }}>
          <button
            onClick={() => onToggleViewMode && onToggleViewMode('yard')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: viewMode === 'yard' ? 700 : 500,
              backgroundColor: viewMode === 'yard' ? 'var(--ink)' : 'transparent',
              color: viewMode === 'yard' ? '#FFFFFF' : 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span>3D Isometric Yard</span>
          </button>

          <button
            onClick={() => onToggleViewMode && onToggleViewMode('list')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: viewMode === 'list' ? 700 : 500,
              backgroundColor: viewMode === 'list' ? 'var(--ink)' : 'transparent',
              color: viewMode === 'list' ? '#FFFFFF' : 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>Tabular Audit Stream</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: 3D ISOMETRIC EVIDENCE YARD */}
      {viewMode === 'yard' ? (
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'relative',
            width: '100%',
            height: '460px',
            borderRadius: '20px',
            backgroundColor: '#E7EDF5',
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(255,255,255,0.7) 0%, rgba(231,237,245,0.4) 100%),
              linear-gradient(rgba(14,26,47,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14,26,47,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 20px 20px, 20px 20px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            boxShadow: 'inset 0 2px 10px rgba(14, 26, 47, 0.08)'
          }}
        >
          {/* Subtle Tilt Wrapper */}
          <div
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 0.15s ease-out',
              transformStyle: 'preserve-3d'
            }}
          >
            <svg
              width="1000"
              height="440"
              viewBox="0 0 1000 440"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* SVG Cross-Hatch Pattern for Unknown Fog */}
                <pattern
                  id="yardHatch"
                  width="6"
                  height="6"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#475569" strokeWidth="1.5" />
                </pattern>
                {/* Specular Ruby Filter / Gradient */}
                <linearGradient id="rubyTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF6B81" />
                  <stop offset="100%" stopColor="#E0314B" />
                </linearGradient>
                <linearGradient id="saffronTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFD175" />
                  <stop offset="100%" stopColor="#F2A100" />
                </linearGradient>
              </defs>

              {/* Floor Guideline Grids / Factory Conveyor Lanes */}
              <line x1="50" y1="210" x2="950" y2="210" stroke="rgba(14,26,47,0.08)" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="50" y1="260" x2="950" y2="260" stroke="rgba(14,26,47,0.08)" strokeWidth="1.5" strokeDasharray="4 4" />

              {/* Render all 300 units in isometric layers */}
              {allUnits.map((unit, index) => {
                const col = index % COLS;
                const row = Math.floor(index / COLS);

                const inWindow = inWindowIds.has(unit.unitId);
                const isLifted = inWindow;

                // Base coordinates
                // Spacing: X step = 34px, Y step = 24px
                const baseX = 70 + col * 36 + (row % 2) * 12;
                const baseY = 80 + row * 26;
                const liftedY = isLifted ? baseY - 12 : baseY;

                const { topFace, leftFace, rightFace, shadow } = getIsometricCubePaths(baseX, liftedY, 20, 12);

                // Tier colors & material
                let topFill = 'rgba(210, 220, 230, 0.4)';
                let leftFill = 'rgba(180, 195, 210, 0.3)';
                let rightFill = 'rgba(160, 175, 190, 0.25)';
                let stroke = '#94A3B8';
                let isUnknown = false;

                if (inWindow) {
                  if (unit.tier === 'Confirmed') {
                    topFill = 'url(#rubyTopGrad)';
                    leftFill = '#E0314B';
                    rightFill = '#B81932';
                    stroke = '#FFA1B0';
                  } else if (unit.tier === 'Probable') {
                    topFill = 'url(#saffronTopGrad)';
                    leftFill = '#F2A100';
                    rightFill = '#C68000';
                    stroke = '#FFE099';
                  } else if (unit.tier === 'Unknown') {
                    topFill = '#94A3B8';
                    leftFill = '#7F93AD';
                    rightFill = '#64748B';
                    stroke = '#CBD5E1';
                    isUnknown = true;
                  }
                }

                const isHovered = hoveredUnit?.unitId === unit.unitId;

                return (
                  <g
                    key={unit.unitId} role="button" tabIndex={0} aria-label={`Inspect ${unit.serial}`}
                    onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onUnitClick?.(unit);}}}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    onMouseEnter={() => setHoveredUnit(unit)}
                    onClick={() => onUnitClick && onUnitClick(unit)}
                  >
                    {/* Floor Drop Shadow */}
                    {isLifted && (
                      <polygon
                        points={shadow}
                        fill="rgba(14,26,47,0.18)"
                      />
                    )}

                    {/* Left Face */}
                    <polygon
                      points={leftFace}
                      fill={leftFill}
                      stroke={stroke}
                      strokeWidth={isHovered ? '1.5' : '0.6'}
                    />
                    {isUnknown && (
                      <polygon
                        points={leftFace}
                        fill="url(#yardHatch)"
                        opacity="0.5"
                      />
                    )}

                    {/* Right Face */}
                    <polygon
                      points={rightFace}
                      fill={rightFill}
                      stroke={stroke}
                      strokeWidth={isHovered ? '1.5' : '0.6'}
                    />
                    {isUnknown && (
                      <polygon
                        points={rightFace}
                        fill="url(#yardHatch)"
                        opacity="0.5"
                      />
                    )}

                    {/* Top Face */}
                    <polygon
                      points={topFace}
                      fill={topFill}
                      stroke={stroke}
                      strokeWidth={isHovered ? '1.8' : '0.8'}
                    />
                    {isUnknown && (
                      <polygon
                        points={topFace}
                        fill="url(#yardHatch)"
                        opacity="0.5"
                      />
                    )}

                    {/* Unknown Question Mark Symbol */}
                    {isUnknown && (
                      <text
                        x={baseX}
                        y={liftedY - 14}
                        fill="#0E1A2F"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="var(--font-mono)"
                      >
                        ?
                      </text>
                    )}

                    {/* Specular Edge Highlight on Confirmed */}
                    {inWindow && unit.tier === 'Confirmed' && (
                      <line
                        x1={baseX}
                        y1={liftedY - 20}
                        x2={baseX - 10}
                        y2={liftedY - 14}
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Unit Hover Card */}
          {hoveredUnit && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '20px',
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(14, 26, 47, 0.14)',
                border: '1px solid rgba(14, 26, 47, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                    {hoveredUnit.unitId}
                  </strong>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: hoveredUnit.tier === 'Confirmed' ? 'var(--ruby-soft)' : hoveredUnit.tier === 'Probable' ? 'var(--saffron-soft)' : 'var(--frost-soft)',
                    color: hoveredUnit.tier === 'Confirmed' ? 'var(--ruby-ink)' : hoveredUnit.tier === 'Probable' ? 'var(--saffron-ink)' : 'var(--frost-ink)'
                  }}>
                    {hoveredUnit.tier}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                  Location: {hoveredUnit.location} • Run: {hoveredUnit.runId}
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--cobalt-ink)', fontWeight: 600 }}>
                Click to inspect evidence →
              </span>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: TABULAR AUDIT STREAM */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search serial, unit ID, run, location..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid rgba(14, 26, 47, 0.15)',
                fontSize: '13px',
                minWidth: '280px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)'
              }}
            />

            {['ALL', 'IN_WINDOW', 'CONFIRMED', 'PROBABLE', 'UNKNOWN'].map(t => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '12px',
                  fontWeight: tierFilter === t ? 700 : 500,
                  backgroundColor: tierFilter === t ? 'var(--ink)' : 'rgba(255,255,255,0.7)',
                  color: tierFilter === t ? '#FFFFFF' : 'var(--ink)',
                  border: '1px solid rgba(14,26,47,0.1)'
                }}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Table Container sitting on near-solid panel */}
          <div style={{
            maxHeight: '440px',
            overflowY: 'auto',
            borderRadius: '14px',
            border: '1px solid rgba(14, 26, 47, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid rgba(14, 26, 47, 0.1)' }}>
                  <th style={{ padding: '10px 14px' }}>Unit ID</th>
                  <th style={{ padding: '10px 14px' }}>Serial</th>
                  <th style={{ padding: '10px 14px' }}>Tier</th>
                  <th style={{ padding: '10px 14px' }}>Location</th>
                  <th style={{ padding: '10px 14px' }}>Run ID</th>
                  <th style={{ padding: '10px 14px' }}>Tool Event</th>
                  <th style={{ padding: '10px 14px' }}>Integrity Flags</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredListUnits.map(unit => {
                  const inWin = inWindowIds.has(unit.unitId);
                  return (
                    <tr
                      key={unit.unitId}
                      style={{
                        borderBottom: '1px solid rgba(14, 26, 47, 0.06)',
                        backgroundColor: inWin ? 'transparent' : 'rgba(14, 26, 47, 0.02)',
                        opacity: inWin ? 1 : 0.65
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {unit.unitId}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {unit.serial}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: unit.tier === 'Confirmed' ? 'var(--ruby-soft)' : unit.tier === 'Probable' ? 'var(--saffron-soft)' : 'var(--frost-soft)',
                          color: unit.tier === 'Confirmed' ? 'var(--ruby-ink)' : unit.tier === 'Probable' ? 'var(--saffron-ink)' : 'var(--frost-ink)'
                        }}>
                          {unit.tier}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>{unit.location}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>{unit.runId}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {unit.toolUseEventId || <span style={{ color: 'var(--ruby-ink)', fontWeight: 700 }}>NULL</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {unit.warnings?.length > 0 ? (
                          <span style={{
                            color: 'var(--saffron-ink)',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            {unit.warnings.length}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          onClick={() => onUnitClick && onUnitClick(unit)}
                          style={{
                            fontSize: '12px',
                            color: 'var(--cobalt-ink)',
                            textDecoration: 'underline',
                            fontWeight: 600
                          }}
                        >
                          View Why?
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
