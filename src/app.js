import { FIRMWARE, GCODE_REFERENCE } from './firmware.js';
import { decodeBgcode } from './bgcode.js';
import { UndoStack } from './undo-stack.js';
import { InsertManager } from './insert-manager.js';
import { HoleDetector } from './hole-detector.js';
import { GcodeParser } from './parser.js';
import { GcodeModifier } from './modifier.js';
import { GcodeViewer3D } from './viewer3d.js';


let currentFirmware = 'bambu';

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

// ===== APP STATE =====
const parser = new GcodeParser();
const modifier = new GcodeModifier();
const holeDetector = new HoleDetector();
const insertManager = new InsertManager();
const undoStack = new UndoStack();
let selectedLayer = null;
let holeDetectMode = false;
let measureMode = false;
let measurePoints = [];

function toggleMeasureMode() {
  measureMode = !measureMode;
  measurePoints = [];
  document.getElementById('measureToggle').classList.toggle('active', measureMode);
  document.getElementById('viewerCanvas').style.cursor = measureMode ? 'crosshair' : '';
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}


// Initialize firmware UI
onFirmwareChange('bambu');

// ===== FILE HANDLING =====
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });

// ===== ONBOARDING HINTS =====
const onboardState = JSON.parse(localStorage.getItem('gcode_onboard') || '{}');

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

if (!onboardState.dropzone) {
  setTimeout(() => showOnboardHint('dropzone', 'dropZone', 'Drop a .gcode or .bgcode file here to get started'), 500);
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
  selectedLayer = num;
  renderLayerList();
  renderPreview(num);
  updateSlider();

  // Update visual viewer if active
  if (currentView === 'visual') {
    viewer.maxVisibleLayer = num;
    viewer.render(num);
    updateViewerOverlay(num);
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

// ===== PREVIEW =====
function renderPreview(layerNum) {
  const container = document.getElementById('gcodePreview');
  const previewEmpty = document.getElementById('previewEmpty');
  if (previewEmpty) previewEmpty.remove();

  const layer = parser.getLayerByNumber(layerNum);
  if (!layer) return;

  const contextBefore = 5;
  const contextAfter = 10;
  const startLine = Math.max(0, layer.startLine - contextBefore);
  const endLine = Math.min(parser.lines.length - 1, layer.endLine + contextAfter);

  // Find modification lines for this layer
  const modLayers = new Set(modifier.modifications.filter(m => {
    if (m.type === 'zoffset') return layerNum >= m.layer && (m.endLayer == null || layerNum <= m.endLayer);
    return m.layer === layerNum;
  }).map(m => m.id));

  let html = '<table class="code-table"><tbody>';
  for (let i = startLine; i <= endLine; i++) {
    const raw = parser.lines[i];
    const isLayerStart = raw.trim().match(/^;LAYER:\d+/i);
    const isHighlight = i >= layer.startLine && i <= layer.endLine;
    const classes = [];
    if (isLayerStart) classes.push('layer-start');
    if (isHighlight) classes.push('highlight');

    html += `<tr class="${classes.join(' ')}"><td class="ln">${i + 1}</td><td>${syntaxHighlight(raw)}</td></tr>`;
  }

  // Show modification preview snippets
  if (modLayers.size > 0) {
    html += '<tr class="layer-start"><td class="ln" style="color:var(--orange)">+</td><td style="color:var(--orange);font-weight:600">; ── Modifications to be inserted ──</td></tr>';
    for (const mod of modifier.modifications.filter(m => {
      if (m.type === 'zoffset') return layerNum >= m.layer && (m.endLayer == null || layerNum <= m.endLayer);
      return m.layer === layerNum;
    })) {
      const snippet = modifier.getSnippet(mod);
      for (const line of snippet) {
        html += `<tr class="mod-line"><td class="ln">+</td><td>${syntaxHighlight(line)}</td></tr>`;
      }
    }
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  document.getElementById('previewInfo').textContent =
    `Layer ${layer.number}  ·  Z${layer.zHeight?.toFixed(2) || '?'}mm  ·  Lines ${layer.startLine + 1}–${layer.endLine + 1}`;
}

function renderFullPreview() {
  const container = document.getElementById('gcodePreview');
  const previewEmpty = document.getElementById('previewEmpty');
  if (previewEmpty) previewEmpty.remove();

  // Show first 200 lines (Bambu headers can be very long)
  const end = Math.min(200, parser.lines.length);
  let html = '<table class="code-table"><tbody>';
  for (let i = 0; i < end; i++) {
    html += `<tr><td class="ln">${i + 1}</td><td>${syntaxHighlight(parser.lines[i])}</td></tr>`;
  }
  if (parser.lines.length > 200) {
    html += `<tr><td class="ln">...</td><td style="color:var(--text-dim)">... ${(parser.lines.length - 200).toLocaleString()} more lines ...</td></tr>`;
  }
  html += '</tbody></table>';
  container.innerHTML = html;
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
  if (!parser.getLayerByNumber(layer)) { showToast(`Layer ${layer} not found in the file.`, 'error'); return; }

  const msg = document.getElementById('pauseMsg').value;
  const pauseType = document.querySelector('input[name="pauseType"]:checked').value;
  const moveHead = document.getElementById('pauseMoveHead').checked;

  modifier.addPause(layer, msg, pauseType, moveHead);
  refreshAfterMod();
  showToast('Pause added at layer ' + layer, 'success');
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
  const count = modifier.modifications.length;
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
        desc = `Layer ${mod.layer}${mod.message ? ' – ' + mod.message : ''}`;
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
  container.innerHTML = html;
}


let dragModId = null;

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
let currentView = 'code';

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
      html += `<div class="viewer-mod-banner pause">⏸ Pause at this layer${mod.message ? ': ' + mod.message : ''}</div>`;
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

const viewer = new GcodeViewer3D('viewerCanvas');

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

// Update computed info when insert height changes
document.addEventListener('DOMContentLoaded', () => {
  const heightInput = document.getElementById('insertHeight');
  const unitSelect = document.getElementById('insertHeightUnit');
  if (heightInput) heightInput.addEventListener('input', updateComputedPauseInfo);
  if (unitSelect) unitSelect.addEventListener('change', updateComputedPauseInfo);
});

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
function performUndo() {
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

function performRedo() {
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

window.addEventListener('keydown', e => {
  const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';

  // Undo/redo (works even in inputs)
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); performUndo(); return; }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); performRedo(); return; }

  // Ctrl shortcuts (work everywhere)
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); exportGcode(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); document.getElementById('fileInput').click(); return; }

  if (isInput) return;

  // Tab switching: 1-8
  const tabKeys = { '1': 'pause', '2': 'filament', '3': 'eject', '4': 'zoffset', '5': 'custom', '6': 'inserts', '7': 'reference', '8': 'recovery' };
  if (tabKeys[e.key]) { switchTab(tabKeys[e.key]); return; }

  // Layer navigation
  if (e.key === '[' || e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault();
    const slider = document.getElementById('layerSlider');
    slider.value = Math.max(0, +slider.value - 1);
    onSliderChange(+slider.value);
    return;
  }
  if (e.key === ']' || e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault();
    const slider = document.getElementById('layerSlider');
    slider.value = Math.min(+slider.max, +slider.value + 1);
    onSliderChange(+slider.value);
    return;
  }

  // View toggle
  if (e.key === ' ') { e.preventDefault(); setView(currentView === 'code' ? 'visual' : 'code'); return; }

  // Reset camera
  if (e.key === 'f' && currentView === 'visual') { viewer.fitBounds(); viewer.render(viewer.currentLayer); return; }

  // Help overlay
  if (e.key === '?') { toggleShortcutsOverlay(); return; }
});

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

applyTheme(getPreferredTheme());
