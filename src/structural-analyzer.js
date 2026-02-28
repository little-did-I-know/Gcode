import { MATERIAL_PROFILES, getMaterialProfile, DEFAULT_THRESHOLDS } from './material-profiles.js';

export class StructuralAnalyzer {
  constructor() {
    this.name = 'structural';
    this._bondResults = new Map();
    this._findings = [];
    this._profile = null;
    this._thresholds = { ...DEFAULT_THRESHOLDS };
  }

  // --- Spatial Grid ---

  _buildSpatialGrid(moves, cellSize) {
    const grid = new Map();
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (!move.extrude) continue;
      const cells = this._rasterizeLine(move.x1, move.y1, move.x2, move.y2, cellSize);
      for (const key of cells) {
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
      }
    }
    return grid;
  }

  _rasterizeLine(x1, y1, x2, y2, cellSize) {
    const cells = new Set();
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) {
      cells.add(this._cellKey(x1, y1, cellSize));
      return cells;
    }
    const steps = Math.max(1, Math.ceil(len / (cellSize * 0.5)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      cells.add(this._cellKey(x, y, cellSize));
    }
    return cells;
  }

  _cellKey(x, y, cellSize) {
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    return `${cx},${cy}`;
  }

  // --- Layer Overlap ---

  _calcOverlap(move, prevGrid, cellSize) {
    if (!move.extrude) return 1.0;
    const cells = this._rasterizeLine(move.x1, move.y1, move.x2, move.y2, cellSize);
    if (cells.size === 0) return 1.0;
    let overlapping = 0;
    for (const key of cells) {
      if (prevGrid.has(key)) overlapping++;
    }
    return overlapping / cells.size;
  }

  // --- Extrusion Consistency ---

  _calcExtrusionConsistency(moves) {
    const flowRates = [];
    const flowIndices = [];
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (!move.extrude || !move.eLength) continue;
      const len = Math.hypot(move.x2 - move.x1, move.y2 - move.y1);
      if (len < 0.001) continue;
      flowRates.push(move.eLength / len);
      flowIndices.push(i);
    }
    if (flowRates.length === 0) return new Map();
    const mean = flowRates.reduce((s, v) => s + v, 0) / flowRates.length;
    if (mean <= 0) return new Map();

    const scores = new Map();
    for (let idx = 0; idx < flowRates.length; idx++) {
      const deviation = Math.abs(flowRates[idx] - mean) / mean;
      scores.set(flowIndices[idx], Math.max(0, 1 - deviation));
    }
    return scores;
  }

  // --- Cooling Time Estimate ---

  _calcCoolingTimes(moves, motionResults) {
    const times = new Map();
    const PROXIMITY_SQ = 4.0; // 2mm radius squared

    for (let i = 0; i < moves.length; i++) {
      if (!moves[i].extrude) continue;
      const mx = (moves[i].x1 + moves[i].x2) / 2;
      const my = (moves[i].y1 + moves[i].y2) / 2;

      let elapsed = 0;
      let found = false;
      for (let j = i + 1; j < moves.length; j++) {
        if (motionResults && motionResults[j]) {
          const r = motionResults[j];
          elapsed += (r.timeAccel || 0) + (r.timeCruise || 0) + (r.timeDecel || 0);
        } else {
          const len = Math.hypot(moves[j].x2 - moves[j].x1, moves[j].y2 - moves[j].y1);
          const speed = (moves[j].feedRate || 1500) / 60;
          elapsed += speed > 0 ? len / speed : 0;
        }
        const jmx = (moves[j].x1 + moves[j].x2) / 2;
        const jmy = (moves[j].y1 + moves[j].y2) / 2;
        const distSq = (jmx - mx) * (jmx - mx) + (jmy - my) * (jmy - my);
        if (distSq < PROXIMITY_SQ && moves[j].extrude) {
          times.set(i, elapsed);
          found = true;
          break;
        }
      }
      if (!found) times.set(i, Infinity);
    }
    return times;
  }

  _coolingScore(time, material) {
    const minTime = material.minLayerTime || 8;
    if (time === Infinity) return 1.0 - (material.coolingSensitivity || 0.5) * 0.3;
    if (time < 1.0) return 0.2;
    if (time < minTime * 0.5) return 0.5;
    if (time > minTime) return 1.0;
    return 0.5 + 0.5 * (time - minTime * 0.5) / (minTime * 0.5);
  }

  // --- Main Analysis ---

  analyze(layerMoves, profile) {
    this._bondResults.clear();
    this._findings = [];
    this._profile = profile;

    const materialType = profile.material?.type || 'PLA';
    const material = getMaterialProfile(materialType, profile.material || {});
    const thresholds = { ...DEFAULT_THRESHOLDS, ...(profile.thresholds || {}) };
    this._thresholds = thresholds;

    const cellSize = 0.8;
    const layerNums = Object.keys(layerMoves).map(Number).sort((a, b) => a - b);
    let prevGrid = null;

    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves || moves.length === 0) continue;

      const grid = this._buildSpatialGrid(moves, cellSize);
      const consistency = this._calcExtrusionConsistency(moves);
      const coolingTimes = this._calcCoolingTimes(moves, null);

      const scores = [];
      for (let i = 0; i < moves.length; i++) {
        if (!moves[i].extrude) {
          scores.push(1.0);
          continue;
        }
        if (prevGrid === null) {
          scores.push(1.0);
          continue;
        }

        const overlap = this._calcOverlap(moves[i], prevGrid, cellSize);
        const consist = consistency.get(i) ?? 1.0;
        const coolTime = coolingTimes.get(i) ?? Infinity;
        const coolScore = this._coolingScore(coolTime, material);

        // Overlap is the primary structural factor. Without material below,
        // consistency and cooling cannot compensate. Gate the score by overlap.
        const baseBond = overlap * 0.5 + consist * 0.25 + coolScore * 0.25;
        const bond = baseBond * Math.min(1, overlap + 0.3);
        scores.push(Math.max(0, Math.min(1, bond)));

        // Generate findings
        const overlapThresh = thresholds['layer-bond-overlap'] || {};
        if (overlap < (overlapThresh.critical ?? 0.30)) {
          this._addFinding('critical', 'layer-bond', layerNum, i, moves[i],
            'Very weak layer bond \u2014 low overlap',
            `Only ${(overlap * 100).toFixed(0)}% of this extrusion overlaps with the layer below.`,
            'Increase extrusion width or adjust perimeter overlap in slicer settings.',
            { overlapPercent: overlap, coolingTime: coolTime });
        } else if (overlap < (overlapThresh.warning ?? 0.60)) {
          this._addFinding('warning', 'layer-bond', layerNum, i, moves[i],
            'Reduced layer bond \u2014 partial overlap',
            `${(overlap * 100).toFixed(0)}% overlap with layer below.`,
            'Consider increasing extrusion width for better inter-layer adhesion.',
            { overlapPercent: overlap, coolingTime: coolTime });
        }

        const coolThresh = thresholds['layer-bond-cooling'] || {};
        if (coolTime < (coolThresh.critical ?? 1.0)) {
          this._addFinding('critical', 'cooling', layerNum, i, moves[i],
            'Insufficient cooling time',
            `Only ${coolTime.toFixed(1)}s before nozzle returns. Risk of deformation.`,
            'Increase minimum layer time or enable "slow down for small layers" in slicer.',
            { coolingTime: coolTime });
        } else if (coolTime < (coolThresh.warning ?? 3.0)) {
          this._addFinding('warning', 'cooling', layerNum, i, moves[i],
            'Short cooling time',
            `${coolTime.toFixed(1)}s before nozzle returns.`,
            'Consider increasing minimum layer time.',
            { coolingTime: coolTime });
        }

        const consistThresh = thresholds['extrusion-consistency'] || {};
        if (consist < (1 - (consistThresh.warning ?? 0.15))) {
          this._addFinding('info', 'extrusion', layerNum, i, moves[i],
            'Inconsistent extrusion',
            `Flow deviation of ${((1 - consist) * 100).toFixed(0)}% from mean.`,
            'Check for partial clog or inconsistent filament diameter.',
            { consistencyScore: consist });
        }
      }

      this._bondResults.set(layerNum, scores);
      prevGrid = grid;
    }

    this._analyzeWallIntegrity(layerMoves, thresholds);
  }

  _addFinding(severity, category, layerNum, moveIndex, move, title, description, suggestion, metadata) {
    const id = `si-${category}-${this._findings.length}`;
    const midX = (move.x1 + move.x2) / 2;
    const midY = (move.y1 + move.y2) / 2;
    this._findings.push({
      id, engine: 'structural', severity, category, title, description, suggestion,
      location: {
        layer: layerNum,
        lineStart: move.lineIndex,
        lineEnd: move.lineIndex,
        xyz: { x: midX, y: midY, z: 0 },
      },
      metadata: metadata || {},
    });
  }

  // --- Wall Integrity ---

  _analyzeWallIntegrity(layerMoves, thresholds) {
    const layerNums = Object.keys(layerMoves).map(Number).sort((a, b) => a - b);

    // Seam Detection
    const seamRadius = thresholds['wall-seam-alignment']?.warning ?? 5.0;
    const seamStarts = [];
    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves) continue;
      const firstExtrusion = moves.find(m => m.extrude);
      if (firstExtrusion) {
        seamStarts.push({ layer: layerNum, x: firstExtrusion.x1, y: firstExtrusion.y1, lineIndex: firstExtrusion.lineIndex });
      }
    }

    if (seamStarts.length >= 3) {
      const clusters = this._clusterPoints(seamStarts, seamRadius);
      for (const cluster of clusters) {
        if (cluster.length >= 3) {
          const avgX = cluster.reduce((s, p) => s + p.x, 0) / cluster.length;
          const avgY = cluster.reduce((s, p) => s + p.y, 0) / cluster.length;
          const layerRange = cluster.map(p => p.layer);
          this._findings.push({
            id: `si-seam-${this._findings.length}`,
            engine: 'structural', severity: 'warning', category: 'seam',
            title: `Aligned seam across ${cluster.length} layers`,
            description: `Seam starts cluster at (${avgX.toFixed(1)}, ${avgY.toFixed(1)}) across layers ${Math.min(...layerRange)}-${Math.max(...layerRange)}. This creates a weak line in the part.`,
            suggestion: 'Enable random or aligned-to-back seam positioning in slicer to distribute weak points.',
            location: {
              layer: cluster[0].layer,
              lineStart: cluster[0].lineIndex,
              lineEnd: cluster[0].lineIndex,
              xyz: { x: avgX, y: avgY, z: 0 },
            },
            metadata: { clusterSize: cluster.length, layerRange },
          });
        }
      }
    }

    // Gap Detection & Direction Reversals
    const gapThresh = thresholds['wall-gap-size'] || { critical: 0.5, warning: 0.2 };
    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves) continue;

      const wallMoves = [];
      for (let i = 0; i < moves.length; i++) {
        const t = (moves[i].type || '').toUpperCase();
        if (moves[i].extrude && (t.includes('WALL') || t.includes('OUTER') || t.includes('INNER') || t.includes('PERIMETER'))) {
          wallMoves.push({ move: moves[i], index: i });
        }
      }

      // Gap detection
      for (let i = 0; i < moves.length - 1; i++) {
        const curr = moves[i];
        const next = moves[i + 1];
        if (curr.extrude && !next.extrude) {
          for (let j = i + 2; j < moves.length; j++) {
            if (moves[j].extrude) {
              const gapDist = Math.hypot(curr.x2 - moves[j].x1, curr.y2 - moves[j].y1);
              const currType = (curr.type || '').toUpperCase();
              const nextType = (moves[j].type || '').toUpperCase();
              const isWallGap = (currType.includes('WALL') || currType.includes('PERIMETER')) &&
                                (nextType.includes('WALL') || nextType.includes('PERIMETER'));
              if (isWallGap && gapDist > (gapThresh.warning ?? 0.2)) {
                const severity = gapDist > (gapThresh.critical ?? 0.5) ? 'critical' : 'warning';
                this._findings.push({
                  id: `si-gap-${this._findings.length}`,
                  engine: 'structural', severity, category: 'gap',
                  title: `Gap in perimeter: ${gapDist.toFixed(1)}mm`,
                  description: `${gapDist.toFixed(2)}mm gap between wall extrusions on layer ${layerNum}.`,
                  suggestion: 'Check slicer settings for gap fill and perimeter overlap.',
                  location: {
                    layer: layerNum,
                    lineStart: curr.lineIndex,
                    lineEnd: moves[j].lineIndex,
                    xyz: { x: curr.x2, y: curr.y2, z: 0 },
                  },
                  metadata: { gapDistance: gapDist },
                });
              }
              break;
            }
          }
        }
      }

      // Direction reversals
      for (let i = 0; i < wallMoves.length - 1; i++) {
        const m1 = wallMoves[i].move;
        const m2 = wallMoves[i + 1].move;
        const dx1 = m1.x2 - m1.x1, dy1 = m1.y2 - m1.y1;
        const dx2 = m2.x2 - m2.x1, dy2 = m2.y2 - m2.y1;
        const len1 = Math.hypot(dx1, dy1);
        const len2 = Math.hypot(dx2, dy2);
        if (len1 < 0.001 || len2 < 0.001) continue;
        const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
        if (angle > 150) {
          this._findings.push({
            id: `si-reversal-${this._findings.length}`,
            engine: 'structural', severity: 'info', category: 'reversal',
            title: `Direction reversal (${angle.toFixed(0)}\u00B0)`,
            description: `Sharp ${angle.toFixed(0)}\u00B0 reversal in wall path on layer ${layerNum}. This creates a stress concentrator.`,
            suggestion: 'This is typically caused by thin features. Consider adjusting minimum feature size in slicer.',
            location: {
              layer: layerNum,
              lineStart: m1.lineIndex,
              lineEnd: m2.lineIndex,
              xyz: { x: m1.x2, y: m1.y2, z: 0 },
            },
            metadata: { angle },
          });
        }
      }
    }
  }

  _clusterPoints(points, radius) {
    const visited = new Set();
    const clusters = [];
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      const cluster = [points[i]];
      visited.add(i);
      for (let j = i + 1; j < points.length; j++) {
        if (visited.has(j)) continue;
        const dist = Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y);
        if (dist <= radius) {
          cluster.push(points[j]);
          visited.add(j);
        }
      }
      clusters.push(cluster);
    }
    return clusters;
  }

  // --- Engine Interface ---

  getSupportedOverlays() {
    return [
      { id: 'layer-bond', label: 'Layer Bond Strength', unit: 'score' },
    ];
  }

  getOverlayData(overlayId, layerNum, moveIndex) {
    if (overlayId !== 'layer-bond') return 0;
    const scores = this._bondResults.get(layerNum);
    if (!scores || moveIndex >= scores.length) return 0;
    return scores[moveIndex];
  }

  getFindings() {
    return this._findings;
  }

  clear() {
    this._bondResults.clear();
    this._findings = [];
  }
}
