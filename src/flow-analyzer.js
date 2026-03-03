export class FlowAnalyzer {
  constructor() {
    this.name = 'flow';
    this._overlayData = new Map(); // "layerNum:moveIndex" -> { volumetricFlow, lineWidth, flowRatio }
    this._findings = [];
  }

  // --- Engine Interface ---

  getSupportedOverlays() {
    return [
      { id: 'volumetric-flow', label: 'Volumetric Flow', unit: 'mm\u00b3/s' },
      { id: 'line-width', label: 'Line Width', unit: 'mm' },
      { id: 'flow-ratio', label: 'Flow Ratio', unit: '%' },
    ];
  }

  getOverlayData(overlayId, layerNum, moveIndex) {
    const key = `${layerNum}:${moveIndex}`;
    const data = this._overlayData.get(key);
    if (!data) return 0;
    switch (overlayId) {
      case 'volumetric-flow': return data.volumetricFlow ?? 0;
      case 'line-width': return data.lineWidth ?? 0;
      case 'flow-ratio': return data.flowRatio ?? 0;
      default: return 0;
    }
  }

  getFindings() {
    return this._findings;
  }

  clear() {
    this._overlayData.clear();
    this._findings = [];
  }

  // --- G-code Comment Inference ---

  _inferSettings(profile) {
    const lines = profile._parsedLines || [];

    // Resolve filament diameter
    let filamentDiameter = profile.filament?.diameter;
    if (filamentDiameter == null) {
      for (const line of lines) {
        const match = line.match(/;\s*filament_diameter\s*=\s*([\d.]+)/i);
        if (match) {
          filamentDiameter = parseFloat(match[1]);
          break;
        }
      }
    }
    if (filamentDiameter == null) filamentDiameter = 1.75;

    // Resolve nozzle diameter
    let nozzleDiameter = profile.nozzle?.diameter;
    if (nozzleDiameter == null) {
      for (const line of lines) {
        const match = line.match(/;\s*nozzle_diameter\s*=\s*([\d.]+)/i);
        if (match) {
          nozzleDiameter = parseFloat(match[1]);
          break;
        }
      }
    }
    if (nozzleDiameter == null) nozzleDiameter = 0.4;

    // Resolve flow multiplier
    let flowMultiplier = profile.nozzle?.flowMultiplier;
    if (flowMultiplier == null) {
      // Auto-detect Bambu slicer
      let isBambu = false;
      for (const line of lines) {
        if (/bambu/i.test(line)) {
          isBambu = true;
          break;
        }
      }
      flowMultiplier = isBambu ? 2.0 : 1.0;
    }

    // Resolve max volumetric flow from material profile
    const maxVolumetricFlow = profile.material?.maxVolumetricFlow ?? 15;

    return { filamentDiameter, nozzleDiameter, flowMultiplier, maxVolumetricFlow };
  }

  // --- Layer Height Helpers ---

  _computeLayerHeights(layerMoves, layerNums, profile) {
    // Use profile-provided layer heights if available
    if (profile._layerHeights) return profile._layerHeights;

    const heights = {};
    const defaultHeight = 0.2;

    // Attempt to compute from zHeight differences between consecutive layers
    for (let i = 0; i < layerNums.length; i++) {
      const layerNum = layerNums[i];
      const moves = layerMoves[layerNum];
      if (!moves || moves.length === 0) {
        heights[layerNum] = defaultHeight;
        continue;
      }

      // Try to get zHeight from first move of this layer
      const thisZ = moves[0].z ?? moves[0].zHeight;
      if (thisZ != null && i > 0) {
        const prevLayerNum = layerNums[i - 1];
        const prevMoves = layerMoves[prevLayerNum];
        if (prevMoves && prevMoves.length > 0) {
          const prevZ = prevMoves[0].z ?? prevMoves[0].zHeight;
          if (prevZ != null) {
            const diff = thisZ - prevZ;
            if (diff > 0 && diff < 2) {
              heights[layerNum] = diff;
              continue;
            }
          }
        }
      }

      heights[layerNum] = defaultHeight;
    }

    return heights;
  }

  // --- Main Analysis ---

  analyze(layerMoves, profile) {
    this.clear();

    const { filamentDiameter, nozzleDiameter, flowMultiplier, maxVolumetricFlow } =
      this._inferSettings(profile);

    // Compute effective max flow
    // effectiveMaxFlow = maxVolumetricFlow * flowMultiplier * (nozzleDiameter / 0.4)^2
    const effectiveMaxFlow = maxVolumetricFlow * flowMultiplier *
      (nozzleDiameter / 0.4) ** 2;

    // Filament cross-section area
    const filamentArea = Math.PI * (filamentDiameter / 2) ** 2;

    const layerNums = Object.keys(layerMoves).map(Number).sort((a, b) => a - b);
    if (layerNums.length === 0) return;

    // Compute layer heights
    const layerHeights = this._computeLayerHeights(layerMoves, layerNums, profile);

    // Per-layer analysis
    for (const layerNum of layerNums) {
      const moves = layerMoves[layerNum];
      if (!moves || moves.length === 0) continue;

      const layerHeight = layerHeights[layerNum] ?? 0.2;

      // Track per-layer aggregates for findings
      let worstFlow = 0;
      let maxFlowExceededCount = 0;
      let underExtrusionCount = 0;
      let overExtrusionCount = 0;
      let flowSpikeCount = 0;
      let prevVolumetricFlow = null;
      let worstFlowMove = null;
      let worstFlowMoveIdx = 0;
      let underExtrusionMove = null;
      let underExtrusionMoveIdx = 0;
      let overExtrusionMove = null;
      let overExtrusionMoveIdx = 0;
      let flowSpikeMove = null;
      let flowSpikeMoveIdx = 0;
      let worstSpikeRatio = 0;

      for (let mi = 0; mi < moves.length; mi++) {
        const move = moves[mi];

        // Non-extrusion moves get zero overlay
        if (!move.extrude || !move.eLength || move.eLength <= 0) {
          this._overlayData.set(`${layerNum}:${mi}`, {
            volumetricFlow: 0,
            lineWidth: 0,
            flowRatio: 0,
          });
          // Reset previous flow for spike detection (travel breaks the chain)
          prevVolumetricFlow = null;
          continue;
        }

        const eLength = move.eLength;
        const moveDistance = Math.hypot(move.x2 - move.x1, move.y2 - move.y1);

        if (moveDistance < 0.001) {
          this._overlayData.set(`${layerNum}:${mi}`, {
            volumetricFlow: 0,
            lineWidth: 0,
            flowRatio: 0,
          });
          prevVolumetricFlow = null;
          continue;
        }

        const moveSpeed = (move.feedRate || 1500) / 60; // mm/min to mm/s
        const moveTime = moveDistance / moveSpeed;

        const volumetricFlow = eLength * filamentArea / moveTime; // mm^3/s
        const lineWidth = eLength * filamentArea / (layerHeight * moveDistance); // mm
        const flowRatio = volumetricFlow / effectiveMaxFlow; // 0..1+

        this._overlayData.set(`${layerNum}:${mi}`, {
          volumetricFlow,
          lineWidth,
          flowRatio,
        });

        // --- Finding detection (aggregate per layer) ---

        // 1. Max flow exceeded
        if (volumetricFlow > effectiveMaxFlow) {
          maxFlowExceededCount++;
          if (volumetricFlow > worstFlow) {
            worstFlow = volumetricFlow;
            worstFlowMove = move;
            worstFlowMoveIdx = mi;
          }
        }

        // 2. Under-extrusion risk
        const thinThreshold = nozzleDiameter * 0.8;
        if (lineWidth < thinThreshold || (flowRatio > 0.8 && flowRatio <= 1.0)) {
          underExtrusionCount++;
          if (!underExtrusionMove) {
            underExtrusionMove = move;
            underExtrusionMoveIdx = mi;
          }
        }

        // 3. Over-extrusion
        const wideThreshold = nozzleDiameter * 1.5;
        if (lineWidth > wideThreshold) {
          overExtrusionCount++;
          if (!overExtrusionMove) {
            overExtrusionMove = move;
            overExtrusionMoveIdx = mi;
          }
        }

        // 4. Flow rate spikes (between consecutive extrusion moves)
        if (prevVolumetricFlow != null && prevVolumetricFlow > 0) {
          const spikeRatio = volumetricFlow / prevVolumetricFlow;
          if (spikeRatio > 1.5 || spikeRatio < 0.67) {
            flowSpikeCount++;
            if (Math.abs(spikeRatio - 1) > Math.abs(worstSpikeRatio - 1)) {
              worstSpikeRatio = spikeRatio;
              flowSpikeMove = move;
              flowSpikeMoveIdx = mi;
            }
          }
        }

        prevVolumetricFlow = volumetricFlow;
      }

      // --- Emit aggregated findings for this layer ---

      if (maxFlowExceededCount > 0 && worstFlowMove) {
        this._addFinding('critical', 'max-flow-exceeded', layerNum, worstFlowMoveIdx, worstFlowMove,
          'Volumetric flow exceeds material limit',
          `Layer ${layerNum}: worst flow ${worstFlow.toFixed(1)} mm\u00b3/s exceeds limit of ${effectiveMaxFlow.toFixed(1)} mm\u00b3/s (${maxFlowExceededCount} moves affected). This will cause under-extrusion.`,
          'Reduce print speed, lower flow rate, or use a high-flow hotend.',
          { worstFlow, effectiveMaxFlow, affectedMoves: maxFlowExceededCount });
      }

      if (underExtrusionCount > 0 && underExtrusionMove) {
        this._addFinding('warning', 'under-extrusion', layerNum, underExtrusionMoveIdx, underExtrusionMove,
          'Under-extrusion risk detected',
          `Layer ${layerNum}: ${underExtrusionCount} moves with thin extrusion or marginal flow rate.`,
          'Check filament path for clogs, increase flow rate, or reduce speed.',
          { affectedMoves: underExtrusionCount });
      }

      if (overExtrusionCount > 0 && overExtrusionMove) {
        this._addFinding('info', 'over-extrusion', layerNum, overExtrusionMoveIdx, overExtrusionMove,
          'Over-extrusion detected',
          `Layer ${layerNum}: ${overExtrusionCount} moves with line width exceeding ${(nozzleDiameter * 1.5).toFixed(2)}mm.`,
          'Reduce flow multiplier or extrusion width in slicer settings.',
          { affectedMoves: overExtrusionCount });
      }

      if (flowSpikeCount > 0 && flowSpikeMove) {
        this._addFinding('warning', 'flow-spike', layerNum, flowSpikeMoveIdx, flowSpikeMove,
          'Abrupt flow rate change detected',
          `Layer ${layerNum}: ${flowSpikeCount} flow rate spikes (>50% change between consecutive moves). Pressure advance may not compensate.`,
          'Use gradual speed transitions in slicer or enable pressure advance tuning.',
          { spikeCount: flowSpikeCount, worstSpikeRatio });
      }
    }

    // Merge consecutive findings for each category
    this._mergeConsecutiveFindings('max-flow-exceeded');
    this._mergeConsecutiveFindings('under-extrusion');
    this._mergeConsecutiveFindings('over-extrusion');
    this._mergeConsecutiveFindings('flow-spike');
  }

  // --- Finding Helper ---

  _addFinding(severity, category, layerNum, moveIndex, move, title, description, suggestion, metadata) {
    const id = `fl-${category}-${this._findings.length}`;
    const midX = (move.x1 + move.x2) / 2;
    const midY = (move.y1 + move.y2) / 2;
    this._findings.push({
      id,
      engine: 'flow',
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

  // --- Merge Consecutive Findings ---

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
        id: `fl-${category}-merged-${merged.length}`,
        title: worst.title,
        description: `Layers ${startLayer}\u2013${endLayer}: ${worst.description.replace(/^Layer \d+: /, '')}`,
        location: { ...worst.location, layer: startLayer },
        metadata: { ...worst.metadata, layerRange: [startLayer, endLayer], mergedCount: g.length },
      });
    }

    this._findings = [...other, ...merged];
  }
}
