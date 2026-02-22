const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');

// Dependency order — modules listed before their dependents
const FILES = [
  'app.js',
];

let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

let js = '';
for (const file of FILES) {
  let code = fs.readFileSync(path.join(SRC, file), 'utf8');
  // Strip ES module import/export lines
  code = code.replace(/^(import|export)\s.+$/gm, '');
  js += code + '\n';
}

html = html.replace('<!-- SCRIPTS -->', '<script>\n' + js + '</script>');
fs.writeFileSync(path.join(__dirname, 'gcode-modifier.html'), html);
console.log('Built gcode-modifier.html');
