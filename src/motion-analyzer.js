// ===== MOTION ANALYZER =====
export class MotionAnalyzer {
  constructor(profile = {}) {
    this.profile = {
      acceleration: profile.acceleration ?? 500,      // mm/s² (M204 P)
      travelAccel: profile.travelAccel ?? 1000,       // mm/s² (M204 T)
      jerk: profile.jerk ?? 8,                        // mm/s^3 (M205 X/Y)
      junctionDeviation: profile.junctionDeviation ?? null,
      maxVelocity: profile.maxVelocity ?? 500,        // mm/s
      firmwareType: profile.firmwareType ?? 'marlin',
      headMass: profile.headMass ?? null,
      gantryType: profile.gantryType ?? 'cartesian',
    };
    this.results = new Map();
    this._findings = [];
    this._layerTimes = new Map();
    this._timeSummary = null;
  }

  static inferProfile(lines) {
    const profile = {
      acceleration: 500,
      travelAccel: 1000,
      jerk: 8,
      junctionDeviation: null,
      maxVelocity: 500,
      firmwareType: 'marlin',
    };

    const scanLimit = Math.min(200, lines.length);

    for (let i = 0; i < scanLimit; i++) {
      const line = lines[i].trim();

      // M204 - Set acceleration (Marlin/RRF)
      if (/^M204\s/.test(line)) {
        const pMatch = line.match(/P([\d.]+)/i);
        const tMatch = line.match(/T([\d.]+)/i);
        const sMatch = line.match(/S([\d.]+)/i);
        if (pMatch) profile.acceleration = parseFloat(pMatch[1]);
        if (tMatch) profile.travelAccel = parseFloat(tMatch[1]);
        if (sMatch) {
          profile.acceleration = parseFloat(sMatch[1]);
          profile.travelAccel = parseFloat(sMatch[1]);
        }
      }

      // M205 - Set jerk (Marlin)
      if (/^M205\s/.test(line)) {
        const xMatch = line.match(/X([\d.]+)/i);
        const yMatch = line.match(/Y([\d.]+)/i);
        if (xMatch) profile.jerk = parseFloat(xMatch[1]);
        else if (yMatch) profile.jerk = parseFloat(yMatch[1]);

        const jMatch = line.match(/J([\d.]+)/i);
        if (jMatch) profile.junctionDeviation = parseFloat(jMatch[1]);
      }

      // M203 - Set max feedrate
      if (/^M203\s/.test(line)) {
        const xMatch = line.match(/X([\d.]+)/i);
        if (xMatch) profile.maxVelocity = parseFloat(xMatch[1]);
      }

      // Klipper: SET_VELOCITY_LIMIT
      if (/^SET_VELOCITY_LIMIT\s/i.test(line)) {
        profile.firmwareType = 'klipper';
        const accelMatch = line.match(/ACCEL=([\d.]+)/i);
        if (accelMatch) {
          profile.acceleration = parseFloat(accelMatch[1]);
          profile.travelAccel = parseFloat(accelMatch[1]);
        }
        const sqCornerMatch = line.match(/SQUARE_CORNER_VELOCITY=([\d.]+)/i);
        if (sqCornerMatch) {
          const scv = parseFloat(sqCornerMatch[1]);
          profile.junctionDeviation = (scv * scv) / (2 * profile.acceleration);
        }
      }
    }

    return profile;
  }

  /**
   * Calculate maximum achievable velocity for a segment.
   * Uses kinematic equation: v² = v₀² + 2ad
   * @param {number} distance - Segment length in mm
   * @param {number} entryVelocity - Starting velocity in mm/s
   * @param {number} requestedVelocity - Target velocity in mm/s
   * @returns {number} Maximum achievable velocity in mm/s
   */
  calcMaxVelocity(distance, entryVelocity, requestedVelocity) {
    if (distance <= 0) return entryVelocity;

    const accel = this.profile.acceleration;
    // v² = v₀² + 2ad
    const maxFromAccel = Math.sqrt(entryVelocity * entryVelocity + 2 * accel * distance);

    // Cap at requested velocity and max velocity
    return Math.min(maxFromAccel, requestedVelocity, this.profile.maxVelocity);
  }

  /**
   * Calculate maximum junction velocity between two moves.
   * Based on the angle between moves and jerk/junction deviation setting.
   * @param {Object} move1 - First move {x1, y1, x2, y2}
   * @param {Object} move2 - Second move {x1, y1, x2, y2}
   * @param {number} requestedVelocity - Current velocity in mm/s
   * @returns {number} Maximum junction velocity in mm/s
   */
  calcJunctionVelocity(move1, move2, requestedVelocity) {
    const dx1 = move1.x2 - move1.x1;
    const dy1 = move1.y2 - move1.y1;
    const dx2 = move2.x2 - move2.x1;
    const dy2 = move2.y2 - move2.y1;

    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);

    if (len1 < 0.001 || len2 < 0.001) return 0;

    const ux1 = dx1 / len1, uy1 = dy1 / len1;
    const ux2 = dx2 / len2, uy2 = dy2 / len2;

    const dot = ux1 * ux2 + uy1 * uy2;
    const cosAngle = Math.max(-1, Math.min(1, dot));

    if (cosAngle > 0.999) return requestedVelocity;

    const deltaV = Math.hypot(ux2 - ux1, uy2 - uy1);

    if (this.profile.junctionDeviation !== null) {
      const halfAngle = Math.acos(cosAngle) / 2;
      const sinHalf = Math.sin(halfAngle);
      if (sinHalf > 0.999) return 0;
      const jv = Math.sqrt(
        this.profile.junctionDeviation * this.profile.acceleration * sinHalf / (1 - sinHalf)
      );
      return Math.min(jv, requestedVelocity);
    } else {
      if (deltaV < 0.001) return requestedVelocity;
      const jv = this.profile.jerk / deltaV;
      return Math.min(jv, requestedVelocity);
    }
  }

  /**
   * Analyze an array of moves and compute actual motion profiles.
   * @param {Array} moves - Array of move objects from parser
   * @returns {Array} Array of result objects with actual velocities
   */
  analyzeMoves(moves) {
    if (!moves || moves.length === 0) return [];

    const results = [];

    // First pass: Calculate requested speeds and segment lengths
    for (const move of moves) {
      const dx = move.x2 - move.x1;
      const dy = move.y2 - move.y1;
      const distance = Math.hypot(dx, dy);
      const requestedSpeed = (move.feedRate || 1500) / 60;

      results.push({
        move,
        distance,
        requestedSpeed,
        maxPeakSpeed: requestedSpeed,
        entrySpeed: 0,
        exitSpeed: 0,
        actualPeakSpeed: 0,
        timeAccel: 0,
        timeCruise: 0,
        timeDecel: 0,
      });
    }

    // Calculate junction velocities
    for (let i = 0; i < results.length - 1; i++) {
      const jv = this.calcJunctionVelocity(moves[i], moves[i + 1], results[i].requestedSpeed);
      results[i].maxExitSpeed = jv;
      results[i + 1].maxEntrySpeed = jv;
    }
    results[0].maxEntrySpeed = 0;
    results[results.length - 1].maxExitSpeed = 0;

    // Backward pass: Propagate deceleration constraints
    for (let i = results.length - 1; i >= 0; i--) {
      const r = results[i];
      const nextExitSpeed = r.maxExitSpeed ?? 0;
      const maxEntryFromDecel = Math.sqrt(nextExitSpeed * nextExitSpeed + 2 * this.profile.acceleration * r.distance);

      if (r.maxEntrySpeed !== undefined) {
        r.entrySpeed = Math.min(r.maxEntrySpeed, maxEntryFromDecel, r.requestedSpeed);
      } else {
        r.entrySpeed = Math.min(maxEntryFromDecel, r.requestedSpeed);
      }

      if (i > 0 && results[i - 1].maxExitSpeed !== undefined) {
        results[i - 1].exitSpeed = Math.min(results[i - 1].maxExitSpeed, r.entrySpeed);
      }
    }

    // Forward pass: Calculate actual velocities
    let currentSpeed = 0;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      r.entrySpeed = Math.min(currentSpeed, r.entrySpeed, r.maxEntrySpeed ?? Infinity);

      const peakFromEntry = this.calcMaxVelocity(r.distance / 2, r.entrySpeed, r.requestedSpeed);
      const targetExit = r.exitSpeed || r.maxExitSpeed || 0;
      const peakFromExit = this.calcMaxVelocity(r.distance / 2, targetExit, r.requestedSpeed);

      r.actualPeakSpeed = Math.min(peakFromEntry, peakFromExit, r.requestedSpeed);

      r.exitSpeed = Math.min(
        Math.sqrt(Math.max(0, r.actualPeakSpeed * r.actualPeakSpeed - 2 * this.profile.acceleration * (r.distance / 2))),
        r.maxExitSpeed ?? r.requestedSpeed
      );
      if (isNaN(r.exitSpeed) || r.exitSpeed < 0) r.exitSpeed = 0;

      this._calcPhasesTimes(r);
      currentSpeed = r.exitSpeed;
    }

    return results;
  }

  _calcPhasesTimes(r) {
    const a = this.profile.acceleration;
    const d = r.distance;
    const v0 = r.entrySpeed;
    const v1 = r.actualPeakSpeed;
    const v2 = r.exitSpeed;

    if (d <= 0) {
      r.timeAccel = r.timeCruise = r.timeDecel = 0;
      return;
    }

    const dAccel = (v1 * v1 - v0 * v0) / (2 * a);
    const tAccel = (v1 - v0) / a;

    const dDecel = (v1 * v1 - v2 * v2) / (2 * a);
    const tDecel = (v1 - v2) / a;

    const dCruise = Math.max(0, d - dAccel - dDecel);
    const tCruise = v1 > 0 ? dCruise / v1 : 0;

    r.timeAccel = Math.max(0, tAccel) || 0;
    r.timeCruise = Math.max(0, tCruise) || 0;
    r.timeDecel = Math.max(0, tDecel) || 0;
  }

  /**
   * Analyze all layers from parser and store results.
   * @param {Object} layerMoves - Parser's layerMoves object
   * @returns {Map} Map of layerNum -> results array
   */
  analyzeAllLayers(layerMoves) {
    this.results.clear();
    for (const [layerNum, moves] of Object.entries(layerMoves)) {
      if (moves && moves.length > 0) {
        this.results.set(parseInt(layerNum), this.analyzeMoves(moves));
      }
    }
    return this.results;
  }

  /**
   * Engine interface: analyze all layers.
   * Called by AnalysisManager.analyzeAll(layerMoves, profile).
   * @param {Object} layerMoves - Parser's layerMoves object
   * @param {Object} profile - Analysis profile (unused by motion engine)
   */
  analyze(layerMoves, profile) {
    this.analyzeAllLayers(layerMoves);
    this._computeTimeSummary(layerMoves);
    this._generateFindings(layerMoves);
  }

  /**
   * Get analysis result for a specific move.
   * @param {number} layerNum - Layer number
   * @param {number} moveIndex - Move index within layer
   * @returns {Object|null} Analysis result or null
   */
  getResult(layerNum, moveIndex) {
    const layerResults = this.results.get(layerNum);
    if (!layerResults || moveIndex >= layerResults.length) return null;
    return layerResults[moveIndex];
  }

  // ===== Engine Interface =====

  get name() { return 'motion'; }

  getSupportedOverlays() {
    return [
      { id: 'actual-speed', label: 'Actual Speed', unit: 'mm/s' },
      { id: 'speed-delta', label: 'Speed Delta', unit: '%' },
      { id: 'layer-time', label: 'Layer Time', unit: 's' },
    ];
  }

  getOverlayData(overlayId, layerNum, moveIndex) {
    if (overlayId === 'layer-time') {
      return this._layerTimes.get(layerNum) || 0;
    }
    const result = this.getResult(layerNum, moveIndex);
    if (!result) return 0;
    if (overlayId === 'actual-speed') return result.actualPeakSpeed;
    if (overlayId === 'speed-delta') {
      if (result.requestedSpeed <= 0) return 0;
      return (result.requestedSpeed - result.actualPeakSpeed) / result.requestedSpeed;
    }
    return 0;
  }

  getFindings() {
    return this._findings;
  }

  clear() {
    this.results.clear();
    this._findings = [];
    this._layerTimes.clear();
    this._timeSummary = null;
  }

  // ===== Time Summary =====

  _computeTimeSummary(layerMoves) {
    this._layerTimes.clear();
    const byType = { wall: 0, infill: 0, support: 0, travel: 0, other: 0 };
    let totalTime = 0;
    const layerTimeArray = [];

    for (const [layerNum, layerResults] of this.results.entries()) {
      let layerTime = 0;
      for (const r of layerResults) {
        const moveTime = r.timeAccel + r.timeCruise + r.timeDecel;
        layerTime += moveTime;
        const type = (r.move.type || '').toUpperCase();
        if (!r.move.extrude) byType.travel += moveTime;
        else if (type.includes('WALL') || type.includes('OUTER') || type.includes('INNER') || type.includes('PERIMETER')) byType.wall += moveTime;
        else if (type.includes('FILL') || type.includes('SOLID') || type.includes('TOP') || type.includes('BOTTOM')) byType.infill += moveTime;
        else if (type.includes('SUPPORT')) byType.support += moveTime;
        else byType.other += moveTime;
      }
      this._layerTimes.set(layerNum, layerTime);
      layerTimeArray.push({ layer: layerNum, time: layerTime });
      totalTime += layerTime;
    }

    const sorted = [...layerTimeArray].sort((a, b) => b.time - a.time);
    const slowest = sorted.slice(0, 5);

    this._timeSummary = { totalTime, layerTimes: layerTimeArray, byType, slowest };
  }

  getTimeSummary() {
    return this._timeSummary;
  }

  // ===== Findings Generation =====

  _generateFindings(layerMoves) {
    this._findings = [];

    for (const [layerNum, layerResults] of this.results) {
      // --- Speed-limited segments ---
      // Collect consecutive runs of speed-limited moves
      let run = [];
      for (let i = 0; i < layerResults.length; i++) {
        const r = layerResults[i];
        if (r.distance > 0.1 && r.requestedSpeed > 0 &&
            r.actualPeakSpeed < r.requestedSpeed * 0.5) {
          run.push(r);
        } else {
          if (run.length >= 10) {
            this._emitSpeedLimitedFinding(layerNum, run);
          }
          run = [];
        }
      }
      // Flush trailing run
      if (run.length >= 10) {
        this._emitSpeedLimitedFinding(layerNum, run);
      }

      // --- Sharp corner speed drops ---
      for (let i = 0; i < layerResults.length - 1; i++) {
        const r = layerResults[i];
        const rNext = layerResults[i + 1];
        // Both moves must be extrusion moves
        if (!r.move.extrude || !rNext.move.extrude) continue;
        // Check conditions on the current move at the junction
        if (r.actualPeakSpeed > 10 && r.distance >= 0.5 &&
            r.exitSpeed < r.actualPeakSpeed * 0.3) {
          const move = r.move;
          this._addFinding('info', 'sharp-corner', layerNum, move,
            'Sharp corner speed drop',
            `Layer ${layerNum}: speed drops from ${r.actualPeakSpeed.toFixed(1)} to ${r.exitSpeed.toFixed(1)} mm/s at corner.`,
            'Increase junction deviation or jerk to allow higher cornering speeds.',
            { peakSpeed: r.actualPeakSpeed, exitSpeed: r.exitSpeed });
        }
      }

      // --- Ringing risk ---
      for (let i = 1; i < layerResults.length; i++) {
        const rPrev = layerResults[i - 1];
        const r = layerResults[i];
        // Both must be extrusion moves
        if (!rPrev.move.extrude || !r.move.extrude) continue;
        // Current move must be high speed
        if (r.actualPeakSpeed <= 150) continue;

        // Compute angle between direction vectors via dot product
        const dx1 = rPrev.move.x2 - rPrev.move.x1;
        const dy1 = rPrev.move.y2 - rPrev.move.y1;
        const dx2 = r.move.x2 - r.move.x1;
        const dy2 = r.move.y2 - r.move.y1;
        const len1 = Math.hypot(dx1, dy1);
        const len2 = Math.hypot(dx2, dy2);
        if (len1 < 0.001 || len2 < 0.001) continue;

        const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
        const cosAngle = Math.max(-1, Math.min(1, dot));
        const angleDeg = Math.acos(cosAngle) * 180 / Math.PI;

        if (angleDeg > 90) {
          const move = r.move;
          this._addFinding('warning', 'ringing-risk', layerNum, move,
            'Ringing risk after sharp corner',
            `Layer ${layerNum}: ${r.actualPeakSpeed.toFixed(1)} mm/s after ${angleDeg.toFixed(0)}° direction change.`,
            'Reduce speed or enable input shaping to minimize ringing artifacts.',
            { actualPeakSpeed: r.actualPeakSpeed, angleDeg });
        }
      }
    }

    // Merge consecutive findings for each category
    this._mergeConsecutiveFindings('speed-limited');
    this._mergeConsecutiveFindings('sharp-corner');
    this._mergeConsecutiveFindings('ringing-risk');
  }

  _emitSpeedLimitedFinding(layerNum, run) {
    // Find worst ratio in the run
    let worstRatio = 1;
    let refMove = run[0].move;
    for (const r of run) {
      const ratio = r.actualPeakSpeed / r.requestedSpeed;
      if (ratio < worstRatio) {
        worstRatio = ratio;
        refMove = r.move;
      }
    }

    const severity = worstRatio < 0.25 ? 'warning' : 'info';
    const pct = (worstRatio * 100).toFixed(0);

    this._addFinding(severity, 'speed-limited', layerNum, refMove,
      `${run.length} speed-limited moves`,
      `Layer ${layerNum}: ${run.length} consecutive moves limited to ${pct}% of requested speed.`,
      'Increase acceleration or reduce requested speed for short segments.',
      { moveCount: run.length, worstRatio });
  }

  _addFinding(severity, category, layerNum, move, title, description, suggestion, metadata) {
    const id = `mo-${category}-${this._findings.length}`;
    const midX = (move.x1 + move.x2) / 2;
    const midY = (move.y1 + move.y2) / 2;
    this._findings.push({
      id, engine: 'motion', severity, category, title, description, suggestion,
      location: {
        layer: layerNum,
        lineStart: move.lineIndex,
        lineEnd: move.lineIndex,
        xyz: { x: midX, y: midY, z: 0 },
      },
      metadata: metadata || {},
    });
  }

  _mergeConsecutiveFindings(category) {
    const catFindings = this._findings.filter(f => f.category === category);
    if (catFindings.length <= 3) return;

    const other = this._findings.filter(f => f.category !== category);

    // Sort by layer
    catFindings.sort((a, b) => a.location.layer - b.location.layer);

    // Group consecutive layers (within 2 layers)
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
        id: `mo-${category}-merged-${merged.length}`,
        title: worst.title,
        description: `Layers ${startLayer}\u2013${endLayer}: ${worst.description.replace(/^Layer \d+: /, '')}`,
        location: { ...worst.location, layer: startLayer },
        metadata: { ...worst.metadata, layerRange: [startLayer, endLayer], mergedCount: g.length },
      });
    }

    this._findings = [...other, ...merged];
  }
}
