/**
 * Isometric Projection Mathematics for the Evidence Yard
 * Standard dimetric/isometric ratio: 2:1 projection
 */

export const ISO_CONFIG = {
  blockWidth: 26,
  blockDepth: 26,
  blockHeight: 18,
  liftHeight: 16,
  cols: 30, // 30 columns x 10 rows = 300 units!
  originX: 120,
  originY: 60,
  tileW: 32,
  tileH: 16
};

/**
 * Convert 3D grid coordinate (col, row, z) to 2D SVG canvas coordinate (x, y)
 */
export function gridToScreen(col, row, z = 0, config = ISO_CONFIG) {
  const screenX = config.originX + (col - row) * (config.tileW / 2);
  const screenY = config.originY + (col + row) * (config.tileH / 2) - z;
  return { x: screenX, y: screenY };
}

/**
 * Generate SVG polygon points for an isometric cube block
 */
export function getIsometricCubePaths(centerX, centerY, width = 22, height = 14) {
  const hw = width / 2;
  const hh = width / 4;
  const h = height;

  // Top Face (diamond): top, right, bottom, left
  const top = { x: centerX, y: centerY - hh - h };
  const right = { x: centerX + hw, y: centerY - h };
  const bottom = { x: centerX, y: centerY + hh - h };
  const left = { x: centerX - hw, y: centerY - h };

  const topFace = `${top.x},${top.y} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}`;

  // Left Face: left_top, bottom_top, bottom_bot, left_bot
  const leftFace = `${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + h} ${left.x},${left.y + h}`;

  // Right Face: bottom_top, right_top, right_bot, bottom_bot
  const rightFace = `${bottom.x},${bottom.y} ${right.x},${right.y} ${right.x},${right.y + h} ${bottom.x},${bottom.y + h}`;

  // Ground Shadow (diamond at base)
  const shadow = `${centerX},${centerY - hh + 2} ${centerX + hw + 2},${centerY + 2} ${centerX},${centerY + hh + 2} ${centerX - hw - 2},${centerY + 2}`;

  return {
    topFace,
    leftFace,
    rightFace,
    shadow,
    center: { x: centerX, y: centerY - h / 2 }
  };
}
