const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

export class AnalysisManager {
  constructor() {
    this.engines = [];
    this._overlayMap = new Map();
    this._statsCache = {};
    this._analyzed = new Set();
    this._eagerEngines = new Set();
    this._storedArgs = null;
  }

  register(engine) {
    this.engines.push(engine);
    for (const overlay of engine.getSupportedOverlays()) {
      this._overlayMap.set(overlay.id, engine);
    }
  }

  markEager(engineName) {
    this._eagerEngines.add(engineName);
  }

  analyzeEager(layerMoves, profile) {
    this._statsCache = {};
    this._storedArgs = { layerMoves, profile };
    for (const engine of this.engines) {
      if (this._eagerEngines.has(engine.name)) {
        engine.analyze(layerMoves, profile);
        this._analyzed.add(engine.name);
      }
    }
  }

  ensureEngine(engineName) {
    if (this._analyzed.has(engineName)) return;
    if (!this._storedArgs) return;
    const engine = this.engines.find(e => e.name === engineName);
    if (!engine) return;
    const { layerMoves, profile } = this._storedArgs;
    engine.analyze(layerMoves, profile);
    this._analyzed.add(engineName);
  }

  ensureAllAnalyzed() {
    if (!this._storedArgs) return;
    for (const engine of this.engines) {
      if (!this._analyzed.has(engine.name)) {
        const { layerMoves, profile } = this._storedArgs;
        engine.analyze(layerMoves, profile);
        this._analyzed.add(engine.name);
      }
    }
  }

  isAnalyzed(engineName) {
    return this._analyzed.has(engineName);
  }

  isAllAnalyzed() {
    return this.engines.every(e => this._analyzed.has(e.name));
  }

  async ensureEngineAsync(engineName, onProgress) {
    if (this._analyzed.has(engineName)) return;
    if (!this._storedArgs) return;
    const engine = this.engines.find(e => e.name === engineName);
    if (!engine) return;
    const { layerMoves, profile } = this._storedArgs;
    if (typeof engine.analyzeAsync === 'function') {
      await engine.analyzeAsync(layerMoves, profile, onProgress);
    } else {
      engine.analyze(layerMoves, profile);
    }
    this._analyzed.add(engineName);
  }

  async ensureAllAnalyzedAsync(onProgress) {
    if (!this._storedArgs) return;
    const toRun = this.engines.filter(e => !this._analyzed.has(e.name));
    if (toRun.length === 0) return;
    for (let i = 0; i < toRun.length; i++) {
      const engine = toRun[i];
      const { layerMoves, profile } = this._storedArgs;
      const engineProgress = (p) => {
        if (onProgress) onProgress({ engine: engine.name, engineProgress: p, overall: (i + p) / toRun.length });
      };
      if (typeof engine.analyzeAsync === 'function') {
        await engine.analyzeAsync(layerMoves, profile, engineProgress);
      } else {
        engine.analyze(layerMoves, profile);
      }
      this._analyzed.add(engine.name);
      if (onProgress) onProgress({ engine: engine.name, engineProgress: 1, overall: (i + 1) / toRun.length });
    }
  }

  analyzeAll(layerMoves, profile) {
    this._statsCache = {};
    this._storedArgs = { layerMoves, profile };
    for (const engine of this.engines) {
      engine.analyze(layerMoves, profile);
      this._analyzed.add(engine.name);
    }
  }

  async analyzeAllAsync(layerMoves, profile, onProgress) {
    this._statsCache = {};
    this._storedArgs = { layerMoves, profile };
    this._analyzed.clear();
    for (let i = 0; i < this.engines.length; i++) {
      const engine = this.engines[i];
      const engineProgress = (p) => {
        if (onProgress) onProgress({ engine: engine.name, engineProgress: p, overall: (i + p) / this.engines.length });
      };
      if (typeof engine.analyzeAsync === 'function') {
        await engine.analyzeAsync(layerMoves, profile, engineProgress);
      } else {
        engine.analyze(layerMoves, profile);
      }
      this._analyzed.add(engine.name);
      if (onProgress) onProgress({ engine: engine.name, engineProgress: 1, overall: (i + 1) / this.engines.length });
    }
  }

  getAllFindings() {
    this.ensureAllAnalyzed();
    const all = [];
    for (const engine of this.engines) {
      all.push(...engine.getFindings());
    }
    all.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
    return all;
  }

  getFindingsByEngine(engineName) {
    this.ensureEngine(engineName);
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
    this.ensureEngine(engine.name);
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
    this._analyzed.clear();
    this._storedArgs = null;
    for (const engine of this.engines) {
      engine.clear();
    }
  }
}
