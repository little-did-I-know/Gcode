import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MotionAnalyzer } from '../src/motion-analyzer.js';

describe('MotionAnalyzer', () => {
  it('creates with default profile', () => {
    const analyzer = new MotionAnalyzer();
    assert.ok(analyzer.profile);
    assert.strictEqual(analyzer.profile.acceleration, 500);
    assert.strictEqual(analyzer.profile.jerk, 8);
  });

  it('respects custom values when passed', () => {
    const customProfile = {
      acceleration: 1000,
      travelAccel: 2000,
      jerk: 16,
      junctionDeviation: 0.05,
      maxVelocity: 300,
      firmwareType: 'klipper',
      headMass: 0.5,
      gantryType: 'corexy',
    };
    const analyzer = new MotionAnalyzer(customProfile);
    assert.strictEqual(analyzer.profile.acceleration, 1000);
    assert.strictEqual(analyzer.profile.travelAccel, 2000);
    assert.strictEqual(analyzer.profile.jerk, 16);
    assert.strictEqual(analyzer.profile.junctionDeviation, 0.05);
    assert.strictEqual(analyzer.profile.maxVelocity, 300);
    assert.strictEqual(analyzer.profile.firmwareType, 'klipper');
    assert.strictEqual(analyzer.profile.headMass, 0.5);
    assert.strictEqual(analyzer.profile.gantryType, 'corexy');
  });

  it('initializes results Map', () => {
    const analyzer = new MotionAnalyzer();
    assert.ok(analyzer.results instanceof Map);
    assert.strictEqual(analyzer.results.size, 0);
  });

  it('handles partial profile with some custom and some default values', () => {
    const partialProfile = {
      acceleration: 750,
      firmwareType: 'reprap',
    };
    const analyzer = new MotionAnalyzer(partialProfile);
    // Custom values
    assert.strictEqual(analyzer.profile.acceleration, 750);
    assert.strictEqual(analyzer.profile.firmwareType, 'reprap');
    // Default values
    assert.strictEqual(analyzer.profile.travelAccel, 1000);
    assert.strictEqual(analyzer.profile.jerk, 8);
    assert.strictEqual(analyzer.profile.junctionDeviation, null);
    assert.strictEqual(analyzer.profile.maxVelocity, 500);
    assert.strictEqual(analyzer.profile.headMass, null);
    assert.strictEqual(analyzer.profile.gantryType, 'cartesian');
  });
});
