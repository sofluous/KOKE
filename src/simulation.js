const UP = { x: 0, y: 1, z: 0 };

export const mossSpeciesCatalog = [
  {
    id: 0,
    key: "forest_moss",
    name: "Forest Moss",
    color: "#5f8f4f",
    growthMultiplier: 1,
    decayMultiplier: 0.95,
    moisturePreference: 0.72,
    slopePreference: 0.58,
    spreadStrength: 1,
  },
  {
    id: 1,
    key: "rock_lichen",
    name: "Rock Lichen",
    color: "#8cae78",
    growthMultiplier: 0.78,
    decayMultiplier: 0.72,
    moisturePreference: 0.44,
    slopePreference: 0.82,
    spreadStrength: 0.7,
  },
  {
    id: 2,
    key: "velvet_moss",
    name: "Velvet Moss",
    color: "#4f8557",
    growthMultiplier: 1.2,
    decayMultiplier: 1.06,
    moisturePreference: 0.84,
    slopePreference: 0.42,
    spreadStrength: 1.18,
  },
];

export const defaultEnvironment = {
  moisture: 0.58,
  slopeBias: 0.72,
  lightInfluence: 0.66,
  growthRate: 0.55,
  decayRate: 0.45,
  colonization: 0.62,
  diffusionRate: 0.36,
  gravityCreep: 0.24,
  tickEveryFrames: 5,
  batchRatio: 0.28,
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
  return clamp01(0.72 + moistureFit * 0.18 + slopeFit * 0.1);
}

export function evaluateHabitat(cell, environment, speciesProfile = null) {
  const slopeSuitability = 1 - Math.abs(cell.slope - environment.slopeBias);
  const shade = 1 - clamp01(cell.lightFacing);
  const heightPenalty = clamp01((cell.heightNorm - 0.75) * 1.4);
  const moistureScore = clamp01(environment.moisture * 0.75 + shade * 0.25);
  const lightScore = clamp01(
    environment.lightInfluence * (0.2 + cell.lightFacing * 0.8) +
    (1 - environment.lightInfluence) * shade
  );
  const base = clamp01(slopeSuitability * 0.36 + moistureScore * 0.42 + lightScore * 0.22 - heightPenalty * 0.16);
  return clamp01(base * speciesPreferenceWeight(cell, environment, speciesProfile));
}

export function updateCellState(cell, habitat, neighborDensity, environment, speciesProfile = null) {
  const colonization = environment.colonization ?? 0.62;
  const support = clamp01(
    neighborDensity * (0.55 + colonization * 0.35) +
    habitat * (0.45 - colonization * 0.2)
  );
  const crowding = 0.35 + (1 - colonization) * 0.25;
  const growthFactor = speciesProfile?.growthMultiplier ?? 1;
  const decayFactor = speciesProfile?.decayMultiplier ?? 1;
  const growth = environment.growthRate * growthFactor * Math.max(0, support - cell.density * crowding);
  const stress = Math.max(0, 0.45 - habitat) * environment.decayRate * decayFactor;
  const nextDensity = clamp01(cell.density + growth * 0.06 - stress * 0.04);
  const nextHealth = clamp01(cell.health + (habitat - 0.5) * 0.08 + (nextDensity - cell.density) * 0.6);
  return { density: nextDensity, health: nextHealth };
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

function spatialKey(x, y, z, cellSize) {
  const ix = Math.floor(x / cellSize);
  const iy = Math.floor(y / cellSize);
  const iz = Math.floor(z / cellSize);
  return `${ix}|${iy}|${iz}`;
}

function buildSpatialIndex(cells, cellSize = 0.35) {
  const buckets = new Map();
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const key = spatialKey(cell.x, cell.y, cell.z, cellSize);
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
        lightFacing: clamp01(dot({ x: nx, y: ny, z: nz }, lightDirection) * 0.5 + 0.5),
        density: 0,
        health: 0.5,
        speciesId: 0,
        neighbors: new Set(),
      });
      minHeight = Math.min(minHeight, y);
      maxHeight = Math.max(maxHeight, y);
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
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    cell.heightNorm = (cell.height - minHeight) / heightRange;
    const seed = pseudoSeed(cell.x, cell.y, cell.z);
    const blobs = patchNoise(cell.x, cell.y, cell.z);
    const basalSuitability = clamp01(0.58 - Math.abs(cell.slope - 0.62));
    const patchSeed = clamp01((blobs - 0.56) * 1.8);
    const rareSeed = Math.max(0, seed - 0.96) * 0.3;
    cell.density = clamp01(basalSuitability * 0.06 + patchSeed * 0.18 + rareSeed);
    cell.health = clamp01(0.44 + basalSuitability * 0.22 + patchSeed * 0.18);
    cell.speciesId = chooseInitialSpecies(cell, seed, blobs);
    cell.neighbors = Array.from(cell.neighbors);
  }

  return { cells, rawToCell, rawCount, triangles: new Uint32Array(rawTriples) };
}

export class GrowthSimulation {
  constructor(surfaceData, options = {}) {
    this.cells = surfaceData.cells;
    this.rawToCell = surfaceData.rawToCell;
    this.rawCount = surfaceData.rawCount;
    this.environment = { ...defaultEnvironment, ...options.environment };
    this.lightDirection = options.lightDirection || { x: 0.22, y: 0.85, z: 0.47 };
    this.speciesCatalog = options.speciesCatalog || mossSpeciesCatalog;
    this.speciesCount = this.speciesCatalog.length;
    this.frameCounter = 0;
    this.running = true;
    this.batchCursor = 0;
    this.pendingDensity = new Float32Array(this.rawCount);
    this.pendingSpecies = new Float32Array(this.rawCount);
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
      this.speciesWeightScratch.fill(0);

      for (let n = 0; n < neighbors.length; n += 1) {
        const neighbor = this.cells[neighbors[n]];
        const runoff = clamp01((cell.height - neighbor.height) * 0.7 + 0.5);
        const weight = 1 + this.environment.gravityCreep * (runoff - 0.5);
        const speciesSpread = this.speciesCatalog[neighbor.speciesId]?.spreadStrength ?? 1;
        const weightedDensity = neighbor.density * weight;
        neighborTotal += weightedDensity;
        this.speciesWeightScratch[neighbor.speciesId] += weightedDensity * (0.65 + neighbor.health * 0.35) * speciesSpread;
      }

      const neighborDensity = neighbors.length ? neighborTotal / neighbors.length : 0;
      const speciesProfile = this.speciesCatalog[cell.speciesId] || this.speciesCatalog[0];
      const habitat = evaluateHabitat(cell, this.environment, speciesProfile);
      const next = updateCellState(cell, habitat, neighborDensity, this.environment, speciesProfile);
      const diffusion = (neighborDensity - cell.density) * this.environment.diffusionRate;
      cell.density = clamp01(next.density + diffusion * 0.12);
      cell.health = clamp01(next.health + diffusion * 0.08);

      let dominantSpecies = cell.speciesId;
      let dominantWeight = 0;
      for (let s = 0; s < this.speciesCount; s += 1) {
        if (this.speciesWeightScratch[s] > dominantWeight) {
          dominantWeight = this.speciesWeightScratch[s];
          dominantSpecies = s;
        }
      }

      if (dominantSpecies !== cell.speciesId && cell.density < 0.22) {
        const pressure = neighbors.length ? dominantWeight / neighbors.length : 0;
        const spreadChance = clamp01(pressure * (0.4 + this.environment.colonization * 0.9));
        const chanceSeed = pseudoSeed(cell.x + this.totalTicks * 0.003, cell.y, cell.z);
        if (chanceSeed < spreadChance) cell.speciesId = dominantSpecies;
      }

      if (cell.density < 0.01) {
        cell.health = clamp01(cell.health * 0.98);
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
              cell.density = clamp01(cell.density - influence * 0.65);
              cell.health = clamp01(cell.health - influence * 0.35);
              if (cell.density < 0.02) cell.speciesId = 0;
            } else {
              if (cell.density < 0.09 || influence > 0.22) {
                cell.speciesId = speciesId;
              }
              cell.density = clamp01(cell.density + influence * 0.58);
              cell.health = clamp01(Math.max(cell.health, 0.4) + influence * 0.18);
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
