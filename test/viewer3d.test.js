import { describe, it } from 'node:test';
import assert from 'node:assert';

// Test the point-to-segment distance and nearest-move logic standalone.
// We extract the math into testable functions.

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx, projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function findNearestMove(worldX, worldY, moves) {
  let best = null, bestDist = Infinity;
  for (const move of moves) {
    if (!move.extrude) continue;
    const d = pointToSegmentDist(worldX, worldY, move.x1, move.y1, move.x2, move.y2);
    if (d < bestDist) { bestDist = d; best = move; }
  }
  return best;
}

describe('pointToSegmentDist', () => {
  it('returns 0 for point on segment', () => {
    const d = pointToSegmentDist(5, 0, 0, 0, 10, 0);
    assert.ok(d < 0.001);
  });

  it('returns perpendicular distance for point beside segment', () => {
    const d = pointToSegmentDist(5, 3, 0, 0, 10, 0);
    assert.ok(Math.abs(d - 3) < 0.001);
  });

  it('returns distance to nearest endpoint when beyond segment', () => {
    const d = pointToSegmentDist(15, 0, 0, 0, 10, 0);
    assert.ok(Math.abs(d - 5) < 0.001);
  });

  it('handles zero-length segment', () => {
    const d = pointToSegmentDist(3, 4, 0, 0, 0, 0);
    assert.ok(Math.abs(d - 5) < 0.001);
  });
});

describe('findNearestMove', () => {
  it('returns closest extrusion move', () => {
    const moves = [
      { x1: 0, y1: 0, x2: 10, y2: 0, extrude: true, lineIndex: 1 },
      { x1: 0, y1: 20, x2: 10, y2: 20, extrude: true, lineIndex: 2 },
    ];
    const result = findNearestMove(5, 1, moves);
    assert.strictEqual(result.lineIndex, 1);
  });

  it('returns null when no moves exist', () => {
    const result = findNearestMove(5, 5, []);
    assert.strictEqual(result, null);
  });

  it('ignores travel moves', () => {
    const moves = [
      { x1: 0, y1: 0, x2: 10, y2: 0, extrude: false, lineIndex: 1 },
      { x1: 0, y1: 20, x2: 10, y2: 20, extrude: true, lineIndex: 2 },
    ];
    const result = findNearestMove(5, 1, moves);
    assert.strictEqual(result.lineIndex, 2);
  });

  it('returns null when only travel moves exist', () => {
    const moves = [
      { x1: 0, y1: 0, x2: 10, y2: 0, extrude: false, lineIndex: 1 },
    ];
    const result = findNearestMove(5, 1, moves);
    assert.strictEqual(result, null);
  });
});

function computeClipPlane(rotDeg, tiltDeg, sweep) {
  const rot = rotDeg * Math.PI / 180;
  const tilt = tiltDeg * Math.PI / 180;
  const nx = Math.cos(rot) * Math.cos(tilt);
  const ny = Math.sin(rot) * Math.cos(tilt);
  const nz = Math.sin(tilt);
  return [nx, ny, nz, -sweep];
}

describe('computeClipPlane', () => {
  it('default vertical plane facing X at rot=0 tilt=0', () => {
    const [nx, ny, nz, d] = computeClipPlane(0, 0, 100);
    assert.ok(Math.abs(nx - 1) < 0.001);
    assert.ok(Math.abs(ny) < 0.001);
    assert.ok(Math.abs(nz) < 0.001);
    assert.ok(Math.abs(d - (-100)) < 0.001);
  });

  it('vertical plane facing Y at rot=90 tilt=0', () => {
    const [nx, ny, nz] = computeClipPlane(90, 0, 0);
    assert.ok(Math.abs(nx) < 0.001);
    assert.ok(Math.abs(ny - 1) < 0.001);
    assert.ok(Math.abs(nz) < 0.001);
  });

  it('horizontal plane at tilt=90', () => {
    const [nx, ny, nz] = computeClipPlane(0, 90, 0);
    assert.ok(Math.abs(nx) < 0.001);
    assert.ok(Math.abs(ny) < 0.001);
    assert.ok(Math.abs(nz - 1) < 0.001);
  });

  it('45-degree diagonal', () => {
    const [nx, ny, nz] = computeClipPlane(45, 0, 0);
    assert.ok(Math.abs(nx - Math.SQRT1_2) < 0.001);
    assert.ok(Math.abs(ny - Math.SQRT1_2) < 0.001);
    assert.ok(Math.abs(nz) < 0.001);
  });

  it('sweep offset becomes negative d', () => {
    const [, , , d] = computeClipPlane(0, 0, 50);
    assert.ok(Math.abs(d - (-50)) < 0.001);
  });
});
