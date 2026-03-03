import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MATERIAL_PROFILES, getMaterialProfile } from '../src/material-profiles.js';

describe('Material Profiles - maxVolumetricFlow', () => {
  it('every profile has maxVolumetricFlow', () => {
    for (const [name, profile] of Object.entries(MATERIAL_PROFILES)) {
      assert.ok(typeof profile.maxVolumetricFlow === 'number',
        `${name} missing maxVolumetricFlow`);
      assert.ok(profile.maxVolumetricFlow > 0,
        `${name} maxVolumetricFlow must be positive`);
    }
  });

  it('TPU has lower max flow than PLA', () => {
    assert.ok(MATERIAL_PROFILES.TPU.maxVolumetricFlow < MATERIAL_PROFILES.PLA.maxVolumetricFlow);
  });

  it('getMaterialProfile includes maxVolumetricFlow', () => {
    const profile = getMaterialProfile('PLA');
    assert.ok(profile.maxVolumetricFlow > 0);
  });
});
