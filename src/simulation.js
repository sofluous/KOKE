const UP = { x: 0, y: 1, z: 0 };

export const mossTypeCatalog = [
  {
    id: 0,
    key: "cushion_moss",
    name: "Cushion Moss",
    description: "Dense rounded colonies with moderate spread and moisture needs.",
    color: "#5f8f4f",
    growthMultiplier: 0.92,
    decayMultiplier: 0.9,
    moisturePreference: 0.72,
    slopePreference: 0.58,
    spreadStrength: 0.86,
    clumpProfile: { scale: 1, verticality: 0.88, patchiness: 0.62 },
  },
  {
    id: 1,
    key: "sheet_moss",
    name: "Sheet Moss",
    description: "Low creeping mats that favor inclined surfaces and drier conditions.",
    color: "#8cae78",
    growthMultiplier: 0.58,
    decayMultiplier: 0.62,
    moisturePreference: 0.44,
    slopePreference: 0.82,
    spreadStrength: 0.52,
    clumpProfile: { scale: 1.18, verticality: 0.42, patchiness: 0.46 },
  },
  {
    id: 2,
    key: "feather_moss",
    name: "Feather Moss",
    description: "Taller fine growth with strong spread and a preference for moisture.",
    color: "#4f8557",
    growthMultiplier: 1.02,
    decayMultiplier: 0.98,
    moisturePreference: 0.84,
    slopePreference: 0.42,
    spreadStrength: 0.96,
    clumpProfile: { scale: 1.06, verticality: 1.18, patchiness: 0.74 },
  },
];
export const mossSpeciesCatalog = mossTypeCatalog;

export const defaultEnvironment = {
  moisture: 0.58,
  slopeBias: 0.72,
  lightInfluence: 0.66,
  growthRate: 0.32,
  decayRate: 0.2,
  colonization: 0.38,
  diffusionRate: 0.2,
  gravityCreep: 0.21,
  cohesionRate: 0.34,
  cycleSpeed: 0.24,
  tickEveryFrames: 6,
  batchRatio: 0.22,
};

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function computeSlope(normal) {
  const upDot = clamp01(dot(normal, UP));
  return 1 - upDot;
}

function speciesPreferenceWeight(cell, environment, speciesProfile) {
  if (!speciesProfile) return 1;
  const moistureDistance = Math.abs(environment.moisture - speciesProfile.moisturePreference);
  const slopeDistance = Math.abs(cell.slope - speciesProfile.slopePreference);
  const moistureFit = 1 - moistureDistance;
  const slopeFit = 1 - slopeDistance;
  return clamp01(0.66 + moistureFit * 0.22 + slopeFit * 0.12);
}

export function evaluateHabitat(cell, environment, speciesProfile = null) {
  const slopeSuitability = 1 - Math.abs(cell.slope - environment.slopeBias);
  const shade = 1 - clamp01(cell.lightFacing);
  const heightPenalty = clamp01((cell.heightNorm - 0.76) * 1.3);
  const moistureScore = clamp01(environment.moisture * 0.75 + shade * 0.25);
  const lightScore = clamp01(
    environment.lightInfluence * (0.2 + cell.lightFacing * 0.8) +
    (1 - environment.lightInfluence) * shade
  );
  const base = clamp01(slopeSuitability * 0.34 + moistureScore * 0.44 + lightScore * 0.22 - heightPenalty * 0.14);
  return clamp01(base * speciesPreferenceWeight(cell, environment, speciesProfile));
}

function cycleWindow(cell, environment) {
  const cycleSpeed = environment.cycleSpeed ?? 0.24;
  const maturity = clamp01(cell.age * cycleSpeed * 0.0065);
  const spring = 1 - Math.pow(1 - maturity, 2);
  const dormancyDrag = cell.dormancy * 0.6;
  return clamp01(0.18 + spring * 0.82 - dormancyDrag);
}

export function updateCellState(cell, habitat, neighborDensity, environment, speciesProfile = null) {
  const colonization = environment.colonization ?? 0.38;
  const support = clamp01(neighborDensity * (0.62 + colonization * 0.25) + habitat * (0.38 - colonization * 0.16));
  const growthFactor = speciesProfile?.growthMultiplier ?? 1;
  const decayFactor = speciesProfile?.decayMultiplier ?? 1;
  const cycle = cycleWindow(
    {
      age: cell.age ?? 0,
      dormancy: cell.dormancy ?? 0,
    },
    environment
  );

  const frontier = Math.max(0, support - cell.density);
  const growth = environment.growthRate * growthFactor * frontier * cycle;
  const stress = Math.max(0, 0.48 - habitat) * environment.decayRate * decayFactor;
  const nextDensity = clamp01(cell.density + growth * 0.038 - stress * 0.028);
  const nextHealth = clamp01(
    cell.health + (habitat - 0.52) * 0.055 + (nextDensity - cell.density) * 0.45 - (cell.dormancy ?? 0) * 0.03
  );
  return { density: nextDensity, health: nextHealth, cycle };
}

function quantize(value) {
  return Math.round(value * 1e4);
}

function keyFromPosition(x, y, z) {
  return `${quantize(x)}|${quantize(y)}|${quantize(z)}`;
}

function pseudoSeed(x, y, z) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function patchNoise(x, y, z) {
  const a = Math.sin(x * 0.53 + y * 0.19 + z * 0.38);
  const b = Math.sin(x * 0.21 - z * 0.47 + 1.2);
  const c = Math.cos(y * 0.35 + z * 0.29 - 0.7);
  return clamp01((a * 0.55 + b * 0.3 + c * 0.25 + 1.1) / 2.2);
}

function chooseInitialSpecies(cell, seed, patch) {
  if (cell.slope > 0.75 && seed > 0.54) return 1;
  if (patch > 0.7 || (cell.heightNorm < 0.45 && seed > 0.28)) return 2;
  return 0;
}

function buildSpatialIndex(cells, cellSize = 0.35) {
  const buckets = new Map();
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const ix = Math.floor(cell.x / cellSize);
    const iy = Math.floor(cell.y / cellSize);
    const iz = Math.floor(cell.z / cellSize);
    const key = `${ix}|${iy}|${iz}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(i);
  }
  return { cellSize, buckets };
}

export function analyzeSurface(geometry, lightDirection) {
  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const rawCount = pos.count;
  const keyToCell = new Map();
  const rawToCell = new Uint32Array(rawCount);
  const rawTriples = [];
  const cells = [];

  let minHeight = Infinity;
  let maxHeight = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < rawCount; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);
    const key = keyFromPosition(x, y, z);
    let idx = keyToCell.get(key);

    if (idx === undefined) {
      idx = cells.length;
      keyToCell.set(key, idx);
      cells.push({
        x,
        y,
        z,
        normal: { x: nx, y: ny, z: nz },
        slope: computeSlope({ x: nx, y: ny, z: nz }),
        height: y,
        heightNorm: 0,
        mapU: 0,
        mapV: 0,
        lightFacing: clamp01(dot({ x: nx, y: ny, z: nz }, lightDirection) * 0.5 + 0.5),
        density: 0,
        mass: 0,
        health: 0.5,
        wetPaint: 0,
        age: 0,
        dormancy: 0,
        speciesId: 0,
        neighbors: new Set(),
      });
      minHeight = Math.min(minHeight, y);
      maxHeight = Math.max(maxHeight, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    rawToCell[i] = idx;
    rawTriples.push(idx);
  }

  for (let i = 0; i < rawTriples.length; i += 3) {
    const a = rawTriples[i];
    const b = rawTriples[i + 1];
    const c = rawTriples[i + 2];
    if (a !== b) {
      cells[a].neighbors.add(b);
      cells[b].neighbors.add(a);
    }
    if (b !== c) {
      cells[b].neighbors.add(c);
      cells[c].neighbors.add(b);
    }
    if (a !== c) {
      cells[a].neighbors.add(c);
      cells[c].neighbors.add(a);
    }
  }

  const heightRange = Math.max(0.0001, maxHeight - minHeight);
  const xRange = Math.max(0.0001, maxX - minX);
  const zRange = Math.max(0.0001, maxZ - minZ);
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    cell.heightNorm = (cell.height - minHeight) / heightRange;
    cell.mapU = (cell.x - minX) / xRange;
    cell.mapV = (cell.z - minZ) / zRange;

    const seed = pseudoSeed(cell.x, cell.y, cell.z);
    const blobs = patchNoise(cell.x, cell.y, cell.z);
    const basalSuitability = clamp01(0.54 - Math.abs(cell.slope - 0.62));
    const patchSeed = clamp01((blobs - 0.6) * 1.6);
    const rareSeed = Math.max(0, seed - 0.972) * 0.12;
    cell.density = clamp01(basalSuitability * 0.03 + patchSeed * 0.08 + rareSeed);
    cell.mass = cell.density;
    cell.health = clamp01(0.42 + basalSuitability * 0.19 + patchSeed * 0.13);
    cell.wetPaint = cell.density > 0.06 ? 0.12 : 0;
    cell.age = clamp01(cell.density * 3.2);
    cell.speciesId = chooseInitialSpecies(cell, seed, blobs);
    cell.neighbors = Array.from(cell.neighbors);
  }

  return {
    cells,
    rawToCell,
    rawCount,
    triangles: new Uint32Array(rawTriples),
    bounds: { minX, maxX, minZ, maxZ },
  };
}

export class GrowthSimulation {
  constructor(surfaceData, options = {}) {
    this.cells = surfaceData.cells;
    this.rawToCell = surfaceData.rawToCell;
    this.rawCount = surfaceData.rawCount;
    this.bounds = surfaceData.bounds;
    this.environment = { ...defaultEnvironment, ...options.environment };
    this.lightDirection = options.lightDirection || { x: 0.22, y: 0.85, z: 0.47 };
    this.speciesCatalog = options.speciesCatalog || mossSpeciesCatalog;
    this.speciesCount = this.speciesCatalog.length;
    this.frameCounter = 0;
    this.running = true;
    this.batchCursor = 0;
    this.pendingDensity = new Float32Array(this.rawCount);
    this.pendingSpecies = new Float32Array(this.rawCount);
    this.pendingMass = new Float32Array(this.rawCount);
    this.coverageMapSize = options.coverageMapSize || 160;
    this.coverageMap = new Float32Array(this.coverageMapSize * this.coverageMapSize * 4);
    this.coverageScratch = new Float32Array(this.coverageMap.length);
    this.coverageCounts = new Uint16Array(this.coverageMapSize * this.coverageMapSize);
    this.speciesBin0 = new Float32Array(this.coverageMapSize * this.coverageMapSize);
    this.speciesBin1 = new Float32Array(this.coverageMapSize * this.coverageMapSize);
    this.speciesBin2 = new Float32Array(this.coverageMapSize * this.coverageMapSize);
    this.spatialIndex = buildSpatialIndex(this.cells, 0.33);
    this.speciesWeightScratch = new Float32Array(this.speciesCount);
    this.dirty = true;
    this.lastBatchSize = 0;
    this.lastTickMs = 0;
    this.totalTicks = 0;
    this.paintOps = 0;
    this.lastPaintCount = 0;
  }

  setRunning(value) {
    this.running = Boolean(value);
  }

  setEnvironment(partial) {
    this.environment = { ...this.environment, ...partial };
  }

  setLightDirection(direction) {
    this.lightDirection = direction;
    for (let i = 0; i < this.cells.length; i += 1) {
      const cell = this.cells[i];
      cell.lightFacing = clamp01(dot(cell.normal, direction) * 0.5 + 0.5);
    }
  }

  getSpeciesCatalog() {
    return this.speciesCatalog;
  }

  getBounds() {
    return this.bounds;
  }

  updateFrame() {
    this.frameCounter += 1;
    if (!this.running) return false;
    if (this.frameCounter % this.environment.tickEveryFrames !== 0) return false;
    this.stepBatch();
    return true;
  }

  stepBatch() {
    const tickStart = performance.now();
    const count = this.cells.length;
    const batchSize = Math.max(16, Math.floor(count * this.environment.batchRatio));
    const start = this.batchCursor;
    const end = Math.min(count, start + batchSize);

    for (let i = start; i < end; i += 1) {
      const cell = this.cells[i];
      const neighbors = cell.neighbors;
      let neighborTotal = 0;
      let neighborMass = 0;
      let occupiedNeighbors = 0;
      let flowCarry = 0;
      this.speciesWeightScratch.fill(0);

      for (let n = 0; n < neighbors.length; n += 1) {
        const neighbor = this.cells[neighbors[n]];
        const runoff = clamp01((cell.height - neighbor.height) * 0.7 + 0.5);
        const weight = 1 + this.environment.gravityCreep * (runoff - 0.5);
        const speciesSpread = this.speciesCatalog[neighbor.speciesId]?.spreadStrength ?? 1;
        const weightedDensity = neighbor.density * weight;
        neighborTotal += weightedDensity;
        neighborMass += neighbor.mass;
        if (neighbor.density > 0.08) occupiedNeighbors += 1;
        flowCarry = Math.max(flowCarry, weightedDensity * runoff);
        this.speciesWeightScratch[neighbor.speciesId] += weightedDensity * (0.58 + neighbor.health * 0.42) * speciesSpread;
      }

      const neighborCount = neighbors.length || 1;
      const neighborDensity = neighborTotal / neighborCount;
      const occupiedRatio = occupiedNeighbors / neighborCount;
      const localMass = neighborMass / neighborCount;
      const speciesProfile = this.speciesCatalog[cell.speciesId] || this.speciesCatalog[0];
      const habitat = evaluateHabitat(cell, this.environment, speciesProfile);
      const next = updateCellState(cell, habitat, neighborDensity, this.environment, speciesProfile);

      const cohesion = (localMass - cell.density) * (this.environment.cohesionRate ?? 0.34) * 0.16;
      const frontierPush = Math.max(0, neighborDensity - cell.density) * (0.24 + occupiedRatio * 0.62 + flowCarry * 0.18);
      const calmDiffusion = (neighborDensity - cell.density) * this.environment.diffusionRate * 0.08;
      const stabilized = next.density + frontierPush * 0.03 + cohesion + calmDiffusion;
      cell.density = clamp01(stabilized);

      if (habitat < 0.46 && cell.density > 0.08) {
        cell.dormancy = clamp01(cell.dormancy + (0.48 - habitat) * 0.045);
      } else {
        cell.dormancy = clamp01(cell.dormancy - (habitat - 0.44) * 0.03);
      }

      if (cell.density > 0.02) {
        cell.age = clamp01(cell.age + (0.2 + cell.density * 0.8) * 0.018);
      } else {
        cell.age = clamp01(cell.age - 0.012);
      }

      cell.health = clamp01(next.health + (occupiedRatio - 0.35) * 0.03 - cell.dormancy * 0.035);
      cell.mass = clamp01(cell.mass * 0.72 + cell.density * 0.28 + Math.max(0, localMass - cell.density) * 0.14);
      cell.wetPaint = clamp01(cell.wetPaint * (0.94 - cell.density * 0.04) + Math.max(0, cell.density - 0.38) * 0.02);

      let dominantSpecies = cell.speciesId;
      let dominantWeight = 0;
      for (let s = 0; s < this.speciesCount; s += 1) {
        if (this.speciesWeightScratch[s] > dominantWeight) {
          dominantWeight = this.speciesWeightScratch[s];
          dominantSpecies = s;
        }
      }

      if (dominantSpecies !== cell.speciesId && cell.density < 0.18 && occupiedRatio > 0.22) {
        const pressure = dominantWeight / neighborCount;
        const spreadChance = clamp01(pressure * (0.18 + this.environment.colonization * 0.46));
        const chanceSeed = pseudoSeed(cell.x + this.totalTicks * 0.0008, cell.y, cell.z);
        if (chanceSeed < spreadChance) cell.speciesId = dominantSpecies;
      }

      if (cell.density < 0.009) {
        cell.health = clamp01(cell.health * 0.985);
        if (cell.health < 0.15) cell.dormancy = clamp01(cell.dormancy + 0.02);
      }
    }

    this.batchCursor = end >= count ? 0 : end;
    this.lastBatchSize = end - start;
    this.lastTickMs = performance.now() - tickStart;
    this.totalTicks += 1;
    this.dirty = true;
  }

  paintAt(point, options = {}) {
    const radius = Math.max(0.04, options.radius ?? 0.3);
    const strength = clamp01(options.strength ?? 0.7);
    const erase = Boolean(options.erase);
    const speciesId = Math.max(0, Math.min(this.speciesCount - 1, options.speciesId ?? 0));
    const { cellSize, buckets } = this.spatialIndex;

    const minX = Math.floor((point.x - radius) / cellSize);
    const maxX = Math.floor((point.x + radius) / cellSize);
    const minY = Math.floor((point.y - radius) / cellSize);
    const maxY = Math.floor((point.y + radius) / cellSize);
    const minZ = Math.floor((point.z - radius) / cellSize);
    const maxZ = Math.floor((point.z + radius) / cellSize);

    const r2 = radius * radius;
    let painted = 0;

    for (let ix = minX; ix <= maxX; ix += 1) {
      for (let iy = minY; iy <= maxY; iy += 1) {
        for (let iz = minZ; iz <= maxZ; iz += 1) {
          const bucket = buckets.get(`${ix}|${iy}|${iz}`);
          if (!bucket) continue;

          for (let i = 0; i < bucket.length; i += 1) {
            const cell = this.cells[bucket[i]];
            const dx = cell.x - point.x;
            const dy = cell.y - point.y;
            const dz = cell.z - point.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > r2) continue;

            const falloff = 1 - Math.sqrt(d2) / radius;
            const influence = strength * falloff;
            if (erase) {
              cell.density = clamp01(cell.density - influence * 0.42);
              cell.mass = clamp01(cell.mass - influence * 0.35);
              cell.health = clamp01(cell.health - influence * 0.24);
              cell.wetPaint = clamp01(cell.wetPaint - influence * 0.65);
              cell.dormancy = clamp01(cell.dormancy + influence * 0.08);
              if (cell.density < 0.02) cell.speciesId = 0;
            } else {
              if (cell.density < 0.1 || influence > 0.2) {
                cell.speciesId = speciesId;
              }
              cell.density = clamp01(cell.density + influence * 0.32);
              cell.mass = clamp01(cell.mass + influence * 0.4);
              cell.health = clamp01(Math.max(cell.health, 0.42) + influence * 0.16);
              cell.wetPaint = clamp01(Math.max(cell.wetPaint, 0.35) + influence * 0.72);
              cell.age = clamp01(cell.age + influence * 0.09);
              cell.dormancy = clamp01(cell.dormancy - influence * 0.14);
            }
            painted += 1;
          }
        }
      }
    }

    if (painted > 0) {
      this.paintOps += 1;
      this.lastPaintCount = painted;
      this.dirty = true;
    }

    return painted;
  }

  fillRawDensityBuffer() {
    for (let i = 0; i < this.rawCount; i += 1) {
      this.pendingDensity[i] = this.cells[this.rawToCell[i]].density;
    }
    this.dirty = false;
    return this.pendingDensity;
  }

  fillRawSpeciesBuffer() {
    for (let i = 0; i < this.rawCount; i += 1) {
      this.pendingSpecies[i] = this.cells[this.rawToCell[i]].speciesId;
    }
    return this.pendingSpecies;
  }

  fillRawMassBuffer() {
    for (let i = 0; i < this.rawCount; i += 1) {
      this.pendingMass[i] = this.cells[this.rawToCell[i]].mass;
    }
    return this.pendingMass;
  }

  fillCoverageMap() {
    const size = this.coverageMapSize;
    const map = this.coverageMap;
    const scratch = this.coverageScratch;
    const counts = this.coverageCounts;
    const bin0 = this.speciesBin0;
    const bin1 = this.speciesBin1;
    const bin2 = this.speciesBin2;
    map.fill(0);
    counts.fill(0);
    bin0.fill(0);
    bin1.fill(0);
    bin2.fill(0);

    for (let i = 0; i < this.cells.length; i += 1) {
      const cell = this.cells[i];
      const tx = Math.max(0, Math.min(size - 1, Math.floor(cell.mapU * (size - 1))));
      const ty = Math.max(0, Math.min(size - 1, Math.floor(cell.mapV * (size - 1))));
      const p = ty * size + tx;
      const offset = p * 4;
      map[offset] += cell.density;
      map[offset + 1] += cell.mass;
      map[offset + 2] += clamp01(cell.health * 0.58 + cell.wetPaint * 0.42);
      if (cell.speciesId === 0) bin0[p] += cell.mass + cell.wetPaint * 0.6;
      else if (cell.speciesId === 1) bin1[p] += cell.mass + cell.wetPaint * 0.6;
      else bin2[p] += cell.mass + cell.wetPaint * 0.6;
      counts[p] += 1;
    }

    for (let i = 0; i < counts.length; i += 1) {
      const count = Math.max(1, counts[i]);
      const offset = i * 4;
      map[offset] /= count;
      map[offset + 1] /= count;
      map[offset + 2] /= count;
      const s0 = bin0[i];
      const s1 = bin1[i];
      const s2 = bin2[i];
      const dominant = s2 > s1 ? (s2 > s0 ? 2 : 0) : (s1 > s0 ? 1 : 0);
      map[offset + 3] = dominant / Math.max(1, this.speciesCount - 1);
    }

    // Lightweight blur to merge nearby colonies into smoother moss masses.
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let d = 0;
        let m = 0;
        let h = 0;
        let s = 0;
        let w = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          const py = Math.max(0, Math.min(size - 1, y + oy));
          for (let ox = -1; ox <= 1; ox += 1) {
            const px = Math.max(0, Math.min(size - 1, x + ox));
            const weight = ox === 0 && oy === 0 ? 0.28 : 0.09;
            const off = (py * size + px) * 4;
            d += map[off] * weight;
            m += map[off + 1] * weight;
            h += map[off + 2] * weight;
            s += map[off + 3] * weight;
            w += weight;
          }
        }
        const out = (y * size + x) * 4;
        scratch[out] = d / w;
        scratch[out + 1] = m / w;
        scratch[out + 2] = h / w;
        scratch[out + 3] = s / w;
      }
    }

    map.set(scratch);
    return { data: map, width: size, height: size };
  }

  getStats() {
    const sampleStride = Math.max(1, Math.floor(this.cells.length / 1400));
    let sampled = 0;
    let active = 0;
    let sum = 0;

    for (let i = 0; i < this.cells.length; i += sampleStride) {
      const density = this.cells[i].density;
      sum += density;
      if (density >= 0.4) active += 1;
      sampled += 1;
    }

    return {
      cellCount: this.cells.length,
      avgDensity: sampled ? sum / sampled : 0,
      activeRatio: sampled ? active / sampled : 0,
      lastBatchSize: this.lastBatchSize,
      lastTickMs: this.lastTickMs,
      totalTicks: this.totalTicks,
      paintOps: this.paintOps,
      lastPaintCount: this.lastPaintCount,
      environment: { ...this.environment },
    };
  }
}
