import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeSelectionBounds, transformPoint, transformMoves, transformGcodeLine } from '../src/transform.js';

describe('computeSelectionBounds', () => {
  it('computes bounds and centroid from moves', () => {
    const moves = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 10, y1: 0, x2: 10, y2: 20 },
    ];
    const b = computeSelectionBounds(moves);
    assert.equal(b.minX, 0);
    assert.equal(b.minY, 0);
    assert.equal(b.maxX, 10);
    assert.equal(b.maxY, 20);
    assert.equal(b.centerX, 5);
    assert.equal(b.centerY, 10);
  });

  it('handles single move', () => {
    const moves = [{ x1: 5, y1: 5, x2: 15, y2: 25 }];
    const b = computeSelectionBounds(moves);
    assert.equal(b.centerX, 10);
    assert.equal(b.centerY, 15);
  });
});

describe('transformPoint', () => {
  it('identity transform returns original point', () => {
    const p = transformPoint(10, 20, 5, 10, { translateX: 0, translateY: 0, angle: 0, scale: 1, mirrorX: false, mirrorY: false });
    assert.ok(Math.abs(p.x - 10) < 0.001);
    assert.ok(Math.abs(p.y - 20) < 0.001);
  });

  it('translates correctly', () => {
    const p = transformPoint(10, 20, 5, 10, { translateX: 3, translateY: -5, angle: 0, scale: 1, mirrorX: false, mirrorY: false });
    assert.ok(Math.abs(p.x - 13) < 0.001);
    assert.ok(Math.abs(p.y - 15) < 0.001);
  });

  it('rotates 90 degrees around centroid', () => {
    const p = transformPoint(10, 10, 5, 10, { translateX: 0, translateY: 0, angle: 90, scale: 1, mirrorX: false, mirrorY: false });
    assert.ok(Math.abs(p.x - 5) < 0.001);
    assert.ok(Math.abs(p.y - 15) < 0.001);
  });

  it('scales from centroid', () => {
    const p = transformPoint(10, 20, 5, 10, { translateX: 0, translateY: 0, angle: 0, scale: 2, mirrorX: false, mirrorY: false });
    assert.ok(Math.abs(p.x - 15) < 0.001);
    assert.ok(Math.abs(p.y - 30) < 0.001);
  });

  it('mirrors across X-axis (flips Y)', () => {
    const p = transformPoint(10, 20, 5, 10, { translateX: 0, translateY: 0, angle: 0, scale: 1, mirrorX: true, mirrorY: false });
    assert.ok(Math.abs(p.x - 10) < 0.001);
    assert.ok(Math.abs(p.y - 0) < 0.001);
  });

  it('mirrors across Y-axis (flips X)', () => {
    const p = transformPoint(10, 20, 5, 10, { translateX: 0, translateY: 0, angle: 0, scale: 1, mirrorX: false, mirrorY: true });
    assert.ok(Math.abs(p.x - 0) < 0.001);
    assert.ok(Math.abs(p.y - 20) < 0.001);
  });

  it('applies full pipeline: scale, mirror, rotate, translate', () => {
    const p = transformPoint(10, 10, 5, 10, { translateX: 1, translateY: 2, angle: 90, scale: 2, mirrorX: false, mirrorY: true });
    assert.ok(Math.abs(p.x - 6) < 0.001);
    assert.ok(Math.abs(p.y - 2) < 0.001);
  });
});

describe('transformMoves', () => {
  it('transforms both endpoints of each move', () => {
    const moves = [{ x1: 0, y1: 0, x2: 10, y2: 0 }];
    const bounds = { centerX: 5, centerY: 0 };
    const state = { translateX: 5, translateY: 0, angle: 0, scale: 1, mirrorX: false, mirrorY: false };
    const result = transformMoves(moves, bounds, state);
    assert.equal(result.length, 1);
    assert.ok(Math.abs(result[0].x1 - 5) < 0.001);
    assert.ok(Math.abs(result[0].x2 - 15) < 0.001);
  });
});

describe('transformGcodeLine', () => {
  it('transforms X and Y in a G1 line', () => {
    const line = 'G1 X10.50 Y20.30 E4.200 F1200';
    const move = { x1: 5, y1: 15, x2: 10.5, y2: 20.3 };
    const bounds = { centerX: 7.75, centerY: 17.65 };
    const state = { translateX: 5, translateY: 0, angle: 0, scale: 1, mirrorX: false, mirrorY: false };
    const result = transformGcodeLine(line, move, bounds, state);
    assert.ok(result.includes('X15.50'));
    assert.ok(result.includes('Y20.30'));
    assert.ok(result.includes('E4.200'));
  });

  it('preserves precision', () => {
    const line = 'G1 X100.123 Y200.456';
    const move = { x1: 90, y1: 190, x2: 100.123, y2: 200.456 };
    const bounds = { centerX: 95, centerY: 195 };
    const state = { translateX: 0, translateY: 0, angle: 0, scale: 1, mirrorX: false, mirrorY: false };
    const result = transformGcodeLine(line, move, bounds, state);
    assert.equal(result, 'G1 X100.123 Y200.456');
  });

  it('transforms I and J for arc commands', () => {
    const line = 'G2 X20.00 Y10.00 I5.00 J0.00';
    const move = { x1: 10, y1: 10, x2: 20, y2: 10 };
    const bounds = { centerX: 15, centerY: 10 };
    const state = { translateX: 0, translateY: 0, angle: 0, scale: 2, mirrorX: false, mirrorY: false };
    const result = transformGcodeLine(line, move, bounds, state);
    assert.ok(result.includes('I10.00'));
    assert.ok(result.includes('J0.00'));
  });

  it('returns null for lines without X or Y', () => {
    const line = 'G1 E4.200 F1200';
    const move = { x1: 10, y1: 20, x2: 10, y2: 20 };
    const bounds = { centerX: 10, centerY: 20 };
    const state = { translateX: 5, translateY: 0, angle: 0, scale: 1, mirrorX: false, mirrorY: false };
    const result = transformGcodeLine(line, move, bounds, state);
    assert.equal(result, null);
  });
});
