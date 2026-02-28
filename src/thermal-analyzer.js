import { getMaterialProfile } from './material-profiles.js';

const EXPOSURE_FACTORS = {
  'WALL-OUTER': 1.0, 'OUTER WALL': 1.0,
  'WALL-INNER': 0.7, 'INNER WALL': 0.7,
  'SOLID': 0.5, 'SOLID INFILL': 0.5,
  'FILL': 0.3, 'SPARSE': 0.3,
  'TOP': 0.8, 'BRIDGE': 1.0, 'OVERHANG': 0.9,
  'SUPPORT': 0.8, 'SKIRT': 1.0, 'BRIM': 1.0,
};

function getExposure(type) {
  if (!type) return 0.5;
  const upper = type.toUpperCase();
  if (EXPOSURE_FACTORS[upper] !== undefined) return EXPOSURE_FACTORS[upper];
  for (const [key, val] of Object.entries(EXPOSURE_FACTORS)) {
    if (upper.includes(key)) return val;
  }
  return 0.5;
}

export class ThermalAnalyzer {
  constructor() {
    this.name = 'thermal';
    this._overlayData = new Map(); // "layerNum:moveIndex" -> { coolingTime, heatAccum, coolingEff, gradient }
    this._findings = [];
    this._gridData = null;
  }

  // --- Engine Interface ---

  getSupportedOverlays() {
    return [
      { id: 'cooling-time', label: 'Cooling Time', unit: 's', invert: true },
      { id: 'heat-accumulation', label: 'Heat Accumulation', unit: '%' },
      { id: 'cooling-effectiveness', label: 'Cooling Effectiveness', unit: '%', invert: true },
      { id: 'thermal-gradient', label: 'Thermal Gradient', unit: '°C' },
    ];
  }

  getOverlayData(overlayId, layerNum, moveIndex) {
    const key = `${layerNum}:${moveIndex}`;
    const data = this._overlayData.get(key);
    if (!data) return 0;
    switch (overlayId) {
      case 'cooling-time': return data.coolingTime ?? 0;
      case 'heat-accumulation': return data.heatAccum ?? 0;
      case 'cooling-effectiveness': return data.coolingEff ?? 0;
      case 'thermal-gradient': return data.gradient ?? 0;
      default: return 0;
    }
  }

  getFindings() {
    return this._findings;
  }

  clear() {
    this._overlayData.clear();
    this._findings = [];
    this._gridData = null;
  }

  // --- Grid Helpers ---

  _cellKey(x, y, cellSize) {
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    return `${cx},${cy}`;
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
      cells.add(this._cellKey(x1 + dx * t, y1 + dy * t, cellSize));
    }
    return cells;
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

  // --- Ambient Temperature Inference ---

  _inferAmbient(lines, environment, zHeight) {
    // Priority 1: environment.chamberTemp
    if (environment && environment.chamberTemp != null) {
      return environment.chamberTemp;
    }

    // Priority 2: M141 S<val> from G-code
    let m141Temp = null;
    let bedTemp = null;
    for (const line of lines) {
      const trimmed = line.trim();
      const m141Match = trimmed.match(/^M141\s+S([\d.]+)/i);
      if (m141Match && m141Temp === null) {
        m141Temp = parseFloat(m141Match[1]);
      }
      const bedMatch = trimmed.match(/^M1[49]0\s.*S([\d.]+)/i);
      if (bedMatch && bedTemp === null) {
        bedTemp = parseFloat(bedMatch[1]);
      }
    }

    if (m141Temp !== null) return m141Temp;

    // Priority 3: bed temp proxy
    if (bedTemp !== null) {
      return bedTemp * 0.3 * Math.exp(-zHeight / 50);
    }

    // Priority 4: environment.ambientTemp or 22°C
    if (environment && environment.ambientTemp != null) {
      return environment.ambientTemp;
    }
    return 22;
  }

  // --- Main Analysis ---

  analyze(layerMoves, profile) {
    this.clear();

    const materialType = profile.material?.type || 'PLA';
    const material = getMaterialProfile(materialType, profile.material || {});

    // Depth settings
    const depth = profile.thermal?.depth ?? 50;
    let gridRes, timeBudget, enableBackward;
    if (depth <= 33) {
      gridRes = 4; timeBudget = 1500; enableBackward = false;
    } else if (depth <= 66) {
      gridRes = 2; timeBudget = 4000; enableBackward = true;
    } else {
      gridRes = 1; timeBudget = 10000; enableBackward = true;
    }

    // Environment
    const chamberType = profile.environment?.chamberType || 'open';
    const chamberFactor = chamberType === 'heated' ? 0.2 : chamberType === 'enclosed' ? 0.5 : 1.0;

    // Parse fan states if raw lines available
    let fanStates = {};
    if (profile._parsedLines) {
      fanStates = this._parseFanStates(profile._parsedLines);
    }

    // Infer ambient temp
    const layerNums = Object.keys(layerMoves).map(Number).sort((a, b) => a - b);
    const maxLayerZ = layerNums.length * 0.2; // rough Z estimate
    const ambientTemp = this._inferAmbient(
      profile._parsedLines || [],
      profile.environment || {},
      maxLayerZ / 2
    );

    // Compute grid bounds from all extrusion moves
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasExtrusion = false;
    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves) continue;
      for (const m of moves) {
        if (!m.extrude) continue;
        hasExtrusion = true;
        minX = Math.min(minX, m.x1, m.x2);
        minY = Math.min(minY, m.y1, m.y2);
        maxX = Math.max(maxX, m.x1, m.x2);
        maxY = Math.max(maxY, m.y1, m.y2);
      }
    }

    if (!hasExtrusion) return;

    // Add padding
    const pad = gridRes * 2;
    minX -= pad; minY -= pad;
    maxX += pad; maxY += pad;

    const gridW = Math.ceil((maxX - minX) / gridRes) + 1;
    const gridH = Math.ceil((maxY - minY) / gridRes) + 1;
    const totalCells = gridW * gridH;

    // Build parallel typed arrays for the grid
    const temperature = new Float32Array(totalCells);
    const lastExtrusionTime = new Float32Array(totalCells);
    const extrusionCount = new Uint16Array(totalCells);
    const exposureFactor = new Float32Array(totalCells);

    // Init temperature to ambient, exposure to 1.0
    temperature.fill(ambientTemp);
    exposureFactor.fill(1.0);

    // Deposition temperature: filament surface cools during deposition,
    // so the effective cell temperature is below nozzle melt temp.
    const depositionTemp = material.meltTemp * 0.7;

    // Helper: cell key string -> grid index
    const cellToIndex = (cellKey) => {
      const parts = cellKey.split(',');
      const cx = parseInt(parts[0], 10);
      const cy = parseInt(parts[1], 10);
      // Convert cell coords to grid-relative
      const gx = cx - Math.floor(minX / gridRes);
      const gy = cy - Math.floor(minY / gridRes);
      if (gx < 0 || gx >= gridW || gy < 0 || gy >= gridH) return -1;
      return gy * gridW + gx;
    };

    // Helper: grid index -> cell grid-relative coords
    const indexToGxGy = (idx) => {
      const gy = Math.floor(idx / gridW);
      const gx = idx % gridW;
      return [gx, gy];
    };

    const coolingConst = (material.thermalConductivity || 0.13) * 0.01 * chamberFactor;

    // Forward pass data collection for backward pass
    const layerCoolingTimes = []; // per layer: estimated layer time
    const perMoveOverlays = []; // per [layerNum, moveIndex] overlay values stored in _overlayData

    const startTime = Date.now();
    let globalTime = 0;
    let budgetExceeded = false;

    // Forward pass
    for (let li = 0; li < layerNums.length; li++) {
      const layerNum = layerNums[li];
      const moves = layerMoves[layerNum];
      if (!moves || moves.length === 0) continue;

      // Check time budget
      if (Date.now() - startTime > timeBudget) {
        budgetExceeded = true;
      }

      // Compute layer time
      let layerTime = 0;
      for (const move of moves) {
        const len = Math.hypot(move.x2 - move.x1, move.y2 - move.y1);
        const speed = (move.feedRate || 1500) / 60;
        layerTime += speed > 0 ? len / speed : 0;
      }
      layerCoolingTimes.push({ layerNum, layerTime });

      const fanSpeed = fanStates[layerNum] ?? 0;
      const fanBoost = 1 + fanSpeed * (material.coolingSensitivity || 0.5);

      // Snapshot temperature at layer start (after between-layer cooling).
      // This prevents within-layer heat injection from contaminating overlay
      // readings — all moves on this layer see the same post-cooling state.
      const layerTemp = new Float32Array(temperature);

      // Compute average temperature of printed cells for gradient baseline.
      // Thermal gradient = deviation from this average — shows differential
      // cooling that drives warping (center stays hot, edges cool faster).
      let tempSum = 0, tempCount = 0;
      for (let idx = 0; idx < totalCells; idx++) {
        if (extrusionCount[idx] > 0) {
          tempSum += layerTemp[idx];
          tempCount++;
        }
      }
      const layerAvgTemp = tempCount > 0 ? tempSum / tempCount : ambientTemp;

      // Process each move
      for (let mi = 0; mi < moves.length; mi++) {
        const move = moves[mi];
        if (!move.extrude) {
          this._overlayData.set(`${layerNum}:${mi}`, {
            coolingTime: layerTime,
            heatAccum: 0,
            coolingEff: 0,
            gradient: 0,
          });
          continue;
        }

        const len = Math.hypot(move.x2 - move.x1, move.y2 - move.y1);
        if (len < 0.001) {
          this._overlayData.set(`${layerNum}:${mi}`, {
            coolingTime: layerTime,
            heatAccum: 0,
            coolingEff: 0,
            gradient: 0,
          });
          continue;
        }

        const exposure = getExposure(move.type);
        const cells = this._rasterizeLine(move.x1, move.y1, move.x2, move.y2, gridRes);
        const cellLen = len / Math.max(1, cells.size);

        // Sample from layer snapshot — immune to within-layer heat injection
        const midX = (move.x1 + move.x2) / 2;
        const midY = (move.y1 + move.y2) / 2;
        const midKey = this._cellKey(midX, midY, gridRes);
        const midIdx = cellToIndex(midKey);

        let heatScore = 0;
        let gradient = 0;
        let coolingEff = 0;

        if (midIdx >= 0 && midIdx < totalCells) {
          const preTemp = layerTemp[midIdx]; // post-cooling, pre-injection

          // Heat accumulation: how hot was the cell before this layer started?
          // High score = cell hadn't cooled from previous layer (heat building up).
          const gt = material.glassTransition || 60;
          const hdt = material.hdt || (gt + 20);
          if (preTemp > gt) {
            heatScore = Math.min(1.0, (preTemp - gt) / Math.max(1, hdt - gt));
          }

          // Thermal gradient: deviation from layer average temperature.
          // Shows differential cooling — center stays hot (positive deviation),
          // edges/corners cool faster (negative deviation). The magnitude of
          // this deviation drives warping and residual stress.
          gradient = Math.abs(preTemp - layerAvgTemp);

          // Cooling effectiveness: how well did this cell cool between layers?
          // 1.0 = fully cooled to ambient (excellent), 0.0 = no cooling at all.
          // Only meaningful after first extrusion (extrusionCount > 0).
          if (extrusionCount[midIdx] > 0) {
            coolingEff = Math.min(1.0, (depositionTemp - preTemp) / Math.max(1, depositionTemp - ambientTemp));
          } else {
            coolingEff = 1.0; // first extrusion at this cell, no prior heat
          }
        }

        // Heat injection: fresh filament arrives near melt temp.
        for (const cellKey of cells) {
          const idx = cellToIndex(cellKey);
          if (idx < 0 || idx >= totalCells) continue;
          temperature[idx] = Math.max(temperature[idx], depositionTemp);
          lastExtrusionTime[idx] = globalTime;
          extrusionCount[idx]++;
          exposureFactor[idx] = Math.min(exposureFactor[idx], exposure);
        }

        // Advance time per-move (before storing, so timestamp is at move start)
        const speed = (move.feedRate || 1500) / 60;
        const moveDuration = speed > 0 ? len / speed : 0;

        // Default cooling time = layer time (approximate inter-layer interval).
        // Backward pass refines this with actual per-cell re-extrusion times.
        this._overlayData.set(`${layerNum}:${mi}`, {
          coolingTime: layerTime,
          heatAccum: heatScore,
          coolingEff,
          gradient,
          _timestamp: globalTime,
        });

        globalTime += moveDuration;
      }

      // Between layers: cool all cells (Newton's Law)
      for (let idx = 0; idx < totalCells; idx++) {
        if (temperature[idx] > ambientTemp) {
          const exp = exposureFactor[idx];
          const cooling = (temperature[idx] - ambientTemp) * coolingConst * layerTime * fanBoost * exp;
          temperature[idx] = Math.max(ambientTemp, temperature[idx] - cooling);
        }
      }

      // Lateral heat diffusion: cells exchange heat with neighbors.
      // Edge cells lose heat to ambient-temperature padding, creating
      // the center-to-edge gradient that drives warping and stress.
      const diffusionRate = 0.15;
      const diffIters = budgetExceeded ? 1 : 3;
      const tempBuf = new Float32Array(temperature);
      for (let iter = 0; iter < diffIters; iter++) {
        for (let idx = 0; idx < totalCells; idx++) {
          if (tempBuf[idx] <= ambientTemp) continue;
          const gy = Math.floor(idx / gridW);
          const gx = idx % gridW;
          let sum = 0, count = 0;
          if (gx > 0)          { sum += tempBuf[idx - 1];     count++; }
          if (gx < gridW - 1)  { sum += tempBuf[idx + 1];     count++; }
          if (gy > 0)          { sum += tempBuf[idx - gridW];  count++; }
          if (gy < gridH - 1)  { sum += tempBuf[idx + gridW];  count++; }
          if (count > 0) {
            const avg = sum / count;
            temperature[idx] = tempBuf[idx] + diffusionRate * (avg - tempBuf[idx]);
          }
        }
        tempBuf.set(temperature);
      }
    }

    // Backward pass: compute per-cell cooling time (time until cell is
    // next extruded). Uses per-move timestamps stored during forward pass.
    if (enableBackward && !budgetExceeded) {
      // nextExtrusionTime[cell] tracks the earliest future extrusion timestamp
      // for each grid cell, updated as we walk backward.
      const nextExtrTime = new Float32Array(totalCells);
      nextExtrTime.fill(globalTime); // init: nothing after the last layer
      let maxCoolingTime = 0;

      // Walk layers in reverse. Two phases per layer to prevent same-layer
      // moves from polluting each other's cooling time via shared grid cells.
      for (let li = layerNums.length - 1; li >= 0; li--) {
        const layerNum = layerNums[li];
        const moves = layerMoves[layerNum];
        if (!moves) continue;

        // Phase 1: Read cooling times for all moves in this layer.
        // nextExtrTime only contains timestamps from later layers at this point.
        for (let mi = moves.length - 1; mi >= 0; mi--) {
          const move = moves[mi];
          if (!move.extrude) continue;

          const overlayKey = `${layerNum}:${mi}`;
          const existing = this._overlayData.get(overlayKey);
          if (!existing || existing._timestamp === undefined) continue;
          const moveTime = existing._timestamp;

          const midX = (move.x1 + move.x2) / 2;
          const midY = (move.y1 + move.y2) / 2;
          const midKey = this._cellKey(midX, midY, gridRes);
          const midIdx = cellToIndex(midKey);
          if (midIdx >= 0 && midIdx < totalCells) {
            const coolingTime = nextExtrTime[midIdx] - moveTime;
            if (coolingTime > 0) {
              existing.coolingTime = coolingTime;
              maxCoolingTime = Math.max(maxCoolingTime, coolingTime);
            }
          }
        }

        // Phase 2: Update nextExtrTime with this layer's timestamps so
        // earlier layers see this layer as the "next extrusion".
        for (let mi = moves.length - 1; mi >= 0; mi--) {
          const move = moves[mi];
          if (!move.extrude) continue;

          const overlayKey = `${layerNum}:${mi}`;
          const existing = this._overlayData.get(overlayKey);
          if (!existing || existing._timestamp === undefined) continue;
          const moveTime = existing._timestamp;

          const cells = this._rasterizeLine(move.x1, move.y1, move.x2, move.y2, gridRes);
          for (const cellKey of cells) {
            const idx = cellToIndex(cellKey);
            if (idx >= 0 && idx < totalCells) {
              nextExtrTime[idx] = moveTime;
            }
          }
        }
      }

    }

    // Generate findings
    this._generateFindings(layerMoves, layerNums, material, layerCoolingTimes, chamberFactor);

    // Store grid data for potential future use
    this._gridData = { temperature, gridW, gridH, minX, minY, gridRes };
  }

  // --- Finding Generation ---

  _generateFindings(layerMoves, layerNums, material, layerCoolingTimes, chamberFactor) {
    const minLayerTime = material.minLayerTime || 8;

    // Cooling time findings
    for (const { layerNum, layerTime } of layerCoolingTimes) {
      const moves = layerMoves[layerNum];
      if (!moves) continue;
      const refMove = moves.find(m => m.extrude) || moves[0];
      if (!refMove) continue;

      if (layerTime < minLayerTime * 0.5) {
        this._addFinding('critical', 'cooling-time', layerNum, 0, refMove,
          'Very short cooling time',
          `Layer ${layerNum} completes in ${layerTime.toFixed(1)}s (minimum: ${minLayerTime}s).`,
          'Increase minimum layer time or enable "slow down for small layers" in slicer.',
          { layerTime, minLayerTime });
      } else if (layerTime < minLayerTime) {
        this._addFinding('warning', 'cooling-time', layerNum, 0, refMove,
          'Insufficient cooling time',
          `Layer ${layerNum} completes in ${layerTime.toFixed(1)}s (recommended: ${minLayerTime}s).`,
          'Consider increasing minimum layer time.',
          { layerTime, minLayerTime });
      }
    }

    // Heat accumulation findings
    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves) continue;
      let worstHeat = 0;
      let worstMove = null;
      let worstMoveIdx = 0;

      for (let mi = 0; mi < moves.length; mi++) {
        const data = this._overlayData.get(`${layerNum}:${mi}`);
        if (!data) continue;
        if (data.heatAccum > worstHeat) {
          worstHeat = data.heatAccum;
          worstMove = moves[mi];
          worstMoveIdx = mi;
        }
      }

      if (worstHeat > 0.8 && worstMove) {
        this._addFinding('critical', 'heat-accumulation', layerNum, worstMoveIdx, worstMove,
          'Small feature exceeds heat deflection temperature',
          `Layer ${layerNum}: heat accumulation score ${worstHeat.toFixed(2)} — risk of deformation.`,
          'Increase cooling, reduce speed for small features, or print multiple objects.',
          { heatScore: worstHeat });
      } else if (worstHeat > 0.5 && worstMove) {
        this._addFinding('warning', 'heat-accumulation', layerNum, worstMoveIdx, worstMove,
          'Heat buildup detected',
          `Layer ${layerNum}: heat accumulation score ${worstHeat.toFixed(2)}.`,
          'Consider enabling minimum layer time or printing a sacrificial tower.',
          { heatScore: worstHeat });
      }
    }

    // Cooling effectiveness findings
    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves) continue;
      let consecutivePoor = 0;
      let longestRun = 0;
      let runStart = null;

      for (let mi = 0; mi < moves.length; mi++) {
        const data = this._overlayData.get(`${layerNum}:${mi}`);
        if (!data) continue;
        if (data.coolingEff > 0.7 && moves[mi].extrude) {
          if (consecutivePoor === 0) runStart = moves[mi];
          consecutivePoor++;
          longestRun = Math.max(longestRun, consecutivePoor);
        } else {
          consecutivePoor = 0;
        }
      }

      if (longestRun > 10 && (material.coolingSensitivity || 0) > 0.6 && runStart) {
        this._addFinding('warning', 'cooling-effectiveness', layerNum, 0, runStart,
          'Limited cooling airflow',
          `Layer ${layerNum}: ${longestRun} consecutive moves with poor cooling effectiveness.`,
          'Increase fan speed or reorient part for better airflow.',
          { consecutivePoorMoves: longestRun });
      }
    }

    // Thermal gradient findings
    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves) continue;
      let worstGradient = 0;
      let worstMove = null;
      let worstMoveIdx = 0;

      for (let mi = 0; mi < moves.length; mi++) {
        const data = this._overlayData.get(`${layerNum}:${mi}`);
        if (!data) continue;
        if (data.gradient > worstGradient) {
          worstGradient = data.gradient;
          worstMove = moves[mi];
          worstMoveIdx = mi;
        }
      }

      if (worstGradient > 10 && material.needsEnclosure && worstMove) {
        this._addFinding('critical', 'thermal-gradient', layerNum, worstMoveIdx, worstMove,
          'High thermal stress — warping likely',
          `Layer ${layerNum}: temperature deviation ${worstGradient.toFixed(1)}°C from layer average.`,
          'Use an enclosure, increase ambient temperature, or reduce fan speed.',
          { gradient: worstGradient });
      } else if (worstGradient > 5 && worstMove) {
        this._addFinding('warning', 'thermal-gradient', layerNum, worstMoveIdx, worstMove,
          'Moderate thermal gradient',
          `Layer ${layerNum}: temperature deviation ${worstGradient.toFixed(1)}°C from layer average.`,
          'Consider reducing fan speed or enclosing the printer.',
          { gradient: worstGradient });
      }
    }

    // Merge consecutive findings for each category
    this._mergeConsecutiveFindings('cooling-time');
    this._mergeConsecutiveFindings('heat-accumulation');
    this._mergeConsecutiveFindings('cooling-effectiveness');
    this._mergeConsecutiveFindings('thermal-gradient');
  }

  _addFinding(severity, category, layerNum, moveIndex, move, title, description, suggestion, metadata) {
    const id = `th-${category}-${this._findings.length}`;
    const midX = (move.x1 + move.x2) / 2;
    const midY = (move.y1 + move.y2) / 2;
    this._findings.push({
      id, engine: 'thermal', severity, category, title, description, suggestion,
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

    catFindings.sort((a, b) => a.location.layer - b.location.layer);

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
        id: `th-${category}-merged-${merged.length}`,
        title: worst.title,
        description: `Layers ${startLayer}\u2013${endLayer}: ${worst.description.replace(/^Layer \d+: /, '')}`,
        location: { ...worst.location, layer: startLayer },
        metadata: { ...worst.metadata, layerRange: [startLayer, endLayer], mergedCount: g.length },
      });
    }

    this._findings = [...other, ...merged];
  }
}
