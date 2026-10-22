export const MAX_RENDER_ANCHORS = 100_000;

function randomFromSeed(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function validateGraph(graph) {
  if (!graph || !Number.isInteger(graph.triangleCount) || graph.triangleCount < 1) {
    throw new TypeError('A non-empty mesh surface graph is required');
  }
  if (!graph.vertices || !graph.triangles || !graph.areas || !graph.normals || !graph.componentIds) {
    throw new TypeError('Mesh surface graph geometry is incomplete');
  }
  if (graph.triangles.length !== graph.triangleCount * 3
    || graph.areas.length !== graph.triangleCount
    || graph.normals.length !== graph.triangleCount * 3
    || graph.componentIds.length !== graph.triangleCount) {
    throw new TypeError('Mesh surface graph buffers do not match its triangle count');
  }
}

function validateOptions(count, seed) {
  if (!Number.isInteger(count) || count < 0 || count > MAX_RENDER_ANCHORS) {
    throw new RangeError(`Anchor count must be between 0 and ${MAX_RENDER_ANCHORS.toLocaleString()}`);
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('Anchor seed must be an unsigned 32-bit integer');
  }
}

function usableAreaTable(graph) {
  const triangles = [];
  const cumulativeAreas = [];
  let totalArea = 0;
  for (let triangle = 0; triangle < graph.triangleCount; triangle += 1) {
    const area = graph.areas[triangle];
    if (!Number.isFinite(area) || area <= 1e-12) continue;
    totalArea += area;
    triangles.push(triangle);
    cumulativeAreas.push(totalArea);
  }
  if (!triangles.length || !Number.isFinite(totalArea)) throw new RangeError('Mesh graph has no usable triangles');
  return { triangles, cumulativeAreas, totalArea };
}

function triangleForTarget(table, target) {
  let low = 0, high = table.triangles.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (table.cumulativeAreas[middle] < target) low = middle + 1;
    else high = middle;
  }
  return table.triangles[low];
}

function writePoint(graph, triangle, barycentric, target, offset) {
  const triangleOffset = triangle * 3;
  for (let corner = 0; corner < 3; corner += 1) {
    const vertex = graph.triangles[triangleOffset + corner] * 3;
    const weight = barycentric[corner];
    target[offset] += graph.vertices[vertex] * weight;
    target[offset + 1] += graph.vertices[vertex + 1] * weight;
    target[offset + 2] += graph.vertices[vertex + 2] * weight;
  }
}

function fallbackTangent(nx, ny, nz) {
  const ax = Math.abs(ny) < 0.9 ? 0 : 1;
  const ay = Math.abs(ny) < 0.9 ? 1 : 0;
  const tx = ay * nz;
  const ty = -ax * nz;
  const tz = ax * ny - ay * nx;
  const length = Math.hypot(tx, ty, tz);
  return [tx / length, ty / length, tz / length];
}

function triangleTangent(graph, triangle) {
  const base = triangle * 3;
  const a = graph.triangles[base] * 3;
  const b = graph.triangles[base + 1] * 3;
  const c = graph.triangles[base + 2] * 3;
  const nx = graph.normals[base], ny = graph.normals[base + 1], nz = graph.normals[base + 2];
  for (const vertex of [b, c]) {
    let tx = graph.vertices[vertex] - graph.vertices[a];
    let ty = graph.vertices[vertex + 1] - graph.vertices[a + 1];
    let tz = graph.vertices[vertex + 2] - graph.vertices[a + 2];
    const projection = tx * nx + ty * ny + tz * nz;
    tx -= projection * nx;
    ty -= projection * ny;
    tz -= projection * nz;
    const length = Math.hypot(tx, ty, tz);
    if (length > 1e-10) return [tx / length, ty / length, tz / length];
  }
  return fallbackTangent(nx, ny, nz);
}

function writeFrame(graph, triangle, angle, tangents, bitangents, offset) {
  const base = triangle * 3;
  const nx = graph.normals[base], ny = graph.normals[base + 1], nz = graph.normals[base + 2];
  const source = triangleTangent(graph, triangle);
  const bx = ny * source[2] - nz * source[1];
  const by = nz * source[0] - nx * source[2];
  const bz = nx * source[1] - ny * source[0];
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  const tx = source[0] * cosine + bx * sine;
  const ty = source[1] * cosine + by * sine;
  const tz = source[2] * cosine + bz * sine;
  tangents.set([tx, ty, tz], offset);
  bitangents.set([
    ny * tz - nz * ty,
    nz * tx - nx * tz,
    nx * ty - ny * tx,
  ], offset);
}

export function createMeshRenderAnchorBuilder(graph, { count, seed = 0 } = {}) {
  validateGraph(graph);
  validateOptions(count, seed);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const tangents = new Float32Array(count * 3);
  const bitangents = new Float32Array(count * 3);
  const barycentrics = new Float32Array(count * 3);
  const triangles = new Uint32Array(count);
  const components = new Uint32Array(count);
  const variations = new Float32Array(count);
  const anchors = {
    graph, count, seed, positions, normals, tangents, bitangents,
    barycentrics, triangles, components, variations,
  };
  const table = count ? usableAreaTable(graph) : null;
  const random = randomFromSeed(seed);
  let processed = 0;
  function advance(batchSize = count - processed) {
    if (!Number.isInteger(batchSize) || batchSize < 0) throw new RangeError('Anchor batch size must be a nonnegative integer');
    const end = Math.min(count, processed + batchSize);
    for (let anchor = processed; anchor < end; anchor += 1) {
      // Each seeded sample is independent of the requested capacity, so expanding
      // Low to High keeps every existing attachment in the same place.
      const target = random() * table.totalArea;
      const triangle = triangleForTarget(table, target);
      const root = Math.sqrt(random());
      const barycentric = [1 - root, root * (1 - random()), 0];
      barycentric[2] = 1 - barycentric[0] - barycentric[1];
      const offset = anchor * 3;
      triangles[anchor] = triangle;
      components[anchor] = graph.componentIds[triangle];
      barycentrics.set(barycentric, offset);
      writePoint(graph, triangle, barycentric, positions, offset);
      normals.set(graph.normals.subarray(triangle * 3, triangle * 3 + 3), offset);
      variations[anchor] = random();
      writeFrame(graph, triangle, variations[anchor] * Math.PI * 2, tangents, bitangents, offset);
    }
    processed = end;
    return processed;
  }
  return {
    anchors, advance,
    get processed() { return processed; },
    get done() { return processed === count; },
    get progress() { return count ? processed / count : 1; },
  };
}

export function createMeshRenderAnchors(graph, options = {}) {
  const builder = createMeshRenderAnchorBuilder(graph, options);
  builder.advance(builder.anchors.count);
  return builder.anchors;
}

function validateSimulationState(anchors, state) {
  if (!state || state.topology !== anchors.graph) {
    throw new TypeError('Simulation state must use the anchor mesh graph');
  }
  if (!Number.isInteger(state.speciesCount) || state.speciesCount < 1 || state.cellCount !== anchors.graph.triangleCount) {
    throw new TypeError('Simulation state dimensions do not match the anchor mesh graph');
  }
  if (!Number.isInteger(state.revision) || state.revision < 0) {
    throw new TypeError('Simulation state revision must be a nonnegative integer');
  }
  const scalarChannels = ['vitality', 'moisture', 'biomass', 'age', 'stress', 'deadMatter'];
  for (const name of scalarChannels) {
    if (!state[name] || state[name].length !== state.cellCount) throw new TypeError(`Simulation channel ${name} is incomplete`);
  }
  const speciesLength = state.cellCount * state.speciesCount;
  if (!state.species || state.species.length !== speciesLength
    || !state.dormantReserves || state.dormantReserves.length !== speciesLength) {
    throw new TypeError('Simulation species channels are incomplete');
  }
}

export class MeshRenderAnchorState {
  constructor(anchors, speciesCount = 3) {
    if (!anchors || !Number.isInteger(anchors.count) || !anchors.triangles || !anchors.graph) {
      throw new TypeError('Mesh render anchors are required');
    }
    if (!Number.isInteger(speciesCount) || speciesCount < 1) throw new RangeError('Species count must be positive');
    this.anchors = anchors;
    this.speciesCount = speciesCount;
    this.species = new Float32Array(anchors.count * speciesCount);
    this.dormantReserves = new Float32Array(anchors.count * speciesCount);
    this.density = new Float32Array(anchors.count);
    this.vitality = new Float32Array(anchors.count);
    this.moisture = new Float32Array(anchors.count);
    this.biomass = new Float32Array(anchors.count);
    this.age = new Float32Array(anchors.count);
    this.stress = new Float32Array(anchors.count);
    this.deadMatter = new Float32Array(anchors.count);
    this.dominantSpecies = new Uint8Array(anchors.count);
    this.revision = -1;
  }

  update(state) {
    validateSimulationState(this.anchors, state);
    if (state.speciesCount !== this.speciesCount) throw new RangeError('Simulation species count does not match anchor state');
    if (state.revision === this.revision) return false;
    this.copyRange(state, 0, this.anchors.count);
    this.commit(state);
    return true;
  }

  copyRange(state, start, end) {
    validateSimulationState(this.anchors, state);
    if (state.speciesCount !== this.speciesCount) throw new RangeError('Simulation species count does not match anchor state');
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > this.anchors.count) {
      throw new RangeError('Anchor state range is invalid');
    }
    for (let anchor = start; anchor < end; anchor += 1) {
      const triangle = this.anchors.triangles[anchor];
      const source = triangle * this.speciesCount;
      const target = anchor * this.speciesCount;
      let density = 0, dominant = 0, dominantDensity = -1;
      for (let species = 0; species < this.speciesCount; species += 1) {
        const value = state.species[source + species];
        this.species[target + species] = value;
        this.dormantReserves[target + species] = state.dormantReserves[source + species];
        density += value;
        if (value > dominantDensity) {
          dominantDensity = value;
          dominant = species;
        }
      }
      this.density[anchor] = density;
      this.dominantSpecies[anchor] = dominant;
      this.vitality[anchor] = state.vitality[triangle];
      this.moisture[anchor] = state.moisture[triangle];
      this.biomass[anchor] = state.biomass[triangle];
      this.age[anchor] = state.age[triangle];
      this.stress[anchor] = state.stress[triangle];
      this.deadMatter[anchor] = state.deadMatter[triangle];
    }
    return end - start;
  }

  commit(state) {
    validateSimulationState(this.anchors, state);
    if (state.speciesCount !== this.speciesCount) throw new RangeError('Simulation species count does not match anchor state');
    this.revision = state.revision;
    return this.revision;
  }

  getBuffers() {
    return {
      speciesCount: this.speciesCount,
      count: this.anchors.count,
      species: this.species,
      dormantReserves: this.dormantReserves,
      density: this.density,
      dominantSpecies: this.dominantSpecies,
      vitality: this.vitality,
      moisture: this.moisture,
      biomass: this.biomass,
      age: this.age,
      stress: this.stress,
      deadMatter: this.deadMatter,
      revision: this.revision,
    };
  }
}
