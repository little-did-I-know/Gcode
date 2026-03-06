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
  editSelectedMoves = [];
  editSelectionBounds = null;
  editTransformState = null;
  hideTransformPanel();
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

// ===== Cross-section controls =====

function toggleCrossSection() {
  crossSectionActive = !crossSectionActive;
  const btn = document.getElementById('crossSectionToggle');
  const panel = document.getElementById('crossSectionControls');
  btn.classList.toggle('active', crossSectionActive);
  panel.classList.toggle('active', crossSectionActive);

  if (crossSectionActive) {
    updateCrossSectionSweepRange();
    onCrossSectionChange();
  } else {
    viewer.clearClipPlane();
  }
}

function onCrossSectionChange() {
  if (!crossSectionActive) return;

  const rot = +document.getElementById('csRotSlider').value;
  const tilt = +document.getElementById('csTiltSlider').value;
  const sweep = +document.getElementById('csSweepSlider').value;

  document.getElementById('csRotValue').textContent = rot;
  document.getElementById('csTiltValue').textContent = tilt;
  document.getElementById('csSweepValue').textContent = sweep.toFixed(1);

  const plane = computeClipPlane(rot, tilt, sweep);
  if (crossSectionFlipped) {
    plane[0] = -plane[0];
    plane[1] = -plane[1];
    plane[2] = -plane[2];
    plane[3] = -plane[3];
  }
  viewer.setClipPlane(plane);
}

function flipCrossSection() {
  crossSectionFlipped = !crossSectionFlipped;
  onCrossSectionChange();
}

function resetCrossSection() {
  crossSectionFlipped = false;
  document.getElementById('csRotSlider').value = 0;
  document.getElementById('csTiltSlider').value = 0;
  updateCrossSectionSweepRange();
  const slider = document.getElementById('csSweepSlider');
  slider.value = (+slider.min + +slider.max) / 2;
  onCrossSectionChange();
}

function updateCrossSectionSweepRange() {
  const b = parser.bounds;
  if (!b) return;
  const maxLayer = parser.layers[parser.layers.length - 1];
  const maxZ = maxLayer ? (maxLayer.zHeight || 0) : 0;

  const rot = +document.getElementById('csRotSlider').value;
  const tilt = +document.getElementById('csTiltSlider').value;
  const [nx, ny, nz] = computeClipPlane(rot, tilt, 0);

  // Project all 8 bounding box corners onto the normal to find sweep range
  const corners = [
    [b.minX, b.minY, 0], [b.maxX, b.minY, 0],
    [b.minX, b.maxY, 0], [b.maxX, b.maxY, 0],
    [b.minX, b.minY, maxZ], [b.maxX, b.minY, maxZ],
    [b.minX, b.maxY, maxZ], [b.maxX, b.maxY, maxZ],
  ];
  let sMin = Infinity, sMax = -Infinity;
  for (const [cx, cy, cz] of corners) {
    const proj = nx * cx + ny * cy + nz * cz;
    if (proj < sMin) sMin = proj;
    if (proj > sMax) sMax = proj;
  }

  const slider = document.getElementById('csSweepSlider');
  slider.min = sMin.toFixed(1);
  slider.max = sMax.toFixed(1);
  slider.value = ((sMin + sMax) / 2).toFixed(1);
  slider.step = '0.1';
}

// ===== Printer Profile Panel =====

function togglePrinterProfile() {
  const panel = document.getElementById('printerProfilePanel');
  panel.classList.toggle('collapsed');
}

function applyPrinterProfile() {
  motionAnalyzer.profile.acceleration = parseFloat(document.getElementById('profileAccel').value);
  motionAnalyzer.profile.jerk = parseFloat(document.getElementById('profileJerk').value);
  motionAnalyzer.profile.firmwareType = document.getElementById('profileFirmware').value;

  motionAnalyzer.analyzeAllLayers(parser.layerMoves);
  heatmapLayerStats = {};
  viewer.clearBuffers();
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
  showToast('Profile applied, motion re-analyzed', 'success');
}

function resetPrinterProfile() {
  const inferred = MotionAnalyzer.inferProfile(parser.lines);
  Object.assign(motionAnalyzer.profile, inferred);

  document.getElementById('profileAccel').value = motionAnalyzer.profile.acceleration;
  document.getElementById('profileJerk').value = motionAnalyzer.profile.jerk;
  document.getElementById('profileFirmware').value = motionAnalyzer.profile.firmwareType;

  motionAnalyzer.analyzeAllLayers(parser.layerMoves);
  heatmapLayerStats = {};
  viewer.clearBuffers();
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
  showToast('Profile reset to inferred values', 'success');
}

function showEditInfoPanel(move) {
  const panel = document.getElementById('editInfoPanel');
  const lineText = document.getElementById('editLineText');
  const lineMeta = document.getElementById('editLineMeta');
  const paramsContainer = document.getElementById('editParamsContainer');
  const applyBtn = document.getElementById('editApplyBtn');
  const rawLine = parser.lines[move.lineIndex] || '';
  const typeLabel = MOTION_TYPE_LABELS[move.type] || move.type;

  lineText.textContent = rawLine.trim();
  lineMeta.textContent = `Line ${move.lineIndex + 1} \u00b7 ${typeLabel} \u00b7 ${move.extrude ? 'Extrusion' : 'Travel'}`;

  // Parse parameters and build input fields
  const parsed = parseGcodeParams(rawLine);
  editOriginalParams = parsed;
  editCurrentParams = {
    command: parsed.command,
    params: parsed.params.map(p => ({ ...p })),
    comment: parsed.comment,
  };

  paramsContainer.innerHTML = '';
  for (let i = 0; i < editCurrentParams.params.length; i++) {
    const p = editCurrentParams.params[i];
    const div = document.createElement('div');
    div.className = 'edit-param';
    const label = document.createElement('label');
    label.textContent = p.letter;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = p.precision > 0 ? (1 / Math.pow(10, p.precision)).toString() : '1';
    input.value = p.value;
    input.dataset.paramIndex = i;
    input.addEventListener('input', onEditParamInput);
    input.addEventListener('keydown', onEditParamKeydown);
    div.appendChild(label);
    div.appendChild(input);
    paramsContainer.appendChild(div);
  }

  // Show Apply button only if there are editable params
  applyBtn.style.display = editCurrentParams.params.length > 0 ? '' : 'none';

  panel.classList.add('visible');
}

function onEditParamInput(e) {
  const idx = parseInt(e.target.dataset.paramIndex);
  const newVal = parseFloat(e.target.value);
  if (isNaN(newVal)) return;
  editCurrentParams.params[idx].value = newVal;

  // Update raw line preview
  const lineText = document.getElementById('editLineText');
  lineText.textContent = buildGcodeLine(editCurrentParams.command, editCurrentParams.params, editCurrentParams.comment);

  // Mark field as changed if different from original
  const origVal = editOriginalParams.params[idx].value;
  e.target.classList.toggle('changed', Math.abs(newVal - origVal) > 1e-9);

  // Trigger live preview in viewer
  updateEditPreview();
}

function onEditParamKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    applyEditParams();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelEditSelection();
  }
}

function updateEditPreview() {
  if (!editSelectedMove || !editCurrentParams || !editOriginalParams) {
    editPreviewParams = null;
    return;
  }
  // Check if X or Y changed
  const origX = editOriginalParams.params.find(p => p.letter === 'X');
  const origY = editOriginalParams.params.find(p => p.letter === 'Y');
  const curX = editCurrentParams.params.find(p => p.letter === 'X');
  const curY = editCurrentParams.params.find(p => p.letter === 'Y');

  const xChanged = origX && curX && Math.abs(origX.value - curX.value) > 1e-9;
  const yChanged = origY && curY && Math.abs(origY.value - curY.value) > 1e-9;

  if (!xChanged && !yChanged) {
    editPreviewParams = null;
  } else {
    editPreviewParams = {
      x2: curX ? curX.value : editSelectedMove.x2,
      y2: curY ? curY.value : editSelectedMove.y2,
    };
  }

  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function hideEditInfoPanel() {
  const panel = document.getElementById('editInfoPanel');
  if (panel) panel.classList.remove('visible');
}

function cancelEditSelection() {
  editSelectedMove = null;
  editOriginalParams = null;
  editCurrentParams = null;
  editPreviewParams = null;
  editSelectedMoves = [];
  editSelectionBounds = null;
  editTransformState = null;
  hideEditInfoPanel();
  hideTransformPanel();
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

async function applyEditParams() {
  if (!editSelectedMove || !editCurrentParams || !editOriginalParams) return;

  // Validate all params are numeric
  for (const p of editCurrentParams.params) {
    if (typeof p.value !== 'number' || isNaN(p.value)) {
      showToast('Invalid value for ' + p.letter, 'error');
      return;
    }
  }

  const lineIdx = editSelectedMove.lineIndex;
  const oldLine = parser.lines[lineIdx];
  const newLine = buildGcodeLine(editCurrentParams.command, editCurrentParams.params, editCurrentParams.comment);

  // No change — do nothing
  if (oldLine.trim() === newLine.trim()) {
    showToast('No changes', 'info');
    return;
  }

  // Check if E value changed for E-repair
  const oldE = editOriginalParams.params.find(p => p.letter === 'E');
  const newE = editCurrentParams.params.find(p => p.letter === 'E');
  const oldEVal = oldE ? oldE.value : null;
  const newEVal = newE ? newE.value : null;
  const repairs = (oldEVal !== null && newEVal !== null && Math.abs(oldEVal - newEVal) > 1e-9)
    ? computeERepairForEdit(parser.lines, lineIdx, oldEVal, newEVal)
    : [];

  // Push undo entry
  pushEditUndo({
    type: 'line-edit',
    layer: selectedLayer,
    lineIndex: lineIdx,
    oldLine: oldLine,
    newLine: newLine,
    eRepairs: repairs,
  });

  // Apply E-value repairs
  for (const r of repairs) {
    parser.lines[r.lineIndex] = r.patched;
  }

  // Replace the line
  parser.lines[lineIdx] = newLine;

  // Clear preview state
  editPreviewParams = null;

  // Clear selection and re-render
  const layerNum = selectedLayer;
  editSelectedMove = null;
  editHoveredMove = null;
  editOriginalParams = null;
  editCurrentParams = null;
  hideEditInfoPanel();

  await reparseAndRender(layerNum, `Modified line ${lineIdx + 1}`);
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

function getActiveEditModifications() {
  return editUndoStack.entries
    .slice(0, editUndoStack.index + 1)
    .filter(e => e.type === 'line-edit');
}

function parseGcodeParams(line) {
  const trimmed = line.trim();
  // Extract comment if present
  const commentIdx = trimmed.indexOf(';');
  const codePart = commentIdx >= 0 ? trimmed.substring(0, commentIdx) : trimmed;
  const comment = commentIdx >= 0 ? trimmed.substring(commentIdx) : '';
  // Extract command (G0, G1, G2, G3, M82, etc.)
  const cmdMatch = codePart.match(/^([GM]\d+)/i);
  const command = cmdMatch ? cmdMatch[1].toUpperCase() : '';
  // Extract parameters
  const params = [];
  const paramRegex = /([A-Z])([-\d.]+)/gi;
  let m;
  // Skip the command itself in parameter extraction
  const paramStr = cmdMatch ? codePart.substring(cmdMatch[0].length) : codePart;
  while ((m = paramRegex.exec(paramStr)) !== null) {
    const letter = m[1].toUpperCase();
    const raw = m[2];
    const dotIdx = raw.indexOf('.');
    const precision = dotIdx >= 0 ? raw.length - dotIdx - 1 : 0;
    params.push({ letter, value: parseFloat(raw), precision, raw });
  }
  return { command, params, comment };
}

function buildGcodeLine(command, params, comment) {
  let line = command;
  for (const p of params) {
    const val = typeof p.value === 'number' && !isNaN(p.value)
      ? p.value.toFixed(p.precision)
      : p.raw;
    line += ' ' + p.letter + val;
  }
  if (comment) line += ' ' + comment;
  return line;
}

function showTransformPanel() {
  const panel = document.getElementById('transformPanel');
  document.getElementById('transformCount').textContent = editSelectedMoves.length + ' moves selected';
  // Reset fields to identity
  document.getElementById('transformTX').value = '0';
  document.getElementById('transformTY').value = '0';
  document.getElementById('transformAngle').value = '0';
  document.getElementById('transformScale').value = '100';
  document.getElementById('mirrorXBtn').classList.remove('active');
  document.getElementById('mirrorYBtn').classList.remove('active');
  editTransformState = { translateX: 0, translateY: 0, angle: 0, scale: 1, mirrorX: false, mirrorY: false };
  panel.classList.add('visible');
}

function hideTransformPanel() {
  const panel = document.getElementById('transformPanel');
  if (panel) panel.classList.remove('visible');
  editTransformState = null;
}

function onTransformInput() {
  if (!editTransformState) return;
  const tx = parseFloat(document.getElementById('transformTX').value) || 0;
  const ty = parseFloat(document.getElementById('transformTY').value) || 0;
  const angle = parseFloat(document.getElementById('transformAngle').value) || 0;
  const scalePercent = parseFloat(document.getElementById('transformScale').value) || 100;
  editTransformState.translateX = tx;
  editTransformState.translateY = ty;
  editTransformState.angle = angle;
  editTransformState.scale = scalePercent / 100;
  // Mark changed fields
  document.getElementById('transformTX').classList.toggle('changed', tx !== 0);
  document.getElementById('transformTY').classList.toggle('changed', ty !== 0);
  document.getElementById('transformAngle').classList.toggle('changed', angle !== 0);
  document.getElementById('transformScale').classList.toggle('changed', scalePercent !== 100);
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function toggleMirrorX() {
  if (!editTransformState) return;
  editTransformState.mirrorX = !editTransformState.mirrorX;
  document.getElementById('mirrorXBtn').classList.toggle('active', editTransformState.mirrorX);
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function toggleMirrorY() {
  if (!editTransformState) return;
  editTransformState.mirrorY = !editTransformState.mirrorY;
  document.getElementById('mirrorYBtn').classList.toggle('active', editTransformState.mirrorY);
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function clearMultiSelection() {
  editSelectedMoves = [];
  editSelectionBounds = null;
  editTransformState = null;
  hideTransformPanel();
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function cancelTransform() {
  clearMultiSelection();
}

async function applyTransform() {
  if (editSelectedMoves.length < 2 || !editTransformState || !editSelectionBounds) return;

  const t = editTransformState;
  if (t.translateX === 0 && t.translateY === 0 && t.angle === 0 && t.scale === 1 && !t.mirrorX && !t.mirrorY) {
    showToast('No changes', 'info');
    return;
  }

  const edits = [];
  let skipped = 0;

  for (const move of editSelectedMoves) {
    const lineIdx = move.lineIndex;
    const oldLine = parser.lines[lineIdx];
    const newLine = transformGcodeLine(oldLine, move, editSelectionBounds, editTransformState);
    if (newLine === null) {
      skipped++;
      continue;
    }
    if (oldLine.trim() !== newLine.trim()) {
      edits.push({ lineIndex: lineIdx, oldLine, newLine });
    }
  }

  if (edits.length === 0) {
    showToast('No changes to apply' + (skipped > 0 ? ` (${skipped} moves skipped — no X/Y)` : ''), 'info');
    return;
  }

  pushEditUndo({
    type: 'multi-transform',
    layer: selectedLayer,
    edits: edits,
  });

  for (const edit of edits) {
    parser.lines[edit.lineIndex] = edit.newLine;
  }

  const count = edits.length;

  editSelectedMoves = [];
  editSelectionBounds = null;
  editTransformState = null;
  hideTransformPanel();

  await reparseAndRender(selectedLayer, `Transformed ${count} move${count !== 1 ? 's' : ''}`);
  if (skipped > 0) {
    showToast(`Transformed ${count} moves (${skipped} skipped — no X/Y)`, 'success');
  }
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
  else if (entry.type === 'line-edit') {
    // Revert E-repairs (in reverse order)
    for (let i = entry.eRepairs.length - 1; i >= 0; i--) {
      const r = entry.eRepairs[i];
      parser.lines[r.lineIndex] = r.original;
    }
    // Restore original line
    parser.lines[entry.lineIndex] = entry.oldLine;

    editSelectedMove = null;
    editHoveredMove = null;
    editOriginalParams = null;
    editCurrentParams = null;
    editPreviewParams = null;
    hideEditInfoPanel();
    await reparseAndRender(selectedLayer, 'Undo: restored original line');
  }
  else if (entry.type === 'multi-transform') {
    for (const edit of entry.edits) {
      parser.lines[edit.lineIndex] = edit.oldLine;
    }
    editSelectedMoves = [];
    editSelectionBounds = null;
    editTransformState = null;
    hideTransformPanel();
    editSelectedMove = null;
    editHoveredMove = null;
    hideEditInfoPanel();
    await reparseAndRender(selectedLayer, 'Undo: restored transformed moves');
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
  else if (entry.type === 'line-edit') {
    // Re-apply E-repairs
    for (const r of entry.eRepairs) {
      parser.lines[r.lineIndex] = r.patched;
    }
    // Re-apply the edited line
    parser.lines[entry.lineIndex] = entry.newLine;

    editSelectedMove = null;
    editHoveredMove = null;
    editOriginalParams = null;
    editCurrentParams = null;
    editPreviewParams = null;
    hideEditInfoPanel();
    await reparseAndRender(selectedLayer, 'Redo: re-applied edit');
  }
  else if (entry.type === 'multi-transform') {
    for (const edit of entry.edits) {
      parser.lines[edit.lineIndex] = edit.newLine;
    }
    editSelectedMoves = [];
    editSelectionBounds = null;
    editTransformState = null;
    hideTransformPanel();
    editSelectedMove = null;
    editHoveredMove = null;
    hideEditInfoPanel();
    await reparseAndRender(selectedLayer, 'Redo: re-applied transform');
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
  // Add engine overlays dynamically
  for (const overlay of analysisManager.getSupportedOverlays()) {
    modeOptions.push([overlay.id, overlay.label + (overlay.unit ? ' (' + overlay.unit + ')' : '')]);
  }
  modeOptions.sort((a, b) => a[1].localeCompare(b[1]));
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
    let unitLabel = 'mm\u00B3/s';
    if (colorMode === 'speed' || colorMode === 'actual-speed') unitLabel = 'mm/s';
    else if (colorMode === 'acceleration') unitLabel = 'mm/s\u00B2';
    else if (colorMode === 'speed-delta') unitLabel = '%';
    else {
      const overlay = analysisManager.getSupportedOverlays().find(o => o.id === colorMode);
      if (overlay) unitLabel = overlay.unit || '';
    }

    const overlayDef = analysisManager.getSupportedOverlays().find(o => o.id === colorMode);
    const isInverted = overlayDef?.invert || false;
    const mult = (colorMode === 'speed-delta' || unitLabel === '%') ? 100 : 1;
    const barStyle = isInverted ? ' style="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff)"' : '';
    const leftLabel = (stats.min * mult).toFixed(1);
    const rightLabel = (stats.max * mult).toFixed(1);
    html += `<div class="heatmap-gradient">
      <div class="heatmap-bar"${barStyle}></div>
      <div class="heatmap-labels">
        <span>${leftLabel}</span>
        <span>${unitLabel}</span>
        <span>${rightLabel}</span>
      </div>
    </div>`;
    html += `<div class="heatmap-stats">
      <div>Min: <strong>${(stats.min * mult).toFixed(1)}</strong> ${unitLabel}</div>
      <div>Avg: <strong>${(stats.avg * mult).toFixed(1)}</strong> ${unitLabel}</div>
      <div>Max: <strong>${(stats.max * mult).toFixed(1)}</strong> ${unitLabel}</div>
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
    // Analyze motion (infer profile from parsed lines, then analyze)
    const inferredProfile = MotionAnalyzer.inferProfile(parser.lines);
    Object.assign(motionAnalyzer.profile, inferredProfile);
    motionAnalyzer.analyzeAllLayers(parser.layerMoves);
    // Populate printer profile panel with inferred values
    document.getElementById('profileAccel').value = motionAnalyzer.profile.acceleration;
    document.getElementById('profileJerk').value = motionAnalyzer.profile.jerk;
    document.getElementById('profileFirmware').value = motionAnalyzer.profile.firmwareType;

    // Run eager analysis (motion + flow only; others run on demand)
    runEagerAnalysis();

    // Update analysis panel material dropdown
    const inferredMaterial = inferMaterial(parser.lines);
    const materialSelect = document.getElementById('analysisMaterialType');
    if (materialSelect) materialSelect.value = inferredMaterial;
    const inferredLabel = document.getElementById('analysisMaterialInferred');
    if (inferredLabel) inferredLabel.textContent = '(inferred: ' + inferredMaterial + ')';
    const printerInfo = document.getElementById('analysisPrinterInfo');
    if (printerInfo) printerInfo.textContent = motionAnalyzer.profile.firmwareType + ' (inferred)';

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
  for (const edit of getActiveEditModifications()) {
    moddedLayers.add(edit.layer);
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
  } else if (currentView === 'warp') {
    viewer.maxVisibleLayer = num;
    viewer._clearWarpMesh(); // Invalidate cached mesh for new layer
    viewer.render(num);
    updateViewerOverlay(num);
    updateWarpLegend();
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

// ===== ANALYSIS PANEL =====

function renderAnalysisPanel() {
  const container = document.getElementById('analysisResults');
  if (!container) return;

  if (!parser.layers || parser.layers.length === 0) {
    container.innerHTML = '<div class="analysis-empty">Load a G-code file and run analysis</div>';
    return;
  }

  const findings = analysisManager.getAllFindings();
  if (findings.length === 0) {
    container.innerHTML = '<div class="analysis-empty">No issues found. Run analysis to scan for potential problems.</div>';
    return;
  }

  // Group findings by engine
  const grouped = {};
  for (const f of findings) {
    if (!grouped[f.engine]) grouped[f.engine] = [];
    grouped[f.engine].push(f);
  }

  const ENGINE_LABELS = { motion: 'Motion Reality', structural: 'Structural Integrity', thermal: 'Thermal Dynamics', retraction: 'Retraction Quality', flow: 'Flow Rate' };
  const SEVERITY_ICON = { critical: '\u2B24', warning: '\u26A0', info: '\u2139' };
  const SEVERITY_CLASS = { critical: 'severity-critical', warning: 'severity-warning', info: 'severity-info' };

  let html = '';

  // Print time summary
  if (typeof motionAnalyzer !== 'undefined' && motionAnalyzer.getTimeSummary) {
    const ts = motionAnalyzer.getTimeSummary();
    if (ts && ts.totalTime > 0) {
      const hours = Math.floor(ts.totalTime / 3600);
      const mins = Math.floor((ts.totalTime % 3600) / 60);
      const secs = Math.floor(ts.totalTime % 60);
      const timeStr = hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm ' + secs + 's';
      html += '<div class="analysis-time-summary">' +
        '<strong>Estimated Print Time:</strong> ' + timeStr +
        '<div class="time-breakdown">' +
          '<span>Walls: ' + Math.floor(ts.byType.wall / 60) + 'm</span>' +
          '<span>Infill: ' + Math.floor(ts.byType.infill / 60) + 'm</span>' +
          '<span>Travel: ' + Math.floor(ts.byType.travel / 60) + 'm</span>' +
          '<span>Support: ' + Math.floor(ts.byType.support / 60) + 'm</span>' +
        '</div>' +
      '</div>';
    }
  }

  for (const [engineName, engineFindings] of Object.entries(grouped)) {
    const label = ENGINE_LABELS[engineName] || engineName;
    html += '<div class="analysis-engine">' +
      '<div class="analysis-engine-header" onclick="toggleAnalysisEngine(\'' + engineName + '\')">' +
        '<span class="toggle-icon">\u25BC</span>' +
        '<strong>' + label + '</strong>' +
        '<span class="finding-count">' + engineFindings.length + ' finding' + (engineFindings.length !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      '<div class="analysis-engine-body" id="analysis-engine-' + engineName + '">';

    for (const finding of engineFindings) {
      const icon = SEVERITY_ICON[finding.severity] || '';
      const cls = SEVERITY_CLASS[finding.severity] || '';
      const desc = (finding.description || '').replace(/"/g, '&quot;');
      const suggestion = (finding.suggestion || '').replace(/"/g, '&quot;');
      const tipDesc = (finding.description || '').replace(/</g, '&lt;');
      const tipSugg = (finding.suggestion || '').replace(/</g, '&lt;');
      html += '<div class="analysis-finding ' + cls + '" onclick="navigateToFinding(\'' + finding.id + '\')">' +
        '<span class="finding-icon">' + icon + '</span>' +
        '<div class="finding-text">' +
          '<div class="finding-title">' + finding.title + '</div>' +
          '<div class="finding-desc">' + desc + '</div>' +
          '<div class="finding-tooltip">' +
            '<div class="finding-tooltip-desc">' + tipDesc + '</div>' +
            (tipSugg ? '<div class="finding-tooltip-suggestion"><strong>Suggestion:</strong> ' + tipSugg + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<span class="finding-layer">L' + finding.location.layer + '</span>' +
      '</div>';
    }

    html += '</div></div>';
  }

  container.innerHTML = html;
}

function toggleAnalysisEngine(engineName) {
  const body = document.getElementById('analysis-engine-' + engineName);
  if (body) body.classList.toggle('collapsed');
}

function toggleAnalysisThresholds() {
  const panel = document.getElementById('analysisThresholds');
  if (panel) panel.classList.toggle('collapsed');
  renderThresholds();
}

function renderThresholds() {
  const container = document.getElementById('thresholdsContent');
  if (!container) return;

  const thresholds = analysisProfile.thresholds;

  const DEFS = [
    {
      group: 'Layer Bond',
      hint: 'How well layers stick together. Lower values = weaker bond.',
      items: [
        { key: 'layer-bond-overlap', label: 'Overlap %', hint: 'Fraction of extrusion overlapping layer below (0\u20131)',
          fields: [{ level: 'warning', prefix: 'Warn below' }, { level: 'critical', prefix: 'Critical below' }] },
        { key: 'layer-bond-cooling', label: 'Layer time (s)', hint: 'Total time to print a layer before next layer arrives',
          fields: [{ level: 'warning', prefix: 'Warn below' }, { level: 'critical', prefix: 'Critical below' }] },
      ],
    },
    {
      group: 'Wall Integrity',
      hint: 'Structural quality of perimeter walls.',
      items: [
        { key: 'wall-seam-alignment', label: 'Seam cluster radius (mm)', hint: 'How close seam starts must be to count as aligned',
          fields: [{ level: 'warning', prefix: 'Detect within' }] },
        { key: 'wall-gap-size', label: 'Perimeter gap (mm)', hint: 'Distance between wall extrusions where material is missing',
          fields: [{ level: 'warning', prefix: 'Warn above' }, { level: 'critical', prefix: 'Critical above' }] },
      ],
    },
    {
      group: 'Extrusion',
      hint: 'Consistency of material flow.',
      items: [
        { key: 'extrusion-consistency', label: 'Flow deviation', hint: 'Fraction deviation from mean flow rate (e.g. 0.15 = 15%)',
          fields: [{ level: 'warning', prefix: 'Warn above' }] },
      ],
    },
  ];

  let html = '';
  for (const group of DEFS) {
    html += '<div class="threshold-group">';
    html += '<div class="threshold-group-title">' + group.group + '</div>';
    html += '<div class="threshold-group-hint">' + group.hint + '</div>';
    for (const item of group.items) {
      const values = thresholds[item.key] || {};
      html += '<div class="threshold-row"><label title="' + item.hint + '">' + item.label + '</label>';
      for (const f of item.fields) {
        if (values[f.level] !== undefined) {
          html += ' <span class="text-dim" style="font-size:9px">' + f.prefix + '</span>' +
            '<input type="number" step="0.1" value="' + values[f.level] + '" ' +
            'onchange="updateThreshold(\'' + item.key + '\',\'' + f.level + '\',+this.value)" ' +
            'class="threshold-input" title="' + f.prefix + ' ' + values[f.level] + '">';
        }
      }
      html += '</div>';
    }
    html += '</div>';
  }
  container.innerHTML = html;
}

function updateThreshold(key, level, value) {
  if (!analysisProfile.thresholds[key]) analysisProfile.thresholds[key] = {};
  analysisProfile.thresholds[key][level] = value;
}

function onMaterialChange(type) {
  const stored = JSON.parse(localStorage.getItem('gcode_custom_materials') || '[]');
  const custom = stored.find(m => m.name === type);
  if (custom) {
    analysisProfile.material = custom;
  } else {
    analysisProfile.material = getMaterialProfile(type);
  }
  analysisProfile._manualMaterial = true;
  const inferred = document.getElementById('analysisMaterialInferred');
  if (inferred) inferred.textContent = '(manual)';
}

function loadMaterialProfileFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const custom = JSON.parse(e.target.result);
      if (!custom.name) {
        showToast('Custom profile must have a "name" field', 0, 'error');
        return;
      }
      // Inherit from base material if specified
      let base = {};
      if (custom.base && MATERIAL_PROFILES[custom.base]) {
        base = { ...MATERIAL_PROFILES[custom.base] };
      }
      const merged = { ...base, ...custom, type: custom.name };

      // Warn on out-of-range thermal values
      if (merged.thermalConductivity && (merged.thermalConductivity < 0.01 || merged.thermalConductivity > 1.0)) {
        showToast('Warning: thermalConductivity seems unusual (expected 0.01-1.0)', 5000, 'error');
      }
      if (merged.specificHeatCapacity && (merged.specificHeatCapacity < 500 || merged.specificHeatCapacity > 3000)) {
        showToast('Warning: specificHeatCapacity seems unusual (expected 500-3000)', 5000, 'error');
      }

      // Store in localStorage
      const stored = JSON.parse(localStorage.getItem('gcode_custom_materials') || '[]');
      const existingIdx = stored.findIndex(m => m.name === custom.name);
      if (existingIdx >= 0) stored[existingIdx] = merged;
      else stored.push(merged);
      localStorage.setItem('gcode_custom_materials', JSON.stringify(stored));

      analysisProfile.material = merged;
      analysisProfile._manualMaterial = true;
      showToast('Material profile "' + custom.name + '" loaded');
      renderCustomMaterials();
    } catch (err) {
      showToast('Invalid JSON profile: ' + err.message, 0, 'error');
    }
  };
  reader.readAsText(file);
}

function renderCustomMaterials() {
  const select = document.getElementById('analysisMaterialType');
  if (!select) return;
  // Remove existing custom group
  const existingGroup = select.querySelector('optgroup[label="Custom"]');
  if (existingGroup) existingGroup.remove();
  // Add custom materials from localStorage
  const stored = JSON.parse(localStorage.getItem('gcode_custom_materials') || '[]');
  if (stored.length === 0) return;
  const group = document.createElement('optgroup');
  group.label = 'Custom';
  for (const mat of stored) {
    const opt = document.createElement('option');
    opt.value = mat.name;
    opt.textContent = mat.name;
    group.appendChild(opt);
  }
  select.appendChild(group);
}

function onAnalysisDepthChange(value) {
  const v = parseInt(value, 10);
  if (!analysisProfile.thermal) analysisProfile.thermal = {};
  analysisProfile.thermal.depth = v;
  const label = document.getElementById('analysisDepthLabel');
  if (label) {
    if (v <= 33) label.textContent = 'Fast';
    else if (v <= 66) label.textContent = 'Balanced';
    else label.textContent = 'Thorough';
  }
}

function onChamberTypeChange(value) {
  if (!analysisProfile.environment) analysisProfile.environment = {};
  analysisProfile.environment.chamberType = value;
}

function navigateToFinding(findingId) {
  const findings = analysisManager.getAllFindings();
  const finding = findings.find(function(f) { return f.id === findingId; });
  if (!finding || !finding.location) return;

  if (currentView !== 'visual') setView('visual');

  const slider = document.getElementById('layerSlider');
  if (slider) {
    slider.value = finding.location.layer;
    onSliderChange(finding.location.layer);
  }

  if (finding.location.xyz && typeof viewer.flyTo === 'function') {
    viewer.flyTo(finding.location.xyz.x, finding.location.xyz.y, finding.location.xyz.z);
  }
}

// ===== TAB SWITCHING =====
async function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.toggle('active', tc.id === 'tab-' + tabName));

  if (tabName === 'analysis') {
    if (!analysisManager.isAllAnalyzed()) {
      const container = document.getElementById('analysisResults');
      if (container) {
        container.innerHTML = '<div class="analysis-progress"><div class="bar-label" id="analysisLabel">Analyzing...</div><div class="bar-wrap"><div class="bar-fill" id="analysisBar" style="width:0%"></div></div></div>';
      }
      const ENGINE_LABELS = { structural: 'Structural', thermal: 'Thermal', retraction: 'Retraction', motion: 'Motion', flow: 'Flow' };
      await analysisManager.ensureAllAnalyzedAsync((info) => {
        const label = document.getElementById('analysisLabel');
        const bar = document.getElementById('analysisBar');
        if (label) label.textContent = 'Analyzing ' + (ENGINE_LABELS[info.engine] || info.engine) + '... ' + (info.overall * 100).toFixed(0) + '%';
        if (bar) bar.style.width = (info.overall * 100).toFixed(0) + '%';
      });
    }
    renderAnalysisPanel();
    renderCustomMaterials();
  }
  if (tabName === 'cooling') {
    renderFanRules();
    renderFanCurve();
  }
  if (tabName === 'pa-tuner') {
    renderPaTuner();
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

  // Build sidebar
  let sidebarHtml = '';
  categories.forEach(cat => {
    const catId = 'ref-cat-' + cat.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    sidebarHtml += '<a class="ref-sidebar-item" data-cat="' + catId + '" onclick="scrollToRefCategory(\'' + catId + '\')">' + cat + '</a>';
  });
  document.getElementById('refSidebar').innerHTML = sidebarHtml;

  // Build cards
  let html = '';
  categories.forEach(cat => {
    const catId = 'ref-cat-' + cat.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    html += '<div class="ref-category" data-category="' + cat + '" id="' + catId + '">';
    html += '<div class="ref-category-header" onclick="this.parentElement.classList.toggle(\'collapsed\')">' + cat + '</div>';
    html += '<div class="ref-category-cards">';
    catMap[cat].forEach(cmd => {
      const fwNote = cmd.firmware[fw];
      const searchFw = cmd.supportedBy ? ' ' + cmd.supportedBy.join(' ') : '';
      html += '<div class="ref-card" data-search="' + (cmd.code + ' ' + cmd.name + ' ' + cmd.description + searchFw).toLowerCase().replace(/"/g, '&quot;') + '">';
      let badgeHtml = '';
      if (cmd.supportedBy) {
        badgeHtml = '<span class="ref-fw-badges">';
        const FW_NAMES = { bambu: 'Bambu', klipper: 'Klipper', marlin: 'Marlin', rrf: 'RRF' };
        cmd.supportedBy.forEach(fw => {
          badgeHtml += '<span class="ref-fw-badge" data-fw="' + fw + '">' + (FW_NAMES[fw] || fw) + '</span>';
        });
        badgeHtml += '</span>';
      }
      const canInsertAtCursor = selectedLayer !== null && parser.lines;
      html += '<div class="ref-card-head"><span class="ref-card-code">' + cmd.code + '</span><span class="ref-card-name">' + cmd.name + '</span>' + badgeHtml;
      html += '<span class="ref-card-actions">';
      html += '<button class="ref-card-insert" onclick="insertRefCommand(\'' + cmd.code.replace(/'/g, "\\'") + '\');event.stopPropagation()" title="Insert into Custom G-code tab">Insert</button>';
      html += '<button class="ref-card-insert' + (canInsertAtCursor ? '' : ' disabled') + '" onclick="insertRefCommandAtCursor(\'' + cmd.code.replace(/'/g, "\\'") + '\');event.stopPropagation()" title="' + (canInsertAtCursor ? 'Insert at current layer' : 'Load a file and select a layer first') + '">Insert at Cursor</button>';
      html += '</span></div>';
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

  // Set up intersection observer for sidebar active tracking
  setupRefSidebarObserver();
}

function scrollToRefCategory(catId) {
  const el = document.getElementById(catId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

let _refObserver = null;
function setupRefSidebarObserver() {
  if (_refObserver) _refObserver.disconnect();
  const cardsArea = document.querySelector('.ref-cards-area');
  if (!cardsArea) return;

  const catHeaders = cardsArea.querySelectorAll('.ref-category');
  if (catHeaders.length === 0) return;

  _refObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const catId = entry.target.id;
        document.querySelectorAll('.ref-sidebar-item').forEach(item => {
          item.classList.toggle('active', item.dataset.cat === catId);
        });
      }
    });
  }, {
    root: cardsArea,
    rootMargin: '0px 0px -80% 0px',
    threshold: 0
  });

  catHeaders.forEach(cat => _refObserver.observe(cat));
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

  // Also filter sidebar items
  document.querySelectorAll('.ref-sidebar-item').forEach(item => {
    const catEl = document.getElementById(item.dataset.cat);
    item.style.display = catEl && catEl.style.display !== 'none' ? '' : 'none';
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

  // Auto-expand right panel if collapsed
  const panelRight = document.getElementById('panelRight');
  if (panelRight && panelRight.offsetWidth < 50) {
    panelRight.style.width = '400px';
  }

  switchTab('custom');
  const textarea = document.getElementById('customGcode');
  textarea.value = cmd.template;
  const layerInput = document.getElementById('customLayer');
  if (selectedLayer != null && layerInput.value === '') {
    layerInput.value = selectedLayer;
  }
  showToast(cmd.code + ' inserted into Custom G-code tab', 'success');
}

function insertRefCommandAtCursor(code) {
  const cmd = GCODE_REFERENCE.find(c => c.code === code);
  if (!cmd) return;
  if (selectedLayer === null || !parser.lines) {
    showToast('Select a layer first to insert at cursor', 'warning');
    return;
  }

  const layer = parser.getLayerByNumber(selectedLayer);
  if (!layer) { showToast('Layer not found', 'error'); return; }

  // Insert command at end of selected layer's block
  modifier.addCustom(selectedLayer, cmd.template);
  refreshAfterMod();
  showToast(cmd.code + ' inserted at layer ' + selectedLayer, 'success');
}

// ===== COOLING TAB =====

const fanChannelVisible = { 0: true, 1: false, 2: false };
let _fanCurveInteractionInit = false;

const FAN_FEATURE_TYPES = [
  'WALL-OUTER', 'WALL-INNER', 'FILL', 'SOLID', 'TOP', 'BOTTOM',
  'SUPPORT', 'BRIDGE', 'OVERHANG', 'SKIRT', 'BRIM'
];

function renderFanRules() {
  const container = document.getElementById('fanRulesList');
  if (!container) return;
  const rules = fanProfileEngine.getRules();

  if (rules.length === 0) {
    container.innerHTML = '<div style="color:var(--text-secondary);font-size:12px;padding:8px 0">No fan rules defined. Click "+ Add Rule" to create one.</div>';
    updateFanSummary();
    return;
  }

  let html = '';
  for (const rule of rules) {
    html += '<div class="fan-rule-row" data-rule-id="' + rule.id + '">';

    // Type selector
    html += '<select class="fan-rule-type" onchange="updateFanRuleType(' + rule.id + ', this.value)">';
    html += '<option value="layer-range"' + (rule.type === 'layer-range' ? ' selected' : '') + '>Layer Range</option>';
    html += '<option value="feature-type"' + (rule.type === 'feature-type' ? ' selected' : '') + '>Feature Type</option>';
    html += '<option value="thermal"' + (rule.type === 'thermal' ? ' selected' : '') + '>Thermal</option>';
    html += '</select>';

    // Condition inputs
    html += '<div class="fan-rule-cond">';
    if (rule.type === 'layer-range') {
      const startVal = rule.startLayer ?? 0;
      const endVal = (rule.endLayer === Infinity || rule.endLayer == null) ? '' : rule.endLayer;
      html += '<input type="number" class="fan-rule-input" min="0" value="' + startVal + '" placeholder="Start" onchange="updateFanRule(' + rule.id + ', \'startLayer\', +this.value)">';
      html += '<span style="color:var(--text-secondary);font-size:11px">to</span>';
      html += '<input type="number" class="fan-rule-input" min="0" value="' + endVal + '" placeholder="End (∞)" onchange="updateFanRule(' + rule.id + ', \'endLayer\', this.value === \'\' ? Infinity : +this.value)">';
    } else if (rule.type === 'feature-type') {
      html += '<select class="fan-rule-input" onchange="updateFanRule(' + rule.id + ', \'feature\', this.value)">';
      for (const ft of FAN_FEATURE_TYPES) {
        html += '<option value="' + ft + '"' + (rule.feature === ft ? ' selected' : '') + '>' + ft + '</option>';
      }
      html += '</select>';
    } else if (rule.type === 'thermal') {
      const threshold = rule.threshold ?? 50;
      html += '<span style="color:var(--text-secondary);font-size:11px">Heat &gt;</span>';
      html += '<input type="number" class="fan-rule-input" min="0" max="100" value="' + threshold + '" onchange="updateFanRule(' + rule.id + ', \'threshold\', +this.value)">';
    }
    html += '</div>';

    // Channel selector
    html += '<select class="fan-rule-ch" onchange="updateFanRule(' + rule.id + ', \'channel\', +this.value)">';
    html += '<option value="0"' + (rule.channel === 0 ? ' selected' : '') + '>P0</option>';
    html += '<option value="1"' + (rule.channel === 1 ? ' selected' : '') + '>P1</option>';
    html += '<option value="2"' + (rule.channel === 2 ? ' selected' : '') + '>P2</option>';
    html += '</select>';

    // Speed slider
    const speed = rule.speed ?? 100;
    html += '<input type="range" class="fan-rule-slider" min="0" max="100" value="' + speed + '" oninput="updateFanRule(' + rule.id + ', \'speed\', +this.value)">';
    html += '<span class="fan-rule-pct">' + speed + '%</span>';

    // Delete button
    html += '<button class="fan-rule-del" onclick="removeFanRule(' + rule.id + ')" title="Remove rule">\u00d7</button>';

    html += '</div>';
  }

  container.innerHTML = html;
  updateFanSummary();
}

function addFanRuleUI() {
  fanProfileEngine.addRule({
    type: 'layer-range',
    startLayer: 0,
    endLayer: Infinity,
    channel: 0,
    speed: 100
  });
  renderFanRules();
  renderFanCurve();
}

function removeFanRule(id) {
  fanProfileEngine.removeRule(id);
  renderFanRules();
  renderFanCurve();
}

function updateFanRule(id, prop, value) {
  const rule = fanProfileEngine._rules.find(r => r.id === id);
  if (!rule) return;
  rule[prop] = value;
  fanProfileEngine._compiled = null;
  renderFanCurve();
  updateFanSummary();
  // Re-render rules only if speed changed (to update pct label)
  if (prop === 'speed') {
    const pctEl = document.querySelector('.fan-rule-row[data-rule-id="' + id + '"] .fan-rule-pct');
    if (pctEl) pctEl.textContent = value + '%';
  }
}

function updateFanRuleType(id, newType) {
  const oldRule = fanProfileEngine._rules.find(r => r.id === id);
  if (!oldRule) return;

  const base = { id: oldRule.id, channel: oldRule.channel, speed: oldRule.speed, type: newType };

  // Type-specific defaults
  if (newType === 'layer-range') {
    base.startLayer = 0;
    base.endLayer = Infinity;
  } else if (newType === 'feature-type') {
    base.feature = 'WALL-OUTER';
  } else if (newType === 'thermal') {
    base.threshold = 50;
  }

  // Replace in-place
  const idx = fanProfileEngine._rules.indexOf(oldRule);
  fanProfileEngine._rules[idx] = base;
  fanProfileEngine._compiled = null;

  renderFanRules();
  renderFanCurve();
}

function updateFanSummary() {
  const el = document.getElementById('fanSummary');
  if (!el) return;

  if (!parser || !parser.layers || parser.layers.length === 0) {
    el.textContent = 'Load a file first.';
    return;
  }

  const totalLayers = parser.layers.length;
  const commands = fanProfileEngine.generateGcode(totalLayers);
  let cmdCount = 0;
  for (const entry of commands) {
    cmdCount += entry.gcode.split('\n').length;
  }
  el.textContent = cmdCount + ' fan command' + (cmdCount !== 1 ? 's' : '') + ' will be inserted across ' + commands.length + ' layer' + (commands.length !== 1 ? 's' : '');
}

function applyFanProfile() {
  if (!parser || !parser.layers || parser.layers.length === 0) {
    showToast('Load a file first', 'error');
    return;
  }

  const totalLayers = parser.layers.length;
  // Compile with moves if available for feature-type rules
  const hasFeatureRules = fanProfileEngine._rules.some(r => r.type === 'feature-type');
  if (hasFeatureRules && parser.layerMoves) {
    fanProfileEngine.compileWithMoves(totalLayers, parser.layerMoves);
  } else {
    fanProfileEngine.compile(totalLayers);
  }

  const commands = fanProfileEngine.generateGcode(totalLayers);
  let cmdCount = 0;
  for (const entry of commands) {
    const lines = entry.gcode.split('\n');
    cmdCount += lines.length;
    modifier.addCustom(entry.layer, entry.gcode);
  }

  refreshAfterMod();
  showToast('Applied ' + cmdCount + ' fan command' + (cmdCount !== 1 ? 's' : ''), 'success');
}

function resetFanProfile() {
  fanProfileEngine.clearOverrides();
  renderFanRules();
  renderFanCurve();
  showToast('Fan overrides cleared', 'success');
}

// ===== FAN CURVE CANVAS =====

function renderFanCurve() {
  const canvas = document.getElementById('fanCurveCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // DPR scaling
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  // Read CSS colors
  const style = getComputedStyle(document.documentElement);
  const bgColor = style.getPropertyValue('--bg-primary').trim() || '#1a1b2e';
  const borderColor = style.getPropertyValue('--border').trim() || '#333';
  const textColor = style.getPropertyValue('--text-secondary').trim() || '#888';

  // Clear background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  const pad = { left: 32, right: 10, top: 10, bottom: 20 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const totalLayers = (parser && parser.layers && parser.layers.length > 0) ? parser.layers.length : 100;

  // Grid lines at 0%, 25%, 50%, 75%, 100%
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = textColor;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let pct = 0; pct <= 100; pct += 25) {
    const y = pad.top + plotH - (pct / 100) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillText(pct + '%', pad.left - 4, y);
  }

  // X axis labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.round(totalLayers / 5));
  for (let l = 0; l <= totalLayers; l += step) {
    const x = pad.left + (l / totalLayers) * plotW;
    ctx.fillText(l, x, pad.top + plotH + 4);
  }

  // Channel colors
  const chColors = { 0: '#60a5fa', 1: '#4ade80', 2: '#fb923c' };

  // Draw lines for each visible channel
  for (let ch = 0; ch <= 2; ch++) {
    if (!fanChannelVisible[ch]) continue;

    const compiled = fanProfileEngine.compile(totalLayers);

    ctx.strokeStyle = chColors[ch];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let l = 0; l < totalLayers; l++) {
      const speed = (compiled[l] && compiled[l][ch] != null) ? compiled[l][ch] : 0;
      const x = pad.left + (l / Math.max(totalLayers - 1, 1)) * plotW;
      const y = pad.top + plotH - (speed / 100) * plotH;
      if (l === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Draw override dots
  const overrides = fanProfileEngine.getOverrides();
  for (const [key, speed] of overrides) {
    const [layerStr, chStr] = key.split(':');
    const layerNum = Number(layerStr);
    const ch = Number(chStr);
    if (!fanChannelVisible[ch]) continue;

    const x = pad.left + (layerNum / Math.max(totalLayers - 1, 1)) * plotW;
    const y = pad.top + plotH - (speed / 100) * plotH;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = chColors[ch];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Init interaction on first render
  if (!_fanCurveInteractionInit) {
    initFanCurveInteraction();
    _fanCurveInteractionInit = true;
  }

  updateFanSummary();
  refreshFanOverlay();
}

function toggleFanChannel(ch, visible) {
  fanChannelVisible[ch] = visible;
  renderFanCurve();
}

function initFanCurveInteraction() {
  const canvas = document.getElementById('fanCurveCanvas');
  if (!canvas) return;

  function getLayerAndSpeed(e) {
    const rect = canvas.getBoundingClientRect();
    const pad = { left: 32, right: 10, top: 10, bottom: 20 };
    const plotW = rect.width - pad.left - pad.right;
    const plotH = rect.height - pad.top - pad.bottom;
    const totalLayers = (parser && parser.layers && parser.layers.length > 0) ? parser.layers.length : 100;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const layerFrac = (mx - pad.left) / plotW;
    const speedFrac = 1 - (my - pad.top) / plotH;

    const layer = Math.round(layerFrac * Math.max(totalLayers - 1, 1));
    const speed = Math.round(Math.max(0, Math.min(100, speedFrac * 100)));

    return { layer: Math.max(0, Math.min(totalLayers - 1, layer)), speed };
  }

  // Click: add override on first visible channel
  canvas.addEventListener('click', function(e) {
    const { layer, speed } = getLayerAndSpeed(e);
    let ch = -1;
    for (let c = 0; c <= 2; c++) {
      if (fanChannelVisible[c]) { ch = c; break; }
    }
    if (ch < 0) return;
    fanProfileEngine.setOverride(layer, ch, speed);
    renderFanCurve();
  });

  // Right-click: remove nearest override
  canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    const { layer } = getLayerAndSpeed(e);
    const overrides = fanProfileEngine.getOverrides();
    let bestKey = null;
    let bestDist = Infinity;
    for (const [key] of overrides) {
      const [layerStr, chStr] = key.split(':');
      const ch = Number(chStr);
      if (!fanChannelVisible[ch]) continue;
      const dist = Math.abs(Number(layerStr) - layer);
      if (dist < bestDist && dist <= 2) {
        bestDist = dist;
        bestKey = key;
      }
    }
    if (bestKey) {
      const [ls, cs] = bestKey.split(':');
      fanProfileEngine.removeOverride(Number(ls), Number(cs));
      renderFanCurve();
    }
  });

  // Mousemove: tooltip
  canvas.addEventListener('mousemove', function(e) {
    const { layer, speed } = getLayerAndSpeed(e);
    canvas.title = 'Layer ' + layer + ': ' + speed + '%';
  });
}

// ===== FAN OVERLAY PREVIEW =====

function refreshFanOverlay() {
  if (!parser || !parser.layers || parser.layers.length === 0) return;

  const totalLayers = parser.layers.length;
  const hasFeatureRules = fanProfileEngine._rules.some(r => r.type === 'feature-type');
  if (hasFeatureRules && parser.layerMoves) {
    fanProfileEngine.compileWithMoves(totalLayers, parser.layerMoves);
  } else {
    fanProfileEngine.compile(totalLayers);
  }

  // Clear cached heatmap stats so viewer picks up new fan data
  heatmapLayerStats = {};

  // If current color mode is a fan overlay, refresh the 3D view
  if (typeof colorMode !== 'undefined' && colorMode.startsWith('fan-speed')) {
    viewer.clearBuffers();
    if (currentView === 'visual') viewer.render(viewer.currentLayer);
  }
}

// ===== PA TUNING TAB =====

function renderPaTuner() {
  renderPaFirmwareInfo();
  renderPaFeatureTable();
  updatePaSummary();
}

function renderPaFirmwareInfo() {
  const el = document.getElementById('paFirmwareInfo');
  if (!el) return;
  const fw = typeof currentFirmware !== 'undefined' ? currentFirmware : 'marlin';
  const cmd = fw === 'klipper' ? 'SET_PRESSURE_ADVANCE ADVANCE=X' : 'M900 KX';
  el.textContent = 'Firmware: ' + fw + ' — uses ' + cmd;
}

function renderPaFeatureTable() {
  const container = document.getElementById('paFeatureTable');
  if (!container) return;

  if (typeof motionAnalyzer === 'undefined' || !motionAnalyzer.results || motionAnalyzer.results.size === 0) {
    container.innerHTML = '<div style="opacity:0.5;font-size:12px;padding:8px">Load a file to see motion types</div>';
    return;
  }

  const hints = paTuner.gatherSpeedHints(motionAnalyzer.results);
  const types = Object.keys(hints).sort();

  if (types.length === 0) {
    container.innerHTML = '<div style="opacity:0.5;font-size:12px;padding:8px">No extrusion moves found</div>';
    return;
  }

  const overrides = paTuner.getFeatureOverrides();

  container.innerHTML = types.map(type => {
    const hint = hints[type];
    const speedStr = hint.min === hint.max
      ? Math.round(hint.min) + ' mm/s'
      : Math.round(hint.min) + '-' + Math.round(hint.max) + ' mm/s';
    const kVal = type in overrides ? overrides[type] : paTuner.baseK;
    return '<div class="pa-feature-row">' +
      '<span class="pa-type-name" title="' + type + '">' + type + '</span>' +
      '<span class="pa-speed-hint">' + speedStr + '</span>' +
      '<input type="number" class="input" min="0" max="0.2" step="0.001" value="' + kVal.toFixed(3) + '"' +
      ' onchange="updatePaFeatureK(\'' + type.replace(/'/g, "\\'") + '\', this.value)">' +
      '</div>';
  }).join('');
}

function updatePaBaseK(val) {
  const k = parseFloat(val) || 0;
  paTuner.setBaseK(k);
  renderPaFeatureTable();
  updatePaSummary();
}

function updatePaFeatureK(type, val) {
  const k = parseFloat(val) || 0;
  paTuner.setFeatureK(type, k);
  updatePaSummary();
}

function resetPaOverrides() {
  paTuner.clearFeatureOverrides();
  document.getElementById('paBaseK').value = '0';
  paTuner.setBaseK(0);
  renderPaFeatureTable();
  updatePaSummary();
}

function togglePaCalibration() {
  const section = document.getElementById('paCalibSection');
  const btn = document.getElementById('paCalibToggle');
  if (!section || !btn) return;
  const hidden = section.style.display === 'none';
  section.style.display = hidden ? 'block' : 'none';
  btn.textContent = hidden ? 'Hide' : 'Show';
}

function updatePaSummary() {
  const el = document.getElementById('paSummary');
  if (!el) return;

  if (typeof parser === 'undefined' || !parser.layerMoves) {
    el.textContent = 'Load a file to see command count';
    return;
  }

  const fw = typeof currentFirmware !== 'undefined' ? currentFirmware : 'marlin';
  const commands = paTuner.compile(parser.layerMoves, fw);
  const totalCmds = commands.reduce((sum, c) => sum + c.gcode.split('\n').length, 0);
  el.textContent = 'Will insert ' + totalCmds + ' PA command' + (totalCmds !== 1 ? 's' : '') + ' across ' + commands.length + ' layer' + (commands.length !== 1 ? 's' : '');
}

function applyPaCommands() {
  if (typeof parser === 'undefined' || !parser.layerMoves) return;
  if (typeof modifier === 'undefined') return;

  const fw = typeof currentFirmware !== 'undefined' ? currentFirmware : 'marlin';
  const commands = paTuner.compile(parser.layerMoves, fw);

  if (commands.length === 0) {
    updatePaSummary();
    return;
  }

  for (const cmd of commands) {
    modifier.addCustom(cmd.layer, cmd.gcode);
  }

  refreshAfterMod();

  const totalCmds = commands.reduce((sum, c) => sum + c.gcode.split('\n').length, 0);
  const el = document.getElementById('paSummary');
  if (el) el.textContent = 'Applied ' + totalCmds + ' PA command' + (totalCmds !== 1 ? 's' : '') + ' across ' + commands.length + ' layer' + (commands.length !== 1 ? 's' : '');
}

function generatePaCalibration() {
  const kStart = parseFloat(document.getElementById('paCalibKStart')?.value) || 0;
  const kEnd = parseFloat(document.getElementById('paCalibKEnd')?.value) || 0.1;
  const kStep = parseFloat(document.getElementById('paCalibKStep')?.value) || 0.005;
  const nozzleTemp = parseInt(document.getElementById('paCalibNozzle')?.value) || 200;
  const bedTemp = parseInt(document.getElementById('paCalibBed')?.value) || 60;
  const filamentDiameter = parseFloat(document.getElementById('paCalibFilament')?.value) || 1.75;
  const fw = typeof currentFirmware !== 'undefined' ? currentFirmware : 'marlin';

  const gcode = paTuner.generateCalibrationPattern({
    kStart, kEnd, kStep, nozzleTemp, bedTemp, filamentDiameter, firmware: fw,
  });

  // Download as .gcode file
  const blob = new Blob([gcode], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pa-calibration-K' + kStart.toFixed(3) + '-' + kEnd.toFixed(3) + '.gcode';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  const editMods = getActiveEditModifications();
  const count = modifier.modifications.length + editDels.length + editMods.length;
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
  for (let i = 0; i < editMods.length; i++) {
    const edit = editMods[i];
    const desc = `Layer ${edit.layer}, line ${edit.lineIndex + 1} modified`;
    html += `<div class="mod-item edit-modification">
      <span class="mod-badge line-edit">edit</span>
      <span class="mod-desc" title="${edit.newLine.trim()}">${desc}</span>
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
  const isViewer = view === 'visual' || view === 'warp';
  const isRef = view === 'reference';
  document.getElementById('viewCodeBtn').classList.toggle('active', view === 'code');
  document.getElementById('viewVisualBtn').classList.toggle('active', view === 'visual');
  document.getElementById('viewWarpBtn').classList.toggle('active', view === 'warp');
  document.getElementById('viewRefBtn').classList.toggle('active', isRef);
  document.getElementById('gcodePreview').classList.toggle('hidden', isViewer || isRef);
  document.getElementById('viewerWrap').classList.toggle('active', isViewer);
  document.getElementById('referenceView').classList.toggle('hidden', !isRef);
  document.getElementById('warpControls').classList.toggle('hidden', view !== 'warp');

  // Hide toolbar tools when in reference view
  const toolbarTools = ['holeDetectToggle', 'measureToggle', 'pauseSelectToggle', 'editModeToggle', 'crossSectionToggle', 'colorPickerRow'];
  toolbarTools.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isRef ? 'none' : '';
  });
  const jumpControls = document.querySelectorAll('.preview-toolbar > span, .preview-toolbar > .jump-input');
  jumpControls.forEach(el => el.style.display = isRef ? 'none' : '');
  const previewInfo = document.getElementById('previewInfo');
  if (previewInfo) previewInfo.style.display = isRef ? 'none' : '';

  // Render reference content on first switch
  if (isRef && document.getElementById('refContent').children.length === 0) {
    renderReference();
  }

  // Set viewer warp mode
  viewer._warpViewActive = view === 'warp';
  if (view !== 'warp') {
    viewer._clearWarpMesh();
  }

  if (isViewer && selectedLayer !== null) {
    viewer.resize();
    viewer.fitBounds();
    viewer.maxVisibleLayer = selectedLayer;
    viewer.render(selectedLayer);
    updateViewerOverlay(selectedLayer);
    if (view === 'visual') {
      showSimControls();
      renderMotionLegend();
    } else {
      stopSimulation();
      hideSimControls();
    }
    if (view === 'warp') {
      updateWarpLegend();
    }
  } else {
    stopSimulation();
    hideSimControls();
  }
}

function updateWarpLegend() {
  const legendEl = document.getElementById('viewerLegend');
  if (!legendEl) return;
  const range = viewer._warpMeshRange;
  const minStr = range ? range.min.toFixed(3) : '0.000';
  const maxStr = range ? range.max.toFixed(3) : '0.000';
  const scale = viewer._warpDeformScale || 0;
  legendEl.style.display = '';
  legendEl.innerHTML = `<div class="legend-header"><span class="legend-title">Warp Risk</span></div>
    <div style="padding:6px 10px;font-size:11px;">
      <div style="height:12px;border-radius:3px;background:linear-gradient(to right,#0000ff,#00ffff,#00ff00,#ffff00,#ff0000);margin-bottom:4px;"></div>
      <div style="display:flex;justify-content:space-between;color:var(--text-dim);">
        <span>${minStr}mm</span><span>${maxStr}mm</span>
      </div>
    </div>
    <div style="padding:6px 10px;border-top:1px solid var(--border);font-size:11px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="color:var(--text-dim);">Deformation</span>
        <span id="warpDeformValue" style="font-family:var(--mono);color:var(--text);">${scale}x</span>
      </div>
      <input type="range" id="warpDeformSlider" min="0" max="50" value="${scale}" step="1" style="width:100%;">
    </div>`;
  const slider = document.getElementById('warpDeformSlider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('warpDeformValue').textContent = val + 'x';
      viewer._warpDeformScale = val;
      viewer._clearWarpMesh();
      if (currentView === 'warp' && selectedLayer !== null) {
        viewer.render(selectedLayer);
        // Update only the range labels (not the whole legend, to preserve slider state)
        if (viewer._warpMeshRange) {
          const spans = legendEl.querySelectorAll('.legend-header ~ div:first-of-type span');
          if (spans.length >= 2) {
            spans[0].textContent = viewer._warpMeshRange.min.toFixed(3) + 'mm';
            spans[1].textContent = viewer._warpMeshRange.max.toFixed(3) + 'mm';
          }
        }
      }
    });
  }
}

function initWarpControls() {
  // Warp controls are now integrated into the legend panel via updateWarpLegend()
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
  for (const edit of getActiveEditModifications()) {
    const idx = parser.layers.findIndex(l => l.number === edit.layer);
    if (idx < 0) continue;
    const pct = (idx / Math.max(1, parser.layers.length - 1)) * 100;
    html += `<div class="slider-tick" style="left:${pct}%;background:var(--accent, #60a5fa)"></div>`;
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
