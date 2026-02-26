// UI rendering and interaction functions.
// References globals (parser, modifier, viewer, selectedLayer, etc.) from app.js.
// In the built single-file output, everything shares one script scope.

function onFirmwareChange(fw) {
  currentFirmware = fw;
  const profile = FIRMWARE[fw];

  // Update pause radio buttons (main pause tab)
  renderRadioGroup('pauseTypeGroup', 'pauseType', profile.pause);
  document.getElementById('pauseHint').textContent = profile.pauseHint;

  // Update insert pause radio buttons
  renderRadioGroup('insertPauseTypeGroup', 'insertPauseType', profile.pause);

  // Update filament command dropdown
  const filamentCmd = document.getElementById('filamentCmd');
  filamentCmd.innerHTML = profile.filament.map(f =>
    `<option value="${f.value}"${f.default ? ' selected' : ''}>${f.label}</option>`
  ).join('');
  document.getElementById('filamentHint').textContent = profile.filamentHint;

  // Show/hide AMS slot selector
  document.getElementById('filamentSlotGroup').style.display = profile.hasAMS ? '' : 'none';

  // Update eject hint
  document.getElementById('ejectHint').textContent = profile.ejectHint;

  // Update reference tab if rendered
  if (document.getElementById('refContent').children.length > 0) renderReference();
}

function renderRadioGroup(containerId, radioName, options) {
  const container = document.getElementById(containerId);
  container.innerHTML = options.map((opt, i) => {
    const id = `${radioName}_${i}`;
    return `<div class="radio-opt"><input type="radio" name="${radioName}" id="${id}" value="${opt.value}"${opt.default ? ' checked' : ''}><label for="${id}">${opt.label}</label></div>`;
  }).join('');
}

function toggleMeasureMode() {
  measureMode = !measureMode;
  // Mutual exclusion with pause select mode
  if (measureMode && pauseSelectMode) {
    pauseSelectMode = false;
    selectedMove = null;
    document.getElementById('pauseSelectToggle').classList.remove('active');
  }
  if (measureMode && editMode) {
    editMode = false;
    editSelectedMove = null;
    editHoveredMove = null;
    document.getElementById('editModeToggle').classList.remove('active');
    document.getElementById('editModeBanner').classList.remove('visible');
    hideEditInfoPanel();
  }
  measurePoints = [];
  document.getElementById('measureToggle').classList.toggle('active', measureMode);
  document.getElementById('viewerCanvas').style.cursor = measureMode ? 'crosshair' : '';
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function togglePauseSelectMode() {
  pauseSelectMode = !pauseSelectMode;
  selectedMove = null;
  hoveredMove = null;
  document.getElementById('pauseSelectToggle').classList.toggle('active', pauseSelectMode);
  document.getElementById('colorPickerRow').classList.toggle('visible', pauseSelectMode);
  document.getElementById('viewerCanvas').style.cursor = pauseSelectMode ? 'crosshair' : '';

  // Mutual exclusion with measure mode
  if (pauseSelectMode && measureMode) {
    measureMode = false;
    measurePoints = [];
    document.getElementById('measureToggle').classList.remove('active');
  }
  if (pauseSelectMode && editMode) {
    editMode = false;
    editSelectedMove = null;
    editHoveredMove = null;
    document.getElementById('editModeToggle').classList.remove('active');
    document.getElementById('editModeBanner').classList.remove('visible');
    hideEditInfoPanel();
  }

  // Auto-switch to visual view and pause tab
  if (pauseSelectMode) {
    if (currentView !== 'visual') setView('visual');
    const activeTab = document.querySelector('.tab.active')?.dataset.tab;
    if (activeTab !== 'pause') switchTab('pause');
  }

  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function toggleEditMode() {
  editMode = !editMode;
  editSelectedMove = null;
  editHoveredMove = null;
  document.getElementById('editModeToggle').classList.toggle('active', editMode);
  document.getElementById('editModeBanner').classList.toggle('visible', editMode);
  document.getElementById('viewerCanvas').style.cursor = editMode ? 'crosshair' : '';

  // Mutual exclusion
  if (editMode) {
    if (measureMode) {
      measureMode = false;
      measurePoints = [];
      document.getElementById('measureToggle').classList.remove('active');
    }
    if (pauseSelectMode) {
      pauseSelectMode = false;
      selectedMove = null;
      document.getElementById('pauseSelectToggle').classList.remove('active');
      document.getElementById('colorPickerRow').classList.remove('visible');
    }
    if (currentView !== 'visual') setView('visual');
  }

  // Hide info panel when deactivating
  hideEditInfoPanel();

  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function showEditInfoPanel(move) {
  const panel = document.getElementById('editInfoPanel');
  const lineText = document.getElementById('editLineText');
  const lineMeta = document.getElementById('editLineMeta');
  const rawLine = parser.lines[move.lineIndex] || '';
  const typeLabel = MOTION_TYPE_LABELS[move.type] || move.type;

  lineText.textContent = rawLine.trim();
  lineMeta.textContent = `Line ${move.lineIndex + 1} \u00b7 ${typeLabel} \u00b7 ${move.extrude ? 'Extrusion' : 'Travel'}`;
  panel.classList.add('visible');
}

function hideEditInfoPanel() {
  const panel = document.getElementById('editInfoPanel');
  if (panel) panel.classList.remove('visible');
}

function cancelEditSelection() {
  editSelectedMove = null;
  hideEditInfoPanel();
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

async function deleteSelectedMove() {
  if (!editSelectedMove) return;
  const lineIdx = editSelectedMove.lineIndex;
  const lineContent = parser.lines[lineIdx];

  // Compute E-value repairs before removing the line
  const repairs = computeERepair(parser.lines, lineIdx);

  // Push undo entry
  pushEditUndo({
    type: 'line-delete',
    layer: selectedLayer,
    lineIndex: lineIdx,
    lineContent: lineContent,
    eRepairs: repairs,
  });

  // Apply E-value repairs
  for (const r of repairs) {
    parser.lines[r.lineIndex] = r.patched;
  }

  // Remove the line
  parser.lines.splice(lineIdx, 1);

  // Clear selection
  const layerNum = selectedLayer;
  editSelectedMove = null;
  editHoveredMove = null;
  hideEditInfoPanel();

  // Re-parse and re-render
  await reparseAndRender(layerNum, `Deleted line ${lineIdx + 1}`);
}

function pushEditUndo(entry) {
  editUndoStack.entries = editUndoStack.entries.slice(0, editUndoStack.index + 1);
  editUndoStack.entries.push(entry);
  if (editUndoStack.entries.length > editUndoStack.maxSize) editUndoStack.entries.shift();
  editUndoStack.index = editUndoStack.entries.length - 1;
}

function getActiveEditDeletions() {
  return editUndoStack.entries
    .slice(0, editUndoStack.index + 1)
    .filter(e => e.type === 'line-delete');
}

async function performEditUndo() {
  if (editUndoStack.index < 0) return false;
  const entry = editUndoStack.entries[editUndoStack.index];
  editUndoStack.index--;

  if (entry.type === 'line-delete') {
    // Revert E-repairs (in reverse order)
    for (let i = entry.eRepairs.length - 1; i >= 0; i--) {
      const r = entry.eRepairs[i];
      // Adjust index: line was removed, so repairs were at shifted indices
      const adjustedIdx = r.lineIndex > entry.lineIndex ? r.lineIndex - 1 : r.lineIndex;
      parser.lines[adjustedIdx] = r.original;
    }
    // Re-insert the deleted line
    parser.lines.splice(entry.lineIndex, 0, entry.lineContent);

    editSelectedMove = null;
    editHoveredMove = null;
    hideEditInfoPanel();
    await reparseAndRender(selectedLayer, 'Undo: restored deleted line');
  }
  return true;
}

async function performEditRedo() {
  if (editUndoStack.index >= editUndoStack.entries.length - 1) return false;
  editUndoStack.index++;
  const entry = editUndoStack.entries[editUndoStack.index];

  if (entry.type === 'line-delete') {
    // Re-apply E-repairs
    for (const r of entry.eRepairs) {
      parser.lines[r.lineIndex] = r.patched;
    }
    // Re-delete the line
    parser.lines.splice(entry.lineIndex, 1);

    editSelectedMove = null;
    editHoveredMove = null;
    hideEditInfoPanel();
    await reparseAndRender(selectedLayer, 'Redo: deleted line again');
  }
  return true;
}

async function reparseAndRender(targetLayer, toastMsg) {
  reparsing = true;
  try {
    const text = parser.lines.join('\n');
    await parser.parseAsync(text, parser.fileName);
    initMotionTypeState();
    viewer.clearBuffers();
    buildSections();
    renderLayerList();
    updateSlider();

    // Try to stay on the same layer
    const layer = parser.getLayerByNumber(targetLayer);
    if (layer) {
      selectLayer(targetLayer);
    } else if (parser.layers.length > 0) {
      selectLayer(parser.layers[parser.layers.length - 1].number);
    }

    if (currentView === 'visual') {
      viewer.render(viewer.currentLayer);
    }

    renderModsList();
    if (toastMsg) showToast(toastMsg, 'success');
  } finally {
    reparsing = false;
  }
}

function setHighlightColor(hex) {
  hex = hex.toLowerCase();
  highlightColor = hex;
  localStorage.setItem('gcode_highlight_color', hex);
  // Update swatch active states
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === hex);
  });
  document.getElementById('customColorInput').value = hex;
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function renderMotionLegend() {
  const container = document.getElementById('viewerLegend');
  if (!container) return;

  // Only show when file is loaded
  if (!parser.layers || parser.layers.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  const isHeatmap = colorMode !== 'motion-type';
  const collapseIcon = motionLegendExpanded ? '\u25BC' : '\u25B6';

  // Color mode dropdown
  const modeOptions = [
    ['motion-type', 'Motion Type'],
    ['speed', 'Speed (mm/s)'],
    ['acceleration', 'Acceleration (mm/s\u00B2)'],
    ['flow', 'Flow Rate (mm\u00B3/s)'],
  ];
  const modeSelect = modeOptions.map(([val, label]) =>
    `<option value="${val}"${colorMode === val ? ' selected' : ''}>${label}</option>`
  ).join('');

  let html = `<div class="legend-header" onclick="toggleMotionLegend()">
    <span class="legend-title">Color</span>
    <select onclick="event.stopPropagation()" onchange="event.stopPropagation(); setColorMode(this.value)" class="legend-mode-select">${modeSelect}</select>
    <span style="font-size:9px">${collapseIcon}</span>
  </div>`;

  html += `<div class="legend-body${motionLegendExpanded ? '' : ' collapsed'}">`;

  if (isHeatmap) {
    // Gradient bar + per-layer stats
    const layerNum = selectedLayer !== null ? selectedLayer : (viewer.currentLayer || 0);
    const stats = getHeatmapLayerStats(layerNum);
    const unitLabel = colorMode === 'speed' ? 'mm/s' : colorMode === 'acceleration' ? 'mm/s\u00B2' : 'mm\u00B3/s';

    html += `<div class="heatmap-gradient">
      <div class="heatmap-bar"></div>
      <div class="heatmap-labels">
        <span>${stats.min.toFixed(1)}</span>
        <span>${unitLabel}</span>
        <span>${stats.max.toFixed(1)}</span>
      </div>
    </div>`;
    html += `<div class="heatmap-stats">
      <div>Min: <strong>${stats.min.toFixed(1)}</strong> ${unitLabel}</div>
      <div>Avg: <strong>${stats.avg.toFixed(1)}</strong> ${unitLabel}</div>
      <div>Max: <strong>${stats.max.toFixed(1)}</strong> ${unitLabel}</div>
    </div>`;
  } else {
    // Motion type rows
    const allTypes = [...new Set([...Object.keys(DEFAULT_MOTION_COLORS), ...detectedTypes])];
    const typesToShow = motionLegendShowAll
      ? allTypes
      : allTypes.filter(t => detectedTypes.has(t));

    for (const type of typesToShow) {
      const checked = motionTypeVisibility[type] !== false ? 'checked' : '';
      const color = motionTypeColors[type] || '#e0e2e8';
      const label = MOTION_TYPE_LABELS[type] || type;
      html += `<div class="legend-row">
        <input type="checkbox" ${checked} onchange="toggleMotionType('${type}', this.checked)">
        <input type="color" value="${color}" onchange="setMotionTypeColor('${type}', this.value)">
        <label onclick="this.parentElement.querySelector('input[type=checkbox]').click()">${label}</label>
      </div>`;
    }
  }

  html += '</div>';

  // Show all / detected only toggle (only in motion-type mode)
  if (!isHeatmap && detectedTypes.size > 0) {
    const toggleText = motionLegendShowAll ? 'Show detected only' : 'Show all types\u2026';
    html += `<div class="legend-show-all" onclick="toggleMotionLegendShowAll()">${toggleText}</div>`;
  }

  container.innerHTML = html;
}

function toggleMotionLegend() {
  motionLegendExpanded = !motionLegendExpanded;
  renderMotionLegend();
}

function toggleMotionLegendShowAll() {
  motionLegendShowAll = !motionLegendShowAll;
  renderMotionLegend();
}

function toggleMotionType(type, visible) {
  motionTypeVisibility[type] = visible;
  saveMotionTypeState();
  resetSimulation();
  viewer.clearBuffers();
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function setMotionTypeColor(type, hex) {
  motionTypeColors[type] = hex.toLowerCase();
  saveMotionTypeState();
  resetSimulation();
  viewer.clearBuffers();
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

// Sync color picker UI with stored preference on load
document.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('gcode_highlight_color') || '#ff3333';
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === stored);
  });
  document.getElementById('customColorInput').value = stored;
});

// ===== ONBOARDING HINTS =====
function showOnboardHint(key, targetId, text) {
  if (onboardState[key]) return;
  const target = document.getElementById(targetId);
  if (!target) return;
  const hint = document.createElement('div');
  hint.className = 'onboard-hint below';
  hint.textContent = text;
  const dismiss = () => {
    hint.style.transition = 'opacity .3s';
    hint.style.opacity = '0';
    setTimeout(() => hint.remove(), 300);
    onboardState[key] = true;
    localStorage.setItem('gcode_onboard', JSON.stringify(onboardState));
  };
  hint.onclick = dismiss;
  target.style.position = 'relative';
  target.appendChild(hint);
  setTimeout(dismiss, 5000);
}

function loadFile(file) {
  const isBgcode = file.name.toLowerCase().endsWith('.bgcode');
  const reader = new FileReader();
  reader.onload = async (e) => {
    let text;
    if (isBgcode) {
      try {
        text = await decodeBgcode(e.target.result);
      } catch (err) {
        document.getElementById('parseProgress').style.display = 'none';
        document.getElementById('gcodePreview').innerHTML =
          `<div class="empty-state"><p style="color:var(--red)">Failed to decode bgcode file: ${err.message}</p></div>`;
        return;
      }
    } else {
      text = e.target.result;
    }

    const progressEl = document.getElementById('parseProgress');
    const barEl = document.getElementById('parseBar');
    const labelEl = document.getElementById('parseLabel');
    const lineCount = (text.match(/\n/g) || []).length;

    if (lineCount > 50000) {
      progressEl.style.display = '';
      labelEl.textContent = 'Parsing...';
      barEl.style.width = '0%';
    }

    await parser.parseAsync(text, file.name, pct => {
      barEl.style.width = (pct * 100).toFixed(0) + '%';
      labelEl.textContent = `Parsing... ${(pct * 100).toFixed(0)}%`;
    });

    progressEl.style.display = 'none';

    if (parser.layers.length === 0) {
      document.getElementById('gcodePreview').innerHTML =
        '<div class="empty-state"><p style="color:var(--red)">No layers detected in this file. It may not be a valid G-code file, or the slicer format is not yet supported.</p></div>';
      document.getElementById('parseProgress').style.display = 'none';
      return;
    }
    if (parser.skippedLines > 0) {
      showToast(parser.skippedLines + ' lines skipped during parsing', 'warning');
    }

    holeDetector.clearCache();
    viewer.clearBuffers();
    insertManager.clear();
    modifier.modifications = [];
    undoStack.push(modifier.modifications);
    holeDetectMode = false;
    document.getElementById('holeDetectToggle').classList.remove('active');
    document.getElementById('viewerCanvas').classList.remove('hole-mode');
    pauseSelectMode = false;
    selectedMove = null;
    hoveredMove = null;
    document.getElementById('pauseSelectToggle').classList.remove('active');
    document.getElementById('viewerCanvas').style.cursor = '';

    // Update UI
    document.getElementById('fileName').textContent = file.name;
    const slicerName = parser.slicerType !== 'unknown' ? ` · ${parser.slicerType}` : '';
    document.getElementById('fileMeta').textContent =
      `${parser.layers.length} layers  ·  ${parser.lines.length.toLocaleString()} lines${slicerName}`;
    document.getElementById('fileInfo').style.display = 'inline';
    document.getElementById('exportBtn').style.display = 'inline-flex';
    dropZone.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg><span>Replace file</span>`;

    renderLayerList();
    // Setup viewer
    viewer.resize();
    viewer.fitBounds();
    updateSlider();
    buildSections();
    initMotionTypeState();
    renderMotionLegend();
    if (parser.layers.length > 0) selectLayer(parser.layers[0].number);
    else renderFullPreview();

    showOnboardHint('visual', 'viewVisualBtn', 'Try the 3D Visual view');
  };
  if (isBgcode) reader.readAsArrayBuffer(file);
  else reader.readAsText(file);
}

// ===== LAYER LIST =====
function getModdedLayers() {
  const moddedLayers = new Set(modifier.modifications.filter(m => m.layer !== Infinity && m.layer !== 'end' && m.type !== 'zoffset').map(m => m.layer));
  for (const mod of modifier.modifications.filter(m => m.type === 'zoffset')) {
    for (const layer of parser.layers) {
      if (layer.number >= mod.layer && (mod.endLayer == null || layer.number <= mod.endLayer)) {
        moddedLayers.add(layer.number);
      }
    }
  }
  // Include layers with active edit deletions
  for (const del of getActiveEditDeletions()) {
    moddedLayers.add(del.layer);
  }
  return moddedLayers;
}

function renderLayerList() {
  const container = document.getElementById('layerList');
  const moddedLayers = getModdedLayers();

  if (parser.layers.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No layers detected in this file</p></div>';
    return;
  }

  let html = '';
  for (const layer of parser.layers) {
    const active = selectedLayer === layer.number ? ' active' : '';
    const hasMod = moddedLayers.has(layer.number);
    html += `<div class="layer-item${active}" data-layer="${layer.number}" onclick="selectLayer(${layer.number})">
      ${hasMod ? '<div class="layer-mod-badge"></div>' : ''}
      <span class="layer-num">${layer.number}</span>
      <span class="layer-z">${layer.zHeight !== null ? 'Z' + layer.zHeight.toFixed(2) : ''}</span>
      <span class="layer-lines">${layer.lineCount} ln</span>
    </div>`;
  }
  container.innerHTML = html;
}

function filterLayers(query) {
  const items = document.querySelectorAll('.layer-item');
  const q = query.trim().toLowerCase();
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
}

function selectLayer(num) {
  selectedLineNumber = null;
  selectedMove = null;
  hoveredMove = null;
  selectedLayer = num;
  renderLayerList();
  updateSectionForLayer(num);
  updateSlider();

  // Reset simulation on layer change
  resetSimulation();

  // Update heatmap stats for new layer
  if (colorMode !== 'motion-type') renderMotionLegend();

  // Update visual viewer if active
  if (currentView === 'visual') {
    viewer.maxVisibleLayer = num;
    viewer.render(num);
    updateViewerOverlay(num);
    showSimControls();
  }

  // Fill layer number into active tab's layer input
  const activeTab = document.querySelector('.tab.active')?.dataset.tab;
  if (activeTab === 'pause') document.getElementById('pauseLayer').value = num;
  else if (activeTab === 'filament') document.getElementById('filamentLayer').value = num;
  else if (activeTab === 'zoffset') document.getElementById('zoffsetLayer').value = num;
  else if (activeTab === 'recovery') { document.getElementById('recoveryLayer').value = num; syncRecoveryFromLayer(); }

  // Update hole list if holes were detected
  if (holeDetector.scannedHoles.length > 0 || holeDetector.holes.has(num)) {
    renderHoleList();
  }
}

function jumpToLayer(num) {
  const layer = parser.getLayerByNumber(num);
  if (layer) selectLayer(num);
}

// ===== SECTION-BASED PREVIEW =====
let sectionStates = []; // tracks {type, startLine, endLine, expanded, layerNum, zHeight, lineCount}
let currentExpandedLayer = null;

// ===== SEARCH =====
let searchMatches = [];
let currentMatchIdx = -1;
let searchQuery = '';
let searchDebounceTimer = null;
const SEARCH_MAX_MATCHES = 10000;
const SEARCH_LIVE_THRESHOLD = 50000;

let selectedLineNumber = null;

function executeSearch(query) {
  searchQuery = query;
  searchMatches = [];
  currentMatchIdx = -1;

  if (!query) {
    updateSearchCount();
    renderSectionPreview();
    return;
  }

  const q = query.toLowerCase();
  for (let i = 0; i < parser.lines.length && searchMatches.length < SEARCH_MAX_MATCHES; i++) {
    if (parser.lines[i].toLowerCase().includes(q)) {
      let sectionIdx = -1;
      for (let s = 0; s < sectionStates.length; s++) {
        if (i >= sectionStates[s].startLine && i <= sectionStates[s].endLine) {
          sectionIdx = s;
          break;
        }
      }
      searchMatches.push({ lineNum: i, sectionIdx });
    }
  }

  if (searchMatches.length > 0) {
    currentMatchIdx = 0;
    navigateToMatch(0);
  } else {
    updateSearchCount();
    renderSectionPreview();
  }
}

function navigateToMatch(idx) {
  if (searchMatches.length === 0) return;
  currentMatchIdx = ((idx % searchMatches.length) + searchMatches.length) % searchMatches.length;
  const match = searchMatches[currentMatchIdx];

  for (let s = 0; s < sectionStates.length; s++) {
    const sec = sectionStates[s];
    if (s === match.sectionIdx) {
      sec.expanded = true;
    } else if (sec.type === 'layer' && sec.expanded && sec.layerNum !== selectedLayer) {
      sec.expanded = false;
    }
  }

  updateSearchCount();
  renderSectionPreview();

  requestAnimationFrame(() => {
    const row = document.querySelector(`tr[data-line="${match.lineNum}"]`);
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });
}

function nextMatch() {
  if (searchMatches.length === 0) return;
  navigateToMatch(currentMatchIdx + 1);
}

function prevMatch() {
  if (searchMatches.length === 0) return;
  navigateToMatch(currentMatchIdx - 1);
}

function showSearchBar() {
  const bar = document.getElementById('searchBar');
  if (!bar) return;
  bar.classList.remove('hidden');
  const input = bar.querySelector('input');
  if (input) {
    input.focus();
    input.select();
  }
}

function hideSearchBar() {
  const bar = document.getElementById('searchBar');
  if (!bar) return;
  bar.classList.add('hidden');

  searchQuery = '';
  searchMatches = [];
  currentMatchIdx = -1;
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

  renderSectionPreview();
}

function updateSearchCount() {
  const el = document.getElementById('searchCount');
  if (!el) return;

  if (!searchQuery) {
    el.textContent = '';
  } else if (searchMatches.length === 0) {
    el.textContent = 'No matches';
  } else if (searchMatches.length >= SEARCH_MAX_MATCHES) {
    el.textContent = `${currentMatchIdx + 1} of ${SEARCH_MAX_MATCHES}+`;
  } else {
    el.textContent = `${currentMatchIdx + 1} of ${searchMatches.length}`;
  }
}

function onSearchInput(value) {
  if (parser.lines.length >= SEARCH_LIVE_THRESHOLD) {
    const el = document.getElementById('searchCount');
    if (el && value) el.textContent = 'Press Enter';
    return;
  }
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => executeSearch(value), 300);
}

function onSearchKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    hideSearchBar();
  } else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (searchMatches.length > 0 && searchQuery === e.target.value) {
      nextMatch();
    } else {
      executeSearch(e.target.value);
    }
  } else if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault();
    prevMatch();
  }
}

function buildSections() {
  sectionStates = [];
  if (parser.lines.length === 0) return;

  const firstLayer = parser.layers.length > 0 ? parser.layers[0] : null;
  const headerEndLine = firstLayer ? firstLayer.startLine - 1 : parser.lines.length - 1;

  // Header section (everything before first layer)
  if (headerEndLine >= 0) {
    sectionStates.push({
      type: 'header',
      startLine: 0,
      endLine: headerEndLine,
      expanded: true,
      lineCount: headerEndLine + 1
    });
  }

  // Layer sections + gap sections between layers
  for (let i = 0; i < parser.layers.length; i++) {
    const layer = parser.layers[i];
    const prevEnd = i === 0 ? headerEndLine : parser.layers[i - 1].endLine;

    // Gap between previous section and this layer
    if (layer.startLine > prevEnd + 1) {
      sectionStates.push({
        type: 'gap',
        startLine: prevEnd + 1,
        endLine: layer.startLine - 1,
        expanded: false,
        lineCount: layer.startLine - 1 - prevEnd
      });
    }

    // Layer section
    sectionStates.push({
      type: 'layer',
      startLine: layer.startLine,
      endLine: layer.endLine,
      expanded: i === 0,
      layerNum: layer.number,
      zHeight: layer.zHeight,
      lineCount: layer.lineCount
    });
  }

  // Trailing lines after the last layer
  const lastLayer = parser.layers[parser.layers.length - 1];
  if (lastLayer && lastLayer.endLine < parser.lines.length - 1) {
    sectionStates.push({
      type: 'gap',
      startLine: lastLayer.endLine + 1,
      endLine: parser.lines.length - 1,
      expanded: false,
      lineCount: parser.lines.length - 1 - lastLayer.endLine
    });
  }

  currentExpandedLayer = parser.layers.length > 0 ? parser.layers[0].number : null;
}

function renderSectionPreview() {
  const container = document.getElementById('gcodePreview');
  const previewEmpty = document.getElementById('previewEmpty');
  if (previewEmpty) previewEmpty.remove();

  if (sectionStates.length === 0) return;

  let html = `<div class="search-bar hidden" id="searchBar">` +
    `<input type="text" placeholder="Find in file..." value="${searchQuery.replace(/"/g, '&quot;')}" oninput="onSearchInput(this.value)" onkeydown="onSearchKeydown(event)">` +
    `<span class="search-count" id="searchCount"></span>` +
    `<button onclick="prevMatch()" title="Previous (Shift+Enter)">&#9650;</button>` +
    `<button onclick="nextMatch()" title="Next (Enter)">&#9660;</button>` +
    `<button onclick="hideSearchBar()" title="Close (Esc)">&times;</button>` +
    `</div>`;
  for (let idx = 0; idx < sectionStates.length; idx++) {
    const section = sectionStates[idx];
    const stateClass = section.expanded ? 'expanded' : 'collapsed';
    const isActiveLayer = section.type === 'layer' && section.layerNum === selectedLayer;

    html += `<div class="gcode-section ${stateClass}" data-section="${idx}">`;
    html += renderSectionHeader(section, idx, isActiveLayer);

    if (section.expanded) {
      html += `<div class="gcode-section-lines" id="sectionLines_${idx}">`;
      html += renderSectionLines(section, idx);
      html += '</div>';
    } else {
      html += renderSectionPreviewLines(section);
    }

    html += '</div>';
  }

  container.innerHTML = html;

  // Chunked rendering for large expanded sections
  for (let idx = 0; idx < sectionStates.length; idx++) {
    const section = sectionStates[idx];
    if (section.expanded && section.lineCount > 200) {
      scheduleChunkedRender(section, idx);
    }
  }

  // Restore search bar visibility and refocus if search is active
  if (searchQuery) {
    const bar = document.getElementById('searchBar');
    if (bar) {
      bar.classList.remove('hidden');
      const input = bar.querySelector('input');
      if (input) {
        input.focus();
        // Place cursor at end of input
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }
    updateSearchCount();
  }

  // Scroll to selected layer section
  scrollToActiveSection();
}

function selectLineForPause(lineIdx, sectionIdx) {
  const section = sectionStates[sectionIdx];
  if (!section || section.type !== 'layer') return;

  // Toggle: clicking same line deselects
  if (selectedLineNumber === lineIdx) {
    selectedLineNumber = null;
    document.getElementById('pauseLineNumber').value = '';
  } else {
    selectedLineNumber = lineIdx;
    // Auto-populate pause tab fields
    document.getElementById('pauseLayer').value = section.layerNum;
    document.getElementById('pauseLineNumber').value = lineIdx + 1; // 1-based display
    // Switch to pause tab if not active
    const activeTab = document.querySelector('.tab.active')?.dataset.tab;
    if (activeTab !== 'pause') switchTab('pause');
  }

  // Update visual selection
  document.querySelectorAll('.code-table tr.line-selected').forEach(el => el.classList.remove('line-selected'));
  if (selectedLineNumber !== null) {
    const row = document.querySelector(`tr[data-line="${selectedLineNumber}"]`);
    if (row) row.classList.add('line-selected');
  }
}

function renderSectionHeader(section, idx, isActive) {
  let label = '';
  let meta = '';

  if (section.type === 'header') {
    label = 'Header / Preamble';
    meta = `${section.lineCount} lines`;
  } else if (section.type === 'layer') {
    label = `Layer ${section.layerNum}`;
    meta = `Z${section.zHeight?.toFixed(2) || '?'}mm &middot; ${section.lineCount} lines`;
  } else {
    label = 'Inter-layer';
    meta = `${section.lineCount} lines`;
  }

  const activeClass = isActive ? ' active' : '';
  return `<div class="gcode-section-header${activeClass}" onclick="toggleSection(${idx})">` +
    `<span class="section-chevron">&#9660;</span>` +
    `<span class="section-label">${label}</span>` +
    `<span class="section-meta">${meta}</span>` +
    `</div>`;
}

function renderSectionPreviewLines(section) {
  const previewCount = Math.min(3, section.lineCount);
  let html = '<div class="gcode-section-preview"><table class="code-table"><tbody>';
  for (let i = 0; i < previewCount; i++) {
    const lineIdx = section.startLine + i;
    if (lineIdx > section.endLine) break;
    html += `<tr><td class="ln">${lineIdx + 1}</td><td>${syntaxHighlight(parser.lines[lineIdx])}</td></tr>`;
  }
  html += '</tbody></table></div>';
  return html;
}

function renderSectionLines(section, sectionIdx) {
  const renderEnd = Math.min(section.startLine + 200, section.endLine + 1);
  const isSelectedLayer = section.type === 'layer' && section.layerNum === selectedLayer;

  // Collect mid-layer pauses for this section
  const midLayerMods = isSelectedLayer
    ? modifier.modifications.filter(m => m.type === 'pause' && m.lineNumber != null && m.layer === section.layerNum)
    : [];

  let html = '<table class="code-table"><tbody>';
  for (let i = section.startLine; i < renderEnd; i++) {
    // Render mid-layer pause snippets before their target line
    for (const mlMod of midLayerMods) {
      if (mlMod.lineNumber === i) {
        const snippet = modifier.getSnippet(mlMod);
        for (const line of snippet) {
          html += `<tr class="mod-line-midlayer"><td class="ln">+</td><td>${syntaxHighlight(line)}</td></tr>`;
        }
      }
    }
    const raw = parser.lines[i];
    const isLayerStart = raw.trim().match(/^;LAYER:\d+/i);
    const classes = [];
    if (isLayerStart) classes.push('layer-start');
    if (isSelectedLayer) classes.push('highlight');
    const isSearchActive = searchQuery && searchMatches.length > 0 && currentMatchIdx >= 0 && searchMatches[currentMatchIdx].lineNum === i;
    if (isSearchActive) classes.push('search-active');
    const lineContent = searchQuery ? highlightSearchMatch(syntaxHighlight(raw), searchQuery) : syntaxHighlight(raw);
    const clickHandler = section.type === 'layer' ? ` onclick="selectLineForPause(${i}, ${sectionIdx})"` : '';
    const selectedClass = (selectedLineNumber === i) ? ' line-selected' : '';
    html += `<tr class="${classes.join(' ')}${selectedClass}" data-line="${i}"${clickHandler}><td class="ln">${i + 1}</td><td>${lineContent}</td></tr>`;
  }
  html += '</tbody></table>';

  if (section.lineCount > 200) {
    html += `<div class="gcode-section-loading" id="sectionLoading_${sectionIdx}">Loading ${section.lineCount - 200} more lines...</div>`;
  }

  if (isSelectedLayer) {
    html += renderModificationsForLayer(section.layerNum);
  }

  return html;
}

function renderModificationsForLayer(layerNum) {
  const mods = modifier.modifications.filter(m => {
    if (m.type === 'pause' && m.lineNumber != null) return false; // shown inline
    if (m.type === 'zoffset') return layerNum >= m.layer && (m.endLayer == null || layerNum <= m.endLayer);
    return m.layer === layerNum;
  });
  if (mods.length === 0) return '';

  let html = '<table class="code-table"><tbody>';
  html += '<tr class="layer-start"><td class="ln" style="color:var(--orange)">+</td><td style="color:var(--orange);font-weight:600">; ── Modifications to be inserted ──</td></tr>';
  for (const mod of mods) {
    const snippet = modifier.getSnippet(mod);
    for (const line of snippet) {
      html += `<tr class="mod-line"><td class="ln">+</td><td>${syntaxHighlight(line)}</td></tr>`;
    }
  }
  html += '</tbody></table>';
  return html;
}

function scheduleChunkedRender(section, sectionIdx) {
  const linesContainer = document.getElementById(`sectionLines_${sectionIdx}`);
  const loadingEl = document.getElementById(`sectionLoading_${sectionIdx}`);
  if (!linesContainer) return;

  const table = linesContainer.querySelector('.code-table tbody');
  if (!table) return;

  const isSelectedLayer = section.type === 'layer' && section.layerNum === selectedLayer;
  const midLayerMods = isSelectedLayer
    ? modifier.modifications.filter(m => m.type === 'pause' && m.lineNumber != null && m.layer === section.layerNum)
    : [];
  let offset = section.startLine + 200;
  const batchSize = 500;

  function renderBatch() {
    if (!document.getElementById(`sectionLines_${sectionIdx}`)) return;

    const end = Math.min(offset + batchSize, section.endLine + 1);
    let html = '';
    for (let i = offset; i < end; i++) {
      // Render mid-layer pause snippets before their target line
      for (const mlMod of midLayerMods) {
        if (mlMod.lineNumber === i) {
          const snippet = modifier.getSnippet(mlMod);
          for (const line of snippet) {
            html += `<tr class="mod-line-midlayer"><td class="ln">+</td><td>${syntaxHighlight(line)}</td></tr>`;
          }
        }
      }
      const raw = parser.lines[i];
      const isLayerStart = raw.trim().match(/^;LAYER:\d+/i);
      const classes = [];
      if (isLayerStart) classes.push('layer-start');
      if (isSelectedLayer) classes.push('highlight');
      const isSearchActive = searchQuery && searchMatches.length > 0 && currentMatchIdx >= 0 && searchMatches[currentMatchIdx].lineNum === i;
      if (isSearchActive) classes.push('search-active');
      const lineContent = searchQuery ? highlightSearchMatch(syntaxHighlight(raw), searchQuery) : syntaxHighlight(raw);
      const clickHandler = section.type === 'layer' ? ` onclick="selectLineForPause(${i}, ${sectionIdx})"` : '';
      const selectedClass = (selectedLineNumber === i) ? ' line-selected' : '';
      html += `<tr class="${classes.join(' ')}${selectedClass}" data-line="${i}"${clickHandler}><td class="ln">${i + 1}</td><td>${lineContent}</td></tr>`;
    }
    table.insertAdjacentHTML('beforeend', html);
    offset = end;

    if (offset <= section.endLine) {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(renderBatch);
      } else {
        setTimeout(renderBatch, 0);
      }
    } else {
      if (loadingEl) loadingEl.remove();
    }
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(renderBatch);
  } else {
    setTimeout(renderBatch, 0);
  }
}

function scrollToActiveSection() {
  const container = document.getElementById('gcodePreview');
  if (!container) return;
  const activeHeader = container.querySelector('.gcode-section-header.active');
  if (activeHeader) {
    requestAnimationFrame(() => {
      activeHeader.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
}

function toggleSection(sectionIdx) {
  const section = sectionStates[sectionIdx];
  if (!section) return;

  section.expanded = !section.expanded;
  renderSectionPreview();
}

function updateSectionForLayer(layerNum) {
  if (sectionStates.length === 0) return;

  // Collapse the previously expanded layer (but not header)
  for (const section of sectionStates) {
    if (section.type === 'layer' && section.expanded && section.layerNum !== layerNum) {
      section.expanded = false;
    }
  }

  // Expand the selected layer's section
  for (const section of sectionStates) {
    if (section.type === 'layer' && section.layerNum === layerNum) {
      section.expanded = true;
      break;
    }
  }

  currentExpandedLayer = layerNum;
  renderSectionPreview();

  // Update the info bar
  const layer = parser.getLayerByNumber(layerNum);
  if (layer) {
    document.getElementById('previewInfo').textContent =
      `Layer ${layer.number}  ·  Z${layer.zHeight?.toFixed(2) || '?'}mm  ·  Lines ${layer.startLine + 1}–${layer.endLine + 1}`;
  }
}

// ===== PREVIEW =====
function renderPreview(layerNum) {
  // Delegate to section-based rendering
  updateSectionForLayer(layerNum);
}

function renderFullPreview() {
  buildSections();
  renderSectionPreview();
}

function syntaxHighlight(line) {
  if (!line) return '';
  let escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Comments
  if (escaped.trim().startsWith(';')) {
    return `<span class="syn-comment">${escaped}</span>`;
  }

  // Inline comments
  const commentIdx = escaped.indexOf(';');
  let main = commentIdx > -1 ? escaped.substring(0, commentIdx) : escaped;
  let comment = commentIdx > -1 ? `<span class="syn-comment">${escaped.substring(commentIdx)}</span>` : '';

  // G commands
  main = main.replace(/\b(G\d+(\.\d+)?)/g, '<span class="syn-g">$1</span>');
  // M commands
  main = main.replace(/\b(M\d+)/g, '<span class="syn-m">$1</span>');
  // Parameters (letters followed by numbers)
  main = main.replace(/\b([XYZEFIJKRSTPQAB])([-\d.]+)/g, '<span class="syn-param">$1</span><span class="syn-value">$2</span>');

  return main + comment;
}

function highlightSearchMatch(html, query) {
  if (!query) return html;
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${q})`, 'gi');
  return html.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag;
    return text.replace(regex, '<mark class="search-match">$1</mark>');
  });
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
  container.appendChild(toast);
  if (duration > 0) setTimeout(() => toast.remove(), duration);
}

// ===== TAB SWITCHING =====
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.toggle('active', tc.id === 'tab-' + tabName));
  if (tabName === 'reference' && document.getElementById('refContent').children.length === 0) {
    renderReference();
  }
}

// ===== REFERENCE TAB =====
function renderReference() {
  const fw = currentFirmware;
  const fwName = FIRMWARE[fw].name;
  document.getElementById('refFirmwareBadge').innerHTML = 'Showing notes for: <span>' + fwName + '</span>';

  const categories = [];
  const catMap = {};
  GCODE_REFERENCE.forEach(cmd => {
    if (!catMap[cmd.category]) {
      catMap[cmd.category] = [];
      categories.push(cmd.category);
    }
    catMap[cmd.category].push(cmd);
  });

  let html = '';
  categories.forEach(cat => {
    html += '<div class="ref-category" data-category="' + cat + '">';
    html += '<div class="ref-category-header" onclick="this.parentElement.classList.toggle(\'collapsed\')">' + cat + '</div>';
    html += '<div class="ref-category-cards">';
    catMap[cat].forEach(cmd => {
      const fwNote = cmd.firmware[fw];
      html += '<div class="ref-card" data-search="' + (cmd.code + ' ' + cmd.name + ' ' + cmd.description).toLowerCase().replace(/"/g, '&quot;') + '">';
      html += '<div class="ref-card-head"><span class="ref-card-code">' + cmd.code + '</span><span class="ref-card-name">' + cmd.name + '</span>';
      html += '<button class="ref-card-insert" onclick="insertRefCommand(\'' + cmd.code.replace(/'/g, "\\'") + '\');event.stopPropagation()">Insert</button></div>';
      html += '<div class="ref-card-desc">' + cmd.description + '</div>';
      if (cmd.params.length > 0) {
        html += '<table class="ref-card-params"><tr><th>Param</th><th>Description</th><th>Example</th></tr>';
        cmd.params.forEach(p => {
          html += '<tr><td>' + p.letter + '</td><td>' + p.name + '</td><td>' + p.example + '</td></tr>';
        });
        html += '</table>';
      }
      html += '<div class="ref-card-example">' + cmd.example.replace(/\n/g, '<br>') + '</div>';
      if (fwNote) {
        html += '<div class="ref-card-firmware">' + fwName + ': ' + fwNote + '</div>';
      }
      html += '</div>';
    });
    html += '</div></div>';
  });

  document.getElementById('refContent').innerHTML = html;
}

function filterReferenceCards() {
  const query = document.getElementById('refSearch').value.toLowerCase().trim();
  const categories = document.querySelectorAll('#refContent .ref-category');
  let anyVisible = false;

  categories.forEach(cat => {
    const cards = cat.querySelectorAll('.ref-card');
    let catVisible = false;
    cards.forEach(card => {
      const match = !query || card.dataset.search.includes(query);
      card.style.display = match ? '' : 'none';
      if (match) catVisible = true;
    });
    cat.style.display = catVisible ? '' : 'none';
    if (catVisible) anyVisible = true;
  });

  let noRes = document.getElementById('refNoResults');
  if (!anyVisible) {
    if (!noRes) {
      noRes = document.createElement('div');
      noRes.id = 'refNoResults';
      noRes.className = 'ref-no-results';
      noRes.textContent = 'No commands found matching your search.';
      document.getElementById('refContent').appendChild(noRes);
    }
    noRes.style.display = '';
  } else if (noRes) {
    noRes.style.display = 'none';
  }
}

function insertRefCommand(code) {
  const cmd = GCODE_REFERENCE.find(c => c.code === code);
  if (!cmd) return;
  switchTab('custom');
  const textarea = document.getElementById('customGcode');
  textarea.value = cmd.template;
  const layerInput = document.getElementById('customLayer');
  if (selectedLayer != null && layerInput.value === '') {
    layerInput.value = selectedLayer;
  }
  showToast(cmd.code + ' inserted into Custom G-code tab', 'success');
}

// ===== ADD MODIFICATIONS =====
function addPause() {
  const layer = parseInt(document.getElementById('pauseLayer').value);
  if (isNaN(layer)) { showToast('Please enter a valid layer number.', 'error'); return; }
  const layerData = parser.getLayerByNumber(layer);
  if (!layerData) { showToast(`Layer ${layer} not found in the file.`, 'error'); return; }

  const lineNumInput = document.getElementById('pauseLineNumber').value.trim();
  let lineNumber = null;
  if (lineNumInput !== '') {
    lineNumber = parseInt(lineNumInput);
    if (isNaN(lineNumber)) { showToast('Please enter a valid line number.', 'error'); return; }
    // Convert 1-based display line to 0-based index
    lineNumber = lineNumber - 1;
    if (lineNumber < layerData.startLine || lineNumber > layerData.endLine) {
      showToast(`Line ${lineNumber + 1} is not within layer ${layer} (lines ${layerData.startLine + 1}–${layerData.endLine + 1}).`, 'error');
      return;
    }
  }

  const msg = document.getElementById('pauseMsg').value;
  const pauseType = document.querySelector('input[name="pauseType"]:checked').value;
  const moveHead = document.getElementById('pauseMoveHead').checked;

  modifier.addPause(layer, msg, pauseType, moveHead, lineNumber);
  document.getElementById('pauseLineNumber').value = '';
  refreshAfterMod();
  selectedMove = null;
  const lineInfo = lineNumber != null ? `, line ${lineNumber + 1}` : '';
  showToast(`Pause added at layer ${layer}${lineInfo}`, 'success');
}

function addFilamentChange() {
  const layer = parseInt(document.getElementById('filamentLayer').value);
  if (isNaN(layer)) { showToast('Please enter a valid layer number.', 'error'); return; }
  if (!parser.getLayerByNumber(layer)) { showToast(`Layer ${layer} not found in the file.`, 'error'); return; }

  const slot = document.getElementById('filamentSlot').value;
  const cmd = document.getElementById('filamentCmd').value;

  modifier.addFilament(layer, slot, cmd);
  refreshAfterMod();
  showToast('Filament change added at layer ' + layer, 'success');
}

function addEject() {
  const config = {
    bedY: parseInt(document.getElementById('ejectY').value) || 220,
    headZ: parseInt(document.getElementById('ejectZ').value) || 10,
    feedRate: parseInt(document.getElementById('ejectFeed').value) || 6000,
    heatersOff: document.getElementById('ejectHeatersOff').checked,
    homeZ: document.getElementById('ejectHomeZ').checked,
    loop: document.getElementById('ejectLoop').checked,
  };
  modifier.addEject(config);
  refreshAfterMod();
  showToast('Eject sequence added', 'success');
}

function syncRecoveryFromLayer() {
  const layerNum = parseInt(document.getElementById('recoveryLayer').value);
  if (isNaN(layerNum) || !parser.layers.length) return;
  const layer = parser.getLayerByNumber(layerNum);
  if (layer && layer.zHeight != null) {
    document.getElementById('recoveryHeight').value = layer.zHeight.toFixed(2);
  }
}

function syncRecoveryFromHeight() {
  const height = parseFloat(document.getElementById('recoveryHeight').value);
  if (isNaN(height) || !parser.layers.length) return;
  // Find the last layer at or below the given height
  let best = null;
  for (const layer of parser.layers) {
    if (layer.zHeight != null && layer.zHeight <= height + 0.001) {
      best = layer;
    }
  }
  if (best) {
    document.getElementById('recoveryLayer').value = best.number;
  }
}

function addRecovery() {
  const layer = parseInt(document.getElementById('recoveryLayer').value);
  if (isNaN(layer)) { showToast('Please enter a layer number or height.', 'error'); return; }
  if (layer === 0) { showToast('Layer 0 is already the first layer — no recovery needed.', 'warning'); return; }
  if (!parser.getLayerByNumber(layer)) { showToast(`Layer ${layer} not found in the file.`, 'error'); return; }
  const lastLayer = parser.layers[parser.layers.length - 1];
  if (lastLayer && layer === lastLayer.number) {
    showToast('Warning: recovery print will only contain the final layer.', 'warning');
  }
  modifier.addRecovery(layer);
  refreshAfterMod();
  showToast(`Recovery added: resume from layer ${layer}`, 'success');
}

function addZOffset() {
  const layer = parseInt(document.getElementById('zoffsetLayer').value);
  if (isNaN(layer)) { showToast('Please enter a valid start layer number.', 'error'); return; }
  if (!parser.getLayerByNumber(layer)) { showToast(`Layer ${layer} not found in the file.`, 'error'); return; }

  const endLayerInput = document.getElementById('zoffsetEndLayer').value.trim();
  let endLayer = null;
  if (endLayerInput !== '') {
    endLayer = parseInt(endLayerInput);
    if (isNaN(endLayer)) { showToast('Please enter a valid end layer number or leave blank.', 'error'); return; }
    if (!parser.getLayerByNumber(endLayer)) { showToast(`Layer ${endLayer} not found in the file.`, 'error'); return; }
    if (endLayer < layer) { showToast('End layer must be >= start layer.', 'error'); return; }
  }

  const offset = parseFloat(document.getElementById('zoffsetValue').value);
  if (isNaN(offset) || offset === 0) { showToast('Please enter a non-zero Z-offset value.', 'error'); return; }

  const note = document.getElementById('zoffsetNote').value.trim();

  modifier.addZOffset(layer, endLayer, offset, note);
  refreshAfterMod();
  showToast('Z-offset added at layer ' + layer, 'success');
}

function addCustom() {
  let layerInput = document.getElementById('customLayer').value.trim();
  const gcode = document.getElementById('customGcode').value.trim();
  if (!gcode) { showToast('Please enter some G-code.', 'error'); return; }

  let layer;
  if (layerInput.toLowerCase() === 'end') {
    layer = 'end';
  } else {
    layer = parseInt(layerInput);
    if (isNaN(layer)) { showToast('Please enter a valid layer number or "end".', 'error'); return; }
    if (!parser.getLayerByNumber(layer)) { showToast(`Layer ${layer} not found in the file.`, 'error'); return; }
  }

  modifier.addCustom(layer, gcode);
  refreshAfterMod();
  showToast('Custom G-code added at layer ' + layer, 'success');
}

function refreshAfterMod() {
  undoStack.push(modifier.modifications);
  renderModsList();
  renderLayerList();
  updateSliderTicks();
  if (selectedLayer !== null) {
    renderPreview(selectedLayer);
    if (currentView === 'visual') {
      viewer.maxVisibleLayer = selectedLayer;
      viewer.render(selectedLayer);
      updateViewerOverlay(selectedLayer);
    }
  }
  if (modifier.modifications.length === 1) {
    showOnboardHint('export', 'exportBtn', 'Export to save your changes');
  }
}

// ===== MODIFICATIONS LIST =====
function renderModsList() {
  const container = document.getElementById('modsList');
  const noMods = document.getElementById('noMods');
  const editDels = getActiveEditDeletions();
  const count = modifier.modifications.length + editDels.length;
  document.getElementById('modsCount').textContent = count;

  if (count === 0) {
    container.innerHTML = '<div class="no-mods" id="noMods">No modifications added yet</div>';
    return;
  }

  let html = '';
  for (const mod of modifier.modifications) {
    const badge = mod.type;
    let desc = '';
    switch (mod.type) {
      case 'pause':
        desc = mod.lineNumber != null
          ? `Layer ${mod.layer}, line ${mod.lineNumber + 1}${mod.message ? ' – ' + mod.message : ''}`
          : `Layer ${mod.layer}${mod.message ? ' – ' + mod.message : ''}`;
        break;
      case 'filament':
        desc = mod.command === 'M1020' ? `Layer ${mod.layer} → Slot ${mod.slot + 1} (${mod.command})` : `Layer ${mod.layer} (${mod.command})`;
        break;
      case 'eject':
        desc = `End of file${mod.loop ? ' (loop)' : ''}`;
        break;
      case 'zoffset': {
        const sign = mod.offset >= 0 ? '+' : '';
        const range = mod.endLayer != null ? `L${mod.layer}–${mod.endLayer}` : `L${mod.layer}+`;
        desc = `${range}: ${sign}${mod.offset}mm${mod.note ? ' – ' + mod.note : ''}`;
        break;
      }
      case 'custom':
        desc = mod.layer === 'end' ? 'End of file' : `Layer ${mod.layer}`;
        break;
      case 'recovery':
        desc = `Resume from layer ${mod.resumeLayer}`;
        break;
    }

    html += `<div class="mod-item" data-id="${mod.id}" draggable="true"
  ondragstart="onModDragStart(event,'${mod.id}')"
  ondragover="onModDragOver(event)"
  ondrop="onModDrop(event,'${mod.id}')"
  ondragend="onModDragEnd()">
      <span class="mod-badge ${badge}">${badge}</span>
      <span class="mod-desc" title="${desc}">${desc}</span>
      <div class="mod-actions">
        <button class="mod-action delete" onclick="modifier.remove('${mod.id}');refreshAfterMod()" title="Delete">&times;</button>
      </div>
    </div>`;
  }

  // Show edit deletions
  for (let i = 0; i < editDels.length; i++) {
    const del = editDels[i];
    const desc = `Layer ${del.layer}, line ${del.lineIndex + 1} removed`;
    html += `<div class="mod-item edit-deletion">
      <span class="mod-badge line-delete">edit</span>
      <span class="mod-desc" title="${del.lineContent.trim()}">${desc}</span>
    </div>`;
  }
  container.innerHTML = html;
}

function onModDragStart(e, modId) {
  dragModId = modId;
  e.dataTransfer.effectAllowed = 'move';
  e.target.style.opacity = '0.4';
}

function onModDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.mod-item');
  document.querySelectorAll('.mod-item').forEach(el => el.style.borderTop = '');
  if (item) item.style.borderTop = '2px solid var(--accent)';
}

function onModDrop(e, targetId) {
  e.preventDefault();
  if (!dragModId || dragModId === targetId) return;

  const mods = modifier.modifications;
  const fromIdx = mods.findIndex(m => m.id === dragModId);
  const toIdx = mods.findIndex(m => m.id === targetId);
  if (fromIdx < 0 || toIdx < 0) return;

  const [moved] = mods.splice(fromIdx, 1);
  mods.splice(toIdx, 0, moved);

  refreshAfterMod();
}

function onModDragEnd() {
  dragModId = null;
  document.querySelectorAll('.mod-item').forEach(el => {
    el.style.opacity = '';
    el.style.borderTop = '';
  });
}

// ===== VIEW TOGGLE =====
function setView(view) {
  currentView = view;
  document.getElementById('viewCodeBtn').classList.toggle('active', view === 'code');
  document.getElementById('viewVisualBtn').classList.toggle('active', view === 'visual');
  document.getElementById('gcodePreview').classList.toggle('hidden', view === 'visual');
  document.getElementById('viewerWrap').classList.toggle('active', view === 'visual');
  if (view === 'visual' && selectedLayer !== null) {
    viewer.resize();
    viewer.fitBounds();
    viewer.maxVisibleLayer = selectedLayer;
    viewer.render(selectedLayer);
    updateViewerOverlay(selectedLayer);
    showSimControls();
  } else {
    stopSimulation();
    hideSimControls();
  }
}

function onSliderChange(val) {
  // Map slider index to layer number
  if (parser.layers[val]) {
    selectLayer(parser.layers[val].number);
    document.getElementById('sliderLabel').textContent = `Layer ${parser.layers[val].number}`;
  }
}

function updateSlider() {
  const slider = document.getElementById('layerSlider');
  slider.max = Math.max(0, parser.layers.length - 1);
  const idx = parser.layers.findIndex(l => l.number === selectedLayer);
  if (idx >= 0) slider.value = idx;
  document.getElementById('sliderLabel').textContent = `Layer ${selectedLayer ?? 0}`;
  updateSliderTicks();
}

function updateSliderTicks() {
  const container = document.getElementById('sliderTicks');
  const moddedLayers = getModdedLayers();
  if (parser.layers.length === 0 || moddedLayers.size === 0) { container.innerHTML = ''; return; }
  let html = '';
  for (const mod of modifier.modifications) {
    if (mod.layer === Infinity || mod.layer === 'end') continue;
    const idx = parser.layers.findIndex(l => l.number === mod.layer);
    if (idx < 0) continue;
    const pct = (idx / Math.max(1, parser.layers.length - 1)) * 100;
    const color = mod.type === 'pause' ? 'var(--yellow)' : mod.type === 'filament' ? 'var(--purple)' : mod.type === 'zoffset' ? 'var(--orange)' : 'var(--accent)';
    html += `<div class="slider-tick" style="left:${pct}%;background:${color}"></div>`;
  }
  for (const del of getActiveEditDeletions()) {
    const idx = parser.layers.findIndex(l => l.number === del.layer);
    if (idx < 0) continue;
    const pct = (idx / Math.max(1, parser.layers.length - 1)) * 100;
    html += `<div class="slider-tick" style="left:${pct}%;background:var(--red, #ef4444)"></div>`;
  }
  container.innerHTML = html;
}

function updateViewerOverlay(layerNum) {
  const overlay = document.getElementById('viewerOverlay');
  const layer = parser.getLayerByNumber(layerNum);
  if (!layer) { overlay.innerHTML = ''; return; }

  let html = `<div class="viewer-info">Layer ${layer.number} · Z${layer.zHeight?.toFixed(2) || '?'}mm · ${layer.lineCount} lines</div>`;

  // Show modification banners
  const mods = modifier.modifications.filter(m => {
    if (m.type === 'zoffset') return layerNum >= m.layer && (m.endLayer == null || layerNum <= m.endLayer);
    return m.layer === layerNum;
  });
  for (const mod of mods) {
    if (mod.type === 'pause') {
      if (mod.lineNumber != null) {
        html += `<div class="viewer-mod-banner mid-layer-pause">⏸ Mid-layer pause at line ${mod.lineNumber + 1}${mod.message ? ': ' + mod.message : ''}</div>`;
      } else {
        html += `<div class="viewer-mod-banner pause">⏸ Pause at this layer${mod.message ? ': ' + mod.message : ''}</div>`;
      }
    } else if (mod.type === 'filament') {
      html += `<div class="viewer-mod-banner filament">🔄 Filament change${mod.command === 'M1020' ? ' → Slot ' + (mod.slot + 1) : ''} (${mod.command})</div>`;
    } else if (mod.type === 'zoffset') {
      const sign = mod.offset >= 0 ? '+' : '';
      html += `<div class="viewer-mod-banner pause">↕ Z-Offset: ${sign}${mod.offset}mm${mod.note ? ' – ' + mod.note : ''}</div>`;
    } else if (mod.type === 'custom') {
      html += `<div class="viewer-mod-banner custom">⚙ Custom G-code inserted</div>`;
    } else if (mod.type === 'recovery') {
      html += `<div class="viewer-mod-banner recovery">Recovery: resume from layer ${mod.resumeLayer}</div>`;
    }
  }
  overlay.innerHTML = html;
}

// ===== HOLE DETECTION UI =====
function toggleHoleMode() {
  holeDetectMode = !holeDetectMode;
  const btn = document.getElementById('holeDetectToggle');
  const canvas = document.getElementById('viewerCanvas');
  btn.classList.toggle('active', holeDetectMode);
  canvas.classList.toggle('hole-mode', holeDetectMode);

  if (holeDetectMode) {
    switchTab('inserts');
    if (currentView !== 'visual') setView('visual');
  }
}

function detectHolesOnLayer() {
  if (selectedLayer === null) { showToast('Please select a layer first.', 'warning'); return; }
  if (currentView !== 'visual') setView('visual');

  const minDia = parseFloat(document.getElementById('holeMinDia').value) || 4;
  const ignoreInfill = document.getElementById('holeIgnoreInfill').checked;

  holeDetector.scannedHoles = []; // clear any full-scan results
  const holes = holeDetector.detectHoles(selectedLayer, minDia, ignoreInfill);

  // Analyze depth for each hole
  for (const hole of holes) {
    holeDetector.analyzeHoleDepth(hole, selectedLayer);
  }

  holeDetector.selectedHoles = [];
  renderHoleList();
  viewer.render(selectedLayer);

  if (!holeDetectMode) toggleHoleMode();
}

async function scanAllHoles() {
  if (!parser || !parser.layers || parser.layers.length === 0) {
    showToast('Please load a G-code file first.', 'warning');
    return;
  }
  if (currentView !== 'visual') setView('visual');

  const minDia = parseFloat(document.getElementById('holeMinDia').value) || 4;
  const ignoreInfill = document.getElementById('holeIgnoreInfill').checked;

  const btn = document.getElementById('scanAllBtn');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Scanning...';

  const totalLayers = parser.layers.length;
  const holes = await holeDetector.scanAllLayers(minDia, ignoreInfill, (done, total) => {
    btn.textContent = `Scanning ${Math.round(done / total * 100)}%`;
  });

  btn.disabled = false;
  btn.textContent = origText;

  renderHoleList();
  if (viewer) viewer.render(viewer.currentLayer);

  if (!holeDetectMode) toggleHoleMode();

  if (holes.length === 0) {
    showToast('No holes detected in the print.', 'warning');
  } else {
    showToast(`Found ${holes.length} hole(s) across all layers.`, 'success');
  }
}

function renderHoleList() {
  const wrap = document.getElementById('holeListWrap');
  const holes = holeDetector.scannedHoles.length > 0
    ? holeDetector.scannedHoles
    : (selectedLayer !== null ? (holeDetector.holes.get(selectedLayer) || []) : []);

  if (holes.length === 0) {
    wrap.innerHTML = '<div class="no-holes" id="noHoles">Click "Detect (Layer)" or "Scan All Layers"</div>';
    return;
  }

  const isScanned = holeDetector.scannedHoles.length > 0;
  let html = '';
  holes.forEach((hole, i) => {
    const isSelected = holeDetector.selectedHoles.includes(hole.id);
    const depthStr = hole.depthMm != null ? `${hole.depthMm.toFixed(1)}mm deep` :
                     (hole.floorLayer === -1 ? 'through-hole' : 'depth unknown');

    // Shape and dimension info
    const shapeIcon = { circle: '\u25cb', hexagon: '\u2b21', square: '\u25a1', rectangle: '\u25ad' }[hole.shape] || '';
    const shapeName = hole.shape || 'unknown';
    let dimStr;
    if (hole.shape === 'circle') {
      dimStr = `${hole.diameterMm.toFixed(1)}mm dia`;
    } else if (hole.widthMm && hole.heightMm) {
      dimStr = `${hole.widthMm.toFixed(1)} &times; ${hole.heightMm.toFixed(1)}mm`;
    } else {
      dimStr = `${hole.diameterMm.toFixed(1)}mm dia`;
    }

    // Clickable layer links
    const floorLink = hole.floorLayer >= 0
      ? `<a href="#" onclick="event.stopPropagation();jumpToLayer(${hole.floorLayer})" style="color:var(--accent);text-decoration:underline">${hole.floorLayer}</a>`
      : 'none';
    const topLayerNum = hole.topLayer ?? hole.layerNum;
    const topLink = isScanned
      ? ` &middot; top <a href="#" onclick="event.stopPropagation();jumpToLayer(${topLayerNum})" style="color:var(--accent);text-decoration:underline">${topLayerNum}</a>`
      : '';

    html += `<div class="hole-item${isSelected ? ' selected' : ''}" onclick="toggleHoleSelection('${hole.id}', event)">
      <span class="hole-id">#${i + 1}</span>
      <div class="hole-info">
        ${shapeIcon} ${shapeName} &middot; ${dimStr} &middot; ${hole.areaMm2.toFixed(1)}mm&sup2;
        <span>${depthStr} &middot; floor ${floorLink}${topLink}</span>
      </div>
    </div>`;
  });
  wrap.innerHTML = html;
}

function toggleHoleSelection(holeId, event) {
  const ctrlOrCmd = event && (event.ctrlKey || event.metaKey);
  if (ctrlOrCmd) {
    const idx = holeDetector.selectedHoles.indexOf(holeId);
    if (idx >= 0) holeDetector.selectedHoles.splice(idx, 1);
    else holeDetector.selectedHoles.push(holeId);
  } else {
    if (holeDetector.selectedHoles.length === 1 && holeDetector.selectedHoles[0] === holeId) {
      holeDetector.selectedHoles = [];
    } else {
      holeDetector.selectedHoles = [holeId];
    }
  }

  renderHoleList();
  updateComputedPauseInfo();
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function updateComputedPauseInfo() {
  const container = document.getElementById('computedPauseInfo');
  const selected = getSelectedHoleObjects();
  if (selected.length === 0) { container.innerHTML = ''; return; }

  const heightVal = parseFloat(document.getElementById('insertHeight').value) || 3;
  const heightUnit = document.getElementById('insertHeightUnit').value;

  let html = '';
  for (const hole of selected) {
    let insertMm = heightVal;
    if (heightUnit === 'layers' && hole.floorLayer >= 0) {
      const floorData = parser.getLayerByNumber(hole.floorLayer);
      const startData = parser.getLayerByNumber(hole.layerNum);
      if (floorData && startData && floorData.zHeight != null && startData.zHeight != null) {
        const layerH = (startData.zHeight - floorData.zHeight) / Math.max(1, hole.layerNum - hole.floorLayer);
        insertMm = heightVal * layerH;
      }
    }

    const pauseLayer = insertManager.calculatePauseLayer(hole, insertMm);
    if (pauseLayer != null) {
      const pauseData = parser.getLayerByNumber(pauseLayer);
      const zStr = pauseData?.zHeight != null ? ` (Z${pauseData.zHeight.toFixed(2)}mm)` : '';
      html += `<div class="computed-layer">Hole #${holeDetector.holes.get(hole.layerNum)?.indexOf(hole) + 1}: pause at layer ${pauseLayer}${zStr}</div>`;
    } else if (hole.floorLayer < 0) {
      html += `<div class="warning-msg">Hole is a through-hole — cannot compute pause layer</div>`;
    } else {
      html += `<div class="warning-msg">Insert may be taller than remaining print</div>`;
    }
  }
  container.innerHTML = html;
}

function getSelectedHoleObjects() {
  const results = [];
  for (const [layerNum, holes] of holeDetector.holes) {
    for (const hole of holes) {
      if (holeDetector.selectedHoles.includes(hole.id)) results.push(hole);
    }
  }
  return results;
}

function addInsertsForSelection() {
  const selected = getSelectedHoleObjects();
  if (selected.length === 0) { showToast('Please select at least one hole first.', 'warning'); return; }

  const heightVal = parseFloat(document.getElementById('insertHeight').value);
  if (!heightVal || heightVal <= 0) { showToast('Please enter a valid insert height.', 'error'); return; }

  const heightUnit = document.getElementById('insertHeightUnit').value;
  const diameterMm = parseFloat(document.getElementById('insertDiameter').value) || 6;
  const label = document.getElementById('insertLabel').value.trim();
  const pauseType = document.querySelector('input[name="insertPauseType"]:checked').value;
  const moveHead = document.getElementById('insertMoveHead').checked;

  let addedCount = 0;
  for (const hole of selected) {
    let insertMm = heightVal;
    if (heightUnit === 'layers' && hole.floorLayer >= 0) {
      const floorData = parser.getLayerByNumber(hole.floorLayer);
      const startData = parser.getLayerByNumber(hole.layerNum);
      if (floorData && startData && floorData.zHeight != null && startData.zHeight != null) {
        const layerH = (startData.zHeight - floorData.zHeight) / Math.max(1, hole.layerNum - hole.floorLayer);
        insertMm = heightVal * layerH;
      }
    }

    const result = insertManager.createModification(hole, insertMm, diameterMm, label, pauseType, moveHead);
    if (result) addedCount++;
  }

  if (addedCount === 0) { showToast('Could not compute pause layers for the selected holes. They may be through-holes.', 'error'); return; }

  holeDetector.selectedHoles = [];
  refreshAfterMod();
  renderHoleList();
  updateComputedPauseInfo();
  showToast(addedCount + ' insert pause(s) added successfully', 'success');
}

// ===== EXPORT =====
function exportGcode() {
  if (parser.lines.length === 0) return;

  const modifiedLines = modifier.applyAll(parser.lines, parser);
  const text = modifiedLines.join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const baseName = parser.fileName.replace(/\.gcode$/i, '');
  const recoveryMod = modifier.modifications.find(m => m.type === 'recovery');
  const suffix = recoveryMod ? `_recovery_L${recoveryMod.resumeLayer}` : '_modified';
  const a = document.createElement('a');
  a.href = url;
  a.download = baseName + suffix + '.gcode';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== UNDO/REDO =====
async function performUndo() {
  if (await performEditUndo()) return;
  const state = undoStack.undo();
  if (state) {
    modifier.modifications = state;
    renderModsList();
    renderLayerList();
    updateSlider();
    if (selectedLayer !== null) {
      renderPreview(selectedLayer);
      if (currentView === 'visual') {
        viewer.maxVisibleLayer = selectedLayer;
        viewer.render(selectedLayer);
        updateViewerOverlay(selectedLayer);
      }
    }
  }
}

async function performRedo() {
  if (await performEditRedo()) return;
  const state = undoStack.redo();
  if (state) {
    modifier.modifications = state;
    renderModsList();
    renderLayerList();
    updateSlider();
    if (selectedLayer !== null) {
      renderPreview(selectedLayer);
      if (currentView === 'visual') {
        viewer.maxVisibleLayer = selectedLayer;
        viewer.render(selectedLayer);
        updateViewerOverlay(selectedLayer);
      }
    }
  }
}

function toggleShortcutsOverlay() {
  document.getElementById('shortcutsOverlay').classList.toggle('active');
}

// ===== RIGHT PANEL RESIZE =====
(function() {
  const handle = document.getElementById('panelRightResize');
  const panel = document.getElementById('panelRight');
  let dragging = false, startX, startW;
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startW = panel.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const newW = startW - (e.clientX - startX);
    panel.style.width = Math.max(280, Math.min(window.innerWidth * 0.6, newW)) + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
})();

// ===== SIMULATION =====
function toggleSimulation() {
  if (simulationPlaying) {
    stopSimulation();
  } else {
    startSimulation();
  }
}

function startSimulation() {
  if (reparsing) return;
  if (selectedLayer === null) return;
  const moves = parser.layerMoves[selectedLayer];
  if (!moves || moves.length === 0) return;

  // Cache staleness check
  const cachedOffsets = viewer.moveOffsets.get(selectedLayer);
  if (cachedOffsets && cachedOffsets.length !== moves.length) {
    console.warn('[sim] Cache stale: moveOffsets has', cachedOffsets.length, 'entries but layerMoves has', moves.length, '— clearing buffers');
    viewer.clearBuffers();
  }

  simulationPlaying = true;
  viewer.simulating = true;
  const btn = document.getElementById('simPlayBtn');
  btn.innerHTML = '&#9646;&#9646; Pause';
  btn.classList.add('playing');

  let lastTime = performance.now();
  let currentMoves = moves;

  function tick(now) {
    if (!simulationPlaying) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const prevIndex = Math.floor(simulationMoveIndex);
    simulationMoveIndex += simulationSpeed * dt;
    const totalMoves = currentMoves.length;

    if (simulationMoveIndex >= totalMoves - 1) {
      // End of layer — try to advance to next layer
      simulationMoveIndex = totalMoves - 1;
      viewer.simMoveIndex = Math.floor(simulationMoveIndex);
      viewer.render(selectedLayer);
      updateSimUI();

      if (simAdvanceToNextLayer()) {
        currentMoves = parser.layerMoves[selectedLayer];
        lastTime = performance.now();
        simulationRafId = requestAnimationFrame(tick);
      } else {
        stopSimulation();
      }
      return;
    }

    const newIndex = Math.floor(simulationMoveIndex);

    // Check if we crossed a pause point
    for (const pauseIdx of simulationPauseMoveIndices) {
      if (pauseIdx > prevIndex && pauseIdx <= newIndex && pauseIdx !== simulationPausedAtIndex) {
        // Snap to the pause point and stop
        simulationMoveIndex = pauseIdx;
        simulationPausedAtIndex = pauseIdx;
        viewer.simMoveIndex = pauseIdx;
        viewer.render(selectedLayer);
        updateSimUI();
        showSimPauseFlash();
        stopSimulation();
        return;
      }
    }

    viewer.simMoveIndex = newIndex;
    viewer.render(selectedLayer);
    updateSimUI();
    simulationRafId = requestAnimationFrame(tick);
  }

  simulationRafId = requestAnimationFrame(tick);
}

function simAdvanceToNextLayer() {
  const idx = parser.layers.findIndex(l => l.number === selectedLayer);
  if (idx < 0 || idx >= parser.layers.length - 1) return false;

  const nextLayer = parser.layers[idx + 1].number;
  const nextMoves = parser.layerMoves[nextLayer];
  if (!nextMoves || nextMoves.length === 0) return false;

  // Advance layer without full reset — keep playing state
  selectedLayer = nextLayer;
  simulationMoveIndex = 0;
  simulationPausedAtIndex = -1;
  viewer.simMoveIndex = 0;
  viewer.maxVisibleLayer = nextLayer;

  // Update layer UI
  renderLayerList();
  updateSlider();
  updateViewerOverlay(nextLayer);
  computeSimPauseTicks();
  updateSimUI();

  return true;
}

function simSkipNext() {
  const wasPlaying = simulationPlaying;
  if (wasPlaying) stopSimulation();

  const idx = parser.layers.findIndex(l => l.number === selectedLayer);
  if (idx < 0 || idx >= parser.layers.length - 1) return;

  const nextLayer = parser.layers[idx + 1].number;
  selectLayer(nextLayer);
  // selectLayer resets simulation, so re-enable simulating state
  viewer.simulating = true;
  showSimControls();
  if (wasPlaying) startSimulation();
}

function simSkipPrev() {
  const wasPlaying = simulationPlaying;
  if (wasPlaying) stopSimulation();

  const idx = parser.layers.findIndex(l => l.number === selectedLayer);
  if (idx <= 0) return;

  const prevLayer = parser.layers[idx - 1].number;
  selectLayer(prevLayer);
  viewer.simulating = true;
  showSimControls();
  if (wasPlaying) startSimulation();
}

function stopSimulation() {
  simulationPlaying = false;
  if (simulationRafId) {
    cancelAnimationFrame(simulationRafId);
    simulationRafId = null;
  }
  const btn = document.getElementById('simPlayBtn');
  btn.innerHTML = '&#9654; Play';
  btn.classList.remove('playing');
}

function resetSimulation() {
  stopSimulation();
  simulationMoveIndex = 0;
  simulationPausedAtIndex = -1;
  viewer.simMoveIndex = 0;
  viewer.simulating = false;
  updateSimUI();
}

function onSimProgressClick(event) {
  if (selectedLayer === null) return;
  const moves = parser.layerMoves[selectedLayer];
  if (!moves || moves.length === 0) return;

  const bar = document.getElementById('simProgress');
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  simulationMoveIndex = ratio * (moves.length - 1);
  viewer.simulating = true;
  viewer.simMoveIndex = Math.floor(simulationMoveIndex);
  viewer.render(selectedLayer);
  updateSimUI();
}

function onSimSpeedChange(val) {
  // Map 0-100 to exponential range ~10-500 moves/sec
  simulationSpeed = Math.round(10 * Math.pow(50, val / 100));
}

function updateSimUI() {
  const moves = selectedLayer !== null ? parser.layerMoves[selectedLayer] : null;
  const total = moves ? moves.length : 0;
  const current = Math.floor(simulationMoveIndex);
  const pct = total > 0 ? (current / (total - 1)) * 100 : 0;
  document.getElementById('simProgressFill').style.width = Math.min(100, pct) + '%';
  document.getElementById('simMoveLabel').textContent = `Move ${current}/${total}`;
}

function showSimControls() {
  const el = document.getElementById('simControls');
  if (el && selectedLayer !== null && parser.layerMoves[selectedLayer]?.length > 0) {
    el.classList.add('active');
    computeSimPauseTicks();
    updateSimUI();
  }
}

function computeSimPauseTicks() {
  simulationPauseMoveIndices = [];
  simulationPausedAtIndex = -1;
  if (selectedLayer === null) return;

  const moves = parser.layerMoves[selectedLayer];
  if (!moves || moves.length === 0) return;

  // Find all pause modifications for this layer with a lineNumber (mid-layer pauses)
  const pauses = modifier.modifications.filter(m =>
    m.type === 'pause' && m.layer === selectedLayer && m.lineNumber != null
  );
  if (pauses.length === 0) {
    renderSimPauseTicks();
    return;
  }

  // For each pause, find the single closest move by lineNumber
  for (const pause of pauses) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < moves.length; i++) {
      const dist = Math.abs(moves[i].lineIndex - pause.lineNumber);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && !simulationPauseMoveIndices.includes(bestIdx)) {
      simulationPauseMoveIndices.push(bestIdx);
    }
  }
  simulationPauseMoveIndices.sort((a, b) => a - b);

  renderSimPauseTicks();
}

function renderSimPauseTicks() {
  const bar = document.getElementById('simProgress');
  // Remove old ticks
  bar.querySelectorAll('.sim-pause-tick').forEach(t => t.remove());

  const moves = selectedLayer !== null ? parser.layerMoves[selectedLayer] : null;
  if (!moves || moves.length <= 1) return;

  for (const idx of simulationPauseMoveIndices) {
    const pct = (idx / (moves.length - 1)) * 100;
    const tick = document.createElement('div');
    tick.className = 'sim-pause-tick';
    tick.style.left = pct + '%';
    tick.title = `Pause at move ${idx}`;
    bar.appendChild(tick);
  }
}

function hideSimControls() {
  const el = document.getElementById('simControls');
  if (el) el.classList.remove('active');
}

function showSimPauseFlash() {
  const el = document.getElementById('simPauseFlash');
  if (!el) return;
  el.classList.remove('visible');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 600);
}

// ===== THEME SUPPORT =====
function getPreferredTheme() {
  const stored = localStorage.getItem('gcode_theme');
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeIcon').textContent = theme === 'light' ? '\u2600' : '\u263D';
  localStorage.setItem('gcode_theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

// ===== G-CODE DECODE TOOLTIP =====
let _tooltipTimer = null;
let _tooltipEl = null;

function getTooltipEl() {
  if (!_tooltipEl) {
    _tooltipEl = document.createElement('div');
    _tooltipEl.id = 'gcodeTooltip';
    document.body.appendChild(_tooltipEl);
  }
  return _tooltipEl;
}

function showDecodeTooltip(tr, mx, my) {
  const td = tr.querySelector('td:last-child');
  if (!td) return;

  const decoded = decodeLine(td.innerHTML);
  if (!decoded) return;

  const tip = getTooltipEl();
  const cmdClass = decoded.command.startsWith('G') ? 'tt-cmd-g' : 'tt-cmd-m';

  let html = `<div class="tt-header"><span class="${cmdClass}">${decoded.command}</span> \u2014 ${decoded.name}</div>`;

  if (decoded.params.length > 0) {
    html += '<div class="tt-params">';
    for (const p of decoded.params) {
      html += `<span><span class="tt-letter">${p.letter}</span><span class="tt-value">${p.value}</span></span>`;
      html += `<span class="tt-desc">${p.description}</span>`;
    }
    html += '</div>';
  } else if (!decoded.known) {
    html += '<div class="tt-unknown">Unknown command</div>';
  }

  tip.innerHTML = html;

  // Position near the mouse cursor
  let left = mx + 12;
  let top = my + 12;

  // Measure tooltip size off-screen, then reposition
  tip.style.left = '-9999px';
  tip.style.top = '-9999px';
  tip.style.visibility = 'hidden';
  tip.classList.add('visible');

  const tipRect = tip.getBoundingClientRect();
  if (left + tipRect.width > window.innerWidth - 8) {
    left = mx - tipRect.width - 8;
  }
  if (top + tipRect.height > window.innerHeight - 8) {
    top = my - tipRect.height - 8;
  }
  if (top < 8) top = 8;

  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
  tip.style.visibility = '';
}

function hideDecodeTooltip() {
  clearTimeout(_tooltipTimer);
  _tooltipTimer = null;
  if (_tooltipEl) _tooltipEl.classList.remove('visible');
}

function initDecodeTooltip() {
  const container = document.getElementById('gcodePreview');
  if (!container) return;

  container.addEventListener('mouseenter', (e) => {
    const tr = e.target.closest('.code-table tr');
    if (!tr || tr.classList.contains('mod-line') || tr.classList.contains('mod-line-midlayer')) return;
    if (tr.closest('.gcode-section-preview')) return;

    clearTimeout(_tooltipTimer);
    const mx = e.clientX, my = e.clientY;
    _tooltipTimer = setTimeout(() => {
      if (!tr.isConnected) return;
      showDecodeTooltip(tr, mx, my);
    }, 200);
  }, true);

  container.addEventListener('mouseleave', () => {
    hideDecodeTooltip();
  }, true);

  container.addEventListener('scroll', hideDecodeTooltip, true);
}
