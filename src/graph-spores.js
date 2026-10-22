import { hash } from './substrate.js';
import { createMeshSegmentCollider } from './mesh-collision.js';

export class GraphSporeSimulation {
  constructor(field, options = {}) {
    if (!field?.graph || typeof field.germinate !== 'function') throw new TypeError('A graph simulation is required');
    const capacity = options.capacity ?? 160;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1024) throw new RangeError('Spore capacity must be between 1 and 1024');
    this.field = field; this.collider = options.collider || createMeshSegmentCollider(field.graph);
    this.particles = Array.from({ length: capacity }, () => ({ state: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, species: 0, target: 0, delay: 0 }));
    this.reset();
  }
  reset() { for (const particle of this.particles) particle.state = 0; this.sequence = 0; this.emission = 0; this.released = 0; this.landed = 0; this.germinated = 0; this.lastEvent = null; this.revision = (this.revision || 0) + 1; }
  release(faceIndex) {
    if (!Number.isInteger(faceIndex) || faceIndex < 0 || faceIndex >= this.field.cellCount) throw new RangeError('Invalid release face');
    const particle = this.particles.find((entry) => entry.state === 0); if (!particle) return false;
    const base = faceIndex * 3, speciesBase = faceIndex * this.field.speciesCount, normal = this.field.graph.normals;
    let species = 0; for (let index = 1; index < this.field.speciesCount; index += 1) if (this.field.species[speciesBase + index] > this.field.species[speciesBase + species]) species = index;
    const random = hash(++this.sequence), center = this.field.graph.centroids;
    particle.x = center[base] + normal[base] * 0.08; particle.y = center[base + 1] + normal[base + 1] * 0.08; particle.z = center[base + 2] + normal[base + 2] * 0.08;
    particle.vx = normal[base] * 0.17 + 0.12 + random * 0.13; particle.vy = normal[base + 1] * 0.2 + 0.22; particle.vz = normal[base + 2] * 0.17 + (random - 0.5) * 0.15;
    particle.age = 0; particle.state = 1; particle.species = species; particle.delay = 2 + random * 3;
    this.released += 1; this.lastEvent = { type: 'release', faceIndex, species, time: this.field.time }; this.revision += 1; return true;
  }
  step(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) throw new RangeError('Spore step must be between zero and 0.25 seconds');
    let changed = false; this.emission += dt * 5;
    while (this.emission >= 1) { this.emission -= 1; for (let attempt = 0; attempt < 16; attempt += 1) { const face = Math.floor(hash(++this.sequence) * this.field.cellCount); if (this.field.biomass[face] > 0.24 && this.field.age[face] > 12 && this.field.stress[face] < 0.4) { this.release(face); break; } } }
    for (const particle of this.particles) {
      if (!particle.state) continue; changed = true; particle.age += dt;
      if (particle.state === 2) { if (particle.age >= particle.delay) { if (this.field.germinate(particle.target, particle.species)) { this.germinated += 1; this.lastEvent = { type: 'germination', faceIndex: particle.target, species: particle.species, time: this.field.time }; } particle.state = 0; } continue; }
      for (let substep = 0; substep < 4 && particle.state === 1; substep += 1) {
        const h = dt / 4, from = { x: particle.x, y: particle.y, z: particle.z }; particle.vy -= h * 0.16;
        const to = { x: particle.x + particle.vx * h, y: particle.y + particle.vy * h, z: particle.z + particle.vz * h };
        const hit = this.collider.castSegment(from, to);
        if (hit) { particle.x = hit.x + hit.normal.x * 0.002; particle.y = hit.y + hit.normal.y * 0.002; particle.z = hit.z + hit.normal.z * 0.002; particle.target = hit.faceIndex; particle.state = 2; particle.age = 0; this.landed += 1; this.lastEvent = { type: 'landing', faceIndex: hit.faceIndex, species: particle.species, time: this.field.time, barycentric: hit.barycentric }; }
        else { particle.x = to.x; particle.y = to.y; particle.z = to.z; }
      }
      if (particle.age > 12) particle.state = 0;
    }
    if (changed) this.revision += 1;
  }
  getStats() { return { active: this.particles.filter((particle) => particle.state > 0).length, capacity: this.particles.length, released: this.released, landed: this.landed, germinated: this.germinated, lastEvent: this.lastEvent }; }
}
