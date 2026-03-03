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
    this._overlayData = new Map(); // "layerNum:moveIndex" -> { coolingTime, heatAccum, coolingEff, temperature, warpRisk }
    this._findings = [];
    this._gridData = null;
    this._warpGrids = new Map(); // layerNum -> { warpRisk, extrusionCount, gridW, gridH, minX, minY, gridRes }
  }

  // --- Engine Interface ---

  getSupportedOverlays() {
    return [
      { id: 'cooling-time', label: 'Cooling Time', unit: 's', invert: true },
      { id: 'heat-accumulation', label: 'Heat Accumulation', unit: '%' },
      { id: 'cooling-effectiveness', label: 'Cooling Effectiveness', unit: '%', invert: true },
      { id: 'temperature', label: 'Temperature', unit: '°C' },
      { id: 'warping-risk', label: 'Warping Risk', unit: 'mm' },
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
      case 'temperature': return data.temperature ?? 0;
      case 'warping-risk': return data.warpRisk ?? 0;
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
    this._warpGrids.clear();
  }

  getWarpGrid(layerNum) {
    return this._warpGrids.get(layerNum) || null;
  }

  // --- Grid Helpers ---

  _rasterizeLineIndices(x1, y1, x2, y2) {
    const { minX, minY, gridRes, gridW, gridH } = this._grid;
    const indices = [];
    const seen = this._rasterSeen;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) {
      const gx = Math.floor((x1 - minX) / gridRes);
      const gy = Math.floor((y1 - minY) / gridRes);
      if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
        const idx = gy * gridW + gx;
        indices.push(idx);
        seen[idx] = this._rasterGen;
      }
      return indices;
    }
    const steps = Math.max(1, Math.ceil(len / (gridRes * 0.5)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const gx = Math.floor((x1 + dx * t - minX) / gridRes);
      const gy = Math.floor((y1 + dy * t - minY) / gridRes);
      if (gx < 0 || gx >= gridW || gy < 0 || gy >= gridH) continue;
      const idx = gy * gridW + gx;
      if (seen[idx] !== this._rasterGen) {
        seen[idx] = this._rasterGen;
        indices.push(idx);
      }
    }
    return indices;
  }

  _distanceTransform(extrusionCount, gridW, gridH, gridRes) {
    const totalCells = gridW * gridH;
    const dist = new Float32Array(totalCells);
    dist.fill(-1); // -1 = unvisited

    // BFS queue: start from boundary cells (printed cells with a non-printed neighbor)
    const queue = [];
    for (let idx = 0; idx < totalCells; idx++) {
      if (extrusionCount[idx] === 0) continue; // skip non-printed
      const gy = Math.floor(idx / gridW);
      const gx = idx % gridW;
      const neighbors = [
        gx > 0 ? idx - 1 : -1,
        gx < gridW - 1 ? idx + 1 : -1,
        gy > 0 ? idx - gridW : -1,
        gy < gridH - 1 ? idx + gridW : -1,
      ];
      let isBoundary = false;
      for (const nIdx of neighbors) {
        if (nIdx < 0 || extrusionCount[nIdx] === 0) {
          isBoundary = true;
          break;
        }
      }
      if (isBoundary) {
        dist[idx] = 0;
        queue.push(idx);
      }
    }

    // BFS flood fill inward
    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      const gy = Math.floor(idx / gridW);
      const gx = idx % gridW;
      const nextDist = dist[idx] + 1;
      const neighbors = [
        gx > 0 ? idx - 1 : -1,
        gx < gridW - 1 ? idx + 1 : -1,
        gy > 0 ? idx - gridW : -1,
        gy < gridH - 1 ? idx + gridW : -1,
      ];
      for (const nIdx of neighbors) {
        if (nIdx < 0) continue;
        if (extrusionCount[nIdx] === 0) continue; // skip non-printed
        if (dist[nIdx] >= 0) continue; // already visited
        dist[nIdx] = nextDist;
        queue.push(nIdx);
      }
    }

    // Convert grid steps to mm
    for (let idx = 0; idx < totalCells; idx++) {
      dist[idx] = Math.max(0, dist[idx]) * gridRes;
    }
    return dist;
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

    this._grid = { minX, minY, gridRes, gridW, gridH };
    this._rasterSeen = new Uint8Array(totalCells);
    this._rasterGen = 0;

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

    const coolingConst = (material.thermalConductivity || 0.13) * 0.01 * chamberFactor;

    // Forward pass data collection for backward pass
    const layerCoolingTimes = []; // per layer: estimated layer time
    const perMoveOverlays = []; // per [layerNum, moveIndex] overlay values stored in _overlayData

    const startTime = Date.now();
    let globalTime = 0;
    let budgetExceeded = false;

    // Pre-allocate scratch arrays (reused each layer iteration to reduce GC pressure)
    const _cellStrain = new Float32Array(totalCells);
    const _effectiveDist = new Float32Array(totalCells);
    const _sat = new Float32Array((gridW + 1) * (gridH + 1));
    const _fillFraction = new Float32Array(totalCells);
    const _warpGrid = new Float32Array(totalCells);
    const _tempBuf = new Float32Array(totalCells);
    const _layerTemp = new Float32Array(totalCells);

    const moveRasterCache = new Map(); // "layerNum:moveIndex" -> array of cell indices

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
      _layerTemp.set(temperature);

      const materialCTE = material.cte || 68e-6;

      // Per-cell contraction strain for neighbor stress calculation.
      // strain = CTE × max(0, T - Tg). Cells below Tg have solidified (strain 0).
      const gt_warp = material.glassTransition || 60;
      _cellStrain.fill(0);

      // Compute centroid of printed area for part radius calculation.
      let centroidX = 0, centroidY = 0, printedCount = 0;
      for (let idx = 0; idx < totalCells; idx++) {
        const dT = _layerTemp[idx] - gt_warp;
        _cellStrain[idx] = dT > 0 ? materialCTE * dT : 0;
        if (extrusionCount[idx] > 0) {
          const gy = Math.floor(idx / gridW);
          const gx = idx % gridW;
          centroidX += (minX + gx * gridRes);
          centroidY += (minY + gy * gridRes);
          printedCount++;
        }
      }
      if (printedCount > 0) {
        centroidX /= printedCount;
        centroidY /= printedCount;
      }

      // Part radius and per-cell effective distance. Pure distFromCentroid
      // makes the center appear zero-risk (wrong — internal stress is real).
      // A constant makes corners = center (wrong — stress concentrates at
      // free edges). Blend: effectiveDist = partRadius × (0.4 + 0.6 × d/R).
      // Center gets 40% of corner risk — corners are higher but center isn't zero.
      let partRadius = 1;
      for (let idx = 0; idx < totalCells; idx++) {
        if (extrusionCount[idx] > 0) {
          const gy = Math.floor(idx / gridW), gx = idx % gridW;
          const d = Math.hypot(minX + gx * gridRes - centroidX, minY + gy * gridRes - centroidY);
          if (d > partRadius) partRadius = d;
        }
      }
      _effectiveDist.fill(0);
      for (let idx = 0; idx < totalCells; idx++) {
        if (extrusionCount[idx] === 0) continue;
        const gy = Math.floor(idx / gridW), gx = idx % gridW;
        const d = Math.hypot(minX + gx * gridRes - centroidX, minY + gy * gridRes - centroidY);
        _effectiveDist[idx] = partRadius * (0.4 + 0.6 * d / partRadius);
      }

      // Precompute local fill fraction for each cell.
      // In a lattice/grid structure, contraction forces don't accumulate across
      // gaps the way they do in a solid plate. The fill fraction scales the
      // part radius term so sparse structures warp proportionally less.
      // Uses a summed area table (integral image) for O(1) per-cell queries.
      const fillRadius = Math.max(2, Math.round(10 / gridRes));
      const satW = gridW + 1, satH = gridH + 1;
      _sat.fill(0);
      for (let y = 1; y <= gridH; y++) {
        for (let x = 1; x <= gridW; x++) {
          _sat[y * satW + x] = (extrusionCount[(y - 1) * gridW + (x - 1)] > 0 ? 1 : 0)
            + _sat[(y - 1) * satW + x] + _sat[y * satW + (x - 1)] - _sat[(y - 1) * satW + (x - 1)];
        }
      }
      _fillFraction.fill(0);
      for (let idx = 0; idx < totalCells; idx++) {
        const gy = Math.floor(idx / gridW), gx = idx % gridW;
        const x0 = Math.max(0, gx - fillRadius), y0 = Math.max(0, gy - fillRadius);
        const x1 = Math.min(gridW - 1, gx + fillRadius), y1 = Math.min(gridH - 1, gy + fillRadius);
        const sum = _sat[(y1 + 1) * satW + (x1 + 1)] - _sat[y0 * satW + (x1 + 1)]
          - _sat[(y1 + 1) * satW + x0] + _sat[y0 * satW + x0];
        const area = (x1 - x0 + 1) * (y1 - y0 + 1);
        _fillFraction[idx] = sum / area;
      }

      // Process each move
      for (let mi = 0; mi < moves.length; mi++) {
        const move = moves[mi];
        if (!move.extrude) {
          this._overlayData.set(`${layerNum}:${mi}`, {
            coolingTime: layerTime,
            heatAccum: 0,
            coolingEff: 0,
            temperature: 0,
            warpRisk: 0,
          });
          continue;
        }

        const len = Math.hypot(move.x2 - move.x1, move.y2 - move.y1);
        if (len < 0.001) {
          this._overlayData.set(`${layerNum}:${mi}`, {
            coolingTime: layerTime,
            heatAccum: 0,
            coolingEff: 0,
            temperature: 0,
            warpRisk: 0,
          });
          continue;
        }

        const exposure = getExposure(move.type);
        this._rasterGen = (this._rasterGen + 1) & 0xFF || 1;
        const cellIndices = this._rasterizeLineIndices(move.x1, move.y1, move.x2, move.y2);
        moveRasterCache.set(`${layerNum}:${mi}`, cellIndices);
        const cellLen = len / Math.max(1, cellIndices.length);

        // Sample from layer snapshot — immune to within-layer heat injection
        const midX = (move.x1 + move.x2) / 2;
        const midY = (move.y1 + move.y2) / 2;
        const mgx = Math.floor((midX - minX) / gridRes);
        const mgy = Math.floor((midY - minY) / gridRes);
        const midIdx = (mgx >= 0 && mgx < gridW && mgy >= 0 && mgy < gridH) ? mgy * gridW + mgx : -1;

        let heatScore = 0;
        let temperature_val = 0;
        let coolingEff = 0;
        let warpRisk = 0;

        if (midIdx >= 0 && midIdx < totalCells) {
          const preTemp = _layerTemp[midIdx]; // post-cooling, pre-injection

          // Heat accumulation: how hot was the cell before this layer started?
          // High score = cell hadn't cooled from previous layer (heat building up).
          const gt = material.glassTransition || 60;
          const hdt = material.hdt || (gt + 20);
          if (preTemp > gt) {
            heatScore = Math.min(1.0, (preTemp - gt) / Math.max(1, hdt - gt));
          }

          // Temperature: actual cell temp from layer snapshot (°C)
          temperature_val = preTemp;

          // Cooling effectiveness: how well did this cell cool between layers?
          // 1.0 = fully cooled to ambient (excellent), 0.0 = no cooling at all.
          // Only meaningful after first extrusion (extrusionCount > 0).
          if (extrusionCount[midIdx] > 0) {
            coolingEff = Math.min(1.0, (depositionTemp - preTemp) / Math.max(1, depositionTemp - ambientTemp));
          } else {
            coolingEff = 1.0; // first extrusion at this cell, no prior heat
          }

          // Warping risk: (selfContraction + neighborStress) × partRadius × fillFraction
          // selfContraction = CTE × ΔT (how much this cell wants to shrink)
          // neighborStress = max strain difference with extruded neighbors
          // partRadius = constant scale factor (mm) — larger parts warp more
          // fillFraction = local material density — sparse structures warp less
          const selfContraction = _cellStrain[midIdx];
          let neighborStress = 0;
          const gy = Math.floor(midIdx / gridW);
          const gx = midIdx % gridW;
          const warpNeighbors = [
            gx > 0 ? midIdx - 1 : -1,
            gx < gridW - 1 ? midIdx + 1 : -1,
            gy > 0 ? midIdx - gridW : -1,
            gy < gridH - 1 ? midIdx + gridW : -1,
          ];
          for (const nIdx of warpNeighbors) {
            if (nIdx < 0 || nIdx >= totalCells || extrusionCount[nIdx] === 0) continue;
            const diff = Math.abs(_cellStrain[midIdx] - _cellStrain[nIdx]);
            if (diff > neighborStress) neighborStress = diff;
          }

          warpRisk = (selfContraction + neighborStress) * _effectiveDist[midIdx] * _fillFraction[midIdx];
        }

        // Heat injection: fresh filament arrives near melt temp.
        for (const idx of cellIndices) {
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
          temperature: temperature_val,
          warpRisk,
          _timestamp: globalTime,
        });

        globalTime += moveDuration;
      }

      // Store per-layer warp grid for mesh visualization.
      // Always store even when printedCount is 0 (e.g. layer 0 before any prior
      // extrusions) — the extrusionCount footprint is needed for cumulative warp
      // display in the viewer, and warp values will naturally be zero when
      // cellStrain is zero (temperature below glass transition).
      _warpGrid.fill(0);
      if (printedCount > 0) {
        for (let idx = 0; idx < totalCells; idx++) {
          if (extrusionCount[idx] === 0) continue;
          const strain = _cellStrain[idx];
          const gy = Math.floor(idx / gridW), gx = idx % gridW;
          let nStress = 0;
          const neighbors = [
            gx > 0 ? idx - 1 : -1,
            gx < gridW - 1 ? idx + 1 : -1,
            gy > 0 ? idx - gridW : -1,
            gy < gridH - 1 ? idx + gridW : -1,
          ];
          for (const nIdx of neighbors) {
            if (nIdx >= 0 && nIdx < totalCells && extrusionCount[nIdx] > 0) nStress = Math.max(nStress, Math.abs(strain - _cellStrain[nIdx]));
          }
          _warpGrid[idx] = (strain + nStress) * _effectiveDist[idx] * _fillFraction[idx];
        }
      }
      this._warpGrids.set(layerNum, {
        warpRisk: new Float32Array(_warpGrid),  // copy for persistent storage
        extrusionCount: new Uint16Array(extrusionCount),
        gridW, gridH, minX, minY, gridRes,
      });

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
      _tempBuf.set(temperature);
      for (let iter = 0; iter < diffIters; iter++) {
        for (let idx = 0; idx < totalCells; idx++) {
          if (_tempBuf[idx] <= ambientTemp) continue;
          const gy = Math.floor(idx / gridW);
          const gx = idx % gridW;
          let sum = 0, count = 0;
          if (gx > 0)          { sum += _tempBuf[idx - 1];     count++; }
          if (gx < gridW - 1)  { sum += _tempBuf[idx + 1];     count++; }
          if (gy > 0)          { sum += _tempBuf[idx - gridW];  count++; }
          if (gy < gridH - 1)  { sum += _tempBuf[idx + gridW];  count++; }
          if (count > 0) {
            const avg = sum / count;
            temperature[idx] = _tempBuf[idx] + diffusionRate * (avg - _tempBuf[idx]);
          }
        }
        _tempBuf.set(temperature);
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
          const mgx = Math.floor((midX - minX) / gridRes);
          const mgy = Math.floor((midY - minY) / gridRes);
          const midIdx = (mgx >= 0 && mgx < gridW && mgy >= 0 && mgy < gridH) ? mgy * gridW + mgx : -1;
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

          const cellIndices = moveRasterCache.get(`${layerNum}:${mi}`);
          if (!cellIndices) continue;
          for (const idx of cellIndices) {
            nextExtrTime[idx] = moveTime;
          }
        }
      }

    }

    // Generate findings
    this._generateFindings(layerMoves, layerNums, material, layerCoolingTimes, chamberFactor, chamberType);

    // Store grid data for potential future use
    this._gridData = { temperature, gridW, gridH, minX, minY, gridRes };
  }

  // --- Finding Generation ---

  _generateFindings(layerMoves, layerNums, material, layerCoolingTimes, chamberFactor, chamberType) {
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

    // Warp failure prediction (grid-based aggregate analysis)
    this._analyzeWarpFailure(layerMoves, layerNums, material, chamberType);

    // Merge consecutive findings for each category
    this._mergeConsecutiveFindings('cooling-time');
    this._mergeConsecutiveFindings('heat-accumulation');
    this._mergeConsecutiveFindings('cooling-effectiveness');
  }

  _analyzeWarpFailure(layerMoves, layerNums, material, chamberType) {
    if (this._warpGrids.size === 0) return;

    // Step A: Compute cumulative averaged warp across all layers
    // Find the grid dimensions from the first available grid
    const firstGrid = this._warpGrids.values().next().value;
    const { gridW, gridH, minX, minY, gridRes } = firstGrid;
    const totalCells = gridW * gridH;

    const warpSum = new Float32Array(totalCells);
    const warpCount = new Uint16Array(totalCells);
    let worstLayerNum = 0;
    let worstLayerPeak = 0;

    // Running cumulative average — track which layer produces the worst peak
    for (const layerNum of layerNums) {
      const grid = this._warpGrids.get(layerNum);
      if (!grid) continue;

      for (let idx = 0; idx < totalCells; idx++) {
        const risk = grid.warpRisk[idx] || 0;
        if (risk > 0 || grid.extrusionCount[idx] > 0) {
          warpSum[idx] += risk;
          warpCount[idx]++;
        }
      }

      // Check running peak after this layer
      for (let idx = 0; idx < totalCells; idx++) {
        if (warpCount[idx] > 0) {
          const avg = warpSum[idx] / warpCount[idx];
          if (avg > worstLayerPeak) {
            worstLayerPeak = avg;
            worstLayerNum = layerNum;
          }
        }
      }
    }

    // Step B: Compute aggregate metrics
    let peakWarp = 0;
    let peakCellIdx = 0;
    let printedCells = 0;
    let warnCells = 0;

    // Material-adjusted thresholds (Step C — compute early for coverage calc)
    const adhesion = material.adhesionCoefficient || 0.7;
    const chamberScale = chamberType === 'heated' ? 2.0 : chamberType === 'enclosed' ? 1.5 : 1.0;
    const warnThreshold = 0.4 * adhesion * chamberScale;
    const critThreshold = 0.8 * adhesion * chamberScale;

    for (let idx = 0; idx < totalCells; idx++) {
      if (warpCount[idx] === 0) continue;
      printedCells++;
      const avg = warpSum[idx] / warpCount[idx];
      if (avg > peakWarp) {
        peakWarp = avg;
        peakCellIdx = idx;
      }
      if (avg > warnThreshold) warnCells++;
    }

    if (printedCells === 0) return;

    const warpCoverage = warnCells / printedCells;

    // Convert peak cell to XY coordinates
    const peakGy = Math.floor(peakCellIdx / gridW);
    const peakGx = peakCellIdx % gridW;
    const peakX = minX + peakGx * gridRes;
    const peakY = minY + peakGy * gridRes;

    // Find nearest extrusion move on worst layer for finding location
    const worstMoves = layerMoves[worstLayerNum];
    let refMove = null;
    let refMoveIdx = 0;
    if (worstMoves) {
      let bestDist = Infinity;
      for (let mi = 0; mi < worstMoves.length; mi++) {
        const m = worstMoves[mi];
        if (!m.extrude) continue;
        const mx = (m.x1 + m.x2) / 2, my = (m.y1 + m.y2) / 2;
        const d = Math.hypot(mx - peakX, my - peakY);
        if (d < bestDist) { bestDist = d; refMove = m; refMoveIdx = mi; }
      }
    }
    if (!refMove) {
      // Fallback: use first extrusion move on any layer
      for (const ln of layerNums) {
        const moves = layerMoves[ln];
        if (!moves) continue;
        refMove = moves.find(m => m.extrude) || moves[0];
        if (refMove) { worstLayerNum = ln; break; }
      }
      if (!refMove) return;
    }

    const materialName = material.type || 'unknown';
    const layerHeight = 0.2; // default layer height

    // Step D: Generate findings (at most 3)
    const suggestions = this._warpSuggestion(material, chamberType, peakWarp);

    // 1. Bed adhesion failure
    if (peakWarp > critThreshold) {
      this._addFinding('critical', 'warp-failure', worstLayerNum, refMoveIdx, refMove,
        'Print likely to fail — warp exceeds bed adhesion capacity',
        `Peak averaged warp ${peakWarp.toFixed(2)}mm (threshold ${critThreshold.toFixed(2)}mm for ${materialName}). ` +
        `${(warpCoverage * 100).toFixed(0)}% of footprint affected.`,
        suggestions,
        { failureMode: 'bed-adhesion', peakWarp, warpCoverage, material: materialName });
    } else if (peakWarp > warnThreshold) {
      this._addFinding('warning', 'warp-failure', worstLayerNum, refMoveIdx, refMove,
        'Warping risk — possible bed adhesion issues',
        `Peak averaged warp ${peakWarp.toFixed(2)}mm (threshold ${warnThreshold.toFixed(2)}mm for ${materialName}). ` +
        `${(warpCoverage * 100).toFixed(0)}% of footprint affected.`,
        suggestions,
        { failureMode: 'bed-adhesion', peakWarp, warpCoverage, material: materialName });
    }

    // 2. Nozzle collision — peakWarp > 1.5× layer height
    if (peakWarp > 1.5 * layerHeight) {
      this._addFinding('critical', 'warp-failure', worstLayerNum, refMoveIdx, refMove,
        'Warp may cause nozzle collision — warped edge exceeds layer height',
        `Peak warp ${peakWarp.toFixed(2)}mm exceeds ${(1.5 * layerHeight).toFixed(2)}mm (1.5× layer height ${layerHeight}mm).`,
        suggestions,
        { failureMode: 'nozzle-collision', peakWarp, layerHeight, material: materialName });
    }

    // 3. Dimensional failure — coverage above threshold
    if (warpCoverage > 0.5) {
      this._addFinding('critical', 'warp-failure', worstLayerNum, refMoveIdx, refMove,
        `${(warpCoverage * 100).toFixed(0)}% of print footprint shows significant warping`,
        `More than half of the printed area exceeds the warp warning threshold (${warnThreshold.toFixed(2)}mm).`,
        suggestions,
        { failureMode: 'dimensional', warpCoverage, peakWarp, material: materialName });
    } else if (warpCoverage > 0.3) {
      this._addFinding('warning', 'warp-failure', worstLayerNum, refMoveIdx, refMove,
        `${(warpCoverage * 100).toFixed(0)}% of print footprint shows significant warping`,
        `A substantial portion of the printed area exceeds the warp warning threshold (${warnThreshold.toFixed(2)}mm).`,
        suggestions,
        { failureMode: 'dimensional', warpCoverage, peakWarp, material: materialName });
    }

    // Safe result — if no warp-failure findings were generated
    const warpFindings = this._findings.filter(f => f.category === 'warp-failure');
    if (warpFindings.length === 0) {
      this._addFinding('info', 'warp-failure', worstLayerNum, refMoveIdx, refMove,
        `Warping within safe limits for ${materialName}`,
        `Peak averaged warp ${peakWarp.toFixed(2)}mm is below warning threshold (${warnThreshold.toFixed(2)}mm).`,
        'No action needed.',
        { failureMode: 'none', peakWarp, warpCoverage, material: materialName });
    }
  }

  _warpSuggestion(material, chamberType, peakWarp) {
    const tips = ['Add a brim (10-15mm)'];
    if (chamberType === 'open') tips.push('Use an enclosed or heated chamber');
    if ((material.cte || 0) > 70e-6) tips.push('Consider a lower-CTE variant (e.g. PLA-CF)');
    if (peakWarp > 1.0) tips.push('Reduce part size or split into smaller pieces');
    return tips.join('. ') + '.';
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

  // --- Async Analysis (non-blocking, yields every 20 layers) ---

  async analyzeAsync(layerMoves, profile, onProgress) {
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
    const maxLayerZ = layerNums.length * 0.2;
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

    this._grid = { minX, minY, gridRes, gridW, gridH };
    this._rasterSeen = new Uint8Array(totalCells);
    this._rasterGen = 0;

    // Build parallel typed arrays for the grid
    const temperature = new Float32Array(totalCells);
    const lastExtrusionTime = new Float32Array(totalCells);
    const extrusionCount = new Uint16Array(totalCells);
    const exposureFactor = new Float32Array(totalCells);

    // Init temperature to ambient, exposure to 1.0
    temperature.fill(ambientTemp);
    exposureFactor.fill(1.0);

    const depositionTemp = material.meltTemp * 0.7;
    const coolingConst = (material.thermalConductivity || 0.13) * 0.01 * chamberFactor;

    const layerCoolingTimes = [];
    const perMoveOverlays = [];

    const startTime = Date.now();
    let globalTime = 0;
    let budgetExceeded = false;

    // Pre-allocate scratch arrays
    const _cellStrain = new Float32Array(totalCells);
    const _effectiveDist = new Float32Array(totalCells);
    const _sat = new Float32Array((gridW + 1) * (gridH + 1));
    const _fillFraction = new Float32Array(totalCells);
    const _warpGrid = new Float32Array(totalCells);
    const _tempBuf = new Float32Array(totalCells);
    const _layerTemp = new Float32Array(totalCells);

    const moveRasterCache = new Map();

    // Forward pass (with async yield points)
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

      _layerTemp.set(temperature);

      const materialCTE = material.cte || 68e-6;
      const gt_warp = material.glassTransition || 60;
      _cellStrain.fill(0);

      let centroidX = 0, centroidY = 0, printedCount = 0;
      for (let idx = 0; idx < totalCells; idx++) {
        const dT = _layerTemp[idx] - gt_warp;
        _cellStrain[idx] = dT > 0 ? materialCTE * dT : 0;
        if (extrusionCount[idx] > 0) {
          const gy = Math.floor(idx / gridW);
          const gx = idx % gridW;
          centroidX += (minX + gx * gridRes);
          centroidY += (minY + gy * gridRes);
          printedCount++;
        }
      }
      if (printedCount > 0) {
        centroidX /= printedCount;
        centroidY /= printedCount;
      }

      let partRadius = 1;
      for (let idx = 0; idx < totalCells; idx++) {
        if (extrusionCount[idx] > 0) {
          const gy = Math.floor(idx / gridW), gx = idx % gridW;
          const d = Math.hypot(minX + gx * gridRes - centroidX, minY + gy * gridRes - centroidY);
          if (d > partRadius) partRadius = d;
        }
      }
      _effectiveDist.fill(0);
      for (let idx = 0; idx < totalCells; idx++) {
        if (extrusionCount[idx] === 0) continue;
        const gy = Math.floor(idx / gridW), gx = idx % gridW;
        const d = Math.hypot(minX + gx * gridRes - centroidX, minY + gy * gridRes - centroidY);
        _effectiveDist[idx] = partRadius * (0.4 + 0.6 * d / partRadius);
      }

      const fillRadius = Math.max(2, Math.round(10 / gridRes));
      const satW = gridW + 1, satH = gridH + 1;
      _sat.fill(0);
      for (let y = 1; y <= gridH; y++) {
        for (let x = 1; x <= gridW; x++) {
          _sat[y * satW + x] = (extrusionCount[(y - 1) * gridW + (x - 1)] > 0 ? 1 : 0)
            + _sat[(y - 1) * satW + x] + _sat[y * satW + (x - 1)] - _sat[(y - 1) * satW + (x - 1)];
        }
      }
      _fillFraction.fill(0);
      for (let idx = 0; idx < totalCells; idx++) {
        const gy = Math.floor(idx / gridW), gx = idx % gridW;
        const x0 = Math.max(0, gx - fillRadius), y0 = Math.max(0, gy - fillRadius);
        const x1 = Math.min(gridW - 1, gx + fillRadius), y1 = Math.min(gridH - 1, gy + fillRadius);
        const sum = _sat[(y1 + 1) * satW + (x1 + 1)] - _sat[y0 * satW + (x1 + 1)]
          - _sat[(y1 + 1) * satW + x0] + _sat[y0 * satW + x0];
        const area = (x1 - x0 + 1) * (y1 - y0 + 1);
        _fillFraction[idx] = sum / area;
      }

      // Process each move
      for (let mi = 0; mi < moves.length; mi++) {
        const move = moves[mi];
        if (!move.extrude) {
          this._overlayData.set(`${layerNum}:${mi}`, {
            coolingTime: layerTime,
            heatAccum: 0,
            coolingEff: 0,
            temperature: 0,
            warpRisk: 0,
          });
          continue;
        }

        const len = Math.hypot(move.x2 - move.x1, move.y2 - move.y1);
        if (len < 0.001) {
          this._overlayData.set(`${layerNum}:${mi}`, {
            coolingTime: layerTime,
            heatAccum: 0,
            coolingEff: 0,
            temperature: 0,
            warpRisk: 0,
          });
          continue;
        }

        const exposure = getExposure(move.type);
        this._rasterGen = (this._rasterGen + 1) & 0xFF || 1;
        const cellIndices = this._rasterizeLineIndices(move.x1, move.y1, move.x2, move.y2);
        moveRasterCache.set(`${layerNum}:${mi}`, cellIndices);
        const cellLen = len / Math.max(1, cellIndices.length);

        const midX = (move.x1 + move.x2) / 2;
        const midY = (move.y1 + move.y2) / 2;
        const mgx = Math.floor((midX - minX) / gridRes);
        const mgy = Math.floor((midY - minY) / gridRes);
        const midIdx = (mgx >= 0 && mgx < gridW && mgy >= 0 && mgy < gridH) ? mgy * gridW + mgx : -1;

        let heatScore = 0;
        let temperature_val = 0;
        let coolingEff = 0;
        let warpRisk = 0;

        if (midIdx >= 0 && midIdx < totalCells) {
          const preTemp = _layerTemp[midIdx];

          const gt = material.glassTransition || 60;
          const hdt = material.hdt || (gt + 20);
          if (preTemp > gt) {
            heatScore = Math.min(1.0, (preTemp - gt) / Math.max(1, hdt - gt));
          }

          temperature_val = preTemp;

          if (extrusionCount[midIdx] > 0) {
            coolingEff = Math.min(1.0, (depositionTemp - preTemp) / Math.max(1, depositionTemp - ambientTemp));
          } else {
            coolingEff = 1.0;
          }

          const selfContraction = _cellStrain[midIdx];
          let neighborStress = 0;
          const gy = Math.floor(midIdx / gridW);
          const gx = midIdx % gridW;
          const warpNeighbors = [
            gx > 0 ? midIdx - 1 : -1,
            gx < gridW - 1 ? midIdx + 1 : -1,
            gy > 0 ? midIdx - gridW : -1,
            gy < gridH - 1 ? midIdx + gridW : -1,
          ];
          for (const nIdx of warpNeighbors) {
            if (nIdx < 0 || nIdx >= totalCells || extrusionCount[nIdx] === 0) continue;
            const diff = Math.abs(_cellStrain[midIdx] - _cellStrain[nIdx]);
            if (diff > neighborStress) neighborStress = diff;
          }

          warpRisk = (selfContraction + neighborStress) * _effectiveDist[midIdx] * _fillFraction[midIdx];
        }

        for (const idx of cellIndices) {
          temperature[idx] = Math.max(temperature[idx], depositionTemp);
          lastExtrusionTime[idx] = globalTime;
          extrusionCount[idx]++;
          exposureFactor[idx] = Math.min(exposureFactor[idx], exposure);
        }

        const speed = (move.feedRate || 1500) / 60;
        const moveDuration = speed > 0 ? len / speed : 0;

        this._overlayData.set(`${layerNum}:${mi}`, {
          coolingTime: layerTime,
          heatAccum: heatScore,
          coolingEff,
          temperature: temperature_val,
          warpRisk,
          _timestamp: globalTime,
        });

        globalTime += moveDuration;
      }

      // Store per-layer warp grid
      _warpGrid.fill(0);
      if (printedCount > 0) {
        for (let idx = 0; idx < totalCells; idx++) {
          if (extrusionCount[idx] === 0) continue;
          const strain = _cellStrain[idx];
          const gy = Math.floor(idx / gridW), gx = idx % gridW;
          let nStress = 0;
          const neighbors = [
            gx > 0 ? idx - 1 : -1,
            gx < gridW - 1 ? idx + 1 : -1,
            gy > 0 ? idx - gridW : -1,
            gy < gridH - 1 ? idx + gridW : -1,
          ];
          for (const nIdx of neighbors) {
            if (nIdx >= 0 && nIdx < totalCells && extrusionCount[nIdx] > 0) nStress = Math.max(nStress, Math.abs(strain - _cellStrain[nIdx]));
          }
          _warpGrid[idx] = (strain + nStress) * _effectiveDist[idx] * _fillFraction[idx];
        }
      }
      this._warpGrids.set(layerNum, {
        warpRisk: new Float32Array(_warpGrid),
        extrusionCount: new Uint16Array(extrusionCount),
        gridW, gridH, minX, minY, gridRes,
      });

      // Between layers: cool all cells (Newton's Law)
      for (let idx = 0; idx < totalCells; idx++) {
        if (temperature[idx] > ambientTemp) {
          const exp = exposureFactor[idx];
          const cooling = (temperature[idx] - ambientTemp) * coolingConst * layerTime * fanBoost * exp;
          temperature[idx] = Math.max(ambientTemp, temperature[idx] - cooling);
        }
      }

      // Lateral heat diffusion
      const diffusionRate = 0.15;
      const diffIters = budgetExceeded ? 1 : 3;
      _tempBuf.set(temperature);
      for (let iter = 0; iter < diffIters; iter++) {
        for (let idx = 0; idx < totalCells; idx++) {
          if (_tempBuf[idx] <= ambientTemp) continue;
          const gy = Math.floor(idx / gridW);
          const gx = idx % gridW;
          let sum = 0, count = 0;
          if (gx > 0)          { sum += _tempBuf[idx - 1];     count++; }
          if (gx < gridW - 1)  { sum += _tempBuf[idx + 1];     count++; }
          if (gy > 0)          { sum += _tempBuf[idx - gridW];  count++; }
          if (gy < gridH - 1)  { sum += _tempBuf[idx + gridW];  count++; }
          if (count > 0) {
            const avg = sum / count;
            temperature[idx] = _tempBuf[idx] + diffusionRate * (avg - _tempBuf[idx]);
          }
        }
        _tempBuf.set(temperature);
      }

      // Yield every 20 layers
      if (li % 20 === 19) {
        if (onProgress) onProgress(li / layerNums.length * 0.8);
        await new Promise(r => setTimeout(r, 0));
      }
    }

    // Backward pass (sync — it's fast)
    if (enableBackward && !budgetExceeded) {
      if (onProgress) onProgress(0.8);
      const nextExtrTime = new Float32Array(totalCells);
      nextExtrTime.fill(globalTime);
      let maxCoolingTime = 0;

      for (let li = layerNums.length - 1; li >= 0; li--) {
        const layerNum = layerNums[li];
        const moves = layerMoves[layerNum];
        if (!moves) continue;

        // Phase 1: Read cooling times
        for (let mi = moves.length - 1; mi >= 0; mi--) {
          const move = moves[mi];
          if (!move.extrude) continue;

          const overlayKey = `${layerNum}:${mi}`;
          const existing = this._overlayData.get(overlayKey);
          if (!existing || existing._timestamp === undefined) continue;
          const moveTime = existing._timestamp;

          const midX = (move.x1 + move.x2) / 2;
          const midY = (move.y1 + move.y2) / 2;
          const mgx = Math.floor((midX - minX) / gridRes);
          const mgy = Math.floor((midY - minY) / gridRes);
          const midIdx = (mgx >= 0 && mgx < gridW && mgy >= 0 && mgy < gridH) ? mgy * gridW + mgx : -1;
          if (midIdx >= 0 && midIdx < totalCells) {
            const coolingTime = nextExtrTime[midIdx] - moveTime;
            if (coolingTime > 0) {
              existing.coolingTime = coolingTime;
              maxCoolingTime = Math.max(maxCoolingTime, coolingTime);
            }
          }
        }

        // Phase 2: Update nextExtrTime
        for (let mi = moves.length - 1; mi >= 0; mi--) {
          const move = moves[mi];
          if (!move.extrude) continue;

          const overlayKey = `${layerNum}:${mi}`;
          const existing = this._overlayData.get(overlayKey);
          if (!existing || existing._timestamp === undefined) continue;
          const moveTime = existing._timestamp;

          const cellIndices = moveRasterCache.get(`${layerNum}:${mi}`);
          if (!cellIndices) continue;
          for (const idx of cellIndices) {
            nextExtrTime[idx] = moveTime;
          }
        }
      }
    }

    if (onProgress) onProgress(0.95);

    // Generate findings
    this._generateFindings(layerMoves, layerNums, material, layerCoolingTimes, chamberFactor, chamberType);

    // Store grid data
    this._gridData = { temperature, gridW, gridH, minX, minY, gridRes };

    if (onProgress) onProgress(1.0);
  }
}
