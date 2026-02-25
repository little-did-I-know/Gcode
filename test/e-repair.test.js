import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeERepair } from '../src/e-repair.js';

describe('computeERepair', () => {
  it('returns empty repairs when deleted line has no E parameter', () => {
    const lines = [
      'G1 X10 Y10 E1',
      'G1 X20 Y20',
      'G1 X30 Y30 E2',
    ];
    const result = computeERepair(lines, 1);
    assert.deepStrictEqual(result, []);
  });

  it('returns empty repairs in relative E mode (M83)', () => {
    const lines = [
      'M83',
      'G1 X10 Y10 E0.5',
      'G1 X20 Y20 E0.8',
      'G1 X30 Y30 E0.3',
    ];
    const result = computeERepair(lines, 2);
    assert.deepStrictEqual(result, []);
  });

  it('adjusts downstream E values in absolute mode', () => {
    const lines = [
      'G1 X10 Y10 E1.000',
      'G1 X20 Y20 E1.500',
      'G1 X30 Y30 E2.000',
      'G1 X40 Y40 E2.500',
    ];
    const result = computeERepair(lines, 1);
    assert.equal(result.length, 2);
    assert.equal(result[0].lineIndex, 2);
    assert.equal(result[0].original, 'G1 X30 Y30 E2.000');
    assert.ok(result[0].patched.includes('E1.500'));
    assert.equal(result[1].lineIndex, 3);
    assert.ok(result[1].patched.includes('E2.000'));
  });

  it('stops at G92 E reset', () => {
    const lines = [
      'G1 X10 Y10 E1.000',
      'G1 X20 Y20 E1.500',
      'G1 X30 Y30 E2.000',
      'G92 E0',
      'G1 X40 Y40 E0.500',
    ];
    const result = computeERepair(lines, 1);
    assert.equal(result.length, 1);
  });

  it('handles M82 after M83 (switches back to absolute)', () => {
    const lines = [
      'M83',
      'G1 X5 Y5 E0.3',
      'M82',
      'G1 X10 Y10 E1.000',
      'G1 X20 Y20 E1.500',
      'G1 X30 Y30 E2.000',
    ];
    const result = computeERepair(lines, 4);
    assert.equal(result.length, 1);
    assert.ok(result[0].patched.includes('E1.500'));
  });

  it('preserves E decimal precision from original', () => {
    const lines = [
      'G1 X10 Y10 E1.00000',
      'G1 X20 Y20 E1.50000',
      'G1 X30 Y30 E2.00000',
    ];
    const result = computeERepair(lines, 1);
    assert.ok(result[0].patched.includes('E1.50000'));
  });

  it('handles first line deletion (no previous E)', () => {
    const lines = [
      'G1 X10 Y10 E0.500',
      'G1 X20 Y20 E1.000',
      'G1 X30 Y30 E1.500',
    ];
    const result = computeERepair(lines, 0);
    assert.equal(result.length, 2);
    assert.ok(result[0].patched.includes('E0.500'));
    assert.ok(result[1].patched.includes('E1.000'));
  });
});

describe('computeERepair — real G-code integration', () => {
  it('skips repair for Bambu-style M83 relative extrusion (test_cube pattern)', () => {
    // Real lines from test_cube.gcode around layer 1
    const lines = [
      'M83 ; use relative distances for extrusion',
      'G1 E-.8 F1800',
      'G1 X105.035 Y69.293 F42000',
      'M204 S6000',
      'G1 Z.2',
      'G1 E.8 F1800',
      '; FEATURE: Inner wall',
      'G1 F3000',
      'M204 S500',
      'G1 X105.992 Y69.377 E.03578',
      'G1 X106.953 Y69.635 E.03707',
      'G1 X107.855 Y70.055 E.03707',
      'G1 X108.67 Y70.626 E.03707',
    ];
    // Deleting an extrusion line in M83 mode should need no repair
    const result = computeERepair(lines, 10); // delete X106.953 line
    assert.deepStrictEqual(result, [], 'M83 mode should require no E repair');
  });

  it('repairs absolute E after G92 E0 reset (Bambu layer boundary pattern)', () => {
    // Simulates a file that switches to absolute mode with G92 resets
    const lines = [
      'G92 E0',
      'M82',
      'G1 X100 Y100 E0.500',
      'G1 X110 Y100 E1.000',  // delete this — delta 0.5
      'G1 X120 Y100 E1.500',
      'G1 X130 Y100 E2.000',
      'G92 E0',
      'G1 X140 Y100 E0.500',  // should NOT be affected (past G92 reset)
    ];
    const result = computeERepair(lines, 3);
    assert.equal(result.length, 2, 'should repair 2 lines before G92 reset');
    assert.ok(result[0].patched.includes('E1.000'), 'line 4 should become E1.000');
    assert.ok(result[1].patched.includes('E1.500'), 'line 5 should become E1.500');
  });

  it('handles Bambu E.XXXXX shorthand (no leading zero)', () => {
    // Bambu Studio uses E.03578 not E0.03578
    const lines = [
      'G1 X100 Y100 E.500',
      'G1 X110 Y100 E1.000',  // delete — delta 0.5
      'G1 X120 Y100 E1.500',
    ];
    const result = computeERepair(lines, 1);
    assert.equal(result.length, 1);
    assert.ok(result[0].patched.includes('E1.000'));
  });

  it('handles deletion of retraction line (negative E)', () => {
    // Retraction lines have negative E in relative mode — should skip repair
    const lines = [
      'M83',
      'G1 X100 Y100 E.03707',
      'G1 E-.8 F1800',        // retraction — delete this
      'G1 X120 Y100 F42000',
      'G1 E.8 F1800',         // prime
    ];
    const result = computeERepair(lines, 2);
    assert.deepStrictEqual(result, [], 'relative mode retraction needs no repair');
  });

  it('skips repair for G2/G3 arc with E in relative mode (test_cube_v2 pattern)', () => {
    // test_cube_v2 has G2/G3 arcs with E params in M83 mode
    const lines = [
      'M83 ; use relative distances for extrusion',
      '; FEATURE: Internal solid infill',
      'G1 F2068',
      'M204 S6000',
      'G2 X87.532 Y87.56 I-.025 J.041 E.00643',  // arc with E
      'M204 S10000',
      'G1 X87.992 Y87.992 F42000',
      'G1 X87.945 Y87.893 E.00337',
    ];
    const result = computeERepair(lines, 4); // delete arc line
    assert.deepStrictEqual(result, [], 'M83 mode arc needs no repair');
  });

  it('repairs G2/G3 arc with E in absolute mode', () => {
    // Hypothetical absolute mode with arc extrusion
    const lines = [
      'M82',
      'G1 X80 Y80 E1.000',
      'G2 X87.532 Y87.56 I-.025 J.041 E1.500',  // delete — delta 0.5
      'G1 X90 Y90 E2.000',
      'G3 X92 Y92 I1 J0 E2.500',
    ];
    const result = computeERepair(lines, 2);
    assert.equal(result.length, 2, 'should repair both G1 and G3 downstream');
    assert.ok(result[0].patched.includes('E1.500'), 'G1 line repaired');
    assert.ok(result[1].patched.includes('E2.000'), 'G3 line repaired');
  });

  it('handles wipe move with negative E in relative mode (test_cube_v2 pattern)', () => {
    // test_cube_v2 has wipe moves with negative E like "G1 X87.25 Y85.297 E-.76"
    const lines = [
      'M83',
      'G1 X94.75 Y85.25 E.35384',
      'G1 X94.75 Y94.75 E.35384',
      '; WIPE_START',
      'G1 F3000',
      'G1 X87.25 Y85.297 E-.76',  // wipe with negative E — delete this
      '; WIPE_END',
      'G1 E-.04 F1800',
    ];
    const result = computeERepair(lines, 5);
    assert.deepStrictEqual(result, [], 'relative mode wipe needs no repair');
  });

  it('skips repair for PrusaSlicer layer boundary in M83 mode (prusa pattern)', () => {
    // PrusaSlicer uses LAYER_CHANGE + G92 E0 + retraction at layer boundaries
    const lines = [
      'M83',
      'G1 X145.896 Y154.104 E.31196',
      'G1 X145.896 Y145.896 E.31196',
      'G1 X154.104 Y145.896 E.31196',
      'G1 E-.7 F2700',           // retraction
      ';LAYER_CHANGE',
      ';Z:0.4',
      'G92 E0.0',
      'G1 X154.379 Y154.379 Z.4 F17704.361',
      'G1 E.7 F1500',            // prime
      'G1 X154.379 Y154.379 E.31196',
    ];
    // Delete a perimeter move
    const result = computeERepair(lines, 2);
    assert.deepStrictEqual(result, [], 'M83 mode PrusaSlicer layer needs no repair');
  });

  it('skips repair for Ender3 large retraction + wipe pattern in M83 mode', () => {
    // Ender3 profile has larger retractions (-3.5) and wipe with negative E during XY
    const lines = [
      'M83',
      'G1 X147.149 Y158.189 E.24616',
      'G1 E-3.5 F3600',                      // large retraction — delete this
      ';WIPE_START',
      'G1 F7200',
      'G1 X147.089 Y158.189 E-.0285',        // wipe with negative E during XY
      'G1 X145 Y158.189 E-.99227',
      'G1 X144.023 Y157.938 E-.47923',
      ';WIPE_END',
      'G1 X145.994 Y154.006 F9000',
      'G1 E5 F2400',                          // prime
    ];
    const result = computeERepair(lines, 2); // delete large retraction
    assert.deepStrictEqual(result, [], 'M83 mode Ender3 retraction needs no repair');
  });

  it('skips repair for Ender3 wipe move deletion (negative E during XY)', () => {
    // Ender3 wipe moves have negative E during XY movement for pressure relief
    const lines = [
      'M83',
      'G1 E-3.5 F3600',
      ';WIPE_START',
      'G1 F7200',
      'G1 X147.089 Y158.189 E-.0285',
      'G1 X145 Y158.189 E-.99227',   // delete this wipe segment
      'G1 X144.023 Y157.938 E-.47923',
      ';WIPE_END',
    ];
    const result = computeERepair(lines, 5);
    assert.deepStrictEqual(result, [], 'M83 mode Ender3 wipe needs no repair');
  });

  it('handles PrusaSlicer G92 E0 reset in absolute mode scenario', () => {
    // PrusaSlicer resets E at layer boundaries — verify repair respects this
    const lines = [
      'M82',
      'G1 X145 Y154 E1.000',
      'G1 X145 Y145 E2.000',   // delete — delta 1.0
      'G1 X154 Y145 E3.000',
      'G1 E-.7 F2700',         // retraction (E2.3 absolute)
      'G92 E0.0',              // reset
      'G1 E.7 F1500',          // prime (E0.7 absolute, new zero)
      'G1 X154 Y154 E1.000',   // should NOT be patched (past reset)
    ];
    const result = computeERepair(lines, 2);
    assert.equal(result.length, 2, 'should repair extrusion and retraction before G92 reset');
    assert.ok(result[0].patched.includes('E2.000'), 'extrusion line repaired');
    // retraction line also has E so it should be adjusted
    assert.equal(result[1].lineIndex, 4);
  });
});
