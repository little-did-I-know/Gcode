let _fanProfileNextId = 1;

export class FanProfileEngine {
  constructor() {
    this.name = 'fan-profile';
    this._rules = [];
    this._overrides = new Map(); // "layerNum:channel" -> speed
    this._compiled = null;       // { layerNum: { 0: speed, 1: speed, 2: speed } }
    this._moveOverrides = null;  // "layerNum:moveIndex:channel" -> speed
    this._thermalData = null;    // Map layerNum -> heat (0-100)

    // Default rules: layers 0-3 P0 0%, layers 4+ P0 100%
    this.addRule({ type: 'layer-range', startLayer: 0, endLayer: 3, channel: 0, speed: 0 });
    this.addRule({ type: 'layer-range', startLayer: 4, endLayer: Infinity, channel: 0, speed: 100 });
  }

  // ── Rules API ──────────────────────────────────────────────

  addRule(rule) {
    const r = { ...rule, id: _fanProfileNextId++ };
    this._rules.push(r);
    this._compiled = null;
    return r;
  }

  removeRule(id) {
    this._rules = this._rules.filter(r => r.id !== id);
    this._compiled = null;
  }

  clearRules() {
    this._rules = [];
    this._compiled = null;
  }

  getRules() {
    return this._rules.map(r => ({ ...r }));
  }

  // ── Graph Overrides API ────────────────────────────────────

  setOverride(layerNum, channel, speed) {
    this._overrides.set(`${layerNum}:${channel}`, speed);
    this._compiled = null;
  }

  removeOverride(layerNum, channel) {
    this._overrides.delete(`${layerNum}:${channel}`);
    this._compiled = null;
  }

  clearOverrides() {
    this._overrides = new Map();
    this._compiled = null;
  }

  getOverrides() {
    return new Map(this._overrides);
  }

  // ── Thermal Data ───────────────────────────────────────────

  setThermalData(thermalMap) {
    this._thermalData = thermalMap;
    this._compiled = null;
  }

  // ── Compilation ────────────────────────────────────────────

  compile(totalLayers) {
    const result = {};

    // Initialize all layers with zeros for channels 0-2
    for (let l = 0; l < totalLayers; l++) {
      result[l] = { 0: 0, 1: 0, 2: 0 };
    }

    // Apply rules in order (later rules override)
    for (const rule of this._rules) {
      if (rule.type === 'layer-range') {
        this._applyLayerRange(result, rule, totalLayers);
      } else if (rule.type === 'thermal') {
        this._applyThermal(result, rule, totalLayers);
      }
      // feature-type rules are handled in compileWithMoves
    }

    // Apply graph overrides (highest priority)
    for (const [key, speed] of this._overrides) {
      const [layerStr, chStr] = key.split(':');
      const layerNum = Number(layerStr);
      const channel = Number(chStr);
      if (result[layerNum]) {
        result[layerNum][channel] = speed;
      }
    }

    this._compiled = result;
    return result;
  }

  _applyLayerRange(result, rule, totalLayers) {
    const ch = rule.channel ?? 0;
    const end = Math.min(rule.endLayer ?? Infinity, totalLayers - 1);
    const start = Math.max(rule.startLayer ?? 0, 0);
    for (let l = start; l <= end; l++) {
      if (result[l]) {
        result[l][ch] = rule.speed;
      }
    }
  }

  _applyThermal(result, rule, totalLayers) {
    if (!this._thermalData) return;
    const ch = rule.channel ?? 0;
    const threshold = rule.threshold ?? 50;
    const speed = rule.speed ?? 100;
    for (let l = 0; l < totalLayers; l++) {
      const heat = this._thermalData.get(l) ?? 0;
      if (heat > threshold && result[l]) {
        result[l][ch] = speed;
      }
    }
  }

  // ── Feature-type compilation ───────────────────────────────

  compileWithMoves(totalLayers, layerMoves) {
    const compiled = this.compile(totalLayers);
    this._moveOverrides = new Map();

    const featureRules = this._rules.filter(r => r.type === 'feature-type');
    if (featureRules.length === 0) return compiled;

    for (let l = 0; l < totalLayers; l++) {
      const moves = layerMoves[l];
      if (!moves) continue;
      for (let m = 0; m < moves.length; m++) {
        const move = moves[m];
        for (const rule of featureRules) {
          if (this._moveMatchesFeature(move, rule.feature)) {
            const ch = rule.channel ?? 0;
            this._moveOverrides.set(`${l}:${m}:${ch}`, rule.speed);
          }
        }
      }
    }

    return compiled;
  }

  _moveMatchesFeature(move, feature) {
    if (!move || !feature || !move.type) return false;
    return move.type.toUpperCase().includes(feature.toUpperCase());
  }

  // ── Overlay Interface (for AnalysisManager) ────────────────

  getSupportedOverlays() {
    return [
      { id: 'fan-speed-p0', label: 'Fan Speed P0', unit: '%' },
      { id: 'fan-speed-p1', label: 'Fan Speed P1', unit: '%' },
      { id: 'fan-speed-p2', label: 'Fan Speed P2', unit: '%' },
    ];
  }

  getOverlayData(overlayId, layerNum, moveIndex) {
    const channel = overlayId === 'fan-speed-p0' ? 0
                  : overlayId === 'fan-speed-p1' ? 1
                  : overlayId === 'fan-speed-p2' ? 2
                  : 0;

    // Check move overrides first
    if (this._moveOverrides) {
      const moveKey = `${layerNum}:${moveIndex}:${channel}`;
      if (this._moveOverrides.has(moveKey)) {
        return this._moveOverrides.get(moveKey);
      }
    }

    // Fall back to per-layer compiled values
    if (this._compiled && this._compiled[layerNum]) {
      return this._compiled[layerNum][channel] ?? 0;
    }

    return 0;
  }

  getFindings() {
    return [];
  }

  analyze() {
    // no-op — fan profile is driven by user rules, not analysis
  }

  clear() {
    this._compiled = null;
    this._moveOverrides = null;
  }

  // ── G-code Generation ──────────────────────────────────────

  generateGcode(totalLayers) {
    if (!this._compiled) {
      this.compile(totalLayers);
    }

    const output = [];
    // Track previous speed per channel to only emit on change
    const prev = { 0: -1, 1: -1, 2: -1 };

    for (let l = 0; l < totalLayers; l++) {
      const layerSpeeds = this._compiled[l];
      if (!layerSpeeds) continue;

      const commands = [];
      for (let ch = 0; ch <= 2; ch++) {
        const speed = layerSpeeds[ch] ?? 0;
        if (speed === prev[ch]) continue; // no change, skip

        if (speed === 0 && ch === 0) {
          commands.push('M107 ; Fan off');
        } else if (speed === 0) {
          commands.push(`M107 P${ch} ; Fan ${ch} off`);
        } else {
          const sValue = Math.round((speed / 100) * 255);
          commands.push(`M106 P${ch} S${sValue} ; Fan ${ch} ${speed}%`);
        }
        prev[ch] = speed;
      }

      if (commands.length > 0) {
        output.push({ layer: l, gcode: commands.join('\n') });
      }
    }

    return output;
  }

  generateGcodeBlock(totalLayers) {
    const entries = this.generateGcode(totalLayers);
    if (entries.length === 0) return '';
    const lines = ['; === FAN PROFILE ==='];
    for (const entry of entries) {
      lines.push(`; Layer ${entry.layer}`);
      lines.push(entry.gcode);
    }
    lines.push('; === END FAN PROFILE ===');
    return lines.join('\n');
  }
}

export default FanProfileEngine;
