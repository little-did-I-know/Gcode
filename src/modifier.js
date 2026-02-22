// ===== G-CODE MODIFIER =====
export class GcodeModifier {
  constructor() {
    this.modifications = [];
    this._idCounter = 0;
  }

  _id() { return 'mod_' + (++this._idCounter) + '_' + Date.now(); }

  addPause(layer, message, pauseType, moveHead) {
    const mod = {
      id: this._id(), type: 'pause', layer,
      message: message || '', pauseType, moveHead
    };
    this.modifications.push(mod);
    return mod;
  }

  addFilament(layer, slot, command) {
    const mod = {
      id: this._id(), type: 'filament', layer,
      slot: parseInt(slot), command
    };
    this.modifications.push(mod);
    return mod;
  }

  addEject(config) {
    // Remove existing eject mods (only one eject sequence allowed)
    this.modifications = this.modifications.filter(m => m.type !== 'eject');
    const mod = {
      id: this._id(), type: 'eject', layer: Infinity,
      ...config
    };
    this.modifications.push(mod);
    return mod;
  }

  addRecovery(resumeLayer) {
    // Only one recovery mod allowed — replace existing
    this.modifications = this.modifications.filter(m => m.type !== 'recovery');
    const mod = {
      id: this._id(), type: 'recovery', layer: resumeLayer,
      resumeLayer
    };
    this.modifications.push(mod);
    return mod;
  }

  addZOffset(layer, endLayer, offset, note) {
    const mod = {
      id: this._id(), type: 'zoffset', layer,
      endLayer, offset, note: note || ''
    };
    this.modifications.push(mod);
    return mod;
  }

  addCustom(layer, gcode) {
    const mod = {
      id: this._id(), type: 'custom', layer,
      gcode
    };
    this.modifications.push(mod);
    return mod;
  }

  remove(modId) {
    this.modifications = this.modifications.filter(m => m.id !== modId);
  }

  moveUp(modId) {
    const idx = this.modifications.findIndex(m => m.id === modId);
    if (idx > 0) [this.modifications[idx - 1], this.modifications[idx]] = [this.modifications[idx], this.modifications[idx - 1]];
  }

  moveDown(modId) {
    const idx = this.modifications.findIndex(m => m.id === modId);
    if (idx < this.modifications.length - 1) [this.modifications[idx], this.modifications[idx + 1]] = [this.modifications[idx + 1], this.modifications[idx]];
  }

  getSnippet(mod) {
    const lines = [];
    switch (mod.type) {
      case 'pause': {
        lines.push(`; === PAUSE${mod.message ? ': ' + mod.message : ''} ===`);
        if (mod.moveHead) {
          lines.push('G91 ; Relative positioning');
          lines.push('G1 Z5 F600 ; Lift Z');
          lines.push('G90 ; Absolute positioning');
          lines.push('G1 X5 Y5 F6000 ; Move head to front-left');
        }
        const profile = FIRMWARE[currentFirmware];
        const pauseGcode = profile?.pauseGcode?.[mod.pauseType];
        if (pauseGcode) lines.push(pauseGcode);
        else lines.push(`${mod.pauseType} ; Pause`);
        lines.push('; === END PAUSE ===');
        break;
      }
      case 'filament': {
        lines.push(`; === FILAMENT CHANGE${mod.command === 'M1020' ? ': Slot ' + (mod.slot + 1) : ''} ===`);
        if (mod.command === 'M1020') lines.push(`M1020 S${mod.slot} ; Bambu AMS filament change`);
        else lines.push(`${mod.command} ; Filament change`);
        lines.push('; === END FILAMENT CHANGE ===');
        break;
      }
      case 'eject': {
        lines.push('; === AUTO-EJECT SEQUENCE ===');
        lines.push(`G1 X5 Y${mod.bedY} Z${mod.headZ} F${mod.feedRate} ; Move to eject position`);
        if (mod.heatersOff) {
          lines.push('M104 S0 ; Extruder off');
          lines.push('M140 S0 ; Bed off');
        }
        if (mod.homeZ) lines.push('G28 Z ; Home Z');
        lines.push('M106 S0 ; Fan off');
        if (mod.loop) {
          lines.push('; === LOOP MODE ===');
          lines.push('; Note: True automatic loop requires firmware support or external automation.');
          lines.push('; The printer will stop here. Restart manually or via automation.');
        }
        lines.push('; === END AUTO-EJECT ===');
        break;
      }
      case 'zoffset': {
        const sign = mod.offset >= 0 ? '+' : '';
        const range = mod.endLayer != null ? `layers ${mod.layer}–${mod.endLayer}` : `layer ${mod.layer} onward`;
        lines.push(`; === Z-OFFSET: ${sign}${mod.offset}mm for ${range}${mod.note ? ' (' + mod.note + ')' : ''} ===`);
        break;
      }
      case 'custom': {
        lines.push('; === CUSTOM G-CODE ===');
        mod.gcode.split('\n').forEach(l => lines.push(l));
        lines.push('; === END CUSTOM ===');
        break;
      }
      case 'recovery': {
        lines.push(`; === PRINT RECOVERY: Resume from layer ${mod.resumeLayer} ===`);
        lines.push(`; Layers below ${mod.resumeLayer} removed, Z shifted to bed`);
        lines.push('; === END RECOVERY HEADER ===');
        break;
      }
    }
    return lines;
  }

  applyAll(originalLines, parser) {
    let result = [...originalLines];

    // === RECOVERY: strip layers below resume point, shift Z to bed, override first-layer speeds ===
    const recoveryMod = this.modifications.find(m => m.type === 'recovery');
    let recoveryLineShift = 0; // line offset for other mods after recovery reassembly
    if (recoveryMod && parser.layers.length > 0) {
      const resumeLayer = parser.getLayerByNumber(recoveryMod.resumeLayer);
      const layer0 = parser.layers[0];
      if (resumeLayer && layer0 && resumeLayer.zHeight != null) {
        const layer0Z = layer0.zHeight || 0.2;
        const zShift = resumeLayer.zHeight - layer0Z;

        // 1. Keep preamble (headers + startup gcode) + strip layers before resume point
        const preamble = result.slice(0, layer0.startLine);
        const remaining = result.slice(resumeLayer.startLine);

        // 2. Collect layer-0 extrusion feedrate for speed override
        let layer0Speed = null;
        for (let i = layer0.startLine; i <= layer0.endLine; i++) {
          const line = result[i];
          if (/^G[01]\s/i.test(line.trim()) && /E[\d.]/i.test(line) && /F[\d.]/i.test(line)) {
            const fm = line.match(/F([\d.]+)/i);
            if (fm) { layer0Speed = parseFloat(fm[1]); break; }
          }
        }

        // 3. Reassemble: preamble + recovery header + remaining layers
        const snippet = this.getSnippet(recoveryMod);
        result = [...preamble, ...snippet, ...remaining];

        // 4. Compute line shift so other mods can find correct insertion points
        recoveryLineShift = preamble.length + snippet.length - resumeLayer.startLine;

        // 5. Shift all Z values and renumber layer metadata in remaining lines
        const remainingStart = preamble.length + snippet.length;
        const layerNumOffset = recoveryMod.resumeLayer; // original 0-based layer number of resume layer
        const totalRemaining = parser.layers.length - layerNumOffset;
        for (let i = remainingStart; i < result.length; i++) {
          const trimmed = result[i].trim();
          // Shift G-code Z coordinates
          if (/^G[0123]\s/i.test(trimmed) && /Z[-\d.]/i.test(trimmed)) {
            result[i] = result[i].replace(
              /([Zz])([-\d.]+)/g,
              (match, letter, val) => {
                const newZ = parseFloat(val) - zShift;
                return letter + newZ.toFixed(3);
              }
            );
          }
          // Shift ; Z_HEIGHT: comments
          if (/^; Z_HEIGHT:\s*[\d.]+/.test(trimmed)) {
            result[i] = result[i].replace(
              /(; Z_HEIGHT:\s*)([\d.]+)/,
              (match, prefix, val) => prefix + (parseFloat(val) - zShift).toFixed(2)
            );
          }
          // Renumber ; layer num/total_layer_count: N/M
          const layerNumMatch = trimmed.match(/^; layer num\/total_layer_count:\s*(\d+)\/(\d+)/);
          if (layerNumMatch) {
            const origNum = parseInt(layerNumMatch[1]); // 1-based
            const newNum = origNum - layerNumOffset;
            result[i] = result[i].replace(
              /(; layer num\/total_layer_count:\s*)\d+\/\d+/,
              '$1' + newNum + '/' + totalRemaining
            );
          }
          // Renumber M73 L (layer progress)
          if (/^M73 L\d+/i.test(trimmed)) {
            result[i] = result[i].replace(
              /(M73 L)(\d+)/i,
              (match, prefix, val) => prefix + (parseInt(val) - layerNumOffset)
            );
          }
          // Renumber M991 S0 P (layer notification)
          if (/^M991 S0 P\d+/i.test(trimmed)) {
            result[i] = result[i].replace(
              /(M991 S0 P)(\d+)/i,
              (match, prefix, val) => prefix + (parseInt(val) - layerNumOffset)
            );
          }
          // Shift ;Z: comments (PrusaSlicer)
          if (/^;Z:[\d.]+/.test(trimmed)) {
            result[i] = result[i].replace(
              /(;Z:)([\d.]+)/,
              (match, prefix, val) => prefix + (parseFloat(val) - zShift).toFixed(2)
            );
          }
          // Renumber ;LAYER:N comments (Cura/standard)
          if (/^;LAYER:\d+/i.test(trimmed)) {
            result[i] = result[i].replace(
              /(;LAYER:)(\d+)/i,
              (match, prefix, val) => prefix + (parseInt(val) - layerNumOffset)
            );
          }
        }

        // 6. Override feedrates on resume layer with layer-0 speed
        if (layer0Speed) {
          const resumeEnd = remainingStart + (resumeLayer.endLine - resumeLayer.startLine);
          for (let i = remainingStart; i <= resumeEnd && i < result.length; i++) {
            const trimmed = result[i].trim();
            if (/^G[01]\s/i.test(trimmed) && /E[\d.]/i.test(trimmed) && /F[\d.]/i.test(trimmed)) {
              result[i] = result[i].replace(
                /F[\d.]+/i,
                'F' + layer0Speed.toFixed(0)
              );
            }
          }
        }
      }
    }

    // Separate mod types
    const zoffsetMods = this.modifications.filter(m => m.type === 'zoffset');
    const layerMods = this.modifications.filter(m => m.type !== 'eject' && m.type !== 'zoffset' && m.type !== 'recovery');
    const ejectMods = this.modifications.filter(m => m.type === 'eject');

    // Apply z-offset modifications by adjusting Z values in affected lines
    if (zoffsetMods.length > 0) {
      // Build a map: for each layer number, compute the total z-offset
      const layerOffsets = new Map();
      for (const layer of parser.layers) {
        let totalOffset = 0;
        for (const mod of zoffsetMods) {
          const startL = mod.layer;
          const endL = mod.endLayer;
          if (layer.number >= startL && (endL == null || layer.number <= endL)) {
            totalOffset += mod.offset;
          }
        }
        if (totalOffset !== 0) layerOffsets.set(layer.number, totalOffset);
      }

      // Walk through lines and adjust Z values in G0/G1/G2/G3 commands
      let currentLayerNum = null;
      for (let i = 0; i < result.length; i++) {
        const trimmed = result[i].trim();

        // Track current layer
        const layerMatch = trimmed.match(/^;LAYER:(\d+)/i);
        if (layerMatch) {
          currentLayerNum = parseInt(layerMatch[1]);
          continue;
        }
        // Bambu format
        const bambuMatch = trimmed.match(/^; layer num\/total_layer_count:\s*(\d+)\/(\d+)/);
        if (bambuMatch) {
          currentLayerNum = parseInt(bambuMatch[1]) - 1;
          continue;
        }

        if (currentLayerNum == null) continue;
        const offset = layerOffsets.get(currentLayerNum);
        if (!offset) continue;

        // Only modify G0/G1/G2/G3 lines that contain a Z parameter
        if (/^G[0123]\s/i.test(trimmed) && /Z[-\d.]/i.test(trimmed)) {
          result[i] = result[i].replace(
            /([Zz])([-\d.]+)/g,
            (match, letter, val) => {
              const newZ = (parseFloat(val) + offset);
              return letter + newZ.toFixed(3);
            }
          );
        }
      }
    }

    // Sort layer mods (including z-offset comments) by layer number (descending) to insert from bottom up
    // This prevents line offset issues
    const sorted = [...layerMods, ...zoffsetMods].sort((a, b) => {
      const la = a.layer === 'end' ? Infinity : a.layer;
      const lb = b.layer === 'end' ? Infinity : b.layer;
      return lb - la;
    });

    for (const mod of sorted) {
      const snippet = this.getSnippet(mod);
      let insertLine;

      if (mod.layer === 'end') {
        insertLine = result.length;
      } else {
        // Skip mods targeting layers that were stripped by recovery
        if (recoveryMod && mod.layer < recoveryMod.resumeLayer) continue;
        const layer = parser.getLayerByNumber(mod.layer);
        if (layer) {
          insertLine = layer.startLine + 1 + recoveryLineShift; // Adjust for recovery line shift
        } else {
          continue; // Skip if layer not found
        }
      }
      result.splice(insertLine, 0, ...snippet);
    }

    // Append eject mods at the very end
    for (const mod of ejectMods) {
      const snippet = this.getSnippet(mod);
      result.push(...snippet);
    }

    return result;
  }
}
