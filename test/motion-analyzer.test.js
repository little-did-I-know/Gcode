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
});
