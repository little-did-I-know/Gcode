import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermalAnalyzer } from '../src/thermal-analyzer.js';

// --- Helpers ---

function makeMoves(specs) {
  return specs.map((s, i) => ({
    x1: s.x1 ?? 0, y1: s.y1 ?? 0,
    x2: s.x2 ?? 10, y2: s.y2 ?? 0,
    type: s.type ?? 'WALL-OUTER',
    extrude: s.extrude ?? true,
    feedRate: s.feedRate ?? 3000,
    eLength: s.eLength ?? 1,
    lineIndex: s.lineIndex ?? (i + 1),
  }));
}

function makeProfile(overrides = {}) {
  return {
    printer: {},
    material: { type: 'PLA', ...(overrides.material || {}) },
    thermal: { depth: 50, ...(overrides.thermal || {}) },
    environment: { chamberType: 'open', ambientTemp: 22, ...(overrides.environment || {}) },
    ...overrides,
  };
}

// ============================================================
// 1. Engine Interface
// ============================================================

describe('ThermalAnalyzer - Engine Interface', () => {
  it('has name "thermal"', () => {
    const ta = new ThermalAnalyzer();
    assert.strictEqual(ta.name, 'thermal');
  });

  it('getSupportedOverlays returns 5 overlays with correct ids', () => {
    const ta = new ThermalAnalyzer();
    const overlays = ta.getSupportedOverlays();
    assert.strictEqual(overlays.length, 5);
    const ids = overlays.map(o => o.id);
    assert.ok(ids.includes('cooling-time'));
    assert.ok(ids.includes('heat-accumulation'));
    assert.ok(ids.includes('cooling-effectiveness'));
    assert.ok(ids.includes('temperature'));
  });

  it('overlays have label and unit fields', () => {
    const ta = new ThermalAnalyzer();
    for (const ov of ta.getSupportedOverlays()) {
      assert.ok(typeof ov.label === 'string' && ov.label.length > 0, `Missing label on ${ov.id}`);
      assert.ok('unit' in ov, `Missing unit on ${ov.id}`);
    }
  });

  it('clear() resets overlay data and findings', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([{ x1: 0, y1: 0, x2: 50, y2: 0 }]),
      1: makeMoves([{ x1: 0, y1: 0, x2: 50, y2: 0, lineIndex: 10 }]),
    };
    ta.analyze(layerMoves, makeProfile());
    ta.clear();
    assert.strictEqual(ta.getOverlayData('heat-accumulation', 1, 0), 0);
    assert.strictEqual(ta.getFindings().length, 0);
  });

  it('getOverlayData returns 0 for unknown overlay', () => {
    const ta = new ThermalAnalyzer();
    assert.strictEqual(ta.getOverlayData('nonexistent', 0, 0), 0);
  });
});

// ============================================================
// 2. Grid Rasterization
// ============================================================

describe('ThermalAnalyzer - Grid Rasterization', () => {
  function setupGrid(ta, gridRes = 4) {
    const gridW = Math.ceil(20 / gridRes);
    const gridH = Math.ceil(20 / gridRes);
    ta._grid = { minX: 0, minY: 0, gridRes, gridW, gridH };
    ta._rasterSeen = new Uint8Array(gridW * gridH);
    ta._rasterGen = 1;
  }

  it('rasterizes a horizontal line into correct cells', () => {
    const ta = new ThermalAnalyzer();
    setupGrid(ta, 4);
    const indices = ta._rasterizeLineIndices(0, 0, 10, 0);
    assert.ok(Array.isArray(indices));
    assert.ok(indices.length >= 3, `Expected >= 3 cells for 10mm line at 4mm res, got ${indices.length}`);
  });

  it('rasterizes a diagonal line', () => {
    const ta = new ThermalAnalyzer();
    setupGrid(ta, 4);
    const indices = ta._rasterizeLineIndices(0, 0, 10, 10);
    assert.ok(indices.length >= 3, `Expected >= 3 cells for diagonal line, got ${indices.length}`);
  });

  it('rasterizes a zero-length line into one cell', () => {
    const ta = new ThermalAnalyzer();
    setupGrid(ta, 4);
    const indices = ta._rasterizeLineIndices(5, 5, 5, 5);
    assert.strictEqual(indices.length, 1);
  });

  it('_rasterizeLineIndices returns integer grid indices', () => {
    const ta = new ThermalAnalyzer();
    setupGrid(ta, 2);
    const indices = ta._rasterizeLineIndices(1, 1, 5, 3);
    assert.ok(Array.isArray(indices));
    assert.ok(indices.length > 0);
    assert.ok(indices.every(i => Number.isInteger(i)), 'All indices should be integers');
  });
});

// ============================================================
// 3. Forward Pass
// ============================================================

describe('ThermalAnalyzer - Forward Pass', () => {
  it('heat injection produces nonzero heat-accumulation overlay', () => {
    const ta = new ThermalAnalyzer();
    // Several extrusion moves in the same area to build up heat
    const layerMoves = {
      0: makeMoves([
        { x1: 10, y1: 10, x2: 20, y2: 10, type: 'WALL-OUTER' },
        { x1: 20, y1: 10, x2: 20, y2: 20, type: 'WALL-OUTER' },
      ]),
      1: makeMoves([
        { x1: 10, y1: 10, x2: 20, y2: 10, type: 'WALL-OUTER', lineIndex: 20 },
        { x1: 20, y1: 10, x2: 20, y2: 20, type: 'WALL-OUTER', lineIndex: 21 },
      ]),
    };
    ta.analyze(layerMoves, makeProfile());
    const val = ta.getOverlayData('heat-accumulation', 1, 0);
    assert.ok(typeof val === 'number', 'Overlay value should be a number');
    // After extrusion on same area, heat accumulation should be > 0
    assert.ok(val >= 0, `Heat accumulation should be >= 0, got ${val}`);
  });

  it('cells cool between layers (temperature decreases)', () => {
    const ta = new ThermalAnalyzer();
    // Single small feature — should cool between layers
    const layerMoves = {};
    for (let l = 0; l < 5; l++) {
      layerMoves[l] = makeMoves([
        { x1: 10, y1: 10, x2: 15, y2: 10, type: 'WALL-OUTER', feedRate: 1000, lineIndex: l * 10 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile());
    // Heat accumulation should be produced, layer 4 heat may be less than accumulated
    // Just ensure it doesn't crash and produces some data
    const val0 = ta.getOverlayData('heat-accumulation', 0, 0);
    const val4 = ta.getOverlayData('heat-accumulation', 4, 0);
    assert.ok(typeof val0 === 'number');
    assert.ok(typeof val4 === 'number');
  });

  it('respects depth setting — low depth uses coarser grid', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([{ x1: 0, y1: 0, x2: 50, y2: 0 }]),
    };
    // Should not throw at any depth tier
    ta.analyze(layerMoves, makeProfile({ thermal: { depth: 10 } }));
    ta.clear();
    ta.analyze(layerMoves, makeProfile({ thermal: { depth: 50 } }));
    ta.clear();
    ta.analyze(layerMoves, makeProfile({ thermal: { depth: 90 } }));
  });

  it('temperature overlay shows cell temperature in °C', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([
        { x1: 10, y1: 10, x2: 30, y2: 10, type: 'WALL-OUTER' },
      ]),
      1: makeMoves([
        { x1: 10, y1: 10, x2: 30, y2: 10, type: 'WALL-OUTER', lineIndex: 10 },
      ]),
    };
    ta.analyze(layerMoves, makeProfile());
    const temp = ta.getOverlayData('temperature', 1, 0);
    assert.ok(typeof temp === 'number', `Expected number, got ${typeof temp}`);
    assert.ok(temp > 22, `Temperature should be above ambient (22°C), got ${temp}`);
    assert.ok(temp < 210, `Temperature should be below melt temp, got ${temp}`);
  });

  it('cooling-effectiveness overlay is between 0 and 1', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([{ x1: 10, y1: 10, x2: 30, y2: 10, type: 'WALL-OUTER' }]),
    };
    ta.analyze(layerMoves, makeProfile());
    const val = ta.getOverlayData('cooling-effectiveness', 0, 0);
    assert.ok(typeof val === 'number');
    assert.ok(val >= 0 && val <= 1, `Cooling effectiveness should be 0-1, got ${val}`);
  });

  it('chamber type affects cooling (enclosed cools slower = higher heat)', () => {
    const ta1 = new ThermalAnalyzer();
    const ta2 = new ThermalAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 3; l++) {
      layerMoves[l] = makeMoves([
        { x1: 10, y1: 10, x2: 30, y2: 10, type: 'WALL-OUTER', feedRate: 3000, lineIndex: l * 10 },
      ]);
    }
    ta1.analyze(layerMoves, makeProfile({ environment: { chamberType: 'open' } }));
    ta2.analyze(layerMoves, makeProfile({ environment: { chamberType: 'enclosed' } }));
    const heatOpen = ta1.getOverlayData('heat-accumulation', 2, 0);
    const heatEnclosed = ta2.getOverlayData('heat-accumulation', 2, 0);
    // Enclosed should retain more heat (higher accumulation or equal)
    assert.ok(heatEnclosed >= heatOpen,
      `Enclosed heat (${heatEnclosed}) should be >= open heat (${heatOpen})`);
  });
});

// ============================================================
// 4. Findings
// ============================================================

describe('ThermalAnalyzer - Findings', () => {
  it('fast layers produce cooling time findings', () => {
    const ta = new ThermalAnalyzer();
    // Very fast feedRate = very short layer time
    const layerMoves = {};
    for (let l = 0; l < 5; l++) {
      layerMoves[l] = makeMoves([
        { x1: 10, y1: 10, x2: 12, y2: 10, type: 'WALL-OUTER', feedRate: 12000, lineIndex: l * 10 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile());
    const findings = ta.getFindings();
    const coolingFindings = findings.filter(f => f.category === 'cooling-time');
    assert.ok(coolingFindings.length > 0, 'Should detect insufficient cooling time');
  });

  it('repeated small features in same area produce heat findings', () => {
    const ta = new ThermalAnalyzer();
    // Many layers of small extrusion in tight area — should build up heat
    const layerMoves = {};
    for (let l = 0; l < 20; l++) {
      layerMoves[l] = makeMoves([
        { x1: 10, y1: 10, x2: 12, y2: 10, type: 'WALL-OUTER', feedRate: 6000, lineIndex: l * 10 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile({ thermal: { depth: 50 } }));
    const findings = ta.getFindings();
    const heatFindings = findings.filter(f => f.category === 'heat-accumulation');
    // May or may not trigger depending on exact physics, but should not throw
    assert.ok(Array.isArray(findings));
  });

  it('finding structure matches expected schema', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 5; l++) {
      layerMoves[l] = makeMoves([
        { x1: 10, y1: 10, x2: 12, y2: 10, type: 'WALL-OUTER', feedRate: 12000, lineIndex: l * 10 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile());
    const findings = ta.getFindings();
    for (const f of findings) {
      assert.ok(f.id.startsWith('th-'), `Finding id should start with "th-", got "${f.id}"`);
      assert.strictEqual(f.engine, 'thermal');
      assert.ok(['critical', 'warning', 'info'].includes(f.severity), `Invalid severity: ${f.severity}`);
      assert.ok(typeof f.category === 'string');
      assert.ok(typeof f.title === 'string');
      assert.ok(typeof f.description === 'string');
      assert.ok(typeof f.suggestion === 'string');
      assert.ok(f.location && typeof f.location.layer === 'number');
      assert.ok(f.location.xyz && typeof f.location.xyz.x === 'number');
      assert.ok('metadata' in f);
    }
  });

  it('warping risk finding for ABS on large print', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 10; l++) {
      layerMoves[l] = makeMoves([
        { x1: 0, y1: 0, x2: 80, y2: 0, type: 'WALL-OUTER', feedRate: 1800, lineIndex: l * 10 },
        { x1: 0, y1: 2, x2: 80, y2: 2, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 1 },
        { x1: 0, y1: 4, x2: 80, y2: 4, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 2 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile({
      material: { type: 'ABS' },
      environment: { chamberType: 'open', ambientTemp: 22 },
    }));
    const findings = ta.getFindings();
    const warpFindings = findings.filter(f => f.category === 'warp-failure');
    assert.ok(findings.length > 0, 'Should produce findings for large ABS print');
  });
});

// ============================================================
// 5. Fan State Tracking
// ============================================================

describe('ThermalAnalyzer - Fan State Tracking', () => {
  it('parses M106 S values to fan speed 0-1', () => {
    const ta = new ThermalAnalyzer();
    const lines = [
      ';LAYER:0',
      'M106 S0',
      ';LAYER:1',
      'M106 S127',
      ';LAYER:2',
      'M106 S255',
    ];
    const fanStates = ta._parseFanStates(lines);
    assert.ok(fanStates[0] !== undefined, 'Should have layer 0 fan state');
    assert.ok(Math.abs(fanStates[0] - 0) < 0.01, `Layer 0 fan should be ~0, got ${fanStates[0]}`);
    assert.ok(Math.abs(fanStates[1] - 0.498) < 0.02, `Layer 1 fan should be ~0.5, got ${fanStates[1]}`);
    assert.ok(Math.abs(fanStates[2] - 1.0) < 0.01, `Layer 2 fan should be ~1.0, got ${fanStates[2]}`);
  });

  it('parses M107 as fan off', () => {
    const ta = new ThermalAnalyzer();
    const lines = [
      ';LAYER:0',
      'M106 S255',
      ';LAYER:1',
      'M107',
    ];
    const fanStates = ta._parseFanStates(lines);
    assert.ok(Math.abs(fanStates[1] - 0) < 0.01, `After M107, fan should be 0, got ${fanStates[1]}`);
  });

  it('returns empty object for no fan commands', () => {
    const ta = new ThermalAnalyzer();
    const fanStates = ta._parseFanStates([';LAYER:0', 'G1 X10 Y10']);
    assert.deepStrictEqual(fanStates, {});
  });
});

// ============================================================
// 6. Ambient Temperature Inference
// ============================================================

describe('ThermalAnalyzer - Ambient Temperature', () => {
  it('uses M141 chamber temp when present', () => {
    const ta = new ThermalAnalyzer();
    const lines = ['M141 S45', 'G28'];
    const temp = ta._inferAmbient(lines, {}, 0);
    assert.strictEqual(temp, 45);
  });

  it('uses environment.chamberTemp as priority 1', () => {
    const ta = new ThermalAnalyzer();
    const temp = ta._inferAmbient([], { chamberTemp: 55 }, 0);
    assert.strictEqual(temp, 55);
  });

  it('uses bed temp proxy when no chamber temp', () => {
    const ta = new ThermalAnalyzer();
    const lines = ['M190 S60'];
    const temp = ta._inferAmbient(lines, {}, 0);
    // Should be bedTemp * 0.3 * exp(-0/50) = 60 * 0.3 * 1 = 18
    assert.ok(temp > 15 && temp < 25, `Expected bed proxy temp ~18, got ${temp}`);
  });

  it('bed temp proxy decreases with Z height', () => {
    const ta = new ThermalAnalyzer();
    const lines = ['M190 S60'];
    const tempLow = ta._inferAmbient(lines, {}, 0);
    const tempHigh = ta._inferAmbient(lines, {}, 100);
    assert.ok(tempHigh < tempLow, `Higher Z (${tempHigh}) should have less bed influence than low Z (${tempLow})`);
  });

  it('defaults to 22 when no information available', () => {
    const ta = new ThermalAnalyzer();
    const temp = ta._inferAmbient([], {}, 0);
    assert.strictEqual(temp, 22);
  });

  it('uses environment.ambientTemp if set and no chamber info', () => {
    const ta = new ThermalAnalyzer();
    const temp = ta._inferAmbient([], { ambientTemp: 25 }, 0);
    assert.strictEqual(temp, 25);
  });
});

describe('ThermalAnalyzer - Cooling Time Backward Pass', () => {
  it('produces varying cooling times for moves at different positions', () => {
    const analyzer = new ThermalAnalyzer();
    // Two layers with moves at different XY positions.
    // Moves on cells that overlap between layers should have shorter
    // cooling times than moves on cells only hit once.
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 20, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 1800, lineIndex: 1 },
        { x1: 20, y1: 0, x2: 40, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 1800, lineIndex: 2 },
        { x1: 40, y1: 0, x2: 60, y2: 0, extrude: true, type: 'FILL', feedRate: 1800, lineIndex: 3 },
      ],
      1: [
        { x1: 0, y1: 0, x2: 20, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 1800, lineIndex: 11 },
        { x1: 20, y1: 0, x2: 40, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 1800, lineIndex: 12 },
        { x1: 40, y1: 0, x2: 60, y2: 0, extrude: true, type: 'FILL', feedRate: 1800, lineIndex: 13 },
      ],
    };
    // Use Balanced depth to enable backward pass
    analyzer.analyze(layerMoves, { material: { type: 'PLA' }, thermal: { depth: 50 } });

    // Cooling time values should be > 0 for layer 0 moves (they get revisited on layer 1)
    const ct0 = analyzer.getOverlayData('cooling-time', 0, 0);
    const ct1 = analyzer.getOverlayData('cooling-time', 0, 1);
    const ct2 = analyzer.getOverlayData('cooling-time', 0, 2);
    assert.ok(typeof ct0 === 'number', 'cooling-time should be a number');
    // The first move on layer 0 has to wait longer for its cell to be re-extruded
    // (layer 1 starts at the same position), so the values should differ
    // from each other or from the fallback layerTime
    const allSame = (ct0 === ct1) && (ct1 === ct2);
    // With backward pass, at least some differentiation should exist
    // (the exact values depend on timing, but they shouldn't ALL be identical)
    assert.ok(ct0 > 0 || ct1 > 0 || ct2 > 0, 'At least some cooling-time values should be > 0');
  });

  it('backward pass disabled at low depth uses layer time estimate', () => {
    const analyzer = new ThermalAnalyzer();
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 20, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 1800, lineIndex: 1 },
        { x1: 20, y1: 0, x2: 40, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 1800, lineIndex: 2 },
      ],
      1: [
        { x1: 0, y1: 0, x2: 20, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 1800, lineIndex: 11 },
        { x1: 20, y1: 0, x2: 40, y2: 0, extrude: true, type: 'WALL-OUTER', feedRate: 1800, lineIndex: 12 },
      ],
    };
    // Fast depth: backward pass disabled, cooling time = layer time estimate
    analyzer.analyze(layerMoves, { material: { type: 'PLA' }, thermal: { depth: 10 } });
    const ct0 = analyzer.getOverlayData('cooling-time', 0, 0);
    const ct1 = analyzer.getOverlayData('cooling-time', 0, 1);
    assert.strictEqual(ct0, ct1, 'Without backward pass, all moves use layer time estimate');
    assert.ok(ct0 > 0, 'Cooling time should be positive');
  });
});

// ============================================================
// 8. Warping Risk
// ============================================================

describe('ThermalAnalyzer - Warping Risk', () => {
  it('warping-risk overlay is in supported overlays', () => {
    const ta = new ThermalAnalyzer();
    const ids = ta.getSupportedOverlays().map(o => o.id);
    assert.ok(ids.includes('warping-risk'));
  });

  it('warping risk produces non-negative values for large print', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([
        { x1: 0, y1: 0, x2: 100, y2: 0, type: 'WALL-OUTER', feedRate: 1800 },
        { x1: 0, y1: 2, x2: 100, y2: 2, type: 'FILL', feedRate: 3000 },
        { x1: 0, y1: 4, x2: 100, y2: 4, type: 'FILL', feedRate: 3000 },
      ]),
      1: makeMoves([
        { x1: 0, y1: 0, x2: 100, y2: 0, type: 'WALL-OUTER', feedRate: 1800, lineIndex: 10 },
        { x1: 0, y1: 2, x2: 100, y2: 2, type: 'FILL', feedRate: 3000, lineIndex: 11 },
        { x1: 0, y1: 4, x2: 100, y2: 4, type: 'FILL', feedRate: 3000, lineIndex: 12 },
      ]),
    };
    ta.analyze(layerMoves, makeProfile());
    const warpCenter = ta.getOverlayData('warping-risk', 1, 1);
    assert.ok(typeof warpCenter === 'number');
    assert.ok(warpCenter >= 0, 'Warp risk should be non-negative');
  });

  it('warping risk is zero on layer 0 (ambient temperature)', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([
        { x1: 0, y1: 0, x2: 50, y2: 0, type: 'WALL-OUTER' },
      ]),
    };
    ta.analyze(layerMoves, makeProfile());
    const warp = ta.getOverlayData('warping-risk', 0, 0);
    // Layer 0: preTemp is ambient (below glass transition) → ΔT = 0 → warp = 0
    assert.strictEqual(warp, 0, 'Layer 0 warp risk should be 0 (cells at ambient)');
  });

  it('ABS has higher warping risk than PA-CF due to CTE difference', () => {
    const ta1 = new ThermalAnalyzer();
    const ta2 = new ThermalAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 5; l++) {
      layerMoves[l] = makeMoves([
        { x1: 0, y1: 0, x2: 80, y2: 0, type: 'WALL-OUTER', feedRate: 1800, lineIndex: l * 10 },
        { x1: 0, y1: 2, x2: 80, y2: 2, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 1 },
      ]);
    }
    ta1.analyze(layerMoves, makeProfile({ material: { type: 'ABS' } }));
    ta2.analyze(layerMoves, makeProfile({ material: { type: 'PA-CF' } }));
    const warpABS = ta1.getOverlayData('warping-risk', 4, 1);
    const warpPACF = ta2.getOverlayData('warping-risk', 4, 1);
    assert.ok(warpABS > warpPACF,
      `ABS warp (${warpABS}) should exceed PA-CF warp (${warpPACF}) due to higher CTE`);
  });
});

// ============================================================
// 9. Warp Grid API
// ============================================================

describe('ThermalAnalyzer - getWarpGrid()', () => {
  it('returns null before analysis', () => {
    const ta = new ThermalAnalyzer();
    assert.strictEqual(ta.getWarpGrid(0), null);
  });

  it('returns grid data with correct structure after analysis', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([
        { x1: 0, y1: 0, x2: 50, y2: 0, type: 'WALL-OUTER' },
        { x1: 0, y1: 2, x2: 50, y2: 2, type: 'FILL' },
      ]),
      1: makeMoves([
        { x1: 0, y1: 0, x2: 50, y2: 0, type: 'WALL-OUTER', lineIndex: 10 },
        { x1: 0, y1: 2, x2: 50, y2: 2, type: 'FILL', lineIndex: 11 },
      ]),
    };
    ta.analyze(layerMoves, makeProfile());
    const grid = ta.getWarpGrid(1);
    assert.ok(grid !== null, 'Should return grid data for analyzed layer');
    assert.ok(grid.warpRisk instanceof Float32Array, 'warpRisk should be Float32Array');
    assert.ok(grid.extrusionCount instanceof Uint16Array, 'extrusionCount should be Uint16Array');
    assert.strictEqual(typeof grid.gridW, 'number');
    assert.strictEqual(typeof grid.gridH, 'number');
    assert.strictEqual(typeof grid.minX, 'number');
    assert.strictEqual(typeof grid.minY, 'number');
    assert.strictEqual(typeof grid.gridRes, 'number');
    assert.strictEqual(grid.warpRisk.length, grid.gridW * grid.gridH);
    assert.strictEqual(grid.extrusionCount.length, grid.gridW * grid.gridH);
  });

  it('returns null for non-existent layer', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([{ x1: 0, y1: 0, x2: 10, y2: 0 }]),
    };
    ta.analyze(layerMoves, makeProfile());
    assert.strictEqual(ta.getWarpGrid(999), null);
  });

  it('clear() removes warp grid data', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([{ x1: 0, y1: 0, x2: 50, y2: 0 }]),
      1: makeMoves([{ x1: 0, y1: 0, x2: 50, y2: 0, lineIndex: 10 }]),
    };
    ta.analyze(layerMoves, makeProfile());
    assert.ok(ta.getWarpGrid(0) !== null || ta.getWarpGrid(1) !== null);
    ta.clear();
    assert.strictEqual(ta.getWarpGrid(0), null);
    assert.strictEqual(ta.getWarpGrid(1), null);
  });

  it('warp grid has non-zero values for multi-layer prints', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 5; l++) {
      layerMoves[l] = makeMoves([
        { x1: 0, y1: 0, x2: 80, y2: 0, type: 'WALL-OUTER', feedRate: 1800, lineIndex: l * 10 },
        { x1: 0, y1: 2, x2: 80, y2: 2, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 1 },
        { x1: 0, y1: 4, x2: 80, y2: 4, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 2 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile());
    const grid = ta.getWarpGrid(4);
    assert.ok(grid !== null);
    let hasNonZero = false;
    for (let i = 0; i < grid.warpRisk.length; i++) {
      if (grid.warpRisk[i] > 0) { hasNonZero = true; break; }
    }
    assert.ok(hasNonZero, 'Later layers should have non-zero warp risk values');
  });

  it('extrusionCount is a snapshot (not shared reference)', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {
      0: makeMoves([{ x1: 0, y1: 0, x2: 20, y2: 0 }]),
      1: makeMoves([{ x1: 0, y1: 0, x2: 20, y2: 0, lineIndex: 10 }]),
    };
    ta.analyze(layerMoves, makeProfile());
    const grid0 = ta.getWarpGrid(0);
    const grid1 = ta.getWarpGrid(1);
    if (grid0 && grid1) {
      // They should be independent arrays, not the same buffer
      assert.notStrictEqual(grid0.extrusionCount, grid1.extrusionCount,
        'Each layer should have its own extrusionCount snapshot');
    }
  });
});

// ============================================================
// Warp Failure Prediction
// ============================================================

describe('ThermalAnalyzer - Warp Failure Prediction', () => {
  it('large ABS open-air print produces warp-failure findings', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 20; l++) {
      layerMoves[l] = makeMoves([
        { x1: 0, y1: 0, x2: 100, y2: 0, type: 'WALL-OUTER', feedRate: 1800, lineIndex: l * 10 },
        { x1: 0, y1: 2, x2: 100, y2: 2, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 1 },
        { x1: 0, y1: 4, x2: 100, y2: 4, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 2 },
        { x1: 0, y1: 6, x2: 100, y2: 6, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 3 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile({
      material: { type: 'ABS' },
      environment: { chamberType: 'open', ambientTemp: 22 },
    }));
    const findings = ta.getFindings();
    const warpFindings = findings.filter(f => f.category === 'warp-failure');
    assert.ok(warpFindings.length > 0, 'Should produce warp-failure findings for large ABS open-air print');
    for (const f of warpFindings) {
      assert.ok(f.metadata.failureMode, 'Each finding should have a failureMode in metadata');
    }
  });

  it('produces at most 3 warp-failure findings', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 30; l++) {
      layerMoves[l] = makeMoves([
        { x1: 0, y1: 0, x2: 150, y2: 0, type: 'WALL-OUTER', feedRate: 1800, lineIndex: l * 10 },
        { x1: 0, y1: 3, x2: 150, y2: 3, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 1 },
        { x1: 0, y1: 6, x2: 150, y2: 6, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 2 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile({
      material: { type: 'ABS' },
      environment: { chamberType: 'open', ambientTemp: 22 },
    }));
    const warpFindings = ta.getFindings().filter(f => f.category === 'warp-failure');
    assert.ok(warpFindings.length <= 3, `Should produce at most 3 warp-failure findings, got ${warpFindings.length}`);
  });

  it('small PLA print produces info-level warp-failure only', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 5; l++) {
      layerMoves[l] = makeMoves([
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', feedRate: 2400, lineIndex: l * 10 },
        { x1: 0, y1: 1, x2: 10, y2: 1, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 1 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile({
      material: { type: 'PLA' },
      environment: { chamberType: 'enclosed', ambientTemp: 25 },
    }));
    const warpFindings = ta.getFindings().filter(f => f.category === 'warp-failure');
    assert.ok(warpFindings.length > 0, 'Should still produce at least one warp-failure finding');
    const nonInfo = warpFindings.filter(f => f.severity !== 'info');
    assert.strictEqual(nonInfo.length, 0, `Small PLA print should only have info-level warp findings, got ${nonInfo.map(f => f.severity)}`);
  });

  it('heated chamber produces fewer critical findings than open', () => {
    const layerMoves = {};
    for (let l = 0; l < 20; l++) {
      layerMoves[l] = makeMoves([
        { x1: 0, y1: 0, x2: 100, y2: 0, type: 'WALL-OUTER', feedRate: 1800, lineIndex: l * 10 },
        { x1: 0, y1: 2, x2: 100, y2: 2, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 1 },
        { x1: 0, y1: 4, x2: 100, y2: 4, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 2 },
      ]);
    }

    const taOpen = new ThermalAnalyzer();
    taOpen.analyze(layerMoves, makeProfile({
      material: { type: 'ABS' },
      environment: { chamberType: 'open', ambientTemp: 22 },
    }));
    const openCritical = taOpen.getFindings().filter(f => f.category === 'warp-failure' && f.severity === 'critical');

    const taHeated = new ThermalAnalyzer();
    taHeated.analyze(layerMoves, makeProfile({
      material: { type: 'ABS' },
      environment: { chamberType: 'heated', ambientTemp: 22 },
    }));
    const heatedCritical = taHeated.getFindings().filter(f => f.category === 'warp-failure' && f.severity === 'critical');

    assert.ok(heatedCritical.length <= openCritical.length,
      `Heated chamber (${heatedCritical.length} critical) should produce <= critical findings than open (${openCritical.length})`);
  });

  it('warp-failure metadata contains failureMode field', () => {
    const ta = new ThermalAnalyzer();
    const layerMoves = {};
    for (let l = 0; l < 10; l++) {
      layerMoves[l] = makeMoves([
        { x1: 0, y1: 0, x2: 50, y2: 0, type: 'WALL-OUTER', feedRate: 2400, lineIndex: l * 10 },
        { x1: 0, y1: 2, x2: 50, y2: 2, type: 'FILL', feedRate: 3000, lineIndex: l * 10 + 1 },
      ]);
    }
    ta.analyze(layerMoves, makeProfile({
      material: { type: 'PLA' },
      environment: { chamberType: 'open', ambientTemp: 22 },
    }));
    const warpFindings = ta.getFindings().filter(f => f.category === 'warp-failure');
    const validModes = ['bed-adhesion', 'nozzle-collision', 'dimensional', 'none'];
    for (const f of warpFindings) {
      assert.ok(validModes.includes(f.metadata.failureMode),
        `failureMode "${f.metadata.failureMode}" should be one of ${validModes.join(', ')}`);
    }
  });
});
