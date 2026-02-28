import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GcodeParser } from '../src/parser.js';
import { MotionAnalyzer } from '../src/motion-analyzer.js';
import { StructuralAnalyzer } from '../src/structural-analyzer.js';
import { ThermalAnalyzer } from '../src/thermal-analyzer.js';
import { AnalysisManager } from '../src/analysis-manager.js';
import { inferMaterial, getMaterialProfile, DEFAULT_THRESHOLDS } from '../src/material-profiles.js';

describe('Thermal Analyzer Integration', () => {
  async function setupPipeline(gcode) {
    const parser = new GcodeParser();
    await parser.parseAsync(gcode, 'test.gcode');

    const printerProfile = MotionAnalyzer.inferProfile(parser.lines);
    const motionAnalyzer = new MotionAnalyzer(printerProfile);
    motionAnalyzer.analyzeAllLayers(parser.layerMoves);

    const structuralAnalyzer = new StructuralAnalyzer();
    const thermalAnalyzer = new ThermalAnalyzer();
    const manager = new AnalysisManager();
    manager.register(motionAnalyzer);
    manager.register(structuralAnalyzer);
    manager.register(thermalAnalyzer);

    const materialType = inferMaterial(parser.lines);
    const profile = {
      printer: printerProfile,
      material: getMaterialProfile(materialType),
      thresholds: { ...DEFAULT_THRESHOLDS },
      thermal: { depth: 50 },
      environment: { ambientTemp: 22, chamberType: 'open' },
      _parsedLines: parser.lines,
    };

    manager.analyzeAll(parser.layerMoves, profile);
    return { parser, manager, thermalAnalyzer };
  }

  it('thermal overlays appear in supported overlays list', async () => {
    const gcode = [
      'M104 S210',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1 F3000',
      'G1 X50 Y10 E2 F3000',
      ';LAYER:1',
      'G1 X10 Y10 Z0.4 E3 F3000',
      'G1 X50 Y10 E4 F3000',
    ].join('\n');

    const { manager } = await setupPipeline(gcode);
    const overlays = manager.getSupportedOverlays();
    assert.ok(overlays.find(o => o.id === 'cooling-time'), 'Missing cooling-time overlay');
    assert.ok(overlays.find(o => o.id === 'heat-accumulation'), 'Missing heat-accumulation overlay');
    assert.ok(overlays.find(o => o.id === 'cooling-effectiveness'), 'Missing cooling-effectiveness overlay');
    assert.ok(overlays.find(o => o.id === 'temperature'), 'Missing temperature overlay');
  });

  it('thermal overlay values accessible through AnalysisManager', async () => {
    const gcode = [
      'M104 S210',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1 F3000',
      'G1 X50 Y10 E2 F3000',
      ';LAYER:1',
      'G1 X10 Y10 Z0.4 E3 F3000',
      'G1 X50 Y10 E4 F3000',
    ].join('\n');

    const { manager } = await setupPipeline(gcode);
    const heatVal = manager.getOverlayValue('heat-accumulation', 1, 0);
    assert.ok(typeof heatVal === 'number', 'heat-accumulation should return a number');
  });

  it('rapid small layers produce thermal findings', async () => {
    let gcode = 'M104 S210\n';
    for (let l = 0; l < 10; l++) {
      gcode += `;LAYER:${l}\n`;
      gcode += `G1 X${10} Y10 Z${(0.2 * (l + 1)).toFixed(1)} E${l + 1} F12000\n`;
      gcode += `G1 X${15} Y10 E${l + 1.5} F12000\n`;
    }

    const { thermalAnalyzer } = await setupPipeline(gcode);
    const findings = thermalAnalyzer.getFindings();
    assert.ok(findings.length > 0, 'Expected thermal findings for rapid small layers');
  });

  it('fan state tracked through integration pipeline', async () => {
    const gcode = [
      'M104 S210',
      ';LAYER:0',
      'M106 S255',
      'G1 X10 Y10 Z0.2 E1 F3000',
      'G1 X50 Y10 E2 F3000',
      ';LAYER:1',
      'M107',
      'G1 X10 Y10 Z0.4 E3 F3000',
      'G1 X50 Y10 E4 F3000',
    ].join('\n');

    const { manager } = await setupPipeline(gcode);
    // Should complete without errors and overlays should work
    const val = manager.getOverlayValue('cooling-effectiveness', 0, 1);
    assert.ok(typeof val === 'number');
  });
});
