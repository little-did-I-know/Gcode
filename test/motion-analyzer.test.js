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
