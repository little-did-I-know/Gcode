import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GcodeParser } from '../src/parser.js';
import { MotionAnalyzer } from '../src/motion-analyzer.js';

describe('Motion Analyzer Integration', () => {
  it('analyzes parsed G-code and produces results for each move', async () => {
    const parser = new GcodeParser();
    const gcode = [
      'M204 P1000 T1500',
      'M205 X10 Y10',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1 F3000',
      'G1 X50 Y10 E2 F3000',
      'G1 X50 Y50 E3 F3000',
      ';LAYER:1',
      'G1 X10 Y50 Z0.4 E4 F3000',
    ].join('\n');

    await parser.parseAsync(gcode, 'test.gcode');

    const profile = MotionAnalyzer.inferProfile(parser.lines);
    const analyzer = new MotionAnalyzer(profile);
    analyzer.analyzeAllLayers(parser.layerMoves);

    assert.ok(analyzer.results.has(0));
    assert.ok(analyzer.results.has(1));

    const layer0Results = analyzer.results.get(0);
    assert.strictEqual(layer0Results.length, 3);

    for (const r of layer0Results) {
      assert.ok(r.actualPeakSpeed > 0);
      assert.ok(r.actualPeakSpeed <= r.requestedSpeed);
    }
  });

  it('inferred acceleration matches M204 in G-code', async () => {
    const parser = new GcodeParser();
    const gcode = [
      'M204 P2500 T3000',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1',
    ].join('\n');

    await parser.parseAsync(gcode, 'test.gcode');
    const profile = MotionAnalyzer.inferProfile(parser.lines);

    assert.strictEqual(profile.acceleration, 2500);
    assert.strictEqual(profile.travelAccel, 3000);
  });

  it('handles empty layerMoves gracefully', async () => {
    const analyzer = new MotionAnalyzer();
    analyzer.analyzeAllLayers({});
    assert.strictEqual(analyzer.results.size, 0);
  });

  it('getResult returns null for invalid indices', async () => {
    const parser = new GcodeParser();
    const gcode = [
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1 F3000',
    ].join('\n');

    await parser.parseAsync(gcode, 'test.gcode');
    const analyzer = new MotionAnalyzer();
    analyzer.analyzeAllLayers(parser.layerMoves);

    assert.strictEqual(analyzer.getResult(999, 0), null);
    assert.strictEqual(analyzer.getResult(0, 999), null);
  });
});
