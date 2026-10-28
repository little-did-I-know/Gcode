// Line diff: Myers diff over string arrays, with common prefix/suffix trimming
// and a bounded edit distance so pathological inputs fall back to a block replace.

const DIFF_MAX_EDIT_DISTANCE = 2000;

// Myers diff on a[aStart..aEnd) vs b[bStart..bEnd). Returns an array of
// 'same' | 'del' | 'add' ops in forward order, or null if the edit distance
// exceeds DIFF_MAX_EDIT_DISTANCE.
function _diffMyersOps(a, aStart, aEnd, b, bStart, bEnd) {
  const n = aEnd - aStart;
  const m = bEnd - bStart;
  const maxD = Math.min(n + m, DIFF_MAX_EDIT_DISTANCE);
  const size = 2 * maxD + 3;
  const mid = maxD + 1;
  const v = new Int32Array(size);
  const snapshots = [];
  let found = -1;

  for (let d = 0; d <= maxD && found < 0; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && v[mid + k - 1] < v[mid + k + 1])) x = v[mid + k + 1];
      else x = v[mid + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[aStart + x] === b[bStart + y]) { x++; y++; }
      v[mid + k] = x;
      if (x >= n && y >= m) { found = d; break; }
    }
    if (found < 0) snapshots.push(v.slice(mid - d, mid + d + 1));
  }
  if (found < 0) return null;

  const ops = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const prev = snapshots[d - 1];
    const k = x - y;
    const pAt = (kk) => prev[kk + d - 1];
    const prevK = (k === -d || (k !== d && pAt(k - 1) < pAt(k + 1))) ? k + 1 : k - 1;
    const prevX = pAt(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.push('same'); x--; y--; }
    ops.push(x === prevX ? 'add' : 'del');
    x = prevX;
    y = prevY;
  }
  while (x > 0 && y > 0) { ops.push('same'); x--; y--; }
  return ops.reverse();
}

function _pushBlockReplaceOps(ops, delCount, addCount) {
  for (let i = 0; i < delCount; i++) ops.push('del');
  for (let i = 0; i < addCount; i++) ops.push('add');
}

// Lines occurring exactly once in both ranges, as {b, a} pairs that form the
// longest increasing subsequence (patience-style anchors), in forward order.
function _uniqueAnchors(before, bs, be, after, as, ae) {
  const info = new Map(); // line -> { bCount, aCount, b, a }
  for (let i = bs; i < be; i++) {
    const e = info.get(before[i]);
    if (e) e.bCount++; else info.set(before[i], { bCount: 1, aCount: 0, b: i, a: -1 });
  }
  for (let j = as; j < ae; j++) {
    const e = info.get(after[j]);
    if (!e) continue;
    e.aCount++;
    e.a = j;
  }
  const pairs = [];
  for (const e of info.values()) {
    if (e.bCount === 1 && e.aCount === 1) pairs.push(e);
  }
  if (pairs.length === 0) return [];
  pairs.sort((x, y) => x.b - y.b);
  // LIS on .a using tails array + predecessor links
  const tails = [];
  const prev = new Int32Array(pairs.length).fill(-1);
  for (let i = 0; i < pairs.length; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (pairs[tails[m]].a < pairs[i].a) lo = m + 1; else hi = m;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const out = [];
  for (let i = tails[tails.length - 1]; i !== -1; i = prev[i]) out.push(pairs[i]);
  return out.reverse();
}

// Appends ops for before[bs..be) vs after[as..ae). Trims common ends, tries
// Myers, then anchors on unique lines and recurses into the gaps; only a gap
// with no anchors and over the Myers cap becomes a block replace.
function _diffRangeOps(before, bs, be, after, as, ae, ops) {
  while (bs < be && as < ae && before[bs] === after[as]) { ops.push('same'); bs++; as++; }
  let tail = 0;
  while (be > bs && ae > as && before[be - 1] === after[ae - 1]) { be--; ae--; tail++; }
  const delCount = be - bs;
  const addCount = ae - as;
  if (delCount === 0 || addCount === 0) {
    _pushBlockReplaceOps(ops, delCount, addCount);
  } else {
    const myers = _diffMyersOps(before, bs, be, after, as, ae);
    if (myers) {
      for (let i = 0; i < myers.length; i++) ops.push(myers[i]);
    } else {
      const anchors = _uniqueAnchors(before, bs, be, after, as, ae);
      if (anchors.length === 0) {
        _pushBlockReplaceOps(ops, delCount, addCount);
      } else {
        let pb = bs;
        let pa = as;
        for (const anc of anchors) {
          _diffRangeOps(before, pb, anc.b, after, pa, anc.a, ops);
          ops.push('same');
          pb = anc.b + 1;
          pa = anc.a + 1;
        }
        _diffRangeOps(before, pb, be, after, pa, ae, ops);
      }
    }
  }
  for (let i = 0; i < tail; i++) ops.push('same');
}

export function diffLines(before, after) {
  const midOps = [];
  _diffRangeOps(before, 0, before.length, after, 0, after.length, midOps);

  const rows = [];
  const hunks = [];
  let bi = 0;
  let ai = 0;

  let i = 0;
  while (i < midOps.length) {
    if (midOps[i] === 'same') {
      rows.push({ kind: 'same', beforeIdx: bi++, afterIdx: ai++ });
      i++;
      continue;
    }
    // Contiguous changed run: emit all dels first, then all adds.
    let dels = 0;
    let adds = 0;
    while (i < midOps.length && midOps[i] !== 'same') {
      if (midOps[i] === 'del') dels++; else adds++;
      i++;
    }
    const startRow = rows.length;
    for (let j = 0; j < dels; j++) rows.push({ kind: 'del', beforeIdx: bi++, afterIdx: null });
    for (let j = 0; j < adds; j++) rows.push({ kind: 'add', beforeIdx: null, afterIdx: ai++ });
    hunks.push({ startRow, endRow: rows.length - 1 });
  }

  return { rows, hunks };
}

export function changedLineSets(rows) {
  const removedBefore = new Set();
  const addedAfter = new Set();
  for (const row of rows) {
    if (row.kind === 'del') removedBefore.add(row.beforeIdx);
    else if (row.kind === 'add') addedAfter.add(row.afterIdx);
  }
  return { removedBefore, addedAfter };
}

// layers sorted by startLine. Returns the number of the last layer whose
// startLine <= lineIndex (the first layer for lines before it), or null.
export function layerForLine(layers, lineIndex) {
  if (!layers || layers.length === 0) return null;
  let lo = 0;
  let hi = layers.length - 1;
  let found = 0;
  while (lo <= hi) {
    const midIdx = (lo + hi) >> 1;
    if (layers[midIdx].startLine <= lineIndex) { found = midIdx; lo = midIdx + 1; }
    else hi = midIdx - 1;
  }
  return layers[found].number;
}
