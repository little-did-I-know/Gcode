// Live Stats Overlay — shows layer and hover info on the 3D viewer

const StatsOverlay = {
  _el: null,
  _layerEl: null,
  _hoverEl: null,

  init() {
    this._el = document.getElementById('statsOverlay');
    this._layerEl = document.getElementById('statsLayerInfo');
    this._hoverEl = document.getElementById('statsHoverInfo');
  },

  show() {
    if (this._el) this._el.style.display = '';
  },

  hide() {
    if (this._el) this._el.style.display = 'none';
  },

  updateLayerStats(layerNum) {
    if (!this._layerEl) return;
    const layer = parser.getLayerByNumber(layerNum);
    if (!layer) { this._layerEl.innerHTML = ''; return; }

    const totalLayers = parser.layers.length;
    const zHeight = layer.zHeight !== null ? layer.zHeight.toFixed(2) : '?';

    // Count extrusion vs travel moves
    const moves = parser.layerMoves[layerNum];
    let extrudeCount = 0, travelCount = 0;
    let extrudeLen = 0, travelLen = 0;
    let totalELen = 0;
    if (moves) {
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const len = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
        if (m.extrude) {
          extrudeCount++;
          extrudeLen += len;
          if (m.eLength) totalELen += m.eLength;
        } else {
          travelCount++;
          travelLen += len;
        }
      }
    }

    // Layer time from motionAnalyzer
    let timeStr = '';
    if (typeof motionAnalyzer !== 'undefined' && motionAnalyzer._layerTimes) {
      const timeSecs = motionAnalyzer._layerTimes.get(layerNum);
      if (timeSecs != null && timeSecs > 0) {
        const secs = timeSecs;
        if (secs >= 60) {
          const m = Math.floor(secs / 60);
          const s = Math.round(secs % 60);
          timeStr = `${m}m ${s}s`;
        } else {
          timeStr = `${secs.toFixed(1)}s`;
        }
      }
    }

    let html = '';
    html += `<span class="stat-label">Layer</span><span class="stat-value">${layerNum}</span><span class="stat-label"> / ${totalLayers - 1}</span>`;
    html += `<span class="stat-label" style="margin-left:10px">Z</span><span class="stat-value">${zHeight} mm</span><br>`;
    html += `<span class="stat-label">Extrude</span><span class="stat-value">${extrudeCount}</span>`;
    html += `<span class="stat-label" style="margin-left:6px">(${extrudeLen.toFixed(1)} mm)</span>`;
    html += `<span class="stat-label" style="margin-left:10px">Travel</span><span class="stat-value">${travelCount}</span>`;
    html += `<span class="stat-label" style="margin-left:6px">(${travelLen.toFixed(1)} mm)</span><br>`;
    if (totalELen > 0) {
      html += `<span class="stat-label">Filament</span><span class="stat-value">${totalELen.toFixed(2)} mm</span>`;
    }
    if (timeStr) {
      html += `<span class="stat-label" style="margin-left:10px">Time</span><span class="stat-value">${timeStr}</span>`;
    }

    // Comparison stats
    if (typeof LayerComparison !== 'undefined' && LayerComparison.active) {
      const compareMoves = LayerComparison.getCompareMoves(layerNum);
      let cExtCount = 0, cTravelCount = 0, cExtLen = 0;
      if (compareMoves) {
        for (let i = 0; i < compareMoves.length; i++) {
          const m = compareMoves[i];
          if (m.extrude) { cExtCount++; cExtLen += Math.hypot(m.x2 - m.x1, m.y2 - m.y1); }
          else cTravelCount++;
        }
      }
      const label = LayerComparison.compareParser ? 'Compare file' : ('Compare L' + LayerComparison.compareLayerNum);
      html += '<br><span class="stat-label" style="color:#fb923c;">' + label + '</span>';
      html += `<span class="stat-label">Ext</span><span class="stat-value" style="color:#fb923c;">${cExtCount}</span>`;
      html += `<span class="stat-label" style="margin-left:6px">(${cExtLen.toFixed(1)} mm)</span>`;
      html += `<span class="stat-label" style="margin-left:10px">Travel</span><span class="stat-value" style="color:#fb923c;">${cTravelCount}</span>`;
    }

    this._layerEl.innerHTML = html;
  },

  showHoverInfo(move, layerNum, moveIndex) {
    if (!this._hoverEl) return;
    this._hoverEl.style.display = '';

    const type = move.type || 'UNKNOWN';
    const feedRate = move.feedRate || 0;
    const speed = feedRate / 60; // mm/s
    const moveLen = Math.hypot(move.x2 - move.x1, move.y2 - move.y1);
    const eLen = move.eLength || 0;

    // Flow rate: eLength / moveLen * speed (mm^3/s approximation)
    let flowStr = '';
    if (moveLen > 0.001 && eLen > 0 && speed > 0) {
      const flow = (eLen / moveLen) * speed;
      flowStr = flow.toFixed(2);
    }

    let html = '<div class="hover-divider"></div>';
    html += `<span class="stat-label">Type</span><span class="stat-value">${type}</span>`;
    html += `<span class="stat-label" style="margin-left:10px">Speed</span><span class="stat-value">${speed.toFixed(1)} mm/s</span><br>`;
    html += `<span class="stat-label">Length</span><span class="stat-value">${moveLen.toFixed(2)} mm</span>`;
    if (eLen > 0) {
      html += `<span class="stat-label" style="margin-left:10px">E</span><span class="stat-value">${eLen.toFixed(4)} mm</span>`;
    }
    if (flowStr) {
      html += `<br><span class="stat-label">Flow</span><span class="stat-value">${flowStr} mm\u00B3/s</span>`;
    }
    if (move.lineIndex != null) {
      html += `<br><span class="stat-label">Line</span><span class="stat-link" onclick="goToLine(${move.lineIndex})">${move.lineIndex + 1}</span>`;
    }

    this._hoverEl.innerHTML = html;
  },

  clearHoverInfo() {
    if (this._hoverEl) this._hoverEl.style.display = 'none';
  }
};
