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
}
