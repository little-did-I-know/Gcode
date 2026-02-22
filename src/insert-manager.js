// Note: references global `parser` and `modifier` — works in built output.
// TODO: refactor to accept dependencies as constructor parameters.
// ===== INSERT MANAGER =====
export class InsertManager {
  constructor() {
    this.inserts = []; // track insert-to-modification links
  }

  clear() { this.inserts = []; }

  calculatePauseLayer(hole, insertHeightMm) {
    if (hole.floorLayer == null || hole.floorLayer < 0) return null;

    const floorLayerData = parser.getLayerByNumber(hole.floorLayer);
    if (!floorLayerData || floorLayerData.zHeight == null) return null;

    const targetZ = floorLayerData.zHeight + insertHeightMm;

    // Find first layer where zHeight >= targetZ
    for (const layer of parser.layers) {
      if (layer.zHeight != null && layer.zHeight >= targetZ) {
        return layer.number;
      }
    }
    return null; // insert taller than remaining print
  }

  createModification(hole, heightMm, diameterMm, label, pauseType, moveHead) {
    const pauseLayer = this.calculatePauseLayer(hole, heightMm);
    if (pauseLayer == null) return null;

    const message = label
      ? `Insert ${label} (${diameterMm}mm dia, ${heightMm}mm tall) at hole #${hole.id}`
      : `Insert object (${diameterMm}mm dia, ${heightMm}mm tall) at hole #${hole.id}`;

    const mod = modifier.addPause(pauseLayer, message, pauseType, moveHead);

    this.inserts.push({
      holeId: hole.id,
      modId: mod.id,
      pauseLayer,
      heightMm,
      diameterMm,
      label
    });

    return { mod, pauseLayer };
  }

  applyToMultipleHoles(holes, config) {
    const results = [];
    for (const hole of holes) {
      const result = this.createModification(
        hole, config.heightMm, config.diameterMm,
        config.label, config.pauseType, config.moveHead
      );
      if (result) results.push(result);
    }
    return results;
  }
}
