// ===== FLOW DIRECTION ARROWS =====
// Renders directional arrow triangles along extrusion paths to visualize flow direction.

const FlowArrows = {
  enabled: false,
  _arrowSpacing: 5.0, // mm between arrows

  buildArrows(moves, layerZ, getColorFn) {
    // Returns {verts: Float32Array, count: vertexCount} for gl.TRIANGLES
    // Uses ribbon shader format: [x,y,z, r,g,b, alpha] per vertex

    const verts = [];
    const arrowLen = 0.6;  // arrow triangle length in mm
    const arrowW = 0.3;    // arrow half-width in mm
    const z = layerZ + 0.12; // slightly above path
    let arrowCount = 0;
    const MAX_ARROWS = 5000;

    for (const move of moves) {
      if (!move.extrude) continue;
      const dx = move.x2 - move.x1, dy = move.y2 - move.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < arrowLen * 2) continue; // skip very short moves

      const ux = dx / len, uy = dy / len; // unit direction
      const nx = -uy, ny = ux;            // perpendicular

      const color = getColorFn ? getColorFn(move) : [0.7, 0.7, 0.7];
      const alpha = 0.85;

      const numArrows = Math.max(1, Math.floor(len / this._arrowSpacing));
      const spacing = len / (numArrows + 1);

      for (let i = 1; i <= numArrows && arrowCount < MAX_ARROWS; i++) {
        const t = spacing * i;
        // Arrow tip (forward)
        const tipX = move.x1 + ux * (t + arrowLen * 0.5);
        const tipY = move.y1 + uy * (t + arrowLen * 0.5);
        // Arrow base corners
        const baseX = move.x1 + ux * (t - arrowLen * 0.5);
        const baseY = move.y1 + uy * (t - arrowLen * 0.5);
        const lx = baseX + nx * arrowW, ly = baseY + ny * arrowW;
        const rx = baseX - nx * arrowW, ry = baseY - ny * arrowW;

        // Single triangle: tip, left, right
        verts.push(tipX, tipY, z, ...color, alpha);
        verts.push(lx, ly, z, ...color, alpha);
        verts.push(rx, ry, z, ...color, alpha);
        arrowCount++;
      }
    }

    return { verts: new Float32Array(verts), count: arrowCount * 3 };
  },

  setZoomLevel(zoom) {
    if (zoom > 200) this._arrowSpacing = 15;
    else if (zoom > 100) this._arrowSpacing = 10;
    else if (zoom > 50) this._arrowSpacing = 7;
    else this._arrowSpacing = 5;
  }
};
