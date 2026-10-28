// Before/After export review: aligned, virtualized two-column diff of the
// original file vs. what export will write. Opened first on every export.

let originalLines = null;

const REVIEW_ROW_HEIGHT = 18;
const REVIEW_BUFFER_ROWS = 20;
const REVIEW_CONTEXT_ROWS = 3;
const REVIEW_MAX_CELL_CHARS = 400;

let reviewState = { rows: [], hunks: [], currentHunk: -1, beforeLines: [], afterLines: [] };
let reviewIsOpen = false;
let reviewRenderPending = false;

// Bright magenta: distinct from every motion-type color and from both theme backgrounds
const REVIEW_HIGHLIGHT_COLOR = [1.0, 0.1, 0.7];
const REVIEW_LARGE_FILE_LINES = 50000;

// 3D panes. Viewers are created once; parsers are replaced per open so a stale
// parse can never mutate the parser a live viewer is reading.
let reviewSession = 0;
let reviewSides = null;
let reviewBeforeCache = null; // { lines, parser } so reopening skips re-parsing the original

function reviewEl(id) {
  return document.getElementById(id);
}

function reviewCellHtml(kind, wantKind, idx, lines) {
  // wantKind is the kind that this side shows as changed ('del' left, 'add' right)
  if (idx === null || idx === undefined) return '<div class="review-cell review-filler"></div>';
  const cls = kind === wantKind ? ' review-' + kind : '';
  const text = lines[idx] || '';
  const shown = text.length > REVIEW_MAX_CELL_CHARS ? text.slice(0, REVIEW_MAX_CELL_CHARS) + '...' : text;
  return `<div class="review-cell${cls}"><span class="review-ln">${idx + 1}</span><span class="review-text">${syntaxHighlight(shown)}</span></div>`;
}

function reviewRenderRows() {
  reviewRenderPending = false;
  if (!reviewIsOpen) return;
  const list = reviewEl('reviewList');
  const body = reviewEl('reviewRows');
  const rows = reviewState.rows;
  const first = Math.max(0, Math.floor(list.scrollTop / REVIEW_ROW_HEIGHT) - REVIEW_BUFFER_ROWS);
  const last = Math.min(rows.length, Math.ceil((list.scrollTop + list.clientHeight) / REVIEW_ROW_HEIGHT) + REVIEW_BUFFER_ROWS);
  const parts = [];
  for (let i = first; i < last; i++) {
    const r = rows[i];
    parts.push('<div class="review-row">' +
      reviewCellHtml(r.kind, 'del', r.beforeIdx, reviewState.beforeLines) +
      reviewCellHtml(r.kind, 'add', r.afterIdx, reviewState.afterLines) +
      '</div>');
  }
  body.style.transform = `translateY(${first * REVIEW_ROW_HEIGHT}px)`;
  body.innerHTML = parts.join('');
}

function reviewScheduleRender() {
  if (reviewRenderPending) return;
  reviewRenderPending = true;
  requestAnimationFrame(reviewRenderRows);
}

function reviewUpdateHeader() {
  const total = reviewState.hunks.length;
  const counter = reviewEl('reviewCounter');
  counter.textContent = total === 0 ? 'No changes' : `Change ${reviewState.currentHunk + 1} of ${total}`;
  reviewEl('reviewPrevBtn').disabled = total === 0 || reviewState.currentHunk <= 0;
  reviewEl('reviewNextBtn').disabled = total === 0 || reviewState.currentHunk >= total - 1;
}

// ----- 3D panes -----

function reviewEnsureSides() {
  if (reviewSides) return reviewSides;
  const make = (suffix) => ({
    viewer: new GcodeViewer3D('reviewCanvas' + suffix, { parser: new GcodeParser(), review: true }),
    label: reviewEl('reviewLabel' + suffix),
    status: reviewEl('reviewStatus' + suffix),
    ready: false,
  });
  reviewSides = { before: make('Before'), after: make('After') };
  window.addEventListener('resize', () => {
    if (!reviewIsOpen) return;
    for (const side of [reviewSides.before, reviewSides.after]) {
      side.viewer.resize();
    }
    reviewRenderViews();
  });
  return reviewSides;
}

// First line of the hunk on one side; for a pure insertion/deletion, the adjacent
// unchanged row's index on that side so the layer is still correct for that file.
function reviewHunkLine(hunk, key) {
  const rows = reviewState.rows;
  for (let i = hunk.startRow; i <= hunk.endRow; i++) {
    if (rows[i][key] !== null) return rows[i][key];
  }
  for (const i of [hunk.startRow - 1, hunk.endRow + 1]) {
    if (i >= 0 && i < rows.length && rows[i].kind === 'same') return rows[i][key];
  }
  return null;
}

// Blank the canvas so a frame from an earlier review never shows under a new label
function reviewClearSide(side) {
  const gl = side.viewer.gl;
  if (!gl) return;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  gl.clearColor(isDark ? 0.067 : 0.878, isDark ? 0.071 : 0.882, isDark ? 0.078 : 0.894, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function reviewLastLayerNumber(p) {
  return p.layers.length ? p.layers[p.layers.length - 1].number : null;
}

function reviewRenderSide(side, lineIdx, fallbackLayer) {
  if (!side.ready) return;
  const p = side.viewer.parser;
  let layerNum = lineIdx === null ? null : layerForLine(p.layers, lineIdx);
  if (layerNum === null) layerNum = fallbackLayer;
  if (layerNum === null || p.layers.length === 0) {
    side.label.textContent = 'No layers';
    reviewClearSide(side);
    return;
  }
  const layer = p.getLayerByNumber(layerNum);
  side.label.textContent = `Layer ${layerNum}` + (layer && layer.zHeight ? ` (Z ${Number(layer.zHeight).toFixed(2)})` : '');
  side.viewer.maxVisibleLayer = layerNum;
  side.viewer.render(layerNum);
  return layerNum;
}

function reviewRenderViews() {
  if (!reviewIsOpen || !reviewSides) return;
  const { before, after } = reviewSides;
  const hunk = reviewState.hunks[reviewState.currentHunk];
  const beforeIdx = hunk ? reviewHunkLine(hunk, 'beforeIdx') : null;
  const afterIdx = hunk ? reviewHunkLine(hunk, 'afterIdx') : null;
  const bl = before.ready && beforeIdx !== null ? layerForLine(before.viewer.parser.layers, beforeIdx) : null;
  const al = after.ready && afterIdx !== null ? layerForLine(after.viewer.parser.layers, afterIdx) : null;
  if (!hunk) {
    // No changes: show the top of the finished part on each side
    reviewRenderSide(before, null, before.ready ? reviewLastLayerNumber(before.viewer.parser) : null);
    reviewRenderSide(after, null, after.ready ? reviewLastLayerNumber(after.viewer.parser) : null);
    return;
  }
  // With no line on a side at all, fall back to the other side's layer number
  reviewRenderSide(before, beforeIdx, al);
  reviewRenderSide(after, afterIdx, bl);
}

function reviewSideReady(side) {
  side.ready = true;
  side.status.textContent = '';
  side.viewer.resize();
  side.viewer.fitBounds();
  reviewRenderViews();
}

async function reviewParseSide(side, lines, session, highlightSet, cachedParser) {
  side.ready = false;
  side.label.textContent = '';
  side.viewer.clearBuffers();
  side.viewer.setHighlight(highlightSet, REVIEW_HIGHLIGHT_COLOR);
  // Empty placeholder until parsing finishes, so the viewer never caches half-parsed geometry
  side.viewer.parser = new GcodeParser();
  const p = cachedParser || new GcodeParser();
  if (!cachedParser) {
    const large = lines.length > REVIEW_LARGE_FILE_LINES;
    if (large) side.status.textContent = 'Parsing... 0%';
    try {
      await p.parseAsync(lines.join('\n'), 'review', pct => {
        if (large && session === reviewSession) side.status.textContent = `Parsing... ${(pct * 100).toFixed(0)}%`;
      });
    } catch (err) {
      console.error('Review parse failed:', err);
      if (session === reviewSession) side.status.textContent = '3D view unavailable';
      return null;
    }
  }
  if (session !== reviewSession || !reviewIsOpen) return null;
  side.viewer.parser = p;
  return p;
}

async function reviewStartViews(session, beforeLines, afterLines, sets) {
  const sides = reviewEnsureSides();
  for (const side of [sides.before, sides.after]) {
    side.viewer.resize();
    side.label.textContent = '';
    side.status.textContent = 'Parsing...';
    side.ready = false;
    reviewClearSide(side);
  }
  const cached = reviewBeforeCache && reviewBeforeCache.lines === beforeLines ? reviewBeforeCache.parser : null;
  // Sides are independent: a failure on one must not block or hide the other
  await Promise.all([
    reviewRunSide(sides.before, beforeLines, session, sets.removedBefore, cached, (p) => {
      if (!cached) reviewBeforeCache = { lines: beforeLines, parser: p };
    }),
    reviewRunSide(sides.after, afterLines, session, sets.addedAfter, null, null),
  ]);
}

async function reviewRunSide(side, lines, session, highlightSet, cachedParser, onParsed) {
  try {
    const p = await reviewParseSide(side, lines, session, highlightSet, cachedParser);
    if (!p) return; // stale session, or parse failure already reported
    if (onParsed) onParsed(p);
    reviewSideReady(side);
  } catch (err) {
    console.error('Review view failed:', err);
    if (session === reviewSession) side.status.textContent = '3D view unavailable';
  }
}

function reviewGoToHunk(index) {
  const total = reviewState.hunks.length;
  if (total === 0) return;
  reviewState.currentHunk = Math.max(0, Math.min(total - 1, index));
  const hunk = reviewState.hunks[reviewState.currentHunk];
  const list = reviewEl('reviewList');
  list.scrollTop = Math.max(0, (hunk.startRow - REVIEW_CONTEXT_ROWS) * REVIEW_ROW_HEIGHT);
  reviewUpdateHeader();
  reviewRenderRows();
  reviewRenderViews();
}

function openReview() {
  if (reviewIsOpen) return;
  if (!originalLines) {
    showToast('Load a valid G-code file before exporting', 'warning');
    return;
  }
  if (reparsing || loadInProgress) {
    showToast('Wait for the file to finish loading before exporting', 'warning');
    return;
  }
  const afterLines = modifier.applyAll(parser.lines, parser);
  const beforeLines = originalLines;
  const recoveryMod = modifier.modifications.find(m => m.type === 'recovery');
  const exportBaseName = parser.fileName.replace(/\.gcode$/i, '');
  const exportSuffix = recoveryMod ? `_recovery_L${recoveryMod.resumeLayer}` : '_modified';
  const { rows, hunks } = diffLines(beforeLines, afterLines);
  reviewState = { rows, hunks, currentHunk: hunks.length ? 0 : -1, beforeLines, afterLines, exportBaseName, exportSuffix };
  reviewIsOpen = true;

  reviewEl('reviewOverlay').classList.add('active');
  reviewEl('reviewSpacer').style.height = (rows.length * REVIEW_ROW_HEIGHT) + 'px';
  reviewEl('reviewList').scrollTop = 0;
  reviewUpdateHeader();
  reviewRenderRows();
  if (hunks.length) reviewGoToHunk(0);
  reviewEl('reviewContinueBtn').focus();
  reviewStartViews(++reviewSession, beforeLines, afterLines, changedLineSets(rows));
}

function closeReview() {
  if (!reviewIsOpen) return;
  reviewIsOpen = false;
  reviewSession++; // invalidate any parse still running
  if (reviewSides) {
    for (const side of [reviewSides.before, reviewSides.after]) {
      side.ready = false;
      side.label.textContent = '';
      side.status.textContent = '';
      side.viewer.parser = new GcodeParser();
      side.viewer.setHighlight(null);
    }
  }
  reviewEl('reviewOverlay').classList.remove('active');
  reviewEl('reviewRows').innerHTML = '';
  reviewState = { rows: [], hunks: [], currentHunk: -1, beforeLines: [], afterLines: [] };
}

function reviewNext() {
  if (reviewIsOpen) reviewGoToHunk(reviewState.currentHunk + 1);
}

function reviewPrev() {
  if (reviewIsOpen) reviewGoToHunk(reviewState.currentHunk - 1);
}

function continueExport() {
  if (!reviewIsOpen) return;
  const { afterLines, exportBaseName, exportSuffix } = reviewState;
  closeReview();
  performExport(afterLines, exportBaseName, exportSuffix);
}

// ----- Keyboard -----

const REVIEW_BUTTON_IDS = ['reviewPrevBtn', 'reviewNextBtn', 'reviewBackBtn', 'reviewContinueBtn'];
const REVIEW_KEY_SCROLL_ROWS = 3;

function reviewTrapTab(e) {
  const buttons = REVIEW_BUTTON_IDS.map(reviewEl).filter(b => b && !b.disabled);
  if (buttons.length === 0) return;
  const at = buttons.indexOf(document.activeElement);
  let next;
  if (at === -1) next = e.shiftKey ? buttons.length - 1 : 0;
  else next = (at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
  buttons[next].focus();
}

function reviewScrollListByKey(key) {
  const list = reviewEl('reviewList');
  const page = Math.max(REVIEW_ROW_HEIGHT, list.clientHeight - 2 * REVIEW_ROW_HEIGHT);
  const step = REVIEW_ROW_HEIGHT * REVIEW_KEY_SCROLL_ROWS;
  if (key === 'ArrowUp') list.scrollTop -= step;
  else if (key === 'ArrowDown') list.scrollTop += step;
  else if (key === 'PageUp') list.scrollTop -= page;
  else if (key === 'PageDown') list.scrollTop += page;
  else if (key === 'Home') list.scrollTop = 0;
  else if (key === 'End') list.scrollTop = list.scrollHeight;
}

// Key handling while the review is open. Only review navigation works; every
// other key is cancelled so nothing can change the file under review.
function reviewHandleKey(e) {
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'Escape') { e.preventDefault(); closeReview(); return; }
  if (e.key === 'Tab') { e.preventDefault(); reviewTrapTab(e); return; }
  if (mod && !e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'a' || e.key === 'A')) return;
  if ((e.key === 'Enter' || e.key === ' ') && !mod && !e.altKey) {
    const t = e.target;
    if (t && t.tagName === 'BUTTON' && t.closest && t.closest('#reviewOverlay')) return; // native activation
  }
  if (!mod && !e.altKey && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
    reviewScrollListByKey(e.key);
  }
  e.preventDefault();
}
