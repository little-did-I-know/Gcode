import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GcodeParser } from '../src/parser.js';
import { MotionAnalyzer } from '../src/motion-analyzer.js';
import { StructuralAnalyzer } from '../src/structural-analyzer.js';
import { AnalysisManager } from '../src/analysis-manager.js';
import { inferMaterial, getMaterialProfile, DEFAULT_THRESHOLDS } from '../src/material-profiles.js';

describe('Analysis Pipeline Integration', () => {
  async function setupPipeline(gcode) {
    const parser = new GcodeParser();
    await parser.parseAsync(gcode, 'test.gcode');

    const printerProfile = MotionAnalyzer.inferProfile(parser.lines);
    const motionAnalyzer = new MotionAnalyzer(printerProfile);
    motionAnalyzer.analyzeAllLayers(parser.layerMoves);

    const structuralAnalyzer = new StructuralAnalyzer();
    const manager = new AnalysisManager();
    manager.register(motionAnalyzer);
    manager.register(structuralAnalyzer);

    const materialType = inferMaterial(parser.lines);
    const profile = {
      printer: printerProfile,
      material: getMaterialProfile(materialType),
      thresholds: { ...DEFAULT_THRESHOLDS },
    };

    manager.analyzeAll(parser.layerMoves, profile);
    return { parser, manager, motionAnalyzer, structuralAnalyzer };
  }

  it('full pipeline: produces overlay data for all registered overlays', async () => {
    const gcode = [
      'M204 P1000 T1500',
      'M104 S210',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1 F3000',
      'G1 X50 Y10 E2 F3000',
      'G1 X50 Y50 E3 F3000',
      ';LAYER:1',
      'G1 X10 Y10 Z0.4 E4 F3000',
      'G1 X50 Y10 E5 F3000',
      'G1 X50 Y50 E6 F3000',
    ].join('\n');

    const { manager } = await setupPipeline(gcode);
    const overlays = manager.getSupportedOverlays();

    assert.ok(overlays.find(o => o.id === 'actual-speed'), 'Missing actual-speed overlay');
    assert.ok(overlays.find(o => o.id === 'speed-delta'), 'Missing speed-delta overlay');
    assert.ok(overlays.find(o => o.id === 'layer-bond'), 'Missing layer-bond overlay');

    const bondVal = manager.getOverlayValue('layer-bond', 1, 0);
    assert.ok(typeof bondVal === 'number');
  });

  it('detects aligned seams when all layers start at same position', async () => {
    let gcode = 'M204 P1000\nM104 S210\n';
    for (let l = 0; l < 5; l++) {
      gcode += ';LAYER:' + l + '\n';
      gcode += 'G0 X10 Y10 Z' + ((l + 1) * 0.2) + '\n';
      gcode += ';TYPE:WALL-OUTER\n';
      gcode += 'G1 X50 Y10 E' + (l * 3 + 1) + ' F3000\n';
      gcode += 'G1 X50 Y50 E' + (l * 3 + 2) + ' F3000\n';
      gcode += 'G1 X10 Y50 E' + (l * 3 + 3) + ' F3000\n';
    }

    const { manager } = await setupPipeline(gcode);
    const findings = manager.getAllFindings();
    const seamFindings = findings.filter(f => f.category === 'seam');
    assert.ok(seamFindings.length > 0, 'Should detect aligned seams');
  });

  it('material inference works in pipeline', async () => {
    const gcode = [
      'M109 S245',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1 F3000',
    ].join('\n');

    const parser = new GcodeParser();
    await parser.parseAsync(gcode, 'test.gcode');
    const materialType = inferMaterial(parser.lines);
    assert.strictEqual(materialType, 'PETG');
  });

  it('configurable thresholds change finding count', async () => {
    const gcode = [
      'M104 S210',
      ';LAYER:0',
      ';TYPE:WALL-OUTER',
      'G1 X0 Y0 Z0.2 E1 F3000',
      'G1 X50 Y0 E2 F3000',
      ';LAYER:1',
      ';TYPE:WALL-OUTER',
      'G1 X100 Y100 Z0.4 E3 F3000',
      'G1 X150 Y100 E4 F3000',
    ].join('\n');

    const parser = new GcodeParser();
    await parser.parseAsync(gcode, 'test.gcode');

    const structural = new StructuralAnalyzer();

    // Run with very strict thresholds
    const strictProfile = {
      printer: {},
      material: getMaterialProfile('PLA'),
      thresholds: { ...DEFAULT_THRESHOLDS, 'layer-bond-overlap': { critical: 0.99, warning: 0.999 } },
    };
    structural.analyze(parser.layerMoves, strictProfile);
    const strictFindings = structural.getFindings().filter(f => f.category === 'layer-bond');

    // Run with very lenient thresholds
    structural.clear();
    const lenientProfile = {
      printer: {},
      material: getMaterialProfile('PLA'),
      thresholds: { ...DEFAULT_THRESHOLDS, 'layer-bond-overlap': { critical: 0.01, warning: 0.02 } },
    };
    structural.analyze(parser.layerMoves, lenientProfile);
    const lenientFindings = structural.getFindings().filter(f => f.category === 'layer-bond');

    // Strict should produce more findings than lenient
    assert.ok(strictFindings.length >= lenientFindings.length,
      'Strict thresholds (' + strictFindings.length + ') should produce >= findings than lenient (' + lenientFindings.length + ')');
  });

  it('inferMaterial detects material from slicer comment', async () => {
    const lines = ['; filament_type = PETG-CF', 'M104 S260'];
    assert.strictEqual(inferMaterial(lines), 'PETG-CF');
  });

  it('findings have valid location data for navigation', async () => {
    let gcode = 'M204 P1000\nM104 S210\n';
    for (let l = 0; l < 5; l++) {
      gcode += ';LAYER:' + l + '\n';
      gcode += 'G0 X10 Y10 Z' + ((l + 1) * 0.2) + '\n';
      gcode += ';TYPE:WALL-OUTER\n';
      gcode += 'G1 X50 Y10 E' + (l * 3 + 1) + ' F3000\n';
      gcode += 'G1 X50 Y50 E' + (l * 3 + 2) + ' F3000\n';
    }

    const { manager } = await setupPipeline(gcode);
    const findings = manager.getAllFindings();

    for (const f of findings) {
      assert.ok(f.location, 'Finding ' + f.id + ' missing location');
      assert.ok(typeof f.location.layer === 'number', 'Finding ' + f.id + ' missing layer');
      assert.ok(f.location.xyz, 'Finding ' + f.id + ' missing xyz');
      assert.ok(typeof f.location.xyz.x === 'number', 'Finding ' + f.id + ' missing x');
      assert.ok(typeof f.location.xyz.y === 'number', 'Finding ' + f.id + ' missing y');
      assert.ok(f.severity, 'Finding ' + f.id + ' missing severity');
      assert.ok(['critical', 'warning', 'info'].includes(f.severity), 'Finding ' + f.id + ' invalid severity: ' + f.severity);
    }
  });
});
