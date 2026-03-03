export class RetractionAnalyzer {
  constructor() {
    this.name = 'retraction';
    this._findings = [];
    this._overlayData = new Map(); // "layerNum:moveIndex" -> { retractionDensity, stringingRisk }
    this._retractionEvents = [];   // { lineIndex, type: 'retract'|'deretract', x, y, e }
  }

  // --- Engine Interface ---

  getSupportedOverlays() {
    return [
      { id: 'retraction-density', label: 'Retraction Density', unit: 'count' },
      { id: 'stringing-risk', label: 'Stringing Risk', unit: '' },
    ];
  }

  getOverlayData(overlayId, layerNum, moveIndex) {
    const key = `${layerNum}:${moveIndex}`;
    const data = this._overlayData.get(key);
    if (!data) return 0;
    switch (overlayId) {
      case 'retraction-density': return data.retractionDensity ?? 0;
      case 'stringing-risk': return data.stringingRisk ?? 0;
      default: return 0;
    }
  }

  getFindings() {
    return this._findings;
  }

  clear() {
    this._findings = [];
    this._overlayData.clear();
    this._retractionEvents = [];
  }

  // --- Retraction Event Parsing ---

  /**
   * Parse raw G-code lines to build retraction event timeline.
   * Tracks E position, relative/absolute mode, and X/Y position.
   */
  _parseRetractionEvents(lines) {
    const events = [];
    let currentX = 0;
    let currentY = 0;
    let currentE = 0;
    // Detect E mode: scan for M82/M83 to determine default
    // If M83 found first, use relative. If M82 found first, use absolute.
    // If neither found, default to relative (most slicers use M83).
    let relativeE = true;
    let modeExplicit = false;
    for (const scanLine of lines) {
      const trimScan = scanLine.trim();
      if (trimScan.match(/^M83\b/i)) { relativeE = true; modeExplicit = true; break; }
      if (trimScan.match(/^M82\b/i)) { relativeE = false; modeExplicit = true; break; }
    }
    // If no explicit mode, detect from E value patterns:
    // If we see G1 moves without XY where E values don't follow a negative pattern,
    // assume absolute mode (common in test data and some slicers)
    if (!modeExplicit) {
      let hasNegativeE = false;
      for (const scanLine of lines) {
        const trimScan = scanLine.trim().split(';')[0].trim();
        if (!trimScan.match(/^G[01]\b/i)) continue;
        const eMatch = trimScan.match(/E([-\d.]+)/i);
        if (eMatch && parseFloat(eMatch[1]) < 0) {
          hasNegativeE = true;
          break;
        }
      }
      // If negative E values are present, it's likely relative mode
      // If no negative E values, it's likely absolute mode
      relativeE = hasNegativeE;
    }
    let retracted = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments-only and empty lines
      if (!line || line.startsWith(';')) continue;

      // Strip inline comments
      const cmd = line.split(';')[0].trim();
      if (!cmd) continue;

      // E mode switches
      if (cmd.match(/^M83\b/i)) {
        relativeE = true;
        continue;
      }
      if (cmd.match(/^M82\b/i)) {
        relativeE = false;
        continue;
      }

      // Firmware retraction
      if (cmd.match(/^G10\b/i)) {
        if (!retracted) {
          events.push({
            lineIndex: i,
            type: 'retract',
            x: currentX,
            y: currentY,
          });
          retracted = true;
        }
        continue;
      }

      // Firmware deretraction
      if (cmd.match(/^G11\b/i)) {
        if (retracted) {
          events.push({
            lineIndex: i,
            type: 'deretract',
            x: currentX,
            y: currentY,
          });
          retracted = false;
        }
        continue;
      }

      // G0/G1 moves
      const g01Match = cmd.match(/^G[01]\b/i);
      if (!g01Match) continue;

      // Parse parameters
      const params = {};
      const paramRegex = /([XYEF])([-\d.]+)/gi;
      let m;
      while ((m = paramRegex.exec(cmd)) !== null) {
        params[m[1].toUpperCase()] = parseFloat(m[2]);
      }

      const hasX = 'X' in params;
      const hasY = 'Y' in params;
      const hasE = 'E' in params;

      // Update position
      if (hasX) currentX = params.X;
      if (hasY) currentY = params.Y;

      if (hasE) {
        let eDelta;
        if (relativeE) {
          eDelta = params.E;
          currentE += params.E;
        } else {
          eDelta = params.E - currentE;
          currentE = params.E;
        }

        // Retraction: negative E, no XY movement
        if (eDelta < -0.001 && !hasX && !hasY) {
          if (!retracted) {
            events.push({
              lineIndex: i,
              type: 'retract',
              x: currentX,
              y: currentY,
            });
            retracted = true;
          }
        }
        // Deretraction: positive E, no XY movement (prime move)
        else if (eDelta > 0.001 && !hasX && !hasY) {
          if (retracted) {
            events.push({
              lineIndex: i,
              type: 'deretract',
              x: currentX,
              y: currentY,
            });
            retracted = false;
          }
        }
        // Extrusion with XY = normal printing move, clears retracted state
        else if (eDelta > 0.001 && (hasX || hasY)) {
          if (retracted) {
            // Implicitly deretracted by extrusion move
            retracted = false;
          }
        }
      }
    }

    return events;
  }

  /**
   * Build a Set of lineIndex values where retractions occur, and a Map from
   * lineIndex range to retraction events for fast lookup.
   */
  _buildRetractionIndexMap(events) {
    // Build sorted array for binary search in _hasRetractionBetween
    const indices = [];
    for (const evt of events) {
      if (evt.type === 'retract') {
        indices.push(evt.lineIndex);
      }
    }
    indices.sort((a, b) => a - b);
    return indices;
  }

  /**
   * Check if any retraction event exists between two line indices (exclusive).
   * Uses binary search on sorted array — O(log n) per call.
   */
  _hasRetractionBetween(retractionLineIndices, startLine, endLine) {
    const arr = retractionLineIndices;
    // Binary search for first index > startLine
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= startLine) lo = mid + 1;
      else hi = mid;
    }
    // Check if that index is < endLine
    return lo < arr.length && arr[lo] < endLine;
  }

  // --- Grid Helpers ---

  _cellKey(x, y, cellSize) {
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    return `${cx},${cy}`;
  }

  // --- Main Analysis ---

  analyze(layerMoves, profile) {
    this.clear();

    const lines = profile._parsedLines || [];
    if (lines.length === 0) return;

    // Step 1: Parse retraction events from raw G-code
    const events = this._parseRetractionEvents(lines);
    this._retractionEvents = events;

    // Step 2: Build retraction index lookup
    const retractionLineIndices = this._buildRetractionIndexMap(events);

    // Build a map of deretraction events by lineIndex for blob detection
    const deretractionLineIndices = new Set();
    for (const evt of events) {
      if (evt.type === 'deretract') {
        deretractionLineIndices.add(evt.lineIndex);
      }
    }

    // Step 3: Build retraction event grid for density overlay (cellSize 2mm)
    const cellSize = 2;
    const retractionGrid = new Map(); // cellKey -> count
    for (const evt of events) {
      if (evt.type === 'retract') {
        const key = this._cellKey(evt.x, evt.y, cellSize);
        retractionGrid.set(key, (retractionGrid.get(key) || 0) + 1);
      }
    }

    // Step 4: Walk layerMoves, compute overlays, and detect findings
    const layerNums = Object.keys(layerMoves).map(Number).sort((a, b) => a - b);

    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves || moves.length === 0) continue;

      // Per-layer retraction clustering for excessive-retractions detection
      // Collect retraction events that fall within this layer's line range (once per layer)
      const firstLineIdx = moves[0].lineIndex;
      const lastLineIdx = moves[moves.length - 1].lineIndex;
      const layerRetractionPositions = [];
      for (const evt of events) {
        if (evt.type === 'retract' && evt.lineIndex >= firstLineIdx && evt.lineIndex <= lastLineIdx) {
          layerRetractionPositions.push(evt);
        }
      }

      for (let mi = 0; mi < moves.length; mi++) {
        const move = moves[mi];
        const travelDist = Math.hypot(move.x2 - move.x1, move.y2 - move.y1);

        if (move.extrude) {
          // Extrusion move: compute retraction density
          const midX = (move.x1 + move.x2) / 2;
          const midY = (move.y1 + move.y2) / 2;
          const midKey = this._cellKey(midX, midY, cellSize);

          // Count retractions in nearby cells (3x3 neighborhood)
          const cx = Math.floor(midX / cellSize);
          const cy = Math.floor(midY / cellSize);
          let density = 0;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const neighborKey = `${cx + dx},${cy + dy}`;
              density += retractionGrid.get(neighborKey) || 0;
            }
          }

          this._overlayData.set(`${layerNum}:${mi}`, {
            retractionDensity: density,
            stringingRisk: 0, // extrusion moves have 0 stringing risk
          });
        } else {
          // Travel move: compute stringing risk and check for missing retraction
          // Find preceding extrusion move's lineIndex
          let precedingExtrusionLineIndex = -1;
          for (let pi = mi - 1; pi >= 0; pi--) {
            if (moves[pi].extrude) {
              precedingExtrusionLineIndex = moves[pi].lineIndex;
              break;
            }
          }

          // Check if retracted for this travel
          const travelRetracted = precedingExtrusionLineIndex >= 0 &&
            this._hasRetractionBetween(retractionLineIndices, precedingExtrusionLineIndex, move.lineIndex);

          // Stringing risk: travelDistance * (1 if no retraction, 0.1 if retracted)
          const riskMultiplier = travelRetracted ? 0.1 : 1;
          const stringingRisk = travelDist * riskMultiplier;

          this._overlayData.set(`${layerNum}:${mi}`, {
            retractionDensity: 0,
            stringingRisk,
          });

          // Missing retraction detection
          if (travelDist > 2 && precedingExtrusionLineIndex >= 0 && !travelRetracted) {
            const severity = travelDist > 10 ? 'critical' : 'warning';
            this._addFinding(severity, 'missing-retraction', layerNum, mi, move,
              'Missing retraction before travel move',
              `Travel of ${travelDist.toFixed(1)}mm without retraction on layer ${layerNum}. This may cause stringing.`,
              'Enable retraction in slicer settings or increase retraction trigger distance.',
              { travelDistance: travelDist });
          }
        }

      }

      // Excessive retraction detection: cluster spatially within 5mm radius
      this._detectExcessiveRetractions(layerRetractionPositions, layerNum, moves);

      // Blob/zit prediction
      this._detectBlobRisk(moves, layerNum, events, retractionLineIndices, deretractionLineIndices);
    }
  }

  // --- Finding Detectors ---

  /**
   * Cluster retraction events spatially per layer (within 5mm radius)
   * and flag clusters with > 5 retractions.
   */
  _detectExcessiveRetractions(retractionPositions, layerNum, moves) {
    if (retractionPositions.length <= 5) return;

    // Simple clustering: for each retraction, count others within 5mm
    const radius = 5;
    const visited = new Set();
    const clusters = [];

    for (let i = 0; i < retractionPositions.length; i++) {
      if (visited.has(i)) continue;
      const cluster = [i];
      visited.add(i);

      for (let j = i + 1; j < retractionPositions.length; j++) {
        if (visited.has(j)) continue;
        const dist = Math.hypot(
          retractionPositions[j].x - retractionPositions[i].x,
          retractionPositions[j].y - retractionPositions[i].y
        );
        if (dist <= radius) {
          cluster.push(j);
          visited.add(j);
        }
      }

      if (cluster.length > 5) {
        // Compute cluster center
        let cx = 0, cy = 0;
        for (const idx of cluster) {
          cx += retractionPositions[idx].x;
          cy += retractionPositions[idx].y;
        }
        cx /= cluster.length;
        cy /= cluster.length;

        clusters.push({ cx, cy, count: cluster.length });
      }
    }

    for (const cluster of clusters) {
      // Find nearest move for finding location
      let refMove = moves[0];
      let refMoveIdx = 0;
      let bestDist = Infinity;
      for (let mi = 0; mi < moves.length; mi++) {
        const m = moves[mi];
        const mx = (m.x1 + m.x2) / 2;
        const my = (m.y1 + m.y2) / 2;
        const d = Math.hypot(mx - cluster.cx, my - cluster.cy);
        if (d < bestDist) {
          bestDist = d;
          refMove = m;
          refMoveIdx = mi;
        }
      }

      this._addFinding('warning', 'excessive-retractions', layerNum, refMoveIdx, refMove,
        'Excessive retractions in small area',
        `${cluster.count} retractions clustered within 5mm radius at (${cluster.cx.toFixed(1)}, ${cluster.cy.toFixed(1)}) on layer ${layerNum}. This can cause filament grinding.`,
        'Reduce travel moves in this area or enable combing/avoid-crossing-perimeters in slicer.',
        { count: cluster.count, centerX: cluster.cx, centerY: cluster.cy });
    }
  }

  /**
   * Find deretraction events followed by outer/inner wall extrusion moves.
   * Outer wall = warning, inner wall = info, non-wall = skip.
   */
  _detectBlobRisk(moves, layerNum, events, retractionLineIndices, deretractionLineIndices) {
    for (let mi = 0; mi < moves.length; mi++) {
      const move = moves[mi];

      // Only interested in extrusion moves that follow a travel
      if (!move.extrude) continue;

      // Check if there was a deretraction before this move
      // Look for deretraction between this move's lineIndex and preceding move
      let precedingLineIndex = -1;
      if (mi > 0) {
        precedingLineIndex = moves[mi - 1].lineIndex;
      }

      if (precedingLineIndex < 0) continue;

      // Check if any deretraction event occurred between the preceding move and this one
      let hasDeretraction = false;
      for (const dLineIdx of deretractionLineIndices) {
        if (dLineIdx > precedingLineIndex && dLineIdx <= move.lineIndex) {
          hasDeretraction = true;
          break;
        }
      }

      if (!hasDeretraction) continue;

      // Check move type for wall classification
      const typeUpper = (move.type || '').toUpperCase();
      const isOuterWall = typeUpper.includes('WALL-OUTER') || typeUpper.includes('OUTER');
      const isInnerWall = typeUpper.includes('WALL-INNER') || typeUpper.includes('INNER');

      if (isOuterWall) {
        this._addFinding('warning', 'blob-risk', layerNum, mi, move,
          'Potential blob/zit on outer wall',
          `Deretraction before outer wall extrusion at (${move.x1.toFixed(1)}, ${move.y1.toFixed(1)}) on layer ${layerNum}. This can cause a visible surface defect.`,
          'Use "retract on layer change" and adjust extra restart distance. Consider using z-seam alignment.',
          { wallType: 'outer' });
      } else if (isInnerWall) {
        this._addFinding('info', 'blob-risk', layerNum, mi, move,
          'Potential blob on inner wall',
          `Deretraction before inner wall extrusion at (${move.x1.toFixed(1)}, ${move.y1.toFixed(1)}) on layer ${layerNum}.`,
          'Usually not visible, but consider adjusting extra restart distance if quality issues appear.',
          { wallType: 'inner' });
      }
      // Non-wall types: skip (no finding)
    }
  }

  // --- Finding Helper ---

  _addFinding(severity, category, layerNum, moveIndex, move, title, description, suggestion, metadata) {
    const id = `rt-${category}-${this._findings.length}`;
    const midX = (move.x1 + move.x2) / 2;
    const midY = (move.y1 + move.y2) / 2;
    this._findings.push({
      id,
      engine: 'retraction',
      severity,
      category,
      title,
      description,
      suggestion,
      location: {
        layer: layerNum,
        lineStart: move.lineIndex,
        lineEnd: move.lineIndex,
        xyz: { x: midX, y: midY, z: 0 },
      },
      metadata: metadata || {},
    });
  }
}
