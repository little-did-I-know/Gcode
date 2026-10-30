// ===== G-CODE PARSER =====

// Layer marker: standard ";LAYER:N" plus FibreSeeker "; LAYER:N [z]" where the
// bracketed value is the layer's absolute Z height. The anchor means
// "; MACROLAYER:" and "; LAYER_COUNT:" never match.
const LAYER_MARKER_RE = /^;\s*LAYER:(\d+)\s*(?:\[(\d+(?:\.\d+)?)\])?/i;

// FibreSeek Rocket Slicer section headers, e.g. "; Skirt start", "; Cellular infill start".
// Numbered "; Inset X start" sections are resolved in code (see FIBRESEEKER inset rules).
const FIBRESEEKER_TYPE_MAP = {
  'skirt': 'SKIRT',
  'priming line': 'PRIMING',
  'top most solid infill': 'TOP',
  'top intermediate solid infill': 'TOP',
  'bottom most solid infill': 'BOTTOM',
  'bottom intermediate solid infill': 'BOTTOM',
  'cellular infill': 'FILL',
  'micro infill': 'SOLID',
  'fiber infill': 'FIBER',
  'overhang infill': 'OVERHANG',
  'support thick': 'SUPPORT',
  'support interface': 'SUPPORT-INTERFACE',
};

// Feature names come straight from the file and end up in innerHTML / inline handlers.
// Fold free-form text down to a safe token so it can never carry markup.
const MAX_TYPE_NAME_LENGTH = 40;
function sanitizeTypeName(raw) {
  const cleaned = String(raw).toUpperCase().replace(/[^A-Z0-9_ ./-]/g, '').trim().slice(0, MAX_TYPE_NAME_LENGTH).trim();
  return cleaned || 'CUSTOM';
}

// Bambu H2C / Vortek: header colours are "#RRGGBB" (sometimes with an alpha byte).
const HEX_COLOR_RE = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;

// Deterministic, well-spread color for filament slots the header does not describe.
function fallbackFilamentColor(index) {
  const hue = (index * 137.508) % 360; // golden-angle steps keep neighbours distinct
  const s = 0.65, l = 0.55;
  const a = s * Math.min(l, 1 - l);
  const channel = n => {
    const k = (n + hue / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const hex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + hex(channel(0)) + hex(channel(8)) + hex(channel(4));
}

// Header values are ";"-separated and indexed by filament slot. Anything that reaches the DOM
// is validated here: colors must be hex, types go through sanitizeTypeName.
function parseFilamentLists(colourValue, typeValue) {
  const colours = colourValue ? colourValue.split(';').map(s => s.trim()) : [];
  const types = typeValue ? typeValue.split(';').map(s => s.trim()) : [];
  const count = Math.max(colours.length, types.length);
  return Array.from({ length: count }, (_, index) => ({
    index,
    color: HEX_COLOR_RE.test(colours[index] || '') ? colours[index].slice(0, 7) : fallbackFilamentColor(index),
    type: types[index] ? sanitizeTypeName(types[index]) : ''
  }));
}

export class GcodeParser {
  constructor() {
    this.lines = [];
    this.layers = [];
    this.headerEnd = 0;
    this.fileName = '';
    this.warnings = [];
    this.skippedLines = 0;
    this.vortek = { detected: false, changeCount: 0, filaments: [] };
    this.toolChanges = [];
  }

  // Collects Bambu H2C / Vortek signals into the per-parse state `vs` and records tool changes
  // at the head position (x, y, z) the main loop is tracking.
  _scanVortekLine(line, i, vs, currentLayer, x, y, z) {
    const at = {
      lineIndex: i,
      layer: currentLayer ? currentLayer.number : 0,
      x, y,
      z: currentLayer && currentLayer.zHeight != null ? currentLayer.zHeight : z
    };
    const first = line.charCodeAt(0);
    if (first === 84) { // 'T': the initial load is the first "T<n> H-1"; later ones are re-selects
      const t = this.toolChanges.length === 0 && line.match(/^T(\d+) H-1\b/);
      if (t) {
        const filament = parseInt(t[1], 10);
        const nozzle = vs.nozzleMap && Number.isInteger(vs.nozzleMap[filament]) ? vs.nozzleMap[filament] : null;
        this.toolChanges.push({ ...at, fromFilament: null, toFilament: filament, fromNozzle: null, toNozzle: nozzle });
      }
      return;
    }
    if (first === 59) { // ';'
      const ev = line.match(/^; NOZZLE_CHANGE_START OF(\d+) NF(\d+) ON(\d+) NN(\d+)/);
      if (ev) {
        this.toolChanges.push({
          ...at,
          fromFilament: parseInt(ev[1], 10), toFilament: parseInt(ev[2], 10),
          fromNozzle: parseInt(ev[3], 10), toNozzle: parseInt(ev[4], 10)
        });
        return;
      }
      const m = line.match(/^;\s*(printer_model|filament_colour|filament_type|filament_nozzle_map)\s*=\s*(.*)$/);
      if (!m) return;
      const value = m[2];
      if (m[1] === 'printer_model') { if (/H2C/i.test(value)) vs.h2cHeader = true; }
      else if (m[1] === 'filament_colour') { if (vs.colours === null) vs.colours = value; }
      else if (m[1] === 'filament_type') { if (vs.types === null) vs.types = value; }
      else if (vs.nozzleMap === null) vs.nozzleMap = value.split(/[;,]/).map(s => parseInt(s, 10));
      return;
    }
    if (/^M620 N\b/.test(line)) vs.m620N = true;
    else if (/^M632\b/.test(line) || /^M640\.8\b/.test(line)) vs.m632 = true;
  }

  _detectSlicer(lines) {
    const scanLines = Math.min(50, lines.length);
    for (let i = 0; i < scanLines; i++) {
      const line = lines[i];
      if (line.includes('Generated with Cura_SteamEngine')) return 'cura';
      if (line.includes('generated by PrusaSlicer')) return 'prusaslicer';
      if (line.includes('generated by SuperSlicer')) return 'superslicer';
      if (line.includes('generated by OrcaSlicer')) return 'orcaslicer';
      if (line.includes('G-Code generated by Simplify3D')) return 'simplify3d';
      if (line.includes('Sliced by ideaMaker')) return 'ideamaker';
      if (line.includes('BambuStudio') || line.includes('Bambu Studio')) return 'bambu';
      if (line.includes('Generated with FibreSeek Rocket Slicer')) return 'fibreseeker';
    }
    return 'unknown';
  }

  async parseAsync(text, fileName, onProgress) {
    this.fileName = fileName;
    this.lines = text.split(/\r?\n/);
    this.slicerType = this._detectSlicer(this.lines);
    this.layers = [];
    this.layerMoves = {};
    this.bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    this.headerEnd = 0;
    this.warnings = [];
    this.skippedLines = 0;
    this.vortek = { detected: false, changeCount: 0, filaments: [] };
    this.toolChanges = [];
    const vs ={ h2cHeader: false, m620N: false, m632: false, colours: null, types: null, nozzleMap: null };

    let currentLayer = null;
    let foundFirstLayer = false;
    // State machine for tracking head position
    let curX = 0, curY = 0, curZ = 0, curE = 0;
    let relativeE = false; // M83 = relative, M82 = absolute
    let currentType = 'DEFAULT';
    let insetSeenLayer = null; // layer in which a FibreSeeker inset section was last seen
    let currentFeedRate = 0; // mm/min as raw G-code value
    let currentPrintAccel = 0, currentTravelAccel = 0; // mm/s² from M204
    // Bambu Studio uses "; CHANGE_LAYER" as a marker, with layer number on a nearby line
    let pendingChangeLayer = false;
    let pendingZHeight = null;

    const CHUNK = 50000;
    const total = this.lines.length;

    for (let start = 0; start < total; start += CHUNK) {
      const end = Math.min(start + CHUNK, total);

    for (let i = start; i < end; i++) {
      const line = this.lines[i].trim();

      // Detect header end
      if (!foundFirstLayer && !this.headerEnd) {
        const lm = line.match(LAYER_MARKER_RE) || line.match(/^; CHANGE_LAYER/) || line.match(/^; layer \d+, Z = /i) || line === ';LAYER_CHANGE';
        if (lm) { this.headerEnd = i; foundFirstLayer = true; }
        else if (line && !line.startsWith(';') && (line.startsWith('G') || line.startsWith('M') || line.startsWith('T'))) {
          if (!this.headerEnd) this.headerEnd = i;
        }
      }

      // Parse layer markers — standard format: ;LAYER:N  (FibreSeeker: "; LAYER:N [z]")
      const layerMatch = line.match(LAYER_MARKER_RE);
      if (layerMatch) {
        foundFirstLayer = true;
        if (currentLayer) {
          currentLayer.endLine = i - 1;
          currentLayer.lineCount = currentLayer.endLine - currentLayer.startLine + 1;
        }
        // FibreSeeker numbers layers 1-based; keep the app's 0-based convention (as with Bambu).
        const zeroBased = this.slicerType === 'fibreseeker' ? 1 : 0;
        currentLayer = {
          number: parseInt(layerMatch[1]) - zeroBased,
          startLine: i, endLine: null,
          zHeight: layerMatch[2] !== undefined ? parseFloat(layerMatch[2]) : null,
          sectionTypes: [], lineCount: 0
        };
        this.layers.push(currentLayer);
        this.layerMoves[currentLayer.number] = [];
        currentType = 'DEFAULT';
      }

      // Parse layer markers — Bambu Studio format: ; CHANGE_LAYER + ; Z_HEIGHT + ; layer num/total_layer_count
      if (line === '; CHANGE_LAYER') {
        pendingChangeLayer = true;
        pendingZHeight = null;
        // Mark the start line as this CHANGE_LAYER comment
        foundFirstLayer = true;
        if (currentLayer) {
          currentLayer.endLine = i - 1;
          currentLayer.lineCount = currentLayer.endLine - currentLayer.startLine + 1;
        }
        // Create a temporary layer — number will be updated when we find the layer num comment
        currentLayer = {
          number: this.layers.length, // temporary, updated below
          startLine: i, endLine: null, zHeight: null,
          sectionTypes: [], lineCount: 0,
          _pending: true
        };
        currentType = 'DEFAULT';
      }

      // Bambu: ; Z_HEIGHT: 0.2
      if (pendingChangeLayer) {
        const zHMatch = line.match(/^; Z_HEIGHT:\s*([\d.]+)/);
        if (zHMatch) {
          pendingZHeight = parseFloat(zHMatch[1]);
          if (currentLayer) currentLayer.zHeight = pendingZHeight;
        }

        // Bambu: ; layer num/total_layer_count: 1/525
        const bambuLayerMatch = line.match(/^; layer num\/total_layer_count:\s*(\d+)\/(\d+)/);
        if (bambuLayerMatch) {
          const layerNum = parseInt(bambuLayerMatch[1]) - 1; // Bambu uses 1-based, convert to 0-based
          if (currentLayer && currentLayer._pending) {
            currentLayer.number = layerNum;
            delete currentLayer._pending;
            this.layers.push(currentLayer);
            this.layerMoves[currentLayer.number] = [];
          }
          pendingChangeLayer = false;
        }
      }

      // Simplify3D: "; layer N, Z = X.XX"
      const s3dLayerMatch = line.match(/^; layer (\d+), Z = ([\d.]+)/i);
      if (s3dLayerMatch) {
        foundFirstLayer = true;
        if (currentLayer) {
          currentLayer.endLine = i - 1;
          currentLayer.lineCount = currentLayer.endLine - currentLayer.startLine + 1;
        }
        currentLayer = {
          number: parseInt(s3dLayerMatch[1]),
          startLine: i, endLine: null,
          zHeight: parseFloat(s3dLayerMatch[2]),
          sectionTypes: [], lineCount: 0
        };
        this.layers.push(currentLayer);
        this.layerMoves[currentLayer.number] = [];
        currentType = 'DEFAULT';
      }

      // PrusaSlicer alternative: ;LAYER_CHANGE + ;Z:X.XX
      if (line === ';LAYER_CHANGE') {
        foundFirstLayer = true;
        if (currentLayer) {
          currentLayer.endLine = i - 1;
          currentLayer.lineCount = currentLayer.endLine - currentLayer.startLine + 1;
        }
        currentLayer = {
          number: this.layers.length,
          startLine: i, endLine: null, zHeight: null,
          sectionTypes: [], lineCount: 0
        };
        this.layers.push(currentLayer);
        this.layerMoves[currentLayer.number] = [];
        currentType = 'DEFAULT';
      }
      if (currentLayer && !currentLayer.zHeight) {
        const zDirectMatch = line.match(/^;Z:([\d.]+)/);
        if (zDirectMatch) currentLayer.zHeight = parseFloat(zDirectMatch[1]);
      }

      // Extract Z-height (fallback from G0/G1 moves)
      if (currentLayer && !currentLayer.zHeight) {
        const zMatch = line.match(/G[01]\s.*Z([\d.]+)/i);
        if (zMatch) currentLayer.zHeight = parseFloat(zMatch[1]);
      }

      // Extract section types — standard: ;TYPE:X  or Bambu: ; FEATURE: X
      if (currentLayer) {
        const typeMatch = line.match(/^;TYPE:(.+)/i) || line.match(/^; FEATURE:\s*(.+)/i);
        if (typeMatch) {
          // Normalize slicer type names (PrusaSlicer, BambuStudio, SuperSlicer)
          const typeNormalize = {
            // PrusaSlicer / SuperSlicer
            'External perimeter': 'WALL-OUTER',
            'Perimeter': 'WALL-INNER',
            'Solid infill': 'SOLID',
            'Top solid infill': 'TOP',
            'Bottom solid infill': 'BOTTOM',
            'Bridge infill': 'BRIDGE',
            'Gap fill': 'GAP INFILL',
            'Overhang perimeter': 'OVERHANG',
            'Internal infill': 'FILL',
            'Sparse infill': 'FILL',
            'Skirt': 'SKIRT',
            'Skirt/Brim': 'SKIRT',
            'Support material': 'SUPPORT',
            'Support material interface': 'SUPPORT-INTERFACE',
            // BambuStudio
            'Inner wall': 'WALL-INNER',
            'Outer wall': 'WALL-OUTER',
            'Overhang wall': 'OVERHANG',
            'Internal solid infill': 'SOLID',
            'Bottom surface': 'BOTTOM',
            'Top surface': 'TOP',
            'Bridge': 'BRIDGE',
            'Sparse infill': 'FILL',
            'Brim': 'BRIM',
            'Support': 'SUPPORT',
            'Support interface': 'SUPPORT-INTERFACE',
          };
          const rawType = typeMatch[1].trim();
          currentType = Object.hasOwn(typeNormalize, rawType) ? typeNormalize[rawType] : sanitizeTypeName(rawType);
          if (!currentLayer.sectionTypes.includes(currentType)) currentLayer.sectionTypes.push(currentType);
        }

        // Simplify3D: "; outer perimeter", "; inner perimeter", etc.
        if (!typeMatch) {
          const s3dType = line.match(/^; (outer perimeter|inner perimeter|solid layer|infill|support|raft|skirt|gap fill|bridge)/i);
          if (s3dType) {
            const typeMap = {
              'outer perimeter': 'WALL-OUTER',
              'inner perimeter': 'WALL-INNER',
              'solid layer': 'SOLID',
              'infill': 'FILL',
              'support': 'SUPPORT',
              'raft': 'SUPPORT',
              'skirt': 'SKIRT',
              'gap fill': 'GAP INFILL',
              'bridge': 'BRIDGE',
            };
            currentType = typeMap[s3dType[1].toLowerCase()] || s3dType[1].toUpperCase();
            if (!currentLayer.sectionTypes.includes(currentType)) currentLayer.sectionTypes.push(currentType);
          }
        }

        // FibreSeeker: "; Skirt start", "; Inset XP start", "; Cellular infill start", etc.
        // Gated to fibreseeker so unrelated "; ... start" comments can never hijack other formats.
        if (this.slicerType === 'fibreseeker') {
          const fsBody = line.startsWith(';') ? line.slice(1).trim() : '';
          if (/\sstart$/i.test(fsBody)) {
            const raw = fsBody.slice(0, -'start'.length).trim().toLowerCase();
            const insetM = raw.match(/^inset\s+(\S+)$/);
            if (insetM) {
              // "Inset XP"/"Inset XF" are outer/finish passes; numbered insets: first pass outer, rest inner.
              currentType = (/^x/i.test(insetM[1]) || insetSeenLayer !== currentLayer) ? 'WALL-OUTER' : 'WALL-INNER';
              insetSeenLayer = currentLayer;
            } else {
              currentType = Object.hasOwn(FIBRESEEKER_TYPE_MAP, raw) ? FIBRESEEKER_TYPE_MAP[raw] : sanitizeTypeName(raw);
            }
            if (!currentLayer.sectionTypes.includes(currentType)) currentLayer.sectionTypes.push(currentType);
          }
        }
      }

      // Bambu H2C / Vortek signals (header keys and tool-changer commands)
      const firstChar = line.charCodeAt(0);
      if (firstChar === 59 || firstChar === 77 || firstChar === 84) { // ';', 'M' or 'T'
        this._scanVortekLine(line, i, vs, currentLayer, curX, curY, curZ);
      }

      // Track extrusion mode
      if (/^M83(\s|;|$)/.test(line)) relativeE = true;
      if (/^M82(\s|;|$)/.test(line)) relativeE = false;
      if (line.startsWith('G92') && line.includes('E')) { curE = 0; } // Reset E position

      // Track acceleration from M204
      if (/^M204\s/.test(line)) {
        const accelParams = {};
        for (const m of line.matchAll(/([PTSRE])([\d.]+)/gi)) accelParams[m[1].toUpperCase()] = parseFloat(m[2]);
        if (accelParams.S !== undefined) { currentPrintAccel = accelParams.S; currentTravelAccel = accelParams.S; } // legacy
        if (accelParams.P !== undefined) currentPrintAccel = accelParams.P;
        if (accelParams.T !== undefined) currentTravelAccel = accelParams.T;
      }

      // Parse G0/G1 linear moves for the viewer
      if (currentLayer && this.layerMoves[currentLayer.number] && /^G[01]\s/.test(line)) {
        try {
        const params = {};
        // FibreSeeker adds U (fiber axis) and V (secondary material axis); P is a process
        // parameter and is deliberately not captured. U/V are always relative.
        const paramRe = this.slicerType === 'fibreseeker'
          ? /([XYZEFUV])([-\d.]+)/gi
          : /([XYZEF])([-\d.]+)/gi;
        const matches = line.matchAll(paramRe);
        for (const m of matches) params[m[1].toUpperCase()] = parseFloat(m[2]);

        const newX = params.X !== undefined ? params.X : curX;
        const newY = params.Y !== undefined ? params.Y : curY;
        const newZ = params.Z !== undefined ? params.Z : curZ;
        const isG0 = line.startsWith('G0');
        if (params.F !== undefined) currentFeedRate = params.F;
        const prevE = curE;
        let isExtrude = false;
        if (params.E !== undefined) {
          isExtrude = relativeE ? params.E > 0 : params.E > curE;
          curE = relativeE ? curE + params.E : params.E;
        }
        const eLength = Math.abs(curE - prevE);

        // FibreSeeker moves can extrude via U/V without an E word
        const uFeed = params.U || 0, vFeed = params.V || 0;
        const fiberFeed = uFeed > 0 || vFeed > 0;
        const extruding = (isExtrude || fiberFeed) && !isG0;

        // Only record XY moves (skip pure Z moves)
        if (newX !== curX || newY !== curY) {
          const move = {
            x1: curX, y1: curY, x2: newX, y2: newY,
            type: currentType, extrude: extruding, lineIndex: i,
            feedRate: currentFeedRate,
            accel: extruding ? currentPrintAccel : currentTravelAccel,
            eLength: eLength
          };
          if (this.slicerType === 'fibreseeker') {
            move.fiber = fiberFeed;
            if (uFeed !== 0) move.uLength = Math.abs(uFeed);
            if (vFeed !== 0) move.vLength = Math.abs(vFeed);
          }
          this.layerMoves[currentLayer.number].push(move);
          this.bounds.minX = Math.min(this.bounds.minX, curX, newX);
          this.bounds.maxX = Math.max(this.bounds.maxX, curX, newX);
          this.bounds.minY = Math.min(this.bounds.minY, curY, newY);
          this.bounds.maxY = Math.max(this.bounds.maxY, curY, newY);
        }

        curX = newX; curY = newY; curZ = newZ;
        } catch (err) {
          this.skippedLines++;
        }
      }

      // Parse G2/G3 arc moves (Bambu Studio uses arc fitting)
      if (currentLayer && this.layerMoves[currentLayer.number] && /^G[23]\s/.test(line)) {
        try {
        const params = {};
        const matches = line.matchAll(/([XYZEFIJ])([-\d.]+)/gi);
        for (const m of matches) params[m[1].toUpperCase()] = parseFloat(m[2]);

        const newX = params.X !== undefined ? params.X : curX;
        const newY = params.Y !== undefined ? params.Y : curY;
        if (params.F !== undefined) currentFeedRate = params.F;
        const prevE = curE;
        let isExtrude = false;
        if (params.E !== undefined) {
          isExtrude = relativeE ? params.E > 0 : params.E > curE;
          curE = relativeE ? curE + params.E : params.E;
        }
        const totalELength = Math.abs(curE - prevE);
        const isG2 = line.startsWith('G2'); // clockwise

        // Approximate arc with line segments
        const cx = curX + (params.I || 0);
        const cy = curY + (params.J || 0);
        const r = Math.hypot(params.I || 0, params.J || 0);
        if (r > 0.01) {
          let startAngle = Math.atan2(curY - cy, curX - cx);
          let endAngle = Math.atan2(newY - cy, newX - cx);
          // Adjust sweep direction
          if (isG2) { // CW
            if (endAngle >= startAngle) endAngle -= 2 * Math.PI;
          } else { // CCW
            if (endAngle <= startAngle) endAngle += 2 * Math.PI;
          }
          const segments = Math.max(4, Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 12)));
          let prevAX = curX, prevAY = curY;
          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const angle = startAngle + (endAngle - startAngle) * t;
            const ax = s === segments ? newX : cx + r * Math.cos(angle);
            const ay = s === segments ? newY : cy + r * Math.sin(angle);
            this.layerMoves[currentLayer.number].push({
              x1: prevAX, y1: prevAY, x2: ax, y2: ay,
              type: currentType, extrude: isExtrude, lineIndex: i,
              feedRate: currentFeedRate,
              accel: isExtrude ? currentPrintAccel : currentTravelAccel,
              eLength: totalELength / segments
            });
            this.bounds.minX = Math.min(this.bounds.minX, ax);
            this.bounds.maxX = Math.max(this.bounds.maxX, ax);
            this.bounds.minY = Math.min(this.bounds.minY, ay);
            this.bounds.maxY = Math.max(this.bounds.maxY, ay);
            prevAX = ax; prevAY = ay;
          }
        }

        curX = newX; curY = newY;
        } catch (err) {
          this.skippedLines++;
        }
      }
    }

      if (onProgress) onProgress(Math.min(end / total, 1));
      if (end < total) await new Promise(r => setTimeout(r, 0));
    }

    // Finalize any pending Bambu layer that never got its layer num line
    if (currentLayer && currentLayer._pending) {
      delete currentLayer._pending;
      this.layers.push(currentLayer);
      this.layerMoves[currentLayer.number] = [];
    }

    // Close last layer
    if (currentLayer) {
      currentLayer.endLine = this.lines.length - 1;
      currentLayer.lineCount = currentLayer.endLine - currentLayer.startLine + 1;
    }

    this.vortek.detected = vs.h2cHeader || (vs.m620N && vs.m632);
    if (this.vortek.detected) this.vortek.filaments = parseFilamentLists(vs.colours, vs.types);
    else this.toolChanges = [];
    this.vortek.changeCount = this.toolChanges.length;

    // Sanitize bounds
    if (!isFinite(this.bounds.minX)) this.bounds = { minX: 0, maxX: 256, minY: 0, maxY: 256 };

    return this.layers;
  }

  getLayerByNumber(num) {
    return this.layers.find(l => l.number === num);
  }

  // The tool established by the latest tool change at or before `lineIndex`, or null.
  activeToolAt(lineIndex) {
    const events = this.toolChanges;
    if (!this.vortek.detected || events.length === 0 || events[0].lineIndex > lineIndex) return null;
    let lo = 0, hi = events.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (events[mid].lineIndex <= lineIndex) lo = mid; else hi = mid - 1;
    }
    const filament = events[lo].toFilament;
    const info = this.vortek.filaments[filament] || { color: fallbackFilamentColor(filament), type: '' };
    return { filament, nozzle: events[lo].toNozzle, color: info.color, type: info.type };
  }

  // Active tool for what the viewer shows: the move at `moveIndex` (clamped) while simulating,
  // otherwise the end of the layer.
  activeToolInLayer(layerNum, moveIndex = null) {
    const layer = this.getLayerByNumber(layerNum);
    if (!layer) return null;
    const moves = this.layerMoves[layerNum] || [];
    if (moves.length === 0) return this.activeToolAt(layer.endLine);
    const mi = moveIndex === null ? moves.length - 1 : Math.max(0, Math.min(moveIndex, moves.length - 1));
    return this.activeToolAt(moves[mi].lineIndex);
  }
}
