import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GCODE_COMMANDS, decodeLine } from '../src/gcode-dictionary.js';

describe('GCODE_COMMANDS dictionary', () => {
  it('G5 Bézier spline decodes correctly', () => {
    const result = decodeLine('G5 X10 Y20 I1 J2 P3 Q4 E0.5 F1200');
    assert.strictEqual(result.command, 'G5');
    assert.strictEqual(result.name, 'Bézier Spline');
    assert.strictEqual(result.known, true);
    assert.strictEqual(result.params.length, 8);
    assert.strictEqual(result.params[0].letter, 'X');
    assert.strictEqual(result.params[0].value, '10');
  });

  it('M112 emergency stop decodes correctly', () => {
    const result = decodeLine('M112');
    assert.strictEqual(result.command, 'M112');
    assert.strictEqual(result.name, 'Emergency Stop');
    assert.strictEqual(result.known, true);
    assert.strictEqual(result.params.length, 0);
  });

  it('M92 with params decodes with 4 params', () => {
    const result = decodeLine('M92 X80 Y80 Z400 E93');
    assert.strictEqual(result.command, 'M92');
    assert.strictEqual(result.name, 'Set Steps Per Unit');
    assert.strictEqual(result.known, true);
    assert.strictEqual(result.params.length, 4);
  });

  it('G38.2 subcommand decodes correctly', () => {
    const result = decodeLine('G38.2 X10 Y20 Z-5 F100');
    assert.strictEqual(result.command, 'G38.2');
    assert.strictEqual(result.name, 'Probe Toward Target');
    assert.strictEqual(result.known, true);
    assert.strictEqual(result.params.length, 4);
  });

  it('M906 motor current decodes with 4 params', () => {
    const result = decodeLine('M906 X800 Y800 Z800 E450');
    assert.strictEqual(result.command, 'M906');
    assert.strictEqual(result.name, 'Set Motor Current');
    assert.strictEqual(result.known, true);
    assert.strictEqual(result.params.length, 4);
  });

  it('existing command G1 still works', () => {
    const result = decodeLine('G1 X100 Y200 Z0.3 E1.5 F3000');
    assert.strictEqual(result.command, 'G1');
    assert.strictEqual(result.name, 'Linear Move');
    assert.strictEqual(result.known, true);
    assert.strictEqual(result.params.length, 5);
  });

  it('unknown command returns known: false', () => {
    const result = decodeLine('G999');
    assert.strictEqual(result.command, 'G999');
    assert.strictEqual(result.name, 'Unknown Command');
    assert.strictEqual(result.known, false);
  });
});
