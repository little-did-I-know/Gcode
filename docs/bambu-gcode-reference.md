# Bambu Lab G-Code Command Reference

A comprehensive reference of proprietary G-code commands used by Bambu Lab 3D printers. These commands are not part of standard G-code (Marlin/Klipper/RepRap) and are specific to Bambu Lab firmware.

> This document was reverse-engineered from Bambu Studio slicer output. See the confidence tags for reliability of each entry.

## How to Read This Document

### Confidence Tags

- **Verified** — Confirmed via inline slicer comments or unambiguous behavior
- **Inferred** — Deduced from context, parameter patterns, surrounding commands, and gcode section placement
- **Unknown** — Command observed in slicer output but purpose is unclear; needs targeted testing

### Model Applicability

- `[X1C]` — X1 Carbon (enclosed CoreXY, lidar, chamber heating)
- `[P1S]` — P1S (enclosed CoreXY, no lidar)
- `[H2]` — H2 (enclosed CoreXY, new series)
- `[H2D]` — H2D (dual extrusion)
- `[H2C]` — H2C (tool changer)
- `[H2S]` — H2S (single extruder variant)
- `[A1]` — A1 (open bed, visual sensor)
- `[A1M]` — A1 mini (open bed, visual sensor)
- `[ALL]` — All Bambu Lab printers

### Parameter Notation

- `<n>` — Numeric value
- `<0/1>` — Binary flag (0=off, 1=on)
- `<speed>` — Feed rate or volumetric speed value
- `<temp>` — Temperature in degrees Celsius
- `<dist>` — Distance in millimeters
- `<dia>` — Nozzle diameter in millimeters
- `<type>` — String value (e.g., filament type name)

## Table of Contents

1. [AMS & Filament Management](#ams--filament-management)
2. [Conditional Logic](#conditional-logic)
3. [System & Display](#system--display)
4. [Camera & Lidar](#camera--lidar)
5. [Calibration & Compensation](#calibration--compensation)
6. [Extended Motion](#extended-motion)
7. [Toolhead Wipe & Positioning](#toolhead-wipe--positioning)
8. [Miscellaneous / Unknown](#miscellaneous--unknown)
9. [Appendix A: M1002 Sub-Commands](#appendix-a-m1002-sub-commands)
10. [Appendix B: M1006 Sound System](#appendix-b-m1006-sound-system)
11. [Appendix C: Known System Flags](#appendix-c-known-system-flags)
12. [Appendix D: gcode_claim_action Codes](#appendix-d-gcode_claim_action-codes)
13. [Appendix E: Slicer Test Checklist (Phase 2)](#appendix-e-slicer-test-checklist-phase-2)

---

## AMS & Filament Management

Commands controlling the Automatic Material System (AMS), filament changes, flushing, and purging.

### M620 S — Begin AMS Filament Select Block

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M620 S<n> A`

**Parameters:**
- `S` — Filament slot index (0-3 for AMS slots, 255 for unload/retract to AMS)
- `A` — AMS mode flag

**Description:** Opens an AMS filament selection block. The firmware executes the filament change sequence between M620 and the matching M621. Must always be paired with M621 using the same S value.

**Context:** Appears in start gcode (initial filament load), filament change sequences, and end gcode (filament retract with S255).

**Examples:**
- `M620 S0A ; switch material if AMS exist` — Select slot 0
- `M620 S255` — Unload/retract filament to AMS (end of print)

---

### M620 M — Enable AMS Remap Mode

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M620 M`

**Parameters:** None

**Description:** Enables AMS slot remapping. When active, the printer can remap filament slot assignments (e.g., if a spool runs out, remap to another slot with the same material).

**Context:** Called once at the start of print, before the first M620 S block.

**Example:** `M620 M ;enable remap`

---

### M620.1 — Set Flush Extrusion Parameters

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M620.1 E F<speed> T<temp>`

**Parameters:**
- `E` — Extrusion mode flag
- `F` — Flush volumetric speed (typically `flush_volumetric_speeds[extruder]/2.4053*60`)
- `T` — Flush temperature in °C

**Description:** Configures extrusion parameters for the upcoming filament purge/flush sequence. Called twice during filament changes — once for the old filament's flush settings, once for the new filament's.

**Context:** Appears inside M620/M621 blocks during filament change and initial load sequences.

**Example:** `M620.1 E F548.788 T240`

---

### M620.3 — Filament Tangle Detection

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M620.3 W<0/1>`

**Parameters:**
- `W` — Enable flag (1=on, 0=off)

**Description:** Enables or disables filament tangle detection on the AMS. When enabled, the printer monitors for filament tangles during feeding.

**Context:** Called during startup after filament is loaded and runout detection is enabled.

**Example:** `M620.3 W1; === turn on filament tangle detection===`

---

### M620.6 — AMS Air Printing Detection

**Confidence:** Inferred | **Models:** [H2] [H2D] [H2C]

**Syntax:** `M620.6 I<n> W<0/1>`

**Parameters:**
- `I` — Extruder index
- `W` — Enable flag (1=on)

**Description:** Enables AMS air printing detection for a given extruder. Air printing detection monitors for missing filament during extrusion and pauses the print if detected.

**Example:** `M620.6 I0 W1` — Enable air printing detection for extruder 0

---

### M620.10 — Flush Sequence Control

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M620.10 A<n> F<speed> [L<len>] [H<dia>] [T<temp>]`

**Parameters:**
- `A` — Flush phase (0=pre-flush with old filament, 1=post-flush with new filament)
- `F` — Flush volumetric speed
- `L` — Flush length in mm (only present on phase A1)
- `H` — Nozzle diameter in mm (only present on phase A1)
- `T` — Flush temperature in °C (only present on phase A1)

**Description:** Controls the multi-phase purge tower flush during filament changes. Phase A0 sets up flushing with the outgoing filament, phase A1 sets up flushing with the incoming filament including total flush length and nozzle parameters.

**Context:** Called twice per filament change — once as A0 before tool change, once as A1 after.

**Examples:**
- `M620.10 A0 F548.788` — Pre-flush with old filament speed
- `M620.10 A1 F548.788 L200 H0.4 T240` — Post-flush with new filament params

---

### M620.11 — Long Retraction When Cut

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M620.11 S<0/1> [I<extruder>] [E<dist>] [F<speed>]`

**Parameters:**
- `S` — Enable (0=off, 1=on)
- `I` — Extruder index
- `E` — Retraction distance in mm (negative=retract, positive=recover)
- `F` — Retraction speed in mm/min

**Description:** Controls the cutter-assisted long retraction during filament changes. When enabled (S1), the printer performs an extended retraction to cleanly cut the filament at the cutter blade. When disabled (S0), standard retraction is used.

**Context:** Used when `long_retractions_when_cut` is enabled for the filament profile. Called before M628/M629 flush sequences.

**Examples:**
- `M620.11 S1 I0 E-18 F1200` — Enable long retraction, retract 18mm
- `M620.11 S0` — Disable (use standard retraction)

---

### M620.14 — Set Wipe Tower Center Position

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `M620.14 X<x> Y<y>`

**Parameters:**
- `X` — Wipe tower center X coordinate
- `Y` — Wipe tower center Y coordinate

**Description:** Sets the center position of the wipe/purge tower for multi-tool or dual-extrusion prints. The firmware uses this position to coordinate filament change flush movements.

**Example:** `M620.14 X128 Y128` — Set wipe tower center at (128, 128)

---

### M621 — End AMS Filament Select Block

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M621 S<n> A`

**Parameters:**
- `S` — Filament slot index (must match the corresponding M620 S value)
- `A` — AMS mode flag

**Description:** Closes the AMS filament selection block opened by M620. The printer finalizes the filament change at this point.

**Context:** Always paired with a preceding M620 with the same S value.

**Examples:**
- `M621 S0A` — End filament select for slot 0
- `M621 S255` — End filament retract sequence

---

### M628 — Begin Filament Flush Sequence

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M628 S<0/1>`

**Parameters:**
- `S` — Mode (0=standard flush, 1=flush with long retraction/cut)

**Description:** Signals the firmware to begin monitoring a filament purge sequence. The actual extrusion moves (G1 E commands) follow between M628 and M629. The firmware uses this to track purge progress.

**Context:** Appears after M620.11 setup, before the `; FLUSH_START` extrusion moves.

**Example:** `M628 S0` — Begin standard flush monitoring

---

### M629 — End Filament Flush Sequence

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M629 [S<0/1>]`

**Parameters:**
- `S` — Mode (matches corresponding M628, optional when called without params at end of all flushes)

**Description:** Signals the firmware that a filament purge sequence is complete. Paired with M628. Called with S parameter to end a specific flush phase, or without parameters to end all flushing.

**Context:** Appears after the flush extrusion moves, before the final wipe and temperature adjustment.

**Examples:**
- `M629 S1` — End flush phase (with long retraction mode)
- `M629` — End all flushing (final call)

---

### M630 — Filament Sensor Reset

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M630 S<n> P<n>`

**Parameters:**
- `S` — Sensor index (0 observed)
- `P` — Reset mode (0 observed)

**Description:** Resets the filament runout/presence sensor state. Called during startup to ensure the sensor is in a known state before printing begins.

**Context:** Appears in machine_start_gcode after motor current setup, before filament loading.

**Example:** `M630 S0 P0`

---

### M640.* — Tool Changer Operations (H2C)

**Confidence:** Inferred | **Models:** [H2C]

**Description:** The M640 family controls the H2C tool changer system. These commands manage the full tool change sequence including selection, docking, locking/unlocking, and retraction.

**Sub-commands:**

| Variant | Syntax | Purpose |
|---------|--------|---------|
| `M640 S` | `M640 S<n>` | Begin tool operation (start tool change) |
| `M640.1 R` | `M640.1 R<n>` | Retract tool from dock |
| `M640.1 S` | `M640.1 S<n>` | Select tool |
| `M640.2 R` | `M640.2 R<0/1>` | Tool release (0=hold, 1=release) |
| `M640.4` | `M640.4` | Tool dock (return tool to dock position) |
| `M640.7 L` | `M640.7 L<n>` | Tool lock |
| `M640.7 U` | `M640.7 U<n>` | Tool unlock |
| `M640.8 T A` | `M640.8 T<n> A<n>` | Select tool by index (T=tool, A=index) |

**Context:** These commands bracket a complete tool change operation. A typical sequence: `M640 S` (begin) → `M640.7 U` (unlock current) → `M640.4` (dock current) → `M640.1 S` (select new) → `M640.1 R` (retract new) → `M640.7 L` (lock new) → end with `M641`.

---

### M641 — End Tool Change Operation

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `M641`

**Parameters:** None

**Description:** Signals the end of a tool change operation started by M640. Always paired with a preceding M640 S command. The firmware finalizes the tool change state at this point.

**Context:** Called after the tool change sequence (M640.* sub-commands) is complete.

---

### M632 — Begin Nozzle Change (H2C Dual-Nozzle)

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `M632 S<n> M N`

**Parameters:**
- `S` — Target nozzle index
- `M` — Flag (purpose unknown)
- `N` — Flag (purpose unknown)

**Description:** Opens a nozzle change block on H2C dual-nozzle prints. Wraps NOZZLE_CHANGE_START sections around prime tower moves. The firmware switches to the target nozzle within this block. Always paired with M633 to end the nozzle change.

**Context:** Appears only in H2C multi-material dual-nozzle gcode. Analogous to M620/M621 for AMS filament changes but for physical nozzle switching.

**Example:** `M632 S3 M N ; begin nozzle change to nozzle 3`

---

### M633 — End Nozzle Change (H2C Dual-Nozzle)

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `M633`

**Parameters:** None

**Description:** Closes a nozzle change block opened by M632. The firmware finalizes the nozzle switch at this point. Always paired with a preceding M632.

**Context:** Called after the nozzle change sequence is complete, similar to M621 closing M620.

---

### M620.15 — Flush Temperature Params (H2C Dual-Nozzle)

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `M620.15 P<temp>` / `M620.15 C<temp>`

**Parameters:**
- `P` — Pre-flush temperature (°C)
- `C` — Cool-down temperature (°C)

**Description:** Sets flush temperature parameters during nozzle changes on H2C dual-nozzle prints. The P variant sets the pre-flush temperature, the C variant sets the cool-down temperature. Appears within nozzle change blocks (M632/M633).

**Examples:**
- `M620.15 P205` — Set pre-flush temp to 205°C
- `M620.15 C235` — Set cool-down temp to 235°C

---

### G387 — Safe Y Travel (H2C Dual-Nozzle)

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `G387 Y<n> J<0/1> F<speed>`

**Parameters:**
- `Y` — Y position (mm)
- `J` — Collision avoidance flag (1=enabled)
- `F` — Feed rate (mm/min)

**Description:** Safe Y-axis travel with collision avoidance for H2C dual-nozzle prints. The J flag enables collision checking to prevent nozzle-to-nozzle contact during Y-axis moves. Used during nozzle change sequences.

**Example:** `G387 Y295 J1 F30000 ; safe Y travel with collision avoidance`

---

## Conditional Logic

Bambu Lab firmware implements a conditional execution system using M622/M623 blocks, controlled by system flags queried via M1002.

**Usage Pattern:**
```
M1002 judge_flag <flag_name>   ; query the flag
M622 J1                         ; if flag is true
    ... commands ...            ; execute this block
M623                            ; end if
```

### M622 S — Conditional: If Flag Equals Value

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M622 S<n>`

**Parameters:**
- `S` — Expected flag value to match

**Description:** Tests the most recently set flag (via M1002 judge_flag or M622.1). If the flag value matches S, the commands until M623 are executed. Otherwise, execution skips to after M623.

**Example:** `M622 S1` — If flag equals 1, execute the following block

---

### M622 J — Conditional: If Last Judge Result

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M622 J<0/1/2>`

**Parameters:**
- `J` — Expected result:
  - `0` — If flag was false / not set
  - `1` — If flag was true / set
  - `2` — Tri-state: if flag indicates "full calibration needed" (H2C/H2D)

**Description:** Tests the result of the most recent `M1002 judge_flag` call. This is the most common form of conditional in Bambu gcode. J1 means "if the flag was true", J0 means "if the flag was false". On H2C/H2D printers, J2 provides a third state for flags like `auto_cali_toolhead_offset_flag` and `extrude_cali_flag`, where J2 = full calibration, J1 = quick calibration, J0 = skip.

**Example:**
```
M1002 judge_flag timelapse_record_flag
M622 J1          ; if timelapse is enabled
    M971 S11 C11 O0  ; capture frame
M623              ; end if
```

**H2C tri-state example:**
```
M1002 judge_flag auto_cali_toolhead_offset_flag
M622 J2          ; full calibration
    G383.3 U140 L3
M623
M622 J1          ; quick calibration
    G383 O2 U140 L3
M623
```

---

### M622.1 — Set Default Flag Value (Backward Compatibility)

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M622.1 S<0/1>`

**Parameters:**
- `S` — Default flag value (0 or 1)

**Description:** Sets a default value that older firmware versions will use if they don't recognize the following `M1002 judge_flag` command. Newer firmware reads the actual flag value and ignores this default. Ensures backward compatibility across firmware versions.

**Example:** `M622.1 S1 ; for prev firmware, default turned on`

---

### M623 — End Conditional Block

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M623`

**Parameters:** None

**Description:** Closes the conditional block opened by M622. In nested conditional structures, M623 serves as both the "end if" and the boundary between if/else branches.

**Examples:**
- `M623` — End the current conditional block
- `M623 ; end of "draw extrinsic para cali paint"` — With descriptive comment

---

## System & Display

Commands for controlling the printer's touchscreen display, sound system, and internal state management.

### M1002 — System Control Multiplex Command

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M1002 <sub_command> [: <value>]`

**Description:** A single M-code that acts as a gateway to many system sub-functions via string arguments. Unlike standard G-code parameters, M1002 uses freeform text after the command number. See [Appendix A](#appendix-a-m1002-sub-commands) for the complete sub-command reference.

**Sub-commands (summary):**
- `gcode_claim_action : <n>` — Set touchscreen display state
- `set_filament_type:<type>` — Set active filament type
- `judge_flag <flag_name>` — Query a system flag for M622 conditional
- `set_gcode_claim_speed_level : <n>` — Set speed display level
- `judge_last_extrude_cali_success` — Check calibration result
- `set_flag <name>=<value>` — Set a system flag

---

### M1003 — Power Loss Recovery Control

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `M1003 S<0/1>`

**Parameters:**
- `S` — Enable (0=off, 1=on)

**Description:** Enables or disables the power loss recovery system. When enabled (S1), the printer saves state periodically so it can resume after a power failure. Called with S1 near the start of printing and S0 at end of print.

**Context:** Observed in H2C multi-material files during the print phase.

**Examples:**
- `M1003 S1` — Enable power loss recovery
- `M1003 S0` — Disable power loss recovery

---

### M1004 — External Camera Shutter Trigger

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M1004 S<n> P<n>`

**Parameters:**
- `S` — Shutter mode (5 observed)
- `P` — Trigger flag (1=capture)

**Description:** Triggers an external camera shutter for timelapse capture. Called before M971 (internal camera capture) in the timelapse gcode sequence, suggesting it controls an external/auxiliary camera system.

**Context:** Appears in timelapse gcode section.

**Example:** `M1004 S5 P1 ; external shutter`

---

### M1006 — Sound/Buzzer System

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** Multiple forms (see below)

**Description:** Controls the printer's built-in buzzer/speaker to play melodies. Used for startup sounds, print completion sounds, and notifications. See [Appendix B](#appendix-b-m1006-sound-system) for the full sound note format.

**Forms:**
- `M1006 S1` — Initialize the sound system / begin note sequence
- `M1006 A<n> B<n> L<n> C<n> D<n> M<n> E<n> F<n> N<n>` — Define a sound note
- `M1006 W` — Play the queued notes and wait for completion

**Context:** Used in machine_start_gcode (startup melody) and machine_end_gcode (completion melody).

**Example (startup sound excerpt):**
```
M1006 S1                                              ; init sound
M1006 A0 B0 L100 C37 D10 M100 E37 F10 N100          ; note 1
M1006 A0 B0 L100 C41 D10 M100 E41 F10 N100          ; note 2
M1006 W                                               ; play and wait
```

---

### M1007 — Unknown Enable/Disable

**Confidence:** Unknown | **Models:** [ALL]

**Syntax:** `M1007 S<0/1>`

**Parameters:**
- `S` — Enable/disable flag (0=off, 1=on)

**Description:** Purpose not yet determined. Pattern analysis shows S0 appears at the start of filament change sequences and S1 appears at the end of start gcode and end of filament change sequences. Possibly related to motion planning, extrusion monitoring, or print state tracking.

**Context:**
- `M1007 S0` — Called at beginning of change_filament_gcode
- `M1007 S1` — Called at end of machine_start_gcode and end of change_filament_gcode

---

### M1009 — Z-Homing Sensor Enable (Multi-Head)

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `M1009 Q<n> L<0/1>`

**Parameters:**
- `Q` — Sensor mode (1 observed)
- `L` — Enable flag (1=activate sensor, 0=deactivate sensor)

**Description:** Enables/disables the Z-homing sensor for multi-head H2 variants. Wraps the `G28 Z` homing sequence — sensor is activated before Z homing and deactivated immediately after. Only present on H2C and H2D (multi-head printers); absent from H2S (single-head) and all other printer models. Likely configures the probe or sensor mode needed for correct Z homing when multiple toolheads with different offsets are present.

**Context:** Always brackets the Z homing move in the first homing section.

**Example:**
```
M1009 Q1 L1       ; activate Z-homing sensor
G90
G1 X175 Y160 F30000
G28 Z P0 T250     ; Z home
M1009 Q1 L0       ; deactivate Z-homing sensor
```

**Note:** Absent from H2S despite sharing the same H2 platform. This suggests the command is related to multi-toolhead Z offset management, not a general H2-series probe sensor.

---

## Camera & Lidar

Commands for controlling the laser module, camera capture, lidar scanning, and visual calibration systems.

### M960 — Laser/LED Control

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M960 S<n> P<0/1>`

**Parameters:**
- `S` — Device selector:
  - `1` — Laser module 1
  - `2` — Laser module 2
  - `5` — Logo lamp (LED on the toolhead)
  - `10` — External toolhead fan LED (H2C/H2D)
- `P` — State (0=off, 1=on)

**Description:** Controls the laser modules and LED indicators on the toolhead. The laser is used for lidar scanning and first-layer inspection on supported models. The logo lamp is the visible LED on the front of the print head. S10 controls the external fan LED on H2-series printers.

**Examples:**
- `M960 S1 P0 ; turn off laser`
- `M960 S2 P0 ; turn off laser`
- `M960 S5 P1 ; turn on logo lamp`
- `M960 S10 P1 ; ext fan led` (H2C/H2D)

---

### M970 — Lidar/Visual Calibration Scan

**Confidence:** Inferred | **Models:** [X1C] [A1] [A1M]

**Syntax:** `M970 Q<n> A<n> B<n> C<n> H<n> K<n> M<n> O<n>`

**Parameters:**
- `Q` — Scan type (0=build plate scan)
- `A`, `B`, `C` — Scan area parameters (coordinates or dimensions)
- `H` — Height parameter
- `K` — Unknown (0 observed)
- `M` — Scan resolution or number of passes
- `O` — Output mode (3 observed)

**Description:** Performs a lidar or visual sensor scan of the build plate for calibration. Uses the onboard lidar (X1C) or visual camera (A1 series) to measure the build surface.

**Context:** Used during the "mech mode fast check" startup sequence, after M970.3 edge detection.

**Example:** `M970 Q0 A10 B50 C90 H15 K0 M20 O3`

---

### M970.2 — Vibration/Resonance Scan

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `M970.2 Q<n> K<n> W<n> Z<n>`

**Parameters:**
- `Q` — Scan type (2 observed)
- `K` — Parameter (0 observed)
- `W` — Frequency parameter (38 observed)
- `Z` — Amplitude/threshold (0.01 observed)

**Description:** Performs a vibration or resonance frequency scan during the mechanical mode sweep sequence. Used alongside M970.3 (edge detection) and processed by M974 Q2. Part of the input shaping calibration pipeline.

**Context:** Appears in the "mech mode sweep" section of startup, after M970.3 scans.

**Example:**
```
M970.3 Q1 A5 K0 O1    ; edge detection scan
M974 Q1 S2 P0          ; process edge results
M970.3 Q0 A5 K0 O1    ; build plate scan
M974 Q0 S2 P0          ; process plate results
M970.2 Q2 K0 W38 Z0.01 ; vibration/resonance scan
M974 Q2 S2 P0          ; process vibration results
```

---

### M970.3 — Edge/Object Detection Scan

**Confidence:** Inferred | **Models:** [X1C] [A1] [A1M]

**Syntax:** `M970.3 Q<n> A<n> K<n> O<n>`

**Parameters:**
- `Q` — Scan type (1=edge detection)
- `A` — Sensitivity or area parameter
- `K` — Unknown (0 observed)
- `O` — Output mode (2 observed)

**Description:** Performs an edge or object detection scan. Uses the sensor to detect nozzle position or object boundaries. Runs before the main M970 build plate scan.

**Context:** First scan command in the "mech mode fast check" sequence.

**Example:** `M970.3 Q1 A7 K0 O2`

---

### M971 — Camera Capture

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M971 S<n> C<n> O<n>`

**Parameters:**
- `S` — Capture mode (11 observed)
- `C` — Capture configuration (11 observed)
- `O` — Output target (0 observed)

**Description:** Triggers the onboard camera to capture a frame. Used for timelapse recording. In end gcode, called repeatedly (30 times with M400 P100 delays) to capture a smooth end-of-print timelapse sequence.

**Context:** Appears in timelapse gcode (layer changes) and machine_end_gcode (final frames).

**Example:** `M971 S11 C11 O0`

---

### M9711 — Timelapse Capture Extended

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `M9711 M<n> E<n> U<n> V<n> Z<n> S<n> C<n> O<n> T<n>`

**Parameters:**
- `M` — Capture type/mode (0 observed)
- `E` — Extruder index (0 observed)
- `U` — X position for capture (mm)
- `V` — Y position for capture (mm)
- `Z` — Z height for capture (mm)
- `S` — Capture mode (11 observed)
- `C` — Capture config (10 observed)
- `O` — Output target (0 observed)
- `T` — Timeout in ms (3000 observed)

**Description:** Extended timelapse camera capture command for H2-series printers. Unlike M971 (which is a simple capture trigger), M9711 includes positional data so the firmware can move the nozzle to the capture position, take a photo, and return. Only appears in multi-material H2C/H2D files with timelapse enabled.

**Context:** Called at every layer change within the `timelapse_record_flag` conditional block.

**Example:** `M9711 M0 E0 U240 V266 Z0.7 S11 C10 O0 T3000`

---

### M972 — Safety/Detection Scan

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `M972 S<n> P<n> [T<n>] [C<n>] [X<n>]`

**Parameters:**
- `S` — Scan type (see table below)
- `P` — Mode (0 observed in all cases)
- `T` — Timeout in ms (2000-5000 observed, optional)
- `C` — Configuration (0 observed, optional)
- `X` — Extra parameter (1 observed with S36, optional)

**Description:** Performs various safety and detection scans during printer startup. Each S-value triggers a different detection check. These are hardware safety interlocks — the printer verifies physical conditions before proceeding.

**Known Scan Types:**

| S Value | Purpose | Inline Comment | Models |
|---------|---------|----------------|--------|
| 14 | Nozzle type detection | `nozzle type detection` | [H2C] [H2D] |
| 19 | Heatbed presence detection | `heatbed presence detection` | [H2C] [H2D] |
| 24 | Live-view camera foolproof check | `live-view camera foolproof` | [H2C] [H2D] |
| 26 | Build plate type scan (Textured PEI) | — | [H2C] [H2D] |
| 31 | Toolhead camera dirty detection | `toolhead camera dirty detection` | [H2C] [H2D] |
| 34 | Heatbed plate offset detection | `heatbed plate offset detection` | [H2C] [H2D] |
| 35 | Build plate edge detection | — | [H2C] [H2D] |
| 36 | Build plate type scan (non-textured) | `X1` param present | [H2C] [H2D] |
| 41 | Trash can anti-collision check | `trash can anti-collision` | [H2C] [H2D] |
| 46 | Vortex anti-collision check | `vortek anti-collision` | [H2C] [H2D] |

**Context:** Called during the first homing and detection startup sections. S19/S31/S34 are gated behind `build_plate_detect_flag`.

**Examples:**
- `M972 S24 P0 T2000 ; live-view camera foolproof`
- `M972 S41 P0 T5000 ; trash can anti-collision`
- `M972 S26 P0 C0` — Textured PEI plate scan (conditional on bed type)

---

### M974 — Process Scan Results

**Confidence:** Inferred | **Models:** [X1C] [A1] [A1M]

**Syntax:** `M974 Q<n> S<n> P<n>`

**Parameters:**
- `Q` — Scan type to process (0 or 1, matches the preceding M970/M970.3 Q value)
- `S` — Processing mode (2 observed)
- `P` — Parameter (0 observed)

**Description:** Tells the firmware to process and apply the results from a preceding lidar/visual scan. Always appears immediately after an M970 or M970.3 command, with the Q value matching the scan type.

**Context:** Paired with scan commands in the startup calibration sequence.

**Examples:**
- `M974 Q1 S2 P0` — Process edge detection results (after M970.3 Q1)
- `M974 Q0 S2 P0` — Process build plate scan results (after M970 Q0)

---

### M963 — Lidar Calibration Trigger

**Confidence:** Inferred | **Models:** [X1C]

**Syntax:** `M963 S<n>`

**Parameters:**
- `S` — Trigger mode (1=start calibration)

**Description:** Triggers a lidar calibration sequence. Called after M971 S5 P2 during the handeye calibration process.

**Context:** Part of the X1C lidar handeye calibration startup sequence. Followed immediately by M964.

**Example:** `M963 S1`

---

### M964 — Lidar Calibration Process

**Confidence:** Inferred | **Models:** [X1C]

**Syntax:** `M964`

**Parameters:** None

**Description:** Executes the lidar calibration process triggered by the preceding M963 command. Performs the actual calibration computation.

**Context:** Called immediately after M963 S1 in the handeye calibration sequence.

---

### M969 — Lidar Scanning Mode Control

**Confidence:** Inferred | **Models:** [X1C]

**Syntax:** `M969 S<0/1> [N<n>] [A<n>]`

**Parameters:**
- `S` — Enable (0=off, 1=on)
- `N` — Scan mode/passes (3 observed)
- `A` — Scan resolution or range parameter (2000 observed)

**Description:** Controls the lidar scanning mode. S1 starts active lidar scanning with the specified parameters. S0 turns off scanning. Used during handeye calibration and extrusion calibration sequences.

**Examples:**
- `M969 S1 N3 A2000` — Start scanning with 3 passes
- `M969 S0` — Turn off scanning

---

### M973 — Camera/Scanner Stream Control

**Confidence:** Inferred | **Models:** [X1C]

**Syntax:** `M973 S<n> [P<n>]`

**Parameters:**
- `S` — Stream mode:
  - `1` — Start camera/scanner stream
  - `2` — Capture or process frame (P=frame index)
  - `3` — Configure stream (P=configuration value)
  - `4` — Turn off scanner
  - `6` — Auto exposure for laser (P: 0=off, 1=on)
- `P` — Mode-dependent parameter

**Description:** Controls the camera and scanner streaming system on X1C. Manages the data pipeline for visual inspection and lidar scanning operations.

**Examples:**
- `M973 S1` — Start stream
- `M973 S2 P1` — Capture/process frame
- `M973 S4` — Turn off scanner
- `M973 S6 P1` — Enable auto exposure for laser

---

### M976 — First Layer / Build Plate Scanning

**Confidence:** Inferred | **Models:** [X1C]

**Syntax:** `M976 S<n> P<n>`

**Parameters:**
- `S` — Scan type:
  - `1` — Scan model before 2nd layer
  - `2` — Start heatbed scan
  - `3` — Register void printing detection
- `P` — Scan parameter (1 or 2 observed)

**Description:** Performs build plate and first layer scanning on X1C. Uses the lidar to verify print quality, detect adhesion issues, and register void (missing material) detection.

**Examples:**
- `M976 S1 P1` — Scan model before 2nd layer
- `M976 S2 P1` — Start heatbed scan
- `M976 S3 P2` — Register void printing detection

---

### M977 — Register First Layer Scan

**Confidence:** Inferred | **Models:** [X1C]

**Syntax:** `M977 S<n> P<n>`

**Parameters:**
- `S` — Mode (1 observed)
- `P` — Timeout or threshold (60 observed)

**Description:** Registers first layer scan data for quality monitoring. Part of the X1C's first layer inspection system.

**Context:** Called within the `scan_first_layer` conditional block.

**Example:** `M977 S1 P60`

---

### M980.3 — Lidar Extrusion Calibration Parameters

**Confidence:** Inferred | **Models:** [X1C]

**Syntax:** `M980.3 A<n> B<speed> C<n> D<speed> E<n> F<n> H<n> I<n> J<n> K<n>`

**Parameters:**
- `A` through `K` — Multi-parameter calibration profile defining speeds, distances, and thresholds for lidar-assisted extrusion calibration

**Description:** Configures a complex calibration profile for lidar-assisted extrusion calibration on X1C. The many parameters define the scanning speeds, measurement distances, and calibration thresholds for precise extrusion flow measurement.

**Context:** Used during the extrusion calibration phase on X1C printers where lidar provides real-time flow measurement.

**Example:** `M980.3 A10 B50 C15 D50 E10 F5 H0.4 I1 J2 K3`

---

## Calibration & Compensation

Commands for vibration suppression, noise reduction, dynamic extrusion calibration, pressure advance, and layer tracking.

### M975 — Vibration Suppression

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M975 S<0/1>`

**Parameters:**
- `S` — Enable (0=off, 1=on)

**Description:** Enables or disables the printer's vibration suppression / mechanical resonance compensation system. Called multiple times during startup to ensure it's active before printing.

**Examples:**
- `M975 S1 ; turn on vibration supression`
- `M975 S1 ; turn on mech mode supression`

---

### M981 — Spaghetti Detector Control

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `M981 S<0/1> P<n>`

**Parameters:**
- `S` — Enable (0=off, 1=on)
- `P` — Sensitivity or scan interval (20000 observed)

**Description:** Enables or disables the spaghetti detector (print failure detection). When enabled, the printer monitors for detached or failed prints using the onboard camera/sensor. Called with S1 to enable at the start of printing and S0 to disable at end of print.

**Context:** Appears in H2C/H2D files after the nozzle load line section, before the first layer begins. Only present in multi-material files — may be tied to a specific slicer setting.

**Examples:**
- `M981 S1 P20000` — Enable spaghetti detection
- `M981 S0 P20000` — Disable spaghetti detection

---

### M982.2 — Cog Noise Reduction

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M982.2 S<0/1>`

**Parameters:**
- `S` — Enable (0=off, 1=on)

**Description:** Enables or disables stepper motor cog noise reduction. Reduces the characteristic noise from stepper motors by applying compensation algorithms.

**Context:** Enabled during the startup sequence after motor currents are set.

**Example:** `M982.2 S1 ; turn on cog noise reduction`

---

### M983 — Dynamic Extrusion Compensation Calibration

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M983 F<speed> A<n> H<dia>`

**Parameters:**
- `F` — Volumetric flow speed (typically `outer_wall_volumetric_speed/2.4`)
- `A` — Compensation factor (0.3 observed)
- `H` — Nozzle diameter in mm

**Description:** Runs the dynamic extrusion compensation calibration. The printer extrudes a test line and measures the actual flow to determine compensation parameters. If calibration fails, it retries (checked via `M1002 judge_last_extrude_cali_success`).

**Context:** Called during the extrusion calibration phase of start gcode, after an initial purge line is extruded.

**Example:** `M983 F{outer_wall_volumetric_speed/2.4} A0.3 H[nozzle_diameter]; cali dynamic extrusion compensation`

---

### M983.1 — Extrusion Calibration Variant

**Confidence:** Inferred | **Models:** [H2]

**Syntax:** `M983.1 M<n>`

**Parameters:**
- `M` — Calibration mode (1 observed)

**Description:** H2-series variant of extrusion calibration. Sets a calibration mode for the dynamic extrusion compensation system.

**Example:** `M983.1 M1`

---

### M983.3 — Dynamic Extrusion Compensation

**Confidence:** Inferred | **Models:** [H2] [H2C] [H2D]

**Syntax:** `M983.3 F<speed> A<n> [R<n>]`

**Parameters:**
- `F` — Volumetric flow speed
- `A` — Compensation factor (0.4 observed)
- `R` — Retraction length reference (2 observed, optional — present in multi-material files)

**Description:** Configures dynamic extrusion compensation parameters on H2-series printers. Similar to M983 but with different compensation factors tuned for the H2 extrusion system. The optional R parameter appears in multi-material tool change sequences.

**Examples:**
- `M983.3 F12.5 A0.4` — Standard compensation
- `M983.3 F12.5 A0.4 R2` — Compensation with retraction reference (multi-material)

---

### M983.4 — Deformation Compensation

**Confidence:** Inferred | **Models:** [H2]

**Syntax:** `M983.4 S<0/1>`

**Parameters:**
- `S` — Enable (0=off, 1=on)

**Description:** Enables or disables print deformation compensation on H2-series printers. When enabled, the firmware adjusts extrusion to compensate for expected part deformation.

**Example:** `M983.4 S1` — Enable deformation compensation

---

### M9833 — Dynamic Extrusion Compensation (Tool Change)

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M9833 F<speed> A<n>`

**Parameters:**
- `F` — Volumetric flow speed
- `A` — Compensation factor (0.3 observed)

**Description:** Variant of M983 used during filament change sequences. Re-calibrates extrusion compensation after a tool change to account for the new filament's flow characteristics. Simpler parameter set than M983 (no H nozzle diameter — presumably reuses the last known value).

**Context:** Called in change_filament_gcode after the filament swap is complete.

**Example:** `M9833 F{outer_wall_volumetric_speed/2.4} A0.3 ; cali dynamic extrusion compensation`

---

### M9833.2 — Calibration Reset/Init

**Confidence:** Unknown | **Models:** [ALL]

**Syntax:** `M9833.2`

**Parameters:** None observed

**Description:** Appears once at the very start of machine_start_gcode, immediately after initial heating commands and before the startup sound. Likely resets or initializes the extrusion compensation state for a fresh print.

**Context:** One of the first commands in the startup sequence.

---

### M984 — Apply Extrusion Compensation Results

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M984 A<n> E<n> S<n> F<speed> H<dia>`

**Parameters:**
- `A` — Adjustment factor (0.1 observed)
- `E` — Extrusion parameter (1 observed)
- `S` — Apply mode (1 observed)
- `F` — Volumetric flow speed
- `H` — Nozzle diameter in mm

**Description:** Applies the measured extrusion compensation values from a preceding M983 calibration. Called after the calibration test line and wipe sequence to finalize the compensation parameters for the print.

**Context:** Appears after M983 calibration, wipe, and the judge_last_extrude_cali_success check.

**Example:** `M984 A0.1 E1 S1 F{outer_wall_volumetric_speed/2.4} H[nozzle_diameter]`

---

### M991 — Layer Change Notification

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M991 S<n> P<layer>`

**Parameters:**
- `S` — Notification type (0 observed)
- `P` — Layer number (0-indexed, or -1 for end of timelapse)

**Description:** Notifies the printer's system of a layer change event. Used for progress tracking, timelapse synchronization, and display updates.

**Context:** Called in layer_change_gcode at every layer and in end gcode with P-1 to signal timelapse completion.

**Examples:**
- `M991 S0 P{layer_num} ;notify layer change`
- `M991 S0 P-1 ;end timelapse at safe pos`

---

### M993 — Nozzle Cam Detection Control

**Confidence:** Inferred | **Models:** [H2C] [H2D] [H2S]

**Syntax:** `M993 A<n> B<n> C<n>`

**Parameters:**
- `A`, `B`, `C` — Detection mode flags (always set to matching values)

**Description:** Controls nozzle camera-based detection features. The three parameters are set to matching values to select the detection mode.

**Modes:**
- `M993 A0 B0 C0` — Detection not allowed / disabled
- `M993 A1 B1 C1` — Detection allowed / enabled
- `M993 A2 B2 C2` — Save detection status
- `M993 A3 B3 C3` — Detection variant (alternate mode)

**Context:** Used on H2-series printers with nozzle camera hardware.

**Examples:**
- `M993 A0 B0 C0` — Disable nozzle cam detection
- `M993 A1 B1 C1` — Enable nozzle cam detection

---

### M900 — Pressure Advance (Bambu Variant)

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `M900 K<n> [L<n>] [M<n>]`

**Parameters:**
- `K` — K-factor (standard pressure advance parameter, 0.0 to reset)
- `L` — Length parameter (1000.0 observed — likely flow lookahead distance in mm). **Bambu-specific extension.**
- `M` — Multiplier (1.0 observed). **Bambu-specific extension.**

**Description:** Bambu Lab's extended version of the standard M900 Linear/Pressure Advance command. Standard M900 only accepts the K parameter. Bambu's firmware adds L (lookahead distance) and M (multiplier) for their proprietary flow compensation algorithm.

**Context:** Called at the start of extrusion calibration with K=0 to reset pressure advance before calibration.

**Example:** `M900 K0.0 L1000.0 M1.0`

**Note:** Standard Marlin M900 only uses K. The L and M parameters are Bambu-specific.

---

### M901 — Pressure Advance Configuration

**Confidence:** Inferred | **Models:** [H2] [H2D] [H2C]

**Syntax:** `M901 D<n>`

**Parameters:**
- `D` — Configuration mode/value (4 observed)

**Description:** Configures pressure advance behavior. Found near M900 commands, suggesting it sets an operating mode or advanced parameter for the pressure advance system on H2-series printers.

**Example:** `M901 D4`

---

## Extended Motion

Extended motion commands for Z-axis control, bed leveling offsets, detection systems, and parameter magnitude scaling.

### G29.1 — Set Z Offset for Bed Type

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `G29.1 Z<offset>`

**Parameters:**
- `Z` — Z offset in mm (negative values lower the nozzle closer to the bed)

**Description:** Applies a Z offset compensation based on the build plate type. Different plate surfaces (smooth PEI, textured PEI, etc.) have slightly different heights, and this command compensates for that difference.

**Context:** Applied conditionally in start gcode based on `curr_bed_type`.

**Example:** `G29.1 Z{-0.02} ; for Textured PEI Plate`

---

### G29.2 — Enable/Disable Auto Bed Leveling

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `G29.2 S<0/1>`

**Parameters:**
- `S` — Enable (0=off, 1=on)

**Description:** Enables or disables the auto bed leveling (ABL) mesh compensation. ABL is turned off during nozzle wipe sequences (to allow free Z movement) and re-enabled before printing.

**Examples:**
- `G29.2 S0 ; turn off ABL`
- `G29.2 S1` — Re-enable ABL before printing

---

### G28.14 — Pre-Extrude Z Position Calibration

**Confidence:** Inferred | **Models:** [H2]

**Syntax:** `G28.14 R<n>` or `G28.14 D<n>`

**Parameters:**
- `R` — Reset mode (0 observed)
- `D` — Calibration direction (0 observed)

**Description:** Calibrates the Z-axis position before extrusion begins on H2-series printers. Ensures the nozzle height is accurate before the first extrusion move.

**Examples:**
- `G28.14 R0`
- `G28.14 D0`

---

### G28.140 — Extended Z Position Calibration (H2C)

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `G28.140 D<n>` or `G28.140 S<n>`

**Parameters:**
- `D` — Calibration direction (0 observed)
- `S` — Calibration step (0 observed)

**Description:** Extended variant of G28.14 for the H2C tool changer. Handles Z calibration with tool changer offset considerations.

**Examples:**
- `G28.140 D0`
- `G28.140 S0`

---

### G29.4 — ABL Variant (A1)

**Confidence:** Unknown | **Models:** [A1]

**Syntax:** `G29.4`

**Parameters:** Unknown

**Description:** ABL variant observed only in A1 printer output. Purpose not yet fully determined.

---

### G29.7 — Position Compensation Enable

**Confidence:** Inferred | **Models:** [H2]

**Syntax:** `G29.7 S<0/1>`

**Parameters:**
- `S` — Enable (1=on)

**Description:** Enables position compensation for the bed leveling system. Works in conjunction with G29.2 ABL to provide additional positional accuracy.

**Example:** `G29.7 S1` — Enable position compensation

---

### G29.9 — Leveling Variant

**Confidence:** Inferred | **Models:** [H2]

**Syntax:** `G29.9`

**Parameters:** Unknown

**Description:** Leveling variant observed in the "record data" section of H2-series startup sequences. Part of the bed leveling calibration pipeline.

---

### G29.20 — ABL Mode Selection

**Confidence:** Inferred | **Models:** [H2]

**Syntax:** `G29.20 A<n>`

**Parameters:**
- `A` — ABL mode:
  - `3` — Mode 3 (observed)
  - `4` — Mode 4 (observed)

**Description:** Selects the auto bed leveling mode on H2-series printers. Different modes may correspond to different probing patterns or compensation algorithms.

**Examples:**
- `G29.20 A3`
- `G29.20 A4`

---

### G29.99 — Final Leveling Step

**Confidence:** Inferred | **Models:** [H2]

**Syntax:** `G29.99`

**Parameters:** None observed

**Description:** Performs the final step in the bed leveling sequence on H2-series printers. Called at the end of the startup leveling process to finalize all compensation data.

---

### G380 — Z-Axis Move with Endstop Control

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `G380 S<n> Z<dist> F<speed>`

**Parameters:**
- `S` — Endstop mode:
  - `2` — Move up (away from bed)
  - `3` — Move down (toward bed), stop at endstop
- `Z` — Distance in mm (positive=up, negative=down)
- `F` — Feed rate in mm/min

**Description:** Performs a Z-axis move with endstop awareness. Mode S2 moves up (used at startup to clear the endstop). Mode S3 moves down and stops when the endstop is triggered — used extensively in the nozzle wipe sequence where the nozzle is repeatedly pushed into the wiper.

**Context:** Used in startup (avoid endstop) and nozzle wipe (press nozzle against wiper surface).

**Examples:**
- `G380 S2 Z30 F1200` — Move Z up 30mm (startup, avoid endstop)
- `G380 S3 Z-20 F1200` — Move Z down 20mm (startup, find home)
- `G380 S3 Z-5 F1200` — Move Z down 5mm into wiper (nozzle wipe, repeated)

---

### G383 — Toolhead Offset Calibration

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `G383 O<n> U<n> L<n>`

**Parameters:**
- `O` — Calibration mode (2 observed)
- `U` — Speed or distance parameter (140 observed)
- `L` — Extruder index

**Description:** Performs toolhead offset calibration for multi-tool/dual-extrusion printers. Measures and compensates for positional differences between toolheads.

**Context:** Used during XY offset calibration sequences.

**Example:** `G383 O2 U140 L0` — Calibrate offset for extruder 0

---

### G383.3 — Offset Calibration Sub-Step

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `G383.3 U<n> L<n>`

**Parameters:**
- `U` — Speed or distance parameter (140 observed)
- `L` — Extruder index

**Description:** A sub-step of the G383 toolhead offset calibration sequence.

**Example:** `G383.3 U140 L0`

---

### G383.7 — Offset Calibration Check

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `G383.7 U<n> J<n>`

**Parameters:**
- `U` — Speed or distance parameter (140 observed)
- `J` — Check mode (0 observed)

**Description:** Post-wipe calibration check variant. Verifies offset calibration results after a wipe sequence.

**Example:** `G383.7 U140 J0`

---

### G39 — Nozzle Wrap/Clog Detection Scan

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `G39 S1 X<n> Y<n>`

**Parameters:**
- `S` — Start scan (1=enable)
- `X` — Scan position X coordinate
- `Y` — Scan position Y coordinate

**Description:** Initiates a visual scan at the specified position to detect nozzle wrapping (filament buildup around the nozzle) or clogging. The printer moves to the position and uses the camera/sensor to inspect the nozzle state.

**Context:** Called in timelapse/layer change gcode at the 3rd layer to perform initial clog detection.

**Example:** `G39 S1 X187 Y178` (from: "enable nozzle clog detect at 3rd layer")

---

### G39.1 — Nozzle Wrapped Detection Position Calibration

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `G39.1`

**Parameters:** None

**Description:** Calibrates the nozzle wrapped (filament buildup) detection position. Sets the reference position used by the G39 detection system for subsequent scans.

**Context:** Called after bed leveling during the startup sequence on H2-series printers.

---

### G39.3 — Mass Exceed Detection Scan

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `G39.3 S1`

**Parameters:**
- `S` — Start scan (1=enable)

**Description:** Performs a scan to detect excess material buildup on the print (spaghetti detection). Triggered when the `g39_mass_exceed_flag` system flag is set and the print has progressed past layer 2.

**Context:** Called in layer change gcode within a conditional block checking `g39_mass_exceed_flag`.

**Example:**
```
M1002 judge_flag g39_mass_exceed_flag
M622 J1
    G39.3 S1        ; scan for excess material
M623
```

---

### G39.4 — Build Plate Detection Scan

**Confidence:** Inferred | **Models:** [ALL]

**Syntax:** `G39.4`

**Parameters:** None observed

**Description:** Performs a build plate presence/type detection scan. Verifies that a build plate is installed and potentially identifies the plate type.

**Context:** Called during startup when `build_plate_detect_flag` is enabled.

**Example:**
```
M1002 judge_flag build_plate_detect_flag
M622 S1
    G39.4          ; detect build plate
    M400
M623
```

---

### G392 — Toggle Nozzle Clog Detection

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `G392 S<0/1>`

**Parameters:**
- `S` — State flag

**Description:** Toggles the nozzle clog detection system on or off.

**Important Note:** Inline comments in the slicer output are contradictory — `G392 S0` is labeled both "turn off clog detect" and "turn on clog detect" in different locations. The actual behavior likely depends on context (the command may be a toggle rather than an absolute set, or the comments may be inaccurate). Needs verification via firmware testing.

**Examples:**
- `G392 S0 ;turn off clog detect` — At start of print and filament change
- `G392 S0 ;turn on clog detect` — After filament is loaded

---

### M73.2 — Reset Time Estimate Magnitude

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M73.2 R<n>`

**Parameters:**
- `R` — Magnitude multiplier (1.0 = reset to normal)

**Description:** Resets or scales the remaining time estimate displayed on the printer's touchscreen. A value of 1.0 resets to normal calculation. Other values could scale the estimate (e.g., for speed changes).

**Context:** Used in end gcode to reset the time estimate display.

**Example:** `M73.2 R1.0 ;Reset left time magnitude`

**Note:** Standard M73 sets print progress percentage. M73.2 is a Bambu-specific extension for time estimate scaling.

---

### M201.2 — Reset Acceleration Magnitude

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M201.2 K<n>`

**Parameters:**
- `K` — Magnitude multiplier (1.0 = reset to normal)

**Description:** Resets or scales the acceleration values. A value of 1.0 resets to normal. Other values scale all acceleration values proportionally (useful for speed adjustments).

**Context:** Used in end gcode to reset acceleration scaling.

**Example:** `M201.2 K1.0 ; Reset acc magnitude`

**Note:** Standard M201 sets max acceleration. M201.2 is a Bambu-specific extension for acceleration scaling.

---

## Toolhead Wipe & Positioning

Commands for toolhead positioning during nozzle wipe operations.

### G150.* — Toolhead Positioning / Nozzle Wipe Movements

**Confidence:** Inferred | **Models:** [H2] [H2D] [H2C]

**Description:** The G150 family controls toolhead positioning movements for nozzle wipe operations on H2-series printers. These are specialized motion commands for the wipe station sequence.

**Sub-commands:**

| Variant | Syntax | Purpose |
|---------|--------|---------|
| `G150` | `G150 [T<temp>]` | Main wipe position (T=temperature during wipe) |
| `G150.1` | `G150.1 [F<speed>]` | Wipe mouth movement (F=wipe speed) |
| `G150.2` | `G150.2` | Wipe variant position |
| `G150.3` | `G150.3 [F<speed>]` | Return to safe position after wipe (F=return speed) |

**Context:** Used in the nozzle wipe sequence on H2-series printers. The sequence typically moves to the wipe station (G150), performs wipe motions (G150.1/G150.2), then returns to a safe position (G150.3).

---

## Miscellaneous / Unknown

Commands observed in slicer output that don't fit neatly into other categories or whose purpose is entirely unknown.

### M142 — Chamber Auto-Cooling Control

**Confidence:** Inferred | **Models:** [X1C] [P1S] [H2] [H2D] [H2C]

**Syntax:** `M142 P<0/1> R<min> S<target> T<max> U<p1> V<p2> W<p3> O<limit> [L1]`

**Parameters:**
- `P` — Enable flag (1=enable auto-cooling)
- `R` — Minimum temperature threshold
- `S` — Target chamber temperature
- `T` — Maximum temperature threshold
- `U`, `V`, `W` — PID-like control parameters (proportional, integral, derivative)
- `O` — Output/fan speed limit
- `L` — Mode flag (1 observed, optional)

**Description:** Configures the chamber auto-cooling system on enclosed printers. Controls the enclosure fan to maintain chamber temperature within the specified range. Uses PID-style parameters for smooth temperature regulation.

**Context:** Used on enclosed printers to manage chamber temperature during printing, especially important for materials like ABS and ASA that benefit from controlled chamber cooling.

**Example:** `M142 P1 R35 S40 T70 U60 V50 W0 O250`

---

### M145 — Airduct Mode Control

**Confidence:** Inferred | **Models:** [H2] [H2D] [H2C]

**Syntax:** `M145 P<0/1>`

**Parameters:**
- `P` — Mode selection:
  - `0` — Cooling mode (airduct directs air for part cooling)
  - `1` — Heating mode (airduct recirculates for chamber heating)

**Description:** Switches the airduct system between cooling and heating modes on H2-series printers. In cooling mode, the duct directs airflow to cool the printed part. In heating mode, it recirculates air to help maintain chamber temperature.

**Examples:**
- `M145 P0` — Switch to cooling mode
- `M145 P1` — Switch to heating mode

---

### M481 — Cutter Position Compensation Toggle

**Confidence:** Inferred | **Models:** [H2] [H2D] [H2C]

**Syntax:** `M481 S<0/1>`

**Parameters:**
- `S` — Enable (0=off, 1=on)

**Description:** Toggles cutter position compensation on or off. When enabled, the firmware compensates for the offset between the nozzle and the filament cutter position.

**Context:** Called during startup and filament change sequences.

**Example:** `M481 S0 ; turn off cutter pos comp`

---

### M1012.* — Vortex Toolhead Position Calibration Data

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Description:** The M1012 family records and stores toolhead position calibration data for the Vortex tool changer system. Each sub-variant handles a different aspect of position data. Only present on multi-head H2 printers (H2C tool changer, H2D dual extrusion); absent from H2S and all other models.

**Sub-commands:**

| Variant | Syntax | Purpose | Models |
|---------|--------|---------|--------|
| `M1012.5` | `M1012.5 N<n> R<n>` | Record toolhead offset (N=nozzle index, R=reset flag) | [H2D] |
| `M1012.7` | `M1012.7` | Record toolhead offset after wipe check | [H2C] |
| `M1012.8` | `M1012.8` | Record Z/position calibration data | [H2C] |
| `M1012.9` | `M1012.9` | Record secondary calibration data (per-nozzle) | [H2C] |

**Context:**
- `M1012.5` appears in the H2D `auto_cali_toolhead_offset_flag` block: `M1012.5 N1 R1`
- `M1012.7` appears in the H2C `auto_cali_toolhead_offset_flag` block, before `G383.7` offset check and `M500` save
- `M1012.8` and `M1012.9` appear together in the `========== record data ==========` section alongside `M1026` and `G29.9`, recording calibration state before the nozzle load line

**Example (H2C offset calibration):**
```
M1002 judge_flag auto_cali_toolhead_offset_flag
M622 J0
    G91
    G1 Z5 F1200
    G90
    M1012.7           ; record toolhead offset
    G383.7 U140 J0    ; post-wipe offset check
    M500              ; save to EEPROM
M623
```

**Example (H2C data recording):**
```
========== record data ==========
M1026              ; begin data recording
M1012.8            ; record Z/position data
M1012.9            ; record secondary data
G29.9              ; record leveling data
========== record data ==========
```

---

### M1015.3 — TPU Clog Detection Control

**Confidence:** Verified | **Models:** [H2] [H2D] [H2C]

**Syntax:** `M1015.3 S<0/1>`

**Parameters:**
- `S` — Enable (0=off, 1=on)

**Description:** Enables or disables TPU-specific clog detection. TPU filament has unique flow characteristics that require specialized clog detection logic. **Mutually exclusive with M1015.4** — when TPU clog detection is enabled (S1), air printing detection (M1015.4) is disabled, and vice versa.

**Examples:**
- `M1015.3 S1` — Enable TPU clog detection (when printing TPU)
- `M1015.3 S0` — Disable TPU clog detection (when printing rigid filaments)

**Confirmed behavior:** TPU files show `M1015.3 S1` + `M1015.4 S0 K0`. PLA/PETG files show `M1015.3 S0` + `M1015.4 S1 K1`.

---

### M1015.4 — Extrusion Air Printing Detection

**Confidence:** Verified | **Models:** [H2] [H2D] [H2C]

**Syntax:** `M1015.4 S<0/1> K<0/1> [H<dia>]`

**Parameters:**
- `S` — Enable (0=off, 1=on)
- `K` — Detection mode (0=off, 1=on — matches S)
- `H` — Nozzle diameter in mm (present when enabling, optional when disabling)

**Description:** Controls the extrusion air printing detection system. When enabled, the firmware monitors for air printing (extrusion with no material) and pauses the print if detected. The nozzle diameter parameter calibrates the detection sensitivity. **Mutually exclusive with M1015.3** — enabled for rigid filaments (PLA, PETG, PLA-CF, PETG-CF), disabled for TPU.

**Examples:**
- `M1015.4 S1 K1 H0.6` — Enable air printing detection for 0.6mm nozzle
- `M1015.4 S0 K0 H0.6` — Disable air printing detection (TPU mode)
- `M1015.4 S0 K0` — Disable at end of print (no H needed)

---

### M1026 — Begin Calibration Data Recording

**Confidence:** Inferred | **Models:** [H2C] [H2D]

**Syntax:** `M1026`

**Parameters:** None

**Description:** Signals the firmware to begin recording calibration data. Always followed by M1012.8, M1012.9, and G29.9 within a `========== record data ==========` block. The firmware captures the current position, leveling, and toolhead offset state for the upcoming print.

**Context:** Appears once during startup, in the nozzle load line section before the first extrusion.

**Example:**
```
========== record data ==========
M1026          ; begin data recording
M1012.8        ; record Z/position data
M1012.9        ; record secondary data
G29.9          ; record leveling data
========== record data ==========
```

---

### M1028 — Unknown Enable/Disable (H2S)

**Confidence:** Inferred | **Models:** [H2S]

**Syntax:** `M1028 S<0/1>`

**Parameters:**
- `S` — Enable (0=off, 1=on)

**Description:** Unknown enable/disable command observed around M562 extruder setup commands in H2S (single-extruder H2 variant) output.

**Examples:**
- `M1028 S1` — Enable
- `M1028 S0` — Disable

---

### M562 — Extruder Selection/Configuration (H2S)

**Confidence:** Inferred | **Models:** [H2S]

**Syntax:** `M562 P<n> E<n> B<n>`

**Parameters:**
- `P` — Extruder position
- `E` — Extruder index
- `B` — Enable flag

**Description:** Configures extruder selection and assignment on the H2S printer. Sets up the mapping between physical extruder positions and logical extruder indices.

**Example:** `M562 P0 E0 B1` — Assign extruder position 0 to index 0, enabled

---

### M710 — MC Fan Control (P1S)

**Confidence:** Inferred | **Models:** [P1S]

**Syntax:** `M710 A<0/1> S<n>`

**Parameters:**
- `A` — Enable (1=on)
- `S` — Fan speed (0-255)

**Description:** Controls the main controller (MC board) cooling fan on the P1S. Ensures the electronics stay cool during operation.

**Context:** Called during P1S startup sequence.

**Example:** `M710 A1 S255` — Turn on MC fan at full speed

---

### M290 — Extended Babystepping (Bambu Variant)

**Confidence:** Inferred | **Models:** [P1S]

**Syntax:** `M290 X<n> Y<n> Z<n>`

**Parameters:**
- `X` — X-axis babystep offset in mm
- `Y` — Y-axis babystep offset in mm
- `Z` — Z-axis babystep offset in mm

**Description:** Bambu's extended version of the standard M290 babystepping command. Standard M290 typically only supports Z-axis babystepping. Bambu's variant adds X and Y axis offsets, likely for toolhead position calibration.

**Example:** `M290 X40 Y40 Z2.67`

**Note:** Standard Marlin M290 only supports Z babystepping. XY babystepping is a Bambu-specific extension.

---

### G151 — Unknown (H2D)

**Confidence:** Unknown | **Models:** [H2D]

**Syntax:** `G151`

**Parameters:** Unknown

**Description:** Observed only in H2D slicer output. Not enough context to determine purpose. Possibly related to the G150.* wipe positioning family.

---

### M145.2 — Unknown Airduct/Chamber Variant (H2D)

**Confidence:** Unknown | **Models:** [H2D]

**Syntax:** `M145.2`

**Parameters:** Unknown

**Description:** Observed only in H2D slicer output. Likely related to the M145 airduct control system. Needs further investigation.

---

### M620.17 — Unknown AMS Sub-Variant (H2D)

**Confidence:** Unknown | **Models:** [H2D]

**Syntax:** `M620.17 T<n> S<n> L<n>`

**Parameters:**
- `T` — Tool/extruder index
- `S` — Temperature (°C)
- `L` — Extruder slot (-1 or index)

**Description:** AMS sub-variant observed only in H2D slicer output in the toolhead offset calibration section. Called once per extruder.

**Examples:**
- `M620.17 T0 S220 L0`
- `M620.17 T1 S220 L-1`

---

### M624 — Start Printing Object (Exclude Object)

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `M624 <base64_label>`

**Parameters:**
- Base64-encoded object label (e.g., `AgAAAAAAAAA=`)

**Description:** Marks the beginning of G-code for a specific print object. Part of the "exclude object" feature that allows cancelling individual objects on the build plate during printing. The base64 label identifies which object the following G-code belongs to. Paired with M625 to close the object block.

**Context:** Appears in multi-material H2C files, wrapping the G-code moves for each object on each layer.

**Example:** `M624 AgAAAAAAAAA=`

---

### M625 — Stop Printing Object (Exclude Object)

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `M625`

**Parameters:** None

**Description:** Marks the end of G-code for a print object started by M624. The firmware uses M624/M625 pairs to know which moves belong to which object, enabling per-object cancellation.

---

### M73 — Set Print Progress

**Confidence:** Verified | **Models:** [ALL]

**Syntax:** `M73 P<n> [R<n>] [L<n>] [E<n>]`

**Parameters:**
- `P` — Print progress percentage (0-100)
- `R` — Remaining time in minutes
- `L` — Current layer number (Bambu-specific extension)
- `E` — Extruder time remaining in minutes (Bambu-specific extension)

**Description:** Sets the print progress displayed on the printer's touchscreen. Standard Marlin M73 uses P and R. Bambu extends with L (layer tracking) and E (per-extruder time estimate). Called throughout the print at regular intervals.

**Examples:**
- `M73 P0 R134` — 0% complete, 134 minutes remaining
- `M73 P50 R67` — 50% complete, 67 minutes remaining
- `M73 L45` — Currently on layer 45
- `M73 E83` — 83 minutes of extruder time remaining

---

### SYNC — Flush Timing Synchronization

**Confidence:** Inferred | **Models:** [H2C]

**Syntax:** `SYNC T<n>`

**Parameters:**
- `T` — Delay time in seconds (decimal, e.g., 5, 10.2941)

**Description:** Non-standard command (not a G/M code) used during multi-material flush sequences on the H2C tool changer. Synchronizes flush timing between the firmware and slicer-calculated flush durations. Only present in multi-material H2C files.

**Context:** Appears between M628/M629 flush sequence pairs during filament changes.

**Examples:**
- `SYNC T5` — Wait 5 seconds for flush sync
- `SYNC T10.2941` — Wait 10.29 seconds for flush sync

---

## Appendix A: M1002 Sub-Commands

M1002 is a multiplex command that accepts string-based sub-commands. Unlike standard G-code parameters, the arguments are freeform text after `M1002`.

| Sub-Command | Syntax | Purpose | Confidence |
|-------------|--------|---------|------------|
| `gcode_claim_action` | `M1002 gcode_claim_action : <n>` | Set touchscreen display action state | Verified |
| `set_filament_type` | `M1002 set_filament_type:<type>` | Tell firmware the active filament type | Verified |
| `judge_flag` | `M1002 judge_flag <flag_name>` | Query a system flag for M622 conditional | Verified |
| `set_gcode_claim_speed_level` | `M1002 set_gcode_claim_speed_level : <n>` | Set speed level display | Inferred |
| `judge_last_extrude_cali_success` | `M1002 judge_last_extrude_cali_success` | Check if last extrusion calibration passed | Inferred |
| `set_flag` | `M1002 set_flag <name>=<value>` | Set a named system flag | Inferred |

### Known Filament Types

Used with `set_filament_type`: `PLA`, `ABS`, `ASA`, `PETG`, `TPU`, `PA`, `PC`, `UNKNOWN`

The `UNKNOWN` type is set temporarily during flush sequences before the actual filament type is confirmed.

---

## Appendix B: M1006 Sound System

The M1006 command controls the printer's built-in buzzer/speaker. Sounds are defined as sequences of notes, then played.

### Sequence Flow

1. `M1006 S1` — Initialize the sound system
2. `M1006 A... B... L... C... D... M... E... F... N...` — Define notes (one per line)
3. `M1006 W` — Play the queued sequence and wait for completion

### Note Format

`M1006 A<n> B<n> L<n> C<n> D<n> M<n> E<n> F<n> N<n>`

The parameters appear to define a dual-channel (stereo) MIDI-like note:

| Parameter | Suspected Purpose | Confidence |
|-----------|------------------|------------|
| `A` | Channel 1 note value (MIDI number, 0=rest) | Inferred |
| `B` | Channel 1 duration (units of 10ms) | Inferred |
| `L` | Channel 1 volume (0-100) | Inferred |
| `C` | Channel 2 note value (MIDI number, 0=rest) | Inferred |
| `D` | Channel 2 duration (units of 10ms) | Inferred |
| `M` | Channel 2 volume (0-100) | Inferred |
| `E` | Channel 3 note value (MIDI number, 0=rest) | Inferred |
| `F` | Channel 3 duration (units of 10ms) | Inferred |
| `N` | Channel 3 volume (0-100) | Inferred |

### Observed MIDI Note Values

| Value | Note |
|-------|------|
| 0 | Rest (silence) |
| 37 | C#2 |
| 39 | D#2 |
| 41 | F2 |
| 42 | F#2 |
| 43 | G2 |
| 44 | G#2 |
| 46 | A#2 |
| 48 | C3 |
| 49 | C#3 |

### Example: Startup Sound (A1 mini)

```gcode
M1006 S1                                              ; init sound system
M1006 A0 B0 L100 C37 D10 M100 E37 F10 N100          ; C#2 on channels 2+3
M1006 A0 B0 L100 C41 D10 M100 E41 F10 N100          ; F2 on channels 2+3
M1006 A0 B0 L100 C44 D10 M100 E44 F10 N100          ; G#2 on channels 2+3
M1006 A0 B10 L100 C0 D10 M100 E0 F10 N100           ; rest (pause)
M1006 A43 B10 L100 C39 D10 M100 E46 F10 N100        ; G2 + D#2 + A#2 chord
M1006 W                                               ; play and wait
```

---

## Appendix C: Known System Flags

System flags are queried with `M1002 judge_flag <name>` and tested with `M622 J<0/1>`.

| Flag Name | Purpose | Context |
|-----------|---------|---------|
| `timelapse_record_flag` | Whether timelapse recording is enabled | Checked in layer_change and end gcode |
| `g29_before_print_flag` | Whether to run bed leveling before print | Checked before G29 leveling and post-wipe homing |
| `build_plate_detect_flag` | Whether to detect build plate presence/type | Checked during startup before G39.4 |
| `extrude_cali_flag` | Whether to run extrusion calibration | Checked during startup before M983 |
| `g39_3rd_layer_detect_flag` | Whether to check for nozzle clog at layer 3 | Checked in timelapse/layer change gcode |
| `g39_detection_flag` | Whether clog detection scanning is active | Checked in layer change gcode |
| `g39_mass_exceed_flag` | Whether to check for spaghetti/mass buildup | Checked in layer change gcode before G39.3 |
| `filament_need_cali_flag` | Whether filament needs calibration after tool change | Checked in filament change gcode after M9833 |
| `auto_cali_toolhead_offset_flag` | Whether to auto-calibrate toolhead offset | Found in multi-extruder gcode files (H2D/H2C) |

---

## Appendix D: gcode_claim_action Codes

Action codes used with `M1002 gcode_claim_action : <n>` to set the touchscreen display state.

| Code | Display State | Confidence |
|------|--------------|------------|
| 0 | Idle / Ready | Inferred (context: end of startup, before printing) |
| 1 | Bed Leveling | Verified (context: immediately before G29) |
| 2 | Heating | Verified (context: before M104/M140 heating) |
| 3 | Mechanical Check / Fast Scan | Verified (context: before mech mode fast check) |
| 4 | Filament Preparation | Verified (context: inside M620/M621 filament block) |
| 8 | Extrusion Calibration | Verified (context: before M983 calibration) |
| 13 | Homing / First Homing | Verified (context: before G28 in first homing section) |
| 14 | Nozzle Wiping | Verified (context: before wipe sequence) |
| 29 | Chamber Cooling Wait | Inferred (context: before `M191 S0` chamber temp wait, cooling mode) |
| 39 | Toolhead XY Offset Calibration | Inferred (context: before G383/G383.3 offset calibration, H2C/H2D) |
| 49 | Chamber Heating Wait | Inferred (context: before `M191 S[temp]` chamber temp wait, heating mode) |
| 54 | Offset Calibration Bed Heating | Inferred (context: before `M190 D[temp]` during XY offset cal prep, H2C/H2D) |

---

## Appendix E: Slicer Test Checklist (Phase 2)

To decode unknown commands and verify inferred ones, the following targeted slicer tests should be performed using Bambu Studio.

### Base Model

Use a simple test cube STL for consistent comparison.

### Printer Profile Tests

Slice the same model with default settings across all printer profiles. Diff the output to identify model-specific commands.

| # | Printer Profile | Key Features to Observe |
|---|----------------|------------------------|
| 1 | X1 Carbon | Lidar commands, chamber heating, enclosure fan |
| 2 | P1S | Compare with X1C (no lidar) |
| 3 | H2 | New series — compare with X1C |
| 4 | H2D | Dual extrusion — M640.*/M641, tool offsets |
| 5 | H2C | Tool changer — dock/park commands, tool change sequences |
| 6 | A1 | Full-size A1 vs A1 mini differences |
| 7 | A1 mini | Baseline (existing gcode files for comparison) |

### Setting Toggle Tests

Using the A1 mini profile, change one setting at a time and diff against the default output.

| # | Setting Change | Expected Commands to Isolate |
|---|---------------|------------------------------|
| 1 | AMS enabled vs disabled | M620.*/M621/M628/M629 |
| 2 | Timelapse on vs off | M971/M1004/M991 timelapse variants |
| 3 | Different bed types (Cool Plate, Textured PEI, High Temp) | G29.1 variants |
| 4 | Pressure advance on vs off | M900 Bambu variant params |
| 5 | Spiral/vase mode | Commands skipped in spiral mode |
| 6 | Multi-color (2+ filaments) | M640.*/M641, extended flush sequences |
| 7 | Support enabled vs disabled | Different calibration or detection |
| 8 | Different filament types (PLA, ABS, TPU, PETG) | Temperature/fan sequences, filament-specific commands |
| 9 | Build plate detect on vs off | G39.4 and related |
| 10 | Vibration compensation on vs off | M975 variants |

### File Naming Convention

```
gcode_files/bambu-tests/test-cube_<printer>_<setting>.gcode
```

**Examples:**
- `test-cube_x1c_default.gcode`
- `test-cube_a1m_no-ams.gcode`
- `test-cube_a1m_timelapse-off.gcode`
- `test-cube_h2c_default.gcode`

### Diffing Instructions

1. Slice baseline: `test-cube_a1m_default.gcode`
2. Slice variant: `test-cube_a1m_<setting>.gcode`
3. Extract unique commands: `grep -oP '^\s*[MG]\d+[\.\d]*' file.gcode | sort -u`
4. Diff command lists: `diff <(commands from baseline) <(commands from variant)`
5. For detailed comparison: `diff test-cube_a1m_default.gcode test-cube_a1m_<setting>.gcode | head -200`
