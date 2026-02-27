// ===== MOTION ANALYZER =====
export class MotionAnalyzer {
  constructor(profile = {}) {
    this.profile = {
      acceleration: profile.acceleration ?? 500,      // mm/s² (M204 P)
      travelAccel: profile.travelAccel ?? 1000,       // mm/s² (M204 T)
      jerk: profile.jerk ?? 8,                        // mm/s^3 (M205 X/Y)
      junctionDeviation: profile.junctionDeviation ?? null,
      maxVelocity: profile.maxVelocity ?? 500,        // mm/s
      firmwareType: profile.firmwareType ?? 'marlin',
      headMass: profile.headMass ?? null,
      gantryType: profile.gantryType ?? 'cartesian',
    };
    this.results = new Map();
  }

  static inferProfile(lines) {
    const profile = {
      acceleration: 500,
      travelAccel: 1000,
      jerk: 8,
      junctionDeviation: null,
      maxVelocity: 500,
      firmwareType: 'marlin',
    };

    const scanLimit = Math.min(200, lines.length);

    for (let i = 0; i < scanLimit; i++) {
      const line = lines[i].trim();

      // M204 - Set acceleration (Marlin/RRF)
      if (/^M204\s/.test(line)) {
        const pMatch = line.match(/P([\d.]+)/i);
        const tMatch = line.match(/T([\d.]+)/i);
        const sMatch = line.match(/S([\d.]+)/i);
        if (pMatch) profile.acceleration = parseFloat(pMatch[1]);
        if (tMatch) profile.travelAccel = parseFloat(tMatch[1]);
        if (sMatch) {
          profile.acceleration = parseFloat(sMatch[1]);
          profile.travelAccel = parseFloat(sMatch[1]);
        }
      }

      // M205 - Set jerk (Marlin)
      if (/^M205\s/.test(line)) {
        const xMatch = line.match(/X([\d.]+)/i);
        const yMatch = line.match(/Y([\d.]+)/i);
        if (xMatch) profile.jerk = parseFloat(xMatch[1]);
        else if (yMatch) profile.jerk = parseFloat(yMatch[1]);

        const jMatch = line.match(/J([\d.]+)/i);
        if (jMatch) profile.junctionDeviation = parseFloat(jMatch[1]);
      }

      // M203 - Set max feedrate
      if (/^M203\s/.test(line)) {
        const xMatch = line.match(/X([\d.]+)/i);
        if (xMatch) profile.maxVelocity = parseFloat(xMatch[1]);
      }

      // Klipper: SET_VELOCITY_LIMIT
      if (/^SET_VELOCITY_LIMIT\s/i.test(line)) {
        profile.firmwareType = 'klipper';
        const accelMatch = line.match(/ACCEL=([\d.]+)/i);
        if (accelMatch) {
          profile.acceleration = parseFloat(accelMatch[1]);
          profile.travelAccel = parseFloat(accelMatch[1]);
        }
        const sqCornerMatch = line.match(/SQUARE_CORNER_VELOCITY=([\d.]+)/i);
        if (sqCornerMatch) {
          const scv = parseFloat(sqCornerMatch[1]);
          profile.junctionDeviation = (scv * scv) / (2 * profile.acceleration);
        }
      }
    }

    return profile;
  }

  /**
   * Calculate maximum achievable velocity for a segment.
   * Uses kinematic equation: v² = v₀² + 2ad
   * @param {number} distance - Segment length in mm
   * @param {number} entryVelocity - Starting velocity in mm/s
   * @param {number} requestedVelocity - Target velocity in mm/s
   * @returns {number} Maximum achievable velocity in mm/s
   */
  calcMaxVelocity(distance, entryVelocity, requestedVelocity) {
    if (distance <= 0) return entryVelocity;

    const accel = this.profile.acceleration;
    // v² = v₀² + 2ad
    const maxFromAccel = Math.sqrt(entryVelocity * entryVelocity + 2 * accel * distance);

    // Cap at requested velocity and max velocity
    return Math.min(maxFromAccel, requestedVelocity, this.profile.maxVelocity);
  }

  /**
   * Calculate maximum junction velocity between two moves.
   * Based on the angle between moves and jerk/junction deviation setting.
   * @param {Object} move1 - First move {x1, y1, x2, y2}
   * @param {Object} move2 - Second move {x1, y1, x2, y2}
   * @param {number} requestedVelocity - Current velocity in mm/s
   * @returns {number} Maximum junction velocity in mm/s
   */
  calcJunctionVelocity(move1, move2, requestedVelocity) {
    const dx1 = move1.x2 - move1.x1;
    const dy1 = move1.y2 - move1.y1;
    const dx2 = move2.x2 - move2.x1;
    const dy2 = move2.y2 - move2.y1;

    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);

    if (len1 < 0.001 || len2 < 0.001) return 0;

    const ux1 = dx1 / len1, uy1 = dy1 / len1;
    const ux2 = dx2 / len2, uy2 = dy2 / len2;

    const dot = ux1 * ux2 + uy1 * uy2;
    const cosAngle = Math.max(-1, Math.min(1, dot));

    if (cosAngle > 0.999) return requestedVelocity;

    const deltaV = Math.hypot(ux2 - ux1, uy2 - uy1);

    if (this.profile.junctionDeviation !== null) {
      const halfAngle = Math.acos(cosAngle) / 2;
      const sinHalf = Math.sin(halfAngle);
      if (sinHalf > 0.999) return 0;
      const jv = Math.sqrt(
        this.profile.junctionDeviation * this.profile.acceleration * sinHalf / (1 - sinHalf)
      );
      return Math.min(jv, requestedVelocity);
    } else {
      if (deltaV < 0.001) return requestedVelocity;
      const jv = this.profile.jerk / deltaV;
      return Math.min(jv, requestedVelocity);
    }
  }
}
