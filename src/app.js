// App initialization, state, and event wiring.
// UI functions are defined in ui.js and available via global scope in the built output.

import { FIRMWARE, GCODE_REFERENCE } from './firmware.js';
import { decodeBgcode } from './bgcode.js';
import { UndoStack } from './undo-stack.js';
import { InsertManager } from './insert-manager.js';
import { HoleDetector } from './hole-detector.js';
import { GcodeParser } from './parser.js';
import { GcodeModifier } from './modifier.js';
import { GcodeViewer3D } from './viewer3d.js';

let currentFirmware = 'bambu';

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

if (!onboardState.dropzone) {
  setTimeout(() => showOnboardHint('dropzone', 'dropZone', 'Drop a .gcode or .bgcode file here to get started'), 500);
}

let dragModId = null;

let currentView = 'code';

const viewer = new GcodeViewer3D('viewerCanvas');

// Update computed info when insert height changes
document.addEventListener('DOMContentLoaded', () => {
  const heightInput = document.getElementById('insertHeight');
  const unitSelect = document.getElementById('insertHeightUnit');
  if (heightInput) heightInput.addEventListener('input', updateComputedPauseInfo);
  if (unitSelect) unitSelect.addEventListener('change', updateComputedPauseInfo);
});

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

applyTheme(getPreferredTheme());
