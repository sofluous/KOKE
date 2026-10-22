import assert from 'node:assert/strict';
import { createGraphRenderer, computeGraphInstanceCount } from '../src/graph-renderer.js';
import { GraphSimulationAdapter } from '../src/graph-simulation-adapter.js';
import { createMeshSurfaceGraph } from '../src/mesh-surface-graph.js';

class Attribute {
  constructor(array, itemSize) { this.array = array instanceof Float32Array ? array : new Float32Array(array); this.itemSize = itemSize; this.count = this.array.length / itemSize; this.needsUpdate = false; this.updateRanges = []; }
  getX(index) { return this.array[index * this.itemSize]; }
  getY(index) { return this.array[index * this.itemSize + 1]; }
  getZ(index) { return this.array[index * this.itemSize + 2]; }
  setUsage() { return this; }
  addUpdateRange(start, count) { this.updateRanges.push({ start, count }); }
  clearUpdateRanges() { this.updateRanges.length = 0; }
}
class BufferGeometry {
  constructor() { this.attributes = {}; this.index = null; this.disposed = false; }
  setAttribute(name, value) { this.attributes[name] = value; return this; }
  computeVertexNormals() {}
  setDrawRange(start, count) { this.drawRange = { start, count }; }
  clone() { const copy = new BufferGeometry(); for (const [key, value] of Object.entries(this.attributes)) copy.setAttribute(key, new Attribute(value.array.slice(), value.itemSize)); return copy; }
  dispose() { this.disposed = true; }
}
class SphereGeometry extends BufferGeometry { constructor() { super(); this.setAttribute('position', new Attribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)); } }
class Material { constructor(options = {}) { Object.assign(this, options); this.disposed = false; } dispose() { this.disposed = true; } }
class Color {
  constructor(value = '#000000') { this.set(value); }
  set(value) { const raw = typeof value === 'string' ? Number.parseInt(value.replace('#', ''), 16) : 0; this.r = ((raw >> 16) & 255) / 255; this.g = ((raw >> 8) & 255) / 255; this.b = (raw & 255) / 255; return this; }
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
  copy(other) { this.r = other.r; this.g = other.g; this.b = other.b; return this; }
  lerp(other, amount) { this.r += (other.r - this.r) * amount; this.g += (other.g - this.g) * amount; this.b += (other.b - this.b) * amount; return this; }
}
class Vector3 { constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } addScaledVector(v, scale) { this.x += v.x * scale; this.y += v.y * scale; this.z += v.z * scale; return this; } }
class Object3D { constructor() { this.position = new Vector3(); this.scale = new Vector3(1, 1, 1); this.quaternion = { setFromUnitVectors() {} }; this.matrix = {}; } rotateY() {} updateMatrix() { this.matrix = { x: this.position.x, y: this.position.y, z: this.position.z }; } }
class Group { constructor() { this.children = []; } add(value) { this.children.push(value); } remove(value) { this.children = this.children.filter((entry) => entry !== value); } }
class Mesh { constructor(geometry, material) { this.geometry = geometry; this.material = material; } worldToLocal(point) { return point; } }
class InstancedMesh extends Mesh { constructor(geometry, material, capacity) { super(geometry, material); this.capacity = capacity; this.count = capacity; this.instanceMatrix = { needsUpdate: false }; } setMatrixAt(index, matrix) { this.lastMatrix = { index, matrix }; } }
class Points extends Mesh {}
const THREE = {
  BufferGeometry, Float32BufferAttribute: Attribute, BufferAttribute: Attribute, InstancedBufferAttribute: Attribute,
  SphereGeometry, MeshStandardMaterial: Material, MeshDepthMaterial: Material, PointsMaterial: Material, Points,
  Color, Vector3, Object3D, Group, Mesh, InstancedMesh, DoubleSide: 2, RGBADepthPacking: 3201, DynamicDrawUsage: 35048,
};
const scene = { children: [], add(value) { this.children.push(value); }, remove(value) { this.children = this.children.filter((entry) => entry !== value); } };
const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]);
const graph = createMeshSurfaceGraph(positions);
const geometry = new BufferGeometry().setAttribute('position', new Attribute(positions, 3));
const simulation = new GraphSimulationAdapter(graph, { initialState: 'bare' });

assert.equal(computeGraphInstanceCount(100, 0.45), 45);
assert.throws(() => computeGraphInstanceCount(100, 2));
const renderer = createGraphRenderer(THREE, scene, geometry, graph, simulation, {
  capacity: 12, lowCapacity: 6, expansionChunkSize: 3, scheduleWork: (callback) => callback(),
  initialQuality: 'low', initialDensity: 0.5, initialRepresentation: 'shoots', seed: 5,
});
assert.equal(renderer.getStats().anchors, 6);
assert.equal(renderer.getStats().instances, 3);
assert.equal(renderer.getStats().revision, simulation.revision);
assert.equal(renderer.update(), false);
simulation.paintFromFace(0, { radius: 2, strength: 1, speciesId: 1 });
assert.equal(renderer.update(), true);
assert.equal(renderer.anchorState.species.some((value) => value > 0), true);
assert.equal(renderer.plants.geometry.attributes.anchorDensity.needsUpdate, true);
assert.equal(renderer.mesh.geometry.attributes.color.needsUpdate, true);
const spores = { revision: 1, particles: [{ state: 1, x: 1, y: 2, z: 3 }] };
assert.equal(renderer.update(spores), true);
assert.equal(renderer.particles.geometry.drawRange.count, 1);
assert.equal(renderer.update(spores), false);

renderer.setRepresentation('surface');
assert.equal(renderer.plants.visible, false);
renderer.setRepresentation('cards');
assert.equal(renderer.plants.visible, true);
assert.ok(renderer.plants.geometry.attributes.anchorSpecies);
renderer.setDensity(1);
const lowPositions = renderer.anchors.positions.slice();
const lowPlants = renderer.plants;
renderer.setQuality('high');
assert.equal(renderer.getStats().anchors, 12);
assert.equal(renderer.getStats().instances, 12);
assert.equal(renderer.getStats().expanding, false);
assert.deepEqual(renderer.anchors.positions.slice(0, lowPositions.length), lowPositions);
assert.equal(lowPlants.geometry.disposed, true);
renderer.setViewDistance(10);
assert.equal(renderer.getStats().instances, 12);
renderer.setRepresentation('shoots');
assert.equal(renderer.getStats().lodFactor, 0.45);
assert.equal(renderer.getStats().instances, 5);
const stableGeometry = renderer.plants.geometry;
renderer.setRepresentation('shoots');
assert.equal(renderer.plants.geometry, stableGeometry);
renderer.setAdaptiveDetail(false);
assert.equal(renderer.getStats().instances, 12);
renderer.setAppearance({ scale: 1.2, aspect: 0.8, rootColor: '#123456' });
assert.throws(() => renderer.setRepresentation('unknown'));
assert.throws(() => renderer.setDensity(-1));
assert.equal(renderer.getStats().density, 1);
assert.throws(() => renderer.setAppearance({ scale: 0 }));

const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>' };
renderer.plants.material.onBeforeCompile(shader);
assert.match(shader.vertexShader, /anchorDensity/);
assert.match(shader.fragmentShader, /vGraphSpecies/);

const currentGeometry = renderer.plants.geometry;
renderer.dispose();
assert.equal(currentGeometry.disposed, true);
assert.equal(scene.children.length, 0);

const lifecycleQueue = [];
const stagedSimulation = new GraphSimulationAdapter(graph, { initialState: 'bare' });
const staged = createGraphRenderer(THREE, scene, geometry, graph, stagedSimulation, {
  capacity: 6, lowCapacity: 6, lifecycleChunkSize: 2, scheduleWork: (callback) => lifecycleQueue.push(callback),
  initialQuality: 'low', initialRepresentation: 'cards', seed: 9,
});
stagedSimulation.paintFromFace(0, { radius: 2, strength: 0.5, speciesId: 0 });
assert.equal(staged.update(), true);
assert.equal(staged.getStats().lifecycleSyncing, true);
assert.ok(staged.getStats().lifecycleLag > 0);
lifecycleQueue.shift()();
assert.equal(staged.getStats().lifecycleProgress, 0.333);
stagedSimulation.paintFromFace(1, { radius: 2, strength: 0.5, speciesId: 1 });
staged.update();
stagedSimulation.paintFromFace(0, { radius: 2, strength: 0.5, speciesId: 2 });
staged.update();
while (lifecycleQueue.length) lifecycleQueue.shift()();
assert.equal(staged.getStats().revision, stagedSimulation.revision);
assert.equal(staged.getStats().lifecycleSyncing, false);
assert.equal(staged.getStats().coalescedLifecycleUpdates, 1);
assert.deepEqual(staged.plants.geometry.attributes.anchorDensity.updateRanges[0], { start: 0, count: 2 });
assert.deepEqual(staged.plants.geometry.attributes.anchorSpecies.updateRanges[0], { start: 0, count: 6 });
staged.dispose();
assert.equal(scene.children.length, 0);

const scheduled = [];
const cancellable = createGraphRenderer(THREE, scene, geometry, graph, simulation, {
  capacity: 8, lowCapacity: 4, expansionChunkSize: 2, scheduleWork: (callback) => scheduled.push(callback),
  initialQuality: 'low', initialRepresentation: 'cards', seed: 8,
});
cancellable.setQuality('high');
assert.equal(cancellable.getStats().expanding, true);
const readiness = cancellable.whenHighReady();
cancellable.dispose();
assert.equal(await readiness, false);
while (scheduled.length) scheduled.shift()();
assert.equal(scene.children.length, 0);
assert.throws(() => createGraphRenderer(THREE, scene, geometry, graph, {}, { capacity: 1 }));

console.log('PASS graph renderer reuses stable anchors and uploads lifecycle state by revision');
