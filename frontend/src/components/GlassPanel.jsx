import React from 'react';

/**
 * GlassPanel component with Clarity Glass material variants:
 * - 'clear': light glass for ambient overlays
 * - 'strong': higher opacity glass for content containers
 * - 'solid': near-solid 90%+ white for dense tabular data & audit ledgers
 */
export default function GlassPanel({
  variant = 'strong',
  className = '',
  style = {},
  children,
  onClick,
  interactive = false,
  ...props
}) {
  const variantClass = {
    clear: 'glass-panel--clear',
    strong: 'glass-panel--strong',
    solid: 'glass-panel--solid',
  }[variant] || 'glass-panel--strong';

  const interactiveClass = interactive || onClick ? 'glass-interactive' : '';

  return (
    <div
      className={`glass-panel ${variantClass} ${interactiveClass} ${className}`}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
