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
const editUndoStack = { entries: [], index: -1, maxSize: 50 };
let selectedLayer = null;
let holeDetectMode = false;
let measureMode = false;
let measurePoints = [];
let pauseSelectMode = false;
let selectedMove = null;
let hoveredMove = null;
let editMode = false;
let editSelectedMove = null;
let editHoveredMove = null;
let editOriginalParams = null;
let editCurrentParams = null;
let editPreviewParams = null;
let reparsing = false;
const _storedColor = localStorage.getItem('gcode_highlight_color');
let highlightColor = /^#[0-9a-fA-F]{6}$/.test(_storedColor) ? _storedColor : '#ff3333';

// Motion type display names for legend UI
const MOTION_TYPE_LABELS = {
  'WALL-OUTER': 'Outer Wall',
  'WALL-INNER': 'Inner Wall',
  'FILL': 'Infill',
  'SOLID': 'Solid Fill',
  'TOP': 'Top Surface',
  'BOTTOM': 'Bottom Surface',
  'SUPPORT': 'Support',
  'SUPPORT-INTERFACE': 'Support Interface',
  'OVERHANG': 'Overhang',
  'GAP INFILL': 'Gap Fill',
  'BRIDGE': 'Bridge',
  'SKIRT': 'Skirt',
  'BRIM': 'Brim',
  'CUSTOM': 'Custom',
  'TRAVEL': 'Travel',
};

// Default colors (hex) matching viewer3d.js TYPE_COLORS
const DEFAULT_MOTION_COLORS = {
  'WALL-OUTER': '#60a5fa',
  'WALL-INNER': '#93c5fd',
  'FILL': '#4ade80',
  'SOLID': '#4ade80',
  'TOP': '#22d3ee',
  'BOTTOM': '#22d3ee',
  'SUPPORT': '#facc15',
  'SUPPORT-INTERFACE': '#fde68a',
  'OVERHANG': '#fb923c',
  'GAP INFILL': '#fb923c',
  'BRIDGE': '#f97316',
  'SKIRT': '#a78bfa',
  'BRIM': '#a78bfa',
  'CUSTOM': '#a78bfa',
  'TRAVEL': '#555555',
};

let motionTypeVisibility = {};
let motionTypeColors = {};
let detectedTypes = new Set();
let motionLegendExpanded = true;
let motionLegendShowAll = false;

// Heatmap color mode: 'motion-type' | 'speed' | 'acceleration' | 'flow'
let colorMode = 'motion-type';
// Cached per-layer heatmap stats: { min, max, avg }
let heatmapLayerStats = {};

// Simulation state
let simulationPlaying = false;
let simulationMoveIndex = 0;
let simulationSpeed = 100; // moves per second
let simulationRafId = null;
let simulationPauseMoveIndices = []; // move indices where pauses are inserted
let simulationPausedAtIndex = -1; // last pause index we stopped at (avoid re-triggering)

const MOTION_TYPE_ALIASES = {
  'OUTER WALL': 'WALL-OUTER', 'INNER WALL': 'WALL-INNER',
  'SOLID INFILL': 'SOLID', 'SPARSE INFILL': 'FILL', 'SPARSE': 'FILL',
  'INTERNAL SOLID INFILL': 'SOLID', 'TOP SURFACE': 'TOP', 'BOTTOM SURFACE': 'BOTTOM',
};

function initMotionTypeState() {
  // Collect detected types from parsed moves
  detectedTypes = new Set();
  for (const layerNum in parser.layerMoves) {
    for (const move of parser.layerMoves[layerNum]) {
      if (move.extrude) {
        const upper = move.type.toUpperCase();
        detectedTypes.add(MOTION_TYPE_ALIASES[upper] || upper);
      } else {
        detectedTypes.add('TRAVEL');
      }
    }
  }

  // Load saved state or use defaults
  const savedVis = localStorage.getItem('gcode_motion_visibility');
  const savedColors = localStorage.getItem('gcode_motion_colors');

  motionTypeVisibility = {};
  motionTypeColors = {};

  // Initialize all known types to defaults
  for (const type of Object.keys(DEFAULT_MOTION_COLORS)) {
    motionTypeVisibility[type] = true;
    motionTypeColors[type] = DEFAULT_MOTION_COLORS[type];
  }
  // Also include any detected types not in defaults
  for (const type of detectedTypes) {
    if (!(type in motionTypeVisibility)) {
      motionTypeVisibility[type] = true;
      motionTypeColors[type] = '#e0e2e8';
    }
  }

  // Merge saved preferences
  if (savedVis) {
    try {
      const parsed = JSON.parse(savedVis);
      for (const [type, vis] of Object.entries(parsed)) {
        if (type in motionTypeVisibility) motionTypeVisibility[type] = vis;
      }
    } catch (e) { /* ignore corrupt data */ }
  }
  if (savedColors) {
    try {
      const parsed = JSON.parse(savedColors);
      for (const [type, color] of Object.entries(parsed)) {
        if (type in motionTypeColors && /^#[0-9a-fA-F]{6}$/.test(color)) {
          motionTypeColors[type] = color;
        }
      }
    } catch (e) { /* ignore corrupt data */ }
  }
}

function saveMotionTypeState() {
  localStorage.setItem('gcode_motion_visibility', JSON.stringify(motionTypeVisibility));
  localStorage.setItem('gcode_motion_colors', JSON.stringify(motionTypeColors));
}

function resetMotionTypeState() {
  localStorage.removeItem('gcode_motion_visibility');
  localStorage.removeItem('gcode_motion_colors');
  for (const type of Object.keys(motionTypeVisibility)) {
    motionTypeVisibility[type] = true;
    motionTypeColors[type] = DEFAULT_MOTION_COLORS[type] || '#e0e2e8';
  }
  renderMotionLegend();
  viewer.clearBuffers();
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function setColorMode(mode) {
  colorMode = mode;
  heatmapLayerStats = {};
  resetSimulation();
  viewer.clearBuffers();
  renderMotionLegend();
  if (currentView === 'visual') viewer.render(viewer.currentLayer);
}

function getHeatmapValue(move) {
  if (colorMode === 'speed') return (move.feedRate || 0) / 60; // mm/min → mm/s
  if (colorMode === 'acceleration') return move.accel || 0;
  if (colorMode === 'flow') {
    // Approximate volumetric flow: (eLength / moveLength) * speed
    const dx = move.x2 - move.x1, dy = move.y2 - move.y1;
    const moveLen = Math.hypot(dx, dy);
    if (moveLen < 0.001 || !move.eLength) return 0;
    const speed = (move.feedRate || 0) / 60;
    return (move.eLength / moveLen) * speed;
  }
  return 0;
}

function getHeatmapLayerStats(layerNum) {
  if (heatmapLayerStats[layerNum]) return heatmapLayerStats[layerNum];
  const moves = parser.layerMoves[layerNum];
  if (!moves || moves.length === 0) return { min: 0, max: 1, avg: 0 };
  let min = Infinity, max = -Infinity, sum = 0, count = 0;
  for (const move of moves) {
    if (!move.extrude) continue;
    const v = getHeatmapValue(move);
    if (v <= 0) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    count++;
  }
  if (count === 0) return { min: 0, max: 1, avg: 0 };
  if (min === max) { min = 0; } // Avoid zero-range
  const stats = { min, max, avg: sum / count };
  heatmapLayerStats[layerNum] = stats;
  return stats;
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
  initDecodeTooltip();
});

window.addEventListener('keydown', e => {
  const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';

  // Undo/redo (works even in inputs)
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); performUndo(); return; }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); performRedo(); return; }

  // Ctrl shortcuts (work everywhere)
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); exportGcode(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); document.getElementById('fileInput').click(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); if (currentView === 'code') showSearchBar(); return; }

  if (isInput) return;

  // Edit mode shortcuts
  if (editMode) {
    if (e.key === 'Escape') { cancelEditSelection(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && editSelectedMove) {
      e.preventDefault();
      deleteSelectedMove();
      return;
    }
  }

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

  // Simulation play/pause
  if (e.key === 'p' && currentView === 'visual') { toggleSimulation(); return; }

  // Help overlay
  if (e.key === '?') { toggleShortcutsOverlay(); return; }
});

applyTheme(getPreferredTheme());
