import { describe, it } from 'node:test';
import assert from 'node:assert';
import { diffLines, changedLineSets, layerForLine } from '../src/line-diff.js';

const kinds = (rows) => rows.map((r) => r.kind);

describe('diffLines', () => {
  it('identical arrays produce no hunks', () => {
    const a = ['a', 'b', 'c'];
    const { rows, hunks } = diffLines(a, [...a]);
    assert.strictEqual(hunks.length, 0);
    assert.ok(rows.every((r) => r.kind === 'same'));
  });

  it('inserted line is one add row and one hunk', () => {
    const { rows, hunks } = diffLines(['a', 'b'], ['a', 'X', 'b']);
    assert.deepStrictEqual(kinds(rows), ['same', 'add', 'same']);
    assert.strictEqual(rows[1].afterIdx, 1);
    assert.strictEqual(rows[1].beforeIdx, null);
    assert.deepStrictEqual(hunks, [{ startRow: 1, endRow: 1 }]);
  });

  it('edited line is del then add in a single hunk', () => {
    const { rows, hunks } = diffLines(['a', 'b', 'c'], ['a', 'B', 'c']);
    assert.deepStrictEqual(kinds(rows), ['same', 'del', 'add', 'same']);
    assert.strictEqual(rows[1].afterIdx, null);
    assert.deepStrictEqual(hunks, [{ startRow: 1, endRow: 2 }]);
  });

  it('removed first line and appended last line', () => {
    const { rows, hunks } = diffLines(['a', 'b'], ['b', 'c']);
    assert.deepStrictEqual(kinds(rows), ['del', 'same', 'add']);
    assert.strictEqual(hunks.length, 2);
  });

  it('trailing empty line is handled', () => {
    const { rows } = diffLines(['a', ''], ['a', '', 'x']);
    const adds = rows.filter((r) => r.kind === 'add');
    assert.strictEqual(adds.length, 1);
    assert.strictEqual(adds[0].afterIdx, 2);
  });
});

describe('changedLineSets', () => {
  it('maps rows to indices', () => {
    const { rows } = diffLines(['a', 'b', 'c'], ['a', 'B', 'c']);
    const { removedBefore, addedAfter } = changedLineSets(rows);
    assert.deepStrictEqual(removedBefore, new Set([1]));
    assert.deepStrictEqual(addedAfter, new Set([1]));
  });
});

describe('layerForLine', () => {
  const layers = [{ number: 0, startLine: 10 }, { number: 1, startLine: 50 }];

  it('maps lines to the layer containing them', () => {
    assert.strictEqual(layerForLine(layers, 5), 0);
    assert.strictEqual(layerForLine(layers, 10), 0);
    assert.strictEqual(layerForLine(layers, 49), 0);
    assert.strictEqual(layerForLine(layers, 50), 1);
    assert.strictEqual(layerForLine(layers, 9999), 1);
  });

  it('returns null for no layers', () => {
    assert.strictEqual(layerForLine([], 3), null);
  });
});

describe('diffLines anchoring', () => {
  it('recovery-shaped diff with rewritten lines keeps most unchanged lines as same', () => {
    const before = [];
    for (let i = 0; i < 500; i++) before.push('; header ' + i);
    for (let i = 0; i < 100000; i++) before.push('G1 X' + i + ' Y' + i + ' E0.1');
    const remaining = before.slice(500 + 60000);
    const after = before.slice(0, 500).concat(remaining.map((l, i) => (i % 25 === 0 ? l + ' Z9.9' : l)));
    const t0 = performance.now();
    const { rows, hunks } = diffLines(before, after);
    const elapsed = performance.now() - t0;
    const same = rows.filter((r) => r.kind === 'same').length;
    assert.ok(hunks.length > 1, 'hunks ' + hunks.length);
    assert.ok(same > remaining.length * 0.9, 'same ' + same);
    assert.ok(elapsed < 4000, 'took ' + elapsed + 'ms');
  });

  it('edit distance beyond the cap falls back to block replace with consistent indices', () => {
    const before = ['start'];
    const after = ['start'];
    for (let i = 0; i < 2500; i++) { before.push('b' + (i % 3)); after.push('a' + (i % 3)); }
    before.push('end');
    after.push('end');
    const { rows, hunks } = diffLines(before, after);
    assert.strictEqual(hunks.length, 1);
    let bi = 0;
    let ai = 0;
    for (const r of rows) {
      if (r.kind === 'same') { assert.strictEqual(r.beforeIdx, bi++); assert.strictEqual(r.afterIdx, ai++); }
      else if (r.kind === 'del') { assert.strictEqual(r.beforeIdx, bi++); assert.strictEqual(r.afterIdx, null); }
      else { assert.strictEqual(r.beforeIdx, null); assert.strictEqual(r.afterIdx, ai++); }
    }
    assert.strictEqual(bi, before.length);
    assert.strictEqual(ai, after.length);
  });
});

describe('diffLines performance', () => {
  it('200k lines with 50 inserted completes under 1500ms', () => {
    const before = [];
    for (let i = 0; i < 200000; i++) before.push('G1 X' + i);
    const after = [];
    for (let i = 0; i < before.length; i++) {
      if (i % 4000 === 100) after.push('; inserted ' + i);
      after.push(before[i]);
    }
    const t0 = performance.now();
    const { rows } = diffLines(before, after);
    const elapsed = performance.now() - t0;
    assert.strictEqual(rows.filter((r) => r.kind === 'add').length, 50);
    assert.ok(elapsed < 1500, 'took ' + elapsed + 'ms');
  });

  it('recovery-shaped diff (60000-line prefix removed from 100000 lines) completes under 4000ms and yields 60000 del rows', () => {
    const before = [];
    for (let i = 0; i < 100000; i++) before.push('G1 X' + i);
    const after = before.slice(60000);
    const t0 = performance.now();
    const { rows } = diffLines(before, after);
    const elapsed = performance.now() - t0;
    assert.strictEqual(rows.filter((r) => r.kind === 'del').length, 60000);
    assert.ok(elapsed < 4000, 'took ' + elapsed + 'ms');
  });
});
