import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AnalysisManager } from '../src/analysis-manager.js';

class MockEngine {
  constructor(name, overlays, findings = []) {
    this.name = name;
    this._overlays = overlays;
    this._findings = findings;
    this._analyzed = false;
    this._overlayData = {};
  }
  analyze(layerMoves, profile) { this._analyzed = true; }
  getFindings() { return this._findings; }
  getOverlayData(overlayId, layerNum, moveIndex) {
    return this._overlayData[`${overlayId}-${layerNum}-${moveIndex}`] ?? 0.5;
  }
  getSupportedOverlays() { return this._overlays; }
  clear() { this._analyzed = false; this._findings = []; }
}

describe('AnalysisManager', () => {
  it('registers engines and lists supported overlays', () => {
    const mgr = new AnalysisManager();
    const engine = new MockEngine('test', [{ id: 'test-overlay', label: 'Test', unit: 'mm' }]);
    mgr.register(engine);
    const overlays = mgr.getSupportedOverlays();
    assert.strictEqual(overlays.length, 1);
    assert.strictEqual(overlays[0].id, 'test-overlay');
  });

  it('analyzeAll calls analyze on all registered engines', () => {
    const mgr = new AnalysisManager();
    const e1 = new MockEngine('a', []);
    const e2 = new MockEngine('b', []);
    mgr.register(e1);
    mgr.register(e2);
    mgr.analyzeAll({}, {});
    assert.ok(e1._analyzed);
    assert.ok(e2._analyzed);
  });

  it('getAllFindings aggregates and sorts by severity', () => {
    const mgr = new AnalysisManager();
    const e1 = new MockEngine('a', [], [
      { id: 'a1', severity: 'info', engine: 'a' },
      { id: 'a2', severity: 'critical', engine: 'a' },
    ]);
    const e2 = new MockEngine('b', [], [
      { id: 'b1', severity: 'warning', engine: 'b' },
    ]);
    mgr.register(e1);
    mgr.register(e2);
    const findings = mgr.getAllFindings();
    assert.strictEqual(findings.length, 3);
    assert.strictEqual(findings[0].severity, 'critical');
    assert.strictEqual(findings[1].severity, 'warning');
    assert.strictEqual(findings[2].severity, 'info');
  });

  it('getOverlayValue routes to correct engine', () => {
    const mgr = new AnalysisManager();
    const e1 = new MockEngine('a', [{ id: 'alpha', label: 'A', unit: '' }]);
    e1._overlayData['alpha-0-5'] = 0.75;
    mgr.register(e1);
    assert.strictEqual(mgr.getOverlayValue('alpha', 0, 5), 0.75);
  });

  it('getOverlayStats computes min/max/avg for a layer', () => {
    const mgr = new AnalysisManager();
    const engine = new MockEngine('a', [{ id: 'stat-test', label: 'S', unit: '' }]);
    engine.getOverlayData = (overlayId, layerNum, moveIndex) => {
      return [0.2, 0.4, 0.6, 0.8][moveIndex] ?? 0;
    };
    mgr.register(engine);
    const layerMoves = {
      0: [
        { extrude: true, x1: 0, y1: 0, x2: 10, y2: 0 },
        { extrude: true, x1: 10, y1: 0, x2: 20, y2: 0 },
        { extrude: true, x1: 20, y1: 0, x2: 30, y2: 0 },
        { extrude: true, x1: 30, y1: 0, x2: 40, y2: 0 },
      ],
    };
    const stats = mgr.getOverlayStats('stat-test', 0, layerMoves);
    assert.strictEqual(stats.min, 0.2);
    assert.strictEqual(stats.max, 0.8);
    assert.strictEqual(stats.avg, 0.5);
  });

  it('clear resets all engines and caches', () => {
    const mgr = new AnalysisManager();
    const e = new MockEngine('a', [], [{ id: 'x', severity: 'info' }]);
    mgr.register(e);
    mgr.clear();
    assert.strictEqual(e._findings.length, 0);
    assert.strictEqual(mgr.getAllFindings().length, 0);
  });
});
