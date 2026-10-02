import { evaluateHabitat, mossSpeciesCatalog } from './simulation.js';
import { FIXED_STEP, createFieldEnvironment } from './simulation-environment.js';
import { clamp, hash, noise } from './substrate.js';

const STATE_CHANNELS = Object.freeze([
  'species',
  'vitality',
  'moisture',
  'biomass',
  'age',
  'stress',
  'dormantReserves',
  'deadMatter',
]);

function validateGraph(graph) {
  if (!graph || !Number.isInteger(graph.triangleCount) || graph.triangleCount < 1) {
    throw new TypeError('A non-empty mesh surface graph is required');
  }
  const scalarLengths = [['areas', graph.triangleCount], ['componentIds', graph.triangleCount]];
  const vectorLengths = [['centroids', graph.triangleCount * 3], ['normals', graph.triangleCount * 3]];
  for (const [name, length] of [...scalarLengths, ...vectorLengths]) {
    if (!graph[name] || graph[name].length !== length) throw new TypeError(`Mesh graph ${name} is incomplete`);
  }
  if (!Array.isArray(graph.neighbors) || graph.neighbors.length !== graph.triangleCount) {
    throw new TypeError('Mesh graph neighbors are incomplete');
  }
}

function normalizeDirection(direction) {
  const length = Math.hypot(direction?.x, direction?.y, direction?.z);
  if (!Number.isFinite(length) || length < 1e-8) {
    throw new RangeError('Light direction must be finite and nonzero');
  }
  return { x: direction.x / length, y: direction.y / length, z: direction.z / length };
}

function validateSpecies(speciesId, speciesCount) {
  if (!Number.isInteger(speciesId) || speciesId < 0 || speciesId >= speciesCount) {
    throw new RangeError('Unknown moss type');
  }
}

export class GraphSimulationAdapter {
  constructor(graph, options = {}) {
    validateGraph(graph);
    this.graph = graph;
    this.cellCount = graph.triangleCount;
    this.speciesCatalog = options.speciesCatalog || mossSpeciesCatalog;
    this.speciesCount = this.speciesCatalog.length;
    if (this.speciesCount !== 3) throw new RangeError('The graph adapter requires three species profiles');

    this.seed = options.seed ?? 0;
    if (!Number.isInteger(this.seed) || this.seed < 0 || this.seed > 0xffffffff) {
      throw new RangeError('Seed must be an unsigned 32-bit integer');
    }
    this.seedOffsets = {
      x: hash(this.seed + 0.17) * 64,
      y: hash(this.seed + 1.31) * 64,
      z: hash(this.seed + 2.73) * 64,
      life: hash(this.seed + 4.91) * 2048,
    };

    this.environment = createFieldEnvironment(options.environment || {});
    this.lightDirection = normalizeDirection(options.lightDirection || { x: 0.3, y: 0.85, z: 0.43 });
    this.species = new Float32Array(this.cellCount * this.speciesCount);
    this.nextSpecies = new Float32Array(this.species.length);
    this.vitality = new Float32Array(this.cellCount);
    this.moisture = new Float32Array(this.cellCount);
    this.biomass = new Float32Array(this.cellCount);
    this.age = new Float32Array(this.cellCount);
    this.stress = new Float32Array(this.cellCount);
    this.dormantReserves = new Float32Array(this.species.length);
    this.deadMatter = new Float32Array(this.cellCount);

    this.slope = new Float32Array(this.cellCount);
    this.height = new Float32Array(this.cellCount);
    this.habitat = new Float32Array(this.cellCount);
    this.capacity = new Float32Array(this.cellCount);
    this.lifespan = new Float32Array(this.cellCount);
    this.neighborWeights = Array.from({ length: this.cellCount }, () => new Float32Array(0));

    this.time = 0;
    this.accumulator = 0;
    this.totalTicks = 0;
    this.collapses = 0;
    this.revision = 0;
    this.running = false;
    this._buildSurfaceState();
    this.reset(options.initialState ?? 'bare', options.initialSpeciesId ?? null);
  }

  _buildSurfaceState() {
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    for (let i = 0; i < this.cellCount; i += 1) {
      const y = this.graph.centroids[i * 3 + 1];
      minHeight = Math.min(minHeight, y);
      maxHeight = Math.max(maxHeight, y);
    }
    const heightRange = Math.max(1e-8, maxHeight - minHeight);
    for (let i = 0; i < this.cellCount; i += 1) {
      const j = i * 3;
      const x = this.graph.centroids[j], y = this.graph.centroids[j + 1], z = this.graph.centroids[j + 2];
      this.height[i] = (y - minHeight) / heightRange;
      this.slope[i] = 1 - clamp(this.graph.normals[j + 1]);
      this.capacity[i] = clamp((noise(
        x * 1.2 + 6 + this.seedOffsets.x,
        y * 1.2 + 2 + this.seedOffsets.y,
        z * 1.2 + this.seedOffsets.z,
      ) - 0.28) * 2.4);
      this.lifespan[i] = 65 + hash(i + this.seedOffsets.life) * 70;
    }
    this._buildStaticMaps();
  }

  _buildStaticMaps() {
    const light = this.lightDirection;
    for (let i = 0; i < this.cellCount; i += 1) {
      const j = i * 3;
      this.habitat[i] = evaluateHabitat({
        slope: this.slope[i],
        heightNorm: this.height[i],
        lightFacing: clamp((
          this.graph.normals[j] * light.x
          + this.graph.normals[j + 1] * light.y
          + this.graph.normals[j + 2] * light.z
        ) * 0.5 + 0.5),
      }, this.environment);

      const neighbors = this.graph.neighbors[i];
      const weights = new Float32Array(neighbors.length);
      let weightSum = 0;
      for (let n = 0; n < neighbors.length; n += 1) {
        const neighborY = this.graph.centroids[neighbors[n] * 3 + 1];
        const downhill = clamp((neighborY - this.graph.centroids[j + 1]) * 5, -1, 1);
        weights[n] = 1 + downhill * this.environment.gravityCreep;
        weightSum += weights[n];
      }
      if (weightSum > 0) for (let n = 0; n < weights.length; n += 1) weights[n] /= weightSum;
      this.neighborWeights[i] = weights;
    }
  }

  reset(mode = 'bare', speciesId = null) {
    if (!['mature', 'seed', 'bare'].includes(mode)) throw new RangeError('Unknown initial state');
    if (speciesId !== null) validateSpecies(speciesId, this.speciesCount);
    this.species.fill(0);
    this.nextSpecies.fill(0);
    this.vitality.fill(0);
    this.moisture.fill(this.environment.moisture);
    this.biomass.fill(0);
    this.age.fill(0);
    this.stress.fill(0);
    this.dormantReserves.fill(0);
    this.deadMatter.fill(0);
    this.time = 0;
    this.accumulator = 0;
    this.totalTicks = 0;
    this.collapses = 0;

    if (mode !== 'bare') for (let i = 0; i < this.cellCount; i += 1) {
      const j = i * 3;
      const x = this.graph.centroids[j], y = this.graph.centroids[j + 1], z = this.graph.centroids[j + 2];
      const patch = noise(x * 1.2 + 6 + this.seedOffsets.x, y * 1.2 + 2 + this.seedOffsets.y, z * 1.2 + this.seedOffsets.z);
      const detail = noise(x * 4 + this.seedOffsets.z, y * 4 + this.seedOffsets.x, z * 4 + this.seedOffsets.y);
      const density = clamp((patch + detail * 0.13 - (mode === 'seed' ? 0.63 : 0.37)) * 4) * this.capacity[i];
      const selectedSpecies = speciesId ?? (hash(i * 3.17 + this.seedOffsets.life) > 0.66 ? 1 : hash(i * 7.31 + this.seedOffsets.x) > 0.62 ? 2 : 0);
      this.species[i * this.speciesCount + selectedSpecies] = density * (mode === 'seed' ? 0.16 : 0.85);
      this.vitality[i] = density > 0 ? 0.85 : 0;
      this.biomass[i] = density * (mode === 'seed' ? 0.08 : 0.7);
      this.age[i] = density * (mode === 'seed' ? 0 : hash(i + this.seedOffsets.life) * 60);
    }
    this.revision += 1;
  }

  setEnvironment(partial) {
    this.environment = createFieldEnvironment({ ...this.environment, ...partial });
    this._buildStaticMaps();
  }

  setLightDirection(direction) {
    this.lightDirection = normalizeDirection(direction);
    this._buildStaticMaps();
  }

  setRunning(value) {
    this.running = Boolean(value);
  }

  updateFrame(deltaSeconds = 1 / 60) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('Invalid frame duration');
    if (!this.running) return false;
    this.accumulator += Math.min(deltaSeconds, 0.25);
    let stepped = false;
    while (this.accumulator + 1e-9 >= FIXED_STEP) {
      this.step();
      this.accumulator -= FIXED_STEP;
      stepped = true;
    }
    return stepped;
  }

  getSpeciesCatalog() {
    return this.speciesCatalog;
  }

  convertSpecies(speciesId) {
    validateSpecies(speciesId, this.speciesCount);
    let changed = 0, stateChanged = false;
    for (let i = 0; i < this.cellCount; i += 1) {
      const base = i * this.speciesCount;
      let living = 0, dormant = 0;
      for (let s = 0; s < this.speciesCount; s += 1) {
        living += this.species[base + s];
        dormant += this.dormantReserves[base + s];
      }
      if (living > 0 && this.species[base + speciesId] < living - 1e-8) changed += 1;
      if (this.species[base + speciesId] < living - 1e-8 || this.dormantReserves[base + speciesId] < dormant - 1e-8) {
        stateChanged = true;
      }
      for (let s = 0; s < this.speciesCount; s += 1) {
        this.species[base + s] = s === speciesId ? living : 0;
        this.dormantReserves[base + s] = s === speciesId ? dormant : 0;
      }
    }
    if (stateChanged) this.revision += 1;
    return changed;
  }

  step(dt = FIXED_STEP) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) throw new RangeError('Step duration must be between zero and 0.25 seconds');
    const environment = this.environment;
    const current = this.species;
    const next = this.nextSpecies;

    for (let i = 0; i < this.cellCount; i += 1) {
      const base = i * this.speciesCount;
      let total = 0;
      for (let s = 0; s < this.speciesCount; s += 1) total += current[base + s];

      const wetTarget = clamp(environment.moisture + (1 - this.height[i]) * 0.12 - this.slope[i] * 0.09);
      this.moisture[i] += (wetTarget - this.moisture[i]) * dt * 0.45;
      const dryStress = clamp((0.4 - this.moisture[i]) * 3);
      const oldAge = clamp((this.age[i] - this.lifespan[i]) / 55) * environment.cycleSpeed;
      const targetStress = clamp(dryStress + oldAge);
      const priorStress = this.stress[i];
      this.stress[i] += (targetStress - priorStress) * dt * (targetStress > priorStress ? 0.22 : 0.12);
      const stress = this.stress[i];
      if (priorStress < 0.6 && stress >= 0.6 && total > 0.12) this.collapses += 1;

      const neighbors = this.graph.neighbors[i];
      const weights = this.neighborWeights[i];
      let nextTotal = 0;
      for (let s = 0; s < this.speciesCount; s += 1) {
        let mean = current[base + s];
        if (neighbors.length) {
          mean = 0;
          for (let n = 0; n < neighbors.length; n += 1) {
            mean += current[neighbors[n] * this.speciesCount + s] * weights[n];
          }
        }
        const profile = this.speciesCatalog[s];
        const fit = clamp(1 - Math.abs(this.moisture[i] - profile.moisturePreference))
          * (1 - Math.abs(this.slope[i] - profile.slopePreference) * 0.25);
        const growing = environment.growthRate * profile.growthMultiplier * this.habitat[i] * fit * (1 - stress);
        const front = mean * environment.colonization * profile.spreadStrength;
        const loss = environment.decayRate * profile.decayMultiplier * (stress * 1.3 + dryStress * 0.25)
          + Math.max(0, total - this.capacity[i]) * 0.3;
        const bank = base + s;
        if (stress > 0.3) {
          this.dormantReserves[bank] = clamp(this.dormantReserves[bank] + current[base + s] * loss * dt * 0.12);
        }
        const recovery = this.moisture[i] > 0.45 && stress < 0.35
          ? this.dormantReserves[bank] * dt * environment.growthRate * 0.2
          : 0;
        this.dormantReserves[bank] -= recovery;
        const density = clamp(current[base + s] + recovery + dt * (
          (mean - current[base + s]) * environment.diffusionRate * 1.8
          + (current[base + s] * 0.65 + front) * growing * Math.max(0, this.capacity[i] - total)
          - current[base + s] * loss
        ));
        next[base + s] = density < 0.000001 ? 0 : density;
        nextTotal += next[base + s];
      }
      if (nextTotal > 1) {
        for (let s = 0; s < this.speciesCount; s += 1) next[base + s] /= nextTotal;
        nextTotal = 1;
      }
      this.deadMatter[i] = clamp(this.deadMatter[i] + Math.max(0, total - nextTotal) * stress - dt * 0.025 * this.deadMatter[i]);
      this.age[i] = nextTotal > 0.035 ? this.age[i] + dt : Math.max(0, this.age[i] - dt * 4);
      const biomassTarget = nextTotal * (1 - stress * 0.9);
      this.biomass[i] += (biomassTarget - this.biomass[i]) * dt * (biomassTarget < this.biomass[i] ? 0.65 : 0.16);
      this.vitality[i] = nextTotal > 0 ? clamp(1 - stress) : 0;
    }
    this.species = next;
    this.nextSpecies = current;
    this.time += dt;
    this.totalTicks += 1;
    this.revision += 1;
    return this.getState();
  }

  getState() {
    return {
      topology: this.graph,
      channels: STATE_CHANNELS,
      speciesCount: this.speciesCount,
      cellCount: this.cellCount,
      species: this.species,
      vitality: this.vitality,
      moisture: this.moisture,
      biomass: this.biomass,
      age: this.age,
      stress: this.stress,
      dormantReserves: this.dormantReserves,
      deadMatter: this.deadMatter,
      revision: this.revision,
      time: this.time,
    };
  }

  getStats() {
    let area = 0, biomass = 0, living = 0, dormant = 0, deadMatter = 0, nonfinite = 0;
    for (let i = 0; i < this.cellCount; i += 1) {
      const weight = this.graph.areas[i];
      const base = i * this.speciesCount;
      let density = 0;
      for (let s = 0; s < this.speciesCount; s += 1) {
        density += this.species[base + s];
        dormant += this.dormantReserves[base + s] * weight;
      }
      if (![density, this.moisture[i], this.biomass[i], this.age[i], this.stress[i], this.deadMatter[i]].every(Number.isFinite)) nonfinite += 1;
      area += weight;
      living += density * weight;
      biomass += this.biomass[i] * weight;
      deadMatter += this.deadMatter[i] * weight;
    }
    return {
      cellCount: this.cellCount,
      componentCount: this.graph.componentCount,
      avgDensity: living / area,
      avgBiomass: biomass / area,
      avgDormantReserves: dormant / area,
      avgDeadMatter: deadMatter / area,
      nonfinite,
      totalTicks: this.totalTicks,
      time: this.time,
      collapses: this.collapses,
      revision: this.revision,
      environment: { ...this.environment },
    };
  }
}
