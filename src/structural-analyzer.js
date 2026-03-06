import { MATERIAL_PROFILES, getMaterialProfile, DEFAULT_THRESHOLDS } from './material-profiles.js';

export class StructuralAnalyzer {
  constructor() {
    this.name = 'structural';
    this._bondResults = new Map();
    this._overhangScores = new Map();
    this._bridgeScores = new Map();
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
      const cells = this._rasterizeLineInt(move.x1, move.y1, move.x2, move.y2);
      for (const key of cells) {
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
      }
    }
    return grid;
  }

  _rasterizeLineInt(x1, y1, x2, y2) {
    const { minX, minY, cellSize, gridW, gridH } = this._gridParams;
    const indices = [];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) {
      const idx = this._cellKeyInt(x1, y1);
      if (idx >= 0) indices.push(idx);
      return indices;
    }
    const steps = Math.max(1, Math.ceil(len / (cellSize * 0.5)));
    let lastIdx = -1;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const gx = Math.floor((x1 + dx * t - minX) / cellSize);
      const gy = Math.floor((y1 + dy * t - minY) / cellSize);
      if (gx < 0 || gx >= gridW || gy < 0 || gy >= gridH) continue;
      const idx = gy * gridW + gx;
      if (idx !== lastIdx) {
        indices.push(idx);
        lastIdx = idx;
      }
    }
    return indices;
  }

  _cellKeyInt(x, y) {
    const { minX, minY, cellSize, gridW, gridH } = this._gridParams;
    const gx = Math.floor((x - minX) / cellSize);
    const gy = Math.floor((y - minY) / cellSize);
    if (gx < 0 || gx >= gridW || gy < 0 || gy >= gridH) return -1;
    return gy * gridW + gx;
  }

  // --- Layer Overlap ---

  _calcOverlap(move, prevGrid, cellSize) {
    if (!move.extrude) return 1.0;
    const cells = this._rasterizeLineInt(move.x1, move.y1, move.x2, move.y2);
    if (cells.length === 0) return 1.0;
    let overlapping = 0;
    for (const key of cells) {
      if (prevGrid.has(key)) overlapping++;
    }
    return overlapping / cells.length;
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

  // --- Cooling Time Estimate (inter-layer) ---

  _estimateLayerTime(moves) {
    let total = 0;
    for (const move of moves) {
      const len = Math.hypot(move.x2 - move.x1, move.y2 - move.y1);
      const speed = (move.feedRate || 1500) / 60;
      total += speed > 0 ? len / speed : 0;
    }
    return total;
  }

  _coolingScore(layerTime, material) {
    const minTime = material.minLayerTime || 8;
    if (layerTime < 1.0) return 0.2;
    if (layerTime < minTime * 0.5) return 0.5;
    if (layerTime > minTime) return 1.0;
    return 0.5 + 0.5 * (layerTime - minTime * 0.5) / (minTime * 0.5);
  }

  // --- Fan State Tracking ---

  _parseFanStates(lines) {
    const states = {};
    let currentLayer = -1;
    let currentSpeed = 0;
    let hasFanCommand = false;

    for (const line of lines) {
      const trimmed = line.trim();
      const layerMatch = trimmed.match(/^;LAYER:(\d+)/);
      if (layerMatch) {
        currentLayer = parseInt(layerMatch[1], 10);
        if (hasFanCommand) {
          states[currentLayer] = currentSpeed;
        }
        continue;
      }
      const m106 = trimmed.match(/^M106\s+S([\d.]+)/i);
      if (m106) {
        currentSpeed = parseFloat(m106[1]) / 255;
        hasFanCommand = true;
        if (currentLayer >= 0) {
          states[currentLayer] = currentSpeed;
        }
        continue;
      }
      if (trimmed.match(/^M107/i)) {
        currentSpeed = 0;
        hasFanCommand = true;
        if (currentLayer >= 0) {
          states[currentLayer] = 0;
        }
      }
    }
    return states;
  }

  // --- Main Analysis ---

  analyze(layerMoves, profile) {
    this._bondResults.clear();
    this._findings = [];
    this._gridCache = new Map();
    this._profile = profile;

    const materialType = profile.material?.type || 'PLA';
    const material = getMaterialProfile(materialType, profile.material || {});
    const thresholds = { ...DEFAULT_THRESHOLDS, ...(profile.thresholds || {}) };
    this._thresholds = thresholds;

    const cellSize = 0.8;
    const layerNums = Object.keys(layerMoves).map(Number).sort((a, b) => a - b);

    // Compute global grid bounds for integer cell keys
    let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves) continue;
      for (const m of moves) {
        if (!m.extrude) continue;
        sMinX = Math.min(sMinX, m.x1, m.x2);
        sMinY = Math.min(sMinY, m.y1, m.y2);
        sMaxX = Math.max(sMaxX, m.x1, m.x2);
        sMaxY = Math.max(sMaxY, m.y1, m.y2);
      }
    }
    if (sMinX === Infinity) return; // no extrusions
    const pad = cellSize * 2;
    sMinX -= pad; sMinY -= pad; sMaxX += pad; sMaxY += pad;
    const sGridW = Math.ceil((sMaxX - sMinX) / cellSize) + 1;
    const sGridH = Math.ceil((sMaxY - sMinY) / cellSize) + 1;
    this._gridParams = { minX: sMinX, minY: sMinY, cellSize, gridW: sGridW, gridH: sGridH };

    let prevGrid = null;

    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves || moves.length === 0) continue;

      const grid = this._buildSpatialGrid(moves, cellSize);
      this._gridCache.set(layerNum, grid);
      const consistency = this._calcExtrusionConsistency(moves);
      const layerTime = this._estimateLayerTime(moves);
      const coolScore = this._coolingScore(layerTime, material);

      // Track per-layer aggregates for findings
      let worstOverlap = 1.0;
      let worstOverlapMove = null;
      let worstOverlapIdx = 0;
      let lowOverlapCount = 0;
      let inconsistentCount = 0;
      let worstConsist = 1.0;
      let worstConsistMove = null;

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

        // Overlap is the primary structural factor. Without material below,
        // consistency and cooling cannot compensate. Gate the score by overlap.
        const baseBond = overlap * 0.5 + consist * 0.25 + coolScore * 0.25;
        const bond = baseBond * Math.min(1, overlap + 0.3);
        scores.push(Math.max(0, Math.min(1, bond)));

        // Track worst overlap for layer-level finding
        const overlapThresh = thresholds['layer-bond-overlap'] || {};
        if (overlap < (overlapThresh.warning ?? 0.60)) {
          lowOverlapCount++;
          if (overlap < worstOverlap) {
            worstOverlap = overlap;
            worstOverlapMove = moves[i];
            worstOverlapIdx = i;
          }
        }

        // Track worst consistency for layer-level finding
        const consistThresh = thresholds['extrusion-consistency'] || {};
        if (consist < (1 - (consistThresh.warning ?? 0.15))) {
          inconsistentCount++;
          if (consist < worstConsist) {
            worstConsist = consist;
            worstConsistMove = moves[i];
          }
        }
      }

      this._bondResults.set(layerNum, scores);

      // Generate aggregated per-layer findings (not per-move)
      if (worstOverlapMove) {
        const overlapThresh = thresholds['layer-bond-overlap'] || {};
        const severity = worstOverlap < (overlapThresh.critical ?? 0.30) ? 'critical' : 'warning';
        this._addFinding(severity, 'layer-bond', layerNum, worstOverlapIdx, worstOverlapMove,
          severity === 'critical' ? 'Very weak layer bond' : 'Reduced layer bond',
          `Layer ${layerNum}: ${lowOverlapCount} extrusions with low overlap (worst: ${(worstOverlap * 100).toFixed(0)}%).`,
          'Increase extrusion width or adjust perimeter overlap in slicer settings.',
          { overlapPercent: worstOverlap, affectedMoves: lowOverlapCount });
      }

      // One cooling finding per layer (inter-layer: total layer time)
      const coolThresh = thresholds['layer-bond-cooling'] || {};
      if (layerTime < (coolThresh.critical ?? 1.0) && prevGrid !== null) {
        const refMove = moves.find(m => m.extrude) || moves[0];
        this._addFinding('critical', 'cooling', layerNum, 0, refMove,
          'Insufficient layer cooling time',
          `Layer ${layerNum} completes in ${layerTime.toFixed(1)}s — risk of deformation before material solidifies.`,
          'Increase minimum layer time or enable "slow down for small layers" in slicer.',
          { layerTime });
      } else if (layerTime < (coolThresh.warning ?? 3.0) && prevGrid !== null) {
        const refMove = moves.find(m => m.extrude) || moves[0];
        this._addFinding('warning', 'cooling', layerNum, 0, refMove,
          'Short layer cooling time',
          `Layer ${layerNum} completes in ${layerTime.toFixed(1)}s.`,
          'Consider increasing minimum layer time.',
          { layerTime });
      }

      if (worstConsistMove && inconsistentCount > 0) {
        this._addFinding('info', 'extrusion', layerNum, 0, worstConsistMove,
          'Inconsistent extrusion',
          `Layer ${layerNum}: ${inconsistentCount} moves with flow deviation >${((thresholds['extrusion-consistency']?.warning ?? 0.15) * 100).toFixed(0)}% (worst: ${((1 - worstConsist) * 100).toFixed(0)}%).`,
          'Check for partial clog or inconsistent filament diameter.',
          { worstConsistency: worstConsist, affectedMoves: inconsistentCount });
      }

      prevGrid = grid;
    }

    // Merge consecutive layer-bond findings into ranges
    this._mergeConsecutiveFindings('layer-bond');
    this._mergeConsecutiveFindings('cooling');
    this._mergeConsecutiveFindings('extrusion');

    this._analyzeWallIntegrity(layerMoves, thresholds);
    this._analyzeOverhangs(layerMoves, thresholds, profile);
  }

  _mergeConsecutiveFindings(category) {
    const catFindings = this._findings.filter(f => f.category === category);
    if (catFindings.length <= 3) return; // not worth merging

    const other = this._findings.filter(f => f.category !== category);

    // Sort by layer
    catFindings.sort((a, b) => a.location.layer - b.location.layer);

    // Group consecutive layers into ranges
    const groups = [];
    let group = [catFindings[0]];
    for (let i = 1; i < catFindings.length; i++) {
      const prevLayer = catFindings[i - 1].location.layer;
      const currLayer = catFindings[i].location.layer;
      if (currLayer - prevLayer <= 2) {
        group.push(catFindings[i]);
      } else {
        groups.push(group);
        group = [catFindings[i]];
      }
    }
    groups.push(group);

    // Create merged findings
    const merged = [];
    for (const g of groups) {
      if (g.length === 1) {
        merged.push(g[0]);
        continue;
      }
      const worst = g.reduce((w, f) => {
        if (f.severity === 'critical') return f;
        if (f.severity === 'warning' && w.severity !== 'critical') return f;
        return w;
      }, g[0]);
      const startLayer = g[0].location.layer;
      const endLayer = g[g.length - 1].location.layer;
      merged.push({
        ...worst,
        id: `si-${category}-merged-${merged.length}`,
        title: worst.title,
        description: `Layers ${startLayer}\u2013${endLayer}: ${worst.description.replace(/^Layer \d+: /, '')}`,
        location: { ...worst.location, layer: startLayer },
        metadata: { ...worst.metadata, layerRange: [startLayer, endLayer], mergedCount: g.length },
      });
    }

    this._findings = [...other, ...merged];
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

    // Gap Detection & Direction Reversals (aggregated per layer)
    const gapThresh = thresholds['wall-gap-size'] || { critical: 0.5, warning: 0.2 };
    const allGaps = [];
    const allReversals = [];

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

      // Gap detection — collect per layer, emit one finding
      // Max gap distance: anything larger is a travel between separate wall features, not a gap
      const MAX_GAP_DIST = 3.0; // mm — real gaps are sub-mm to ~2mm
      let worstGap = 0;
      let worstGapMove = null;
      let worstGapEnd = null;
      let gapCount = 0;
      for (let i = 0; i < moves.length - 1; i++) {
        const curr = moves[i];
        const next = moves[i + 1];
        if (curr.extrude && !next.extrude) {
          for (let j = i + 2; j < moves.length; j++) {
            if (moves[j].extrude) {
              const gapDist = Math.hypot(curr.x2 - moves[j].x1, curr.y2 - moves[j].y1);
              if (gapDist > MAX_GAP_DIST) break; // travel between separate features, not a gap
              const currType = (curr.type || '').toUpperCase();
              const nextType = (moves[j].type || '').toUpperCase();
              const isWallGap = (currType.includes('WALL') || currType.includes('PERIMETER')) &&
                                (nextType.includes('WALL') || nextType.includes('PERIMETER'));
              if (isWallGap && gapDist > (gapThresh.warning ?? 0.2)) {
                gapCount++;
                if (gapDist > worstGap) {
                  worstGap = gapDist;
                  worstGapMove = curr;
                  worstGapEnd = moves[j];
                }
              }
              break;
            }
          }
        }
      }
      if (gapCount > 0 && worstGapMove) {
        allGaps.push({ layerNum, gapCount, worstGap, move: worstGapMove, endMove: worstGapEnd });
      }

      // Direction reversals — count per layer
      let reversalCount = 0;
      let worstAngle = 0;
      let worstReversalMove = null;
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
          reversalCount++;
          if (angle > worstAngle) {
            worstAngle = angle;
            worstReversalMove = m1;
          }
        }
      }
      if (reversalCount > 0 && worstReversalMove) {
        allReversals.push({ layerNum, reversalCount, worstAngle, move: worstReversalMove });
      }
    }

    // Emit gap findings — merge consecutive layers into ranges
    this._emitMergedWallFindings(allGaps, 'gap', gapThresh,
      (g) => g.worstGap > (gapThresh.critical ?? 0.5) ? 'critical' : 'warning',
      (layers, worst) => `Perimeter gaps across layers ${layers} (worst: ${worst.worstGap.toFixed(1)}mm, ${worst.gapCount} gaps)`,
      'Check slicer settings for gap fill and perimeter overlap.');

    // Emit reversal findings — merge consecutive layers into ranges
    this._emitMergedWallFindings(allReversals, 'reversal', {},
      () => 'info',
      (layers, worst) => `Direction reversals across layers ${layers} (${worst.reversalCount} reversals, sharpest: ${worst.worstAngle.toFixed(0)}\u00B0)`,
      'Typically caused by thin features. Consider adjusting minimum feature size in slicer.');
  }

  _emitMergedWallFindings(items, category, thresholds, severityFn, descFn, suggestion) {
    if (items.length === 0) return;

    // Group consecutive layers (within 2 layers of each other)
    const groups = [];
    let group = [items[0]];
    for (let i = 1; i < items.length; i++) {
      if (items[i].layerNum - items[i - 1].layerNum <= 2) {
        group.push(items[i]);
      } else {
        groups.push(group);
        group = [items[i]];
      }
    }
    groups.push(group);

    for (const g of groups) {
      const worst = g.reduce((w, item) => {
        if (category === 'gap') return item.worstGap > w.worstGap ? item : w;
        return item.worstAngle > w.worstAngle ? item : w;
      }, g[0]);
      const startLayer = g[0].layerNum;
      const endLayer = g[g.length - 1].layerNum;
      const layerStr = startLayer === endLayer ? `${startLayer}` : `${startLayer}\u2013${endLayer}`;
      const severity = severityFn(worst);
      const move = worst.move;

      this._findings.push({
        id: `si-${category}-${this._findings.length}`,
        engine: 'structural', severity, category,
        title: category === 'gap' ? `Perimeter gaps: layers ${layerStr}` : `Direction reversals: layers ${layerStr}`,
        description: descFn(layerStr, worst),
        suggestion,
        location: {
          layer: startLayer,
          lineStart: move.lineIndex,
          lineEnd: move.lineIndex,
          xyz: { x: move.x2, y: move.y2, z: 0 },
        },
        metadata: { layerRange: [startLayer, endLayer], mergedCount: g.length },
      });
    }
  }

  // --- Overhang & Bridge Detection ---

  _analyzeOverhangs(layerMoves, thresholds, profile) {
    const cellSize = 0.8;
    const layerNums = Object.keys(layerMoves).map(Number).sort((a, b) => a - b);
    let prevGrid = null;
    let prevGapDepth = new Map();

    // Parse fan states and material for risk formula
    let fanStates = {};
    if (profile && profile._parsedLines) {
      fanStates = this._parseFanStates(profile._parsedLines);
    }
    const materialType = profile?.material?.type || 'PLA';
    const material = getMaterialProfile(materialType, profile?.material || {});
    const MAX_GAP_DEPTH = 8;
    const MAX_SAFE_SPAN = 50;
    const optimalSpeed = material.optimalBridgeSpeed || 20;

    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves || moves.length === 0) continue;

      const grid = this._gridCache.get(layerNum) || this._buildSpatialGrid(moves, cellSize);

      if (prevGrid === null) {
        const zeros = moves.map(() => 0);
        this._overhangScores.set(layerNum, zeros);
        this._bridgeScores.set(layerNum, zeros);
        prevGrid = grid;
        continue;
      }

      const overhangScores = [];
      const bridgeScores = [];
      const currentGapDepth = new Map();
      let worstOverhang = 0;
      let worstOverhangMove = null;
      let worstOverhangIdx = 0;
      let highOverhangCount = 0;
      const bridgeRun = [];

      // Fan speed for this layer (walk back to find most recent setting)
      let fanSpeed = 0;
      for (let l = layerNum; l >= 0; l--) {
        if (fanStates[l] !== undefined) { fanSpeed = fanStates[l]; break; }
      }

      const coolingFactor = fanSpeed * (material.coolingSensitivity || 0.5);
      const materialPenalty = 1 - (material.adhesionCoefficient || 0.7);

      for (let i = 0; i < moves.length; i++) {
        if (!moves[i].extrude) {
          overhangScores.push(0);
          bridgeScores.push(0);
          if (bridgeRun.length > 0) {
            this._emitBridgeFinding(layerNum, bridgeRun);
            bridgeRun.length = 0;
          }
          continue;
        }

        const cells = this._rasterizeLineInt(moves[i].x1, moves[i].y1, moves[i].x2, moves[i].y2);

        let overlapping = 0;
        if (cells.length > 0) {
          for (const key of cells) {
            if (prevGrid.has(key)) overlapping++;
          }
        }
        const overlap = cells.length > 0 ? overlapping / cells.length : 1.0;
        const overhang = 1 - overlap;
        overhangScores.push(overhang);

        // Per-cell gap depth
        for (const cell of cells) {
          const hasBelow = prevGrid.has(cell);
          const prevDepth = prevGapDepth.get(cell) || 0;
          let depth;
          if (hasBelow && prevDepth === 0) {
            depth = 0;
          } else if (!hasBelow) {
            depth = Math.min(prevDepth + 1, MAX_GAP_DEPTH);
          } else {
            depth = Math.min(prevDepth + 1, MAX_GAP_DEPTH);
          }
          currentGapDepth.set(cell, depth);
        }

        // Compute unsupported span along this move's path
        const { spanMm, avgRunDepth } = this._unsupportedSpan(cells, currentGapDepth);

        if (spanMm < 2) {
          bridgeScores.push(0);
          if (bridgeRun.length > 0) {
            this._emitBridgeFinding(layerNum, bridgeRun);
            bridgeRun.length = 0;
          }
        } else {
          const moveSpeed = (moves[i].feedRate || 1500) / 60;
          const speedRatio = moveSpeed / optimalSpeed;
          const speedPenalty = Math.min(1, Math.abs(speedRatio - 1) * 0.8);

          const spanFactor = Math.min(1, spanMm / MAX_SAFE_SPAN);
          const depthFactor = Math.min(1, avgRunDepth / MAX_GAP_DEPTH);

          const risk = spanFactor * 0.35
                     + depthFactor * 0.25
                     + (1 - coolingFactor) * 0.20
                     + materialPenalty * 0.10
                     + speedPenalty * 0.10;

          bridgeScores.push(Math.min(1, risk));

          // Only track bridge runs for wall/perimeter moves, not infill
          const bType = (moves[i].type || '').toUpperCase();
          const bIsInfill = bType.includes('FILL') || bType.includes('SPARSE')
            || bType.includes('GRID') || bType.includes('GYROID')
            || bType.includes('HONEYCOMB') || bType.includes('LIGHTNING')
            || bType === 'SOLID' || bType === 'TOP' || bType === 'BOTTOM';
          if (spanMm > 5 && !bIsInfill) {
            bridgeRun.push({ move: moves[i], index: i });
          } else {
            if (bridgeRun.length > 0) {
              this._emitBridgeFinding(layerNum, bridgeRun);
              bridgeRun.length = 0;
            }
          }
        }

        if (overhang > 0.4) {
          // Skip infill/solid-fill moves — cross-hatch infill alternates angles
          // between layers by design, so grid overlap is naturally low but NOT
          // an overhang. Also skip top/bottom surfaces (same pattern, just denser).
          const mType = (moves[i].type || '').toUpperCase();
          const isInfill = mType.includes('FILL') || mType.includes('SPARSE')
            || mType.includes('GRID') || mType.includes('GYROID')
            || mType.includes('HONEYCOMB') || mType.includes('LIGHTNING')
            || mType === 'SOLID' || mType === 'TOP' || mType === 'BOTTOM';
          if (!isInfill) {
            highOverhangCount++;
            if (overhang > worstOverhang) {
              worstOverhang = overhang;
              worstOverhangMove = moves[i];
              worstOverhangIdx = i;
            }
          }
        }
      }

      if (bridgeRun.length > 0) {
        this._emitBridgeFinding(layerNum, bridgeRun);
      }

      this._overhangScores.set(layerNum, overhangScores);
      this._bridgeScores.set(layerNum, bridgeScores);

      if (worstOverhangMove && worstOverhang > 0.4) {
        const severity = worstOverhang > 0.75 ? 'critical' : worstOverhang > 0.6 ? 'warning' : 'info';
        this._addFinding(severity, 'overhang', layerNum, worstOverhangIdx, worstOverhangMove,
          severity === 'critical' ? 'Severe overhang' : severity === 'warning' ? 'Significant overhang' : 'Moderate overhang',
          `Layer ${layerNum}: ${highOverhangCount} moves with >${(0.4 * 100).toFixed(0)}% overhang (worst: ${(worstOverhang * 100).toFixed(0)}% unsupported).`,
          worstOverhang > 0.6 ? 'Add supports or reorient the model to reduce overhang angle.' : 'Minor overhang — likely printable with adequate cooling.',
          { worstOverhang, affectedMoves: highOverhangCount });
      }

      prevGrid = grid;
      prevGapDepth = currentGapDepth;
    }

    this._mergeConsecutiveFindings('overhang');
    this._mergeConsecutiveFindings('bridge');
  }

  _nearestSupportDist(x, y, gapDepthMap) {
    const { minX, minY, cellSize, gridW, gridH } = this._gridParams;
    const startGx = Math.floor((x - minX) / cellSize);
    const startGy = Math.floor((y - minY) / cellSize);
    if (startGx < 0 || startGx >= gridW || startGy < 0 || startGy >= gridH) return 0;

    const startIdx = startGy * gridW + startGx;
    if (!gapDepthMap.has(startIdx) || gapDepthMap.get(startIdx) === 0) return 0;

    const maxSteps = Math.ceil(60 / cellSize);
    const visited = new Set();
    visited.add(startIdx);
    let queue = [startIdx];
    let dist = 0;

    while (queue.length > 0 && dist < maxSteps) {
      dist++;
      const next = [];
      for (const idx of queue) {
        const gy = Math.floor(idx / gridW);
        const gx = idx - gy * gridW;
        const neighbors = [
          gx > 0 ? idx - 1 : -1,
          gx < gridW - 1 ? idx + 1 : -1,
          gy > 0 ? idx - gridW : -1,
          gy < gridH - 1 ? idx + gridW : -1,
        ];
        for (const nIdx of neighbors) {
          if (nIdx < 0 || visited.has(nIdx)) continue;
          visited.add(nIdx);
          if (!gapDepthMap.has(nIdx) || gapDepthMap.get(nIdx) === 0) {
            return dist * cellSize;
          }
          next.push(nIdx);
        }
      }
      queue = next;
    }

    return maxSteps * cellSize;
  }

  _unsupportedSpan(cells, gapDepthMap) {
    let maxRun = 0;
    let maxRunDepthSum = 0;
    let currentRun = 0;
    let currentDepthSum = 0;

    for (const cell of cells) {
      const depth = gapDepthMap.get(cell) || 0;
      if (depth > 0) {
        currentRun++;
        currentDepthSum += depth;
      } else {
        if (currentRun > maxRun) {
          maxRun = currentRun;
          maxRunDepthSum = currentDepthSum;
        }
        currentRun = 0;
        currentDepthSum = 0;
      }
    }
    if (currentRun > maxRun) {
      maxRun = currentRun;
      maxRunDepthSum = currentDepthSum;
    }

    const cellSize = this._gridParams.cellSize;
    return {
      spanMm: maxRun * cellSize,
      avgRunDepth: maxRun > 0 ? maxRunDepthSum / maxRun : 0,
    };
  }

  _emitBridgeFinding(layerNum, run) {
    let totalSpan = 0;
    for (const r of run) {
      totalSpan += Math.hypot(r.move.x2 - r.move.x1, r.move.y2 - r.move.y1);
    }
    if (totalSpan < 2) return; // ignore tiny gaps

    const severity = totalSpan > 50 ? 'critical' : totalSpan > 20 ? 'warning' : 'info';
    const midRun = run[Math.floor(run.length / 2)];
    this._addFinding(severity, 'bridge', layerNum, midRun.index, midRun.move,
      `Bridge span: ${totalSpan.toFixed(1)}mm`,
      `Layer ${layerNum}: ${run.length} unsupported moves spanning ${totalSpan.toFixed(1)}mm.`,
      totalSpan > 20 ? 'Reduce bridge length, add supports, or increase cooling for bridge layers.' : 'Short bridge — likely printable with adequate cooling.',
      { spanLength: totalSpan, moveCount: run.length });
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
      { id: 'layer-bond', label: 'Layer Bond Strength', unit: '%' },
      { id: 'overhang-severity', label: 'Overhang Severity', unit: '%' },
      { id: 'bridge', label: 'Bridge Risk', unit: '%' },
    ];
  }

  getOverlayData(overlayId, layerNum, moveIndex) {
    if (overlayId === 'overhang-severity') {
      const scores = this._overhangScores.get(layerNum);
      if (!scores || moveIndex >= scores.length) return 0;
      return scores[moveIndex];
    }
    if (overlayId === 'bridge') {
      const scores = this._bridgeScores.get(layerNum);
      if (!scores || moveIndex >= scores.length) return 0;
      return scores[moveIndex];
    }
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
    this._overhangScores.clear();
    this._bridgeScores.clear();
    this._findings = [];
    this._gridCache = null;
  }

  // --- Async Analysis (non-blocking, yields between phases) ---

  async analyzeAsync(layerMoves, profile, onProgress) {
    this._bondResults.clear();
    this._findings = [];
    this._gridCache = new Map();
    this._profile = profile;

    const materialType = profile.material?.type || 'PLA';
    const material = getMaterialProfile(materialType, profile.material || {});
    const thresholds = { ...DEFAULT_THRESHOLDS, ...(profile.thresholds || {}) };
    this._thresholds = thresholds;

    const cellSize = 0.8;
    const layerNums = Object.keys(layerMoves).map(Number).sort((a, b) => a - b);

    // Compute global grid bounds for integer cell keys
    let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves) continue;
      for (const m of moves) {
        if (!m.extrude) continue;
        sMinX = Math.min(sMinX, m.x1, m.x2);
        sMinY = Math.min(sMinY, m.y1, m.y2);
        sMaxX = Math.max(sMaxX, m.x1, m.x2);
        sMaxY = Math.max(sMaxY, m.y1, m.y2);
      }
    }
    if (sMinX === Infinity) return;
    const pad = cellSize * 2;
    sMinX -= pad; sMinY -= pad; sMaxX += pad; sMaxY += pad;
    const sGridW = Math.ceil((sMaxX - sMinX) / cellSize) + 1;
    const sGridH = Math.ceil((sMaxY - sMinY) / cellSize) + 1;
    this._gridParams = { minX: sMinX, minY: sMinY, cellSize, gridW: sGridW, gridH: sGridH };

    // Main bond analysis loop with yields
    let prevGrid = null;
    let layerIdx = 0;

    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves || moves.length === 0) { layerIdx++; continue; }

      const grid = this._buildSpatialGrid(moves, cellSize);
      this._gridCache.set(layerNum, grid);
      const consistency = this._calcExtrusionConsistency(moves);
      const layerTime = this._estimateLayerTime(moves);
      const coolScore = this._coolingScore(layerTime, material);

      let worstOverlap = 1.0;
      let worstOverlapMove = null;
      let worstOverlapIdx = 0;
      let lowOverlapCount = 0;
      let inconsistentCount = 0;
      let worstConsist = 1.0;
      let worstConsistMove = null;

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

        const baseBond = overlap * 0.5 + consist * 0.25 + coolScore * 0.25;
        const bond = baseBond * Math.min(1, overlap + 0.3);
        scores.push(Math.max(0, Math.min(1, bond)));

        const overlapThresh = thresholds['layer-bond-overlap'] || {};
        if (overlap < (overlapThresh.warning ?? 0.60)) {
          lowOverlapCount++;
          if (overlap < worstOverlap) {
            worstOverlap = overlap;
            worstOverlapMove = moves[i];
            worstOverlapIdx = i;
          }
        }

        const consistThresh = thresholds['extrusion-consistency'] || {};
        if (consist < (1 - (consistThresh.warning ?? 0.15))) {
          inconsistentCount++;
          if (consist < worstConsist) {
            worstConsist = consist;
            worstConsistMove = moves[i];
          }
        }
      }

      this._bondResults.set(layerNum, scores);

      if (worstOverlapMove) {
        const overlapThresh = thresholds['layer-bond-overlap'] || {};
        const severity = worstOverlap < (overlapThresh.critical ?? 0.30) ? 'critical' : 'warning';
        this._addFinding(severity, 'layer-bond', layerNum, worstOverlapIdx, worstOverlapMove,
          severity === 'critical' ? 'Very weak layer bond' : 'Reduced layer bond',
          `Layer ${layerNum}: ${lowOverlapCount} extrusions with low overlap (worst: ${(worstOverlap * 100).toFixed(0)}%).`,
          'Increase extrusion width or adjust perimeter overlap in slicer settings.',
          { overlapPercent: worstOverlap, affectedMoves: lowOverlapCount });
      }

      const coolThresh = thresholds['layer-bond-cooling'] || {};
      if (layerTime < (coolThresh.critical ?? 1.0) && prevGrid !== null) {
        const refMove = moves.find(m => m.extrude) || moves[0];
        this._addFinding('critical', 'cooling', layerNum, 0, refMove,
          'Insufficient layer cooling time',
          `Layer ${layerNum} completes in ${layerTime.toFixed(1)}s — risk of deformation before material solidifies.`,
          'Increase minimum layer time or enable "slow down for small layers" in slicer.',
          { layerTime });
      } else if (layerTime < (coolThresh.warning ?? 3.0) && prevGrid !== null) {
        const refMove = moves.find(m => m.extrude) || moves[0];
        this._addFinding('warning', 'cooling', layerNum, 0, refMove,
          'Short layer cooling time',
          `Layer ${layerNum} completes in ${layerTime.toFixed(1)}s.`,
          'Consider increasing minimum layer time.',
          { layerTime });
      }

      if (worstConsistMove && inconsistentCount > 0) {
        this._addFinding('info', 'extrusion', layerNum, 0, worstConsistMove,
          'Inconsistent extrusion',
          `Layer ${layerNum}: ${inconsistentCount} moves with flow deviation >${((thresholds['extrusion-consistency']?.warning ?? 0.15) * 100).toFixed(0)}% (worst: ${((1 - worstConsist) * 100).toFixed(0)}%).`,
          'Check for partial clog or inconsistent filament diameter.',
          { worstConsistency: worstConsist, affectedMoves: inconsistentCount });
      }

      prevGrid = grid;

      // Yield every 50 layers
      if (layerIdx % 50 === 49) {
        if (onProgress) onProgress(layerIdx / layerNums.length * 0.5);
        await new Promise(r => setTimeout(r, 0));
      }
      layerIdx++;
    }

    // Merge findings
    this._mergeConsecutiveFindings('layer-bond');
    this._mergeConsecutiveFindings('cooling');
    this._mergeConsecutiveFindings('extrusion');

    if (onProgress) onProgress(0.6);
    await new Promise(r => setTimeout(r, 0));

    // Wall integrity (sync, fast)
    this._analyzeWallIntegrity(layerMoves, thresholds);

    if (onProgress) onProgress(0.7);
    await new Promise(r => setTimeout(r, 0));

    // Overhangs (uses cached grids, so fast)
    this._analyzeOverhangs(layerMoves, thresholds, profile);

    if (onProgress) onProgress(1.0);
  }
}
