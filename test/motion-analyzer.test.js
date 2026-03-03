import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MotionAnalyzer } from '../src/motion-analyzer.js';

describe('MotionAnalyzer', () => {
  it('creates with default profile', () => {
    const analyzer = new MotionAnalyzer();
    assert.ok(analyzer.profile);
    assert.strictEqual(analyzer.profile.acceleration, 500);
    assert.strictEqual(analyzer.profile.jerk, 8);
  });

  it('respects custom values when passed', () => {
    const customProfile = {
      acceleration: 1000,
      travelAccel: 2000,
      jerk: 16,
      junctionDeviation: 0.05,
      maxVelocity: 300,
      firmwareType: 'klipper',
      headMass: 0.5,
      gantryType: 'corexy',
    };
    const analyzer = new MotionAnalyzer(customProfile);
    assert.strictEqual(analyzer.profile.acceleration, 1000);
    assert.strictEqual(analyzer.profile.travelAccel, 2000);
    assert.strictEqual(analyzer.profile.jerk, 16);
    assert.strictEqual(analyzer.profile.junctionDeviation, 0.05);
    assert.strictEqual(analyzer.profile.maxVelocity, 300);
    assert.strictEqual(analyzer.profile.firmwareType, 'klipper');
    assert.strictEqual(analyzer.profile.headMass, 0.5);
    assert.strictEqual(analyzer.profile.gantryType, 'corexy');
  });

  it('initializes results Map', () => {
    const analyzer = new MotionAnalyzer();
    assert.ok(analyzer.results instanceof Map);
    assert.strictEqual(analyzer.results.size, 0);
  });

  it('handles partial profile with some custom and some default values', () => {
    const partialProfile = {
      acceleration: 750,
      firmwareType: 'reprap',
    };
    const analyzer = new MotionAnalyzer(partialProfile);
    // Custom values
    assert.strictEqual(analyzer.profile.acceleration, 750);
    assert.strictEqual(analyzer.profile.firmwareType, 'reprap');
    // Default values
    assert.strictEqual(analyzer.profile.travelAccel, 1000);
    assert.strictEqual(analyzer.profile.jerk, 8);
    assert.strictEqual(analyzer.profile.junctionDeviation, null);
    assert.strictEqual(analyzer.profile.maxVelocity, 500);
    assert.strictEqual(analyzer.profile.headMass, null);
    assert.strictEqual(analyzer.profile.gantryType, 'cartesian');
  });
});

describe('MotionAnalyzer.inferProfile', () => {
  it('extracts acceleration from M204 command', () => {
    const lines = [
      'M204 P1000 T1500',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1',
    ];
    const profile = MotionAnalyzer.inferProfile(lines);
    assert.strictEqual(profile.acceleration, 1000);
    assert.strictEqual(profile.travelAccel, 1500);
  });

  it('extracts jerk from M205 command', () => {
    const lines = [
      'M205 X10 Y10',
      ';LAYER:0',
      'G1 X10 Y10 Z0.2 E1',
    ];
    const profile = MotionAnalyzer.inferProfile(lines);
    assert.strictEqual(profile.jerk, 10);
  });

  it('detects Klipper firmware from SET_VELOCITY_LIMIT', () => {
    const lines = [
      'SET_VELOCITY_LIMIT ACCEL=3000',
      ';LAYER:0',
    ];
    const profile = MotionAnalyzer.inferProfile(lines);
    assert.strictEqual(profile.firmwareType, 'klipper');
    assert.strictEqual(profile.acceleration, 3000);
  });

  it('returns defaults when no commands found', () => {
    const lines = [';LAYER:0', 'G1 X10 Y10'];
    const profile = MotionAnalyzer.inferProfile(lines);
    assert.strictEqual(profile.acceleration, 500);
  });
});

describe('MotionAnalyzer.calcMaxVelocity', () => {
  it('calculates max velocity for short segment', () => {
    const analyzer = new MotionAnalyzer({ acceleration: 1000 });
    // Short 5mm segment starting at 0, v = sqrt(2 * 1000 * 5) = 100mm/s
    const result = analyzer.calcMaxVelocity(5, 0, 100);
    assert.ok(result <= 100);
    assert.ok(result > 90);
  });

  it('caps at requested velocity for long segment', () => {
    const analyzer = new MotionAnalyzer({ acceleration: 1000 });
    const result = analyzer.calcMaxVelocity(500, 0, 100);
    assert.strictEqual(result, 100);
  });

  it('accounts for entry velocity', () => {
    const analyzer = new MotionAnalyzer({ acceleration: 1000 });
    // Starting at 50mm/s, 5mm segment: v = sqrt(50² + 2*1000*5) ≈ 111.8mm/s
    const result = analyzer.calcMaxVelocity(5, 50, 200);
    assert.ok(result > 100);
    assert.ok(result < 120);
  });
});

describe('MotionAnalyzer.calcJunctionVelocity', () => {
  it('returns full velocity for straight line (180°)', () => {
    const analyzer = new MotionAnalyzer({ jerk: 10 });
    const move1 = { x1: 0, y1: 0, x2: 10, y2: 0 };
    const move2 = { x1: 10, y1: 0, x2: 20, y2: 0 };
    const result = analyzer.calcJunctionVelocity(move1, move2, 100);
    assert.strictEqual(result, 100);
  });

  it('returns near-zero for sharp 90° corner', () => {
    const analyzer = new MotionAnalyzer({ jerk: 8 });
    const move1 = { x1: 0, y1: 0, x2: 10, y2: 0 };
    const move2 = { x1: 10, y1: 0, x2: 10, y2: 10 };
    const result = analyzer.calcJunctionVelocity(move1, move2, 100);
    assert.ok(result < 20, `Expected <20 but got ${result}`);
    assert.ok(result > 0);
  });

  it('returns zero for 180° reversal', () => {
    const analyzer = new MotionAnalyzer({ jerk: 8 });
    const move1 = { x1: 0, y1: 0, x2: 10, y2: 0 };
    const move2 = { x1: 10, y1: 0, x2: 0, y2: 0 };
    const result = analyzer.calcJunctionVelocity(move1, move2, 100);
    assert.ok(result < 5, `Expected near-zero but got ${result}`);
  });
});

describe('MotionAnalyzer.analyzeMoves', () => {
  it('analyzes a simple layer of moves', () => {
    const analyzer = new MotionAnalyzer({ acceleration: 1000, jerk: 8 });
    const moves = [
      { x1: 0, y1: 0, x2: 10, y2: 0, feedRate: 3000, extrude: true },
      { x1: 10, y1: 0, x2: 20, y2: 0, feedRate: 3000, extrude: true },
      { x1: 20, y1: 0, x2: 20, y2: 10, feedRate: 3000, extrude: true },
    ];

    const results = analyzer.analyzeMoves(moves);

    assert.strictEqual(results.length, 3);
    assert.ok(results[0].requestedSpeed > 0);
    assert.ok(results[0].actualPeakSpeed > 0);
    assert.ok(results[0].actualPeakSpeed <= results[0].requestedSpeed);
  });

  it('slows down for sharp corners', () => {
    const analyzer = new MotionAnalyzer({ acceleration: 1000, jerk: 8 });
    const moves = [
      { x1: 0, y1: 0, x2: 50, y2: 0, feedRate: 6000, extrude: true },
      { x1: 50, y1: 0, x2: 50, y2: 50, feedRate: 6000, extrude: true },
    ];

    const results = analyzer.analyzeMoves(moves);

    assert.ok(results[0].exitSpeed < results[0].actualPeakSpeed,
      'Exit speed should be lower than peak due to corner');
  });

  it('returns motion phases (accel/cruise/decel times)', () => {
    const analyzer = new MotionAnalyzer({ acceleration: 1000 });
    const moves = [
      { x1: 0, y1: 0, x2: 100, y2: 0, feedRate: 6000, extrude: true },
    ];

    const results = analyzer.analyzeMoves(moves);

    assert.ok('timeAccel' in results[0]);
    assert.ok('timeCruise' in results[0]);
    assert.ok('timeDecel' in results[0]);
    assert.ok(results[0].timeAccel >= 0);
  });
});

describe('MotionAnalyzer - Findings', () => {
  it('returns empty findings when no issues', () => {
    // Straight, short moves at low speed with generous acceleration — no issues expected
    // feedRate 600 = 10mm/s, which keeps actualPeakSpeed at or below thresholds
    const analyzer = new MotionAnalyzer({ acceleration: 3000, jerk: 20, maxVelocity: 500 });
    const moves = [];
    // 5 straight moves along X axis, short distance (5mm each), very low speed (10mm/s = 600mm/min)
    for (let i = 0; i < 5; i++) {
      moves.push({
        x1: i * 5, y1: 0, x2: (i + 1) * 5, y2: 0,
        feedRate: 600, extrude: true, lineIndex: i + 10,
      });
    }
    const layerMoves = { 0: moves };
    analyzer.analyze(layerMoves, {});
    const findings = analyzer.getFindings();
    assert.strictEqual(findings.length, 0, `Expected no findings but got ${findings.length}: ${JSON.stringify(findings.map(f => f.title))}`);
  });

  it('detects speed-limited segments', () => {
    // 15 short (2mm) segments at high requested speed (300mm/s = 18000mm/min) with low accel (100mm/s²)
    // With 2mm distance and 100mm/s² accel, max achievable from standstill: sqrt(2*100*1) = ~14mm/s
    // Requested 300mm/s, ratio ~14/300 = 0.047 << 0.5 threshold
    const analyzer = new MotionAnalyzer({ acceleration: 100, jerk: 8, maxVelocity: 500 });
    const moves = [];
    for (let i = 0; i < 15; i++) {
      moves.push({
        x1: i * 2, y1: 0, x2: (i + 1) * 2, y2: 0,
        feedRate: 18000, extrude: true, lineIndex: i + 10,
      });
    }
    const layerMoves = { 0: moves };
    analyzer.analyze(layerMoves, {});
    const findings = analyzer.getFindings();
    const speedLimited = findings.filter(f => f.category === 'speed-limited');
    assert.ok(speedLimited.length >= 1, `Expected at least 1 speed-limited finding but got ${speedLimited.length}`);
    assert.ok(speedLimited[0].title.includes('speed-limited'), `Title should mention speed-limited: ${speedLimited[0].title}`);
  });

  it('detects sharp corner speed drops', () => {
    // 90° turn on long (50mm) segments at high speed (100mm/s = 6000mm/min)
    // With high accel, peak speed should be > 10. At 90° corner, junction velocity
    // will be very low relative to peak, triggering the exitSpeed < actualPeakSpeed * 0.3 check
    const analyzer = new MotionAnalyzer({ acceleration: 5000, jerk: 8, maxVelocity: 500 });
    const moves = [
      { x1: 0, y1: 0, x2: 50, y2: 0, feedRate: 6000, extrude: true, lineIndex: 10 },
      { x1: 50, y1: 0, x2: 50, y2: 50, feedRate: 6000, extrude: true, lineIndex: 11 },
    ];
    const layerMoves = { 0: moves };
    analyzer.analyze(layerMoves, {});
    const findings = analyzer.getFindings();
    const sharpCorner = findings.filter(f => f.category === 'sharp-corner');
    assert.ok(sharpCorner.length >= 1, `Expected at least 1 sharp-corner finding but got ${sharpCorner.length}`);
    assert.strictEqual(sharpCorner[0].severity, 'info');
    assert.ok(sharpCorner[0].title.includes('Sharp corner'), `Title should include "Sharp corner": ${sharpCorner[0].title}`);
  });

  it('detects ringing risk', () => {
    // Sharp corner (>90°) followed by high speed (>150mm/s) move
    // Use very high accel so the moves actually reach high speed
    const analyzer = new MotionAnalyzer({ acceleration: 50000, jerk: 8, maxVelocity: 500 });
    // First move: long segment going right
    // Second move: goes at a sharp angle (>90°), long enough to reach >150mm/s
    const moves = [
      { x1: 0, y1: 0, x2: 100, y2: 0, feedRate: 60000, extrude: true, lineIndex: 10 },
      // This goes back-left and up, creating >90° angle with previous direction
      { x1: 100, y1: 0, x2: 50, y2: 50, feedRate: 60000, extrude: true, lineIndex: 11 },
    ];
    const layerMoves = { 0: moves };
    analyzer.analyze(layerMoves, {});
    const findings = analyzer.getFindings();
    const ringing = findings.filter(f => f.category === 'ringing-risk');
    assert.ok(ringing.length >= 1, `Expected at least 1 ringing-risk finding but got ${ringing.length}: ${JSON.stringify(findings.map(f => ({ cat: f.category, title: f.title })))}`);
    assert.strictEqual(ringing[0].severity, 'warning');
    assert.ok(ringing[0].title.includes('Ringing'), `Title should include "Ringing": ${ringing[0].title}`);
  });

  it('findings have correct schema', () => {
    // Create conditions that will generate at least one finding
    const analyzer = new MotionAnalyzer({ acceleration: 5000, jerk: 8, maxVelocity: 500 });
    const moves = [
      { x1: 0, y1: 0, x2: 50, y2: 0, feedRate: 6000, extrude: true, lineIndex: 10 },
      { x1: 50, y1: 0, x2: 50, y2: 50, feedRate: 6000, extrude: true, lineIndex: 11 },
    ];
    const layerMoves = { 0: moves };
    analyzer.analyze(layerMoves, {});
    const findings = analyzer.getFindings();

    // Should have at least one finding (sharp corner)
    assert.ok(findings.length > 0, 'Expected at least one finding for schema validation');

    for (const finding of findings) {
      // Required fields
      assert.ok(typeof finding.id === 'string', `id should be string: ${finding.id}`);
      assert.ok(finding.id.startsWith('mo-'), `id should start with "mo-": ${finding.id}`);
      assert.strictEqual(finding.engine, 'motion', `engine should be "motion": ${finding.engine}`);
      assert.ok(['critical', 'warning', 'info'].includes(finding.severity), `Invalid severity: ${finding.severity}`);
      assert.ok(typeof finding.category === 'string', `category should be string: ${finding.category}`);
      assert.ok(typeof finding.title === 'string', `title should be string: ${finding.title}`);
      assert.ok(typeof finding.description === 'string', `description should be string: ${finding.description}`);
      assert.ok(typeof finding.suggestion === 'string', `suggestion should be string: ${finding.suggestion}`);

      // Location
      assert.ok(finding.location !== undefined, 'finding should have location');
      assert.ok(typeof finding.location.layer === 'number', `layer should be number: ${finding.location.layer}`);
      assert.ok('lineStart' in finding.location, 'location should have lineStart');
      assert.ok('lineEnd' in finding.location, 'location should have lineEnd');
      assert.ok(finding.location.xyz !== undefined, 'location should have xyz');
      assert.ok(typeof finding.location.xyz.x === 'number', 'xyz.x should be number');
      assert.ok(typeof finding.location.xyz.y === 'number', 'xyz.y should be number');

      // Metadata
      assert.ok(finding.metadata !== undefined, 'finding should have metadata');
      assert.ok(typeof finding.metadata === 'object', 'metadata should be object');
    }
  });
});

describe('MotionAnalyzer - Print Time', () => {
  it('reports layer-time overlay', () => {
    const analyzer = new MotionAnalyzer();
    const overlays = analyzer.getSupportedOverlays();
    assert.ok(overlays.some(o => o.id === 'layer-time'), 'should have layer-time overlay');
  });

  it('layer-time returns positive time for extrusion layers', () => {
    const analyzer = new MotionAnalyzer({ acceleration: 500 });
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 50, y2: 0, feedRate: 3000, extrude: true, type: 'WALL-OUTER', lineIndex: 1, eLength: 1 },
        { x1: 50, y1: 0, x2: 50, y2: 50, feedRate: 3000, extrude: true, type: 'WALL-OUTER', lineIndex: 2, eLength: 1 },
      ]
    };
    analyzer.analyze(layerMoves, {});
    const time = analyzer.getOverlayData('layer-time', 0, 0);
    assert.ok(time > 0, 'layer time should be positive');
  });

  it('layer-time returns same value for all moves on a layer', () => {
    const analyzer = new MotionAnalyzer({ acceleration: 500 });
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 50, y2: 0, feedRate: 3000, extrude: true, type: 'WALL-OUTER', lineIndex: 1, eLength: 1 },
        { x1: 50, y1: 0, x2: 50, y2: 50, feedRate: 3000, extrude: true, type: 'WALL-OUTER', lineIndex: 2, eLength: 1 },
      ]
    };
    analyzer.analyze(layerMoves, {});
    const t0 = analyzer.getOverlayData('layer-time', 0, 0);
    const t1 = analyzer.getOverlayData('layer-time', 0, 1);
    assert.strictEqual(t0, t1, 'all moves on same layer should have same time');
  });

  it('getTimeSummary returns total and per-layer times', () => {
    const analyzer = new MotionAnalyzer({ acceleration: 500 });
    const layerMoves = {
      0: [
        { x1: 0, y1: 0, x2: 50, y2: 0, feedRate: 3000, extrude: true, type: 'WALL-OUTER', lineIndex: 1, eLength: 1 },
      ],
      1: [
        { x1: 0, y1: 0, x2: 100, y2: 0, feedRate: 6000, extrude: true, type: 'FILL', lineIndex: 2, eLength: 1 },
      ]
    };
    analyzer.analyze(layerMoves, {});
    const summary = analyzer.getTimeSummary();
    assert.ok(summary.totalTime > 0, 'totalTime should be positive');
    assert.strictEqual(summary.layerTimes.length, 2, 'should have 2 layer times');
    assert.ok(summary.byType.wall > 0, 'wall time should be positive');
    assert.ok(summary.byType.infill > 0, 'infill time should be positive');
    assert.ok(Array.isArray(summary.slowest), 'should have slowest array');
  });

  it('getTimeSummary returns null before analysis', () => {
    const analyzer = new MotionAnalyzer();
    assert.strictEqual(analyzer.getTimeSummary(), null);
  });
});
