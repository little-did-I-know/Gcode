import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PaTuner } from '../src/pa-tuner.js';

describe('PaTuner', () => {
  it('constructor defaults: baseK=0, empty overrides', () => {
    const pt = new PaTuner();
    assert.strictEqual(pt.baseK, 0);
    assert.deepStrictEqual(pt.getFeatureOverrides(), {});
  });

  it('setBaseK clamps to 0-0.2', () => {
    const pt = new PaTuner();
    pt.setBaseK(0.1);
    assert.strictEqual(pt.baseK, 0.1);
    pt.setBaseK(-5);
    assert.strictEqual(pt.baseK, 0);
    pt.setBaseK(99);
    assert.strictEqual(pt.baseK, 0.2);
  });

  it('setFeatureK sets per-type override, clamped to 0-0.2', () => {
    const pt = new PaTuner();
    pt.setFeatureK('Outer Wall', 0.05);
    assert.strictEqual(pt.getFeatureOverrides()['Outer Wall'], 0.05);
    pt.setFeatureK('Infill', -1);
    assert.strictEqual(pt.getFeatureOverrides()['Infill'], 0);
    pt.setFeatureK('Infill', 5);
    assert.strictEqual(pt.getFeatureOverrides()['Infill'], 0.2);
  });

  it('removeFeatureK deletes an override', () => {
    const pt = new PaTuner();
    pt.setFeatureK('Outer Wall', 0.05);
    pt.removeFeatureK('Outer Wall');
    assert.strictEqual(pt.getFeatureOverrides()['Outer Wall'], undefined);
  });

  it('clearFeatureOverrides resets to empty', () => {
    const pt = new PaTuner();
    pt.setFeatureK('Outer Wall', 0.05);
    pt.setFeatureK('Infill', 0.1);
    pt.clearFeatureOverrides();
    assert.deepStrictEqual(pt.getFeatureOverrides(), {});
  });

  it('getFeatureOverrides returns a shallow copy', () => {
    const pt = new PaTuner();
    pt.setFeatureK('Outer Wall', 0.05);
    const copy = pt.getFeatureOverrides();
    copy['Outer Wall'] = 999;
    assert.strictEqual(pt.getFeatureOverrides()['Outer Wall'], 0.05);
  });
});

describe('compile', () => {
  it('generates PA commands at type transitions (Marlin)', () => {
    const pt = new PaTuner();
    pt.setBaseK(0.04);
    pt.setFeatureK('Outer Wall', 0.03);
    pt.setFeatureK('Infill', 0.06);
    const layerMoves = {
      0: [
        { type: 'Outer Wall', extrude: true, lineIndex: 10 },
        { type: 'Outer Wall', extrude: true, lineIndex: 11 },
        { type: 'Infill', extrude: true, lineIndex: 20 },
      ],
    };
    const result = pt.compile(layerMoves, 'marlin');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].layer, 0);
    const lines = result[0].gcode.split('\n');
    assert.strictEqual(lines.length, 2);
    assert.match(lines[0], /M900 K0\.030/);
    assert.match(lines[0], /Outer Wall/);
    assert.match(lines[1], /M900 K0\.060/);
    assert.match(lines[1], /Infill/);
  });

  it('generates PA commands for Klipper firmware', () => {
    const pt = new PaTuner();
    pt.setBaseK(0.05);
    const layerMoves = {
      0: [{ type: 'Outer Wall', extrude: true, lineIndex: 10 }],
    };
    const result = pt.compile(layerMoves, 'klipper');
    assert.strictEqual(result.length, 1);
    assert.match(result[0].gcode, /SET_PRESSURE_ADVANCE ADVANCE=0\.050/);
    assert.match(result[0].gcode, /Outer Wall/);
  });

  it('uses base K for types without override', () => {
    const pt = new PaTuner();
    pt.setBaseK(0.04);
    pt.setFeatureK('Outer Wall', 0.03);
    const layerMoves = {
      0: [
        { type: 'Outer Wall', extrude: true, lineIndex: 10 },
        { type: 'Inner Wall', extrude: true, lineIndex: 20 },
      ],
    };
    const result = pt.compile(layerMoves, 'marlin');
    const lines = result[0].gcode.split('\n');
    assert.strictEqual(lines.length, 2);
    assert.match(lines[0], /M900 K0\.030/);
    assert.match(lines[0], /Outer Wall/);
    assert.match(lines[1], /M900 K0\.040/);
    assert.match(lines[1], /Inner Wall/);
  });

  it('does not emit duplicate commands for same K value', () => {
    const pt = new PaTuner();
    pt.setBaseK(0.04);
    // Both types use base K (no overrides)
    const layerMoves = {
      0: [
        { type: 'Outer Wall', extrude: true, lineIndex: 10 },
        { type: 'Inner Wall', extrude: true, lineIndex: 20 },
      ],
    };
    const result = pt.compile(layerMoves, 'marlin');
    assert.strictEqual(result.length, 1);
    const lines = result[0].gcode.split('\n');
    assert.strictEqual(lines.length, 1);
    assert.match(lines[0], /M900 K0\.040/);
  });

  it('skips travel moves for type transitions', () => {
    const pt = new PaTuner();
    pt.setBaseK(0.04);
    const layerMoves = {
      0: [
        { type: 'Outer Wall', extrude: true, lineIndex: 10 },
        { type: 'Travel', extrude: false, lineIndex: 15 },
        { type: 'Outer Wall', extrude: true, lineIndex: 20 },
      ],
    };
    const result = pt.compile(layerMoves, 'marlin');
    assert.strictEqual(result.length, 1);
    const lines = result[0].gcode.split('\n');
    // Only 1 command since travel is skipped and Outer Wall K hasn't changed
    assert.strictEqual(lines.length, 1);
    assert.match(lines[0], /M900 K0\.040/);
  });

  it('handles multiple layers', () => {
    const pt = new PaTuner();
    pt.setBaseK(0.04);
    pt.setFeatureK('Infill', 0.06);
    const layerMoves = {
      0: [
        { type: 'Outer Wall', extrude: true, lineIndex: 10 },
        { type: 'Infill', extrude: true, lineIndex: 20 },
      ],
      1: [
        // Starts with Infill again — same K as end of layer 0, no emit
        { type: 'Infill', extrude: true, lineIndex: 30 },
        { type: 'Outer Wall', extrude: true, lineIndex: 40 },
      ],
      2: [
        { type: 'Outer Wall', extrude: true, lineIndex: 50 },
      ],
    };
    const result = pt.compile(layerMoves, 'marlin');
    // Layer 0: Outer Wall (0.040) then Infill (0.060) => 2 commands
    assert.strictEqual(result[0].layer, 0);
    assert.strictEqual(result[0].gcode.split('\n').length, 2);
    // Layer 1: Infill same K as last => skip, Outer Wall (0.040) => 1 command
    assert.strictEqual(result[1].layer, 1);
    assert.strictEqual(result[1].gcode.split('\n').length, 1);
    assert.match(result[1].gcode, /M900 K0\.040/);
    // Layer 2: Outer Wall same K as end of layer 1 => no commands, no entry
    assert.strictEqual(result.length, 2);
  });
});

describe('PaTuner.gatherSpeedHints', () => {
  it('returns correct min/max per motion type', () => {
    const pt = new PaTuner();
    const motionResults = new Map();
    motionResults.set(0, [
      { move: { type: 'Outer Wall', extrude: true }, requestedSpeed: 30 },
      { move: { type: 'Outer Wall', extrude: true }, requestedSpeed: 60 },
      { move: { type: 'Infill', extrude: true }, requestedSpeed: 100 },
      { move: { type: 'Infill', extrude: true }, requestedSpeed: 50 },
    ]);
    motionResults.set(1, [
      { move: { type: 'Outer Wall', extrude: true }, requestedSpeed: 20 },
    ]);
    const hints = pt.gatherSpeedHints(motionResults);
    assert.deepStrictEqual(hints['Outer Wall'], { min: 20, max: 60 });
    assert.deepStrictEqual(hints['Infill'], { min: 50, max: 100 });
  });

  it('skips travel moves (extrude=false)', () => {
    const pt = new PaTuner();
    const motionResults = new Map();
    motionResults.set(0, [
      { move: { type: 'Travel', extrude: false }, requestedSpeed: 150 },
      { move: { type: 'Outer Wall', extrude: true }, requestedSpeed: 40 },
    ]);
    const hints = pt.gatherSpeedHints(motionResults);
    assert.strictEqual(hints['Travel'], undefined);
    assert.deepStrictEqual(hints['Outer Wall'], { min: 40, max: 40 });
  });

  it('handles empty Map', () => {
    const pt = new PaTuner();
    const hints = pt.gatherSpeedHints(new Map());
    assert.deepStrictEqual(hints, {});
  });
});

describe('generateCalibrationPattern', () => {
  it('generates valid G-code with header, temps, K values', () => {
    const pt = new PaTuner();
    const gcode = pt.generateCalibrationPattern({
      kStart: 0,
      kEnd: 0.02,
      kStep: 0.01,
      nozzleTemp: 210,
      bedTemp: 65,
    });
    // Header comments present
    assert.match(gcode, /; Pressure Advance Calibration/);
    assert.match(gcode, /; K range: 0\.000 to 0\.020/);
    // Temperature commands present
    assert.match(gcode, /M140 S65/);   // bed temp
    assert.match(gcode, /M104 S210/);  // nozzle temp
    assert.match(gcode, /M190 S65/);   // wait bed
    assert.match(gcode, /M109 S210/);  // wait nozzle
    // K value comments present for each step (0, 0.01, 0.02)
    assert.match(gcode, /; --- K = 0\.000 ---/);
    assert.match(gcode, /; --- K = 0\.010 ---/);
    assert.match(gcode, /; --- K = 0\.020 ---/);
    // PA commands present (default firmware is marlin)
    assert.match(gcode, /M900 K0\.000/);
    assert.match(gcode, /M900 K0\.010/);
    assert.match(gcode, /M900 K0\.020/);
    // Footer resets PA
    assert.match(gcode, /M900 K0\.000/);
  });

  it('includes slow (F1500) and fast (F6000) segments', () => {
    const pt = new PaTuner();
    const gcode = pt.generateCalibrationPattern({ kStart: 0, kEnd: 0.005, kStep: 0.005 });
    const lines = gcode.split('\n');
    const slowLines = lines.filter(l => l.includes('F1500') && l.includes('Slow segment'));
    const fastLines = lines.filter(l => l.includes('F6000') && l.includes('Fast segment'));
    assert.ok(slowLines.length > 0, 'Should have slow segments at F1500');
    assert.ok(fastLines.length > 0, 'Should have fast segments at F6000');
  });

  it('includes retraction and Z-hop between lines', () => {
    const pt = new PaTuner();
    const gcode = pt.generateCalibrationPattern({ kStart: 0, kEnd: 0.005, kStep: 0.005 });
    // Should have retract/unretract moves
    assert.match(gcode, /; Retract/);
    assert.match(gcode, /; Un-retract/);
    assert.match(gcode, /; Z-hop/);
    assert.match(gcode, /; Lower Z/);
  });

  it('includes part cooling fan and proper purge', () => {
    const pt = new PaTuner();
    const gcode = pt.generateCalibrationPattern({ kStart: 0, kEnd: 0, kStep: 0.005 });
    assert.match(gcode, /M106/, 'Should enable part cooling fan');
    assert.match(gcode, /G92 E0.*purge/i, 'Should reset E after purge');
    assert.match(gcode, /M107/, 'Should turn fan off in footer');
  });

  it('spaces lines 3mm apart (check Y positions)', () => {
    const pt = new PaTuner();
    const gcode = pt.generateCalibrationPattern({
      kStart: 0,
      kEnd: 0.01,
      kStep: 0.005,
    });
    const lines = gcode.split('\n');
    // Extract Y values from K-value section move-to-start lines
    // Look for the G1 moves that position for each K line (after K comment)
    const kCommentIndices = [];
    lines.forEach((l, i) => { if (l.match(/; --- K = /)) kCommentIndices.push(i); });
    assert.strictEqual(kCommentIndices.length, 3, 'Should have 3 K values (0, 0.005, 0.01)');

    // After each K comment there should be a PA command then a move with a Y value
    // Extract Y from the first G1 move after each K comment
    const yValues = [];
    for (const idx of kCommentIndices) {
      for (let j = idx + 1; j < Math.min(idx + 5, lines.length); j++) {
        const yMatch = lines[j].match(/G1.*Y([\d.]+)/);
        if (yMatch) {
          yValues.push(parseFloat(yMatch[1]));
          break;
        }
      }
    }
    assert.strictEqual(yValues.length, 3, 'Should find Y positions for all 3 K lines');
    // Check 3mm spacing between consecutive lines
    const spacing1 = Math.abs(yValues[1] - yValues[0]);
    const spacing2 = Math.abs(yValues[2] - yValues[1]);
    assert.ok(Math.abs(spacing1 - 3) < 0.01, `First spacing should be 3mm, got ${spacing1}`);
    assert.ok(Math.abs(spacing2 - 3) < 0.01, `Second spacing should be 3mm, got ${spacing2}`);
  });

  it('uses Klipper commands when firmware is klipper', () => {
    const pt = new PaTuner();
    const gcode = pt.generateCalibrationPattern({
      kStart: 0,
      kEnd: 0.01,
      kStep: 0.005,
      firmware: 'klipper',
    });
    // Should use SET_PRESSURE_ADVANCE instead of M900
    assert.match(gcode, /SET_PRESSURE_ADVANCE ADVANCE=0\.000/);
    assert.match(gcode, /SET_PRESSURE_ADVANCE ADVANCE=0\.005/);
    assert.match(gcode, /SET_PRESSURE_ADVANCE ADVANCE=0\.010/);
    // Should NOT contain M900
    assert.doesNotMatch(gcode, /M900/);
  });
});
