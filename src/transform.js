/**
 * Compute bounding box and centroid of a set of moves.
 * @param {Array<{x1:number,y1:number,x2:number,y2:number}>} moves
 * @returns {{minX:number,minY:number,maxX:number,maxY:number,centerX:number,centerY:number}}
 */
export function computeSelectionBounds(moves) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const m of moves) {
    minX = Math.min(minX, m.x1, m.x2);
    minY = Math.min(minY, m.y1, m.y2);
    maxX = Math.max(maxX, m.x1, m.x2);
    maxY = Math.max(maxY, m.y1, m.y2);
  }
  return { minX, minY, maxX, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}

/**
 * Transform a single point through the pipeline: scale → mirror → rotate → translate.
 * @param {number} px - point X
 * @param {number} py - point Y
 * @param {number} cx - centroid X
 * @param {number} cy - centroid Y
 * @param {{translateX:number,translateY:number,angle:number,scale:number,mirrorX:boolean,mirrorY:boolean}} t
 * @returns {{x:number,y:number}}
 */
export function transformPoint(px, py, cx, cy, t) {
  let dx = px - cx;
  let dy = py - cy;
  // Scale
  dx *= t.scale;
  dy *= t.scale;
  // Mirror
  if (t.mirrorX) dy = -dy;
  if (t.mirrorY) dx = -dx;
  // Rotate (angle in degrees, CCW positive)
  const rad = t.angle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  // Translate
  return { x: cx + rx + t.translateX, y: cy + ry + t.translateY };
}

/**
 * Transform an array of moves, returning preview objects with new endpoints.
 * @param {Array<{x1:number,y1:number,x2:number,y2:number}>} moves
 * @param {{centerX:number,centerY:number}} bounds
 * @param {{translateX:number,translateY:number,angle:number,scale:number,mirrorX:boolean,mirrorY:boolean}} state
 * @returns {Array<{x1:number,y1:number,x2:number,y2:number,originalIndex:number}>}
 */
export function transformMoves(moves, bounds, state) {
  return moves.map((m, i) => {
    const p1 = transformPoint(m.x1, m.y1, bounds.centerX, bounds.centerY, state);
    const p2 = transformPoint(m.x2, m.y2, bounds.centerX, bounds.centerY, state);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, originalIndex: i };
  });
}

/**
 * Transform a G-code line's X/Y (and I/J for arcs) based on the move and transform state.
 * Returns the new line string, or null if the line has no X or Y to transform.
 */
export function transformGcodeLine(line, move, bounds, state) {
  const trimmed = line.trim();
  const commentIdx = trimmed.indexOf(';');
  const codePart = commentIdx >= 0 ? trimmed.substring(0, commentIdx) : trimmed;
  const comment = commentIdx >= 0 ? trimmed.substring(commentIdx) : '';

  const hasX = /X[-\d.]+/i.test(codePart);
  const hasY = /Y[-\d.]+/i.test(codePart);
  if (!hasX && !hasY) return null;

  const newEnd = transformPoint(move.x2, move.y2, bounds.centerX, bounds.centerY, state);

  let newCode = codePart;
  if (hasX) {
    const xMatch = codePart.match(/X([-\d.]+)/i);
    if (xMatch) {
      const dotIdx = xMatch[1].indexOf('.');
      const precision = dotIdx >= 0 ? xMatch[1].length - dotIdx - 1 : 0;
      newCode = newCode.replace(/X[-\d.]+/i, 'X' + newEnd.x.toFixed(precision));
    }
  }
  if (hasY) {
    const yMatch = codePart.match(/Y([-\d.]+)/i);
    if (yMatch) {
      const dotIdx = yMatch[1].indexOf('.');
      const precision = dotIdx >= 0 ? yMatch[1].length - dotIdx - 1 : 0;
      newCode = newCode.replace(/Y[-\d.]+/i, 'Y' + newEnd.y.toFixed(precision));
    }
  }

  // Transform I/J for arc commands (G2/G3) — scale + mirror + rotate only, no translate
  const isArc = /^G[23]/i.test(codePart);
  if (isArc) {
    const hasI = /I[-\d.]+/i.test(codePart);
    const hasJ = /J[-\d.]+/i.test(codePart);
    if (hasI || hasJ) {
      const iMatch = codePart.match(/I([-\d.]+)/i);
      const jMatch = codePart.match(/J([-\d.]+)/i);
      const iVal = iMatch ? parseFloat(iMatch[1]) : 0;
      const jVal = jMatch ? parseFloat(jMatch[1]) : 0;
      const ijState = { ...state, translateX: 0, translateY: 0 };
      const newIJ = transformPoint(iVal, jVal, 0, 0, ijState);
      if (hasI && iMatch) {
        const dotIdx = iMatch[1].indexOf('.');
        const precision = dotIdx >= 0 ? iMatch[1].length - dotIdx - 1 : 0;
        newCode = newCode.replace(/I[-\d.]+/i, 'I' + newIJ.x.toFixed(precision));
      }
      if (hasJ && jMatch) {
        const dotIdx = jMatch[1].indexOf('.');
        const precision = dotIdx >= 0 ? jMatch[1].length - dotIdx - 1 : 0;
        newCode = newCode.replace(/J[-\d.]+/i, 'J' + newIJ.y.toFixed(precision));
      }
    }
  }

  return comment ? newCode + ' ' + comment : newCode;
}
