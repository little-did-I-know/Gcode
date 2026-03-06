// ===== MEASUREMENT TOOL =====

const MeasureTool = {
  points: [],
  measurements: [],
  _pending: null,
  _labels: [],

  reset() {
    this.points = [];
    this.measurements = [];
    this._pending = null;
    this._clearLabels();
  },

  addPoint(worldX, worldY, worldZ, nearestMove) {
    let px = worldX, py = worldY, pz = worldZ;

    // Snap to nearest endpoint if within 1mm
    if (nearestMove) {
      const d1 = Math.hypot(worldX - nearestMove.x1, worldY - nearestMove.y1);
      const d2 = Math.hypot(worldX - nearestMove.x2, worldY - nearestMove.y2);
      if (d1 <= d2 && d1 < 1) {
        px = nearestMove.x1;
        py = nearestMove.y1;
      } else if (d2 < d1 && d2 < 1) {
        px = nearestMove.x2;
        py = nearestMove.y2;
      }
    }

    const point = { x: px, y: py, z: pz };
    this.points.push(point);

    if (this._pending === null) {
      this._pending = point;
    } else {
      const p1 = this._pending;
      const p2 = point;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const distXY = Math.sqrt(dx * dx + dy * dy);
      const deltaZ = Math.abs(dz);
      this.measurements.push({ p1, p2, dist, distXY, deltaZ });
      this._pending = null;
    }
  },

  removeLast() {
    if (this._pending !== null) {
      // Remove the pending (unpaired) point
      this.points.pop();
      this._pending = null;
    } else if (this.measurements.length > 0) {
      // Remove the last completed measurement (both points)
      this.measurements.pop();
      this.points.pop();
      this.points.pop();
      // Clear any label for removed measurement
      this._clearLabels();
    }
  },

  getDrawData(layerZ) {
    const color = [0.31, 0.76, 0.97, 1.0];
    const verts = [];
    const arm = 1; // 1mm crosshair arms
    const zOff = 0.15; // float above geometry

    // Draw crosshairs at all points
    for (const pt of this.points) {
      const z = pt.z + zOff;
      // X arms
      verts.push(pt.x - arm, pt.y, z, ...color);
      verts.push(pt.x + arm, pt.y, z, ...color);
      // Y arms
      verts.push(pt.x, pt.y - arm, z, ...color);
      verts.push(pt.x, pt.y + arm, z, ...color);
    }

    // Draw lines between measurement pairs
    for (const m of this.measurements) {
      const z1 = m.p1.z + zOff;
      const z2 = m.p2.z + zOff;
      verts.push(m.p1.x, m.p1.y, z1, ...color);
      verts.push(m.p2.x, m.p2.y, z2, ...color);
    }

    if (verts.length === 0) return null;
    return new Float32Array(verts);
  },

  updateLabels(viewer) {
    // Ensure correct number of labels
    while (this._labels.length < this.measurements.length) {
      const el = document.createElement('div');
      el.className = 'measure-label';
      const container = document.querySelector('.viewer-canvas-area');
      if (container) container.appendChild(el);
      this._labels.push(el);
    }
    // Remove excess labels
    while (this._labels.length > this.measurements.length) {
      const el = this._labels.pop();
      if (el.parentNode) el.parentNode.removeChild(el);
    }

    // Position each label at midpoint of its measurement
    for (let i = 0; i < this.measurements.length; i++) {
      const m = this.measurements[i];
      const midX = (m.p1.x + m.p2.x) / 2;
      const midY = (m.p1.y + m.p2.y) / 2;
      const midZ = (m.p1.z + m.p2.z) / 2 + 0.15;

      const screen = viewer.worldToScreen(midX, midY, midZ);
      const label = this._labels[i];

      if (!screen) {
        label.style.display = 'none';
        continue;
      }

      label.style.display = '';
      label.style.left = screen.x + 'px';
      label.style.top = screen.y + 'px';
      label.style.transform = 'translate(-50%, -100%) translateY(-6px)';

      let text = m.dist.toFixed(2) + 'mm';
      if (m.deltaZ > 0.01) {
        text += ' (XY: ' + m.distXY.toFixed(2) + ', \u0394Z: ' + m.deltaZ.toFixed(2) + ')';
      }
      label.textContent = text;
    }
  },

  _clearLabels() {
    for (const el of this._labels) {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    this._labels = [];
  }
};
