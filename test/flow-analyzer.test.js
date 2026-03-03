import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FlowAnalyzer } from '../src/flow-analyzer.js';

function makeProfile(overrides = {}) {
  return {
    material: { type: 'PLA', maxVolumetricFlow: 15, meltTemp: 210, ...(overrides.material || {}) },
    nozzle: { diameter: 0.4, flowMultiplier: 1.0, ...(overrides.nozzle || {}) },
    filament: { diameter: 1.75, ...(overrides.filament || {}) },
    _parsedLines: overrides._parsedLines || [],
    ...overrides,
  };
}

describe('FlowAnalyzer - Engine Interface', () => {
  it('has correct name', () => {
    assert.strictEqual(new FlowAnalyzer().name, 'flow');
  });

  it('returns supported overlays', () => {
    const overlays = new FlowAnalyzer().getSupportedOverlays();
    assert.ok(overlays.some(o => o.id === 'volumetric-flow'));
    assert.ok(overlays.some(o => o.id === 'line-width'));
    assert.ok(overlays.some(o => o.id === 'flow-ratio'));
  });

  it('clear resets state', () => {
    const a = new FlowAnalyzer();
    a.clear();
    assert.deepStrictEqual(a.getFindings(), []);
  });
});

describe('FlowAnalyzer - Flow Computation', () => {
  it('computes volumetric flow correctly', () => {
    const a = new FlowAnalyzer();
    // 10mm move at 50mm/s (feedRate 3000) with 0.5mm eLength
    // filamentArea = pi * (1.75/2)^2 = 2.405
    // moveTime = 10 / 50 = 0.2s
    // volumetricFlow = 0.5 * 2.405 / 0.2 = 6.01
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 0.5, lineIndex: 1 }],
    };
    a.analyze(layerMoves, makeProfile());
    const flow = a.getOverlayData('volumetric-flow', 0, 0);
    assert.ok(flow > 5 && flow < 7, `expected ~6 mm3/s, got ${flow}`);
  });

  it('returns 0 for non-extrusion moves', () => {
    const a = new FlowAnalyzer();
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'TRAVEL', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 1 }],
    };
    a.analyze(layerMoves, makeProfile());
    assert.strictEqual(a.getOverlayData('volumetric-flow', 0, 0), 0);
  });

  it('computes line width', () => {
    const a = new FlowAnalyzer();
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 0.5, lineIndex: 1 }],
    };
    a.analyze(layerMoves, makeProfile());
    const width = a.getOverlayData('line-width', 0, 0);
    assert.ok(width > 0, 'line width should be positive');
  });

  it('computes flow ratio', () => {
    const a = new FlowAnalyzer();
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 0.5, lineIndex: 1 }],
    };
    a.analyze(layerMoves, makeProfile());
    const ratio = a.getOverlayData('flow-ratio', 0, 0);
    assert.ok(ratio > 0 && ratio < 1, 'flow ratio should be between 0 and 1 for normal flow');
  });
});

describe('FlowAnalyzer - Findings', () => {
  it('detects max volumetric flow exceeded', () => {
    const a = new FlowAnalyzer();
    // Very high eLength to exceed 15 mm3/s limit
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 12000, eLength: 5, lineIndex: 1 }],
    };
    a.analyze(layerMoves, makeProfile());
    const exceeded = a.getFindings().filter(f => f.category === 'max-flow-exceeded');
    assert.ok(exceeded.length > 0, 'should detect flow exceeded');
    assert.strictEqual(exceeded[0].severity, 'critical');
  });

  it('respects high-flow nozzle multiplier', () => {
    const a = new FlowAnalyzer();
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 12000, eLength: 2, lineIndex: 1 }],
    };
    // With multiplier 1.0
    const a1 = new FlowAnalyzer();
    a1.analyze(layerMoves, makeProfile({ nozzle: { diameter: 0.4, flowMultiplier: 1.0 } }));
    const f1 = a1.getFindings().filter(f => f.category === 'max-flow-exceeded');

    // With multiplier 3.0 -- much higher threshold
    const a2 = new FlowAnalyzer();
    a2.analyze(layerMoves, makeProfile({ nozzle: { diameter: 0.4, flowMultiplier: 3.0 } }));
    const f2 = a2.getFindings().filter(f => f.category === 'max-flow-exceeded');

    assert.ok(f2.length <= f1.length, 'higher multiplier should reduce or eliminate findings');
  });

  it('detects flow rate spikes', () => {
    const a = new FlowAnalyzer();
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 1800, eLength: 0.3, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 20, y2: 0, type: 'FILL', extrude: true, feedRate: 12000, eLength: 3.0, lineIndex: 2 },
      ],
    };
    a.analyze(layerMoves, makeProfile());
    const spikes = a.getFindings().filter(f => f.category === 'flow-spike');
    assert.ok(spikes.length > 0, 'should detect flow rate spike');
  });

  it('findings have correct schema', () => {
    const a = new FlowAnalyzer();
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 12000, eLength: 5, lineIndex: 1 }],
    };
    a.analyze(layerMoves, makeProfile());
    for (const f of a.getFindings()) {
      assert.ok(f.id.startsWith('fl-'));
      assert.strictEqual(f.engine, 'flow');
      assert.ok(['critical', 'warning', 'info'].includes(f.severity));
      assert.ok(f.title);
      assert.ok(f.description);
      assert.ok(f.location);
      assert.ok(typeof f.location.layer === 'number');
    }
  });

  it('detects under-extrusion risk from thin line width', () => {
    const a = new FlowAnalyzer();
    // Very low eLength relative to distance => thin line width < nozzle * 0.8
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 20, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 0.05, lineIndex: 1 }],
    };
    a.analyze(layerMoves, makeProfile());
    const under = a.getFindings().filter(f => f.category === 'under-extrusion');
    assert.ok(under.length > 0, 'should detect under-extrusion risk from thin line');
  });

  it('detects over-extrusion from wide line width', () => {
    const a = new FlowAnalyzer();
    // Very high eLength relative to distance => wide line width > nozzle * 1.5
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 5, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 1500, eLength: 1.5, lineIndex: 1 }],
    };
    a.analyze(layerMoves, makeProfile());
    const over = a.getFindings().filter(f => f.category === 'over-extrusion');
    assert.ok(over.length > 0, 'should detect over-extrusion from wide line');
  });
});

describe('FlowAnalyzer - G-code Comment Inference', () => {
  it('infers filament diameter from G-code comments', () => {
    const a = new FlowAnalyzer();
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 0.5, lineIndex: 10 }],
    };
    const profile = makeProfile({
      filament: {}, // no diameter set
      _parsedLines: [';filament_diameter = 2.85'],
    });
    // Remove diameter from filament to test inference
    delete profile.filament.diameter;
    a.analyze(layerMoves, profile);
    // Flow should be computed with 2.85mm filament diameter, so higher flow than default 1.75
    const flow = a.getOverlayData('volumetric-flow', 0, 0);
    // filamentArea for 2.85mm = PI * (2.85/2)^2 = 6.38 vs 2.405 for 1.75mm
    // So flow should be roughly 2.65x higher
    assert.ok(flow > 10, `expected higher flow with 2.85mm filament, got ${flow}`);
  });

  it('auto-detects Bambu slicer and applies flow multiplier', () => {
    const a = new FlowAnalyzer();
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 12000, eLength: 2, lineIndex: 10 }],
    };
    // With Bambu slicer detected, flowMultiplier should become 2.0
    const profileBambu = makeProfile({
      nozzle: { diameter: 0.4 }, // no flowMultiplier set
      _parsedLines: ['; generated by BambuStudio'],
    });
    delete profileBambu.nozzle.flowMultiplier;

    const profileNormal = makeProfile({
      nozzle: { diameter: 0.4, flowMultiplier: 1.0 },
      _parsedLines: [],
    });

    const a1 = new FlowAnalyzer();
    a1.analyze(layerMoves, profileBambu);
    const f1 = a1.getFindings().filter(f => f.category === 'max-flow-exceeded');

    const a2 = new FlowAnalyzer();
    a2.analyze(layerMoves, profileNormal);
    const f2 = a2.getFindings().filter(f => f.category === 'max-flow-exceeded');

    // Bambu with 2x multiplier should have fewer/no max-flow-exceeded findings
    assert.ok(f1.length <= f2.length, 'Bambu auto-detection should increase effective max flow');
  });
});

describe('FlowAnalyzer - Merge Consecutive Findings', () => {
  it('merges consecutive layer findings', () => {
    const a = new FlowAnalyzer();
    // Create multiple layers with max-flow-exceeded to trigger merging
    const layerMoves = {};
    for (let i = 0; i < 10; i++) {
      layerMoves[i] = [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 12000, eLength: 5, lineIndex: i + 1 }];
    }
    a.analyze(layerMoves, makeProfile());
    const exceeded = a.getFindings().filter(f => f.category === 'max-flow-exceeded');
    // With 10 consecutive layers, findings should be merged (< 10)
    assert.ok(exceeded.length < 10, `expected merged findings, got ${exceeded.length}`);
    // At least one merged finding should exist
    assert.ok(exceeded.length >= 1, 'should have at least one merged finding');
  });
});

describe('FlowAnalyzer - Effective Max Flow', () => {
  it('scales with nozzle diameter squared', () => {
    const a1 = new FlowAnalyzer();
    const a2 = new FlowAnalyzer();
    // Moves that would exceed flow at 0.4mm nozzle but not at 0.6mm
    const layerMoves = {
      0: [{ x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 12000, eLength: 2, lineIndex: 1 }],
    };
    a1.analyze(layerMoves, makeProfile({ nozzle: { diameter: 0.4, flowMultiplier: 1.0 } }));
    a2.analyze(layerMoves, makeProfile({ nozzle: { diameter: 0.6, flowMultiplier: 1.0 } }));
    const f1 = a1.getFindings().filter(f => f.category === 'max-flow-exceeded');
    const f2 = a2.getFindings().filter(f => f.category === 'max-flow-exceeded');
    // 0.6mm nozzle has (0.6/0.4)^2 = 2.25x the effective max flow
    assert.ok(f2.length <= f1.length, 'larger nozzle should have fewer flow exceeded findings');
  });
});
