// Print Readiness Diagnostics Engine.
// Scans analysis results and generates actionable warnings.

const Diagnostics = {
  warnings: [],

  // Run after eager analysis (motion + flow)
  scan(parserRef) {
    this.warnings = [];
    this._checkLayerTime(parserRef);
    this._checkFlow(parserRef);
    this._checkFirstLayer(parserRef);
    this._checkLongTravel(parserRef);
  },

  // Run after deep analysis (thermal, structural, retraction)
  scanDeep() {
    this._checkOverhangs();
    this._checkRetraction();
    this._checkWarpRisk();
  },

  getSeverityCounts() {
    let info = 0, warning = 0, critical = 0;
    for (const w of this.warnings) {
      if (w.severity === 'critical') critical++;
      else if (w.severity === 'warning') warning++;
      else info++;
    }
    return { info, warning, critical, total: this.warnings.length };
  },

  _addWarning(id, category, severity, message, layers, action) {
    // Don't add duplicates
    if (this.warnings.find(w => w.id === id)) return;
    this.warnings.push({ id, category, severity, message, layers: layers || [], action: action || null });
  },

  _checkLayerTime(parserRef) {
    // Find layers with estimated time below material minimum
    if (typeof motionAnalyzer === 'undefined' || !motionAnalyzer._layerTimes) return;
    const minTime = (typeof analysisProfile !== 'undefined' && analysisProfile.material)
      ? (analysisProfile.material.minLayerTime || 8) : 8;

    const fastLayers = [];
    motionAnalyzer._layerTimes.forEach((timeSecs, layerNum) => {
      if (timeSecs > 0 && timeSecs < minTime && layerNum > 0) {
        fastLayers.push(layerNum);
      }
    });

    if (fastLayers.length > 0) {
      // Group consecutive layers
      const groups = this._groupConsecutive(fastLayers);
      for (const group of groups) {
        const rangeStr = group.length === 1 ? `Layer ${group[0]}` : `Layers ${group[0]}-${group[group.length - 1]}`;
        const severity = group.length > 5 ? 'critical' : 'warning';
        this._addWarning(
          'fast-layer-' + group[0],
          'Cooling',
          severity,
          `${rangeStr}: layer time under ${minTime}s minimum`,
          group,
          { type: 'navigate', label: 'Show in viewer', fn: () => { selectLayer(group[0]); } }
        );
      }
    }
  },

  _checkFlow(parserRef) {
    // Check for sudden flow rate changes >30% between adjacent extrusion moves
    if (typeof flowAnalyzer === 'undefined' || !flowAnalyzer._findings) return;

    const issueLayersSet = new Set();
    for (let layerNum = 0; layerNum < parserRef.layers.length; layerNum++) {
      const moves = parserRef.layerMoves[layerNum];
      if (!moves || moves.length < 2) continue;

      let prevFlow = null;
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        if (!m.extrude || !m.eLength) continue;
        const len = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
        if (len < 0.1) continue;
        const speed = (m.feedRate || 0) / 60;
        if (speed < 0.1) continue;
        const flow = (m.eLength / len) * speed;

        if (prevFlow !== null && prevFlow > 0) {
          const change = Math.abs(flow - prevFlow) / prevFlow;
          if (change > 0.3) {
            issueLayersSet.add(layerNum);
            break; // One per layer is enough
          }
        }
        prevFlow = flow;
      }
    }

    const issueLayers = Array.from(issueLayersSet).sort((a, b) => a - b);
    if (issueLayers.length > 5) {
      const groups = this._groupConsecutive(issueLayers);
      for (const group of groups.slice(0, 3)) { // Cap at 3 warnings
        const rangeStr = group.length === 1 ? `Layer ${group[0]}` : `Layers ${group[0]}-${group[group.length - 1]}`;
        this._addWarning(
          'flow-var-' + group[0],
          'Flow',
          'warning',
          `${rangeStr}: flow rate variance >30% between moves`,
          group,
          { type: 'navigate', label: 'Show flow heatmap', fn: () => { selectLayer(group[0]); setColorMode('volumetric-flow'); } }
        );
      }
    }
  },

  _checkFirstLayer(parserRef) {
    // Basic first layer checks
    const moves = parserRef.layerMoves[0];
    if (!moves || moves.length === 0) return;

    const extMoves = moves.filter(m => m.extrude);
    if (extMoves.length === 0) return;

    // Check if first layer has very fast speeds (>60 mm/s)
    const avgSpeed = extMoves.reduce((s, m) => s + (m.feedRate || 0) / 60, 0) / extMoves.length;
    if (avgSpeed > 60) {
      this._addWarning(
        'first-layer-speed',
        'First Layer',
        'warning',
        `First layer average speed is ${avgSpeed.toFixed(0)} mm/s (may cause adhesion issues)`,
        [0],
        { type: 'navigate', label: 'View first layer', fn: () => selectLayer(0) }
      );
    }
  },

  _checkLongTravel(parserRef) {
    // Find travel moves >20mm - potential stringing
    const longTravelLayers = new Set();
    for (let layerNum = 1; layerNum < parserRef.layers.length; layerNum++) {
      const moves = parserRef.layerMoves[layerNum];
      if (!moves) continue;
      for (const m of moves) {
        if (m.extrude) continue;
        const len = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
        if (len > 20) {
          longTravelLayers.add(layerNum);
          break;
        }
      }
    }

    if (longTravelLayers.size > 10) {
      this._addWarning(
        'long-travel',
        'Travel',
        'info',
        `${longTravelLayers.size} layers have travel moves >20mm (potential stringing)`,
        Array.from(longTravelLayers).sort((a, b) => a - b).slice(0, 5),
        { type: 'navigate', label: 'Check first occurrence', fn: () => {
          const first = Math.min(...longTravelLayers);
          selectLayer(first);
        }}
      );
    }
  },

  _checkOverhangs() {
    if (typeof structuralAnalyzer === 'undefined' || !structuralAnalyzer._findings) return;
    const findings = structuralAnalyzer._findings;
    if (!findings || findings.length === 0) return;

    // Only report warning/critical overhang findings — info-level ones are minor
    const overhangFindings = findings.filter(f =>
      (f.category === 'overhang' || f.category === 'bridge') &&
      (f.severity === 'warning' || f.severity === 'critical')
    );
    if (overhangFindings.length > 0) {
      const layers = [...new Set(overhangFindings.map(f => f.location && f.location.layer).filter(l => l != null))].sort((a, b) => a - b);
      if (layers.length === 0) return;
      const hasCritical = overhangFindings.some(f => f.severity === 'critical');
      this._addWarning(
        'overhangs',
        'Structure',
        hasCritical ? 'critical' : 'warning',
        `${overhangFindings.length} overhang/bridge issues detected across ${layers.length} layers`,
        layers.slice(0, 10),
        { type: 'navigate', label: 'Show overhang overlay', fn: () => { selectLayer(layers[0]); setColorMode('overhang-severity'); } }
      );
    }
  },

  _checkRetraction() {
    if (typeof retractionAnalyzer === 'undefined' || !retractionAnalyzer._findings) return;
    const findings = retractionAnalyzer._findings;
    if (!findings || findings.length === 0) return;

    if (findings.length > 5) {
      const layers = [...new Set(findings.map(f => f.location && f.location.layer).filter(l => l != null))].sort((a, b) => a - b);
      if (layers.length === 0) return;
      this._addWarning(
        'retraction-issues',
        'Retraction',
        'warning',
        `${findings.length} retraction issues found (potential blobs or ooze)`,
        layers.slice(0, 10),
        { type: 'navigate', label: 'Show stringing risk overlay', fn: () => { selectLayer(layers[0]); setColorMode('stringing-risk'); } }
      );
    }
  },

  _checkWarpRisk() {
    if (typeof thermalAnalyzer === 'undefined' || !thermalAnalyzer._findings) return;
    const findings = thermalAnalyzer._findings;

    // Check for warp-failure findings from the thermal analyzer
    const warpFindings = findings.filter(f => f.category === 'warp-failure' && f.severity !== 'info');
    if (warpFindings.length > 0) {
      const worstSeverity = warpFindings.some(f => f.severity === 'critical') ? 'critical' : 'warning';
      const descriptions = warpFindings.map(f => f.title).join('; ');
      this._addWarning(
        'warp-risk',
        'Warping',
        worstSeverity,
        `Warp risk detected: ${descriptions}`,
        [],
        { type: 'navigate', label: 'Show warp view', fn: () => { if (typeof setView !== 'undefined') setView('warp'); } }
      );
    }
  },

  _groupConsecutive(nums) {
    if (nums.length === 0) return [];
    const sorted = nums.slice().sort((a, b) => a - b);
    const groups = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        groups[groups.length - 1].push(sorted[i]);
      } else {
        groups.push([sorted[i]]);
      }
    }
    return groups;
  }
};
