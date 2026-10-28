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

function _diffBlockReplaceOps(delCount, addCount) {
  return new Array(delCount).fill('del').concat(new Array(addCount).fill('add'));
}

export function diffLines(before, after) {
  const bLen = before.length;
  const aLen = after.length;
  let prefix = 0;
  while (prefix < bLen && prefix < aLen && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < bLen - prefix && suffix < aLen - prefix &&
         before[bLen - 1 - suffix] === after[aLen - 1 - suffix]) suffix++;

  const delCount = bLen - prefix - suffix;
  const addCount = aLen - prefix - suffix;
  let midOps;
  if (delCount === 0 || addCount === 0) {
    midOps = _diffBlockReplaceOps(delCount, addCount);
  } else {
    midOps = _diffMyersOps(before, prefix, bLen - suffix, after, prefix, aLen - suffix) ||
      _diffBlockReplaceOps(delCount, addCount);
  }

  const rows = [];
  const hunks = [];
  let bi = 0;
  let ai = 0;
  for (; bi < prefix; bi++, ai++) rows.push({ kind: 'same', beforeIdx: bi, afterIdx: ai });

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

  for (let s = 0; s < suffix; s++) rows.push({ kind: 'same', beforeIdx: bi++, afterIdx: ai++ });
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
