// G-code command dictionary and line decoder.

const GCODE_COMMANDS = {
  'G0':   { name: 'Rapid Move', params: { X: 'Move to X', Y: 'Move to Y', Z: 'Move to Z', F: 'Feed rate', E: 'Retract/prime' } },
  'G1':   { name: 'Linear Move', params: { X: 'Move to X', Y: 'Move to Y', Z: 'Move to Z', E: 'Extrude', F: 'Feed rate' } },
  'G2':   { name: 'Clockwise Arc', params: { X: 'End X', Y: 'End Y', I: 'Arc center X offset', J: 'Arc center Y offset', E: 'Extrude', F: 'Feed rate' } },
  'G3':   { name: 'Counter-Clockwise Arc', params: { X: 'End X', Y: 'End Y', I: 'Arc center X offset', J: 'Arc center Y offset', E: 'Extrude', F: 'Feed rate' } },
  'G4':   { name: 'Dwell (Pause)', params: { P: 'Wait time (ms)', S: 'Wait time (s)' } },
  'G10':  { name: 'Retract', params: {} },
  'G11':  { name: 'Unretract', params: {} },
  'G21':  { name: 'Set Units to Millimeters', params: {} },
  'G28':  { name: 'Home Axes', params: { X: 'Home X axis', Y: 'Home Y axis', Z: 'Home Z axis' } },
  'G29':  { name: 'Bed Leveling', params: {} },
  'G90':  { name: 'Absolute Positioning', params: {} },
  'G91':  { name: 'Relative Positioning', params: {} },
  'G92':  { name: 'Set Position', params: { X: 'Set X position', Y: 'Set Y position', Z: 'Set Z position', E: 'Set extruder position' } },
  'M82':  { name: 'Absolute Extrusion', params: {} },
  'M83':  { name: 'Relative Extrusion', params: {} },
  'M84':  { name: 'Disable Steppers', params: { S: 'Idle timeout (s)' } },
  'M104': { name: 'Set Hotend Temp', params: { S: 'Target temp (°C)', T: 'Extruder index' } },
  'M106': { name: 'Set Fan Speed', params: { S: 'Speed (0–255)' } },
  'M107': { name: 'Fan Off', params: {} },
  'M109': { name: 'Wait for Hotend Temp', params: { S: 'Target temp (°C)', R: 'Wait for temp (°C)', T: 'Extruder index' } },
  'M140': { name: 'Set Bed Temp', params: { S: 'Target temp (°C)' } },
  'M190': { name: 'Wait for Bed Temp', params: { S: 'Target temp (°C)', R: 'Wait for temp (°C)' } },
  'M204': { name: 'Set Acceleration', params: { P: 'Print accel (mm/s²)', T: 'Travel accel (mm/s²)', S: 'Legacy accel (mm/s²)' } },
  'M205': { name: 'Set Jerk/Junction', params: { X: 'X jerk (mm/s)', Y: 'Y jerk (mm/s)', Z: 'Z jerk (mm/s)', E: 'E jerk (mm/s)', J: 'Junction deviation (mm)' } },
  'M220': { name: 'Set Speed Factor', params: { S: 'Speed %' } },
  'M221': { name: 'Set Flow Factor', params: { S: 'Flow %', T: 'Extruder index' } },
  'M400': { name: 'Wait for Moves to Finish', params: {} },
  'M600': { name: 'Filament Change', params: { X: 'Park X', Y: 'Park Y', Z: 'Park Z lift', E: 'Retract length' } },
  'M862': { name: 'Printer Model Check', params: { P: 'Model ID', Q: 'Nozzle diameter' } },
  'M900': { name: 'Linear Advance', params: { K: 'K-factor' } },
};

function decodeLine(text) {
  // Strip HTML tags (from syntax-highlighted content)
  const raw = text.replace(/<[^>]+>/g, '').trim();
  if (!raw || raw.startsWith(';')) return null;

  // Remove inline comments
  const commentIdx = raw.indexOf(';');
  const code = commentIdx > -1 ? raw.substring(0, commentIdx).trim() : raw;
  if (!code) return null;

  // Extract command (G or M followed by digits)
  const cmdMatch = code.match(/^([GM]\d+(\.\d+)?)/i);
  if (!cmdMatch) return null;

  const command = cmdMatch[1].toUpperCase();
  const def = GCODE_COMMANDS[command];

  // Parse parameters
  const paramRegex = /([A-Z])(-?\d+\.?\d*)/gi;
  const params = [];
  let m;
  // Skip the command itself, parse remaining
  const paramStr = code.substring(cmdMatch[0].length);
  while ((m = paramRegex.exec(paramStr)) !== null) {
    const letter = m[1].toUpperCase();
    const value = m[2];
    let description = def?.params[letter] || 'Parameter';

    // Add units/conversions for common parameters
    if (letter === 'X' || letter === 'Y' || letter === 'Z') {
      description += ` = ${value} mm`;
    } else if (letter === 'E') {
      description += ` ${value} mm`;
    } else if (letter === 'F') {
      const mmPerMin = parseFloat(value);
      if (!isNaN(mmPerMin)) {
        const mmPerSec = (mmPerMin / 60).toFixed(1);
        description += `: ${value} mm/min (${mmPerSec} mm/s)`;
      } else {
        description += `: ${value}`;
      }
    } else if (letter === 'S' && (command === 'M104' || command === 'M109' || command === 'M140' || command === 'M190')) {
      description += `: ${value}°C`;
    } else if (letter === 'S' && command === 'M106') {
      const raw = parseFloat(value);
      if (!isNaN(raw)) {
        const pct = (raw / 255 * 100).toFixed(0);
        description += `: ${value} (${pct}%)`;
      } else {
        description += `: ${value}`;
      }
    } else if (letter === 'S' && (command === 'M220' || command === 'M221')) {
      description += `: ${value}%`;
    } else {
      description += `: ${value}`;
    }

    params.push({ letter, value, description });
  }

  return {
    command,
    name: def ? def.name : 'Unknown Command',
    known: !!def,
    params
  };
}
