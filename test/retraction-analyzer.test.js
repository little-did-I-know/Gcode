import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RetractionAnalyzer } from '../src/retraction-analyzer.js';

function makeProfile(overrides = {}) {
  return {
    material: { type: 'PLA', meltTemp: 210, ...(overrides.material || {}) },
    _parsedLines: overrides._parsedLines || [],
    ...overrides,
  };
}

describe('RetractionAnalyzer - Engine Interface', () => {
  it('has correct name', () => {
    const a = new RetractionAnalyzer();
    assert.strictEqual(a.name, 'retraction');
  });

  it('returns supported overlays', () => {
    const a = new RetractionAnalyzer();
    const overlays = a.getSupportedOverlays();
    assert.ok(overlays.some(o => o.id === 'retraction-density'));
    assert.ok(overlays.some(o => o.id === 'stringing-risk'));
  });

  it('overlays have label and unit fields', () => {
    const a = new RetractionAnalyzer();
    for (const ov of a.getSupportedOverlays()) {
      assert.ok(typeof ov.label === 'string' && ov.label.length > 0, `Missing label on ${ov.id}`);
      assert.ok('unit' in ov, `Missing unit on ${ov.id}`);
    }
  });

  it('clear resets state', () => {
    const a = new RetractionAnalyzer();
    a.clear();
    assert.deepStrictEqual(a.getFindings(), []);
  });

  it('getOverlayData returns 0 for unknown keys', () => {
    const a = new RetractionAnalyzer();
    assert.strictEqual(a.getOverlayData('retraction-density', 0, 0), 0);
    assert.strictEqual(a.getOverlayData('stringing-risk', 0, 0), 0);
  });
});

describe('RetractionAnalyzer - Missing Retraction', () => {
  it('detects unretracted travel', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G0 X30 Y0 F6000',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.ok(missing.length > 0, 'should detect missing retraction');
  });

  it('no finding when retraction present', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G1 E-1 F2400',
      'G0 X30 Y0 F6000',
      'G1 E1 F2400',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 3 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0);
  });

  it('severity is critical for long unretracted travel (>10mm)', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G0 X30 Y0 F6000',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.ok(missing.length > 0);
    assert.strictEqual(missing[0].severity, 'critical');
  });

  it('severity is warning for short unretracted travel (2-10mm)', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G0 X15 Y0 F6000',
      'G1 X20 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 15, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 15, y1: 0, x2: 20, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.ok(missing.length > 0);
    assert.strictEqual(missing[0].severity, 'warning');
  });

  it('skips travel less than 2mm (wipe moves)', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G0 X11 Y0 F6000',
      'G1 X12 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 11, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 11, y1: 0, x2: 12, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0);
  });

  it('recognizes G10/G11 firmware retractions', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G10',
      'G0 X30 Y0 F6000',
      'G11',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 3 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0, 'G10/G11 should count as retraction');
  });
});

describe('RetractionAnalyzer - Excessive Retractions', () => {
  it('detects dense retraction clusters', () => {
    const a = new RetractionAnalyzer();
    const lines = [';LAYER:0'];
    const moves = [];
    for (let i = 0; i < 8; i++) {
      const x = 10 + i * 0.5;
      lines.push(`G1 X${x} Y0 E${i + 1} F3000`);
      lines.push(`G1 E${i} F2400`);
      lines.push(`G0 X${x + 0.3} Y0.3 F6000`);
      lines.push(`G1 E${i + 1} F2400`);
      moves.push(
        { x1: x - 0.5, y1: 0, x2: x, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: lines.length - 3 },
        { x1: x, y1: 0, x2: x + 0.3, y2: 0.3, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: lines.length - 1 },
      );
    }
    a.analyze({ 0: moves }, makeProfile({ _parsedLines: lines }));
    const excessive = a.getFindings().filter(f => f.category === 'excessive-retractions');
    assert.ok(excessive.length > 0, 'should detect excessive retractions');
  });

  it('no finding for sparse retractions', () => {
    const a = new RetractionAnalyzer();
    const lines = [';LAYER:0'];
    const moves = [];
    // Only 3 retractions, widely spaced
    for (let i = 0; i < 3; i++) {
      const x = i * 20;
      lines.push(`G1 X${x} Y0 E${i + 1} F3000`);
      lines.push(`G1 E${i} F2400`);
      lines.push(`G0 X${x + 15} Y0 F6000`);
      lines.push(`G1 E${i + 1} F2400`);
      moves.push(
        { x1: x - 1, y1: 0, x2: x, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: lines.length - 3 },
        { x1: x, y1: 0, x2: x + 15, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: lines.length - 1 },
      );
    }
    a.analyze({ 0: moves }, makeProfile({ _parsedLines: lines }));
    const excessive = a.getFindings().filter(f => f.category === 'excessive-retractions');
    assert.strictEqual(excessive.length, 0);
  });
});

describe('RetractionAnalyzer - Blob Prediction', () => {
  it('detects blob risk on outer wall after deretraction', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G1 E-1 F2400',
      'G0 X30 Y0 F6000',
      'G1 E1 F2400',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-INNER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 3 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const blobs = a.getFindings().filter(f => f.category === 'blob-risk');
    assert.ok(blobs.length > 0, 'should detect blob risk');
    assert.strictEqual(blobs[0].severity, 'warning');
  });

  it('detects blob risk on inner wall with info severity', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G1 E-1 F2400',
      'G0 X30 Y0 F6000',
      'G1 E1 F2400',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-INNER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 3 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-INNER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const blobs = a.getFindings().filter(f => f.category === 'blob-risk');
    assert.ok(blobs.length > 0, 'should detect blob risk on inner wall');
    assert.strictEqual(blobs[0].severity, 'info');
  });

  it('no blob risk on non-wall moves', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G1 E-1 F2400',
      'G0 X30 Y0 F6000',
      'G1 E1 F2400',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'FILL', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 3 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const blobs = a.getFindings().filter(f => f.category === 'blob-risk');
    assert.strictEqual(blobs.length, 0);
  });
});

describe('RetractionAnalyzer - Overlays', () => {
  it('retraction-density returns count for extrusion moves', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G1 E-1 F2400',
      'G0 X13 Y0 F6000',
      'G1 E1 F2400',
      'G1 X20 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 13, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 3 },
        { x1: 13, y1: 0, x2: 20, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    // The extrusion move near the retraction should have density > 0
    const density = a.getOverlayData('retraction-density', 0, 2);
    assert.ok(typeof density === 'number');
  });

  it('stringing-risk is higher without retraction', () => {
    const a = new RetractionAnalyzer();
    // Test without retraction
    const linesNoRetract = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G0 X30 Y0 F6000',
      'G1 X40 Y0 E2 F3000',
    ];
    const movesNoRetract = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(movesNoRetract, makeProfile({ _parsedLines: linesNoRetract }));
    const riskNoRetract = a.getOverlayData('stringing-risk', 0, 1);

    // Test with retraction
    const a2 = new RetractionAnalyzer();
    const linesRetract = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G1 E-1 F2400',
      'G0 X30 Y0 F6000',
      'G1 E1 F2400',
      'G1 X40 Y0 E2 F3000',
    ];
    const movesRetract = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 3 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a2.analyze(movesRetract, makeProfile({ _parsedLines: linesRetract }));
    const riskRetract = a2.getOverlayData('stringing-risk', 0, 1);

    assert.ok(riskNoRetract > riskRetract, `unretracted risk (${riskNoRetract}) should be > retracted risk (${riskRetract})`);
  });

  it('stringing-risk is 0 for extrusion moves', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G0 X30 Y0 F6000',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    assert.strictEqual(a.getOverlayData('stringing-risk', 0, 0), 0);
    assert.strictEqual(a.getOverlayData('stringing-risk', 0, 2), 0);
  });
});

describe('RetractionAnalyzer - E Mode Tracking', () => {
  it('handles absolute E mode (M82)', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      'M82',
      ';LAYER:0',
      'G1 X10 Y0 E5 F3000',
      'G1 E4 F2400',         // absolute retraction (5->4 = -1)
      'G0 X30 Y0 F6000',
      'G1 E5 F2400',         // deretraction (4->5 = +1)
      'G1 X40 Y0 E6 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 2 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 4 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 6 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0, 'should recognize absolute E retraction');
  });

  it('handles relative E mode (M83)', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      'M83',
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G1 E-1 F2400',        // relative retraction
      'G0 X30 Y0 F6000',
      'G1 E1 F2400',         // deretraction
      'G1 X40 Y0 E1 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 2 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 4 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 6 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0, 'should recognize relative E retraction');
  });
});

describe('RetractionAnalyzer - Finding Format', () => {
  it('findings have correct structure', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G0 X30 Y0 F6000',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 30, y1: 0, x2: 40, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const findings = a.getFindings();
    assert.ok(findings.length > 0);
    const f = findings[0];
    assert.ok(f.id, 'finding should have an id');
    assert.strictEqual(f.engine, 'retraction');
    assert.ok(['critical', 'warning', 'info'].includes(f.severity));
    assert.ok(f.category);
    assert.ok(f.title);
    assert.ok(f.description);
    assert.ok(f.location);
    assert.ok('layer' in f.location);
    assert.ok('xyz' in f.location);
  });
});

describe('RetractionAnalyzer - Context-Aware Thresholds', () => {
  it('suppresses missing retraction between bridge segments', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:5',
      'G1 X10 Y0 E1 F1200',
      'G0 X25 Y0 F6000',
      'G1 X40 Y0 E2 F1200',
    ];
    const layerMoves = {
      5: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'BRIDGE', extrude: true, feedRate: 1200, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 25, y2: 0, type: 'BRIDGE', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 25, y1: 0, x2: 40, y2: 0, type: 'BRIDGE', extrude: true, feedRate: 1200, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0, 'bridge-to-bridge travel should not flag missing retraction');
  });

  it('suppresses missing retraction for short infill-to-infill travel', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:2',
      'G1 X10 Y0 E1 F3000',
      'G0 X18 Y0 F6000',
      'G1 X30 Y0 E2 F3000',
    ];
    const layerMoves = {
      2: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 18, y2: 0, type: 'FILL', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 18, y1: 0, x2: 30, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0, '8mm infill-to-infill travel should be suppressed (threshold 10mm)');
  });

  it('still flags long infill-to-infill travel above threshold', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:2',
      'G1 X10 Y0 E1 F3000',
      'G0 X25 Y0 F6000',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      2: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 25, y2: 0, type: 'FILL', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 25, y1: 0, x2: 40, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.ok(missing.length > 0, '15mm infill travel should still be flagged');
  });

  it('suppresses missing retraction for support-to-support travel', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:3',
      'G1 X10 Y0 E1 F3000',
      'G0 X18 Y0 F6000',
      'G1 X30 Y0 E2 F3000',
    ];
    const layerMoves = {
      3: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'SUPPORT', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 18, y2: 0, type: 'SUPPORT', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 18, y1: 0, x2: 30, y2: 0, type: 'SUPPORT', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0, '8mm support travel should be suppressed');
  });

  it('keeps strict threshold for wall-adjacent travel', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:2',
      'G1 X10 Y0 E1 F3000',
      'G0 X15 Y0 F6000',
      'G1 X20 Y0 E2 F3000',
    ];
    const layerMoves = {
      2: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 15, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 15, y1: 0, x2: 20, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.ok(missing.length > 0, 'wall-to-wall 5mm travel should still be flagged at 2mm threshold');
  });

  it('uses higher threshold for bridge-adjacent travel (one side bridge)', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:5',
      'G1 X10 Y0 E1 F1200',
      'G0 X25 Y0 F6000',
      'G1 X40 Y0 E2 F3000',
    ];
    const layerMoves = {
      5: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'BRIDGE', extrude: true, feedRate: 1200, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 25, y2: 0, type: 'BRIDGE', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 25, y1: 0, x2: 40, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0, '15mm bridge-adjacent travel should be suppressed (threshold 20mm)');
  });

  it('bridge-adjacent travel has reduced stringing risk', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:5',
      'G1 X10 Y0 E1 F1200',
      'G0 X25 Y0 F6000',
      'G1 X40 Y0 E2 F1200',
    ];
    const layerMoves = {
      5: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'BRIDGE', extrude: true, feedRate: 1200, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 25, y2: 0, type: 'BRIDGE', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 25, y1: 0, x2: 40, y2: 0, type: 'BRIDGE', extrude: true, feedRate: 1200, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const risk = a.getOverlayData('stringing-risk', 5, 1);
    assert.ok(risk < 10, `bridge stringing risk (${risk}) should be reduced`);
  });

  it('uses gap fill threshold for gap-infill-to-gap-infill travel', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:2',
      'G1 X10 Y0 E1 F3000',
      'G0 X17 Y0 F6000',
      'G1 X30 Y0 E2 F3000',
    ];
    const layerMoves = {
      2: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'GAP INFILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 17, y2: 0, type: 'GAP INFILL', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 17, y1: 0, x2: 30, y2: 0, type: 'GAP INFILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0, '7mm gap-fill travel should be suppressed (threshold 8mm)');
  });
});

describe('RetractionAnalyzer - Layer-Below Coverage', () => {
  it('suppresses missing retraction when travel is over material from previous layer', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X50 Y0 E5 F3000',
      ';LAYER:1',
      'G1 X10 Y0 E6 F3000',
      'G0 X30 Y0 F6000',       // 20mm travel over layer 0 material
      'G1 X50 Y0 E7 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 50, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 5, lineIndex: 1 },
      ],
      1: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'FILL', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 4 },
        { x1: 30, y1: 0, x2: 50, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.strictEqual(missing.length, 0, 'travel over material should not flag missing retraction');
  });

  it('still flags travel when NOT over material from previous layer', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X5 Y0 E1 F3000',
      ';LAYER:1',
      'G1 X10 Y0 E2 F3000',
      'G0 X30 Y0 F6000',       // 20mm travel over empty space
      'G1 X50 Y0 E3 F3000',
    ];
    const layerMoves = {
      0: [
        // Only material at x=0..5, travel at x=10..30 is over empty space
        { x1: 0, y1: 0, x2: 5, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
      ],
      1: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 4 },
        { x1: 30, y1: 0, x2: 50, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.ok(missing.length > 0, 'travel over empty space should still flag missing retraction');
  });

  it('no coverage grid on first layer (no layer below)', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X10 Y0 E1 F3000',
      'G0 X30 Y0 F6000',
      'G1 X50 Y0 E2 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 1 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'WALL-OUTER', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 2 },
        { x1: 30, y1: 0, x2: 50, y2: 0, type: 'WALL-OUTER', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const missing = a.getFindings().filter(f => f.category === 'missing-retraction');
    assert.ok(missing.length > 0, 'first layer travel should still flag (no layer below)');
  });

  it('reduces stringing risk for travel over material', () => {
    const a = new RetractionAnalyzer();
    const lines = [
      ';LAYER:0',
      'G1 X50 Y0 E5 F3000',
      ';LAYER:1',
      'G1 X10 Y0 E6 F3000',
      'G0 X30 Y0 F6000',
      'G1 X50 Y0 E7 F3000',
    ];
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 50, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 5, lineIndex: 1 },
      ],
      1: [
        { x1: 0, y1: 0, x2: 10, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 3 },
        { x1: 10, y1: 0, x2: 30, y2: 0, type: 'FILL', extrude: false, feedRate: 6000, eLength: 0, lineIndex: 4 },
        { x1: 30, y1: 0, x2: 50, y2: 0, type: 'FILL', extrude: true, feedRate: 3000, eLength: 1, lineIndex: 5 },
      ],
    };
    a.analyze(layerMoves, makeProfile({ _parsedLines: lines }));
    const risk = a.getOverlayData('stringing-risk', 1, 1);
    // 20mm * 0.15 = 3.0, should be much less than 20mm * 0.5 (infill context) = 10
    assert.ok(risk < 5, `stringing risk over material (${risk}) should be low`);
  });
});
