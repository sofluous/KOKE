import { hash, rockRadius } from './substrate.js';

// A fixed pool owns both flight and germination; render quality never changes it.
export class SporeSimulation {
  constructor(field, options = {}) {
    if (options.capacity !== undefined && (!Number.isInteger(options.capacity) || options.capacity < 1 || options.capacity > 1024)) throw new RangeError('Spore capacity must be between 1 and 1024');
    this.field = field;
    this.radiusAt = options.radiusAt || rockRadius;
    this.particles = Array.from({ length: options.capacity ?? 160 }, () => ({ state: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, species: 0, target: 0, delay: 0 }));
    this.reset();
  }
  reset() {
    for (const p of this.particles) p.state = 0;
    this.sequence = 0; this.emission = 0; this.released = 0; this.landed = 0; this.germinated = 0;
    this.lastEvent = null;
  }
  release(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.field.cellCount) throw new RangeError('Invalid release surface index');
    const p = this.particles.find((entry) => entry.state === 0);
    if (!p) return false;
    const f = this.field, j = index * 3, k = index * 4;
    const n = f.normals, a = f.channelsA;
    const species = a[k + 1] > a[k] ? (a[k + 2] > a[k + 1] ? 2 : 1) : (a[k + 2] > a[k] ? 2 : 0);
    const r = hash(++this.sequence);
    p.x = f.positions[j] + n[j] * 0.14; p.y = f.positions[j + 1] + n[j + 1] * 0.14; p.z = f.positions[j + 2] + n[j + 2] * 0.14;
    p.vx = n[j] * 0.17 + 0.12 + r * 0.13; p.vy = n[j + 1] * 0.2 + 0.22; p.vz = n[j + 2] * 0.17 + (r - 0.5) * 0.15;
    p.age = 0; p.state = 1; p.species = species; p.delay = 2 + r * 3;
    this.released += 1; this.lastEvent = { type: 'release', index, species, time: f.time };
    return true;
  }
  signedDistance(x, y, z) {
    const r = Math.hypot(x, y, z);
    return r < 1e-8 ? -1 : r - this.radiusAt({ x: x / r, y: y / r, z: z / r });
  }
  step(dt) {
    this.emission += dt * 5;
    while (this.emission >= 1) {
      this.emission -= 1;
      for (let attempt = 0; attempt < 16; attempt += 1) {
        const i = Math.floor(hash(++this.sequence) * this.field.cellCount);
        if (this.field.massMap[i] > 0.24 && this.field.ageMap[i] > 12 && this.field.stressMap[i] < 0.4 && this.field.positions[i * 3 + 1] > -0.5) { this.release(i); break; }
      }
    }
    for (const p of this.particles) {
      if (p.state === 0) continue;
      p.age += dt;
      if (p.state === 2) {
        if (p.age >= p.delay) {
          if (this.field.germinate(p.target, p.species)) {
            this.germinated += 1;
            this.lastEvent = { type: 'germination', index: p.target, species: p.species, time: this.field.time };
          }
          p.state = 0;
        }
        continue;
      }
      // Short segments and bisection keep landing on the radial substrate.
      for (let sub = 0; sub < 4 && p.state === 1; sub += 1) {
        const h = dt / 4, ox = p.x, oy = p.y, oz = p.z;
        p.vy -= h * 0.16;
        p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
        if (this.signedDistance(p.x, p.y, p.z) <= 0) {
          let lo = 0, hi = 1;
          for (let j = 0; j < 10; j += 1) {
            const t = (lo + hi) / 2;
            if (this.signedDistance(ox + (p.x - ox) * t, oy + (p.y - oy) * t, oz + (p.z - oz) * t) > 0) lo = t; else hi = t;
          }
          p.x = ox + (p.x - ox) * lo; p.y = oy + (p.y - oy) * lo; p.z = oz + (p.z - oz) * lo;
          p.target = this.field.indexAt(p); p.state = 2; p.age = 0;
          this.landed += 1; this.lastEvent = { type: 'landing', index: p.target, species: p.species, time: this.field.time };
        }
      }
      if (p.age > 12 || p.y < -3) p.state = 0;
    }
  }
  getStats() { return { active: this.particles.filter((p) => p.state > 0).length, capacity: this.particles.length, released: this.released, landed: this.landed, germinated: this.germinated, lastEvent: this.lastEvent }; }
}
