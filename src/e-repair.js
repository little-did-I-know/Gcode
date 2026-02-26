// E-value repair for line deletion in absolute extrusion mode.

export function computeERepair(lines, deletedIndex) {
  const deletedLine = lines[deletedIndex];

  // Check if deleted line has an E parameter
  const deletedE = parseE(deletedLine);
  if (deletedE === null) return [];

  // Detect extrusion mode: scan backward for most recent M82/M83
  if (isRelativeEMode(lines, deletedIndex)) return [];

  // Find previous E value (scan backward)
  let prevE = 0;
  for (let i = deletedIndex - 1; i >= 0; i--) {
    const line = lines[i];
    if (/^G92\b/i.test(line.trim()) && /E/i.test(line)) {
      const resetE = parseE(line);
      prevE = resetE !== null ? resetE : 0;
      break;
    }
    const e = parseE(line);
    if (e !== null) { prevE = e; break; }
  }

  const delta = deletedE - prevE;
  if (Math.abs(delta) < 1e-9) return [];

  // Scan forward, adjust E values
  const repairs = [];
  for (let i = deletedIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop at G92 E reset
    if (/^G92\b/i.test(line) && /E/i.test(line)) break;

    // If we hit M83, stop — subsequent lines are relative
    if (/^M83\b/i.test(line)) break;
    // Skip M82 (stays absolute)
    if (/^M82\b/i.test(line)) continue;

    // Only patch G0/G1/G2/G3 lines with E
    if (/^G[0123]\b/i.test(line)) {
      const e = parseE(lines[i]);
      if (e !== null) {
        const precision = getEPrecision(lines[i]);
        const newE = (e - delta).toFixed(precision);
        const patched = lines[i].replace(
          /([Ee])([-\d.]+)/,
          (_, letter) => letter + newE
        );
        repairs.push({
          lineIndex: i,
          original: lines[i],
          patched: patched,
        });
      }
    }
  }

  return repairs;
}

function parseE(line) {
  const match = line.match(/[Ee]([-\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function getEPrecision(line) {
  const match = line.match(/[Ee][-]?(\d+\.(\d+)|\d+)/);
  if (match && match[2]) return match[2].length;
  return 5;
}

function isRelativeEMode(lines, fromIndex) {
  for (let i = fromIndex - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (/^M83\b/i.test(trimmed)) return true;
    if (/^M82\b/i.test(trimmed)) return false;
  }
  return false; // default is absolute
}
