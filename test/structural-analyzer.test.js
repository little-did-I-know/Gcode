import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StructuralAnalyzer } from '../src/structural-analyzer.js';

describe('StructuralAnalyzer — Spatial Grid & Overlap', () => {
  it('computes high overlap for identical layer paths', () => {
    const analyzer = new StructuralAnalyzer();
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 50, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 10 },
        { x1: 50, y1: 0, x2: 50, y2: 50, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 11 },
      ],
      1: [
        { x1: 0, y1: 0, x2: 50, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 20 },
        { x1: 50, y1: 0, x2: 50, y2: 50, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 21 },
      ],
    };
    analyzer.analyze(layerMoves, { printer: {}, material: { type: 'PLA' }, thresholds: {} });
    const val = analyzer.getOverlayData('layer-bond', 1, 0);
    assert.ok(val > 0.7, `Expected high bond score, got ${val}`);
  });

  it('computes low overlap for non-overlapping paths', () => {
    const analyzer = new StructuralAnalyzer();
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 50, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 10 },
      ],
      1: [
        { x1: 100, y1: 100, x2: 150, y2: 100, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 20 },
      ],
    };
    analyzer.analyze(layerMoves, { printer: {}, material: { type: 'PLA' }, thresholds: {} });
    const val = analyzer.getOverlayData('layer-bond', 1, 0);
    assert.ok(val < 0.3, `Expected low bond score, got ${val}`);
  });

  it('returns 1.0 for layer 0 (no layer below)', () => {
    const analyzer = new StructuralAnalyzer();
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 50, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 10 }],
    };
    analyzer.analyze(layerMoves, { printer: {}, material: { type: 'PLA' }, thresholds: {} });
    const val = analyzer.getOverlayData('layer-bond', 0, 0);
    assert.strictEqual(val, 1.0);
  });
});

describe('StructuralAnalyzer — Wall Integrity', () => {
  it('detects aligned seams across layers', () => {
    const analyzer = new StructuralAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 5; l++) {
      layerMoves[l] = [
        { x1: 0, y1: 0, x2: 0, y2: 0, extrude: false, type: 'TRAVEL', feedRate: 6000, lineIndex: l * 10 },
        { x1: 10, y1: 10, x2: 50, y2: 10, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: l * 10 + 1 },
        { x1: 50, y1: 10, x2: 50, y2: 50, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: l * 10 + 2 },
      ];
    }
    analyzer.analyze(layerMoves, { printer: {}, material: { type: 'PLA' }, thresholds: {} });
    const findings = analyzer.getFindings();
    const seamFindings = findings.filter(f => f.category === 'seam');
    assert.ok(seamFindings.length > 0, 'Should detect aligned seam');
  });

  it('detects gaps in perimeter paths', () => {
    const analyzer = new StructuralAnalyzer();
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 30, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 30, y1: 0, x2: 31, y2: 0, extrude: false, type: 'TRAVEL', feedRate: 6000, lineIndex: 2 },
        { x1: 31, y1: 0, x2: 60, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    analyzer.analyze(layerMoves, { printer: {}, material: { type: 'PLA' }, thresholds: {} });
    const findings = analyzer.getFindings();
    const gapFindings = findings.filter(f => f.category === 'gap');
    assert.ok(gapFindings.length > 0, 'Should detect perimeter gap');
  });

  it('detects direction reversals in perimeter', () => {
    const analyzer = new StructuralAnalyzer();
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 50, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 50, y1: 0, x2: 1, y2: 0.5, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 2 },
      ],
    };
    analyzer.analyze(layerMoves, { printer: {}, material: { type: 'PLA' }, thresholds: {} });
    const findings = analyzer.getFindings();
    const reversalFindings = findings.filter(f => f.category === 'reversal');
    assert.ok(reversalFindings.length > 0, 'Should detect direction reversal');
  });
});

describe('StructuralAnalyzer — Engine Interface', () => {
  it('has correct name', () => {
    const analyzer = new StructuralAnalyzer();
    assert.strictEqual(analyzer.name, 'structural');
  });

  it('getSupportedOverlays returns layer-bond', () => {
    const analyzer = new StructuralAnalyzer();
    const overlays = analyzer.getSupportedOverlays();
    assert.ok(overlays.find(o => o.id === 'layer-bond'));
  });

  it('clear resets state', () => {
    const analyzer = new StructuralAnalyzer();
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 50, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 3000, eLength: 1, lineIndex: 1 }],
    };
    analyzer.analyze(layerMoves, { printer: {}, material: { type: 'PLA' }, thresholds: {} });
    assert.ok(analyzer.getOverlayData('layer-bond', 0, 0) > 0);
    analyzer.clear();
    assert.strictEqual(analyzer.getOverlayData('layer-bond', 0, 0), 0);
    assert.strictEqual(analyzer.getFindings().length, 0);
  });
});
