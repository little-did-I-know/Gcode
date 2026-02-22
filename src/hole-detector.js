// ===== HOLE DETECTOR =====
export class HoleDetector {
  constructor() {
    this.resolution = 0.5; // mm per grid cell
    this.lineWidth = 0.45; // extrusion width in mm
    this.gridCache = new Map();
    this.holes = new Map(); // layerNum -> HoleInfo[]
    this.selectedHoles = [];
    this.scannedHoles = []; // flat array of unique holes from full scan
  }

  clearCache() {
    this.gridCache.clear();
    this.holes.clear();
    this.selectedHoles = [];
    this.scannedHoles = [];
  }

  _getGridDims() {
    const b = parser.bounds;
    const w = Math.ceil((b.maxX - b.minX) / this.resolution) + 2;
    const h = Math.ceil((b.maxY - b.minY) / this.resolution) + 2;
    return { w, h, offX: b.minX, offY: b.minY };
  }

  _toGrid(gcodeX, gcodeY, dims) {
    return {
      gx: Math.round((gcodeX - dims.offX) / this.resolution),
      gy: Math.round((gcodeY - dims.offY) / this.resolution)
    };
  }

  _toGcode(gx, gy, dims) {
    return {
      x: gx * this.resolution + dims.offX,
      y: gy * this.resolution + dims.offY
    };
  }

  rasterizeLayer(layerNum, ignoreInfill) {
    const cacheKey = `${layerNum}_${ignoreInfill ? 1 : 0}`;
    if (this.gridCache.has(cacheKey)) return this.gridCache.get(cacheKey);

    const dims = this._getGridDims();
    const grid = new Uint8Array(dims.w * dims.h); // 0 = empty, 1 = filled
    const moves = parser.layerMoves[layerNum];
    if (!moves) { this.gridCache.set(cacheKey, { grid, dims }); return { grid, dims }; }

    const halfW = Math.ceil(this.lineWidth / 2 / this.resolution);

    for (const move of moves) {
      if (!move.extrude) continue;
      // Optionally skip infill
      if (ignoreInfill) {
        const t = move.type.toUpperCase();
        if (t.includes('INFILL') || t.includes('FILL') || t === 'SPARSE' || t === 'SOLID') continue;
      }

      const p0 = this._toGrid(move.x1, move.y1, dims);
      const p1 = this._toGrid(move.x2, move.y2, dims);

      // Bresenham's line with square stamp
      let dx = Math.abs(p1.gx - p0.gx), dy = Math.abs(p1.gy - p0.gy);
      let sx = p0.gx < p1.gx ? 1 : -1, sy = p0.gy < p1.gy ? 1 : -1;
      let err = dx - dy;
      let cx = p0.gx, cy = p0.gy;

      while (true) {
        // Square stamp around current point
        for (let sy2 = -halfW; sy2 <= halfW; sy2++) {
          for (let sx2 = -halfW; sx2 <= halfW; sx2++) {
            const nx = cx + sx2, ny = cy + sy2;
            if (nx >= 0 && nx < dims.w && ny >= 0 && ny < dims.h) {
              grid[ny * dims.w + nx] = 1;
            }
          }
        }
        if (cx === p1.gx && cy === p1.gy) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
      }
    }

    this.gridCache.set(cacheKey, { grid, dims });
    return { grid, dims };
  }

  detectHoles(layerNum, minDiameterMm, ignoreInfill) {
    minDiameterMm = minDiameterMm || 4;
    const { grid, dims } = this.rasterizeLayer(layerNum, ignoreInfill);
    const w = dims.w, h = dims.h;
    const totalCells = w * h;

    // Labels: 0 = unvisited empty, 1 = filled, 2 = exterior, 3+ = hole IDs
    const labels = new Int32Array(totalCells);
    for (let i = 0; i < totalCells; i++) labels[i] = grid[i] ? 1 : 0;

    // BFS flood-fill from all border cells to mark exterior
    // Use typed-array circular buffer for O(1) enqueue/dequeue
    const queueBuf = new Int32Array(totalCells);
    let qHead = 0, qTail = 0;
    const enqueue = (idx) => { queueBuf[qTail++ % totalCells] = idx; };
    const dequeue = () => queueBuf[qHead++ % totalCells];

    // Seed border cells
    for (let x = 0; x < w; x++) {
      if (labels[x] === 0) { labels[x] = 2; enqueue(x); }
      const botIdx = (h - 1) * w + x;
      if (labels[botIdx] === 0) { labels[botIdx] = 2; enqueue(botIdx); }
    }
    for (let y = 1; y < h - 1; y++) {
      if (labels[y * w] === 0) { labels[y * w] = 2; enqueue(y * w); }
      const rIdx = y * w + w - 1;
      if (labels[rIdx] === 0) { labels[rIdx] = 2; enqueue(rIdx); }
    }

    // BFS to mark all exterior
    const dx4 = [1, -1, 0, 0], dy4 = [0, 0, 1, -1];
    while (qHead < qTail) {
      const idx = dequeue();
      const cx = idx % w, cy = (idx - cx) / w;
      for (let d = 0; d < 4; d++) {
        const nx = cx + dx4[d], ny = cy + dy4[d];
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (labels[nIdx] === 0) { labels[nIdx] = 2; enqueue(nIdx); }
      }
    }

    // Find connected components of remaining empty cells (label === 0)
    const holesFound = [];
    let nextLabel = 3;
    for (let i = 0; i < totalCells; i++) {
      if (labels[i] !== 0) continue;
      // BFS for this hole
      const holeLabel = nextLabel++;
      const cells = [];
      qHead = 0; qTail = 0;
      labels[i] = holeLabel;
      enqueue(i);

      while (qHead < qTail) {
        const idx = dequeue();
        cells.push(idx);
        const cx = idx % w, cy = (idx - cx) / w;
        for (let d = 0; d < 4; d++) {
          const nx = cx + dx4[d], ny = cy + dy4[d];
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (labels[nIdx] === 0) { labels[nIdx] = holeLabel; enqueue(nIdx); }
        }
      }

      // Compute bbox, centroid, area
      let minGx = Infinity, maxGx = -Infinity, minGy = Infinity, maxGy = -Infinity;
      let sumX = 0, sumY = 0;
      const cellSet = new Set(cells);
      for (const idx of cells) {
        const cx = idx % w, cy = (idx - cx) / w;
        if (cx < minGx) minGx = cx;
        if (cx > maxGx) maxGx = cx;
        if (cy < minGy) minGy = cy;
        if (cy > maxGy) maxGy = cy;
        sumX += cx; sumY += cy;
      }

      const areaMm2 = cells.length * this.resolution * this.resolution;
      const rawDiameter = 2 * Math.sqrt(areaMm2 / Math.PI);
      // Compensate for wall stamp encroachment: the rasterization stamp eats into
      // the hole by ~halfW*resolution on each side, making detected area smaller
      const halfW = Math.ceil(this.lineWidth / 2 / this.resolution);
      const stampCorrection = halfW * this.resolution * 2;
      const diameterMm = rawDiameter + stampCorrection;

      if (diameterMm < minDiameterMm) continue; // Filter small holes

      // Shape classification via bounding-box fill ratio — more reliable on rasterized
      // grids than perimeter-based circularity (grid perimeter overestimates smooth curves
      // by ~4/π, making circles score lower than squares on circularity)
      const bboxW = (maxGx - minGx + 1) * this.resolution + stampCorrection;
      const bboxH = (maxGy - minGy + 1) * this.resolution + stampCorrection;
      const aspect = Math.max(bboxW, bboxH) / Math.max(0.1, Math.min(bboxW, bboxH));
      const rawBboxW = (maxGx - minGx + 1) * this.resolution;
      const rawBboxH = (maxGy - minGy + 1) * this.resolution;
      const rawBboxArea = rawBboxW * rawBboxH;
      const fillRatio = rawBboxArea > 0 ? areaMm2 / rawBboxArea : 0;
      let shape;
      if (aspect < 1.12) {
        // Nearly square bounding box — circle vs square
        shape = fillRatio < 0.9 ? 'circle' : 'square';
      } else if (aspect < 1.3) {
        shape = fillRatio < 0.88 ? 'hexagon' : 'rectangle';
      } else {
        shape = 'rectangle';
      }

      const centroid = this._toGcode(sumX / cells.length, sumY / cells.length, dims);
      const bboxMin = this._toGcode(minGx, minGy, dims);
      const bboxMax = this._toGcode(maxGx, maxGy, dims);

      holesFound.push({
        id: `hole_${layerNum}_${holesFound.length}`,
        label: holeLabel,
        layerNum,
        cells,
        cellSet,
        areaMm2,
        diameterMm,
        shape,
        widthMm: bboxW,
        heightMm: bboxH,
        fillRatio,
        centroid,
        bbox: { minX: bboxMin.x, minY: bboxMin.y, maxX: bboxMax.x, maxY: bboxMax.y },
        gridDims: dims,
        floorLayer: null,
        depthMm: null
      });
    }

    this.holes.set(layerNum, holesFound);
    return holesFound;
  }

  findHoleAtPoint(gcodeX, gcodeY, layerNum) {
    const holes = this.holes.get(layerNum);
    if (!holes) return null;

    for (const hole of holes) {
      if (gcodeX >= hole.bbox.minX && gcodeX <= hole.bbox.maxX &&
          gcodeY >= hole.bbox.minY && gcodeY <= hole.bbox.maxY) {
        // Check if the actual grid cell is part of this hole
        const { gx, gy } = this._toGrid(gcodeX, gcodeY, hole.gridDims);
        const idx = gy * hole.gridDims.w + gx;
        if (hole.cellSet.has(idx)) return hole;
      }
    }
    return null;
  }

  analyzeHoleDepth(hole, startLayerNum) {
    const dims = hole.gridDims;

    // Get footprint cells as a set of (gx, gy) pairs
    const footprint = new Set(hole.cells);
    let floorLayer = -1;

    // Scan layers downward — always include infill when looking for the floor,
    // because the floor of interior holes IS solid infill
    for (let ln = startLayerNum - 1; ln >= 0; ln--) {
      const layer = parser.getLayerByNumber(ln);
      if (!layer) continue;

      const { grid } = this.rasterizeLayer(ln, false);
      // Check what % of footprint cells are filled in this layer
      let filledCount = 0;
      for (const idx of footprint) {
        if (idx >= 0 && idx < grid.length && grid[idx] === 1) filledCount++;
      }

      const overlapRatio = filledCount / footprint.size;
      if (overlapRatio >= 0.8) {
        floorLayer = ln;
        break;
      }
    }

    hole.floorLayer = floorLayer;
    if (floorLayer >= 0) {
      const startLayer = parser.getLayerByNumber(startLayerNum);
      const floorLayerData = parser.getLayerByNumber(floorLayer);
      if (startLayer && floorLayerData && startLayer.zHeight != null && floorLayerData.zHeight != null) {
        hole.depthMm = startLayer.zHeight - floorLayerData.zHeight;
      } else {
        hole.depthMm = null;
      }
    } else {
      hole.depthMm = null; // through-hole
    }

    return hole;
  }

  _holesOverlap(h1, h2) {
    const dx = h1.centroid.x - h2.centroid.x;
    const dy = h1.centroid.y - h2.centroid.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = Math.max(h1.diameterMm, h2.diameterMm) / 2;
    return dist < maxRadius;
  }

  async scanAllLayers(minDiameterMm, ignoreInfill, progressCb) {
    this.scannedHoles = [];
    this.selectedHoles = [];
    const layers = parser.layers;
    const uniqueHoles = [];

    // Scan from top layer to bottom
    for (let i = layers.length - 1; i >= 0; i--) {
      const ln = layers[i].number;
      if (progressCb) progressCb(layers.length - 1 - i, layers.length);

      const layerHoles = this.detectHoles(ln, minDiameterMm, ignoreInfill);

      for (const hole of layerHoles) {
        let matched = false;
        for (const existing of uniqueHoles) {
          if (this._holesOverlap(existing.hole, hole)) {
            matched = true;
            break;
          }
        }
        if (!matched) {
          hole.topLayer = ln;
          uniqueHoles.push({ hole, topLayer: ln });
        }
      }

      // Yield to event loop every 5 layers to keep UI responsive
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // Analyze depth for each unique hole
    for (const entry of uniqueHoles) {
      this.analyzeHoleDepth(entry.hole, entry.topLayer);
    }

    this.scannedHoles = uniqueHoles.map(e => e.hole);
    return this.scannedHoles;
  }
}
