// Material profiles based on Bambu Lab Filament Guide measurements.
// Layer adhesion from Charpy Impact Strength Z-direction (kJ/m²).
// adhesionCoefficient normalized 0-1 from measured impact strength Z values.
// coolingSensitivity derived from recommended part cooling fan ranges.

export const MATERIAL_PROFILES = {
  // --- Standard Materials ---
  PLA: {
    type: 'PLA',
    hdt: 57,                     // HDT 0.45 MPa (°C)
    glassTransition: 60,
    adhesionCoefficient: 0.85,   // Impact Z: 13.8 kJ/m²
    coolingSensitivity: 0.8,     // Fan: 50-100%
    meltTemp: 210,               // Mid-range nozzle temp
    nozzleTempRange: [190, 230],
    bedTempRange: [55, 65],
    maxPrintSpeed: 300,          // mm/s
    maxVolumetricFlow: 15,       // mm³/s
    minLayerTime: 8,
    optimalBridgeSpeed: 25,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.43,       // % saturated
    needsDrying: false,
    needsEnclosure: false,
    thermalConductivity: 0.13,   // W/mK
    specificHeatCapacity: 1800,  // J/kgK
    cte: 68e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 26.6,      // kJ/m²
    impactStrengthZ: 13.8,       // kJ/m² — layer adhesion
    bendingStrength: 76,         // MPa
    bendingModulus: 2750,        // MPa
  },
  PETG: {
    type: 'PETG',
    hdt: 69,
    glassTransition: 80,
    adhesionCoefficient: 0.75,   // Impact Z: 10.6 kJ/m²
    coolingSensitivity: 0.5,     // Fan: 0-80%
    meltTemp: 245,
    nozzleTempRange: [230, 260],
    bedTempRange: [60, 80],
    maxPrintSpeed: 300,
    maxVolumetricFlow: 12,       // mm³/s
    minLayerTime: 10,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.40,
    needsDrying: true,
    needsEnclosure: false,
    thermalConductivity: 0.19,   // W/mK
    specificHeatCapacity: 1200,  // J/kgK
    cte: 60e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 31.5,
    impactStrengthZ: 10.6,
    bendingStrength: 64,
    bendingModulus: 2050,
  },
  ABS: {
    type: 'ABS',
    hdt: 87,
    glassTransition: 105,
    adhesionCoefficient: 0.60,   // Impact Z: 7.4 kJ/m²
    coolingSensitivity: 0.3,     // Fan: 0-80%, but needs enclosure
    meltTemp: 260,
    nozzleTempRange: [240, 280],
    bedTempRange: [90, 100],
    maxPrintSpeed: 300,
    maxVolumetricFlow: 11,       // mm³/s
    minLayerTime: 12,
    optimalBridgeSpeed: 15,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.65,
    needsDrying: false,
    needsEnclosure: true,
    thermalConductivity: 0.17,   // W/mK
    specificHeatCapacity: 1400,  // J/kgK
    cte: 90e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 39.3,
    impactStrengthZ: 7.4,
    bendingStrength: 62,
    bendingModulus: 1880,
  },
  ASA: {
    type: 'ASA',
    hdt: 100,
    glassTransition: 100,
    adhesionCoefficient: 0.48,   // Impact Z: 4.9 kJ/m²
    coolingSensitivity: 0.3,     // Fan: 0-80%, needs enclosure
    meltTemp: 260,
    nozzleTempRange: [240, 280],
    bedTempRange: [90, 100],
    maxPrintSpeed: 300,
    maxVolumetricFlow: 11,       // mm³/s
    minLayerTime: 12,
    optimalBridgeSpeed: 15,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.45,
    needsDrying: false,
    needsEnclosure: true,
    thermalConductivity: 0.18,   // W/mK
    specificHeatCapacity: 1300,  // J/kgK
    cte: 95e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 41.0,
    impactStrengthZ: 4.9,
    bendingStrength: 65,
    bendingModulus: 1920,
  },
  TPU: {
    type: 'TPU',
    hdt: null,                   // N/A for TPU
    glassTransition: -20,
    adhesionCoefficient: 0.95,   // Impact Z: 86.3 kJ/m² (exceptional)
    coolingSensitivity: 0.8,     // Fan: 50-100%
    meltTemp: 230,
    nozzleTempRange: [220, 240],
    bedTempRange: [30, 45],
    maxPrintSpeed: 200,
    maxVolumetricFlow: 5,        // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 15,     // mm/s — ideal bridge print speed
    waterAbsorption: 1.08,
    needsDrying: true,
    needsEnclosure: false,
    thermalConductivity: 0.19,   // W/mK
    specificHeatCapacity: 1500,  // J/kgK
    cte: 150e-6,                 // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 123.2,
    impactStrengthZ: 86.3,
    bendingStrength: null,
    bendingModulus: null,
  },
  PC: {
    type: 'PC',
    hdt: 117,
    glassTransition: 147,
    adhesionCoefficient: 0.68,   // Impact Z: 9.0 kJ/m²
    coolingSensitivity: 0.2,     // Fan: 0-60%
    meltTemp: 270,
    nozzleTempRange: [260, 280],
    bedTempRange: [90, 110],
    maxPrintSpeed: 300,
    maxVolumetricFlow: 10,       // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 15,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.25,
    needsDrying: true,
    needsEnclosure: true,
    thermalConductivity: 0.20,   // W/mK
    specificHeatCapacity: 1200,  // J/kgK
    cte: 65e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 34.8,
    impactStrengthZ: 9.0,
    bendingStrength: 108,
    bendingModulus: 2310,
  },

  // --- Carbon Fiber / Glass Fiber Reinforced ---
  'PLA-CF': {
    type: 'PLA-CF',
    hdt: 55,
    glassTransition: 55,
    adhesionCoefficient: 0.62,   // Impact Z: 7.8 kJ/m²
    coolingSensitivity: 0.8,     // Fan: 50-100%
    meltTemp: 225,
    nozzleTempRange: [210, 240],
    bedTempRange: [45, 65],
    maxPrintSpeed: 250,
    maxVolumetricFlow: 10,       // mm³/s
    minLayerTime: 8,
    optimalBridgeSpeed: 25,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.42,
    needsDrying: false,
    needsEnclosure: false,
    needsHardenedNozzle: true,
    thermalConductivity: 0.13,   // W/mK — same as PLA base
    specificHeatCapacity: 1800,  // J/kgK
    cte: 30e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 23.2,
    impactStrengthZ: 7.8,
    bendingStrength: 89,
    bendingModulus: 3950,
  },
  'PETG-CF': {
    type: 'PETG-CF',
    hdt: 74,
    glassTransition: 74,
    adhesionCoefficient: 0.75,   // Impact Z: 10.7 kJ/m²
    coolingSensitivity: 0.3,     // Fan: 0-40%
    meltTemp: 255,
    nozzleTempRange: [240, 270],
    bedTempRange: [60, 80],
    maxPrintSpeed: 200,
    maxVolumetricFlow: 10,       // mm³/s
    minLayerTime: 10,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.30,
    needsDrying: false,
    needsEnclosure: false,
    needsHardenedNozzle: true,
    thermalConductivity: 0.19,   // W/mK — same as PETG base
    specificHeatCapacity: 1200,  // J/kgK
    cte: 25e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 41.2,
    impactStrengthZ: 10.7,
    bendingStrength: 70,
    bendingModulus: 2910,
  },
  'ABS-GF': {
    type: 'ABS-GF',
    hdt: 99,
    glassTransition: 99,
    adhesionCoefficient: 0.50,   // Impact Z: 5.3 kJ/m²
    coolingSensitivity: 0.3,     // Fan: 0-80%
    meltTemp: 260,
    nozzleTempRange: [240, 280],
    bedTempRange: [90, 100],
    maxPrintSpeed: 180,
    maxVolumetricFlow: 9,        // mm³/s
    minLayerTime: 12,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.53,
    needsDrying: false,
    needsEnclosure: true,
    needsHardenedNozzle: true,
    thermalConductivity: 0.17,   // W/mK — same as ABS base
    specificHeatCapacity: 1400,  // J/kgK
    cte: 45e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 14.5,
    impactStrengthZ: 5.3,
    bendingStrength: 68,
    bendingModulus: 2860,
  },
  'ASA-CF': {
    type: 'ASA-CF',
    hdt: 110,
    glassTransition: 110,
    adhesionCoefficient: 0.70,   // Impact Z: 9.4 kJ/m²
    coolingSensitivity: 0.3,     // Fan: 0-80%
    meltTemp: 270,
    nozzleTempRange: [250, 290],
    bedTempRange: [90, 100],
    maxPrintSpeed: 250,
    maxVolumetricFlow: 9,        // mm³/s
    minLayerTime: 12,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.33,
    needsDrying: false,
    needsEnclosure: true,
    needsHardenedNozzle: true,
    thermalConductivity: 0.18,   // W/mK — same as ASA base
    specificHeatCapacity: 1300,  // J/kgK
    cte: 40e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 14.0,
    impactStrengthZ: 9.4,
    bendingStrength: 72,
    bendingModulus: 3740,
  },
  'PC-FR': {
    type: 'PC-FR',
    hdt: 113,
    glassTransition: 113,
    adhesionCoefficient: 0.65,   // Impact Z: 8.0 kJ/m²
    coolingSensitivity: 0.2,     // Fan: 0-60%
    meltTemp: 270,
    nozzleTempRange: [260, 280],
    bedTempRange: [90, 110],
    maxPrintSpeed: 300,
    maxVolumetricFlow: 10,       // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.12,
    needsDrying: true,
    needsEnclosure: true,
    thermalConductivity: 0.20,   // W/mK — same as PC base
    specificHeatCapacity: 1200,  // J/kgK
    cte: 55e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 55.0,
    impactStrengthZ: 8.0,
    bendingStrength: 90,
    bendingModulus: 1890,
  },

  // --- Engineering / Nylon ---
  'PET-CF': {
    type: 'PET-CF',
    hdt: 205,
    glassTransition: 120,
    adhesionCoefficient: 0.45,   // Impact Z: 4.5 kJ/m²
    coolingSensitivity: 0.2,     // Fan: 0-40%
    meltTemp: 280,
    nozzleTempRange: [260, 300],
    bedTempRange: [70, 100],
    maxPrintSpeed: 100,
    maxVolumetricFlow: 8,        // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.37,
    needsDrying: true,
    needsEnclosure: false,
    needsHardenedNozzle: true,
    thermalConductivity: 0.25,   // W/mK
    specificHeatCapacity: 1400,  // J/kgK
    cte: 22e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 36.0,
    impactStrengthZ: 4.5,
    bendingStrength: 131,
    bendingModulus: 5320,
  },
  'PA-CF': {
    type: 'PA-CF',
    hdt: 194,
    glassTransition: 100,
    adhesionCoefficient: 0.83,   // Impact Z: 13.3 kJ/m² (PAHT-CF)
    coolingSensitivity: 0.2,     // Fan: 0-40%
    meltTemp: 280,
    nozzleTempRange: [260, 300],
    bedTempRange: [100, 120],
    maxPrintSpeed: 100,
    maxVolumetricFlow: 8,        // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.88,
    needsDrying: true,
    needsEnclosure: true,
    needsHardenedNozzle: true,
    thermalConductivity: 0.25,   // W/mK
    specificHeatCapacity: 1700,  // J/kgK
    cte: 20e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 57.5,
    impactStrengthZ: 13.3,
    bendingStrength: 125,
    bendingModulus: 4230,
  },
  'PA6-CF': {
    type: 'PA6-CF',
    hdt: 186,
    glassTransition: 80,
    adhesionCoefficient: 0.90,   // Impact Z: 15.5 kJ/m²
    coolingSensitivity: 0.2,     // Fan: 0-40%
    meltTemp: 280,
    nozzleTempRange: [260, 300],
    bedTempRange: [100, 120],
    maxPrintSpeed: 100,
    maxVolumetricFlow: 8,        // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 2.35,
    needsDrying: true,
    needsEnclosure: true,
    needsHardenedNozzle: true,
    thermalConductivity: 0.25,   // W/mK
    specificHeatCapacity: 1700,  // J/kgK
    cte: 18e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 40.3,
    impactStrengthZ: 15.5,
    bendingStrength: 151,
    bendingModulus: 5460,
  },
  'PA6-GF': {
    type: 'PA6-GF',
    hdt: 182,
    glassTransition: 80,
    adhesionCoefficient: 0.42,   // Impact Z: 4.1 kJ/m²
    coolingSensitivity: 0.2,     // Fan: 0-40%
    meltTemp: 275,
    nozzleTempRange: [260, 290],
    bedTempRange: [100, 120],
    maxPrintSpeed: 130,
    maxVolumetricFlow: 9,        // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 2.56,
    needsDrying: true,
    needsEnclosure: true,
    needsHardenedNozzle: true,
    thermalConductivity: 0.25,   // W/mK
    specificHeatCapacity: 1700,  // J/kgK
    cte: 35e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 27.2,
    impactStrengthZ: 4.1,
    bendingStrength: 120,
    bendingModulus: 3670,
  },
  'PPA-CF': {
    type: 'PPA-CF',
    hdt: 227,
    glassTransition: 130,
    adhesionCoefficient: 0.43,   // Impact Z: 4.3 kJ/m²
    coolingSensitivity: 0.2,     // Fan: 0-40%
    meltTemp: 295,
    nozzleTempRange: [280, 310],
    bedTempRange: [100, 120],
    maxPrintSpeed: 100,
    maxVolumetricFlow: 8,        // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 1.30,
    needsDrying: true,
    needsEnclosure: true,
    needsHardenedNozzle: true,
    thermalConductivity: 0.25,   // W/mK
    specificHeatCapacity: 1400,  // J/kgK
    cte: 15e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 41.7,
    impactStrengthZ: 4.3,
    bendingStrength: 208,
    bendingModulus: 9860,
  },
  'PPS-CF': {
    type: 'PPS-CF',
    hdt: 264,
    glassTransition: 90,
    adhesionCoefficient: 0.35,   // Impact Z: 2.8 kJ/m²
    coolingSensitivity: 0.2,     // Fan: 0-40%
    meltTemp: 325,
    nozzleTempRange: [310, 340],
    bedTempRange: [100, 120],
    maxPrintSpeed: 100,
    maxVolumetricFlow: 8,        // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 15,     // mm/s — ideal bridge print speed
    waterAbsorption: 0.05,
    needsDrying: true,
    needsEnclosure: true,
    needsHardenedNozzle: true,
    thermalConductivity: 0.25,   // W/mK
    specificHeatCapacity: 1400,  // J/kgK
    cte: 28e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 27.8,
    impactStrengthZ: 2.8,
    bendingStrength: 142,
    bendingModulus: 7160,
  },

  // --- Legacy alias ---
  Nylon: {
    type: 'Nylon',
    hdt: 186,
    glassTransition: 80,
    adhesionCoefficient: 0.83,   // Based on PA-CF family
    coolingSensitivity: 0.2,
    meltTemp: 270,
    nozzleTempRange: [260, 300],
    bedTempRange: [100, 120],
    maxPrintSpeed: 100,
    maxVolumetricFlow: 10,       // mm³/s
    minLayerTime: 15,
    optimalBridgeSpeed: 20,     // mm/s — ideal bridge print speed
    waterAbsorption: 2.35,
    needsDrying: true,
    needsEnclosure: true,
    thermalConductivity: 0.25,   // W/mK
    specificHeatCapacity: 1700,  // J/kgK
    cte: 80e-6,                  // 1/°C — coefficient of thermal expansion
    impactStrengthXY: 40.0,
    impactStrengthZ: 13.0,
    bendingStrength: 125,
    bendingModulus: 4230,
  },
};

export const DEFAULT_THRESHOLDS = {
  'layer-bond-overlap':      { critical: 0.10, warning: 0.25 },
  'layer-bond-cooling':      { critical: 1.0,  warning: 2.0 },
  'wall-seam-alignment':     { warning: 3.0 },
  'wall-gap-size':           { critical: 1.5,  warning: 0.8 },
  'extrusion-consistency':   { warning: 0.35 },
  'warp-tolerance':          { critical: 0.8, warning: 0.4 },
};

function matchFilamentName(fc) {
  // Check specific variants before base types
  if (fc.includes('PPS-CF') || fc.includes('PPS')) return 'PPS-CF';
  if (fc.includes('PPA-CF') || fc.includes('PPA')) return 'PPA-CF';
  if (fc.includes('PA6-GF')) return 'PA6-GF';
  if (fc.includes('PA6-CF')) return 'PA6-CF';
  if (fc.includes('PAHT-CF') || fc.includes('PA-CF')) return 'PA-CF';
  if (fc.includes('PET-CF')) return 'PET-CF';
  if (fc.includes('PETG-CF')) return 'PETG-CF';
  if (fc.includes('PLA-CF')) return 'PLA-CF';
  if (fc.includes('ABS-GF')) return 'ABS-GF';
  if (fc.includes('ASA-CF')) return 'ASA-CF';
  if (fc.includes('PC-FR') || fc.includes('PC FR')) return 'PC-FR';
  if (fc.includes('TPU')) return 'TPU';
  if (fc.includes('PETG')) return 'PETG';
  if (fc.includes('PLA')) return 'PLA';
  if (fc.includes('ASA')) return 'ASA';
  if (fc.includes('ABS')) return 'ABS';
  if (fc.includes('PC')) return 'PC';
  if (fc.includes('NYLON') || fc.includes('PA')) return 'Nylon';
  return null;
}

export function inferMaterial(lines) {
  const scanLimit = Math.min(200, lines.length);
  let hotendTemp = null;
  let bedTemp = null;
  let filamentComment = null;

  for (let i = 0; i < scanLimit; i++) {
    const line = lines[i].trim();

    // Check slicer filament type comments first (most reliable)
    const filamentMatch = line.match(/;\s*filament_type\s*=\s*(.+)/i) ||
                          line.match(/;\s*FILAMENT_TYPE:\s*(.+)/i);
    if (filamentMatch) {
      filamentComment = filamentMatch[1].trim();
    }

    // M104/M109 - hotend temp
    const hotendMatch = line.match(/^M10[49]\s.*S([\d.]+)/i);
    if (hotendMatch && !hotendTemp) {
      hotendTemp = parseFloat(hotendMatch[1]);
    }

    // M140/M190 - bed temp
    const bedMatch = line.match(/^M1[49]0\s.*S([\d.]+)/i);
    if (bedMatch && !bedTemp) {
      bedTemp = parseFloat(bedMatch[1]);
    }
  }

  // Try comment-based detection first
  if (filamentComment) {
    // Multi-material printers list all slots separated by semicolons
    // (e.g. "PLA;PETG;PETG;TPU"). Use the first slot (active filament).
    const fc = filamentComment.split(';')[0].trim().toUpperCase();
    const matched = matchFilamentName(fc);
    if (matched) return matched;
  }

  // Fall back to temperature-based PLA vs PETG (the two most common materials).
  // Exotic materials require a filament_type comment for reliable detection.
  if (hotendTemp !== null) {
    if (hotendTemp >= 230) return 'PETG';
    return 'PLA';
  }

  return 'PLA';
}

export function getMaterialProfile(type, overrides = {}) {
  const base = MATERIAL_PROFILES[type] || MATERIAL_PROFILES.PLA;
  return { ...base, ...overrides, type: overrides.type || base.type };
}
