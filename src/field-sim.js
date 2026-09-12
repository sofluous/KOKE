import { evaluateHabitat, mossSpeciesCatalog } from './simulation.js';
import { clamp, noise, hash, uvAt, sampleRock } from './substrate.js';

export const FIXED_STEP = 1 / 20;
export const defaultFieldEnvironment = {
  moisture: 0.72, slopeBias: 0.55, lightInfluence: 0.66,
  growthRate: 0.55, decayRate: 0.42, diffusionRate: 0.3,
  colonization: 0.55, gravityCreep: 0.28, cycleSpeed: 0.28,
};
function environmentFrom(input) {
  const out = { ...defaultFieldEnvironment };
  for (const [key, value] of Object.entries(input)) {
    if (!(key in out)) throw new RangeError('Unknown environment setting: ' + key);
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(key + ' must be between 0 and 1');
    out[key] = value;
  }
  return out;
}
export class FieldSimulation {
  constructor(surface = {}, options = {}) {
    this.sampleSurface = surface.sampleSurface || sampleRock;
    this.speciesCatalog = options.speciesCatalog || mossSpeciesCatalog;
    if (this.speciesCatalog.length !== 3) throw new RangeError('The field requires three species profiles');
    this.speciesCount = 3;
    this.mapSize = options.mapSize ?? 128;
    if (!Number.isInteger(this.mapSize) || this.mapSize < 8 || this.mapSize > 256 || this.mapSize % 2) throw new RangeError('Map size must be even and between 8 and 256');
    this.seed = options.seed ?? 0;
    if (!Number.isInteger(this.seed) || this.seed < 0 || this.seed > 0xffffffff) throw new RangeError('Seed must be an unsigned 32-bit integer');
    this.seedOffsets = {
      x: hash(this.seed + 0.17) * 64,
      y: hash(this.seed + 1.31) * 64,
      z: hash(this.seed + 2.73) * 64,
      life: hash(this.seed + 4.91) * 2048,
    };
    this.environment = environmentFrom(options.environment || {});
    this.cellCount = this.mapSize ** 2;
    this.channelsA = new Float32Array(this.cellCount * 4);
    this.channelsB = new Float32Array(this.cellCount * 4);
    this.dormantMap = new Float32Array(this.cellCount * 3);
    for (const name of ['habitatMap', 'slopeMap', 'heightMap', 'wetMap', 'ageMap', 'stressMap', 'deadMap', 'massMap', 'areaMap', 'capacityMap']) this[name] = new Float32Array(this.cellCount);
    this.positions = new Float32Array(this.cellCount * 3);
    this.normals = new Float32Array(this.cellCount * 3);
    this.neighbors = new Uint32Array(this.cellCount * 4);
    this.neighborWeights = new Float32Array(this.cellCount * 4);
    this.lifespanMap = new Float32Array(this.cellCount);
    this.coverage = new Uint8Array(this.cellCount * 4);
    this.speciesMap = new Uint8Array(this.cellCount * 4);
    this.lightDirection = { x: 0.3, y: 0.85, z: 0.43 };
    this.running = false;
    this.time = 0; this.accumulator = 0; this.totalTicks = 0;
    this.lastBatchSize = 0; this.lastTickMs = 0; this.paintOps = 0; this.lastPaintCount = 0;
    this.germinations = 0; this.collapses = 0;
    this._buildSurface();
    this.setLightDirection(options.lightDirection || this.lightDirection);
    this.initialSpeciesId = options.initialSpeciesId ?? null;
    this.reset(options.initialState ?? 'mature', this.initialSpeciesId);
  }
  _buildSurface() {
    const n = this.mapSize;
    for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) {
      const i = y * n + x, p = this.sampleSurface((x + 0.5) / n, (y + 0.5) / n);
      this.positions.set([p.x, p.y, p.z], i * 3);
      this.normals.set([p.normal.x, p.normal.y, p.normal.z], i * 3);
      this.slopeMap[i] = 1 - clamp(p.normal.y);
      this.heightMap[i] = p.heightNorm;
      this.lifespanMap[i] = 65 + hash(i + this.seedOffsets.life) * 70;
      this.capacityMap[i] = clamp((noise(p.x * 1.2 + 6 + this.seedOffsets.x, p.y * 1.2 + 2 + this.seedOffsets.y, p.z * 1.2 + this.seedOffsets.z) - 0.35) * 3) * clamp((p.y + 1.4) * 0.8);
      const r = Math.hypot(p.x, p.y, p.z);
      const facing = Math.max(0.1, (p.x * p.normal.x + p.y * p.normal.y + p.z * p.normal.z) / r);
      this.areaMap[i] = Math.sin((y + 0.5) / n * Math.PI) * r * r / facing;
      // Reflect over poles with a half-turn of longitude; wrap the seam.
      this.neighbors.set([y * n + (x + n - 1) % n, y * n + (x + 1) % n,
        y === 0 ? (x + n / 2) % n : (y - 1) * n + x,
        y === n - 1 ? y * n + (x + n / 2) % n : (y + 1) * n + x], i * 4);
    }
  }
  setSurface(sampleSurface) {
    if (typeof sampleSurface !== 'function') throw new TypeError('Surface sampler must be a function');
    this.sampleSurface = sampleSurface;
    this._buildSurface();
    this._buildStaticMaps();
    this.dirty = true;
  }
  _buildStaticMaps() {
    const d = this.lightDirection;
    for (let i = 0; i < this.cellCount; i += 1) {
      const j = i * 3;
      this.habitatMap[i] = evaluateHabitat({ slope: this.slopeMap[i], heightNorm: this.heightMap[i],
        lightFacing: clamp((this.normals[j] * d.x + this.normals[j + 1] * d.y + this.normals[j + 2] * d.z) * 0.5 + 0.5) }, this.environment);
      let weightSum = 0;
      for (let side = 0; side < 4; side += 1) {
        const k = i * 4 + side, neighbor = this.neighbors[k];
        const downhill = clamp((this.positions[neighbor * 3 + 1] - this.positions[j + 1]) * 5, -1, 1);
        this.neighborWeights[k] = 1 + downhill * this.environment.gravityCreep;
        weightSum += this.neighborWeights[k];
      }
      for (let side = 0; side < 4; side += 1) this.neighborWeights[i * 4 + side] /= weightSum;
    }
  }
  reset(mode = 'mature', speciesId = null) {
    if (!['mature', 'seed', 'bare'].includes(mode)) throw new RangeError('Unknown initial state');
    if (speciesId!==null&&(!Number.isInteger(speciesId)||speciesId<0||speciesId>=this.speciesCount))throw new RangeError('Unknown moss type');
    this.channelsA.fill(0); this.channelsB.fill(0);
    this.dormantMap.fill(0);
    for (const name of ['ageMap', 'stressMap', 'deadMap', 'massMap']) this[name].fill(0);
    this.wetMap.fill(this.environment.moisture);
    this.time = 0; this.accumulator = 0; this.totalTicks = 0; this.collapses = 0; this.germinations = 0;
    if (mode !== 'bare') for (let i = 0; i < this.cellCount; i += 1) {
      const j = i * 3, x = this.positions[j], y = this.positions[j + 1], z = this.positions[j + 2];
      const patch = noise(x * 1.2 + 6 + this.seedOffsets.x, y * 1.2 + 2 + this.seedOffsets.y, z * 1.2 + this.seedOffsets.z);
      const detail = noise(x * 4 + this.seedOffsets.z, y * 4 + this.seedOffsets.x, z * 4 + this.seedOffsets.y);
      const density = clamp((patch + detail * 0.13 - (mode === 'seed' ? 0.69 : 0.43)) * 4) * clamp((y + 1.4) * 0.8);
      const species = speciesId ?? (noise(x + 22 + this.seedOffsets.y, y + this.seedOffsets.z, z + this.seedOffsets.x) > 0.57 ? 1 : noise(x * 2 + this.seedOffsets.z, y * 2 + 4 + this.seedOffsets.x, z * 2 + this.seedOffsets.y) > 0.55 ? 2 : 0);
      this.channelsA[i * 4 + species] = density * (mode === 'seed' ? 0.16 : 0.85);
      this.channelsA[i * 4 + 3] = density > 0 ? 0.85 : 0;
      this.massMap[i] = density * (mode === 'seed' ? 0.01 : 0.8);
      this.ageMap[i] = mode === 'seed' ? 0 : density * 38;
    }
    this.dirty = true;
  }
  convertSpecies(speciesId) {
    if(!Number.isInteger(speciesId)||speciesId<0||speciesId>=this.speciesCount)throw new RangeError('Unknown moss type');
    let changed=0;
    for(let i=0;i<this.cellCount;i++){
      const k=i*4,b=i*3;
      const total=this.channelsA[k]+this.channelsA[k+1]+this.channelsA[k+2];
      const dormant=this.dormantMap[b]+this.dormantMap[b+1]+this.dormantMap[b+2];
      if(total>0&&(this.channelsA[k+speciesId]<total-1e-8))changed++;
      for(let s=0;s<this.speciesCount;s++){this.channelsA[k+s]=s===speciesId?total:0;this.dormantMap[b+s]=s===speciesId?dormant:0;}
    }
    this.dirty=true;return changed;
  }
  setEnvironment(partial) { this.environment = environmentFrom({ ...this.environment, ...partial }); this._buildStaticMaps(); }
  setLightDirection(d) {
    const length = Math.hypot(d.x, d.y, d.z);
    if (!Number.isFinite(length) || length < 1e-8) throw new RangeError('Light direction must be finite and nonzero');
    this.lightDirection = { x: d.x / length, y: d.y / length, z: d.z / length };
    this._buildStaticMaps();
  }
  setRunning(value) { this.running = Boolean(value); }
  getSpeciesCatalog() { return this.speciesCatalog; }
  updateFrame(deltaSeconds = 1 / 60) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('Invalid frame duration');
    if (!this.running) return false;
    this.accumulator += Math.min(deltaSeconds, 0.25);
    let stepped = false;
    while (this.accumulator + 1e-9 >= FIXED_STEP) { this.stepBatch(); this.accumulator -= FIXED_STEP; stepped = true; }
    return stepped;
  }
  stepBatch() {
    const start = performance.now(), dt = FIXED_STEP, e = this.environment;
    const a = this.channelsA, b = this.channelsB;
    for (let i = 0; i < this.cellCount; i += 1) {
      const k = i * 4, total = a[k] + a[k + 1] + a[k + 2];
      const wetTarget = clamp(e.moisture + (1 - this.heightMap[i]) * 0.12 - this.slopeMap[i] * 0.09);
      this.wetMap[i] += (wetTarget - this.wetMap[i]) * dt * 0.45;
      const dryStress = clamp((0.4 - this.wetMap[i]) * 3);
      const oldAge = clamp((this.ageMap[i] - this.lifespanMap[i]) / 55) * e.cycleSpeed;
      const targetStress = clamp(dryStress + oldAge);
      const oldStress = this.stressMap[i];
      this.stressMap[i] += (targetStress - oldStress) * dt * (targetStress > oldStress ? 0.22 : 0.12);
      const stress = this.stressMap[i];
      if (oldStress < 0.6 && stress >= 0.6 && total > 0.12) this.collapses += 1;
      const habitat = this.habitatMap[i];
      const n0=this.neighbors[k]*4,n1=this.neighbors[k+1]*4,n2=this.neighbors[k+2]*4,n3=this.neighbors[k+3]*4;
      const w0=this.neighborWeights[k],w1=this.neighborWeights[k+1],w2=this.neighborWeights[k+2],w3=this.neighborWeights[k+3];
      let nextTotal = 0;
      for (let s = 0; s < 3; s += 1) {
        const profile = this.speciesCatalog[s];
        const mean = a[n0+s]*w0+a[n1+s]*w1+a[n2+s]*w2+a[n3+s]*w3;
        const fit = clamp(1 - Math.abs(this.wetMap[i] - profile.moisturePreference)) * (1 - Math.abs(this.slopeMap[i] - profile.slopePreference) * 0.25);
        const growing = e.growthRate * profile.growthMultiplier * habitat * fit * (1 - stress);
        const front = mean * e.colonization * profile.spreadStrength;
        const loss = e.decayRate * profile.decayMultiplier * (stress * 1.3 + dryStress * 0.25) + Math.max(0, total - this.capacityMap[i]) * 0.3;
        const bankIndex = i * 3 + s;
        if (stress > 0.3) this.dormantMap[bankIndex] = clamp(this.dormantMap[bankIndex] + a[k + s] * loss * dt * 0.12);
        const recovery = this.wetMap[i] > 0.45 && stress < 0.35 ? this.dormantMap[bankIndex] * dt * e.growthRate * 0.2 : 0;
        this.dormantMap[bankIndex] -= recovery;
        const next = clamp(a[k + s] + recovery + dt * ((mean - a[k + s]) * e.diffusionRate * 1.8 +
          (a[k + s] * 0.65 + front) * growing * Math.max(0, this.capacityMap[i] - total) - a[k + s] * loss));
        b[k + s] = next < 0.000001 ? 0 : next;
        nextTotal += b[k + s];
      }
      if (nextTotal > 1) { for (let s = 0; s < 3; s += 1) b[k + s] /= nextTotal; nextTotal = 1; }
      this.deadMap[i] = clamp(this.deadMap[i] + Math.max(0, total - nextTotal) * stress - dt * 0.025 * this.deadMap[i]);
      this.ageMap[i] = nextTotal > 0.035 ? this.ageMap[i] + dt : Math.max(0, this.ageMap[i] - dt * 4);
      const massTarget = nextTotal * (1 - stress * 0.9);
      this.massMap[i] += (massTarget - this.massMap[i]) * dt * (massTarget < this.massMap[i] ? 0.65 : 0.16);
      b[k + 3] = nextTotal > 0 ? clamp(1 - stress) : 0;
    }
    this.channelsA = b; this.channelsB = a;
    this.time += dt; this.totalTicks += 1; this.lastBatchSize = this.cellCount;
    this.lastTickMs = performance.now() - start; this.dirty = true;
    this.onStep?.(dt);
  }
  indexAt(point) { const { u, v } = uvAt(point); return Math.min(this.mapSize - 1, Math.floor(v * this.mapSize)) * this.mapSize + Math.floor(u * this.mapSize); }
  paintAt(point, options = {}) {
    uvAt(point);
    const radius = options.radius ?? 0.3, strength = options.strength ?? 0.7, species = options.speciesId ?? 0;
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(strength) || strength < 0 || strength > 1 || !Number.isInteger(species) || species < 0 || species > 2) throw new RangeError('Invalid brush settings');
    let count = 0;
    for (let i = 0; i < this.cellCount; i += 1) {
      const j = i * 3, k = i * 4;
      const distance = Math.hypot(this.positions[j] - point.x, this.positions[j + 1] - point.y, this.positions[j + 2] - point.z);
      if (distance >= radius) continue;
      const influence = strength * (1 - distance / radius);
      if (options.erase) {
        for (let s = 0; s < 3; s += 1) {
          this.channelsA[k + s] *= 1 - influence;
          this.dormantMap[i * 3 + s] *= 1 - influence;
        }
        this.massMap[i] *= 1 - influence; this.deadMap[i] *= 1 - influence;
      } else {
        const total = this.channelsA[k] + this.channelsA[k + 1] + this.channelsA[k + 2];
        this.channelsA[k + species] += influence * Math.max(0, 1 - total);
        this.channelsA[k + 3] = 1; this.wetMap[i] = Math.max(this.wetMap[i], influence);
      }
      count += 1;
    }
    if (count) { this.paintOps += 1; this.lastPaintCount = count; this.dirty = true; }
    return count;
  }
  germinate(index, species) {
    if (!Number.isInteger(index) || index < 0 || index >= this.cellCount || !Number.isInteger(species) || species < 0 || species > 2) throw new RangeError('Invalid germination target');
    if (this.wetMap[index] < 0.38 || this.habitatMap[index] < 0.35) return false;
    const k = index * 4, total = this.channelsA[k] + this.channelsA[k + 1] + this.channelsA[k + 2];
    if (total > 0.65) return false;
    this.channelsA[k + species] += 0.07 * (1 - total);
    this.channelsA[k + 3] = 1; this.ageMap[index] = 0;
    this.germinations += 1; this.dirty = true; return true;
  }
  fillCoverageMap() {
    for (let i = 0; i < this.cellCount; i += 1) {
      const k = i * 4, a = this.channelsA;
      this.coverage[k] = Math.round(clamp(a[k] + a[k + 1] + a[k + 2]) * 255);
      this.coverage[k + 1] = Math.round(clamp(this.massMap[i]) * 255);
      this.coverage[k + 2] = Math.round(clamp(this.stressMap[i] + this.deadMap[i]) * 255);
      this.coverage[k + 3] = Math.round(this.wetMap[i] * 255);
      for (let s = 0; s < 3; s += 1) this.speciesMap[k + s] = Math.round(a[k + s] * 255);
      this.speciesMap[k + 3] = 255;
    }
    this.dirty = false;
    return { data: this.coverage, species: this.speciesMap, width: this.mapSize, height: this.mapSize };
  }
  getStats() {
    let sum = 0, active = 0, area = 0, nonfinite = 0;
    for (let i = 0; i < this.cellCount; i += 1) {
      const k = i * 4, total = this.channelsA[k] + this.channelsA[k + 1] + this.channelsA[k + 2], w = this.areaMap[i];
      if (!Number.isFinite(total)) nonfinite += 1;
      sum += clamp(total) * w; active += (total > 0.15 ? w : 0); area += w;
    }
    return { cellCount: this.cellCount, avgDensity: sum / area, activeRatio: active / area, nonfinite,
      lastBatchSize: this.lastBatchSize, lastTickMs: this.lastTickMs, totalTicks: this.totalTicks,
      paintOps: this.paintOps, lastPaintCount: this.lastPaintCount, time: this.time,
      germinations: this.germinations, collapses: this.collapses, environment: { ...this.environment } };
  }
}
