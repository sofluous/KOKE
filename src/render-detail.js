export function computeShootLodFactor(distance, nearDistance = 4, farDistance = 10, minimum = 0.45) {
  if (!Number.isFinite(distance) || !Number.isFinite(nearDistance)
    || !Number.isFinite(farDistance) || !Number.isFinite(minimum)) {
    throw new RangeError('LOD values must be finite');
  }
  if (nearDistance < 0 || farDistance <= nearDistance || minimum <= 0 || minimum > 1) {
    throw new RangeError('Invalid LOD range');
  }
  const t = Math.max(0, Math.min(1, (distance - nearDistance) / (farDistance - nearDistance)));
  const smooth = t * t * (3 - 2 * t);
  return 1 - (1 - minimum) * smooth;
}
