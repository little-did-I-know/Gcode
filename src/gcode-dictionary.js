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
  'M106': { name: 'Set Fan Speed', params: { S: 'Speed (0–255)', P: 'Fan index' } },
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
  // Movement (new)
  'G5':   { name: 'Bézier Spline', params: { X: 'End X', Y: 'End Y', I: 'X control point 1', J: 'Y control point 1', P: 'X control point 2', Q: 'Y control point 2', E: 'Extrude', F: 'Feed rate' } },
  'G12':  { name: 'Nozzle Clean', params: { P: 'Pattern (0=stroke, 1=zig-zag)', S: 'Strokes', T: 'Triangles' } },
  'G20':  { name: 'Set Units to Inches', params: {} },
  'G27':  { name: 'Park Toolhead', params: { P: 'Park mode' } },
  // Probing & Leveling (new)
  'G30':  { name: 'Single Z-Probe', params: { X: 'Probe X', Y: 'Probe Y' } },
  'G33':  { name: 'Delta Auto Calibration', params: { C: 'Calibration points', V: 'Verbose level' } },
  'G34':  { name: 'Z Stepper Alignment', params: {} },
  'G35':  { name: 'Tramming Assistant', params: {} },
  'G38.2': { name: 'Probe Toward Target', params: { X: 'Target X', Y: 'Target Y', Z: 'Target Z', F: 'Feed rate' } },
  'G38.3': { name: 'Probe Toward (No Error)', params: { X: 'Target X', Y: 'Target Y', Z: 'Target Z', F: 'Feed rate' } },
  'G38.4': { name: 'Probe Away from Target', params: { X: 'Target X', Y: 'Target Y', Z: 'Target Z', F: 'Feed rate' } },
  'G38.5': { name: 'Probe Away (No Error)', params: { X: 'Target X', Y: 'Target Y', Z: 'Target Z', F: 'Feed rate' } },
  // Temperature (new)
  'M105': { name: 'Report Temperatures', params: {} },
  'M141': { name: 'Set Chamber Temp', params: { S: 'Target temp (°C)' } },
  'M191': { name: 'Wait for Chamber Temp', params: { S: 'Target temp (°C)', R: 'Wait for exact temp (°C)' } },
  // System & Info (new)
  'M17':  { name: 'Enable Steppers', params: { X: 'Enable X', Y: 'Enable Y', Z: 'Enable Z', E: 'Enable E' } },
  'M80':  { name: 'ATX Power On', params: {} },
  'M81':  { name: 'ATX Power Off', params: {} },
  'M85':  { name: 'Inactivity Shutdown', params: { S: 'Timeout (s)' } },
  'M92':  { name: 'Set Steps Per Unit', params: { X: 'X steps/mm', Y: 'Y steps/mm', Z: 'Z steps/mm', E: 'E steps/mm' } },
  'M112': { name: 'Emergency Stop', params: {} },
  'M114': { name: 'Get Current Position', params: {} },
  'M115': { name: 'Firmware Info', params: {} },
  'M119': { name: 'Endstop Status', params: {} },
  'M155': { name: 'Auto-Report Temperatures', params: { S: 'Interval (s)' } },
  // Retraction & Filament (new)
  'M200': { name: 'Set Filament Diameter', params: { D: 'Diameter (mm)', T: 'Extruder index' } },
  'M207': { name: 'Set Retract Length', params: { S: 'Retract length (mm)', F: 'Retract speed (mm/min)', Z: 'Z lift (mm)' } },
  'M208': { name: 'Set Recover Length', params: { S: 'Extra recover length (mm)', F: 'Recover speed (mm/min)' } },
  'M412': { name: 'Filament Runout', params: { S: 'Enable (1) / Disable (0)' } },
  'M702': { name: 'Unload Filament', params: { T: 'Extruder index', U: 'Unload length (mm)' } },
  // Stepper & Motion (new)
  'M206': { name: 'Set Home Offset', params: { X: 'X offset (mm)', Y: 'Y offset (mm)', Z: 'Z offset (mm)' } },
  'M211': { name: 'Software Endstops', params: { S: 'Enable (1) / Disable (0)' } },
  'M290': { name: 'Babystepping', params: { Z: 'Z offset (mm)' } },
  'M350': { name: 'Set Microstepping', params: { X: 'X microsteps', Y: 'Y microsteps', Z: 'Z microsteps', E: 'E microsteps' } },
  'M420': { name: 'Bed Leveling State', params: { S: 'Enable (1) / Disable (0)', Z: 'Fade height (mm)' } },
  'M421': { name: 'Set Mesh Point', params: { I: 'X index', J: 'Y index', Z: 'Z offset (mm)' } },
  'M906': { name: 'Set Motor Current', params: { X: 'X current (mA)', Y: 'Y current (mA)', Z: 'Z current (mA)', E: 'E current (mA)' } },
  // Hardware & Misc (new)
  'M42':  { name: 'Switch I/O Pin', params: { P: 'Pin number', S: 'Pin value (0-255)' } },
  'M125': { name: 'Park Head', params: { X: 'Park X', Y: 'Park Y', Z: 'Z lift (mm)' } },
  'M280': { name: 'Set Servo Position', params: { P: 'Servo index', S: 'Angle (0-180)' } },
  'M355': { name: 'Case Light', params: { S: 'On (1) / Off (0)', P: 'Brightness (0-255)' } },
  'M911': { name: 'Power Loss Recovery', params: {} },
  // Standard commands (additional)
  'G17':  { name: 'Select XY Plane', params: {} },
  'M18':  { name: 'Disable Steppers', params: { X: 'Disable X', Y: 'Disable Y', Z: 'Disable Z', E: 'Disable E' } },
  'M73':  { name: 'Set Print Progress', params: { P: 'Progress (%)', R: 'Remaining time (min)' } },
  'M201': { name: 'Set Max Acceleration', params: { X: 'X accel (mm/s²)', Y: 'Y accel (mm/s²)', Z: 'Z accel (mm/s²)', E: 'E accel (mm/s²)' } },
  'M203': { name: 'Set Max Feedrate', params: { X: 'X max (mm/s)', Y: 'Y max (mm/s)', Z: 'Z max (mm/s)', E: 'E max (mm/s)' } },
  'M500': { name: 'Save Settings to EEPROM', params: {} },
  // Bambu Lab — AMS & Material Management
  'M620':    { name: 'AMS Material Control', params: { S: 'Slot index', M: 'Enable remap', N: 'Enable hotend remap', T: 'Print/position config' } },
  'M620.6':  { name: 'AMS Air Printing Detect', params: { I: 'Extruder index', W: 'Enable (1) / Disable (0)' } },
  'M620.10': { name: 'AMS Flush Config', params: { A: 'Phase (0=pre, 1=post)', F: 'Flush feedrate', L: 'Flush length', H: 'Nozzle diameter', T: 'Flush temp', P: 'Pre-flush temp', S: 'Mode' } },
  'M620.11': { name: 'AMS Retraction/Cut Config', params: { P: 'Enable long retraction', S: 'Enable cut', I: 'Extruder index', E: 'Retract distance', F: 'Retract feedrate', K: 'Enable EC retraction', R: 'EC retract distance', L: 'Level', D: 'Distance', O: 'Option', T: 'Retract length NC', H: 'Home offset compensation' } },
  'M620.14': { name: 'AMS Wipe Tower Position', params: { X: 'Tower center X', Y: 'Tower center Y' } },
  'M620.15': { name: 'AMS Pre-Cooling Temp', params: { P: 'Pre-cooling temp', C: 'Cooling target' } },
  'M621':    { name: 'Switch AMS Material', params: { S: 'Slot index' } },
  'M622':    { name: 'Conditional Block Start', params: { S: 'Flag value', J: 'Jump flag index' } },
  'M623':    { name: 'Conditional Block End', params: {} },
  'M628':    { name: 'Filament Change Start', params: { S: 'Mode' } },
  'M629':    { name: 'Filament Change End', params: {} },
  'M630':    { name: 'Tool Change Config', params: { S: 'Slot', P: 'Parameter' } },
  // Bambu Lab — Toolhead & Motion
  'G150.1':  { name: 'Wipe Nozzle Position 1', params: { F: 'Feed rate' } },
  'G150.2':  { name: 'Wipe Nozzle Position 2', params: { F: 'Feed rate' } },
  'G150.3':  { name: 'Wipe Nozzle Position 3', params: { F: 'Feed rate' } },
  'G380':    { name: 'Move Z Stepper', params: { S: 'Stepper index', Z: 'Z distance', F: 'Feed rate' } },
  'G392':    { name: 'Toolhead Protection', params: { S: 'Mode' } },
  'M640':    { name: 'Toolhead Movement', params: { S: 'Start movement' } },
  'M640.1':  { name: 'Toolhead Move Config', params: { R: 'Reset', S: 'Start' } },
  'M640.2':  { name: 'Toolhead Move Config 2', params: { R: 'Config value' } },
  'M640.4':  { name: 'Toolhead Calibrate', params: {} },
  'M640.7':  { name: 'Toolhead Wipe', params: { L: 'Left wipe', U: 'Up wipe' } },
  'M640.8':  { name: 'Toolhead Move Config 3', params: { T: 'Target', A: 'Acceleration' } },
  'M641':    { name: 'Toolhead Movement End', params: {} },
  // Bambu Lab — Calibration & Compensation
  'G28.140': { name: 'Calibrate Pre-Extrude Z', params: { S: 'Calibration mode', D: 'Reset' } },
  'G29.1':   { name: 'Set/Clear Z-Trim', params: { Z: 'Z offset' } },
  'G29.2':   { name: 'Position Compensation', params: { S: 'Enable (1) / Disable (0)' } },
  'G29.7':   { name: 'Bed Mesh Probe Mode', params: { S: 'Enable (1) / Disable (0)' } },
  'G29.99':  { name: 'Apply Bed Leveling Mesh', params: {} },
  'G39.1':   { name: 'Nozzle Detection Calibration', params: {} },
  'M201.2':  { name: 'Set Accel (Bambu)', params: { X: 'X accel', Y: 'Y accel', Z: 'Z accel', E: 'E accel' } },
  'M481':    { name: 'Cutter Position Compensation', params: { S: 'Enable (1) / Disable (0)' } },
  'M983.1':  { name: 'Motor Config', params: { M: 'Mode' } },
  'M983.3':  { name: 'Dynamic Extrusion Calibration', params: { F: 'Flow rate', A: 'Factor', R: 'Retract length' } },
  'M983.4':  { name: 'Deformation Compensation', params: { S: 'Enable (1) / Disable (0)' } },
  // Bambu Lab — Detection & Safety
  'M73.2':   { name: 'Reset Time Estimate', params: { R: 'Magnitude' } },
  'M901':    { name: 'TMC Driver Config', params: { D: 'Parameter' } },
  'M960':    { name: 'LED Control', params: { S: 'Function', P: 'Enable (1) / Disable (0)' } },
  'M972':    { name: 'Detection System', params: { S: 'Feature ID', P: 'Enable (0/1)', T: 'Timeout (ms)', C: 'Config' } },
  'M975':    { name: 'Input Shaping', params: { S: 'Enable (1) / Disable (0)' } },
  'M981':    { name: 'Spaghetti Detector', params: { S: 'Enable (1) / Disable (0)', P: 'Sensitivity' } },
  'M982.2':  { name: 'Cog Noise Reduction', params: { S: 'Enable (1) / Disable (0)' } },
  'M991':    { name: 'Notify Layer Change', params: { S: 'State', P: 'Parameter' } },
  'M993':    { name: 'Nozzle Cam Detection', params: { A: 'Mode A', B: 'Mode B', C: 'Mode C' } },
  // Bambu Lab — System Control
  'M1002':   { name: 'System Control', params: {} },
  'M1003':   { name: 'System Info', params: {} },
  'M1006':   { name: 'LED / Sound Pattern', params: { S: 'Start', A: 'Note freq', B: 'Duration', L: 'Level', W: 'Wait for completion' } },
  'M1009':   { name: 'System Config', params: { Q: 'Query', L: 'Level' } },
  'M1015.3': { name: 'TPU Clog Detection', params: { S: 'Enable (1) / Disable (0)' } },
  'M1015.4': { name: 'Extrusion Air Print Detect', params: { S: 'Enable (1) / Disable (0)', K: 'Mode', H: 'Nozzle diameter' } },
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
  const paramRegex = /([A-Z])(-?(?:\d+\.?\d*|\.\d+))/gi;
  const params = [];
  let m;
  // Skip the command itself, parse remaining
  const paramStr = code.substring(cmdMatch[0].length);
  while ((m = paramRegex.exec(paramStr)) !== null) {
    const letter = m[1].toUpperCase();
    const value = m[2];
    const PARAM_FALLBACKS = {
      X: 'X position', Y: 'Y position', Z: 'Z position',
      E: 'Extruder', F: 'Feed rate', S: 'Value',
      I: 'X offset', J: 'Y offset', K: 'Z offset', R: 'Radius',
      P: 'Parameter', T: 'Tool index', D: 'Diameter', H: 'Height offset',
      L: 'Loop count', N: 'Line number', O: 'Program number', Q: 'Value',
    };
    let description = def?.params[letter] || PARAM_FALLBACKS[letter] || 'Parameter';

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

export { GCODE_COMMANDS, decodeLine };
