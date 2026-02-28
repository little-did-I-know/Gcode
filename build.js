import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src');

// Dependency order — modules listed before their dependents
const FILES = [
  'firmware.js',
  'bgcode.js',
  'undo-stack.js',
  'insert-manager.js',
  'hole-detector.js',
  'e-repair.js',
  'parser.js',
  'modifier.js',
  'gcode-dictionary.js',
  'material-profiles.js',      // NEW - no deps
  'motion-analyzer.js',
  'analysis-manager.js',        // NEW - no deps
  'structural-analyzer.js',     // NEW - depends on material-profiles
  'thermal-analyzer.js',        // NEW - depends on material-profiles
  'viewer3d.js',
  'ui.js',
  'app.js',
];

let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

let js = '';
for (const file of FILES) {
  let code = fs.readFileSync(path.join(SRC, file), 'utf8');
  // Strip ES module syntax: remove import lines, strip export keyword from declarations
  code = code.replace(/^import\s.+$/gm, '');
  code = code.replace(/^export\s+default\s+/gm, '');
  code = code.replace(/^export\s+(?=(class|function|const|let|var)\s)/gm, '');
  code = code.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '');
  js += code + '\n';
}

html = html.replace('<!-- SCRIPTS -->', '<script>\n' + js + '</script>');
fs.writeFileSync(path.join(__dirname, 'gcode-modifier.html'), html);
console.log('Built gcode-modifier.html');
