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
  // Bambu Lab Extended
  'M620':  { name: 'AMS Filament Select', params: { S: 'Filament slot (0-3, 255=unload)' } },
  'M620.1': { name: 'Set Flush Extrusion Params', params: { E: 'Extrusion mode', F: 'Flush speed', T: 'Flush temp (°C)' } },
  'M620.3': { name: 'Filament Tangle Detection', params: { W: 'Enable (0/1)' } },
  'M620.10': { name: 'Flush Sequence Control', params: { A: 'Phase (0=pre, 1=post)', F: 'Speed', L: 'Length (mm)', H: 'Nozzle dia (mm)', T: 'Temp (°C)' } },
  'M620.11': { name: 'Long Retraction When Cut', params: { S: 'Enable (0/1)', I: 'Extruder', E: 'Retract dist (mm)', F: 'Speed (mm/min)' } },
  'M621':  { name: 'End AMS Filament Select', params: { S: 'Filament slot' } },
  'M622':  { name: 'Conditional If', params: { S: 'Flag value', J: 'Judge result (0/1)' } },
  'M622.1': { name: 'Set Default Flag Value', params: { S: 'Default (0/1)' } },
  'M623':  { name: 'End Conditional Block', params: {} },
  'M628':  { name: 'Begin Flush Sequence', params: { S: 'Mode (0=standard, 1=cut)' } },
  'M629':  { name: 'End Flush Sequence', params: { S: 'Mode' } },
  'M630':  { name: 'Filament Sensor Reset', params: { S: 'Sensor index', P: 'Reset mode' } },
  'M960':  { name: 'Laser/LED Control', params: { S: 'Device (1/2=laser, 5=logo)', P: 'State (0/1)' } },
  'M970':  { name: 'Lidar Calibration Scan', params: { Q: 'Scan type', A: 'Area param', B: 'Area param', C: 'Area param', H: 'Height', K: 'Param', M: 'Resolution', O: 'Output mode' } },
  'M970.3': { name: 'Edge Detection Scan', params: { Q: 'Scan type', A: 'Sensitivity', K: 'Param', O: 'Output mode' } },
  'M971':  { name: 'Camera Capture', params: { S: 'Capture mode', C: 'Config', O: 'Output target' } },
  'M974':  { name: 'Process Scan Results', params: { Q: 'Scan type', S: 'Processing mode', P: 'Param' } },
  'M975':  { name: 'Vibration Suppression', params: { S: 'Enable (0/1)' } },
  'M982.2': { name: 'Cog Noise Reduction', params: { S: 'Enable (0/1)' } },
  'M983':  { name: 'Extrusion Compensation Calibration', params: { F: 'Flow speed', A: 'Compensation factor', H: 'Nozzle dia (mm)' } },
  'M984':  { name: 'Apply Extrusion Compensation', params: { A: 'Adjustment', E: 'Extrusion param', S: 'Apply mode', F: 'Flow speed', H: 'Nozzle dia (mm)' } },
  'M991':  { name: 'Layer Change Notification', params: { S: 'Type', P: 'Layer number' } },
  'M1002': { name: 'System Control', params: {} },
  'M1004': { name: 'External Camera Shutter', params: { S: 'Shutter mode', P: 'Trigger (0/1)' } },
  'M1006': { name: 'Sound/Buzzer System', params: { S: 'Init', A: 'Ch1 note', B: 'Ch1 duration', L: 'Ch1 volume', C: 'Ch2 note', D: 'Ch2 duration', M: 'Ch2 volume', E: 'Ch3 note', F: 'Ch3 duration', N: 'Ch3 volume' } },
  'M1007': { name: 'Unknown Enable/Disable', params: { S: 'Enable (0/1)' } },
  'M9833': { name: 'Extrusion Comp (Tool Change)', params: { F: 'Flow speed', A: 'Compensation factor' } },
  'G29.1': { name: 'Set Z Offset for Bed Type', params: { Z: 'Z offset (mm)' } },
  'G29.2': { name: 'Enable/Disable ABL', params: { S: 'Enable (0/1)' } },
  'G39':   { name: 'Nozzle Clog Detection Scan', params: { S: 'Start scan', X: 'Scan X pos', Y: 'Scan Y pos' } },
  'G39.3': { name: 'Mass Exceed Detection', params: { S: 'Start scan' } },
  'G39.4': { name: 'Build Plate Detection', params: {} },
  'G380':  { name: 'Z Move with Endstop', params: { S: 'Mode (2=up, 3=down)', Z: 'Distance (mm)', F: 'Speed (mm/min)' } },
  'G392':  { name: 'Toggle Clog Detection', params: { S: 'State (0/1)' } },
  'M73.2': { name: 'Reset Time Estimate', params: { R: 'Magnitude (1.0=reset)' } },
  'M201.2': { name: 'Reset Acceleration Magnitude', params: { K: 'Magnitude (1.0=reset)' } },
  // Bambu Lab Extended (Phase 2 discoveries)
  'M963':  { name: 'Lidar Calibration Trigger', params: { S: 'Enable (0/1)' } },
  'M964':  { name: 'Lidar Calibration Process', params: {} },
  'M969':  { name: 'Lidar Scanning Mode', params: { S: 'Enable (0/1)', N: 'Scan count', A: 'Parameter' } },
  'M973':  { name: 'Camera/Scanner Stream', params: { S: 'Mode', P: 'Parameter' } },
  'M976':  { name: 'First Layer Scan', params: { S: 'Scan type', P: 'Mode' } },
  'M977':  { name: 'Register First Layer Scan', params: { S: 'Enable (0/1)', P: 'Parameter' } },
  'M980.3': { name: 'Lidar Scan Parameters', params: { A: 'Param', B: 'Speed', C: 'Param', D: 'Speed', E: 'Param', F: 'Param', H: 'Param', I: 'Param', J: 'Param', K: 'Param' } },
  'M993':  { name: 'Nozzle Cam Detection', params: { A: 'Mode', B: 'Mode', C: 'Mode' } },
  'M640':  { name: 'Tool Changer Operation', params: { S: 'Start' } },
  'M640.1': { name: 'Tool Retract/Select', params: { R: 'Retract', S: 'Select' } },
  'M640.2': { name: 'Tool Release', params: { R: 'Release (0/1)' } },
  'M640.4': { name: 'Tool Dock', params: {} },
  'M640.7': { name: 'Tool Lock/Unlock', params: { L: 'Lock', U: 'Unlock' } },
  'M640.8': { name: 'Select Tool by Index', params: { T: 'Tool', A: 'Index' } },
  'M641':  { name: 'End Tool Operation', params: {} },
  'G150':  { name: 'Nozzle Wipe Position', params: { T: 'Temperature' } },
  'G150.1': { name: 'Wipe Mouth Move', params: { F: 'Speed' } },
  'G150.2': { name: 'Wipe Variant', params: {} },
  'G150.3': { name: 'Safe Position Return', params: { F: 'Speed' } },
  'G151':  { name: 'Unknown H2D Motion', params: {} },
  'M142':  { name: 'Chamber Auto-Cooling', params: { P: 'Profile', R: 'Min temp', S: 'Target temp', T: 'Max temp', O: 'Limit' } },
  'M145':  { name: 'Airduct Mode', params: { P: 'Mode (0=cool, 1=heat)' } },
  'M481':  { name: 'Cutter Position Compensation', params: { S: 'Enable (0/1)' } },
  'M562':  { name: 'Extruder Selection', params: { P: 'Position', E: 'Extruder index', B: 'Enable' } },
  'M710':  { name: 'MC Fan Control', params: { A: 'Fan', S: 'Speed (0-255)' } },
  'M1028': { name: 'Unknown H2S Enable/Disable', params: { S: 'Enable (0/1)' } },
  'M620.6': { name: 'AMS Air Print Detection', params: { I: 'Extruder', W: 'Enable (0/1)' } },
  'M620.14': { name: 'Wipe Tower Center Position', params: { X: 'X position', Y: 'Y position' } },
  'M620.17': { name: 'Unknown H2D AMS Variant', params: {} },
  'M1015.3': { name: 'TPU Clog Detection', params: { S: 'Enable (0/1)' } },
  'M1015.4': { name: 'E Air Printing Detection', params: { S: 'Enable (0/1)', K: 'Mode', H: 'Nozzle dia' } },
  'M901':  { name: 'PA Config', params: { D: 'Parameter' } },
  'M983.1': { name: 'Extrusion Calibration Variant', params: { M: 'Mode' } },
  'M983.3': { name: 'Dynamic Extrusion Compensation', params: { F: 'Flow speed', A: 'Factor' } },
  'M983.4': { name: 'Deformation Compensation', params: { S: 'Enable (0/1)' } },
  'G383':  { name: 'Toolhead Offset Calibration', params: { O: 'Mode', U: 'Parameter', L: 'Extruder' } },
  'G383.3': { name: 'Offset Calibration Variant', params: { U: 'Parameter', L: 'Extruder' } },
  'G383.7': { name: 'Post-Wipe Offset Check', params: { U: 'Parameter', J: 'Mode' } },
  'G39.1': { name: 'Nozzle Wrap Detection Cal', params: {} },
  'G28.14': { name: 'Pre-Extrude Z Calibration', params: { R: 'Reset', D: 'Mode' } },
  'G28.140': { name: 'Extended Z Calibration', params: { D: 'Mode', S: 'Mode' } },
  'G29.20': { name: 'ABL Mode Selection', params: { A: 'Mode' } },
  'G29.7': { name: 'Position Compensation', params: { S: 'Enable (0/1)' } },
  'G29.9': { name: 'Leveling Data Record', params: {} },
  'G29.99': { name: 'Final Leveling Step', params: {} },
  'G29.4': { name: 'ABL Variant', params: {} },
  'M145.2': { name: 'Airduct Mode Variant', params: {} },
  // Bambu Lab Extended (Phase 2b — H2C dual-nozzle multi-material)
  'M632':  { name: 'Begin Nozzle Change', params: { S: 'Target nozzle index', M: 'Flag', N: 'Flag' } },
  'M633':  { name: 'End Nozzle Change', params: {} },
  'M620.15': { name: 'Flush Temperature Params', params: { P: 'Pre-flush temp (°C)', C: 'Cool-down temp (°C)' } },
  'G387':  { name: 'Safe Y Travel', params: { Y: 'Y position', J: 'Collision flag', F: 'Speed' } },
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
