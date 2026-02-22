// ===== FIRMWARE PROFILES =====
export const FIRMWARE = {
  bambu: {
    name: 'Bambu Lab',
    pause: [
      { value: 'M400U1', label: 'M400 U1 (Bambu)', default: true },
      { value: 'M600', label: 'M600' },
    ],
    pauseHint: 'M400 U1 is recommended for Bambu Lab printers.',
    pauseGcode: {
      'M400U1': 'M400 U1 ; Bambu pause',
      'M600': 'M600 ; Filament change pause',
    },
    filament: [
      { value: 'M1020', label: 'M1020 (AMS)', default: true },
      { value: 'M600', label: 'M600 (Standard)' },
    ],
    filamentHint: 'M1020 triggers AMS filament change with audio notification. M600 is the standard filament change command.',
    hasAMS: true,
    ejectHint: 'Eject commands are appended to the end of the G-code. Loop mode adds a note \u2014 true looping requires firmware support or external automation.',
  },
  klipper: {
    name: 'Klipper',
    pause: [
      { value: 'PAUSE', label: 'PAUSE (Macro)', default: true },
      { value: 'M600', label: 'M600' },
      { value: 'M0', label: 'M0' },
    ],
    pauseHint: 'PAUSE calls the [pause_resume] macro. M600 works if defined in your printer.cfg.',
    pauseGcode: {
      'PAUSE': 'PAUSE ; Klipper pause macro',
      'M600': 'M600 ; Filament change',
      'M0': 'M0 ; Pause (unconditional stop)',
    },
    filament: [
      { value: 'M600', label: 'M600', default: true },
    ],
    filamentHint: 'M600 must be defined as a gcode_macro in your printer.cfg. Klipper does not support M600 natively.',
    hasAMS: false,
    ejectHint: 'Eject commands are appended to the end of the G-code. Klipper macros can be used for automation.',
  },
  marlin: {
    name: 'Marlin',
    pause: [
      { value: 'M0', label: 'M0 (Pause)', default: true },
      { value: 'M600', label: 'M600 (Filament Change)' },
      { value: 'M25', label: 'M25 (SD Pause)' },
    ],
    pauseHint: 'M0 pauses and waits for user input. M600 triggers the filament change routine. M25 pauses SD card prints.',
    pauseGcode: {
      'M0': 'M0 ; Pause (Marlin)',
      'M600': 'M600 ; Filament change pause',
      'M25': 'M25 ; Pause SD print',
    },
    filament: [
      { value: 'M600', label: 'M600 (Standard)', default: true },
    ],
    filamentHint: 'M600 triggers the filament change sequence. Enable ADVANCED_PAUSE_FEATURE in Marlin configuration.',
    hasAMS: false,
    ejectHint: 'Eject commands are appended to the end of the G-code. Loop mode adds a note \u2014 true looping requires firmware support or external automation.',
  },
  rrf: {
    name: 'RepRapFirmware',
    pause: [
      { value: 'M226', label: 'M226 (Pause)', default: true },
      { value: 'M600', label: 'M600 (Filament Change)' },
      { value: 'M0', label: 'M0 (Stop)' },
    ],
    pauseHint: 'M226 pauses the print and runs the pause.g macro. M0 ends the print and runs stop.g.',
    pauseGcode: {
      'M226': 'M226 ; Pause (RRF)',
      'M600': 'M600 ; Filament change',
      'M0': 'M0 ; Stop print (RRF)',
    },
    filament: [
      { value: 'M600', label: 'M600 (Standard)', default: true },
    ],
    filamentHint: 'M600 triggers a filament change. Define the filament-change.g macro on your SD card.',
    hasAMS: false,
    ejectHint: 'Eject commands are appended to the end of the G-code.',
  },
};

// ===== G-CODE REFERENCE DATA =====
export const GCODE_REFERENCE = [
  // \u2500\u2500 Movement \u2500\u2500
  { code: 'G0', name: 'Rapid Move', category: 'Movement',
    description: 'Move the print head as fast as possible without extruding. Used for travel moves between print areas. The printer moves all axes simultaneously to reach the target position.',
    params: [
      { letter: 'X', name: 'Target X position on the bed, in millimeters from the left edge', example: '100' },
      { letter: 'Y', name: 'Target Y position on the bed, in millimeters from the front edge', example: '100' },
      { letter: 'Z', name: 'Target Z height above the bed, in millimeters', example: '5' },
      { letter: 'F', name: 'Movement speed in millimeters per minute (mm/min). 6000 = 100mm/s', example: '9000' },
    ],
    example: 'G0 F9000 ; Set travel speed to 150mm/s\nG0 X100 Y100 ; Move nozzle to center of bed\nG0 Z10 ; Raise nozzle 10mm above bed',
    template: 'G0 X__ Y__ F9000',
    firmware: { bambu: null, klipper: null, marlin: 'G0 and G1 behave identically in Marlin \u2014 both respect the F parameter.', reprap: null }
  },
  { code: 'G1', name: 'Linear Move', category: 'Movement',
    description: 'Move the print head in a straight line at a controlled speed. This is the most common command \u2014 it does all the actual printing. When E is included, filament is pushed through the nozzle as the head moves.',
    params: [
      { letter: 'X', name: 'Target X position in millimeters. In absolute mode (G90), measured from bed origin. In relative mode (G91), distance to move', example: '10.5' },
      { letter: 'Y', name: 'Target Y position in millimeters, same coordinate rules as X', example: '20.0' },
      { letter: 'Z', name: 'Target Z height in millimeters. Typically 0.2mm per layer', example: '0.3' },
      { letter: 'F', name: 'Speed in mm/min. Print moves are typically 600-3000 (10-50mm/s). F sticks until changed', example: '1500' },
      { letter: 'E', name: 'Extruder position in mm of filament. In absolute mode, total since last G92 E0. In relative mode, amount to push for this move', example: '0.5' },
    ],
    example: '; Print a 10mm line along X axis:\nG1 X10 Y0 E0.5 F1500 ; Move 10mm right, extrude 0.5mm of filament at 25mm/s\n; Move to next layer:\nG1 Z0.4 F600 ; Raise nozzle to 0.4mm (layer 2 at 0.2mm height)\n; Retraction (pull filament back to prevent oozing):\nG1 E-1.0 F2400 ; Retract 1mm of filament at 40mm/s',
    template: 'G1 X__ Y__ Z__ F1500 E__',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: null }
  },
  { code: 'G2', name: 'Clockwise Arc', category: 'Movement',
    description: 'Move in a clockwise arc. I and J are the offsets from the current position to the center of the arc. The nozzle traces the arc from where it is now to the X,Y endpoint.',
    params: [
      { letter: 'X', name: 'End X position of the arc in mm', example: '10' },
      { letter: 'Y', name: 'End Y position of the arc in mm', example: '20' },
      { letter: 'I', name: 'X offset from current position to arc center, in mm. Positive = right of current pos', example: '5' },
      { letter: 'J', name: 'Y offset from current position to arc center, in mm. Positive = behind current pos', example: '0' },
      { letter: 'E', name: 'Extruder position in mm (how much filament to extrude over the arc)', example: '1.2' },
      { letter: 'F', name: 'Speed in mm/min', example: '1200' },
    ],
    example: '; Draw a half circle (180\u00b0) with 5mm radius:\n; Starting at X0 Y0, center at X5 Y0, ending at X10 Y0\nG2 X10 Y0 I5 J0 F1200 E0.8\n; Draw a full circle with 10mm radius:\nG2 I10 J0 F1200 E3.14',
    template: 'G2 X__ Y__ I__ J__ F1200',
    firmware: { bambu: 'Bambu Lab firmware supports arc commands natively.', klipper: 'Enable arc support with [gcode_arcs] in printer.cfg.', marlin: 'Enable ARC_SUPPORT in Configuration_adv.h.', reprap: null }
  },
  { code: 'G3', name: 'Counter-Clockwise Arc', category: 'Movement',
    description: 'Same as G2, but the arc goes counter-clockwise. All parameters work identically.',
    params: [
      { letter: 'X', name: 'End X position of the arc in mm', example: '10' },
      { letter: 'Y', name: 'End Y position of the arc in mm', example: '20' },
      { letter: 'I', name: 'X offset from current position to arc center, in mm', example: '5' },
      { letter: 'J', name: 'Y offset from current position to arc center, in mm', example: '0' },
      { letter: 'E', name: 'Extruder position in mm', example: '1.2' },
      { letter: 'F', name: 'Speed in mm/min', example: '1200' },
    ],
    example: '; Counter-clockwise half circle:\nG3 X10 Y0 I5 J0 F1200 E0.8',
    template: 'G3 X__ Y__ I__ J__ F1200',
    firmware: { bambu: null, klipper: 'Enable arc support with [gcode_arcs] in printer.cfg.', marlin: 'Enable ARC_SUPPORT in Configuration_adv.h.', reprap: null }
  },
  { code: 'G28', name: 'Home Axes', category: 'Movement',
    description: 'Move the print head to the home position (0,0,0) using the endstop switches. With no parameters, homes all three axes. You can home individual axes by specifying them.',
    params: [
      { letter: 'X', name: 'Home only the X axis (no value needed)', example: '' },
      { letter: 'Y', name: 'Home only the Y axis (no value needed)', example: '' },
      { letter: 'Z', name: 'Home only the Z axis (no value needed)', example: '' },
    ],
    example: 'G28 ; Home all axes (X, Y, and Z)\nG28 X Y ; Home only X and Y, leave Z where it is\nG28 Z ; Home only Z axis',
    template: 'G28',
    firmware: { bambu: null, klipper: 'Uses [homing_override] or [safe_z_home] if configured.', marlin: null, reprap: null }
  },
  { code: 'G90', name: 'Absolute Positioning', category: 'Movement',
    description: 'Switch to absolute positioning. All X/Y/Z values in G0/G1 are measured from the bed origin (0,0,0). This is the default mode \u2014 "G1 X50" means "go to position 50mm".',
    params: [],
    example: 'G90 ; Switch to absolute mode\nG1 X50 Y50 ; Move to (50, 50) on the bed\nG1 X100 ; Move to X=100 (not 100mm further)',
    template: 'G90',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: 'In RepRapFirmware, G90 also affects the extruder. Use M82/M83 to set extruder mode independently.' }
  },
  { code: 'G91', name: 'Relative Positioning', category: 'Movement',
    description: 'Switch to relative (incremental) positioning. All X/Y/Z values are distances to move from the current position. "G1 X50" means "move 50mm to the right". Remember to switch back to G90 when done.',
    params: [],
    example: '; Lift nozzle 5mm and move aside (common pause sequence):\nG91 ; Switch to relative\nG1 Z5 F600 ; Lift nozzle 5mm\nG1 X-10 Y-10 F3000 ; Move 10mm left and 10mm forward\nG90 ; Switch back to absolute',
    template: 'G91\nG1 Z5 F600\nG90',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: 'In RepRapFirmware, G91 also affects the extruder.' }
  },
  { code: 'G92', name: 'Set Position', category: 'Movement',
    description: 'Tell the printer "you are now at this position" without actually moving. Most commonly used as G92 E0 to reset the extruder counter to zero (prevents E values from getting very large).',
    params: [
      { letter: 'X', name: 'Set current X position to this value (mm)', example: '0' },
      { letter: 'Y', name: 'Set current Y position to this value (mm)', example: '0' },
      { letter: 'Z', name: 'Set current Z position to this value (mm)', example: '0' },
      { letter: 'E', name: 'Set current extruder position to this value (mm). E0 resets the counter', example: '0' },
    ],
    example: 'G92 E0 ; Reset extruder to zero (most common use)\n; After a filament change, if you need to recalibrate Z:\nG92 Z10.2 ; Tell printer current Z is 10.2mm',
    template: 'G92 E0',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: null }
  },

  // \u2500\u2500 Temperature \u2500\u2500
  { code: 'M104', name: 'Set Hotend Temperature', category: 'Temperature',
    description: 'Start heating the nozzle and continue immediately \u2014 does NOT wait. The printer keeps executing commands while heating. Use M109 if you need to wait for the temperature before printing.',
    params: [
      { letter: 'S', name: 'Target temperature in degrees Celsius (\u00b0C). Common values: PLA=200, PETG=230, ABS=250', example: '200' },
      { letter: 'T', name: 'Extruder number (0-based) for multi-extruder printers. Default is 0', example: '0' },
    ],
    example: '; Start preheating while doing other things:\nM104 S200 ; Begin heating nozzle to 200\u00b0C\nG28 ; Home axes while nozzle heats up\nM109 S200 ; Now wait for it to reach 200\u00b0C',
    template: 'M104 S200',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: null }
  },
  { code: 'M109', name: 'Wait for Hotend Temperature', category: 'Temperature',
    description: 'Set the nozzle temperature and WAIT until it reaches the target before continuing. The printer will not execute any more commands until the temperature is reached. This blocks the print.',
    params: [
      { letter: 'S', name: 'Target temp in \u00b0C \u2014 waits for heating only (if nozzle is hotter, it does not wait to cool down)', example: '200' },
      { letter: 'R', name: 'Target temp in \u00b0C \u2014 waits for EXACT temp (waits for both heating AND cooling)', example: '200' },
    ],
    example: '; Wait for PLA temperature:\nM109 S200 ; Heat to 200\u00b0C and wait\n; Wait for exact temperature (useful after switching materials):\nM109 R180 ; Wait until nozzle is exactly 180\u00b0C, even if cooling down',
    template: 'M109 S200',
    firmware: { bambu: null, klipper: null, marlin: 'S waits only for heating. R waits for both heating and cooling.', reprap: null }
  },
  { code: 'M140', name: 'Set Bed Temperature', category: 'Temperature',
    description: 'Start heating the print bed and continue immediately \u2014 does NOT wait. Beds heat slowly (can take several minutes), so start early. Use M190 to wait.',
    params: [
      { letter: 'S', name: 'Target bed temperature in \u00b0C. Common values: PLA=60, PETG=70, ABS=100', example: '60' },
    ],
    example: '; Preheat bed early (beds are slow to heat):\nM140 S60 ; Start heating bed to 60\u00b0C\nM104 S200 ; Also start heating nozzle\nG28 ; Home while everything heats\nM190 S60 ; Now wait for bed\nM109 S200 ; Then wait for nozzle',
    template: 'M140 S60',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: null }
  },
  { code: 'M190', name: 'Wait for Bed Temperature', category: 'Temperature',
    description: 'Set the bed temperature and WAIT until reached. Can take 2-5 minutes depending on target. Usually paired with M140 for efficient preheating.',
    params: [
      { letter: 'S', name: 'Target bed temp in \u00b0C \u2014 waits for heating only', example: '60' },
      { letter: 'R', name: 'Target bed temp in \u00b0C \u2014 waits for exact temp (heating or cooling)', example: '60' },
    ],
    example: 'M190 S60 ; Heat bed to 60\u00b0C and wait\nM190 R45 ; Wait for bed to cool to exactly 45\u00b0C',
    template: 'M190 S60',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: null }
  },
  { code: 'M106', name: 'Set Fan Speed', category: 'Temperature',
    description: 'Control the part cooling fan. The fan blows on the printed plastic to cool it quickly. Speed is 0-255 where 0=off and 255=full blast. To convert percentage: multiply by 2.55 (50% = 128).',
    params: [
      { letter: 'S', name: 'Fan speed from 0 (off) to 255 (100%). Examples: 64=25%, 128=50%, 191=75%, 255=100%', example: '255' },
      { letter: 'P', name: 'Fan index for multi-fan setups. P0 = part cooling fan (default), P1/P2 = auxiliary fans', example: '0' },
    ],
    example: 'M106 S255 ; Fan at 100% (max cooling, good for PLA)\nM106 S128 ; Fan at 50% (good for PETG bridges)\nM106 S0 ; Fan off (same as M107)\n; For Bambu Lab auxiliary fan:\nM106 P1 S255 ; Turn on aux fan at full speed',
    template: 'M106 S255',
    firmware: { bambu: 'P0 = part cooling fan, P1 = auxiliary fan, P2 = chamber fan.', klipper: 'Fan must be defined as [fan] in printer.cfg. Additional fans use [fan_generic].', marlin: null, reprap: null }
  },
  { code: 'M107', name: 'Fan Off', category: 'Temperature',
    description: 'Turn off the part cooling fan completely. Shortcut for M106 S0.',
    params: [],
    example: '; Turn fan off for first few layers (better bed adhesion):\nM107 ; Fan off\n; ... print first 3 layers ...\nM106 S255 ; Fan on for remaining layers',
    template: 'M107',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: null }
  },

  // \u2500\u2500 Extrusion \u2500\u2500
  { code: 'M82', name: 'Absolute Extrusion', category: 'Extrusion',
    description: 'Set the extruder to absolute mode. The E value in G1 commands is the total filament pushed since the last G92 E0 reset. Most slicers use this mode. Example: E10 means "10mm total extruded so far".',
    params: [],
    example: 'M82 ; Use absolute extrusion\nG92 E0 ; Reset E counter to zero\nG1 X10 E0.5 ; Extrude 0.5mm total\nG1 X20 E1.0 ; Extrude 0.5mm more (1.0 - 0.5 = 0.5mm for this move)\nG1 X30 E1.5 ; Extrude 0.5mm more (1.5 - 1.0 = 0.5mm for this move)',
    template: 'M82',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: 'In RepRapFirmware, M82 overrides G90/G91 for the extruder axis specifically.' }
  },
  { code: 'M83', name: 'Relative Extrusion', category: 'Extrusion',
    description: 'Set the extruder to relative mode. Each E value is the amount of filament to push for THAT move only. Example: E0.5 means "push 0.5mm of filament during this move". No need to track running totals.',
    params: [],
    example: 'M83 ; Use relative extrusion\nG1 X10 E0.5 ; Push 0.5mm of filament\nG1 X20 E0.5 ; Push another 0.5mm\nG1 E-1.0 F2400 ; Retract 1mm (negative = pull back)',
    template: 'M83',
    firmware: { bambu: null, klipper: 'Klipper recommends relative extrusion for better pressure advance behavior.', marlin: null, reprap: null }
  },

  // \u2500\u2500 Print Control \u2500\u2500
  { code: 'M0', name: 'Unconditional Stop', category: 'Print Control',
    description: 'Pause the print and wait for user to press a button on the LCD/touchscreen. The printer stops all movement and waits indefinitely (or until timeout).',
    params: [
      { letter: 'S', name: 'Optional timeout in seconds. After this many seconds, the print resumes automatically. Omit for indefinite pause', example: '30' },
    ],
    example: '; Pause to insert a magnet:\nM0 ; Pause \u2014 press button on LCD to resume\n; Pause with 60 second timeout:\nM0 S60 ; Auto-resume after 60 seconds if no button press',
    template: 'M0',
    firmware: { bambu: 'Not recommended for Bambu Lab \u2014 use M400 U1 instead.', klipper: 'M0 is supported but PAUSE macro is preferred.', marlin: 'Requires LCD or host connection to resume.', reprap: null }
  },
  { code: 'M25', name: 'Pause SD Print', category: 'Print Control',
    description: 'Pause a print that is running from the SD card or USB drive. Has no effect on prints streamed from a host computer (OctoPrint, etc.).',
    params: [],
    example: 'M25 ; Pause the SD card print',
    template: 'M25',
    firmware: { bambu: null, klipper: 'Not commonly used in Klipper \u2014 use PAUSE macro instead.', marlin: 'Only works for SD prints. For host prints, use M0 or M600.', reprap: null }
  },
  { code: 'M226', name: 'Wait for Pin / Pause', category: 'Print Control',
    description: 'In RepRapFirmware, pauses the print (like pressing Pause in the web interface). In Marlin, waits for a specific pin to change state (different behavior!).',
    params: [],
    example: '; RepRapFirmware: Pause for manual intervention\nM226 ; Pauses print, runs pause.g macro',
    template: 'M226',
    firmware: { bambu: 'Not supported on Bambu Lab.', klipper: 'Not supported in Klipper \u2014 use PAUSE macro.', marlin: 'In Marlin, M226 waits for a pin state, not a pause command.', reprap: 'Primary pause command in RepRapFirmware. Runs the pause.g macro.' }
  },
  { code: 'M600', name: 'Filament Change', category: 'Print Control',
    description: 'Initiate a filament change sequence. The printer will: 1) retract filament, 2) move the nozzle out of the way, 3) wait for you to swap filament, 4) prime the new filament, 5) resume printing.',
    params: [
      { letter: 'E', name: 'Initial retraction length in mm (how much to pull back before parking). Default varies by firmware', example: '3' },
      { letter: 'L', name: 'Filament load length in mm (how much to push when loading new filament)', example: '50' },
      { letter: 'X', name: 'Park X position in mm (where the nozzle moves to during change)', example: '10' },
      { letter: 'Y', name: 'Park Y position in mm', example: '10' },
      { letter: 'Z', name: 'Z lift in mm (how much to raise nozzle above print)', example: '5' },
    ],
    example: '; Basic filament change (uses firmware defaults):\nM600 ; Retract, park, wait for user, reload, resume\n; Filament change with custom park position:\nM600 X10 Y10 Z5 ; Park at front-left corner, lift 5mm\n; With custom retract and load lengths:\nM600 E4 L80 ; Retract 4mm, load 80mm of new filament',
    template: 'M600',
    firmware: { bambu: 'Supported but M1020 is preferred for AMS filament changes.', klipper: 'Must be defined as a [gcode_macro M600] in printer.cfg.', marlin: 'Requires ADVANCED_PAUSE_FEATURE enabled in Configuration_adv.h.', reprap: 'Runs the filament-change.g macro file.' }
  },
  { code: 'M400', name: 'Wait for Moves to Finish', category: 'Print Control',
    description: 'Wait until all buffered movement commands have finished executing. The printer buffers ahead for smooth motion \u2014 M400 forces it to fully catch up. Use before pauses or temperature changes.',
    params: [],
    example: '; Ensure nozzle is in position before pausing:\nG1 X50 Y50 F3000 ; Move to center\nM400 ; Wait for move to actually complete\nM0 ; Now pause (nozzle is definitely at 50,50)',
    template: 'M400',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: null }
  },
  { code: 'M400 U1', name: 'Bambu Lab Pause', category: 'Print Control',
    description: 'Bambu Lab-specific pause. Shows a pop-up dialog on the touchscreen with an audio alert. This is the recommended pause method for all Bambu Lab printers (X1, P1, A1 series).',
    params: [],
    example: '; Pause for insert placement on Bambu Lab:\nG91 ; Relative mode\nG1 Z5 F600 ; Lift nozzle 5mm\nG90 ; Absolute mode\nG1 X5 Y5 F6000 ; Move to front corner\nM400 U1 ; Show pause dialog on touchscreen',
    template: 'M400 U1',
    firmware: { bambu: 'Recommended pause command for all Bambu Lab printers.', klipper: 'Not supported \u2014 use PAUSE macro instead.', marlin: 'Not supported \u2014 use M0 or M600.', reprap: 'Not supported \u2014 use M226.' }
  },
  { code: 'PAUSE', name: 'Klipper Pause Macro', category: 'Print Control',
    description: 'Klipper-specific pause macro. Behavior (park position, retraction amount, speed) is defined in your printer.cfg. Much more customizable than M0.',
    params: [],
    example: '; Simple Klipper pause:\nPAUSE ; Runs your configured pause sequence\n; To resume, use RESUME command or UI button',
    template: 'PAUSE',
    firmware: { bambu: 'Not supported \u2014 use M400 U1.', klipper: 'Requires [pause_resume] in printer.cfg. Customize with gcode_macro.', marlin: 'Not supported \u2014 use M0 or M600.', reprap: 'Not supported \u2014 use M226.' }
  },

  // \u2500\u2500 Calibration & Leveling \u2500\u2500
  { code: 'G29', name: 'Auto Bed Leveling', category: 'Calibration & Leveling',
    description: 'Probe multiple points across the bed to create a mesh that compensates for an uneven surface. The probe measures the distance at each point and the firmware adjusts Z during printing. Always home (G28) first.',
    params: [],
    example: '; Typical bed leveling sequence:\nG28 ; Home all axes first (required!)\nG29 ; Probe the bed and create mesh\n; The mesh is now active \u2014 Z will auto-adjust during printing',
    template: 'G28\nG29',
    firmware: { bambu: 'Bambu Lab printers auto-level before each print. Manual G29 is not typically needed.', klipper: 'Use BED_MESH_CALIBRATE instead. G29 is not a native Klipper command.', marlin: 'Requires a probe (BLTouch, inductive, etc.) and AUTO_BED_LEVELING enabled.', reprap: 'Runs the bed.g macro to probe the bed.' }
  },
  { code: 'M48', name: 'Probe Repeatability Test', category: 'Calibration & Leveling',
    description: 'Test your Z-probe accuracy by probing the same spot multiple times. Reports the standard deviation \u2014 lower is better. A good probe should be under 0.01mm.',
    params: [
      { letter: 'P', name: 'Number of times to probe (more = more accurate test). Default is usually 10', example: '10' },
    ],
    example: '; Test probe accuracy with 10 samples:\nG28 ; Home first\nM48 P10 ; Probe 10 times, report std deviation\n; Good result: StdDev < 0.01mm\n; Bad result: StdDev > 0.03mm (probe needs adjustment)',
    template: 'M48 P10',
    firmware: { bambu: null, klipper: 'Use PROBE_ACCURACY command instead.', marlin: 'Requires Z_MIN_PROBE_REPEATABILITY_TEST enabled.', reprap: null }
  },
  { code: 'M500', name: 'Save Settings to EEPROM', category: 'Calibration & Leveling',
    description: 'Save current settings (steps/mm, PID values, Z-offset, acceleration, etc.) to permanent memory. Settings survive power cycles. Use after calibration so you don\'t have to recalibrate every time.',
    params: [],
    example: '; After PID tuning, save the results:\nM303 S200 E0 C8 ; Run PID autotune\nM301 P22.2 I1.08 D114.0 ; Apply the values\nM500 ; Save to EEPROM (survives power off)',
    template: 'M500',
    firmware: { bambu: null, klipper: 'Klipper uses SAVE_CONFIG instead of M500.', marlin: 'Requires EEPROM_SETTINGS enabled in Configuration.h.', reprap: 'Saves to config-override.g.' }
  },
  { code: 'M501', name: 'Load Settings from EEPROM', category: 'Calibration & Leveling',
    description: 'Load previously saved settings from EEPROM, overriding anything changed since boot. Useful to undo accidental changes without restarting.',
    params: [],
    example: '; Oops, changed acceleration wrong \u2014 reload saved settings:\nM501 ; Restore all saved values from EEPROM',
    template: 'M501',
    firmware: { bambu: null, klipper: 'Not applicable \u2014 Klipper reads printer.cfg at startup.', marlin: null, reprap: 'Runs config-override.g.' }
  },
  { code: 'M503', name: 'Report Settings', category: 'Calibration & Leveling',
    description: 'Print all current firmware settings to the serial console. Handy for checking your steps/mm, PID values, max speeds, and other config without opening firmware files.',
    params: [],
    example: 'M503 ; Dump all settings to console\n; Look for lines like:\n;   M92 X80 Y80 Z400 E93 (steps/mm)\n;   M301 P22.2 I1.08 D114 (PID values)',
    template: 'M503',
    firmware: { bambu: null, klipper: 'Not applicable \u2014 settings are in printer.cfg.', marlin: null, reprap: null }
  },

  // \u2500\u2500 Stepper & Motion \u2500\u2500
  { code: 'M84', name: 'Disable Steppers', category: 'Stepper & Motion',
    description: 'Turn off the stepper motors so the print head and bed can be moved by hand. Usually the last command in a print file. Caution: the nozzle will drop if Z is disabled while raised.',
    params: [
      { letter: 'S', name: 'Idle timeout in seconds \u2014 steppers auto-disable after this many seconds of inactivity', example: '120' },
    ],
    example: 'M84 ; Disable all steppers immediately\nM84 S120 ; Auto-disable after 120 seconds of idle',
    template: 'M84',
    firmware: { bambu: null, klipper: null, marlin: 'Also accessible as M18.', reprap: null }
  },
  { code: 'M201', name: 'Set Max Acceleration', category: 'Stepper & Motion',
    description: 'Set the maximum allowed acceleration for each axis. Higher = faster direction changes but more vibration/ringing. Units are mm/s\u00b2 (millimeters per second squared).',
    params: [
      { letter: 'X', name: 'X axis max acceleration in mm/s\u00b2. Typical: 500-3000', example: '1000' },
      { letter: 'Y', name: 'Y axis max acceleration in mm/s\u00b2. Usually same as X', example: '1000' },
      { letter: 'Z', name: 'Z axis max acceleration in mm/s\u00b2. Usually low (50-200) since Z moves are slow', example: '100' },
      { letter: 'E', name: 'Extruder max acceleration in mm/s\u00b2. Typical: 1000-10000', example: '5000' },
    ],
    example: '; Reduce acceleration for better print quality:\nM201 X500 Y500 ; Halve XY accel (less ringing)\n; Increase for speed:\nM201 X3000 Y3000 ; Higher accel (faster but may ring)',
    template: 'M201 X1000 Y1000 Z100 E5000',
    firmware: { bambu: null, klipper: 'Use SET_VELOCITY_LIMIT ACCEL=value instead.', marlin: null, reprap: null }
  },
  { code: 'M203', name: 'Set Max Feedrate', category: 'Stepper & Motion',
    description: 'Set the absolute maximum speed for each axis. The printer will never exceed these speeds even if the G-code requests faster. Units are mm/s (millimeters per second).',
    params: [
      { letter: 'X', name: 'X max speed in mm/s. Typical: 150-500', example: '200' },
      { letter: 'Y', name: 'Y max speed in mm/s. Usually same as X', example: '200' },
      { letter: 'Z', name: 'Z max speed in mm/s. Usually 5-20 (Z is slow)', example: '5' },
      { letter: 'E', name: 'Extruder max speed in mm/s. Typical: 25-100', example: '50' },
    ],
    example: '; Cap speeds for quiet printing:\nM203 X100 Y100 ; Limit to 100mm/s\n; Increase Z speed for faster layer changes:\nM203 Z10 ; Allow Z to move at 10mm/s',
    template: 'M203 X200 Y200 Z5 E50',
    firmware: { bambu: null, klipper: 'Use SET_VELOCITY_LIMIT VELOCITY=value instead.', marlin: null, reprap: null }
  },
  { code: 'M204', name: 'Set Default Acceleration', category: 'Stepper & Motion',
    description: 'Set the default acceleration used for different types of moves. Print moves are slower (better quality), travel moves are faster (save time), retract can be fastest.',
    params: [
      { letter: 'P', name: 'Print move acceleration in mm/s\u00b2. Used when extruding. Typical: 500-2000', example: '1000' },
      { letter: 'T', name: 'Travel move acceleration in mm/s\u00b2. Used for non-printing moves. Typical: 1000-5000', example: '2000' },
      { letter: 'R', name: 'Retraction acceleration in mm/s\u00b2. Used for E-only moves. Typical: 1000-5000', example: '3000' },
    ],
    example: '; Slow down printing acceleration for quality:\nM204 P800 T2000 ; Gentle prints, fast travels\n; Speed up for draft prints:\nM204 P2000 T5000 ; Aggressive acceleration',
    template: 'M204 P1000 T2000',
    firmware: { bambu: null, klipper: 'Use SET_VELOCITY_LIMIT ACCEL=value. Klipper uses a single acceleration value.', marlin: null, reprap: null }
  },
  { code: 'M205', name: 'Set Jerk / Junction Deviation', category: 'Stepper & Motion',
    description: 'Set jerk limits \u2014 the maximum speed the printer can instantly change direction at. Lower values = smoother prints but slower corners. Higher values = faster corners but more vibration.',
    params: [
      { letter: 'X', name: 'X jerk in mm/s \u2014 max instant speed change for X axis. Typical: 5-15', example: '8' },
      { letter: 'Y', name: 'Y jerk in mm/s. Usually same as X', example: '8' },
      { letter: 'Z', name: 'Z jerk in mm/s. Usually very low (0.2-0.5)', example: '0.4' },
      { letter: 'E', name: 'Extruder jerk in mm/s. Typical: 2-10', example: '5' },
      { letter: 'J', name: 'Junction deviation in mm (modern alternative to jerk). Typical: 0.01-0.02', example: '0.013' },
    ],
    example: '; Reduce jerk for quieter, smoother printing:\nM205 X5 Y5 ; Lower jerk = less vibration\n; Increase for speed (may cause ringing):\nM205 X12 Y12 ; Higher jerk = faster corners',
    template: 'M205 X8 Y8 Z0.4 E5',
    firmware: { bambu: null, klipper: 'Klipper uses square_corner_velocity in printer.cfg instead of jerk.', marlin: 'J parameter enables Junction Deviation mode (alternative to classic jerk).', reprap: 'RepRapFirmware uses M566 for jerk settings, not M205.' }
  },
  { code: 'M220', name: 'Set Speed Factor', category: 'Stepper & Motion',
    description: 'Override ALL print speeds as a percentage. Like the speed dial on your printer. 100% = normal, 50% = half speed, 200% = double speed. Useful for slowing down tricky sections mid-print.',
    params: [
      { letter: 'S', name: 'Speed as a percentage. 100 = normal speed. Range: 10-999', example: '100' },
    ],
    example: 'M220 S50 ; Half speed (50%) \u2014 for tricky overhangs\nM220 S100 ; Back to normal speed\nM220 S150 ; 50% faster than normal',
    template: 'M220 S100',
    firmware: { bambu: null, klipper: null, marlin: null, reprap: null }
  },
  { code: 'M221', name: 'Set Flow Rate', category: 'Stepper & Motion',
    description: 'Override the extrusion flow rate as a percentage. Adjusts how much plastic comes out. Useful for fine-tuning: 95% if over-extruding, 105% if under-extruding.',
    params: [
      { letter: 'S', name: 'Flow as a percentage. 100 = normal flow. Common adjustments: 90-110', example: '100' },
    ],
    example: 'M221 S95 ; Reduce flow to 95% (fixing slight over-extrusion)\nM221 S100 ; Back to normal flow\nM221 S105 ; Increase flow to 105% (filling gaps)',
    template: 'M221 S100',
    firmware: { bambu: null, klipper: 'Use SET_PRESSURE_ADVANCE for flow tuning instead.', marlin: null, reprap: null }
  },

  // \u2500\u2500 Filament & Material \u2500\u2500
  { code: 'M1020', name: 'Bambu AMS Filament Change', category: 'Filament & Material',
    description: 'Bambu Lab-specific command to switch which filament the AMS (Automatic Material System) feeds. The AMS has 4 slots numbered 0-3. Plays an audio notification when changing.',
    params: [
      { letter: 'S', name: 'AMS slot number (0-3). S0 = Slot 1, S1 = Slot 2, S2 = Slot 3, S3 = Slot 4', example: '1' },
    ],
    example: '; Switch to second AMS slot (red filament):\nM1020 S1 ; Load from AMS slot 2\n; Switch back to first slot (white filament):\nM1020 S0 ; Load from AMS slot 1',
    template: 'M1020 S0',
    firmware: { bambu: 'Primary AMS filament change command. Slots: S0=slot 1, S1=slot 2, S2=slot 3, S3=slot 4.', klipper: 'Not supported \u2014 Bambu Lab specific.', marlin: 'Not supported \u2014 Bambu Lab specific.', reprap: 'Not supported \u2014 Bambu Lab specific.' }
  },
  { code: 'T0', name: 'Select Extruder', category: 'Filament & Material',
    description: 'Select which extruder to use on multi-extruder printers. T0 = first extruder, T1 = second, T2 = third, etc. Used for dual-color or multi-material printing.',
    params: [],
    example: '; Switch between extruders for dual-color print:\nT0 ; Use first extruder (e.g., white PLA)\nG1 X50 Y50 E10 ; Print with extruder 0\nT1 ; Switch to second extruder (e.g., black PLA)\nG1 X60 Y50 E10 ; Print with extruder 1',
    template: 'T0',
    firmware: { bambu: 'Bambu Lab uses T commands internally with AMS.', klipper: 'Requires [extruder] and [extruder1] etc. in printer.cfg.', marlin: 'Requires EXTRUDERS > 1 in Configuration.h.', reprap: 'Runs the tool-change macro (tpre0.g, tpost0.g, tfree0.g).' }
  },

  // \u2500\u2500 Display & Communication \u2500\u2500
  { code: 'M117', name: 'Set LCD Message', category: 'Display & Communication',
    description: 'Display a custom message on the printer\'s LCD/touchscreen. Great for showing layer count, time remaining, or reminders. The message stays until replaced by another M117.',
    params: [
      { letter: '', name: 'Message text \u2014 everything after "M117 " is displayed. No quotes needed', example: 'Layer 50 of 200' },
    ],
    example: 'M117 Printing base layers ; Show status\nM117 Insert magnet NOW! ; Show reminder\nM117 ; Clear the message (empty)',
    template: 'M117 Your message here',
    firmware: { bambu: 'May not display on Bambu Lab touchscreen.', klipper: 'Requires [display] in printer.cfg. Also supports SET_DISPLAY_TEXT.', marlin: null, reprap: 'Displays on PanelDue or web interface.' }
  },
  { code: 'M118', name: 'Serial Message', category: 'Display & Communication',
    description: 'Send a text message to the connected host software (OctoPrint, Mainsail, Pronterface, etc.). Useful for logging, triggering plugins, or debugging G-code scripts.',
    params: [
      { letter: '', name: 'Message text \u2014 sent to the host over serial/USB', example: 'Print checkpoint reached' },
    ],
    example: 'M118 Starting layer 50 ; Log message to host\nM118 Filament change needed ; Alert the host software',
    template: 'M118 Message here',
    firmware: { bambu: null, klipper: 'Use RESPOND MSG="text" for Klipper host messaging.', marlin: null, reprap: null }
  },
  { code: 'M73', name: 'Set Print Progress', category: 'Display & Communication',
    description: 'Tell the printer how far along the print is (percentage) and estimated time remaining. Slicers usually insert these automatically. The printer displays this info on the LCD.',
    params: [
      { letter: 'P', name: 'Progress percentage, 0 to 100', example: '50' },
      { letter: 'R', name: 'Remaining time in minutes. 30 = about 30 minutes left', example: '30' },
    ],
    example: 'M73 P0 R120 ; 0% done, about 2 hours remaining\nM73 P50 R60 ; 50% done, about 1 hour left\nM73 P100 R0 ; 100% complete',
    template: 'M73 P__ R__',
    firmware: { bambu: 'Bambu Lab uses this to display progress on the touchscreen.', klipper: 'Supported with [display] and SET_DISPLAY_TEXT.', marlin: 'Requires SET_PROGRESS_MANUALLY enabled.', reprap: null }
  },

  // \u2500\u2500 PID & Advanced \u2500\u2500
  { code: 'M303', name: 'PID Autotune', category: 'PID & Advanced',
    description: 'Automatically calibrate the PID temperature control for the hotend or bed. The printer cycles the heater on and off, measures the response, and calculates optimal P/I/D values for stable temperature.',
    params: [
      { letter: 'S', name: 'Target temperature in \u00b0C to tune at. Use your normal printing temp (e.g., 200 for PLA)', example: '200' },
      { letter: 'E', name: 'Heater index: 0 = hotend (default), -1 = heated bed', example: '0' },
      { letter: 'C', name: 'Number of heating cycles. More cycles = more accurate. 5-10 recommended', example: '8' },
    ],
    example: '; Tune hotend PID at 200\u00b0C:\nM303 S200 E0 C8 ; 8 cycles at 200\u00b0C\n; Printer will output values like: Kp=22.2 Ki=1.08 Kd=114.0\n; Apply them: M301 P22.2 I1.08 D114.0\n; Save: M500\n\n; Tune bed PID at 60\u00b0C:\nM303 S60 E-1 C8 ; E-1 = bed heater',
    template: 'M303 S200 E0 C8',
    firmware: { bambu: 'Bambu Lab printers have factory-tuned PID. Manual tuning is not recommended.', klipper: 'Use PID_CALIBRATE HEATER=extruder TARGET=200 instead.', marlin: 'After tuning, apply values with M301 (hotend) or M304 (bed), then M500 to save.', reprap: 'Use M303 H1 S200 for the hotend heater.' }
  },
  { code: 'M301', name: 'Set Hotend PID', category: 'PID & Advanced',
    description: 'Set the PID control parameters for the hotend heater. These values determine how accurately the nozzle holds temperature. Get values from M303 autotune. Save with M500.',
    params: [
      { letter: 'P', name: 'Proportional gain (Kp) \u2014 how aggressively to heat. Higher = faster response but may overshoot', example: '22.2' },
      { letter: 'I', name: 'Integral gain (Ki) \u2014 corrects long-term drift. Too high = oscillation', example: '1.08' },
      { letter: 'D', name: 'Derivative gain (Kd) \u2014 dampens overshoot. Higher = smoother but slower', example: '114.0' },
    ],
    example: '; Apply PID values from autotune:\nM301 P22.2 I1.08 D114.0\nM500 ; Save to EEPROM so they survive reboot',
    template: 'M301 P__ I__ D__',
    firmware: { bambu: 'Not user-configurable on Bambu Lab.', klipper: 'PID values are set in printer.cfg under [extruder] section.', marlin: 'Save to EEPROM with M500 after setting.', reprap: 'Use M307 for heater model tuning instead.' }
  },
  { code: 'M304', name: 'Set Bed PID', category: 'PID & Advanced',
    description: 'Set PID parameters for the heated bed. Same concept as M301 but for the bed heater. Bed PID values are typically very different from hotend values because beds are much larger and slower.',
    params: [
      { letter: 'P', name: 'Proportional gain (Kp). Bed values are usually much higher than hotend (100-400)', example: '70.3' },
      { letter: 'I', name: 'Integral gain (Ki)', example: '1.6' },
      { letter: 'D', name: 'Derivative gain (Kd)', example: '350.0' },
    ],
    example: '; Apply bed PID values from M303 autotune:\nM304 P70.3 I1.6 D350.0\nM500 ; Save to EEPROM',
    template: 'M304 P__ I__ D__',
    firmware: { bambu: 'Not user-configurable on Bambu Lab.', klipper: 'PID values are set in printer.cfg under [heater_bed] section.', marlin: null, reprap: 'Use M307 for heater model tuning instead.' }
  },
];
