import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MATERIAL_PROFILES, inferMaterial, getMaterialProfile, DEFAULT_THRESHOLDS } from '../src/material-profiles.js';

describe('Material Profiles', () => {
  it('has profiles for all standard materials', () => {
    const types = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'PC'];
    for (const type of types) {
      assert.ok(MATERIAL_PROFILES[type], `Missing profile for ${type}`);
      assert.ok(MATERIAL_PROFILES[type].glassTransition > 0 || MATERIAL_PROFILES[type].glassTransition < 0); // TPU has negative
      assert.ok(MATERIAL_PROFILES[type].adhesionCoefficient > 0);
      assert.ok(MATERIAL_PROFILES[type].adhesionCoefficient <= 1);
    }
  });

  it('has profiles for CF/GF reinforced materials', () => {
    const types = ['PLA-CF', 'PETG-CF', 'ABS-GF', 'ASA-CF', 'PET-CF', 'PA-CF', 'PA6-CF', 'PA6-GF', 'PPA-CF', 'PPS-CF', 'PC-FR'];
    for (const type of types) {
      assert.ok(MATERIAL_PROFILES[type], `Missing profile for ${type}`);
      assert.ok(MATERIAL_PROFILES[type].needsHardenedNozzle !== undefined || MATERIAL_PROFILES[type].type === 'PC-FR');
      assert.ok(MATERIAL_PROFILES[type].impactStrengthZ > 0, `${type} missing impact strength Z`);
    }
  });

  it('all profiles have Bambu Lab mechanical properties', () => {
    for (const [name, profile] of Object.entries(MATERIAL_PROFILES)) {
      assert.ok(profile.impactStrengthZ > 0 || profile.impactStrengthZ === null, `${name} missing impactStrengthZ`);
      assert.ok(profile.nozzleTempRange, `${name} missing nozzleTempRange`);
      assert.ok(profile.maxPrintSpeed > 0, `${name} missing maxPrintSpeed`);
      assert.ok(typeof profile.waterAbsorption === 'number', `${name} missing waterAbsorption`);
    }
  });

  it('infers PLA from hotend temp 200-220', () => {
    const lines = ['M104 S210', ';LAYER:0', 'G1 X10 Y10 E1'];
    assert.strictEqual(inferMaterial(lines), 'PLA');
  });

  it('infers PETG from hotend temp 230-250', () => {
    const lines = ['M109 S240', ';LAYER:0', 'G1 X10 Y10 E1'];
    assert.strictEqual(inferMaterial(lines), 'PETG');
  });

  it('defaults to PETG for high hotend temp without filament comment', () => {
    const lines = ['M190 S95', 'M104 S255', ';LAYER:0', 'G1 X10 Y10 E1'];
    assert.strictEqual(inferMaterial(lines), 'PETG');
  });

  it('returns PLA as default when no temp found', () => {
    const lines = [';LAYER:0', 'G1 X10 Y10 E1'];
    assert.strictEqual(inferMaterial(lines), 'PLA');
  });

  it('infers material from slicer filament_type comment', () => {
    assert.strictEqual(inferMaterial(['; filament_type = PETG-CF', 'M104 S260']), 'PETG-CF');
    assert.strictEqual(inferMaterial(['; filament_type = PA6-CF', 'M104 S280']), 'PA6-CF');
    assert.strictEqual(inferMaterial(['; filament_type = TPU', 'M104 S230']), 'TPU');
  });

  it('prefers comment-based detection over temperature', () => {
    // Comment says PLA-CF but temp looks like PETG range
    const lines = ['; filament_type = PLA-CF', 'M104 S235'];
    assert.strictEqual(inferMaterial(lines), 'PLA-CF');
  });

  it('getMaterialProfile returns merged profile with custom overrides', () => {
    const profile = getMaterialProfile('PLA', { meltTemp: 195 });
    assert.strictEqual(profile.meltTemp, 195);
    assert.strictEqual(profile.type, 'PLA');
    assert.ok(profile.glassTransition > 0);
  });

  it('has default thresholds for each finding type', () => {
    assert.ok(DEFAULT_THRESHOLDS['layer-bond-overlap']);
    assert.ok(DEFAULT_THRESHOLDS['layer-bond-cooling']);
    assert.ok(DEFAULT_THRESHOLDS['wall-seam-alignment']);
    assert.ok(DEFAULT_THRESHOLDS['wall-gap-size']);
    assert.ok(DEFAULT_THRESHOLDS['extrusion-consistency']);
  });
});

describe('Material Profiles — Thermal Properties', () => {
  it('every material has thermalConductivity and specificHeatCapacity', () => {
    for (const [name, mat] of Object.entries(MATERIAL_PROFILES)) {
      assert.ok(typeof mat.thermalConductivity === 'number',
        `${name} missing thermalConductivity`);
      assert.ok(mat.thermalConductivity > 0 && mat.thermalConductivity < 1,
        `${name} thermalConductivity out of range: ${mat.thermalConductivity}`);
      assert.ok(typeof mat.specificHeatCapacity === 'number',
        `${name} missing specificHeatCapacity`);
      assert.ok(mat.specificHeatCapacity > 500 && mat.specificHeatCapacity < 3000,
        `${name} specificHeatCapacity out of range: ${mat.specificHeatCapacity}`);
    }
  });
});
