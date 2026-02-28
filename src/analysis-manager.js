const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

export class AnalysisManager {
  constructor() {
    this.engines = [];
    this._overlayMap = new Map();
    this._statsCache = {};
  }

  register(engine) {
    this.engines.push(engine);
    for (const overlay of engine.getSupportedOverlays()) {
      this._overlayMap.set(overlay.id, engine);
    }
  }

  analyzeAll(layerMoves, profile) {
    this._statsCache = {};
    for (const engine of this.engines) {
      engine.analyze(layerMoves, profile);
    }
  }

  getAllFindings() {
    const all = [];
    for (const engine of this.engines) {
      all.push(...engine.getFindings());
    }
    all.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
    return all;
  }

  getFindingsByEngine(engineName) {
    const engine = this.engines.find(e => e.name === engineName);
    if (!engine) return [];
    const findings = engine.getFindings();
    findings.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
    return findings;
  }

  getSupportedOverlays() {
    const overlays = [];
    for (const engine of this.engines) {
      overlays.push(...engine.getSupportedOverlays());
    }
    return overlays;
  }

  getOverlayValue(overlayId, layerNum, moveIndex) {
    const engine = this._overlayMap.get(overlayId);
    if (!engine) return 0;
    return engine.getOverlayData(overlayId, layerNum, moveIndex);
  }

  getOverlayStats(overlayId, layerNum, layerMoves) {
    const key = `${overlayId}-${layerNum}`;
    if (this._statsCache[key]) return this._statsCache[key];
    const moves = layerMoves[layerNum];
    if (!moves || moves.length === 0) return { min: 0, max: 1, avg: 0 };
    let min = Infinity, max = -Infinity, sum = 0, count = 0;
    for (let i = 0; i < moves.length; i++) {
      if (!moves[i].extrude) continue;
      const v = this.getOverlayValue(overlayId, layerNum, i);
      if (v <= 0) continue;
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      count++;
    }
    if (count === 0) return { min: 0, max: 1, avg: 0 };
    if (min === max) min = 0;
    const stats = { min, max, avg: sum / count };
    this._statsCache[key] = stats;
    return stats;
  }

  clear() {
    this._statsCache = {};
    for (const engine of this.engines) {
      engine.clear();
    }
  }
}
